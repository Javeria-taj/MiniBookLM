'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { streamQuery } from '@/lib/api';
import { formatMessage } from '../../lib/formatMessage';
import VideoPanel from '@/components/video/VideoPanel';
import type { Citation, Message, QueryRequest, QuizQuestion } from '@/lib/types';

// ── Preset queries for action buttons ─────────────────────────
const NOTEBOOK_ID = 'default-notebook';

const ACTION_QUERIES: Record<string, string> = {
  summarize: 'Summarize this document in detail',
  explain: 'Explain the key concepts in this document',
  quiz: 'Generate 5 quiz questions from this document',
  mindmap: 'Describe the main topics and how they connect in this document',
};

// ── Sub-components (UI-only, no logic changes) ─────────────────

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 16, maxWidth: 880, margin: '0 auto', width: '100%' }}>
      <div style={{
        width: 36, height: 36,
        background: 'var(--accent-subtle)', border: 'var(--border-accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem', fontWeight: 900, color: 'var(--accent)',
        boxShadow: 'var(--shadow-sm)',
      }}>?</div>
      <div style={{
        padding: '12px 16px',
        background: 'var(--bg-elevated)', border: 'var(--border-heavy)',
        fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)',
        boxShadow: 'var(--shadow-sm)', textTransform: 'uppercase', fontWeight: 700,
      }}>
        SYSTEM PROCESSING...
      </div>
    </div>
  );
}

