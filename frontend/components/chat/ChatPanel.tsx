'use client';

import { useRef, useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { streamQuery } from '@/lib/api';
import { formatMessage } from '../../lib/formatMessage';
import type { Message, QuizQuestion } from '@/lib/types';
import { MOCK_QUIZ } from '@/lib/mockData';
import Toast from '@/components/ui/Toast';

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 16, maxWidth: 880, margin: '0 auto', width: '100%' }}>
      <div style={{
        width: 36, height: 36,
        background: 'var(--accent-subtle)', border: 'var(--border-accent)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        fontSize: '1rem', fontWeight: 900, color: 'var(--accent)',
        boxShadow: 'var(--shadow-sm)',
      }}>?</div>
      <div style={{
        padding: '12px 16px',
        background: 'var(--bg-elevated)', border: 'var(--border-heavy)', 
        fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)',
        boxShadow: 'var(--shadow-sm)', textTransform: 'uppercase', fontWeight: 700,
      }}>
        SYSTEM PROCESSING...
      </div>
    </div>
  );
}

function DocumentHeartbeat() {
  const [hover, setHover] = useState(false);
  const bars = 7;
  return (
    <div 
      className="heartbeat-container"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} className={`bar bar-${i} ${hover ? 'active' : ''}`}></div>
      ))}
      <style jsx>{`
        .heartbeat-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 90px;
          margin-bottom: 32px;
          cursor: pointer;
        }
        .bar {
          width: 10px;
          background: var(--accent);
          border: 2px solid var(--accent);
          border-radius: 0px;
          box-shadow: 2px 2px 0 rgba(196, 139, 32, 0.4);
          animation: pulseSoft 1.5s ease-in-out infinite alternate;
          transform-origin: bottom;
        }
        .bar-0 { height: 15px; animation-delay: 0.0s; }
        .bar-1 { height: 30px; animation-delay: 0.2s; }
        .bar-2 { height: 50px; animation-delay: 0.4s; }
        .bar-3 { height: 70px; animation-delay: 0.6s; }
        .bar-4 { height: 50px; animation-delay: 0.8s; }
        .bar-5 { height: 30px; animation-delay: 1.0s; }
        .bar-6 { height: 15px; animation-delay: 1.2s; }

        @keyframes pulseSoft {
          0% { transform: scaleY(0.6); opacity: 0.6; }
          100% { transform: scaleY(1); opacity: 0.9; }
        }

        .bar.active {
          animation: pulseActive 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) infinite alternate;
          background: var(--text-primary);
          border-color: var(--text-primary);
          box-shadow: 4px 4px 0 rgba(196, 139, 32, 0.8);
        }
        .bar-0.active { height: 30px; animation-delay: 0.0s; }
        .bar-1.active { height: 60px; animation-delay: 0.1s; }
        .bar-2.active { height: 100px; animation-delay: 0.2s; }
        .bar-3.active { height: 130px; animation-delay: 0.3s; }
        .bar-4.active { height: 100px; animation-delay: 0.4s; }
        .bar-5.active { height: 60px; animation-delay: 0.5s; }
        .bar-6.active { height: 30px; animation-delay: 0.6s; }

        @keyframes pulseActive {
          0% { transform: scaleY(0.3); opacity: 0.8; }
          100% { transform: scaleY(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function WelcomeScreen({ onChip }: { onChip: (text: string) => void }) {
  const chips = ['Explain scaling laws', 'Summarize core themes', 'Generate quiz', 'Extract methodology'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', margin: 'auto', padding: '40px 20px' }}>
      <DocumentHeartbeat />
      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 16 }}>
        YOUR SECOND BRAIN
      </h1>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: 450, lineHeight: 1.6, marginBottom: 32, textTransform: 'uppercase' }}>
        Think deeper with your documents. A research companion grounded in your sources.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {chips.map((c) => (
          <button
            key={c} onClick={() => onChip(c)}
            style={{
              padding: '10px 16px',
              background: 'var(--bg-surface)', border: 'var(--border-heavy)',
              color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer', transition: 'var(--transition)',
              boxShadow: 'var(--shadow-sm)',
            }}
            className="brutal-chip"
          >
            {c}
          </button>
        ))}
      </div>
      <style jsx>{`
        .brutal-chip:hover { background: var(--bg-hover); transform: translate(-2px, -2px); box-shadow: 4px 4px 0 rgba(122, 127, 148, 0.4); }
        .brutal-chip:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 rgba(122, 127, 148, 0.4); }
      `}</style>
    </div>
  );
}

function QuizMessage({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {questions.map((q, qi) => (
        <div key={qi} style={{ background: 'var(--bg-elevated)', border: 'var(--border-heavy)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: 'var(--bg-hover)', borderBottom: 'var(--border-heavy)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            KNOWLEDGE TEST — 0{qi + 1}
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{q.q}</p>
            {q.options.map((opt, oi) => {
              const answered = answers[qi] !== undefined;
              const isSelected = answers[qi] === oi;
              const isCorrect = oi === q.correct;
              let bg = 'var(--bg-surface)';
              let color = 'var(--text-primary)';
              let border = 'var(--border-heavy)';
              let shadow = 'var(--shadow-sm)';
              if (answered) {
                if (isCorrect) { bg = 'rgba(92, 143, 114, 0.15)'; color = '#5C8F72'; border = '2px solid #5C8F72'; }
                else if (isSelected) { bg = 'rgba(201, 112, 90, 0.15)'; color = '#C9705A'; border = '2px solid #C9705A'; }
                shadow = 'none';
              }
              return (
                <button
                  key={oi} disabled={answered} onClick={() => setAnswers(a => ({ ...a, [qi]: oi }))}
                  style={{
                    padding: '10px 14px',
                    background: bg, color, border, textAlign: 'left',
                    fontFamily: 'var(--font-mono)', fontSize: '0.85rem', cursor: answered ? 'default' : 'pointer',
                    transition: 'var(--transition)',
                    boxShadow: shadow,
                  }}
                  className={!answered ? 'brutal-quiz-opt' : ''}
                >
                  [{String.fromCharCode(65 + oi)}] {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <style jsx>{`
        .brutal-quiz-opt:hover { background: var(--bg-hover); transform: translate(-2px, -2px); box-shadow: 4px 4px 0 rgba(122, 127, 148, 0.4) !important; }
        .brutal-quiz-opt:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 rgba(122, 127, 148, 0.4) !important; }
      `}</style>
    </div>
  );
}

function MessageBubble({ msg, onSaveNote }: { msg: Message; onSaveNote: (text: string) => void }) {
  const isAI = msg.role === 'ai';
  return (
    <div style={{ display: 'flex', gap: 16, flexDirection: isAI ? 'row' : 'row-reverse', maxWidth: 880, margin: '0 auto', width: '100%' }} className="msg-appear">
      <div style={{
        width: 36, height: 36, flexShrink: 0,
        background: isAI ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
        border: isAI ? 'var(--border-accent)' : 'var(--border-heavy)', 
        color: isAI ? 'var(--accent)' : 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: '0.9rem',
        boxShadow: isAI ? 'var(--shadow-accent)' : 'var(--shadow-sm)',
      }}>
        {isAI ? 'AI' : 'US'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          padding: '16px 20px',
          background: isAI ? 'var(--bg-surface)' : 'var(--bg-hover)',
          border: 'var(--border-heavy)',
          color: 'var(--text-primary)',
          fontFamily: isAI ? 'var(--font-body)' : 'var(--font-mono)',
          lineHeight: 1.6, fontSize: '0.95rem',
          boxShadow: 'var(--shadow-sm)',
        }}
        className={msg.isStreaming ? 'typing-cursor' : ''}
        dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
        />

        <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: isAI ? 'flex-start' : 'flex-end' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
            {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
          {isAI && (
            <button onClick={() => onSaveNote(msg.content)} style={{
              background: 'none', border: 'none', color: 'var(--accent)', 
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', fontWeight: 700,
            }}>
              SAVE INSIGHT
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const { messages, addMessage, updateLastAIMessage, finalizeLastAIMessage, clearMessages, isLoading, setLoading, level, addNote, setActiveTab } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, showTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput('');
    addMessage({ id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date() });
    setShowTyping(true);
    setLoading(true);

    const aiMsgId = crypto.randomUUID();
    try {
      await new Promise(r => setTimeout(r, 1000));
      setShowTyping(false);
      addMessage({ id: aiMsgId, role: 'ai', content: '', timestamp: new Date(), isStreaming: true });

      const gen = streamQuery({ query: text, doc_id: '1', user_level: level });
      for await (const chunk of gen) {
        if (chunk.token) updateLastAIMessage(chunk.token);
        if (chunk.done) finalizeLastAIMessage(chunk.sources ?? []);
      }
    } catch { setShowTyping(false); } finally { setLoading(false); }
  };

  const handleAction = (action: string) => {
    if (action === 'quiz') {
      setQuizData(MOCK_QUIZ);
      addMessage({ id: crypto.randomUUID(), role: 'ai', content: '__QUIZ__', timestamp: new Date() });
      return;
    }
    sendMessage(`Generate a ${action}`);
  };

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {toast && <Toast message={toast.msg} type={toast.type} />}

      <div style={{ display: 'flex', gap: 10, padding: '12px 20px', borderBottom: 'var(--border-heavy)', background: 'var(--bg-surface)', overflowX: 'auto' }}>
        {['Summarize', 'Explain', 'Quiz', 'Mindmap'].map(a => (
          <button key={a} onClick={() => handleAction(a.toLowerCase())} style={{
            padding: '6px 14px', border: '2px solid rgba(196, 139, 32, 0.4)', 
            background: 'var(--accent-subtle)', color: 'var(--accent)',
            fontFamily: 'var(--font-mono)', fontSize: '0.8rem', cursor: 'pointer', transition: 'var(--transition)', fontWeight: 700,
            boxShadow: 'var(--shadow-accent)',
          }} className="brutal-action-btn">
            {a}
          </button>
        ))}
        <button onClick={clearMessages} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700 }}>
          CLEAR LOG
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        {messages.length === 0 && !showTyping ? <WelcomeScreen onChip={sendMessage} /> : 
          messages.map(msg => msg.content === '__QUIZ__' && quizData ? 
            <div key={msg.id} style={{ maxWidth: 880, margin: '0 auto', width: '100%' }}><QuizMessage questions={quizData} /></div> :
            <MessageBubble key={msg.id} msg={msg} onSaveNote={n => { addNote({ id: crypto.randomUUID(), tag: 'insight', text: n }); setActiveTab('notes'); }} />
          )
        }
        {showTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '20px', background: 'var(--bg-base)', borderTop: 'var(--border-heavy)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--bg-surface)', border: 'var(--border-heavy)', padding: '10px 16px',
          boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.1)',
        }}>
          <textarea
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
            placeholder="ASK ANYTHING ABOUT YOUR SOURCES..."
            style={{ flex: 1, border: 'none', background: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--text-primary)', outline: 'none', resize: 'none' }}
            rows={1}
          />
          <button onClick={() => sendMessage(input)} style={{
            width: 36, height: 36, background: 'var(--accent)', border: 'var(--border-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-on-accent)',
            boxShadow: '2px 2px 0 rgba(122, 127, 148, 0.4)', transition: 'var(--transition)'
          }} className="brutal-send-btn">
            <Send size={16} strokeWidth={3} />
          </button>
        </div>
      </div>
      <style jsx>{`
        .brutal-action-btn:hover { transform: translate(-2px, -2px); box-shadow: 4px 4px 0 rgba(196, 139, 32, 0.4) !important; }
        .brutal-action-btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 rgba(196, 139, 32, 0.4) !important; }
        .brutal-send-btn:hover { transform: translate(-2px, -2px); box-shadow: 4px 4px 0 rgba(196, 139, 32, 0.4) !important; }
        .brutal-send-btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 rgba(196, 139, 32, 0.4) !important; }
      `}</style>
    </main>
  );
}
