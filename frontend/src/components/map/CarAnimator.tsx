import { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Preload, PerspectiveCamera } from '@react-three/drei';

interface CarAnimatorProps {
  svgPathElement?: SVGPathElement | null;
  travelProgress?: number; // 0 to 1
  isTravelling?: boolean;
  totalPathLength?: number;
  position?: { x: number; y: number };
}

// Final Sporty 3D Car Component
export function Enhanced3DCar({
  headingAngleRef,
  steeringAngleRef,
  isTravellingRef,
}: {
  // Live refs rather than plain numbers: these values are mutated every frame
  // by the RAF loop, and a value captured at render time would never update.
  headingAngleRef: React.MutableRefObject<number>;
  steeringAngleRef: React.MutableRefObject<number>;
  isTravellingRef: React.MutableRefObject<boolean>;
}) {
  const carGroupRef = useRef<THREE.Group>(null!);
  const wheelsRef = useRef<THREE.Group[]>([]);

  useFrame((state) => {
    if (!carGroupRef.current) return;

    const time = state.clock.getElapsedTime();
    const headingAngle = headingAngleRef.current;
    const steeringAngle = steeringAngleRef.current;
    const isTravelling = isTravellingRef.current;

    // 1. Suspension & Movement Dynamics
    const bounceY = isTravelling ? Math.sin(time * 18) * 0.04 : Math.sin(time * 2) * 0.01;
    carGroupRef.current.position.y = bounceY;

    // 2. Heading Rotation (Adjusted for 3D coordinate space)
    carGroupRef.current.rotation.y = -headingAngle + Math.PI / 2;

    // 3. Chassis Roll & Lean
    const rollZ = isTravelling ? Math.max(-0.15, Math.min(0.15, steeringAngle * 0.5)) : 0;
    carGroupRef.current.rotation.z = rollZ;

    // 4. Wheel Animation
    if (isTravelling) {
      const spinSpeed = 0.5;
      wheelsRef.current.forEach((w) => {
        if (w) w.rotation.x += spinSpeed;
      });
    }
  });

  return (
    <group ref={carGroupRef} scale={1.5} position={[0, 0.05, 0]}>
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

export default function CarAnimator({
  svgPathElement,
  travelProgress = 0,
  isTravelling = false,
  totalPathLength = 0,
  position,
}: CarAnimatorProps) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const currentProgressRef = useRef<number>(0);
  const currentAngleRef = useRef<number>(0);
  const steeringAngleRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const animFrameRef = useRef<number | null>(null);

  // Latest props are mirrored into a ref so the RAF loop below can read fresh
  // values WITHOUT being listed as effect dependencies.
  //
  // Previously these were dependencies of the animation effect. Because
  // travelProgress updates ~60x/sec during a drive, the effect tore down and
  // recreated the RAF loop every frame, resetting lastTimeRef each time. That
  // made dt ~= 0, so the exponential lerp factor (1 - e^(-k*dt)) was ~0 and the
  // car's progress never advanced — it sat frozen at the start of the path.
  const propsRef = useRef({ svgPathElement, travelProgress, isTravelling, totalPathLength, position });
  propsRef.current = { svgPathElement, travelProgress, isTravelling, totalPathLength, position };

  // Mirrored for the 3D car's own useFrame loop (wheel spin, body roll).
  const isTravellingRef = useRef<boolean>(isTravelling ?? false);
  isTravellingRef.current = isTravelling ?? false;

  // Reset interpolation when a brand new path leg begins.
  useEffect(() => {
    if (svgPathElement) {
      currentProgressRef.current = 0;
    }
  }, [svgPathElement]);

  // One stable RAF loop for the lifetime of the component.
  useEffect(() => {
    lastTimeRef.current = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      const {
        svgPathElement: pathEl,
        travelProgress: target,
        isTravelling: driving,
        totalPathLength: totalLen,
        position: pos,
      } = propsRef.current;

      if (pos && containerRef.current) {
        containerRef.current.style.transform = `translate3d(${pos.x - 40}px, ${pos.y - 40}px, 0)`;
      } else if (pathEl && (totalLen ?? 0) > 0) {
        const progressLerpFactor = driving ? 1 - Math.exp(-5.5 * dt) : 1 - Math.exp(-12 * dt);
        currentProgressRef.current += ((target ?? 0) - currentProgressRef.current) * progressLerpFactor;

        // Snap once we're close enough, so the car actually reaches the
        // destination instead of asymptotically crawling toward it.
        if (Math.abs((target ?? 0) - currentProgressRef.current) < 0.001) {
          currentProgressRef.current = target ?? 0;
        }

        const clampedProgress = Math.min(Math.max(currentProgressRef.current, 0), 1);
        const distance = clampedProgress * (totalLen ?? 0);
        const point = pathEl.getPointAtLength(distance);

        const lookAheadDist = Math.min(distance + 8, totalLen ?? 0);
        const aheadPoint = pathEl.getPointAtLength(lookAheadDist);

        const dx = aheadPoint.x - point.x;
        const dy = aheadPoint.y - point.y;

        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
          const targetAngle = Math.atan2(dy, dx);
          let diff = targetAngle - currentAngleRef.current;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;

          steeringAngleRef.current = diff;
          const steeringLerpFactor = driving ? 1 - Math.exp(-6.5 * dt) : 1 - Math.exp(-14 * dt);
          if (Math.abs(diff) > 0.002) {
            currentAngleRef.current += diff * steeringLerpFactor;
          }
        }

        if (containerRef.current) {
          containerRef.current.style.transform = `translate3d(${point.x - 40}px, ${point.y - 40}px, 0)`;
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, []);

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
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Default R3F camera only sets position, not orientation — without an
            explicit top-down rotation the car (at the origin, below the
            camera) never enters view. */}
        <PerspectiveCamera makeDefault position={[0, 3.5, 0]} rotation={[-Math.PI / 2, 0, 0]} fov={40} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />
        <Enhanced3DCar
          headingAngleRef={currentAngleRef}
          steeringAngleRef={steeringAngleRef}
          isTravellingRef={isTravellingRef}
        />
        <Preload all />
      </Canvas>
    </div>
  );
}
