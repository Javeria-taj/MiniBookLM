'use client';

import { useCallback, useRef, useState } from 'react';
import { X, Upload, FileText, Link } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { uploadDocument } from '@/lib/api';
import type { DocType, ToastType } from '@/lib/types';

// ── Constants ──────────────────────────────────────────────────
const NOTEBOOK_ID = 'default-notebook'; // will be made dynamic later

// ── Types ──────────────────────────────────────────────────────
interface UploadItem {
  name: string;
  pct: number;
  done: boolean;
  error?: string;
  indeterminate?: boolean; // true when onProgress never fired
}

interface ToastState {
  message: string;
  type: ToastType;
}

// ── Component ──────────────────────────────────────────────────
export default function UploadModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { addDocument } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [urlSource, setUrlSource] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  // ── Toast helpers ─────────────────────────────────────────────
  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── File upload ───────────────────────────────────────────────
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (uploading) return; // block re-entrant drops during upload

    const fileArr = Array.from(files);
    setUploading(true);
    setItems(fileArr.map((f) => ({ name: f.name, pct: 0, done: false, indeterminate: false })));

    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      let progressFired = false;

      // Start indeterminate pulse after 800ms if XHR progress hasn't fired yet
      const indeterminateTimer = setTimeout(() => {
        if (!progressFired) {
          setItems((prev) =>
            prev.map((item, idx) => (idx === i ? { ...item, indeterminate: true } : item))
          );
        }
      }, 800);

      try {
        const res = await uploadDocument(
          file,
          (pct) => {
            progressFired = true;
            clearTimeout(indeterminateTimer);
            setItems((prev) =>
              prev.map((item, idx) =>
                idx === i ? { ...item, pct, indeterminate: false } : item
              )
            );
          },
          NOTEBOOK_ID,
        );

        clearTimeout(indeterminateTimer);

        // Map UploadResponse → MiniBookDocument and add to store
        addDocument({
          id:     res.doc_id,
          name:   res.name,
          type:   (res.name.split('.').pop()?.toLowerCase() ?? 'pdf') as DocType,
          size:   '—',
          pages:  res.pages,
          tokens: res.tokens,
          date:   new Date().toLocaleDateString(),
          active: false, // store's addDocument will set this to true
        });

        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, pct: 100, done: true, indeterminate: false } : item
          )
        );
        showToast('Document uploaded successfully', 'success');
      } catch (err) {
        clearTimeout(indeterminateTimer);
        const message = err instanceof Error ? err.message : 'Upload failed';
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, error: message, indeterminate: false } : item
          )
        );
        showToast(message, 'error');
        setUploading(false);
        return; // keep modal open on error so user can retry
      }
    }

    setUploading(false);
    setTimeout(onClose, 800);
  }, [uploading, addDocument, onClose]);

  // ── Drag and drop ─────────────────────────────────────────────
  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (uploading) return;
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    [uploading, handleFiles]
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  // ── URL import (mock only — backend stub) ────────────────────
  const handleUrlImport = async () => {
    if (!urlValue.trim()) return;
    setUrlLoading(true);
    const fakeName = urlValue.replace(/^https?:\/\//, '').split('/').pop() || 'imported-doc';
    const displayName = `${fakeName}.txt`;
    setItems([{ name: displayName, pct: 0, done: false }]);
    for (let p = 0; p <= 100; p += 20) {
      await new Promise((r) => setTimeout(r, 150));
      setItems([{ name: displayName, pct: p, done: false }]);
    }
    addDocument({
      id: `url_${Date.now()}`,
      name: displayName,
      type: 'txt',
      size: '—',
      pages: 1,
      tokens: '5k',
      date: new Date().toLocaleDateString(),
      active: false,
    });
    setItems([{ name: displayName, pct: 100, done: true }]);
    setUrlLoading(false);
    setUrlValue('');
    setUrlSource(null);
    showToast('Document imported successfully', 'success');
    setTimeout(onClose, 800);
  };

  if (!isOpen) return null;

  const dropzoneDisabled = uploading;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(18, 20, 28, 0.8)', backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        background: 'var(--bg-surface)', border: 'var(--border-heavy)',
        width: 520, maxWidth: '90vw', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: 'var(--border-heavy)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--bg-elevated)',
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            ADD SOURCES
          </h2>
          <button
            onClick={onClose}
            disabled={uploading}
            style={{ background: 'none', color: 'var(--text-secondary)', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.4 : 1 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Drop zone */}
          <div
            onClick={() => !dropzoneDisabled && fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            style={{
              padding: '40px',
              border: `2px dashed ${dropzoneDisabled ? 'var(--border)' : 'var(--border-strong)'}`,
              background: 'var(--bg-elevated)',
              textAlign: 'center',
              cursor: dropzoneDisabled ? 'not-allowed' : 'pointer',
              opacity: dropzoneDisabled ? 0.5 : 1,
              transition: 'var(--transition)',
            }}
            className={dropzoneDisabled ? '' : 'brutal-drop-zone'}
          >
            <Upload size={32} color="var(--accent)" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
              {uploading ? 'Uploading…' : 'Drop files or click to browse'}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              SUPPORTED: PDF, DOCX, TXT, MD
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              accept=".pdf,.docx,.txt,.md"
              disabled={dropzoneDisabled}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {/* Progress items */}
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                padding: '12px 16px',
                border: item.error
                  ? '2px solid #C9705A'
                  : item.done
                  ? '2px solid #5C8F72'
                  : 'var(--border-heavy)',
                background: 'var(--bg-base)',
                display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)',
              }}
            >
              <FileText
                size={16}
                color={item.error ? '#C9705A' : item.done ? '#5C8F72' : 'var(--accent)'}
              />
              <span style={{
                flex: 1,
                fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700,
                color: item.error ? '#C9705A' : item.done ? '#5C8F72' : 'var(--text-primary)',
                textTransform: 'uppercase',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.name}
              </span>

              {/* Progress bar or indeterminate pulse */}
              <div style={{
                width: 100, height: 8,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden',
              }}>
                <div
                  style={{
                    height: '100%',
                    width: item.indeterminate ? '40%' : `${item.pct}%`,
                    background: item.error ? '#C9705A' : item.done ? '#5C8F72' : 'var(--accent)',
                    transition: item.indeterminate ? 'none' : 'width 0.3s ease',
                    animation: item.indeterminate ? 'indeterminateSlide 1.2s ease-in-out infinite' : 'none',
                  }}
                />
              </div>

              {item.done && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#5C8F72', fontWeight: 700 }}>✓</span>
              )}
              {item.error && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#C9705A', fontWeight: 700 }}>✕</span>
              )}
            </div>
          ))}

          {/* Source type buttons */}
          {!uploading && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {['URL', 'Google Doc', 'Notion'].map((s) => (
                <button
                  key={s}
                  onClick={() => { setUrlSource(urlSource === s ? null : s); setUrlValue(''); }}
                  style={{
                    padding: '8px 16px',
                    border: urlSource === s ? 'var(--border-accent)' : 'var(--border-heavy)',
                    background: urlSource === s ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                    color: urlSource === s ? 'var(--accent)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
                    cursor: 'pointer', transition: 'var(--transition)', fontWeight: 700,
                  }}
                  className="brutal-source-btn"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Inline URL input */}
          {urlSource && !uploading && (
            <div style={{
              display: 'flex', gap: 8,
              border: 'var(--border-accent)', padding: '12px',
              background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-accent)', alignItems: 'center',
            }}>
              <Link size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
              <input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
                placeholder={`PASTE ${urlSource.toUpperCase()} URL...`}
                autoFocus
                style={{
                  flex: 1, border: 'none', background: 'none',
                  color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem', outline: 'none',
                }}
              />
              <button
                onClick={handleUrlImport}
                disabled={urlLoading || !urlValue.trim()}
                style={{
                  padding: '6px 14px',
                  background: 'var(--accent)', border: 'var(--border-accent)',
                  color: 'var(--text-on-accent)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
                  cursor: 'pointer', fontWeight: 700,
                  opacity: (urlLoading || !urlValue.trim()) ? 0.5 : 1,
                }}
              >
                {urlLoading ? '...' : 'IMPORT'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline toast — rendered inside the modal overlay so it doesn't escape z-index */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 20px',
          background: toast.type === 'success'
            ? 'rgba(92, 143, 114, 0.15)'
            : toast.type === 'error'
            ? 'rgba(201, 112, 90, 0.15)'
            : 'rgba(139, 126, 200, 0.15)',
          border: `2px solid ${toast.type === 'success' ? '#5C8F72' : toast.type === 'error' ? '#C9705A' : '#8B7EC8'}`,
          color: toast.type === 'success' ? '#5C8F72' : toast.type === 'error' ? '#C9705A' : '#8B7EC8',
          fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700,
          textTransform: 'uppercase', zIndex: 9100,
          animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <span style={{ fontSize: '1.1rem' }}>
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '✦'}
          </span>
          {toast.message}
        </div>
      )}

      <style>{`
        .brutal-drop-zone:hover {
          background: var(--bg-hover);
          border-color: var(--accent);
          box-shadow: inset 4px 4px 0 rgba(0,0,0,0.1);
        }
        .brutal-source-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          transform: translate(-2px, -2px);
          box-shadow: 4px 4px 0 rgba(122, 127, 148, 0.4);
        }
        .brutal-source-btn:active {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0 rgba(122, 127, 148, 0.4);
        }
        @keyframes indeterminateSlide {
          0%   { transform: translateX(-150%); }
          50%  { transform: translateX(100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
