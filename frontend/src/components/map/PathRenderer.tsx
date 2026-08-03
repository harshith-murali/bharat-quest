import { useMemo } from 'react';
import { Point2D } from '../../utils/CoordinateScaler';
import { generateSvgPathString } from '../../utils/RouteEngine';

interface PathRendererProps {
  pixelPoints: Point2D[];
  travelProgress: number; // 0 to 1
  totalLength: number;
}

export default function PathRenderer({ pixelPoints, travelProgress, totalLength }: PathRendererProps) {
  const d = useMemo(() => generateSvgPathString(pixelPoints), [pixelPoints]);

  const dashOffset = useMemo(() => {
    const clampedProgress = Math.min(Math.max(travelProgress, 0), 1);
    return Math.max(0, totalLength * (1 - clampedProgress));
  }, [travelProgress, totalLength]);

  if (!d) return null;

  return (
    <g className="route-path-group">
      {/* 1. Entire Active Mission Route (Source -> Destination): Fluorescent Neon Red Highlighting */}
      <path
        d={d}
        fill="none"
        stroke="#ff0055"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
        style={{
          filter: 'drop-shadow(0 0 10px #ff0055) drop-shadow(0 0 20px #ff0033)',
        }}
      />

      {/* 2. Outer Glowing Laser Halo for Completed Trail */}
      <path
        d={d}
        fill="none"
        stroke="#ff0055"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={totalLength || 1000}
        strokeDashoffset={dashOffset}
        opacity="0.95"
        style={{
          filter: 'drop-shadow(0 0 14px #ff0055) drop-shadow(0 0 28px #ff0033) drop-shadow(0 0 40px #e11d48)',
          transition: 'stroke-dashoffset 0.05s linear',
        }}
      />

      {/* 3. Ultra-Bright White Laser Core for Completed Trail */}
      <path
        d={d}
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={totalLength || 1000}
        strokeDashoffset={dashOffset}
        opacity="0.98"
        style={{
          filter: 'drop-shadow(0 0 6px #ffffff) drop-shadow(0 0 12px #ff0055)',
          transition: 'stroke-dashoffset 0.05s linear',
        }}
      />
    </g>
  );
}
