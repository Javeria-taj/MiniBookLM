'use client';

import { useCallback, useRef, useState } from 'react';
import { X, Upload, FileText, Link } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { uploadDocument } from '@/lib/api';
import type { DocType } from '@/lib/types';

interface UploadItem { name: string; pct: number; done: boolean; error?: string; }

export default function UploadModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) {
  const { addDocument } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [urlSource, setUrlSource] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    setItems(fileArr.map(f => ({ name: f.name, pct: 0, done: false })));
    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      try {
        const res = await uploadDocument(file, (pct) => {
          setItems(prev => prev.map((item, idx) => idx === i ? { ...item, pct } : item));
        });
        addDocument({ id: res.doc_id, name: file.name, type: (file.name.split('.').pop() || 'txt') as DocType, size: '0 MB', pages: res.pages, tokens: res.tokens, date: 'Now', active: false });
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, done: true } : item));
      } catch {
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, error: 'Failed' } : item));
      }
    }
    setTimeout(onClose, 1000);
  }, [addDocument, onClose]);

  const handleUrlImport = async () => {
    if (!urlValue.trim()) return;
    setUrlLoading(true);
    const fakeName = urlValue.replace(/^https?:\/\//, '').split('/').pop() || 'imported-doc';
    const displayName = `${fakeName}.txt`;
    setItems([{ name: displayName, pct: 0, done: false }]);
    for (let p = 0; p <= 100; p += 20) {
      await new Promise(r => setTimeout(r, 150));
      setItems([{ name: displayName, pct: p, done: false }]);
    }
    addDocument({ id: `url_${Date.now()}`, name: displayName, type: 'txt', size: '—', pages: 1, tokens: '5k', date: 'Now', active: false });
    setItems([{ name: displayName, pct: 100, done: true }]);
    setUrlLoading(false);
    setUrlValue('');
    setUrlSource(null);
    setTimeout(onClose, 1000);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(18, 20, 28, 0.8)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-surface)', border: 'var(--border-heavy)', width: 520, maxWidth: '90vw', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: 'var(--border-heavy)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>ADD SOURCES</h2>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Drop zone */}
          <div onClick={() => fileInputRef.current?.click()} style={{ padding: '40px', border: '2px dashed var(--border-strong)', background: 'var(--bg-elevated)', textAlign: 'center', cursor: 'pointer', transition: 'var(--transition)' }} className="brutal-drop-zone">
            <Upload size={32} color="var(--accent)" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Drop files or click to browse</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>SUPPORTED: PDF, DOCX, TXT, MD</p>
            <input ref={fileInputRef} type="file" multiple hidden onChange={e => e.target.files && handleFiles(e.target.files)} />
          </div>

          {/* Progress items */}
          {items.map((item, i) => (
            <div key={i} style={{ padding: '12px 16px', border: item.done ? '2px solid #5C8F72' : 'var(--border-heavy)', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)' }}>
              <FileText size={16} color={item.done ? '#5C8F72' : 'var(--accent)'} />
              <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: item.done ? '#5C8F72' : 'var(--text-primary)', textTransform: 'uppercase', fontWeight: 700 }}>{item.name}</span>
              <div style={{ width: 100, height: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${item.pct}%`, background: item.done ? '#5C8F72' : 'var(--accent)', transition: 'width 0.3s ease' }} />
              </div>
              {item.done && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#5C8F72', fontWeight: 700 }}>✓</span>}
            </div>
          ))}

          {/* Source type buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {['URL', 'Google Doc', 'Notion'].map(s => (
              <button
                key={s}
                onClick={() => { setUrlSource(urlSource === s ? null : s); setUrlValue(''); }}
                style={{
                  padding: '8px 16px',
                  border: urlSource === s ? 'var(--border-accent)' : 'var(--border-heavy)',
                  background: urlSource === s ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                  color: urlSource === s ? 'var(--accent)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.85rem', cursor: 'pointer', transition: 'var(--transition)', fontWeight: 700,
                }}
                className="brutal-source-btn"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Inline URL input — shown when a source is selected */}
          {urlSource && (
            <div style={{ display: 'flex', gap: 8, border: 'var(--border-accent)', padding: '12px', background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-accent)', alignItems: 'center' }}>
              <Link size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
              <input
                type="url"
                value={urlValue}
                onChange={e => setUrlValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlImport()}
                placeholder={`PASTE ${urlSource.toUpperCase()} URL...`}
                autoFocus
                style={{ flex: 1, border: 'none', background: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', outline: 'none' }}
              />
              <button
                onClick={handleUrlImport}
                disabled={urlLoading || !urlValue.trim()}
                style={{ padding: '6px 14px', background: 'var(--accent)', border: 'var(--border-accent)', color: 'var(--text-on-accent)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700, opacity: (urlLoading || !urlValue.trim()) ? 0.5 : 1 }}
              >
                {urlLoading ? '...' : 'IMPORT'}
              </button>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .brutal-drop-zone:hover { background: var(--bg-hover); border-color: var(--accent); box-shadow: inset 4px 4px 0 rgba(0,0,0,0.1); }
        .brutal-source-btn:hover { background: var(--bg-hover); color: var(--text-primary); transform: translate(-2px, -2px); box-shadow: 4px 4px 0 rgba(122, 127, 148, 0.4); }
        .brutal-source-btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 rgba(122, 127, 148, 0.4); }
      `}</style>
    </div>
  );
}
