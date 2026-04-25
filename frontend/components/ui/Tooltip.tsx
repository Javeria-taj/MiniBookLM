'use client';

import { ReactNode } from 'react';

interface TooltipProps {
  label: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ label, children, position = 'bottom' }: TooltipProps) {
  const offset = 8;
  const tipStyle: React.CSSProperties = {
    position: 'absolute',
    whiteSpace: 'nowrap',
    background: 'var(--bg-base)',
    color: 'var(--text-secondary)',
    border: 'var(--border-heavy)',
    boxShadow: 'var(--shadow-sm)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '4px 10px',
    pointerEvents: 'none',
    zIndex: 9999,
    opacity: 0,
    transition: 'opacity 120ms ease, transform 120ms ease',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    ...(position === 'bottom' && { top: `calc(100% + ${offset}px)`, left: '50%', transform: 'translateX(-50%) translateY(-4px)' }),
    ...(position === 'top'    && { bottom: `calc(100% + ${offset}px)`, left: '50%', transform: 'translateX(-50%) translateY(4px)' }),
    ...(position === 'left'   && { right: `calc(100% + ${offset}px)`, top: '50%', transform: 'translateY(-50%) translateX(4px)' }),
    ...(position === 'right'  && { left: `calc(100% + ${offset}px)`, top: '50%', transform: 'translateY(-50%) translateX(-4px)' }),
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} className="tooltip-host">
      {children}
      <span style={tipStyle} className="tooltip-tip">{label}</span>
      <style>{`
        .tooltip-host:hover .tooltip-tip {
          opacity: 1 !important;
          transform: ${
            position === 'bottom' ? 'translateX(-50%) translateY(0)' :
            position === 'top'    ? 'translateX(-50%) translateY(0)' :
            position === 'left'   ? 'translateY(-50%) translateX(0)' :
                                    'translateY(-50%) translateX(0)'
          } !important;
        }
      `}</style>
    </div>
  );
}
