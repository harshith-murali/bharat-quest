import { useEffect, useRef, useState } from 'react';
import { fetchChatHistory, sendChatMessage, ChatMessage } from '../api/client';

const EMOJI_FONT =
  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', sans-serif";

const SUGGESTIONS = [
  'Tell me something amazing!',
  'What food is famous here?',
  'Which animals live here?',
  'What can I see here?',
];

interface Props {
  sectionId: string;
  stateName: string;
  onClose: () => void;
}

/**
 * Talk — a chat interface with the mascot guide.
 * Transcripts are persisted server-side so a teacher can review them.
 */
export default function TalkPanel({ sectionId, stateName, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load the existing transcript.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const history = await fetchChatHistory(sectionId);
      if (cancelled) return;
      if (history) setMessages(history);
      setLoading(false);
      inputRef.current?.focus();
    })();
    return () => {
      cancelled = true;
    };
  }, [sectionId]);

  // Keep the newest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    setInput('');
    setError(null);
    setSending(true);

    // Optimistically show the student's message.
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content,
      state_name: stateName,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const res = await sendChatMessage(sectionId, content, stateName);

    if (res) {
      setMessages((prev) => [
        ...prev,
        {
          id: `reply-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          state_name: stateName,
          created_at: new Date().toISOString(),
        },
      ]);
    } else {
      setError('Could not reach the guide. Please try again.');
    }

    setSending(false);
    inputRef.current?.focus();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        background: 'rgba(7, 10, 18, 0.82)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
      className="anim-fade-in"
    >
      <div
        className="anim-pop-in"
        style={{
          background: 'linear-gradient(145deg, #141826 0%, #0d1120 100%)',
          border: '2px solid var(--color-saffron)',
          borderRadius: '24px',
          maxWidth: 620,
          width: '100%',
          height: 'min(640px, calc(100vh - 3rem))',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 40px rgba(255,153,51,0.22), 0 20px 60px rgba(0,0,0,0.7)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ff9933, #e07000)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontFamily: EMOJI_FONT,
                flexShrink: 0,
              }}
            >
              🦁
            </div>
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-saffron)',
                  fontSize: '1.2rem',
                  margin: 0,
                }}
              >
                Ask your Guide
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', margin: '2px 0 0' }}>
                Exploring {stateName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '1.3rem',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
            aria-label="Close chat"
          >
            ✕
          </button>
        </div>

        {/* Transcript */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem 0' }}>
              Loading conversation…
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '2.5rem', fontFamily: EMOJI_FONT }}>🦁</div>
              <p style={{ color: 'var(--color-text-primary)', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>
                Namaste! Ask me anything about {stateName}.
              </p>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                Tap a question below to get started.
              </p>
            </div>
          )}

          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '78%',
                    background: isUser
                      ? 'linear-gradient(135deg, rgba(255,153,51,0.25), rgba(224,112,0,0.18))'
                      : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isUser ? 'rgba(255,153,51,0.4)' : 'rgba(255,255,255,0.09)'}`,
                    borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    padding: '0.7rem 0.95rem',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.93rem',
                    lineHeight: 1.5,
                  }}
                >
                  {m.content}
                </div>
              </div>
            );
          })}

          {sending && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: '14px 14px 14px 4px',
                  padding: '0.7rem 0.95rem',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.9rem',
                }}
              >
                <span style={{ fontFamily: EMOJI_FONT }}>🦁</span> thinking…
              </div>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', color: '#f87171', fontSize: '0.85rem' }}>{error}</div>
          )}
        </div>

        {/* Suggestions (only before the first message) */}
        {!loading && messages.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem',
              padding: '0 1.5rem 0.75rem',
              flexShrink: 0,
            }}
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                disabled={sending}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-cyan)',
                  background: 'rgba(6,182,212,0.1)',
                  border: '1px solid rgba(6,182,212,0.28)',
                  borderRadius: 99,
                  padding: '5px 12px',
                  cursor: sending ? 'default' : 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <div
          style={{
            display: 'flex',
            gap: '0.6rem',
            padding: '1rem 1.5rem 1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            maxLength={500}
            placeholder={`Ask about ${stateName}…`}
            disabled={sending}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1.5px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              padding: '0.7rem 1rem',
              color: 'var(--color-text-primary)',
              fontSize: '0.95rem',
              fontFamily: 'var(--font-body)',
              outline: 'none',
            }}
          />
          <button
            className="btn btn-primary"
            onClick={() => handleSend()}
            disabled={sending || !input.trim()}
            style={{
              padding: '0.7rem 1.25rem',
              borderRadius: '12px',
              opacity: sending || !input.trim() ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
