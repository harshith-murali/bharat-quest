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

// ─── State Coordinates for Quest Mode ────────────────────────────────────────
// Precise landmass center coordinates for each of the 30 Quest states
// on the India map PNG image (strictly on land, never in ocean/water).

export const STATE_COORDINATES: Record<string, CityCoord> = {
  'Andhra Pradesh':    { name: 'Andhra Pradesh',    xRatio: 0.460, yRatio: 0.665 },
  'Arunachal Pradesh': { name: 'Arunachal Pradesh', xRatio: 0.850, yRatio: 0.285 },
  'Assam':             { name: 'Assam',             xRatio: 0.785, yRatio: 0.350 },
  'Bihar':             { name: 'Bihar',             xRatio: 0.570, yRatio: 0.365 },
  'Chhattisgarh':      { name: 'Chhattisgarh',      xRatio: 0.495, yRatio: 0.490 },
  'Goa':               { name: 'Goa',               xRatio: 0.310, yRatio: 0.655 },
  'Gujarat':           { name: 'Gujarat',           xRatio: 0.250, yRatio: 0.460 },
  'Haryana':           { name: 'Haryana',           xRatio: 0.340, yRatio: 0.270 },
  'Himachal Pradesh':  { name: 'Himachal Pradesh',  xRatio: 0.370, yRatio: 0.200 },
  'Jammu & Kashmir':   { name: 'Jammu & Kashmir',   xRatio: 0.295, yRatio: 0.160 },
  'Jharkhand':         { name: 'Jharkhand',         xRatio: 0.590, yRatio: 0.425 },
  'Karnataka':         { name: 'Karnataka',         xRatio: 0.365, yRatio: 0.700 },
  'Kerala':            { name: 'Kerala',            xRatio: 0.380, yRatio: 0.815 },
  'Ladakh':            { name: 'Ladakh',            xRatio: 0.365, yRatio: 0.130 },
  'Madhya Pradesh':    { name: 'Madhya Pradesh',    xRatio: 0.410, yRatio: 0.440 },
  'Maharashtra':       { name: 'Maharashtra',       xRatio: 0.335, yRatio: 0.550 },
  'Manipur':           { name: 'Manipur',           xRatio: 0.830, yRatio: 0.405 },
  'Meghalaya':         { name: 'Meghalaya',         xRatio: 0.765, yRatio: 0.380 },
  'Mizoram':           { name: 'Mizoram',           xRatio: 0.815, yRatio: 0.445 },
  'Nagaland':          { name: 'Nagaland',          xRatio: 0.840, yRatio: 0.365 },
  'Odisha':            { name: 'Odisha',            xRatio: 0.560, yRatio: 0.505 },
  'Punjab':            { name: 'Punjab',            xRatio: 0.305, yRatio: 0.230 },
  'Rajasthan':         { name: 'Rajasthan',         xRatio: 0.295, yRatio: 0.360 },
  'Sikkim':            { name: 'Sikkim',            xRatio: 0.685, yRatio: 0.320 },
  'Tamil Nadu':        { name: 'Tamil Nadu',        xRatio: 0.435, yRatio: 0.780 },
  'Telangana':         { name: 'Telangana',         xRatio: 0.435, yRatio: 0.590 },
  'Tripura':           { name: 'Tripura',           xRatio: 0.780, yRatio: 0.425 },
  'Uttar Pradesh':     { name: 'Uttar Pradesh',     xRatio: 0.470, yRatio: 0.330 },
  'Uttarakhand':       { name: 'Uttarakhand',       xRatio: 0.415, yRatio: 0.235 },
  'West Bengal':       { name: 'West Bengal',       xRatio: 0.640, yRatio: 0.420 },
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
