'use client';

interface ToastProps { message: string; type: 'success' | 'error' | 'info'; }

export default function Toast({ message, type }: ToastProps) {
  const colors = { 
    success: { bg: 'rgba(92, 143, 114, 0.15)', color: '#5C8F72', border: '#5C8F72' }, // Sage
    error: { bg: 'rgba(201, 112, 90, 0.15)', color: '#C9705A', border: '#C9705A' }, // Terracotta
    info: { bg: 'rgba(139, 126, 200, 0.15)', color: '#8B7EC8', border: '#8B7EC8' } // Violet
  };
  const style = colors[type];
  
  return (
    <div style={{
      position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 20px',
      background: style.bg, border: `2px solid ${style.border}`, 
      boxShadow: `4px 4px 0 ${style.border}`,
      color: style.color, fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase',
      animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>{type === 'success' ? '✓' : type === 'error' ? '✕' : '✦'}</span>
      {message}
    </div>
  );
}
