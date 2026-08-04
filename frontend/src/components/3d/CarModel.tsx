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
  const bodyRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!carRef.current || !curve) return;

    // Position & Tangent along CatmullRomCurve3
    const clampedProgress = Math.min(Math.max(progress, 0), 1);
    const point = curve.getPointAt(clampedProgress);
    const tangent = curve.getTangentAt(clampedProgress);

    // Procedural body bounce & sway
    const time = state.clock.elapsedTime;
    const bounce = isTravelling ? Math.sin(time * 16) * 0.04 : Math.sin(time * 2) * 0.01;
    const sway = isTravelling ? Math.sin(time * 8) * 0.02 : 0;

    carRef.current.position.set(point.x, point.y + 0.18 + bounce, point.z);

    // Orient car along spline direction
    const targetLook = point.clone().add(tangent);
    carRef.current.lookAt(targetLook);
    
    // Add subtle tilt based on sway
    carRef.current.rotation.z = sway;

    // Rotate wheels when travelling
    if (isTravelling) {
      const spinSpeed = 0.4;
      wheelsRef.current.forEach((w) => {
        if (w) w.rotation.x += spinSpeed;
      });
    }
  });

  return (
    <group ref={carRef} scale={1.2}>
      {/* Chassis / Lower Body */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.6, 0.15, 1.1]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Main Car Body - Sleek Sporty Look */}
      <mesh ref={bodyRef} position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.58, 0.22, 1.05]} />
        <meshStandardMaterial 
          color="#ff9933" 
          metalness={0.6} 
          roughness={0.1} 
          emissive="#ff9933"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Car Cabin / Roof */}
      <mesh position={[0, 0.48, -0.05]} castShadow>
        <boxGeometry args={[0.48, 0.2, 0.6]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Windshield - Front */}
      <mesh position={[0, 0.48, 0.26]} rotation={[-0.4, 0, 0]}>
        <planeGeometry args={[0.44, 0.22]} />
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.6} roughness={0} metalness={1} />
      </mesh>

      {/* Windows - Sides */}
      {[[-0.25, 1], [0.25, -1]].map(([x, side], i) => (
        <mesh key={i} position={[x as number, 0.48, -0.05]} rotation={[0, (side as number) * Math.PI / 2, 0]}>
          <planeGeometry args={[0.5, 0.16]} />
          <meshStandardMaterial color="#93c5fd" transparent opacity={0.4} roughness={0} metalness={1} />
        </mesh>
      ))}

      {/* Headlights - Glowing */}
      <mesh position={[-0.2, 0.28, 0.53]}>
        <boxGeometry args={[0.12, 0.08, 0.05]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.2, 0.28, 0.53]}>
        <boxGeometry args={[0.12, 0.08, 0.05]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
      </mesh>

      {/* Tail Lights - Glowing Red */}
      <mesh position={[-0.2, 0.28, -0.53]}>
        <boxGeometry args={[0.12, 0.08, 0.05]} />
        <meshStandardMaterial color="#f00" emissive="#f00" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0.2, 0.28, -0.53]}>
        <boxGeometry args={[0.12, 0.08, 0.05]} />
        <meshStandardMaterial color="#f00" emissive="#f00" emissiveIntensity={1.5} />
      </mesh>

      {/* Spoiler */}
      <mesh position={[0, 0.5, -0.45]}>
        <boxGeometry args={[0.55, 0.03, 0.15]} />
        <meshStandardMaterial color="#ff9933" metalness={0.6} roughness={0.1} />
      </mesh>
      <mesh position={[-0.22, 0.42, -0.45]}>
        <boxGeometry args={[0.03, 0.15, 0.05]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.22, 0.42, -0.45]}>
        <boxGeometry args={[0.03, 0.15, 0.05]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* 4 Detailed Wheels */}
      {[
        [-0.32, 0.12, 0.35],  // Front Left
        [0.32, 0.12, 0.35],   // Front Right
        [-0.32, 0.12, -0.35], // Rear Left
        [0.32, 0.12, -0.35],  // Rear Right
      ].map(([x, y, z], i) => (
        <group
          key={i}
          position={[x, y, z]}
          ref={(el) => {
            if (el) wheelsRef.current[i] = el;
          }}
        >
          {/* Tire */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.15, 0.15, 0.12, 16]} />
            <meshStandardMaterial color="#0a0a0a" roughness={1} />
          </mesh>
          {/* Rim */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[x > 0 ? -0.04 : 0.04, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.05, 12]} />
            <meshStandardMaterial color="#888" metalness={1} roughness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
