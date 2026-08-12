import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { STATE_COORDINATES } from '../../utils/CoordinateScaler';
import { generateSeededRoutePath } from '../../utils/RouteEngine';
import CarAnimator from '../map/CarAnimator';

interface IndiaMapSceneProps {
  currentStateName?: string;
  drivingLeg?: { fromState: string; toState: string } | null;
  isDriving?: boolean;
  driveProgress?: number;
  classroomKey?: string;
  isTravelling?: boolean;
  travelProgress?: number;
  currentMissionId?: string;
  mapPosition?: number;
  hideOverlay?: boolean;
  hideCityMarkers?: boolean;
}

export default function IndiaMapScene({
  currentStateName = 'Ladakh',
  drivingLeg = null,
  isDriving = false,
  driveProgress = 0,
  classroomKey = 'class_3_A',
}: IndiaMapSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null!);

  const [containerBounds, setContainerBounds] = useState<{ width: number; height: number }>({
    width: 1000,
    height: 700,
  });

  // The measurement <path> element is held in STATE (not a ref) so that the
  // render which first shows the driving car is guaranteed to already have a
  // mounted, measurable path. Reading a ref during render is unreliable — on
  // the render where isDriving flips true the ref is still null, which made
  // the component fall through to the "parked" car and never animate.
  const [measuredPath, setMeasuredPath] = useState<SVGPathElement | null>(null);
  const [pathLength, setPathLength] = useState<number>(0);

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

  // Compute driving Bezier path if driving leg is active
  const drivingPathD = useMemo(() => {
    if (!drivingLeg?.fromState || !drivingLeg?.toState) return '';
    const coordA = STATE_COORDINATES[drivingLeg.fromState];
    const coordB = STATE_COORDINATES[drivingLeg.toState];
    if (!coordA || !coordB) return '';

    const p1 = { x: coordA.xRatio * containerBounds.width, y: coordA.yRatio * containerBounds.height };
    const p2 = { x: coordB.xRatio * containerBounds.width, y: coordB.yRatio * containerBounds.height };
    const seed = `${classroomKey}_${drivingLeg.fromState}_${drivingLeg.toState}`;
    return generateSeededRoutePath(p1, p2, seed);
  }, [drivingLeg, containerBounds, classroomKey]);

  // Callback ref: fires as soon as the <path> mounts/unmounts, committing both
  // the element and its measured length to state so the driving branch below
  // can rely on them being present.
  const measurePathRef = useCallback((el: SVGPathElement | null) => {
    setMeasuredPath(el);
    if (el) {
      const len = el.getTotalLength() || 0;
      setPathLength((prev) => (prev !== len ? len : prev));
    } else {
      setPathLength(0);
    }
  }, []);

  // Re-measure whenever the path geometry itself changes (new leg, or the
  // container resized so the path was regenerated at different pixel coords).
  useEffect(() => {
    if (!measuredPath) return;
    const len = measuredPath.getTotalLength() || 0;
    setPathLength((prev) => (prev !== len ? len : prev));
  }, [measuredPath, drivingPathD]);

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

      {/* Permanent SVG measurement path layer for driving animation */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0, zIndex: 0 }}>
        {drivingPathD && <path ref={measurePathRef} d={drivingPathD} fill="none" />}
      </svg>

      {/* 2. 60 FPS RAF Overlaid 3D Vehicle Animation (Parked or Driving) */}
      {(() => {
        if (isDriving && measuredPath) {
          const totalLen = pathLength || measuredPath.getTotalLength() || 1;
          if (totalLen > 0) {
            return (
              <CarAnimator
                svgPathElement={measuredPath}
                travelProgress={driveProgress}
                isTravelling={true}
                totalPathLength={totalLen}
              />
            );
          }
        }

        const activeStateName = currentStateName || 'Ladakh';
        const coord = STATE_COORDINATES[activeStateName] ?? STATE_COORDINATES['Ladakh'];
        const carPos = coord
          ? { x: coord.xRatio * containerBounds.width, y: coord.yRatio * containerBounds.height }
          : undefined;

        return <CarAnimator position={carPos} isTravelling={false} />;
      })()}
    </div>
  );
}
