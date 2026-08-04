import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Enhanced3DCar } from '../map/CarAnimator';

interface Props {
  curve: THREE.CatmullRomCurve3 | null;
  progress: number; // 0 to 1
  isTravelling: boolean;
}

export default function CarModel({ curve, progress, isTravelling }: Props) {
  const carRef = useRef<THREE.Group>(null!);
  const currentAngleRef = useRef<number>(0);
  const steeringAngleRef = useRef<number>(0);

  useFrame(() => {
    if (!carRef.current || !curve) return;

    const clampedProgress = Math.min(Math.max(progress, 0), 1);
    const point = curve.getPointAt(clampedProgress);
    const tangent = curve.getTangentAt(clampedProgress);

    carRef.current.position.set(point.x, point.y, point.z);

    const dx = tangent.x;
    const dz = tangent.z;
    
    if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
      const targetAngle = Math.atan2(dx, dz);
      let diff = targetAngle - currentAngleRef.current;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      steeringAngleRef.current = diff;
      currentAngleRef.current = targetAngle;
    }
  });

  return (
    <group ref={carRef}>
      <Enhanced3DCar 
        headingAngle={currentAngleRef.current} 
        steeringAngle={steeringAngleRef.current} 
        isTravelling={isTravelling} 
      />
    </group>
  );
}
