'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { fetchInsights, fetchMindmap } from '@/lib/api';
import type { MindmapNode } from '@/lib/types';
import { MOCK_GRAPH_NODES, MOCK_GRAPH_EDGES } from '@/lib/mockData';

function KnowledgeGraph({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const startLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    const W = container.clientWidth;
    const H = container.clientHeight;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colorMap: Record<string, string> = { concept: '#8B7EC8', entity: '#5C8F72', relation: '#C48B20' };
    const nodes = MOCK_GRAPH_NODES.map(n => ({ ...n, px: n.x * W, py: n.y * H, size: 16 }));

    function frame() {
      timeRef.current += 0.015;
      ctx!.fillStyle = '#1A1D27';
      ctx!.fillRect(0, 0, W, H);

      ctx!.strokeStyle = 'rgba(122, 127, 148, 0.1)';
      ctx!.lineWidth = 1;
      for (let i = 0; i < W; i += 40) { ctx!.beginPath(); ctx!.moveTo(i, 0); ctx!.lineTo(i, H); ctx!.stroke(); }
      for (let i = 0; i < H; i += 40) { ctx!.beginPath(); ctx!.moveTo(0, i); ctx!.lineTo(W, i); ctx!.stroke(); }

      MOCK_GRAPH_EDGES.forEach(({ source, target }) => {
        const nA = nodes.find(n => n.id === source);
        const nB = nodes.find(n => n.id === target);
        if (!nA || !nB) return;
        ctx!.beginPath(); ctx!.strokeStyle = 'rgba(122, 127, 148, 0.4)'; ctx!.lineWidth = 2;
        ctx!.moveTo(nA.px, nA.py); ctx!.lineTo(nB.px, nB.py); ctx!.stroke();
      });

      nodes.forEach(n => {
        const ox = Math.sin(timeRef.current + nodes.indexOf(n)) * 4;
        const oy = Math.cos(timeRef.current + nodes.indexOf(n)) * 4;
        ctx!.fillStyle = 'rgba(122, 127, 148, 0.4)';
        ctx!.fillRect(n.px + ox - n.size / 2 + 3, n.py + oy - n.size / 2 + 3, n.size, n.size);
        ctx!.fillStyle = '#1A1D27';
        ctx!.fillRect(n.px + ox - n.size / 2, n.py + oy - n.size / 2, n.size, n.size);
        ctx!.lineWidth = 2;
        ctx!.strokeStyle = colorMap[n.type] || '#7A7F94';
        ctx!.strokeRect(n.px + ox - n.size / 2, n.py + oy - n.size / 2, n.size, n.size);
        ctx!.fillStyle = colorMap[n.type] || '#7A7F94';
        ctx!.font = '700 9px "Space Mono", monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText(n.label.slice(0, 8), n.px + ox, n.py + oy + n.size + 12);
      });
      animRef.current = requestAnimationFrame(frame);
    }
    frame();
  }, []);

  useEffect(() => {
    if (active) startLoop();
    else if (animRef.current) cancelAnimationFrame(animRef.current);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [active, startLoop]);

  return (
    <div style={{ flex: 1, margin: 16, border: 'var(--border-heavy)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

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

      {/* Skeleton loader */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[80, 60, 90].map((w, i) => (
            <div key={i} style={{ padding: 16, border: 'var(--border-heavy)', background: 'var(--bg-elevated)' }}>
              <div className="skeleton-line" style={{ width: '30%', marginBottom: 10 }} />
              <div className="skeleton-line" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div style={{ padding: 20, border: '2px solid #C9705A', background: 'rgba(201,112,90,0.08)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#C9705A', fontWeight: 700 }}>COULD NOT LOAD INSIGHTS</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{error}</p>
          <button
            onClick={loadInsights}
            style={{ padding: '8px 16px', border: '2px solid #C9705A', background: 'rgba(201,112,90,0.15)', color: '#C9705A', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700 }}
          >
            RETRY
          </button>
        </div>
      )}

      {/* Notes list */}
      {!loading && !error && notes.map(n => {
        const s = tagStyles[n.tag] || tagStyles.insight;
        return (
          <div key={n.id} style={{ padding: '16px', border: 'var(--border-heavy)', background: 'var(--bg-elevated)', position: 'relative', boxShadow: 'var(--shadow-sm)' }}>
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
              <button key={t} onClick={() => setNewTag(t)} style={{
                flex: 1, padding: '4px', border: `2px solid ${tagStyles[t].border}`,
                background: newTag === t ? tagStyles[t].bg : 'none',
                color: tagStyles[t].color, fontFamily: 'var(--font-mono)', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 700,
              }}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="TYPE YOUR INSIGHT..."
            autoFocus
            rows={3}
            style={{ border: 'var(--border-heavy)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', padding: '8px', resize: 'none', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAddNote} style={{ flex: 1, padding: '8px', background: 'var(--accent)', border: 'var(--border-accent)', color: 'var(--text-on-accent)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700, boxShadow: 'var(--shadow-accent)' }}>
              SAVE
            </button>
            <button onClick={() => { setAddingNote(false); setNewText(''); }} style={{ flex: 1, padding: '8px', background: 'none', border: 'var(--border-heavy)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700 }}>
              CANCEL
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingNote(true)}
          style={{ padding: '12px', border: '2px dashed var(--border-strong)', background: 'none', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', cursor: 'pointer', transition: 'var(--transition)', fontWeight: 700 }}
          className="add-note-btn"
        >
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

function CitationsTab() {
  const { citations } = useAppStore();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (id: string, text: string, doc: string, page: string) => {
    const citation = `"${text}" — ${doc}, ${page}`;
    navigator.clipboard.writeText(citation).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 8 }}>SOURCE CITATIONS</h3>
      {citations.map(c => (
        <div key={c.id} style={{ padding: '16px', border: 'var(--border-heavy)', background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)' }}>{c.doc}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-base)', border: 'var(--border-light)', padding: '2px 6px' }}>{c.page}</span>
          </div>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-primary)', fontStyle: 'italic' }}>&ldquo;{c.text}&rdquo;</p>
          <button
            onClick={() => copyToClipboard(c.id, c.text, c.doc, c.page)}
            style={{
              alignSelf: 'flex-start', padding: '5px 12px',
              border: copied === c.id ? '2px solid #5C8F72' : 'var(--border-heavy)',
              background: copied === c.id ? 'rgba(92,143,114,0.15)' : 'var(--bg-base)',
              color: copied === c.id ? '#5C8F72' : 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700, transition: 'var(--transition)',
            }}
            className="copy-btn"
          >
            {copied === c.id ? '✓ COPIED' : 'COPY CITATION'}
          </button>
        </div>
      ))}
      <style jsx>{`.copy-btn:hover { color: var(--text-primary); border-color: var(--accent); transform: translate(-1px,-1px); box-shadow: 2px 2px 0 rgba(196,139,32,0.4); }`}</style>
    </div>
  );
}

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
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'notes'     && <NotesTab />}
        {activeTab === 'graph'     && <KnowledgeGraph active={activeTab === 'graph'} />}
        {activeTab === 'citations' && <CitationsTab />}
        {activeTab === 'mindmap'   && <MindmapTab />}
      </div>
    </aside>
  );
}
