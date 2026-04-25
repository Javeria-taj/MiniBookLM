'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { fetchInsights, fetchMindmap, fetchGraph } from '@/lib/api';
import type { MindmapNode, GraphResponse } from '@/lib/types';

// ── Node type → colour mapping ────────────────────────────────
const NODE_COLORS: Record<string, string> = {
  concept:      '#E8A838',
  person:       '#6B9FD4',
  organisation: '#7EC8A4',
  event:        '#D47B6B',
  term:         '#9FA3AD',
};
const DEFAULT_NODE_COLOR = '#9FA3AD';
const NOTEBOOK_ID = 'default-notebook';

// ── Internal node type with canvas coords ─────────────────────
interface CanvasNode {
  id: string;
  label: string;
  type: string;
  // normalised 0–1 starting position, then mutated by drift
  x: number;
  y: number;
}

interface CanvasEdge {
  source: string;
  target: string;
  relationship?: string;
}

// ── KnowledgeGraph canvas component ──────────────────────────
function KnowledgeGraph({ active }: { active: boolean }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const animRef     = useRef<number | null>(null);
  const timeRef     = useRef(0);
  // refs so the animation loop always reads the latest data
  const nodesRef    = useRef<CanvasNode[]>([]);
  const edgesRef    = useRef<CanvasEdge[]>([]);

  const [status, setStatus]   = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [loaded, setLoaded]   = useState(false);

  // ── Build circular layout from raw API response ─────────────
  const applyLayout = useCallback((data: GraphResponse) => {
    const n = data.nodes.length;
    if (n === 0) { nodesRef.current = []; edgesRef.current = []; return; }

    const cx = 0.5, cy = 0.5, r = 0.35;
    nodesRef.current = data.nodes.map((node, i) => ({
      id:    node.id,
      label: node.label,
      type:  node.type,
      x: cx + r * Math.cos((2 * Math.PI * i) / n),
      y: cy + r * Math.sin((2 * Math.PI * i) / n),
    }));
    edgesRef.current = data.edges.map(e => ({
      source:       e.source,
      target:       e.target,
      relationship: e.relationship,
    }));
  }, []);

  // ── Fetch graph data when tab becomes active ─────────────────
  useEffect(() => {
    if (!active || loaded) return;
    setStatus('loading');
    fetchGraph(NOTEBOOK_ID)
      .then(data => {
        applyLayout(data);
        setStatus(data.nodes.length === 0 ? 'idle' : 'ready');
        setLoaded(true);
      })
      .catch(() => setStatus('error'));
  }, [active, loaded, applyLayout]);

  // ── Canvas animation loop ──────────────────────────────────
  const startLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function frame() {
      timeRef.current += 0.015;
      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      // Background
      ctx!.fillStyle = '#1A1D27';
      ctx!.fillRect(0, 0, W, H);

      // Grid
      ctx!.strokeStyle = 'rgba(122,127,148,0.08)';
      ctx!.lineWidth = 1;
      for (let i = 0; i < W; i += 40) { ctx!.beginPath(); ctx!.moveTo(i, 0); ctx!.lineTo(i, H); ctx!.stroke(); }
      for (let i = 0; i < H; i += 40) { ctx!.beginPath(); ctx!.moveTo(0, i); ctx!.lineTo(W, i); ctx!.stroke(); }

      if (nodes.length === 0) { animRef.current = requestAnimationFrame(frame); return; }

      // Compute drifted positions for this frame
      const drifted = nodes.map((n, i) => ({
        ...n,
        px: n.x * W + Math.sin(timeRef.current + i * 1.3) * 5,
        py: n.y * H + Math.cos(timeRef.current + i * 1.1) * 5,
      }));

      // Edges
      edges.forEach(({ source, target, relationship }) => {
        const nA = drifted.find(n => n.id === source);
        const nB = drifted.find(n => n.id === target);
        if (!nA || !nB) return;

        // Line
        ctx!.beginPath();
        ctx!.strokeStyle = 'rgba(122,127,148,0.35)';
        ctx!.lineWidth = 1.5;
        ctx!.moveTo(nA.px, nA.py);
        ctx!.lineTo(nB.px, nB.py);
        ctx!.stroke();

        // Relationship label at midpoint
        const mx = (nA.px + nB.px) / 2;
        const my = (nA.py + nB.py) / 2;
        ctx!.font = '9px "DM Mono", monospace';
        ctx!.fillStyle = 'rgba(90,86,80,0.9)';
        ctx!.textAlign = 'center';
        ctx!.fillText(relationship ?? '', mx, my - 3);
      });

      // Nodes
      const SIZE = 14;
      drifted.forEach(n => {
        const color = NODE_COLORS[n.type] ?? DEFAULT_NODE_COLOR;

        // Drop shadow
        ctx!.fillStyle = 'rgba(0,0,0,0.4)';
        ctx!.fillRect(n.px - SIZE / 2 + 3, n.py - SIZE / 2 + 3, SIZE, SIZE);

        // Fill
        ctx!.fillStyle = '#1A1D27';
        ctx!.fillRect(n.px - SIZE / 2, n.py - SIZE / 2, SIZE, SIZE);

        // Border (type colour)
        ctx!.lineWidth = 2;
        ctx!.strokeStyle = color;
        ctx!.strokeRect(n.px - SIZE / 2, n.py - SIZE / 2, SIZE, SIZE);

        // Label below node
        ctx!.fillStyle = color;
        ctx!.font = '700 9px "DM Mono", monospace';
        ctx!.textAlign = 'center';
        const displayLabel = n.label.length > 12 ? n.label.slice(0, 11) + '…' : n.label;
        ctx!.fillText(displayLabel, n.px, n.py + SIZE + 12);
      });

      animRef.current = requestAnimationFrame(frame);
    }
    frame();
  }, []); // stable — reads live data via refs

  // ── Start / stop loop when tab activates ─────────────────────
  useEffect(() => {
    if (active && status === 'ready') {
      startLoop();
    } else if (!active && animRef.current) {
      cancelAnimationFrame(animRef.current);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [active, status, startLoop]);

  // ── Skeleton while loading ────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-elevated)', animation: 'shimmer 1.5s linear infinite', border: '2px solid var(--border)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>MAPPING KNOWLEDGE...</span>
        <style>{`@keyframes shimmer { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, textAlign: 'center' }}>
        <span style={{ fontSize: '2rem' }}>✕</span>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#C9705A', fontWeight: 700 }}>COULD NOT LOAD KNOWLEDGE GRAPH</p>
        <button
          onClick={() => { setLoaded(false); setStatus('idle'); }}
          style={{ padding: '8px 20px', background: 'var(--accent)', border: 'var(--border-accent)', color: 'var(--text-on-accent)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
        >
          RETRY
        </button>
      </div>
    );
  }

  // ── Empty state (no nodes) ────────────────────────────────────
  if (status === 'idle' && loaded) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, textAlign: 'center' }}>
        <span style={{ fontSize: '2.5rem', opacity: 0.3 }}>◈</span>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
          Upload a document to generate<br />the knowledge graph
        </p>
      </div>
    );
  }

  // ── Canvas ────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, margin: 16, border: 'var(--border-heavy)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', minHeight: 300 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

// ── NotesTab ──────────────────────────────────────────────────
function NotesTab() {
  const { notes, addNote, setNotes } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingNote, setAddingNote] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTag, setNewTag] = useState<'insight' | 'tip' | 'warning'>('insight');

  const tagStyles: Record<string, { bg: string; color: string; border: string }> = {
    insight: { bg: 'rgba(92, 143, 114, 0.15)', color: '#5C8F72', border: '#5C8F72' },
    tip:     { bg: 'rgba(139, 126, 200, 0.15)', color: '#8B7EC8', border: '#8B7EC8' },
    warning: { bg: 'rgba(201, 112, 90, 0.15)',  color: '#C9705A', border: '#C9705A' },
  };

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInsights('default-notebook');
      const mapped: import('@/lib/types').Note[] = [
        { id: crypto.randomUUID(), tag: 'insight', text: data.summary },
        ...data.key_topics.map(t => ({ id: crypto.randomUUID(), tag: 'tip' as const, text: t })),
        ...data.suggested_questions.map(q => ({ id: crypto.randomUUID(), tag: 'warning' as const, text: q })),
      ];
      setNotes(mapped);
    } catch (e) {
      setError((e as Error).message || 'Could not load insights');
    } finally {
      setLoading(false);
    }
  }, [setNotes]);

  // Fetch on mount
  useEffect(() => { loadInsights(); }, [loadInsights]);

  const handleAddNote = () => {
    if (!newText.trim()) return;
    addNote({ id: crypto.randomUUID(), tag: newTag, text: newText.trim() });
    setNewText('');
    setAddingNote(false);
  };

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>INSIGHT FEED</h3>
      <button
          onClick={loadInsights}
          disabled={loading}
          style={{ background: 'none', border: 'none', color: loading ? 'var(--accent)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, transition: 'var(--transition)' }}
        >
          {loading ? 'LOADING...' : 'REFRESH'}
        </button>
      </div>
      {/* Notes list */}
      {!loading && !error && notes.map(n => {
        const s = tagStyles[n.tag] || tagStyles.insight;
        return (
          <div key={n.id} style={{ padding: 16, border: 'var(--border-heavy)', background: 'var(--bg-elevated)', position: 'relative', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'inline-block', marginBottom: 8, background: s.bg, border: `2px solid ${s.border}`, padding: '2px 8px', fontSize: '0.65rem', fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>
              {n.tag.toUpperCase()}
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>{n.text}</p>
          </div>
        );
      })}

      {/* Add manual note */}
      {!loading && !error && (addingNote ? (
        <div style={{ border: 'var(--border-accent)', background: 'var(--bg-elevated)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: 'var(--shadow-accent)' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['insight', 'tip', 'warning'] as const).map(t => (
              <button key={t} onClick={() => setNewTag(t)} style={{ flex: 1, padding: 4, border: `2px solid ${tagStyles[t].border}`, background: newTag === t ? tagStyles[t].bg : 'none', color: tagStyles[t].color, fontFamily: 'var(--font-mono)', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 700 }}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <textarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="TYPE YOUR INSIGHT..." autoFocus rows={3} style={{ border: 'var(--border-heavy)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', padding: 8, resize: 'none', outline: 'none' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { if (!newText.trim()) return; addNote({ id: crypto.randomUUID(), tag: newTag, text: newText.trim() }); setNewText(''); setAddingNote(false); }} style={{ flex: 1, padding: 8, background: 'var(--accent)', border: 'var(--border-accent)', color: 'var(--text-on-accent)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700 }}>SAVE</button>
            <button onClick={() => { setAddingNote(false); setNewText(''); }} style={{ flex: 1, padding: 8, background: 'none', border: 'var(--border-heavy)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700 }}>CANCEL</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingNote(true)} style={{ padding: 12, border: '2px dashed var(--border-strong)', background: 'none', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 700 }}>
          + ADD MANUAL ENTRY
        </button>
      ))}
      <style jsx>{`.add-note-btn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--accent); }`}</style>
    </div>
  );
}


// ── Mindmap recursive node ────────────────────────────────────
function MindmapNodeComponent({ node, depth }: { node: MindmapNode; depth: number }) {
  const isRoot = depth === 0;
  const isLeaf = !node.children || node.children.length === 0;
  const [open, setOpen] = useState(true);

  const nodeStyle: React.CSSProperties = isRoot
    ? {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', border: 'var(--border-accent)',
        background: 'var(--accent-subtle)', color: 'var(--accent)',
        fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
        cursor: isLeaf ? 'default' : 'pointer',
        boxShadow: 'var(--shadow-accent)', transition: 'var(--transition)',
      }
    : depth === 1
    ? {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px',
        borderLeft: '3px solid var(--accent)',
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700,
        cursor: isLeaf ? 'default' : 'pointer',
        boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)',
      }
    : {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px',
        borderLeft: '2px dashed var(--text-muted)',
        background: 'none',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 400,
        cursor: 'default',
      };

  return (
    <div style={{ paddingLeft: isRoot ? 0 : 20 * depth, paddingTop: 6, paddingBottom: 2 }}>
      <div
        style={nodeStyle}
        onClick={() => { if (!isLeaf) setOpen(o => !o); }}
        role={isLeaf ? undefined : 'button'}
        aria-expanded={isLeaf ? undefined : open}
      >
        {!isLeaf && (
          open
            ? <ChevronDown size={13} style={{ flexShrink: 0 }} />
            : <ChevronRight size={13} style={{ flexShrink: 0 }} />
        )}
        {node.label}
      </div>

      {/* Animated children */}
      {!isLeaf && (
        <div style={{
          overflow: 'hidden',
          maxHeight: open ? 9999 : 0,
          transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {node.children.map(child => (
            <MindmapNodeComponent key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function MindmapTab() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [root, setRoot] = useState<MindmapNode | null>(null);

  const loadMindmap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMindmap('default-notebook');
      setRoot(data.root);
    } catch (e) {
      setError((e as Error).message || 'Could not load mindmap');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMindmap(); }, [loadMindmap]);

  // ── Skeleton (3-level tree shimmer) ──
  const SkeletonTree = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Root */}
      <div className="skeleton-line" style={{ width: '55%', height: 32, marginBottom: 8 }} />
      {/* Branch 1 + leaves */}
      <div style={{ paddingLeft: 20 }}>
        <div className="skeleton-line" style={{ width: '65%', height: 22, marginBottom: 6 }} />
        <div style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div className="skeleton-line" style={{ width: '70%', height: 14 }} />
          <div className="skeleton-line" style={{ width: '50%', height: 14 }} />
        </div>
      </div>
      {/* Branch 2 + leaves */}
      <div style={{ paddingLeft: 20, marginTop: 4 }}>
        <div className="skeleton-line" style={{ width: '60%', height: 22, marginBottom: 6 }} />
        <div style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div className="skeleton-line" style={{ width: '75%', height: 14 }} />
          <div className="skeleton-line" style={{ width: '45%', height: 14 }} />
          <div className="skeleton-line" style={{ width: '60%', height: 14 }} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>CONCEPT MAP</h3>
        <button
          onClick={loadMindmap}
          disabled={loading}
          style={{ background: 'none', border: 'none', color: loading ? 'var(--accent)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, transition: 'var(--transition)' }}
        >
          {loading ? 'LOADING...' : 'REFRESH'}
        </button>
      </div>

      {/* Skeleton */}
      {loading && <SkeletonTree />}

      {/* Error */}
      {!loading && error && (
        <div style={{ padding: 20, border: '2px solid #C9705A', background: 'rgba(201,112,90,0.08)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#C9705A', fontWeight: 700 }}>COULD NOT LOAD MINDMAP</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{error}</p>
          <button
            onClick={loadMindmap}
            style={{ padding: '8px 16px', border: '2px solid #C9705A', background: 'rgba(201,112,90,0.15)', color: '#C9705A', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700 }}
          >
            RETRY
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !root && (
        <div style={{ padding: '32px 20px', textAlign: 'center', border: '2px dashed var(--border-strong)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>NO MINDMAP YET</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Upload a document to generate the mindmap.</p>
        </div>
      )}

      {/* Tree */}
      {!loading && !error && root && (
        <div style={{ border: 'var(--border-heavy)', background: 'var(--bg-elevated)', padding: '16px', boxShadow: 'var(--shadow-sm)', overflowX: 'auto' }}>
          <MindmapNodeComponent node={root} depth={0} />
        </div>
      )}
    </div>
  );
}

// ── CitationsTab ──────────────────────────────────────────────
function CitationsTab() {
  const { citations } = useAppStore();
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 8 }}>SOURCE CITATIONS</h3>
      {citations.length === 0 && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>ASK A QUESTION TO SEE CITATIONS</p>
      )}
      {citations.map(c => (
        <div key={c.id} style={{ padding: 16, border: 'var(--border-heavy)', background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)' }}>{c.doc}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-base)', border: 'var(--border-light)', padding: '2px 6px' }}>{c.page}</span>
          </div>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-primary)', fontStyle: 'italic' }}>&ldquo;{c.text}&rdquo;</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`"${c.text}" — ${c.doc}, ${c.page}`).then(() => {
                setCopied(c.id);
                setTimeout(() => setCopied(null), 2000);
              });
            }}
            style={{
              alignSelf: 'flex-start', padding: '5px 12px',
              border: copied === c.id ? '2px solid #5C8F72' : 'var(--border-heavy)',
              background: copied === c.id ? 'rgba(92,143,114,0.15)' : 'var(--bg-base)',
              color: copied === c.id ? '#5C8F72' : 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700, transition: 'var(--transition)',
            }}
          >
            {copied === c.id ? '✓ COPIED' : 'COPY CITATION'}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── RightPanel shell (tab switching — unchanged) ──────────────
export default function RightPanel() {
  const router = useRouter();
  const { activeTab, setActiveTab } = useAppStore();
  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'notes',     label: 'NOTES' },
    { key: 'graph',     label: 'GRAPH' },
    { key: 'citations', label: 'CITATIONS' },
    { key: 'mindmap',  label: 'MINDMAP' },
  ];

  return (
    <aside style={{ width: 'var(--right-panel-w)', flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', borderLeft: 'var(--border-heavy)' }}>
      <div style={{ display: 'flex', borderBottom: 'var(--border-heavy)', padding: '12px 16px 0', gap: 4 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => {
              if (t.key === 'graph') { router.push('/mindmap'); return; }
              setActiveTab(t.key);
            }}
            style={{
              padding: '8px 10px', border: 'none',
              borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'none',
              color: activeTab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700,
              cursor: 'pointer', transition: 'var(--transition)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'notes'     && <NotesTab />}
        {activeTab === 'graph'     && <KnowledgeGraph active={activeTab === 'graph'} />}
        {activeTab === 'citations' && <CitationsTab />}
        {activeTab === 'mindmap'   && <MindmapTab />}
      </div>
    </aside>
  );
}
