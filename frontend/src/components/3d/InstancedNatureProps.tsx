import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function InstancedNatureProps() {
  const treesMeshRef = useRef<THREE.InstancedMesh>(null!);
  const mountainsMeshRef = useRef<THREE.InstancedMesh>(null!);

  // Low-poly Pine Trees positioned directly on the SVG landmass surface
  const treePositions = useMemo(() => {
    return [
      [-0.7, 0.55, -2.8, 0.45], // Delhi North
      [-0.2, 0.55, -1.6, 0.50], // Agra Central
      [1.5, 0.55, -1.2, 0.48],  // Gangetic Plain
      [2.2, 0.55, -0.6, 0.52],  // East Bengal / Bihar
      [0.8, 0.55, 0.5, 0.55],   // Central MP
      [-1.8, 0.55, 1.8, 0.45],  // Western Ghats / Goa
      [-1.2, 0.55, 3.2, 0.50],  // Karnataka
      [-1.6, 0.55, 4.8, 0.45],  // Kerala Coast
      [-0.6, 0.55, 5.0, 0.52],  // Tamil Nadu
      [1.2, 0.55, 1.8, 0.48],   // Odisha Coast
    ] as [number, number, number, number][];
  }, []);

  // Himalayan Snow-Capped Mountain Peaks aligned along the Northern Border of India
  const mountainPositions = useMemo(() => {
    return [
      [-2.2, 1.1, -4.6, 1.1], // Kashmir / Ladakh
      [-1.0, 1.3, -5.0, 1.3], // Himachal Peak
      [0.2, 1.5, -4.8, 1.5],  // Uttarakhand Peak
      [1.4, 1.3, -4.2, 1.3],  // Sikkim / Nepal Ridge
      [2.6, 1.0, -3.8, 1.1],  // Arunachal Border
    ] as [number, number, number, number][];
  }, []);

  useEffect(() => {
    if (treesMeshRef.current) {
      const dummy = new THREE.Object3D();
      treePositions.forEach(([x, y, z, scale], i) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(scale, scale, scale);
        dummy.rotation.y = (i * 1.5) % Math.PI;
        dummy.updateMatrix();
        treesMeshRef.current.setMatrixAt(i, dummy.matrix);
      });
      treesMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (mountainsMeshRef.current) {
      const dummy = new THREE.Object3D();
      mountainPositions.forEach(([x, y, z, scale], i) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(scale, scale * 1.4, scale);
        dummy.updateMatrix();
        mountainsMeshRef.current.setMatrixAt(i, dummy.matrix);
      });
      mountainsMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [treePositions, mountainPositions]);

  return (
    <group>
      {/* Instanced Low-poly Cone Trees */}
      <instancedMesh
        ref={treesMeshRef}
        args={[undefined, undefined, treePositions.length]}
      >
        <coneGeometry args={[0.35, 1.0, 5]} />
        <meshStandardMaterial color="#22c55e" flatShading roughness={0.8} />
      </instancedMesh>

      {/* Instanced Snow-capped Himalayan Mountain Peaks */}
      <instancedMesh
        ref={mountainsMeshRef}
        args={[undefined, undefined, mountainPositions.length]}
      >
        <coneGeometry args={[1.1, 2.2, 5]} />
        <meshStandardMaterial color="#64748b" flatShading roughness={0.9} />
      </instancedMesh>
    </group>
  );
}
