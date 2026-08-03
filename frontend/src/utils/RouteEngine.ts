import { Point2D, NORMALIZED_CITY_COORDINATES } from './CoordinateScaler';

export interface RouteLeg {
  id: string;
  fromCity: string;
  toCity: string;
  waypointsRatio: [number, number][]; // normalized [xRatio, yRatio]
}

// Predefined curved route waypoints (normalized 0..1 coordinates)
export const ROUTE_LEGS: Record<string, RouteLeg> = {
  mission_1: {
    id: 'mission_1',
    fromCity: 'Delhi',
    toCity: 'Agra',
    waypointsRatio: [
      [0.345, 0.275], // Delhi
      [0.360, 0.305],
      [0.372, 0.325],
      [0.385, 0.345], // Agra
    ],
  },
  mission_2: {
    id: 'mission_2',
    fromCity: 'Agra',
    toCity: 'Varanasi',
    waypointsRatio: [
      [0.385, 0.345], // Agra
      [0.435, 0.365],
      [0.495, 0.375],
      [0.555, 0.385], // Varanasi
    ],
  },
  mission_3: {
    id: 'mission_3',
    fromCity: 'Varanasi',
    toCity: 'Kerala',
    waypointsRatio: [
      [0.555, 0.385], // Varanasi
      [0.505, 0.485],
      [0.445, 0.605],
      [0.375, 0.725],
      [0.385, 0.835], // Kerala (Kochi)
    ],
  },
};

// Generate organic randomized intermediate waypoints between start & destination cities
export function generateRandomizedWaypoints(
  startCity: string,
  endCity: string,
  numWaypoints: number = 3
): [number, number][] {
  const start = NORMALIZED_CITY_COORDINATES[startCity] || NORMALIZED_CITY_COORDINATES['Delhi'];
  const end = NORMALIZED_CITY_COORDINATES[endCity] || NORMALIZED_CITY_COORDINATES['Agra'];

  const startPt: [number, number] = [start.xRatio, start.yRatio];
  const endPt: [number, number] = [end.xRatio, end.yRatio];

  const dx = endPt[0] - startPt[0];
  const dy = endPt[1] - startPt[1];
  const length = Math.sqrt(dx * dx + dy * dy);

  const perpX = -dy / (length || 1);
  const perpY = dx / (length || 1);

  const waypoints: [number, number][] = [startPt];

  for (let i = 1; i <= numWaypoints; i++) {
    const t = i / (numWaypoints + 1);
    const baseX = startPt[0] + dx * t;
    const baseY = startPt[1] + dy * t;

    // Organic S-curve sway with subtle random variation
    const sway = Math.sin(t * Math.PI) * (Math.random() * 0.04 + 0.02) * (i % 2 === 0 ? 1 : -1);
    const pointX = baseX + perpX * sway;
    const pointY = baseY + perpY * sway;

    waypoints.push([pointX, pointY]);
  }

  waypoints.push(endPt);
  return waypoints;
}

// Generate smooth SVG Catmull-Rom cubic path string from pixel points
export function generateSvgPathString(points: Point2D[]): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return d;
}
