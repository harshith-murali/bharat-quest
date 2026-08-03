// Scalable Coordinate System for India Map Image (2438 x 1728)

export interface CityCoord {
  name: string;
  xRatio: number; // 0 to 1 relative to map width
  yRatio: number; // 0 to 1 relative to map height
}

export const NORMALIZED_CITY_COORDINATES: Record<string, CityCoord> = {
  Delhi: { name: 'Delhi', xRatio: 0.345, yRatio: 0.275 },
  Agra: { name: 'Agra', xRatio: 0.385, yRatio: 0.345 },
  Varanasi: { name: 'Varanasi', xRatio: 0.555, yRatio: 0.385 },
  Kerala: { name: 'Kerala', xRatio: 0.385, yRatio: 0.835 },
  Jaipur: { name: 'Jaipur', xRatio: 0.310, yRatio: 0.350 },
  Mumbai: { name: 'Mumbai', xRatio: 0.255, yRatio: 0.580 },
  Bhopal: { name: 'Bhopal', xRatio: 0.395, yRatio: 0.445 },
  Hyderabad: { name: 'Hyderabad', xRatio: 0.415, yRatio: 0.620 },
  Chennai: { name: 'Chennai', xRatio: 0.475, yRatio: 0.740 },
  Bengaluru: { name: 'Bengaluru', xRatio: 0.385, yRatio: 0.745 },
  Kolkata: { name: 'Kolkata', xRatio: 0.675, yRatio: 0.435 },
  Guwahati: { name: 'Guwahati', xRatio: 0.785, yRatio: 0.355 },
};

export interface Point2D {
  x: number;
  y: number;
}

// Convert normalized city ratio to pixel coordinates matching element container bounds
export function getPixelCoord(
  cityKey: string,
  containerWidth: number,
  containerHeight: number
): Point2D {
  const coord = NORMALIZED_CITY_COORDINATES[cityKey] || NORMALIZED_CITY_COORDINATES['Delhi'];
  return {
    x: coord.xRatio * containerWidth,
    y: coord.yRatio * containerHeight,
  };
}

// Scale array of normalized points to pixel coordinates
export function getPixelPoints(
  normalizedPoints: [number, number][],
  containerWidth: number,
  containerHeight: number
): Point2D[] {
  return normalizedPoints.map(([xRatio, yRatio]) => ({
    x: xRatio * containerWidth,
    y: yRatio * containerHeight,
  }));
}
