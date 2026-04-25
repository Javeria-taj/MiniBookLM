'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, RotateCcw, Home } from 'lucide-react';
import { fetchFlashcards } from '@/lib/api';
import type { Flashcard } from '@/lib/types';

const NOTEBOOK_ID = 'default-notebook';

export default function FlashcardsPage() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());

  const loadFlashcards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFlashcards(NOTEBOOK_ID);
      setFlashcards(data.flashcards);
    } catch (err) {
      setError((err as Error).message || 'Failed to load flashcards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlashcards();
  }, [loadFlashcards]);

  const card = flashcards[current];
  const progress = flashcards.length > 0 ? Math.round((known.size / flashcards.length) * 100) : 0;

  const next = () => { setFlipped(false); setCurrent(c => (c + 1) % flashcards.length); };
  const prev = () => { setFlipped(false); setCurrent(c => (c - 1 + flashcards.length) % flashcards.length); };
  const markKnown = () => { setKnown(k => { const n = new Set(k); n.add(card.id); return n; }); next(); };
  const reset = () => { setKnown(new Set()); setCurrent(0); setFlipped(false); };

  if (loading) {
    return (
      <div style={{ height: '100dvh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
        <div className="skeleton-orb" style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent-subtle)', border: 'var(--border-accent)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--accent)', fontWeight: 700 }}>GENERATING FLASHCARDS...</p>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 0.5; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100dvh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: '#C9705A' }}>COULD NOT GENERATE FLASHCARDS</h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: 400 }}>{error}</p>
        <button 
          onClick={loadFlashcards}
          style={{ padding: '12px 32px', background: 'var(--accent)', border: 'var(--border-accent)', color: 'var(--text-on-accent)', fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-accent)' }}
        >
          RETRY GENERATION
        </button>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div style={{ height: '100dvh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>📭</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-secondary)' }}>NO FLASHCARDS GENERATED</h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: 400 }}>Try uploading more detailed documents to help Gemini generate flashcards.</p>
        <Link href="/" style={{ padding: '12px 32px', background: 'var(--bg-elevated)', border: 'var(--border-heavy)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', boxShadow: 'var(--shadow-sm)' }}>
          RETURN TO DASHBOARD
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-mono)' }}>
      {/* Header */}
      <nav style={{ height: 'var(--nav-h)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', background: 'var(--bg-surface)', borderBottom: 'var(--border-heavy)', flexShrink: 0 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>
          <Home size={16} /> DASHBOARD
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>FLASHCARDS</h1>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
          {current + 1} / {flashcards.length}
        </div>
      </nav>

      {/* Progress Bar */}
      <div style={{ height: 6, background: 'var(--bg-elevated)', borderBottom: 'var(--border-heavy)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width 0.4s ease', boxShadow: '0 0 8px var(--accent)' }} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 40 }}>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { label: 'TOTAL', value: flashcards.length, color: 'var(--text-secondary)' },
            { label: 'KNOWN', value: known.size, color: '#5C8F72' },
            { label: 'REMAINING', value: flashcards.length - known.size, color: 'var(--accent)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '12px 20px', border: 'var(--border-heavy)', background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Flip card */}
        <div
          onClick={() => setFlipped(f => !f)}
          style={{ width: '100%', maxWidth: 640, minHeight: 300, cursor: 'pointer', perspective: 1200, position: 'relative' }}
          role="button"
          aria-label={flipped ? 'Card back — click to flip' : 'Card front — click to reveal answer'}
        >
          <div style={{
            width: '100%', height: '100%', minHeight: 300,
            position: 'relative', transformStyle: 'preserve-3d',
            transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}>
            {/* Front */}
            <div style={{
              position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
              background: 'var(--bg-surface)', border: known.has(card.id) ? '2px solid #5C8F72' : 'var(--border-heavy)',
              boxShadow: 'var(--shadow-lg)', padding: '48px 40px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.1em' }}>QUESTION {current + 1}</div>
              <p style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.5, fontFamily: 'var(--font-display)' }}>{card.front}</p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 16 }}>CLICK TO REVEAL ANSWER</div>
            </div>
            {/* Back */}
            <div style={{
              position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
              background: 'var(--bg-elevated)', border: 'var(--border-accent)',
              boxShadow: 'var(--shadow-accent)', padding: '48px 40px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
              transform: 'rotateY(180deg)',
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.1em' }}>ANSWER</div>
              <p style={{ fontSize: 'clamp(0.95rem, 2vw, 1.2rem)', color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.7, fontFamily: 'var(--font-body)' }}>{card.back}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={prev} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', border: 'var(--border-heavy)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)' }} className="flash-btn">
            <ArrowLeft size={16} /> PREV
          </button>

          {flipped && !known.has(card.id) && (
            <button onClick={markKnown} style={{ padding: '10px 28px', border: '2px solid #5C8F72', background: 'rgba(92,143,114,0.15)', color: '#5C8F72', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, boxShadow: '3px 3px 0 rgba(92,143,114,0.4)', transition: 'var(--transition)' }} className="flash-btn">
              ✓ GOT IT
            </button>
          )}

          <button onClick={next} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', border: 'var(--border-heavy)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)' }} className="flash-btn">
            NEXT <ArrowRight size={16} />
          </button>

          <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: 'var(--border-heavy)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, transition: 'var(--transition)' }}>
            <RotateCcw size={14} /> RESET
          </button>
        </div>

        {/* Dot navigation */}
        <div style={{ display: 'flex', gap: 8 }}>
          {flashcards.map((c, i) => (
            <button key={c.id} onClick={() => { setCurrent(i); setFlipped(false); }} style={{
              width: 10, height: 10,
              background: i === current ? 'var(--accent)' : known.has(c.id) ? '#5C8F72' : 'var(--bg-elevated)',
              border: i === current ? 'var(--border-accent)' : 'var(--border-heavy)',
              cursor: 'pointer', transition: 'var(--transition)',
              boxShadow: i === current ? 'var(--shadow-accent)' : 'none',
            }} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .flash-btn:hover { transform: translate(-2px, -2px); box-shadow: 4px 4px 0 rgba(122,127,148,0.4) !important; }
        .flash-btn:active { transform: translate(1px, 1px); }
      `}</style>
    </div>
  );
}
