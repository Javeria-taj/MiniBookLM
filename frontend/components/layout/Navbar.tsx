'use client';

import { Sun, Moon, Settings, ChevronDown, Menu } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useEffect } from 'react';

export default function Navbar({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  const { theme, setTheme, level, setLevel, toggleSidebar } = useAppStore();

  useEffect(() => {
    const saved = localStorage.getItem('lumina-theme') as 'dark' | 'light' | null;
    if (saved) setTheme(saved);
  }, [setTheme]);

  const levels: { key: typeof level; label: string }[] = [
    { key: 'beginner', label: 'Beginner' },
    { key: 'student',  label: 'Student' },
    { key: 'expert',   label: 'Expert' },
  ];

  return (
    <nav
      className="navbar soft-border"
      role="navigation"
      style={{
        height: 'var(--nav-h)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        background: 'var(--bg-surface)',
        borderBottom: 'var(--border-heavy)',
        flexShrink: 0, gap: 20,
      }}
    >
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <button
          onClick={toggleSidebar}
          style={{
            background: 'var(--bg-elevated)', border: 'var(--border-heavy)',
            cursor: 'pointer', padding: '6px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
            transition: 'var(--transition)',
            boxShadow: 'var(--shadow-sm)',
          }}
          className="brutal-btn-hover"
        >
          <Menu size={18} />
        </button>

        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32,
            background: 'var(--accent)',
            border: 'var(--border-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}>
             <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-on-accent)' }}>L</span>
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}>
            LUMINA
          </span>
        </a>
      </div>

      {/* Center: Level Toggle */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'flex', background: 'var(--bg-base)', border: 'var(--border-heavy)',
          padding: 4, gap: 4, boxShadow: 'var(--shadow-sm)',
        }}>
          {levels.map((l) => (
            <button
              key={l.key}
              onClick={() => setLevel(l.key)}
              style={{
                padding: '6px 20px',
                border: level === l.key ? 'var(--border-accent)' : '2px solid transparent',
                background: level === l.key ? 'var(--accent)' : 'none',
                color: level === l.key ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700,
                cursor: 'pointer', transition: 'var(--transition)',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{
            width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-elevated)', border: 'var(--border-heavy)',
            color: 'var(--text-primary)', cursor: 'pointer', transition: 'var(--transition)',
            boxShadow: 'var(--shadow-sm)',
          }}
          className="brutal-btn-hover"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          onClick={onOpenSettings}
          style={{
            width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-elevated)', border: 'var(--border-heavy)',
            color: 'var(--text-primary)', cursor: 'pointer', transition: 'var(--transition)',
            boxShadow: 'var(--shadow-sm)',
          }}
          className="brutal-btn-hover"
        >
          <Settings size={16} />
        </button>

        <div style={{
          width: 38, height: 38,
          background: 'var(--accent)', border: 'var(--border-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-on-accent)', cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
        }}>
          JV
        </div>
      </div>

      <style jsx>{`
        .brutal-btn-hover:hover { transform: translate(-2px, -2px); box-shadow: 4px 4px 0 rgba(122, 127, 148, 0.4); }
        .brutal-btn-hover:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 rgba(122, 127, 148, 0.4); }
      `}</style>
    </nav>
  );
}
