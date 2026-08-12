import { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import LionMascot from './LionMascot';
import ErrorBoundary from '../ErrorBoundary';

export type MascotState = 'idle' | 'talk' | 'celebrate' | 'sulk';

interface Props {
  state: MascotState;
  dialogueText?: string;
  onDialogueComplete?: () => void;
  mascotName?: string;
}

export default function MascotCanvas({
  state: mascotState,
  dialogueText,
  onDialogueComplete,
  mascotName = 'Bharat AI Mascot'
}: Props) {
  const [displayedText, setDisplayedText] = useState('');

  // Fixed deterministic typewriter effect (prevents word merging like 'bankssof')
  useEffect(() => {
    if (!dialogueText) {
      setDisplayedText('');
      return;
    }

    setDisplayedText('');
    const targetText = dialogueText;
    let currentLength = 0;

    const interval = setInterval(() => {
      currentLength++;
      setDisplayedText(targetText.slice(0, currentLength));

      if (currentLength >= targetText.length) {
        clearInterval(interval);
        if (onDialogueComplete) onDialogueComplete();
      }
    }, 22);

    return () => clearInterval(interval);
  }, [dialogueText, onDialogueComplete]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1.25rem',
        width: '100%',
        background: 'linear-gradient(145deg, #141824 0%, #0b0e17 100%)',
        border: '2px solid var(--color-saffron)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.25rem',
        boxShadow: '0 0 30px rgba(255, 153, 51, 0.25), var(--shadow-card)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Spotlight Glow behind Adventurer Mascot Portrait */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: -20,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 153, 51, 0.35) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* 3D Mascot Character Viewport */}
      <div
        style={{
          width: 150,
          height: 160,
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(255,153,51,0.2), rgba(79,91,213,0.15))',
          border: '2px solid var(--color-gold)',
          boxShadow: '0 0 20px rgba(255, 193, 7, 0.4), 0 8px 24px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <ErrorBoundary>
          <Canvas
            camera={{ position: [0, 0, 3.2], fov: 45 }}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={1.6} />
            <directionalLight position={[5, 10, 7]} intensity={1.8} />
            <pointLight position={[-5, 5, -5]} intensity={0.6} />
            <Suspense fallback={null}>
              <LionMascot state={mascotState} />
            </Suspense>
          </Canvas>
        </ErrorBoundary>

        {/* Name Tag */}
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 900,
            color: 'var(--color-gold)',
            fontFamily: 'var(--font-display)',
            textShadow: '0 2px 4px rgba(0,0,0,0.9)',
            letterSpacing: '0.5px',
            pointerEvents: 'none',
            background: 'rgba(20, 24, 36, 0.7)',
            padding: '2px 0',
          }}
        >
          {mascotName.toUpperCase()}
        </div>
      </div>

      {/* Speech Bubble Card with Tail */}
      <div style={{ flex: 1, minWidth: 0 }} className="speech-bubble-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <div className="flex items-center gap-1">
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.05rem', color: 'var(--color-saffron)' }}>
              {mascotName}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
              (NCERT Verified Guide)
            </span>
          </div>

          <span
            style={{
              fontSize: '0.7rem',
              background: mascotState === 'celebrate' ? '#10b981' : mascotState === 'sulk' ? '#ef4444' : 'var(--color-surface-2)',
              color: mascotState === 'celebrate' ? '#1a0a00' : mascotState === 'sulk' ? '#fff' : 'var(--color-text-secondary)',
              padding: '3px 10px',
              borderRadius: 99,
              fontWeight: 800,
              letterSpacing: '0.5px',
              transition: 'all 0.3s ease',
            }}
          >
            {mascotState === 'celebrate' ? '✨ CELEBRATE' : mascotState === 'sulk' ? '😔 SULK' : mascotState.toUpperCase()}
          </span>
        </div>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '1.05rem',
            color: 'var(--color-text-primary)',
            lineHeight: 1.45,
            margin: 0,
          }}
        >
          {displayedText || dialogueText || 'Namaste! Welcome to Agra, home of the magnificent Taj Mahal!'}
        </p>
      </div>
    </div>
  );
}

