'use client';

import { X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

export default function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) {
  const { theme, setTheme, fontSize, setFontSize } = useAppStore();

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(18, 20, 28, 0.8)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-surface)', border: 'var(--border-heavy)', width: 480, maxWidth: '90vw', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: 'var(--border-heavy)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>SYSTEM CONFIG</h2>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          <section>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>VISUAL THEME</h3>
            <div style={{ display: 'flex', border: 'var(--border-heavy)', background: 'var(--bg-base)', padding: 4, boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.1)' }}>
              {['dark', 'light'].map(t => (
                <button key={t} onClick={() => setTheme(t as any)} style={{
                  flex: 1, padding: '8px', border: 'none',
                  background: theme === t ? 'var(--bg-elevated)' : 'none',
                  color: theme === t ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.85rem', cursor: 'pointer',
                  transition: 'var(--transition)', fontWeight: 700,
                  boxShadow: theme === t ? 'var(--shadow-sm)' : 'none',
                }}>{t.toUpperCase()}</button>
              ))}
            </div>
          </section>
          <section>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>CORE FONT SIZE</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {['sm', 'md', 'lg'].map(s => (
                <button key={s} onClick={() => setFontSize(s as any)} style={{
                  flex: 1, padding: '8px', border: 'var(--border-heavy)',
                  background: fontSize === s ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: fontSize === s ? 'var(--text-on-accent)' : 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.85rem', cursor: 'pointer',
                  transition: 'var(--transition)', fontWeight: 700,
                  boxShadow: fontSize === s ? 'var(--shadow-accent)' : 'var(--shadow-sm)'
                }} className={fontSize !== s ? 'brutal-btn' : ''}>{s.toUpperCase()}</button>
              ))}
            </div>
          </section>
          <section>
            <div style={{ padding: '16px', border: '2px solid rgba(201, 112, 90, 0.4)', background: 'rgba(201, 112, 90, 0.05)', textAlign: 'center', boxShadow: '4px 4px 0 rgba(201, 112, 90, 0.15)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#C9705A', marginBottom: 12, fontWeight: 700 }}>DANGER ZONE</p>
              <button style={{ padding: '8px 16px', border: '2px solid #C9705A', background: 'rgba(201, 112, 90, 0.15)', color: '#C9705A', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', cursor: 'pointer', transition: 'var(--transition)', fontWeight: 700, boxShadow: '2px 2px 0 rgba(201, 112, 90, 0.4)' }} className="danger-btn">WIPE ALL DATA</button>
            </div>
          </section>
        </div>
      </div>
      <style jsx>{`
        .brutal-btn:hover { transform: translate(-2px, -2px); box-shadow: 4px 4px 0 rgba(122, 127, 148, 0.4) !important; }
        .brutal-btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 rgba(122, 127, 148, 0.4) !important; }
        .danger-btn:hover { background: rgba(201, 112, 90, 0.25); transform: translate(-2px, -2px); box-shadow: 4px 4px 0 rgba(201, 112, 90, 0.4) !important; }
        .danger-btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 rgba(201, 112, 90, 0.4) !important; }
      `}</style>
    </div>
  );
}