function DocumentHeartbeat() {
  const [hover, setHover] = useState(false);
  const bars = 7;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, height: 90, marginBottom: 32, cursor: 'pointer',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 10,
            height: hover
              ? [30, 60, 100, 130, 100, 60, 30][i]
              : [15, 30, 50, 70, 50, 30, 15][i],
            background: hover ? 'var(--text-primary)' : 'var(--accent)',
            border: `2px solid ${hover ? 'var(--text-primary)' : 'var(--accent)'}`,
            boxShadow: hover
              ? '4px 4px 0 rgba(196, 139, 32, 0.8)'
              : '2px 2px 0 rgba(196, 139, 32, 0.4)',
            animation: hover
              ? `pulseActive 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) ${i * 0.1}s infinite alternate`
              : `pulseSoft 1.5s ease-in-out ${i * 0.2}s infinite alternate`,
            transformOrigin: 'bottom',
            transition: 'height 0.2s ease, background 0.2s ease',
          }}
        />
      ))}
      <style>{`
        @keyframes pulseSoft {
          0% { transform: scaleY(0.6); opacity: 0.6; }
          100% { transform: scaleY(1); opacity: 0.9; }
        }
        @keyframes pulseActive {
          0% { transform: scaleY(0.3); opacity: 0.8; }
          100% { transform: scaleY(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function WelcomeScreen({ onChip }: { onChip: (text: string) => void }) {
  const chips = ['Explain scaling laws', 'Summarize core themes', 'Generate quiz', 'Extract methodology'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', margin: 'auto', padding: '40px 20px' }}>
      <DocumentHeartbeat />
      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 16 }}>
        YOUR SECOND BRAIN
      </h1>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: 450, lineHeight: 1.6, marginBottom: 32, textTransform: 'uppercase' }}>
        Think deeper with your documents. A research companion grounded in your sources.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {chips.map((c) => (
          <button
            key={c} onClick={() => onChip(c)}
            style={{
              padding: '10px 16px',
              background: 'var(--bg-surface)', border: 'var(--border-heavy)',
              color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer', transition: 'var(--transition)',
              boxShadow: 'var(--shadow-sm)',
            }}
            className="brutal-chip"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuizMessage({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {questions.map((q, qi) => (
        <div key={qi} style={{ background: 'var(--bg-elevated)', border: 'var(--border-heavy)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: 'var(--bg-hover)', borderBottom: 'var(--border-heavy)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            KNOWLEDGE TEST — 0{qi + 1}
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{q.q}</p>
            {q.options.map((opt, oi) => {
              const answered = answers[qi] !== undefined;
              const isSelected = answers[qi] === oi;
              const isCorrect = oi === q.correct;
              let bg = 'var(--bg-surface)', color = 'var(--text-primary)', border = 'var(--border-heavy)', shadow = 'var(--shadow-sm)';
              if (answered) {
                if (isCorrect) { bg = 'rgba(92, 143, 114, 0.15)'; color = '#5C8F72'; border = '2px solid #5C8F72'; }
                else if (isSelected) { bg = 'rgba(201, 112, 90, 0.15)'; color = '#C9705A'; border = '2px solid #C9705A'; }
                shadow = 'none';
              }
              return (
                <button
                  key={oi} disabled={answered}
                  onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                  style={{
                    padding: '10px 14px', background: bg, color, border, textAlign: 'left',
                    fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
                    cursor: answered ? 'default' : 'pointer', transition: 'var(--transition)', boxShadow: shadow,
                  }}
                  className={!answered ? 'brutal-quiz-opt' : ''}
                >
                  [{String.fromCharCode(65 + oi)}] {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ msg, onSaveNote }: { msg: Message; onSaveNote: (text: string) => void }) {
  const isAI = msg.role === 'ai';
  return (
    <div
      style={{ display: 'flex', gap: 16, flexDirection: isAI ? 'row' : 'row-reverse', maxWidth: 880, margin: '0 auto', width: '100%' }}
      className="msg-appear"
    >
      <div style={{
        width: 36, height: 36, flexShrink: 0,
        background: isAI ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
        border: isAI ? 'var(--border-accent)' : 'var(--border-heavy)',
        color: isAI ? 'var(--accent)' : 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: '0.9rem',
        boxShadow: isAI ? 'var(--shadow-accent)' : 'var(--shadow-sm)',
      }}>
        {isAI ? 'AI' : 'US'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            padding: '16px 20px',
            background: isAI ? 'var(--bg-surface)' : 'var(--bg-hover)',
            border: 'var(--border-heavy)',
            color: 'var(--text-primary)',
            fontFamily: isAI ? 'var(--font-body)' : 'var(--font-mono)',
            lineHeight: 1.6, fontSize: '0.95rem',
            boxShadow: 'var(--shadow-sm)',
          }}
          className={msg.isStreaming ? 'typing-cursor' : ''}
          dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
        />

        {/* Sources section — shown after streaming completes */}
        {isAI && !msg.isStreaming && msg.sources && msg.sources.length > 0 && (
          <div style={{
            marginTop: 8, padding: '10px 14px',
            background: 'var(--bg-elevated)', border: 'var(--border-heavy)',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              SOURCES
            </span>
            {msg.sources.map((s, i) => (
              <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>p.{s.page}</span>
                {' — '}{s.docName}{' · '}{s.text.slice(0, 80)}{s.text.length > 80 ? '…' : ''}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: isAI ? 'flex-start' : 'flex-end' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isAI && (
            <button
              onClick={() => onSaveNote(msg.content)}
              style={{
                background: 'none', border: 'none', color: 'var(--accent)',
                fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                cursor: 'pointer', textDecoration: 'underline', fontWeight: 700,
              }}
            >
              SAVE INSIGHT
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ChatPanel ─────────────────────────────────────────────
export default function ChatPanel() {
  const router = useRouter();
  const {
    messages, addMessage, updateLastAIMessage, finalizeLastAIMessage,
    clearMessages, isLoading, setLoading, level, addNote, setActiveTab, setCitations,
  } = useAppStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [input, setInput] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showTyping]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Abort any in-flight request before starting a new one
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setInput('');
    setLoading(true);

    // Add user message immediately
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    });

    // Show typing indicator while waiting for first response
    setShowTyping(true);

    // Add placeholder AI message
    addMessage({
      id: crypto.randomUUID(),
      role: 'ai',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    });

    setShowTyping(false);

    const req: QueryRequest = {
      query: text,
      doc_id: NOTEBOOK_ID,
      user_level: level,
    };

    try {
      for await (const chunk of streamQuery(req, abortRef.current.signal)) {
        if (chunk.token) {
          updateLastAIMessage(chunk.token);
        }
        if (chunk.done) {
          finalizeLastAIMessage(chunk.sources ?? []);

          // Update citations panel with retrieved chunks
          if (chunk.retrieved_chunks && chunk.retrieved_chunks.length > 0) {
            const citations: Citation[] = chunk.retrieved_chunks.map((c, i) => ({
              id: String(i),
              doc: c.source,
              text: c.text,
              page: String(c.page),
            }));
            setCitations(citations);
            setActiveTab('citations');
          }
        }
      }
    } catch (err) {
      const error = err as Error;
      if (error.name === 'AbortError') {
        // Clean abort — previous message was intentionally cancelled
        return;
      }
      finalizeLastAIMessage([]);
      showToast(error.message || 'Failed to get a response', 'error');
    } finally {
      setLoading(false);
      setShowTyping(false);
    }
  };

  const handleAction = (action: string) => {
    if (action === 'quiz') {
      router.push('/quiz');
      return;
    }
    if (action === 'mindmap') {
      router.push('/mindmap');
      return;
    }
    if (action === 'flashcards') {
      router.push('/flashcards');
      return;
    }
    
    const preset = ACTION_QUERIES[action];
    if (preset) {
      sendMessage(preset);
    }
  };

  const toastColors = {
    success: { bg: 'rgba(92,143,114,0.15)', color: '#5C8F72', border: '#5C8F72' },
    error: { bg: 'rgba(201,112,90,0.15)', color: '#C9705A', border: '#C9705A' },
    info: { bg: 'rgba(139,126,200,0.15)', color: '#8B7EC8', border: '#8B7EC8' },
  };

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Video generation modal */}
      <VideoPanel isOpen={showVideo} onClose={() => setShowVideo(false)} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 20px',
          background: toastColors[toast.type].bg,
          border: `2px solid ${toastColors[toast.type].border}`,
          boxShadow: `4px 4px 0 ${toastColors[toast.type].border}`,
          color: toastColors[toast.type].color,
          fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700,
          textTransform: 'uppercase',
          animation: 'slideUpFade 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '✦'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 20px', borderBottom: 'var(--border-heavy)', background: 'var(--bg-surface)', overflowX: 'auto' }}>
        {['Summarize', 'Explain', 'Quiz', 'Mindmap', 'Flashcards'].map((a) => (
          <button
            key={a}
            onClick={() => handleAction(a.toLowerCase())}
            disabled={isLoading}
            style={{
              padding: '6px 14px', border: '2px solid rgba(196, 139, 32, 0.4)',
              background: 'var(--accent-subtle)', color: 'var(--accent)',
              fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'var(--transition)', fontWeight: 700,
              boxShadow: 'var(--shadow-accent)',
              opacity: isLoading ? 0.5 : 1,
            }}
            className="brutal-action-btn"
          >
            {a}
          </button>
        ))}

        {/* VIDEO — special accent button */}
        <button
          onClick={() => setShowVideo(true)}
          disabled={isLoading}
          style={{
            padding: '6px 14px',
            border: '2px solid rgba(107,159,212,0.5)',
            background: 'rgba(107,159,212,0.1)', color: '#6B9FD4',
            fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'var(--transition)', fontWeight: 700,
            boxShadow: '2px 2px 0 rgba(107,159,212,0.2)',
            opacity: isLoading ? 0.5 : 1,
          }}
          className="brutal-action-btn"
        >
          ▶ VIDEO
        </button>

        <button
          onClick={clearMessages}
          style={{
            marginLeft: 'auto', border: 'none', background: 'none',
            color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700,
          }}
        >
          CLEAR LOG
        </button>
      </div>

      {/* Message log */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        {messages.length === 0 && !showTyping
          ? <WelcomeScreen onChip={sendMessage} />
          : messages.map((msg) =>
            msg.content === '__QUIZ__' && quizData
              ? <div key={msg.id} style={{ maxWidth: 880, margin: '0 auto', width: '100%' }}><QuizMessage questions={quizData} /></div>
              : <MessageBubble
                key={msg.id}
                msg={msg}
                onSaveNote={(n) => {
                  addNote({ id: crypto.randomUUID(), tag: 'insight', text: n });
                  setActiveTab('notes');
                  showToast('Insight saved to Notes ✓', 'success');
                }}
              />
          )
        }
        {showTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: '20px', background: 'var(--bg-base)', borderTop: 'var(--border-heavy)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--bg-surface)', border: 'var(--border-heavy)', padding: '10px 16px',
          boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.1)',
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="ASK ANYTHING ABOUT YOUR SOURCES..."
            disabled={isLoading}
            style={{
              flex: 1, border: 'none', background: 'none',
              fontFamily: 'var(--font-mono)', fontSize: '0.95rem',
              color: 'var(--text-primary)', outline: 'none', resize: 'none',
              opacity: isLoading ? 0.6 : 1,
            }}
            rows={1}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            style={{
              width: 36, height: 36,
              background: 'var(--accent)', border: 'var(--border-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
              color: 'var(--text-on-accent)',
              boxShadow: '2px 2px 0 rgba(122, 127, 148, 0.4)',
              transition: 'var(--transition)',
              opacity: isLoading || !input.trim() ? 0.5 : 1,
            }}
            className="brutal-send-btn"
          >
            <Send size={16} strokeWidth={3} />
          </button>
        </div>
      </div>

      <style>{`
        .brutal-action-btn:hover:not(:disabled) { transform: translate(-2px, -2px); box-shadow: 4px 4px 0 rgba(196,139,32,0.4) !important; }
        .brutal-action-btn:active:not(:disabled) { transform: translate(1px, 1px); box-shadow: 1px 1px 0 rgba(196,139,32,0.4) !important; }
        .brutal-send-btn:hover:not(:disabled) { transform: translate(-2px, -2px); box-shadow: 4px 4px 0 rgba(196,139,32,0.4) !important; }
        .brutal-send-btn:active:not(:disabled) { transform: translate(1px, 1px); box-shadow: 1px 1px 0 rgba(196,139,32,0.4) !important; }
        .brutal-chip:hover { background: var(--bg-hover); transform: translate(-2px,-2px); box-shadow: 4px 4px 0 rgba(122,127,148,0.4); }
        .brutal-chip:active { transform: translate(1px,1px); box-shadow: 1px 1px 0 rgba(122,127,148,0.4); }
        .brutal-quiz-opt:hover { background: var(--bg-hover); transform: translate(-2px,-2px); box-shadow: 4px 4px 0 rgba(122,127,148,0.4) !important; }
        .brutal-quiz-opt:active { transform: translate(1px,1px); box-shadow: 1px 1px 0 rgba(122,127,148,0.4) !important; }
        .msg-appear { animation: fadeInUp 0.25s ease-out both; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUpFade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .typing-cursor::after { content: '▋'; animation: blink 0.9s step-end infinite; color: var(--accent); }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </main>
  );
}
