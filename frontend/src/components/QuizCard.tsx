import { useState, useEffect } from 'react';
import { Question } from '../types';
import { useSession } from '../store/sessionStore';

interface Props {
  question: Question;
  studentName: string;
  studentAvatar: string;
  onCorrectAnswer?: () => void;
  onAnswerResponse?: (correct: boolean, studentName: string, xpValue: number, correctAnswerText: string) => void;
}

type AnswerState = 'idle' | 'correct' | 'wrong';

export default function QuizCard({ question, studentName, studentAvatar, onCorrectAnswer, onAnswerResponse }: Props) {
  const { answerQuestion } = useSession();
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [xpPopVisible, setXpPopVisible] = useState(false);

  const [shuffledOptions, setShuffledOptions] = useState<{ text: string; originalIndex: number }[]>([]);

  useEffect(() => {
    setAnswerState('idle');
    setSelectedOption(null);
    setXpPopVisible(false);

    const opts = (question.options || []).map((text, originalIndex) => ({ text, originalIndex }));
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    setShuffledOptions(opts);
  }, [question.id, question.options]);

  async function handleAnswer(displayIdx: number) {
    if (answerState !== 'idle') return;

    const selectedItem = shuffledOptions[displayIdx];
    if (!selectedItem) return;

    const correct = selectedItem.originalIndex === question.correct_option;
    const correctAnswerText = question.options[question.correct_option] || '';
    setSelectedOption(displayIdx);
    setAnswerState(correct ? 'correct' : 'wrong');

    if (correct) {
      setXpPopVisible(true);
      if (onCorrectAnswer) onCorrectAnswer();
      setTimeout(() => setXpPopVisible(false), 1300);
    }

    if (onAnswerResponse) {
      onAnswerResponse(correct, studentName, question.xp_value, correctAnswerText);
    }

    // Give 1.4s delay so students can read feedback banner & hear mascot before switching question
    setTimeout(async () => {
      await answerQuestion(question.id, correct, question.xp_value);
    }, 1400);
  }

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div
      className="anim-pop-in"
      style={{
        background: 'var(--color-surface)',
        border: '2px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        position: 'relative',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      {/* Top tricolor bar accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: 'linear-gradient(90deg, #ff9933, #ffffff, #10b981)',
        }}
      />

      {/* Active Student Turn Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          background: 'linear-gradient(135deg, rgba(255,153,51,0.15), rgba(255,119,0,0.08))',
          border: '1.5px solid rgba(255,153,51,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1.25rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ff9933, #e07000)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            boxShadow: '0 0 14px rgba(255,153,51,0.5)',
          }}
        >
          {studentAvatar || '🧑'}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', color: 'var(--color-saffron)' }}>
            {studentName}'s Turn
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            Tap your choice on the board!
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span className="badge badge-xp" style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}>
            ⭐ +{question.xp_value} XP
          </span>
        </div>
      </div>

      {/* Question Card */}
      <div
        style={{
          background: 'var(--color-surface-2)',
          borderRadius: 'var(--radius-md)',
          padding: '1.4rem 1.6rem',
          border: '1px solid var(--color-border)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            lineHeight: 1.35,
            margin: 0,
          }}
        >
          {question.text}
        </p>
      </div>

      {/* 4 Option Buttons (Shuffled at Runtime) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {shuffledOptions.map((optItem, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = optItem.originalIndex === question.correct_option;
          const answered = answerState !== 'idle';

          let bg = 'var(--color-surface-2)';
          let border = '2px solid var(--color-border)';
          let color = 'var(--color-text-primary)';
          let shadow = '0 4px 0 #121520';

          if (answered) {
            if (isCorrect) {
              bg = 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.15))';
              border = '2.5px solid #10b981';
              color = '#34d399';
              shadow = '0 4px 0 #047857, 0 0 20px rgba(16,185,129,0.4)';
            } else if (isSelected && !isCorrect) {
              bg = 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(185,28,28,0.15))';
              border = '2.5px solid #ef4444';
              color = '#f87171';
              shadow = '0 4px 0 #991b1b';
            } else {
              bg = 'var(--color-surface-2)';
              border = '1px solid var(--color-border)';
              color = 'var(--color-text-secondary)';
            }
          }

          return (
            <button
              key={idx}
              id={`option-${idx}`}
              onClick={() => handleAnswer(idx)}
              disabled={answered}
              style={{
                background: bg,
                border,
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem 1.4rem',
                minHeight: 74,
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: answered ? 'default' : 'pointer',
                transition: 'all var(--transition-med)',
                textAlign: 'left',
                boxShadow: shadow,
                transform: isSelected && answered && isCorrect ? 'scale(1.02)' : 'scale(1)',
              }}
              onMouseEnter={(e) => {
                if (!answered) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,153,51,0.12)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-saffron)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!answered) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-2)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                }
              }}
            >
              {/* Option Letter Badge */}
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: answered && isCorrect
                    ? '#10b981'
                    : answered && isSelected
                    ? '#ef4444'
                    : 'linear-gradient(135deg, #2e3650, #1e2436)',
                  color: answered ? '#000' : 'var(--color-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  flexShrink: 0,
                  fontFamily: 'var(--font-display)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}
              >
                {answered && isCorrect ? '✓' : answered && isSelected ? '✗' : optionLabels[idx]}
              </span>

              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color,
                  lineHeight: 1.35,
                }}
              >
                {optItem.text}
              </span>
            </button>
          );
        })}
      </div>

      {/* Result feedback banner */}
      {answerState !== 'idle' && (
        <div
          className="anim-pop-in"
          style={{
            background: answerState === 'correct'
              ? 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.08))'
              : 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(185,28,28,0.08))',
            border: `1.5px solid ${answerState === 'correct' ? '#10b981' : '#ef4444'}`,
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1.4rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '2rem' }}>
            {answerState === 'correct' ? '🎉' : '😅'}
          </span>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '1.2rem',
                color: answerState === 'correct' ? 'var(--color-green-light)' : 'var(--color-red-light)',
              }}
            >
              {answerState === 'correct' ? `Shabash! +${question.xp_value} XP!` : 'Not quite!'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {answerState === 'correct'
                ? 'Great job! Spin for the next student.'
                : `The correct answer was: ${question.options[question.correct_option]}`}
            </div>
          </div>
        </div>
      )}

      {/* XP Pop Animation */}
      {xpPopVisible && (
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: 'var(--font-display)',
            fontSize: '3rem',
            fontWeight: 900,
            color: 'var(--color-gold)',
            pointerEvents: 'none',
            animation: 'xpPop 1.3s ease forwards',
            zIndex: 20,
            textShadow: '0 0 24px rgba(255,193,7,0.9)',
          }}
        >
          +{question.xp_value} ⭐
        </div>
      )}
    </div>
  );
}
