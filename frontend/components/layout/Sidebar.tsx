'use client';

import { useState } from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import type { LuminaDocument, DocType } from '@/lib/types';
import UploadModal from '@/components/layout/UploadModal';

function DocIcon({ type }: { type: DocType }) {
  const styles: Record<DocType, { bg: string; color: string; border: string }> = {
    pdf:  { bg: 'rgba(201, 112, 90, 0.15)', color: '#C9705A', border: '#C9705A' }, /* Terracotta */
    docx: { bg: 'rgba(139, 126, 200, 0.15)', color: '#8B7EC8', border: '#8B7EC8' }, /* Violet */
    txt:  { bg: 'var(--accent-subtle)', color: 'var(--accent)', border: 'var(--accent)' }, /* Amber */
    md:   { bg: 'rgba(92, 143, 114, 0.15)', color: '#5C8F72', border: '#5C8F72' }, /* Sage */
  };
  const { bg, color, border } = styles[type] ?? styles.txt;
  return (
    <div style={{
      width: 36, height: 36,
      background: bg, color, border: `2px solid ${border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      flexShrink: 0, fontSize: '0.7rem', fontWeight: 700,
      boxShadow: '2px 2px 0 rgba(122, 127, 148, 0.4)',
    }}>
      {type.toUpperCase()}
    </div>
  );
}

export default function Sidebar() {
  const { documents, sidebarOpen, setActiveDocument, removeDocument } = useAppStore();
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);

  const filtered = documents.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <aside
        style={{
          width: sidebarOpen ? 'var(--sidebar-w)' : 0,
          flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: 'var(--bg-surface)', borderRight: 'var(--border-heavy)',
          overflow: 'hidden', transition: 'width var(--transition)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 16px 16px', borderBottom: 'var(--border-heavy)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>SOURCES</h2>
            <button
              onClick={() => setUploadOpen(true)}
              style={{
                background: 'var(--accent-subtle)', color: 'var(--accent)',
                border: 'var(--border-accent)',
                padding: '6px 10px', fontSize: '0.8rem', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                transition: 'var(--transition)',
                boxShadow: 'var(--shadow-sm)',
              }}
              className="brutal-btn"
            >
              <Plus size={14} strokeWidth={3} /> ADD
            </button>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            background: 'var(--bg-base)', border: 'var(--border-heavy)',
            boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.1)',
          }}>
            <Search size={14} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="FILTER SOURCES..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none', background: 'none',
                fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
                color: 'var(--text-primary)', width: '100%', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Doc list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((doc) => (
            <DocItem
              key={doc.id} doc={doc}
              onSelect={() => setActiveDocument(doc.id)}
              onRemove={(e) => { e.stopPropagation(); removeDocument(doc.id); }}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px', borderTop: 'var(--border-heavy)', background: 'var(--bg-elevated)',
          fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700,
        }}>
          TOTAL SOURCES: {documents.length}<br/>
          DATA LOAD: {documents.reduce((acc, d) => acc + (parseInt(d.tokens) || 0), 0)}K TOKENS
        </div>
      </aside>

      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />

      <style jsx>{`
        .brutal-btn:hover { transform: translate(-2px, -2px); box-shadow: 4px 4px 0 rgba(196, 139, 32, 0.4); }
        .brutal-btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 rgba(196, 139, 32, 0.4); }
      `}</style>
    </>
  );
}

function DocItem({ doc, onSelect, onRemove }: { doc: LuminaDocument; onSelect: () => void; onRemove: (e: any) => void }) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px',
        border: doc.active ? 'var(--border-accent)' : 'var(--border-heavy)',
        background: doc.active ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
        cursor: 'pointer', transition: 'var(--transition)',
        boxShadow: doc.active ? 'var(--shadow-accent)' : 'var(--shadow-sm)',
      }}
      className="doc-item"
    >
      <DocIcon type={doc.type} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.85rem', fontWeight: 700, color: doc.active ? 'var(--accent)' : 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase',
        }}>
          {doc.name}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
          {doc.size} // {doc.tokens} // {doc.date}
        </div>
      </div>
      <button
        onClick={onRemove}
        style={{
          border: '2px solid var(--border)', background: 'var(--bg-base)', padding: 4,
          color: 'var(--text-muted)', cursor: 'pointer',
        }}
        className="trash-btn"
      >
        <Trash2 size={14} />
      </button>
      <style jsx>{`
        .doc-item:hover { transform: translate(-2px, -2px); box-shadow: 4px 4px 0 ${doc.active ? 'rgba(196, 139, 32, 0.4)' : 'rgba(122, 127, 148, 0.4)'}; }
        .trash-btn:hover { background: rgba(201, 112, 90, 0.15); color: #C9705A; border-color: #C9705A; }
      `}</style>
    </div>
  );
}
