'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import { Home, ZoomIn, ZoomOut, RefreshCcw } from 'lucide-react';
import { MOCK_GRAPH_NODES, MOCK_GRAPH_EDGES } from '@/lib/mockData';

export default function MindmapPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // force re-render for canvas resize

  const colorMap: Record<string, { fill: string; border: string; label: string }> = {
    concept:  { fill: 'rgba(139,126,200,0.15)', border: '#8B7EC8', label: '#8B7EC8' },
    entity:   { fill: 'rgba(92,143,114,0.15)',  border: '#5C8F72', label: '#5C8F72' },
    relation: { fill: 'rgba(196,139,32,0.15)',  border: '#C48B20', label: '#C48B20' },
  };

  const nodeInfo: Record<string, string> = {
    n1: 'The foundational architecture powering all modern LLMs — GPT, BERT, T5, and beyond.',
    n2: 'Allows each token to attend to all other tokens, computing context-aware representations.',
    n3: 'Performance scales predictably as a power law with model size, data, and compute.',
    n4: 'Generative Pre-trained Transformer — OpenAI\'s autoregressive model family.',
    n5: 'Bidirectional Encoder Representations from Transformers — masking-based pretraining.',
    n6: 'Standardized tasks used to measure and compare model capabilities across research.',
    n7: 'Running multiple attention heads in parallel to capture different representation subspaces.',
    n8: 'AI research lab behind GPT series, scaling laws research, and alignment work.',
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement!;
    const W = container.clientWidth;
    const H = container.clientHeight;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    timeRef.current += 0.01;
    const t = timeRef.current;
    const Z = zoom;

    // Background grid
    ctx.fillStyle = 'var(--bg-base, #12141C)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(122,127,148,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 40 * Z) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
    for (let i = 0; i < H; i += 40 * Z) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }

    const nodes = MOCK_GRAPH_NODES.map(n => ({
      ...n,
      px: n.x * W * Z + (W * (1 - Z)) / 2,
      py: n.y * H * Z + (H * (1 - Z)) / 2,
      size: (n.id === 'n1' ? 28 : 18) * Z,
    }));

    // Draw edges with animated dash
    MOCK_GRAPH_EDGES.forEach(({ source, target }) => {
      const nA = nodes.find(n => n.id === source);
      const nB = nodes.find(n => n.id === target);
      if (!nA || !nB) return;
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -t * 8;
      ctx.strokeStyle = 'rgba(122,127,148,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(nA.px, nA.py);
      ctx.lineTo(nB.px, nB.py);
      ctx.stroke();
      ctx.restore();
    });

    // Draw nodes
    nodes.forEach(n => {
      const c = colorMap[n.type] || colorMap.concept;
      const ox = Math.sin(t + nodes.indexOf(n) * 0.8) * 3;
      const oy = Math.cos(t + nodes.indexOf(n) * 0.8) * 3;
      const isSelected = selectedNode === n.id;
      const size = n.size + (isSelected ? 6 : 0);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(n.px + ox - size / 2 + 4, n.py + oy - size / 2 + 4, size, size);

      // Node body
      ctx.fillStyle = isSelected ? c.border : c.fill;
      ctx.fillRect(n.px + ox - size / 2, n.py + oy - size / 2, size, size);

      // Node border
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeStyle = c.border;
      ctx.strokeRect(n.px + ox - size / 2, n.py + oy - size / 2, size, size);

      // Label
      ctx.fillStyle = isSelected ? '#FFFFFF' : c.label;
      ctx.font = `700 ${Math.max(9, 10 * Z)}px "Space Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(n.label, n.px + ox, n.py + oy + size / 2 + 6);
    });

    animRef.current = requestAnimationFrame(draw);
  }, [zoom, selectedNode]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [draw]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const W = canvas.width;
    const H = canvas.height;
    const Z = zoom;

    const nodes = MOCK_GRAPH_NODES.map(n => ({
      ...n,
      px: n.x * W * Z + (W * (1 - Z)) / 2,
      py: n.y * H * Z + (H * (1 - Z)) / 2,
      size: (n.id === 'n1' ? 28 : 18) * Z,
    }));

    const hit = nodes.find(n => {
      const dx = mx - n.px;
      const dy = my - n.py;
      return Math.abs(dx) <= n.size / 2 + 6 && Math.abs(dy) <= n.size / 2 + 6;
    });
    setSelectedNode(hit ? hit.id : null);
  };

  const legendItems = [
    { type: 'concept',  label: 'Concept',  color: '#8B7EC8' },
    { type: 'entity',   label: 'Entity',   color: '#5C8F72' },
    { type: 'relation', label: 'Relation', color: '#C48B20' },
  ];

  return (
    <div style={{ height: '100dvh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-mono)' }}>
      {/* Header */}
      <nav style={{ height: 'var(--nav-h)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: 'var(--bg-surface)', borderBottom: 'var(--border-heavy)', flexShrink: 0 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>
          <Home size={16} /> DASHBOARD
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>KNOWLEDGE MINDMAP</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.2))} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', border: 'var(--border-heavy)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)' }} className="mm-btn"><ZoomIn size={16} /></button>
          <button onClick={() => setZoom(z => Math.max(0.4, z - 0.2))} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', border: 'var(--border-heavy)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)' }} className="mm-btn"><ZoomOut size={16} /></button>
          <button onClick={() => { setZoom(1); setSelectedNode(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: 'var(--border-heavy)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)' }} className="mm-btn"><RefreshCcw size={14} /> RESET</button>
        </div>
      </nav>

      {/* Canvas area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
        />

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bg-surface)', border: 'var(--border-heavy)', padding: '12px 16px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700 }}>NODE TYPES</div>
          {legendItems.map(l => (
            <div key={l.type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, border: `2px solid ${l.color}`, background: `${l.color}22` }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{l.label.toUpperCase()}</span>
            </div>
          ))}
        </div>

        {/* Zoom indicator */}
        <div style={{ position: 'absolute', bottom: 20, right: 20, background: 'var(--bg-surface)', border: 'var(--border-heavy)', padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, boxShadow: 'var(--shadow-sm)' }}>
          ZOOM {Math.round(zoom * 100)}%
        </div>

        {/* Selected node info panel */}
        {selectedNode && (
          <div style={{ position: 'absolute', top: 20, right: 20, width: 260, background: 'var(--bg-surface)', border: 'var(--border-accent)', padding: '20px', boxShadow: 'var(--shadow-accent)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 700 }}>
                {MOCK_GRAPH_NODES.find(n => n.id === selectedNode)?.type.toUpperCase()}
              </span>
              <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {MOCK_GRAPH_NODES.find(n => n.id === selectedNode)?.label}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
              {nodeInfo[selectedNode]}
            </p>
          </div>
        )}

        {/* Hint */}
        {!selectedNode && (
          <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-surface)', border: 'var(--border-heavy)', padding: '8px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, boxShadow: 'var(--shadow-sm)', pointerEvents: 'none' }}>
            CLICK ANY NODE TO INSPECT
          </div>
        )}
      </div>

      <style jsx>{`
        .mm-btn:hover { transform: translate(-2px, -2px); box-shadow: 3px 3px 0 rgba(122,127,148,0.4) !important; }
        .mm-btn:active { transform: translate(1px, 1px); }
      `}</style>
    </div>
  );
}
