import { useState, useMemo, useRef, useEffect } from 'react';
import { getPixelPoints } from '../../utils/CoordinateScaler';
import { generateSvgPathString, generateRandomizedWaypoints } from '../../utils/RouteEngine';
import PathRenderer from '../map/PathRenderer';
import MarkerAnimator from '../map/MarkerAnimator';
import CarAnimator from '../map/CarAnimator';

interface IndiaMapSceneProps {
  currentMissionId: string;
  mapPosition: number;
  isTravelling: boolean;
  travelProgress: number;
  hideOverlay?: boolean;
}

export default function IndiaMapScene({
  currentMissionId,
  mapPosition,
  isTravelling,
  travelProgress,
  hideOverlay = false,
}: IndiaMapSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const svgPathRef = useRef<SVGPathElement | null>(null);

  const [containerBounds, setContainerBounds] = useState<{ width: number; height: number }>({
    width: 1000,
    height: 700,
  });

  const [totalPathLength, setTotalPathLength] = useState<number>(0);

  // ResizeObserver for dynamic image & container scaling on desktop, laptop, tablet, mobile
  useEffect(() => {
    if (!containerRef.current) return;

    const updateBounds = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerBounds({
          width: rect.width || 1000,
          height: rect.height || 700,
        });
      }
    };

    updateBounds();

    const resizeObserver = new ResizeObserver(updateBounds);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Current Mission Route Leg with organic randomized waypoints
  const waypointsRatio = useMemo(() => {
    const fromCity =
      currentMissionId === 'mission_1'
        ? 'Delhi'
        : currentMissionId === 'mission_2'
        ? 'Agra'
        : 'Varanasi';
    const toCity =
      currentMissionId === 'mission_1'
        ? 'Agra'
        : currentMissionId === 'mission_2'
        ? 'Varanasi'
        : 'Kerala';

    return generateRandomizedWaypoints(fromCity, toCity, 4);
  }, [currentMissionId]);

  // Scaled Pixel Points matching container bounds
  const pixelPoints = useMemo(() => {
    return getPixelPoints(
      waypointsRatio,
      containerBounds.width,
      containerBounds.height
    );
  }, [waypointsRatio, containerBounds]);

  const svgPathD = useMemo(() => {
    return generateSvgPathString(pixelPoints);
  }, [pixelPoints]);

  // Calculate SVG Path total length when path updates
  useEffect(() => {
    if (svgPathRef.current) {
      setTotalPathLength(svgPathRef.current.getTotalLength() || 0);
    }
  }, [svgPathD, containerBounds]);

  const currentRouteName =
    currentMissionId === 'mission_1'
      ? 'Delhi → Agra'
      : currentMissionId === 'mission_2'
      ? 'Agra → Varanasi'
      : 'Varanasi → Kerala';

  const isArrived = travelProgress >= 0.99;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#07111e',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        border: '2px solid var(--color-saffron)',
        boxShadow: '0 0 35px rgba(255, 153, 51, 0.35), var(--shadow-card)',
        userSelect: 'none',
      }}
    >
      {/* 1. Static 2D India Map Background Image */}
      <img
        src="/india_map.png"
        alt="India Map"
        loading="lazy"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
          pointerEvents: 'none',
          opacity: 0.9,
        }}
      />

      {/* 2. SVG Route Path & Illuminated Trail Layer */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        {/* Hidden measurement path ref */}
        <path ref={svgPathRef} d={svgPathD} fill="none" opacity="0" />

        <PathRenderer
          pixelPoints={pixelPoints}
          travelProgress={travelProgress}
          totalLength={totalPathLength}
        />
      </svg>

      {/* 3. Pulsing Destination & Visited City Markers Layer */}
      <MarkerAnimator
        currentMissionId={currentMissionId}
        mapPosition={mapPosition}
        containerWidth={containerBounds.width}
        containerHeight={containerBounds.height}
        isArrived={isArrived}
      />

      {/* 4. 60 FPS RAF Overlaid 3D Vehicle Animation */}
      <CarAnimator
        svgPathElement={svgPathRef.current}
        travelProgress={travelProgress}
        isTravelling={isTravelling}
        totalPathLength={totalPathLength}
      />

      {/* Floating HUD Overlays (Hidden when hideOverlay is true) */}
      {!hideOverlay && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 90,
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1.5px solid var(--color-saffron)',
              borderRadius: '12px',
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: 'var(--color-saffron)',
              pointerEvents: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 600,
            }}
          >
            <span>🏎️</span>
            <span>TRAVEL MAP — {currentRouteName}</span>
          </div>

          <div
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
              pointerEvents: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              zIndex: 600,
            }}
          >
            <span style={{ color: isTravelling ? 'var(--color-green-light)' : 'var(--color-text-secondary)' }}>
              🏎️ {isTravelling ? '140 KM/H' : '0 KM/H'}
            </span>
            <span style={{ color: 'var(--color-gold)' }}>
              ⛽ 78% FUEL
            </span>
            <span style={{ color: 'var(--color-cyan)' }}>
              ⏱️ ETA: 05:15 PM
            </span>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 14,
              right: 14,
              zIndex: 600,
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #ff9933 0%, #e07000 100%)',
                color: '#1a0a00',
                border: '1.5px solid var(--color-gold)',
                borderRadius: '10px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 900,
                fontFamily: 'var(--font-display)',
                boxShadow: '0 0 16px rgba(255, 153, 51, 0.4), 0 4px 12px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🏎️</span>
              <span>Driver View</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
