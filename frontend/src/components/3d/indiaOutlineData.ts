/**
 * Real Geographic Boundary Coordinate Data for India (Longitude, Latitude)
 * Source: Natural Earth / OpenStreetMap India Country Boundary Polygon
 */

export const INDIA_GEO_BOUNDARY: [number, number][] = [
  // Kashmir Northern Tip & Ladakh
  [74.55, 37.05],
  [75.60, 36.80],
  [77.20, 35.50],
  [78.90, 34.20],
  [79.80, 32.50],
  
  // Uttarakhand & Nepal Border
  [80.30, 31.00],
  [81.20, 30.10],
  [83.50, 28.20],
  [85.50, 27.40],
  [88.10, 26.80],
  
  // Sikkim & Bhutan Border
  [88.60, 27.80],
  [89.80, 27.20],
  [91.80, 27.30],
  
  // Arunachal Pradesh & Assam (Northeast India)
  [94.20, 28.50],
  [96.80, 28.20],
  [97.40, 27.80],
  [96.20, 26.50],
  [95.40, 25.20],
  [93.20, 24.20],
  
  // Mizoram / Tripura / Bangladesh Cutout
  [92.40, 23.20],
  [91.50, 24.10],
  [89.20, 25.10],
  [88.80, 22.50],
  
  // West Bengal Coast & Sundarbans
  [89.00, 21.60],
  [87.50, 21.50],
  
  // Odisha Coast
  [86.50, 20.20],
  [85.00, 19.50],
  [84.00, 18.50],
  
  // Andhra Pradesh Coast
  [82.80, 17.50],
  [80.80, 15.80],
  [80.00, 13.80],
  
  // Tamil Nadu Coast & Coromandel
  [79.80, 11.80],
  [79.20, 10.80],
  [79.80, 9.80],
  [78.20, 8.80],
  
  // Kanyakumari (Southernmost tip of mainland India)
  [77.55, 8.08],
  
  // Kerala Coast (Malabar Coast)
  [76.80, 8.70],
  [76.30, 9.90],
  [75.80, 11.20],
  [75.00, 12.50],
  
  // Karnataka & Goa Coast
  [74.50, 14.20],
  [73.80, 15.50],
  [73.30, 16.80],
  
  // Maharashtra & Mumbai Coast
  [72.80, 19.00],
  [72.70, 20.20],
  
  // Gujarat Peninsula (Kathiawar / Gulf of Khambhat)
  [72.50, 21.80],
  [71.50, 20.80],
  [69.80, 22.20],
  [68.90, 22.50],
  [68.80, 23.80],
  
  // Rann of Kutch & Rajasthan Desert Border
  [70.50, 24.50],
  [70.00, 26.20],
  [70.50, 28.00],
  [72.50, 29.80],
  
  // Punjab & Jammu Border
  [74.50, 31.50],
  [74.80, 32.80],
  [74.20, 34.50],
  [74.55, 37.05], // Back to Kashmir Tip
];

export const CENTER_LON = 78.9629;
export const CENTER_LAT = 22.5937;
export const SCALE_FACTOR = 0.58;

/** Projects [longitude, latitude] into 3D scene coordinates [x, y, z] */
export function projectGeoCoords(long: number, lat: number, height = 0.42): [number, number, number] {
  const x = (long - CENTER_LON) * SCALE_FACTOR;
  const z = -(lat - CENTER_LAT) * SCALE_FACTOR;
  return [x, height, z];
}
