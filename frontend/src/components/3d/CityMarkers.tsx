import { Html } from '@react-three/drei';
import * as THREE from 'three';

export interface CityMarkerData {
  id: string;
  name: string;
  position: [number, number, number];
  isDestination: boolean;
  isVisited: boolean;
  image?: string;
}

interface Props {
  cities: CityMarkerData[];
}

export default function CityMarkers({ cities }: Props) {
  return (
    <group>
      {cities.map((city) => (
        <group key={city.id} position={city.position}>
          {/* Marker pin pole */}
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.9, 10]} />
            <meshStandardMaterial
              color={city.isDestination ? '#ff9933' : city.isVisited ? '#10b981' : '#6c7ae0'}
              metalness={0.4}
              roughness={0.2}
            />
          </mesh>

          {/* Marker pin head (Sphere with flag top) */}
          <mesh position={[0, 1.0, 0]}>
            <sphereGeometry args={[0.24, 16, 16]} />
            <meshStandardMaterial
              color={city.isDestination ? '#ff9933' : city.isVisited ? '#10b981' : '#4f5bd5'}
              emissive={city.isDestination ? '#ff7700' : '#000000'}
              emissiveIntensity={city.isDestination ? 0.75 : 0}
              roughness={0.2}
            />
          </mesh>

          {/* Flag top pin */}
          <mesh position={[0.15, 1.05, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.22, 0.14, 0.02]} />
            <meshStandardMaterial color={city.isDestination ? '#ffc107' : city.isVisited ? '#34d399' : '#ffffff'} />
          </mesh>

          {/* Pulsing glow ring under destination pin */}
          {city.isDestination && (
            <group position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <mesh>
                <ringGeometry args={[0.35, 0.65, 32]} />
                <meshBasicMaterial color="#ff9933" side={THREE.DoubleSide} transparent opacity={0.65} />
              </mesh>
            </group>
          )}

          {/* Floating Compact Map Pin HTML Label */}
          <Html position={[0, 0.9, 0]} center distanceFactor={14} zIndexRange={[100, 0]}>
            <div
              style={{
                background: city.isDestination
                  ? 'rgba(255, 153, 51, 0.95)'
                  : city.isVisited
                  ? 'rgba(16, 185, 129, 0.95)'
                  : 'rgba(20, 24, 36, 0.92)',
                backdropFilter: 'blur(8px)',
                color: city.isDestination ? '#1a0a00' : '#ffffff',
                border: city.isDestination
                  ? '2px solid #ffc107'
                  : city.isVisited
                  ? '1.5px solid #10b981'
                  : '1px solid #2e3650',
                borderRadius: '99px',
                padding: '3px 9px 3px 4px',
                fontSize: '11px',
                fontWeight: 900,
                fontFamily: 'var(--font-display)',
                whiteSpace: 'nowrap',
                boxShadow: city.isDestination
                  ? '0 0 16px rgba(255, 153, 51, 0.8), 0 2px 8px rgba(0,0,0,0.5)'
                  : '0 2px 6px rgba(0,0,0,0.4)',
                pointerEvents: 'none',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {city.image ? (
                <img
                  src={city.image}
                  alt={city.name}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.5px solid #ffffff',
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span>{city.isDestination ? '📍' : city.isVisited ? '✅' : '🚩'}</span>
              )}
              <span>{city.name}</span>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
