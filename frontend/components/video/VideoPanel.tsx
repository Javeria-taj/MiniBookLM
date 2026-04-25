'use client';

/**
 * VideoPanel.tsx — GoSquad AI video generation modal.
 *
 * Flow:
 *   1. User clicks VIDEO → modal opens
 *   2. POST /notebook/{id}/video/generate  → get job_id immediately
 *   3. GET  /notebook/{id}/video/status/{job_id} → blocks ~2-3 min until iframe_url
 *   4. Render <iframe src={iframe_url} /> with copy-link option
 *
 * Stages: idle → submitting → polling → done | error
 */

import { useRef, useState } from 'react';
import { X, Film, Loader, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { generateVideo, fetchVideoStatus } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

const NOTEBOOK_ID = 'default-notebook';

// ── Stage type ────────────────────────────────────────────────
type Stage = 'idle' | 'submitting' | 'polling' | 'done' | 'error';

// ── Elapsed timer hook ────────────────────────────────────────
function useElapsed(running: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (running && !timerRef.current) {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  }
  if (!running && timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
    // don't reset elapsed — keep it showing final time
  }

  return elapsed;
}

// ── Loading bar ───────────────────────────────────────────────
function ProgressBar({ stage }: { stage: Stage }) {
  const widths: Record<Stage, string> = {
    idle:       '0%',
    submitting: '15%',
    polling:    '55%',
    done:       '100%',
    error:      '100%',
  };
  const colors: Record<Stage, string> = {
    idle:       'var(--accent)',
    submitting: 'var(--accent)',
    polling:    'var(--accent)',
    done:       '#5C8F72',
    error:      '#C9705A',
  };

  return (
    <div style={{ height: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: widths[stage],
        background: colors[stage],
        transition: 'width 0.8s ease, background 0.3s ease',
        animation: stage === 'polling' ? 'indeterminateShift 2s ease-in-out infinite' : 'none',
      }} />
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────
function StatusPill({ stage, topic, elapsed }: { stage: Stage; topic: string; elapsed: number }) {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const configs: Record<Stage, { icon: React.ReactNode; text: string; color: string }> = {
    idle:       { icon: <Film size={14} />,         text: 'Ready to generate',              color: 'var(--text-secondary)' },
    submitting: { icon: <Loader size={14} className="spin" />, text: 'Submitting job...',   color: 'var(--accent)' },
    polling:    { icon: <Loader size={14} className="spin" />, text: `Generating "${topic}" video — ${fmt(elapsed)}`, color: 'var(--accent)' },
    done:       { icon: <CheckCircle size={14} />,  text: `"${topic}" ready — ${fmt(elapsed)}`, color: '#5C8F72' },
    error:      { icon: <AlertCircle size={14} />,  text: 'Generation failed',              color: '#C9705A' },
  };

  const c = configs[stage];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.color, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700 }}>
      {c.icon}
      <span style={{ textTransform: 'uppercase' }}>{c.text}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function VideoPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { level } = useAppStore();

  const [stage, setStage]       = useState<Stage>('idle');
  const [topic, setTopic]       = useState('');
  const [jobId, setJobId]       = useState('');
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied]     = useState(false);

  const abortRef  = useRef<AbortController | null>(null);
  const running   = stage === 'submitting' || stage === 'polling';
  const elapsed   = useElapsed(running);

  const reset = () => {
    abortRef.current?.abort();
    setStage('idle');
    setTopic('');
    setJobId('');
    setIframeUrl(null);
    setErrorMsg('');
    setCopied(false);
  };

  const handleClose = () => {
    // Abort in-flight requests but keep iframe if done
    if (stage !== 'done') abortRef.current?.abort();
    onClose();
  };

  const handleGenerate = async () => {
    if (running) return;
    reset();

    abortRef.current = new AbortController();

    try {
      // ── Step 1: submit job (fast, ~1s) ──────────────────────
      setStage('submitting');
      const job = await generateVideo(NOTEBOOK_ID, level);
      setTopic(job.topic);
      setJobId(job.job_id);

      // ── Step 2: poll until done (blocking, ~2-3 min) ─────────
      setStage('polling');
      const result = await fetchVideoStatus(
        NOTEBOOK_ID,
        job.job_id,
        abortRef.current.signal,
      );

      if (result.status === 'completed' && result.iframe_url) {
        setIframeUrl(result.iframe_url);
        setStage('done');
      } else {
        setErrorMsg('Video generation failed on the server.');
        setStage('error');
      }

    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // user closed modal
      setErrorMsg((err as Error).message || 'Unexpected error');
      setStage('error');
    }
  };

  const copyLink = () => {
    if (!iframeUrl) return;
    navigator.clipboard.writeText(iframeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(18,20,28,0.85)', backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: 'var(--border-heavy)',
        width: 680, maxWidth: '95vw',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div style={{
          padding: '18px 24px', borderBottom: 'var(--border-heavy)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--bg-elevated)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: 'var(--accent-subtle)', border: 'var(--border-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)',
            }}>
              <Film size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
                AI VIDEO GENERATION
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>
                Powered by GoSquad · audience: {level}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Progress bar ──────────────────────────────────────── */}
        <ProgressBar stage={stage} />

        {/* ── Body ────────────────────────────────────────────── */}
        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Status row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', background: 'var(--bg-elevated)', border: 'var(--border-heavy)',
          }}>
            <StatusPill stage={stage} topic={topic} elapsed={elapsed} />
            {jobId && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                JOB {jobId.slice(0, 8).toUpperCase()}
              </span>
            )}
          </div>

          {/* ── Idle state — CTA ─────────────────────────────── */}
          {stage === 'idle' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
                color: 'var(--text-secondary)', fontWeight: 700,
                textTransform: 'uppercase', marginBottom: 20, lineHeight: 1.7,
              }}>
                MiniBookLM will auto-extract the key topic from your notebook<br />
                and generate a short AI-powered educational video via GoSquad.
              </p>
              <button
                onClick={handleGenerate}
                style={{
                  padding: '14px 36px',
                  background: 'var(--accent)', border: 'var(--border-accent)',
                  color: 'var(--text-on-accent)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700,
                  cursor: 'pointer', textTransform: 'uppercase',
                  boxShadow: 'var(--shadow-accent)',
                  transition: 'var(--transition)',
                }}
                className="brutal-generate-btn"
              >
                ▶ GENERATE VIDEO
              </button>
            </div>
          )}

          {/* ── Polling state — animated placeholder ─────────── */}
          {stage === 'polling' && (
            <div style={{
              height: 240,
              background: 'var(--bg-elevated)', border: 'var(--border-heavy)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
            }}>
              {/* Film strip animation */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{
                    width: 14, height: 80,
                    background: 'var(--bg-base)', border: '2px solid var(--border)',
                    animation: `filmBob 1.2s ease-in-out ${i * 0.15}s infinite alternate`,
                    display: 'flex', flexDirection: 'column', gap: 4, padding: 3,
                  }}>
                    {[0,1,2].map(j => (
                      <div key={j} style={{ flex: 1, background: `hsl(${38 + i * 12}, ${40 + j * 10}%, ${30 + j * 8}%)` }} />
                    ))}
                  </div>
                ))}
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
                color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase',
                animation: 'blink 1.4s step-end infinite',
              }}>
                ◈ GoSquad rendering your video...
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
                color: 'var(--text-muted)', fontWeight: 700,
              }}>
                This takes 2-3 minutes — you can leave this open
              </span>
            </div>
          )}

          {/* ── Submitting state ─────────────────────────────── */}
          {stage === 'submitting' && (
            <div style={{
              height: 100,
              background: 'var(--bg-elevated)', border: 'var(--border-heavy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
              <Loader size={18} color="var(--accent)" className="spin" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                Submitting job to GoSquad...
              </span>
            </div>
          )}

          {/* ── Done state — iframe embed ─────────────────────── */}
          {stage === 'done' && iframeUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ border: '2px solid #5C8F72', overflow: 'hidden', boxShadow: '4px 4px 0 rgba(92,143,114,0.3)' }}>
                <iframe
                  src={iframeUrl}
                  allow="autoplay; fullscreen; picture-in-picture"
                  style={{ width: '100%', height: 340, display: 'block', border: 'none' }}
                  title={`AI video: ${topic}`}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={copyLink}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px',
                    border: copied ? '2px solid #5C8F72' : 'var(--border-heavy)',
                    background: copied ? 'rgba(92,143,114,0.15)' : 'var(--bg-elevated)',
                    color: copied ? '#5C8F72' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700,
                    cursor: 'pointer', transition: 'var(--transition)',
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'COPIED' : 'COPY LINK'}
                </button>
                <button
                  onClick={() => { reset(); }}
                  style={{
                    padding: '8px 16px',
                    border: 'var(--border-heavy)', background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700,
                    cursor: 'pointer', transition: 'var(--transition)',
                  }}
                >
                  ↺ REGENERATE
                </button>
              </div>
            </div>
          )}

          {/* ── Error state ──────────────────────────────────── */}
          {stage === 'error' && (
            <div style={{
              padding: '20px', border: '2px solid #C9705A',
              background: 'rgba(201,112,90,0.08)',
              display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#C9705A' }}>
                <AlertCircle size={16} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Generation Failed
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                {errorMsg}
              </p>
              <button
                onClick={() => { reset(); setTimeout(handleGenerate, 50); }}
                style={{
                  padding: '8px 20px',
                  background: 'var(--accent)', border: 'var(--border-accent)',
                  color: 'var(--text-on-accent)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                RETRY
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .spin { animation: spinContinuous 1s linear infinite; }
        @keyframes spinContinuous { to { transform: rotate(360deg); } }
        @keyframes filmBob {
          from { transform: scaleY(0.8); opacity: 0.7; }
          to   { transform: scaleY(1.1); opacity: 1; }
        }
        @keyframes indeterminateShift {
          0%   { transform: translateX(-80%); width: 40%; }
          50%  { width: 55%; }
          100% { transform: translateX(180%); width: 40%; }
        }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .brutal-generate-btn:hover {
          transform: translate(-2px,-2px);
          box-shadow: 6px 6px 0 rgba(196,139,32,0.4) !important;
        }
        .brutal-generate-btn:active {
          transform: translate(1px,1px);
          box-shadow: 1px 1px 0 rgba(196,139,32,0.4) !important;
        }
      `}</style>
    </div>
  );
}
