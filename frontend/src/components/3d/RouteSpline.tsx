import { useMemo } from 'react';
import * as THREE from 'three';

interface Props {
  curve?: THREE.CatmullRomCurve3 | null;
}

export default function RouteSpline({ curve: customCurve }: Props) {
  const defaultCurve = useMemo(() => {
    const points = [
      new THREE.Vector3(-0.7, 0.05, -3.2),
      new THREE.Vector3(-0.45, 0.05, -2.75),
      new THREE.Vector3(-0.2, 0.05, -2.1),
      new THREE.Vector3(0.9, 0.05, -1.95),
      new THREE.Vector3(1.7, 0.05, -1.8),
      new THREE.Vector3(2.2, 0.05, -1.6),
      new THREE.Vector3(1.3, 0.05, 0.5),
      new THREE.Vector3(0.1, 0.05, 2.2),
      new THREE.Vector3(-0.9, 0.05, 3.8),
      new THREE.Vector3(-1.8, 0.05, 5.2),
    ];
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);
  }, []);

  const activeCurve = customCurve || defaultCurve;

  if (!activeCurve) return null;

  return (
    <group>
      {/* Slim TravelBoast Route Polyline */}
      <mesh position={[0, 0.03, 0]}>
        <tubeGeometry args={[activeCurve, 256, 0.02, 8, false]} />
        <meshBasicMaterial color="#ff9933" />
      </mesh>

      {/* High-contrast inner core line */}
      <mesh position={[0, 0.035, 0]}>
        <tubeGeometry args={[activeCurve, 256, 0.009, 8, false]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

export { CatmullRomCurve3 } from 'three';
