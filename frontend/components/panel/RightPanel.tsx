'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/store/appStore';
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
  const [refreshing, setRefreshing] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTag, setNewTag] = useState<'insight' | 'tip' | 'warning'>('insight');

  const tagStyles: Record<string, { bg: string; color: string; border: string }> = {
    insight: { bg: 'rgba(92, 143, 114, 0.15)', color: '#5C8F72', border: '#5C8F72' },
    tip:     { bg: 'rgba(139, 126, 200, 0.15)', color: '#8B7EC8', border: '#8B7EC8' },
    warning: { bg: 'rgba(201, 112, 90, 0.15)',  color: '#C9705A', border: '#C9705A' },
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setNotes([...notes].sort(() => Math.random() - 0.5));
    setTimeout(() => setRefreshing(false), 600);
  };

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
          onClick={handleRefresh}
          style={{ background: 'none', border: 'none', color: refreshing ? 'var(--accent)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700, transition: 'var(--transition)' }}
        >
          {refreshing ? 'SHUFFLING...' : 'REFRESH'}
        </button>
      </div>

      {notes.map(n => {
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

      {addingNote ? (
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
      )}
      <style jsx>{`.add-note-btn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--accent); }`}</style>
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
  const { activeTab, setActiveTab } = useAppStore();
  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'notes',     label: 'NOTES' },
    { key: 'graph',     label: 'GRAPH' },
    { key: 'citations', label: 'CITATIONS' },
  ];

  return (
    <aside style={{ width: 'var(--right-panel-w)', flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', borderLeft: 'var(--border-heavy)' }}>
      <div style={{ display: 'flex', borderBottom: 'var(--border-heavy)', padding: '12px 16px 0', gap: 4 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '8px 10px', border: 'none',
            borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
            background: 'none',
            color: activeTab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700,
            cursor: 'pointer', transition: 'var(--transition)',
          }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'notes'     && <NotesTab />}
        {activeTab === 'graph'     && <KnowledgeGraph active={activeTab === 'graph'} />}
        {activeTab === 'citations' && <CitationsTab />}
      </div>
    </aside>
  );
}
