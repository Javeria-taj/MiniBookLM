'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Home, RotateCcw, CheckCircle } from 'lucide-react';
import { fetchQuiz } from '@/lib/api';
import type { QuizQuestion } from '@/lib/types';

const NOTEBOOK_ID = 'default-notebook';

export default function QuizPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuiz(NOTEBOOK_ID);
      setQuestions(data.questions);
    } catch (err) {
      setError((err as Error).message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const score = submitted ? questions.filter((q, i) => answers[i] === q.correct).length : 0;
  const pct = submitted ? Math.round((score / questions.length) * 100) : 0;
  
  const reset = () => { 
    setAnswers({}); 
    setSubmitted(false); 
  };

  const retryLoad = () => {
    loadQuiz();
  };

  if (loading) {
    return (
      <div style={{ height: '100dvh', background: 'var(--bg-base)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
        <div className="skeleton-orb" style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent-subtle)', border: 'var(--border-accent)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--accent)', fontWeight: 700 }}>GENERATING YOUR QUIZ...</p>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 0.5; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100dvh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: '#C9705A' }}>COULD NOT GENERATE QUIZ</h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: 400 }}>{error}</p>
        <button 
          onClick={retryLoad}
          style={{ padding: '12px 32px', background: 'var(--accent)', border: 'var(--border-accent)', color: 'var(--text-on-accent)', fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-accent)' }}
        >
          RETRY GENERATION
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ height: '100dvh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>📭</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-secondary)' }}>NO QUESTIONS GENERATED</h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: 400 }}>Try uploading more detailed documents to help Gemini generate a quiz.</p>
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
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>KNOWLEDGE QUIZ</h1>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
          {Object.keys(answers).length} / {questions.length} ANSWERED
        </div>
      </nav>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 800, width: '100%', margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Score card — shown after submit */}
        {submitted && (
          <div style={{ padding: '32px', border: pct >= 70 ? '2px solid #5C8F72' : '2px solid #C9705A', background: pct >= 70 ? 'rgba(92,143,114,0.08)' : 'rgba(201,112,90,0.08)', boxShadow: pct >= 70 ? '6px 6px 0 rgba(92,143,114,0.3)' : '6px 6px 0 rgba(201,112,90,0.3)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <CheckCircle size={40} color={pct >= 70 ? '#5C8F72' : '#C9705A'} style={{ margin: '0 auto' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 900, color: pct >= 70 ? '#5C8F72' : '#C9705A' }}>{pct}%</div>
            <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              {score} / {questions.length} CORRECT
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {pct >= 80 ? 'EXCELLENT — You have mastered these concepts.' : pct >= 60 ? 'GOOD EFFORT — Review the highlighted questions below.' : 'KEEP STUDYING — Re-read your documents and try again.'}
            </div>
            <button onClick={reset} style={{ alignSelf: 'center', marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', border: 'var(--border-heavy)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)' }} className="quiz-btn">
              <RotateCcw size={14} /> RETAKE QUIZ
            </button>
          </div>
        )}

        {/* Questions */}
        {questions.map((q, qi) => {
          const isSubmitted = submitted;
          return (
            <div key={qi} style={{ background: 'var(--bg-elevated)', border: 'var(--border-heavy)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
              {/* Question header */}
              <div style={{ padding: '12px 20px', background: 'var(--bg-hover)', borderBottom: 'var(--border-heavy)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>QUESTION 0{qi + 1}</span>
                {isSubmitted && (
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px',
                    border: answers[qi] === q.correct ? '2px solid #5C8F72' : '2px solid #C9705A',
                    color: answers[qi] === q.correct ? '#5C8F72' : '#C9705A',
                    background: answers[qi] === q.correct ? 'rgba(92,143,114,0.15)' : 'rgba(201,112,90,0.15)',
                  }}>
                    {answers[qi] === q.correct ? '✓ CORRECT' : '✗ INCORRECT'}
                  </span>
                )}
              </div>
              {/* Question body */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 4, lineHeight: 1.5 }}>{q.q}</p>
                {q.options.map((opt, oi) => {
                  let bg = 'var(--bg-surface)';
                  let color = 'var(--text-primary)';
                  let border = 'var(--border-heavy)';
                  let shadow = 'var(--shadow-sm)';
                  if (isSubmitted) {
                    if (oi === q.correct)  { bg = 'rgba(92,143,114,0.15)'; color = '#5C8F72'; border = '2px solid #5C8F72'; shadow = 'none'; }
                    else if (answers[qi] === oi) { bg = 'rgba(201,112,90,0.15)'; color = '#C9705A'; border = '2px solid #C9705A'; shadow = 'none'; }
                    else { shadow = 'none'; }
                  } else if (answers[qi] === oi) {
                    bg = 'var(--accent-subtle)'; border = 'var(--border-accent)'; color = 'var(--accent)';
                  }
                  return (
                    <button
                      key={oi}
                      disabled={isSubmitted}
                      onClick={() => setAnswers(a => ({ ...a, [qi]: oi }))}
                      style={{ padding: '12px 16px', background: bg, color, border, textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.88rem', cursor: isSubmitted ? 'default' : 'pointer', transition: 'var(--transition)', boxShadow: shadow, lineHeight: 1.5 }}
                      className={!isSubmitted ? 'quiz-opt' : ''}
                    >
                      [{String.fromCharCode(65 + oi)}] {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Submit button */}
        {!submitted && (
          <button
            onClick={() => { if (Object.keys(answers).length === questions.length) setSubmitted(true); }}
            disabled={Object.keys(answers).length < questions.length}
            style={{
              padding: '14px 32px', border: 'var(--border-accent)',
              background: Object.keys(answers).length === questions.length ? 'var(--accent)' : 'var(--bg-elevated)',
              color: Object.keys(answers).length === questions.length ? 'var(--text-on-accent)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: '1rem', cursor: Object.keys(answers).length === questions.length ? 'pointer' : 'not-allowed',
              fontWeight: 700, transition: 'var(--transition)', boxShadow: 'var(--shadow-accent)', alignSelf: 'center',
            }}
            className={Object.keys(answers).length === questions.length ? 'quiz-btn' : ''}
          >
            SUBMIT ANSWERS ({Object.keys(answers).length}/{questions.length} ANSWERED)
          </button>
        )}
      </div>

      <style jsx>{`
        .quiz-btn:hover { transform: translate(-2px, -2px); box-shadow: 5px 5px 0 rgba(196,139,32,0.4) !important; }
        .quiz-btn:active { transform: translate(1px, 1px); }
        .quiz-opt:hover { background: var(--bg-hover) !important; transform: translate(-1px, -1px); }
      `}</style>
    </div>
  );
}
