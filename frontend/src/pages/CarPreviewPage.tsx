import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Preload, OrbitControls } from '@react-three/drei';

// Enhanced 3D Car Component for Preview
function PreviewCar({ autoRotate }: { autoRotate: boolean }) {
  const carGroupRef = useRef<THREE.Group>(null!);
  const wheelsRef = useRef<THREE.Group[]>([]);
  const time = useRef(0);

  useFrame(() => {
    if (!carGroupRef.current) return;

    time.current += 0.016;

    // Auto-rotation
    if (autoRotate) {
      carGroupRef.current.rotation.y += 0.01;
    }

    // Subtle bounce animation
    const bounce = Math.sin(time.current * 2) * 0.05;
    carGroupRef.current.position.y = bounce;

    // Wheel rotation
    wheelsRef.current.forEach((w) => {
      if (w) w.rotation.x += 0.02;
    });
  });

  return (
    <group ref={carGroupRef} scale={2} position={[0, 0, 0]}>
      {/* Chassis / Lower Body */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.6, 0.15, 1.1]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Main Car Body - Sleek Sporty Look */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.58, 0.22, 1.05]} />
        <meshStandardMaterial 
          color="#ff9933" 
          metalness={0.6} 
          roughness={0.1} 
          emissive="#ff9933"
          emissiveIntensity={0.15}
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
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.7} roughness={0} metalness={1} />
      </mesh>

      {/* Windows - Sides */}
      {[[-0.25, 1], [0.25, -1]].map(([x, side], i) => (
        <mesh key={i} position={[x as number, 0.48, -0.05]} rotation={[0, (side as number) * Math.PI / 2, 0]}>
          <planeGeometry args={[0.5, 0.16]} />
          <meshStandardMaterial color="#93c5fd" transparent opacity={0.5} roughness={0} metalness={1} />
        </mesh>
      ))}

      {/* Headlights - Glowing */}
      <mesh position={[-0.2, 0.28, 0.53]}>
        <boxGeometry args={[0.12, 0.08, 0.05]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={3} />
      </mesh>
      <mesh position={[0.2, 0.28, 0.53]}>
        <boxGeometry args={[0.12, 0.08, 0.05]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={3} />
      </mesh>

      {/* Tail Lights - Glowing Red */}
      <mesh position={[-0.2, 0.28, -0.53]}>
        <boxGeometry args={[0.12, 0.08, 0.05]} />
        <meshStandardMaterial color="#f00" emissive="#f00" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.2, 0.28, -0.53]}>
        <boxGeometry args={[0.12, 0.08, 0.05]} />
        <meshStandardMaterial color="#f00" emissive="#f00" emissiveIntensity={2} />
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

export default function CarPreviewPage() {
  const [autoRotate, setAutoRotate] = useState(true);
  const [showSpecs, setShowSpecs] = useState(true);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#05070a' }}>
      <header style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1.5rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
      }}>
        <div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 900,
            margin: 0,
            background: 'linear-gradient(135deg, #ff9933 0%, #ffffff 50%, #10b981 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            🚗 Bharat Quest - 3D Car Model Preview
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8', fontSize: '0.95rem' }}>
            Experience the new enhanced 3D vehicle with realistic lighting and physics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => setAutoRotate(!autoRotate)} style={{ padding: '0.75rem 1.5rem', background: autoRotate ? '#ff9933' : '#1e2436', color: autoRotate ? '#1a0a00' : '#f8fafc', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            {autoRotate ? '⏸️ Pause Rotation' : '▶️ Auto Rotate'}
          </button>
        </div>
      </header>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', padding: '2rem' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(255, 153, 51, 0.05), rgba(79, 91, 213, 0.05))', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
          <Canvas camera={{ position: [0, 1.5, 3.5], fov: 45 }}>
            <ambientLight intensity={1.8} />
            <directionalLight position={[5, 10, 7]} intensity={2} castShadow />
            <Enhanced3DCar headingAngle={0} steeringAngle={autoRotate ? 0.2 : 0} isTravelling={autoRotate} />
            <OrbitControls autoRotate={autoRotate} autoRotateSpeed={4} />
            <Preload all />
          </Canvas>
        </div>
        <div style={{ background: 'rgba(20, 24, 36, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '2rem', color: '#94a3b8' }}>
          <h3 style={{ color: '#ff9933' }}>🎨 Design Features</h3>
          <ul><li>Sleek sporty body</li><li>Glowing LED lights</li><li>Rear spoiler</li></ul>
          <h3 style={{ color: '#10b981' }}>⚙️ Physics</h3>
          <ul><li>Suspension bounce</li><li>Wheel rotation</li><li>Steering dynamics</li></ul>
        </div>
      </div>
    </div>
  );
}
