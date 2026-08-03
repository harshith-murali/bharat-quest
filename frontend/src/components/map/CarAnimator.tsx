import { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CarAnimatorProps {
  svgPathElement: SVGPathElement | null;
  travelProgress: number; // 0 to 1
  isTravelling: boolean;
  totalPathLength: number;
}

// Low-Poly 3D Car Component with Animated Wheels & Suspension
function LowPoly3DCar({
  headingAngle,
  steeringAngle,
  isTravelling,
}: {
  headingAngle: number;
  steeringAngle: number;
  isTravelling: boolean;
}) {
  const carGroupRef = useRef<THREE.Group>(null!);
  const frontWheelsRef = useRef<THREE.Group[]>([]);
  const rearWheelsRef = useRef<THREE.Group[]>([]);

  useFrame((state) => {
    if (!carGroupRef.current) return;

    // 1. Suspension Bounce
    const time = state.clock.getElapsedTime();
    const bounceY = isTravelling ? Math.sin(time * 16) * 0.04 : 0;
    carGroupRef.current.position.y = bounceY;

    // 2. Heading Rotation (Screen space heading to 3D Y-rotation)
    carGroupRef.current.rotation.y = -headingAngle + Math.PI / 2;

    // 3. Chassis Roll into turns
    const rollZ = isTravelling ? Math.max(-0.2, Math.min(0.2, steeringAngle * 0.4)) : 0;
    carGroupRef.current.rotation.z = rollZ;

    // 4. Wheel Rotation & Steering Animation
    if (isTravelling) {
      const spinSpeed = 0.4;
      frontWheelsRef.current.forEach((w) => {
        if (w) {
          w.rotation.x += spinSpeed;
          w.rotation.y = THREE.MathUtils.lerp(w.rotation.y, steeringAngle * 0.5, 0.2);
        }
      });
      rearWheelsRef.current.forEach((w) => {
        if (w) w.rotation.x += spinSpeed;
      });
    }
  });

  return (
    <group ref={carGroupRef} scale={1.45} position={[0, 0.05, 0]}>
      {/* Lower Main Car Body */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.55, 0.24, 0.96]} />
        <meshStandardMaterial color="#ef4444" roughness={0.25} metalness={0.3} />
      </mesh>

      {/* Glossy Upper Cabin */}
      <mesh position={[0, 0.42, -0.06]} castShadow>
        <boxGeometry args={[0.46, 0.22, 0.56]} />
        <meshStandardMaterial color="#1e293b" roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Front Windshield */}
      <mesh position={[0, 0.42, 0.21]} rotation={[-0.3, 0, 0]}>
        <planeGeometry args={[0.42, 0.19]} />
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.8} roughness={0.1} />
      </mesh>

      {/* Rear Windshield */}
      <mesh position={[0, 0.42, -0.33]} rotation={[0.3, Math.PI, 0]}>
        <planeGeometry args={[0.42, 0.17]} />
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.8} roughness={0.1} />
      </mesh>

      {/* Glowing LED Headlights */}
      <mesh position={[-0.18, 0.22, 0.49]}>
        <boxGeometry args={[0.1, 0.08, 0.03]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0.18, 0.22, 0.49]}>
        <boxGeometry args={[0.1, 0.08, 0.03]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
      </mesh>

      {/* Glowing Red Tail Lights */}
      <mesh position={[-0.18, 0.22, -0.49]}>
        <boxGeometry args={[0.1, 0.08, 0.03]} />
        <meshStandardMaterial color="#ff0033" emissive="#ff0033" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0.18, 0.22, -0.49]}>
        <boxGeometry args={[0.1, 0.08, 0.03]} />
        <meshStandardMaterial color="#ff0033" emissive="#ff0033" emissiveIntensity={1} />
      </mesh>

      {/* Front Left & Right Wheels */}
      {[
        [-0.28, 0.11, 0.28], // FL
        [0.28, 0.11, 0.28],  // FR
      ].map(([x, y, z], i) => (
        <group
          key={`front-${i}`}
          position={[x, y, z]}
          ref={(el) => {
            if (el) frontWheelsRef.current[i] = el;
          }}
        >
          {/* Rubber Tire */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.12, 0.08, 14]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>
          {/* Metallic Rim Cap */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[x > 0 ? 0.045 : -0.045, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.01, 10]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      ))}

      {/* Rear Left & Right Wheels */}
      {[
        [-0.28, 0.11, -0.28], // RL
        [0.28, 0.11, -0.28],  // RR
      ].map(([x, y, z], i) => (
        <group
          key={`rear-${i}`}
          position={[x, y, z]}
          ref={(el) => {
            if (el) rearWheelsRef.current[i] = el;
          }}
        >
          {/* Rubber Tire */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.12, 0.08, 14]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>
          {/* Metallic Rim Cap */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[x > 0 ? 0.045 : -0.045, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.01, 10]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function CarAnimator({
  svgPathElement,
  travelProgress,
  isTravelling,
  totalPathLength,
}: CarAnimatorProps) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const currentProgressRef = useRef<number>(0);
  const currentAngleRef = useRef<number>(0);
  const steeringAngleRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    lastTimeRef.current = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      if (svgPathElement && totalPathLength > 0) {
        // Delta-time lerp for progress motion
        const progressLerpFactor = isTravelling
          ? 1 - Math.exp(-5.5 * dt)
          : 1 - Math.exp(-12 * dt);

        currentProgressRef.current += (travelProgress - currentProgressRef.current) * progressLerpFactor;

        const clampedProgress = Math.min(Math.max(currentProgressRef.current, 0), 1);
        const distance = clampedProgress * totalPathLength;

        // 1. Position Sampling along Arc Length
        const point = svgPathElement.getPointAtLength(distance);

        // 2. Tangent & Heading Calculation
        const lookAheadDist = Math.min(distance + 8, totalPathLength);
        const aheadPoint = svgPathElement.getPointAtLength(lookAheadDist);

        const dx = aheadPoint.x - point.x;
        const dy = aheadPoint.y - point.y;

        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
          const targetAngle = Math.atan2(dy, dx);

          // Shortest-path angle lerp
          let diff = targetAngle - currentAngleRef.current;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;

          steeringAngleRef.current = diff;

          const steeringLerpFactor = isTravelling
            ? 1 - Math.exp(-6.5 * dt)
            : 1 - Math.exp(-14 * dt);

          if (Math.abs(diff) > 0.002) {
            currentAngleRef.current += diff * steeringLerpFactor;
          }
        }

        // Direct 60 FPS DOM Transform update
        if (containerRef.current) {
          containerRef.current.style.transform = `translate3d(${point.x - 40}px, ${point.y - 40}px, 0)`;
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [svgPathElement, travelProgress, isTravelling, totalPathLength]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 80,
        height: 80,
        pointerEvents: 'none',
        zIndex: 500,
        willChange: 'transform',
      }}
    >
      <Canvas
        camera={{ position: [0, 3.2, 0], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={1.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.6} castShadow />
        <directionalLight position={[-5, -5, -5]} intensity={0.4} />

        <LowPoly3DCar
          headingAngle={currentAngleRef.current}
          steeringAngle={steeringAngleRef.current}
          isTravelling={isTravelling}
        />
      </Canvas>
    </div>
  );
}
