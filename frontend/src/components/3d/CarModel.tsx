import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  curve: THREE.CatmullRomCurve3 | null;
  progress: number; // 0 to 1
  isTravelling: boolean;
}

export default function CarModel({ curve, progress, isTravelling }: Props) {
  const carRef = useRef<THREE.Group>(null!);
  const wheelsRef = useRef<THREE.Group[]>([]);

  useFrame((state) => {
    if (!carRef.current || !curve) return;

    // Position & Tangent along CatmullRomCurve3
    const clampedProgress = Math.min(Math.max(progress, 0), 1);
    const point = curve.getPointAt(clampedProgress);
    const tangent = curve.getTangentAt(clampedProgress);

    // Procedural body bounce
    const bounce = isTravelling ? Math.sin(state.clock.elapsedTime * 15) * 0.04 : 0;

    carRef.current.position.set(point.x, point.y + 0.18 + bounce, point.z);

    // Orient car along spline direction
    const targetLook = point.clone().add(tangent);
    carRef.current.lookAt(targetLook);

    // Rotate wheels when travelling
    if (isTravelling) {
      wheelsRef.current.forEach((w) => {
        if (w) w.rotation.x += 0.3;
      });
    }
  });

  return (
    <group ref={carRef}>
      {/* Main Car Body */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.55, 0.25, 0.95]} />
        <meshStandardMaterial color="#ff9933" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Car Cabin Roof */}
      <mesh position={[0, 0.42, -0.05]}>
        <boxGeometry args={[0.45, 0.22, 0.55]} />
        <meshStandardMaterial color="#242840" roughness={0.1} />
      </mesh>

      {/* Windshield Gloss */}
      <mesh position={[0, 0.42, 0.22]}>
        <planeGeometry args={[0.42, 0.18]} />
        <meshStandardMaterial color="#6c7ae0" transparent opacity={0.7} />
      </mesh>

      {/* Headlights */}
      <mesh position={[-0.18, 0.22, 0.48]}>
        <boxGeometry args={[0.1, 0.08, 0.04]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0.18, 0.22, 0.48]}>
        <boxGeometry args={[0.1, 0.08, 0.04]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
      </mesh>

      {/* Tail Lights */}
      <mesh position={[-0.18, 0.22, -0.48]}>
        <boxGeometry args={[0.1, 0.08, 0.04]} />
        <meshStandardMaterial color="#e53e3e" emissive="#e53e3e" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.18, 0.22, -0.48]}>
        <boxGeometry args={[0.1, 0.08, 0.04]} />
        <meshStandardMaterial color="#e53e3e" emissive="#e53e3e" emissiveIntensity={0.8} />
      </mesh>

      {/* 4 Wheels */}
      {[
        [-0.28, 0.1, 0.28],  // Front Left
        [0.28, 0.1, 0.28],   // Front Right
        [-0.28, 0.1, -0.28], // Rear Left
        [0.28, 0.1, -0.28],  // Rear Right
      ].map(([x, y, z], i) => (
        <group
          key={i}
          position={[x, y, z]}
          ref={(el) => {
            if (el) wheelsRef.current[i] = el;
          }}
        >
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.12, 0.08, 12]} />
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
