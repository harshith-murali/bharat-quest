import { useMemo } from 'react';
import { NORMALIZED_CITY_COORDINATES } from '../../utils/CoordinateScaler';

interface MarkerAnimatorProps {
  currentMissionId: string;
  mapPosition: number;
  containerWidth: number;
  containerHeight: number;
  isArrived: boolean;
}

const CITY_LANDMARK_IMAGES: Record<string, string> = {
  Delhi: '/assets/monuments/india-gate.svg',
  Agra: '/assets/monuments/taj-mahal.svg',
  Varanasi: '/assets/monuments/ganga-ghats.svg',
  Kerala: '/assets/monuments/kerala-backwaters.svg',
};

const CITY_LIST = ['Delhi', 'Agra', 'Varanasi', 'Kerala'];

export default function MarkerAnimator({
  currentMissionId,
  mapPosition,
  containerWidth,
  containerHeight,
  isArrived,
}: MarkerAnimatorProps) {
  const destCityName = useMemo(() => {
    if (currentMissionId === 'mission_1') return 'Agra';
    if (currentMissionId === 'mission_2') return 'Varanasi';
    return 'Kerala';
  }, [currentMissionId]);

  return (
    <div className="markers-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {CITY_LIST.map((cityName, idx) => {
        const coord = NORMALIZED_CITY_COORDINATES[cityName];
        if (!coord) return null;

        const x = coord.xRatio * containerWidth;
        const y = coord.yRatio * containerHeight;

        const isVisited = idx <= mapPosition;
        const isDestination = cityName === destCityName;
        const imgUrl = CITY_LANDMARK_IMAGES[cityName];

        return (
          <div
            key={cityName}
            style={{
              position: 'absolute',
              top: y,
              left: x,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: isDestination ? 30 : 10,
            }}
          >
            {/* 1. Green Destination Map Pin Badge (Visible BEFORE arrival, removed when arrival popup shows) */}
            {isDestination && !isArrived && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: '1.5px solid #6ee7b7',
                  borderRadius: '12px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 900,
                  fontFamily: 'var(--font-display)',
                  boxShadow: '0 0 16px rgba(16, 185, 129, 0.8), 0 4px 12px rgba(0,0,0,0.5)',
                  whiteSpace: 'nowrap',
                  animation: 'mapPinFloat 2s ease-in-out infinite',
                }}
              >
                <span style={{ fontSize: '14px' }}>📍</span>
                <span>DESTINATION</span>
              </div>
            )}

            {/* 2. Destination Reached Pop-Up Card (Appears ONLY when car arrives) */}
            {isDestination && isArrived && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '110%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: '2px solid #6ee7b7',
                  borderRadius: '14px',
                  padding: '8px 16px',
                  color: '#ffffff',
                  fontFamily: 'var(--font-display)',
                  fontSize: '13px',
                  fontWeight: 900,
                  boxShadow: '0 0 25px rgba(16, 185, 129, 0.7), 0 8px 20px rgba(0,0,0,0.6)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  animation: 'popupBounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                  zIndex: 100,
                  pointerEvents: 'auto',
                }}
              >
                <span style={{ fontSize: '20px' }}>🗺️</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Destination Reached!
                  </span>
                  <span style={{ fontSize: '14px', color: '#ffea79' }}>
                    {cityName}
                  </span>
                </div>
              </div>
            )}

            {/* 3. Destination Pulsing Fluorescent Red Glow Rings */}
            {isDestination && (
              <>
                <div
                  style={{
                    position: 'absolute',
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    border: '2.5px solid #ff0055',
                    animation: 'pulseFluorescentRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
                    boxShadow: '0 0 20px #ff0055',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    border: '1.5px solid #ff0033',
                    animation: 'pulseFluorescentRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) 0.6s infinite',
                    opacity: 0.6,
                  }}
                />
              </>
            )}

            {/* City Badge Marker Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(15, 23, 42, 0.92)',
                backdropFilter: 'blur(8px)',
                border: isDestination
                  ? '2.5px solid #10b981'
                  : isVisited
                  ? '2px solid #10b981'
                  : '1.5px solid #475569',
                borderRadius: '99px',
                padding: '3px 10px 3px 4px',
                boxShadow: isDestination
                  ? '0 0 22px rgba(16, 185, 129, 0.8), 0 4px 12px rgba(0,0,0,0.5)'
                  : '0 4px 12px rgba(0,0,0,0.5)',
                color: '#f8fafc',
                fontFamily: 'var(--font-display)',
                fontSize: '11px',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                animation: isDestination ? 'markerBreathing 2.5s ease-in-out infinite' : 'none',
              }}
            >
              <img
                src={imgUrl}
                alt={cityName}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: isVisited ? '1px solid #10b981' : '1px solid #10b981',
                }}
              />
              <span>{cityName}</span>
              {isVisited && <span style={{ color: '#10b981', marginLeft: 2 }}>✓</span>}
            </div>
          </div>
        );
      })}

      {/* Embedded CSS Animations */}
      <style>{`
        @keyframes pulseFluorescentRing {
          0% {
            transform: scale(0.5);
            opacity: 0.95;
          }
          100% {
            transform: scale(1.95);
            opacity: 0;
          }
        }
        @keyframes mapPinFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        @keyframes markerBreathing {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.06);
          }
        }
        @keyframes popupBounceIn {
          0% {
            transform: scale(0.3) translateY(20px);
            opacity: 0;
          }
          70% {
            transform: scale(1.1) translateY(-4px);
            opacity: 1;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
