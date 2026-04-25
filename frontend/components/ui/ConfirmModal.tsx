'use client';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'CONFIRM',
  cancelLabel = 'CANCEL',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const dangerColor = '#C9705A';
  const accentColor = 'var(--accent)';

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(18,20,28,0.75)', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          border: danger ? `2px solid ${dangerColor}` : 'var(--border-heavy)',
          boxShadow: danger
            ? `6px 6px 0 rgba(201,112,90,0.4)`
            : 'var(--shadow-lg)',
          width: 400, maxWidth: '90vw',
          padding: '28px',
          display: 'flex', flexDirection: 'column', gap: 20,
          animation: 'snapUp 200ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0,
            border: danger ? `2px solid ${dangerColor}` : 'var(--border-accent)',
            background: danger ? 'rgba(201,112,90,0.12)' : 'var(--accent-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', color: danger ? dangerColor : accentColor, fontWeight: 900,
          }}>
            {danger ? '⚠' : '?'}
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
            color: danger ? dangerColor : 'var(--text-primary)', letterSpacing: '0.05em',
          }}>
            {title}
          </h2>
        </div>

        {/* Message */}
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
          color: 'var(--text-secondary)', lineHeight: 1.6,
        }}>
          {message}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '10px',
              border: danger ? `2px solid ${dangerColor}` : 'var(--border-accent)',
              background: danger ? 'rgba(201,112,90,0.15)' : 'var(--accent)',
              color: danger ? dangerColor : 'var(--text-on-accent)',
              fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer', transition: 'var(--transition)',
              boxShadow: danger ? `3px 3px 0 rgba(201,112,90,0.4)` : 'var(--shadow-accent)',
            }}
            className="confirm-btn"
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px',
              border: 'var(--border-heavy)', background: 'none',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer', transition: 'var(--transition)',
              boxShadow: 'var(--shadow-sm)',
            }}
            className="confirm-btn"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
      <style>{`
        .confirm-btn:hover { transform: translate(-2px,-2px); }
        .confirm-btn:active { transform: translate(1px,1px); }
      `}</style>
    </div>
  );
}
