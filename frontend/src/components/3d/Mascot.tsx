import { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Group } from 'three';
import { MascotState } from './MascotCanvas';

// Configurable model file path - change this string to swap models in the future
export const MASCOT_GLB_PATH = '/models/mascot-placeholder.glb';

interface MascotProps {
  state: MascotState;
  scale?: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export default function Mascot({
  state,
  scale = [1.8, 1.8, 1.8],
  position = [0, -0.75, 0],
  rotation = [0, Math.PI * 0.15, 0],
}: MascotProps) {
  const group = useRef<Group>(null!);
  const { scene, animations } = useGLTF(MASCOT_GLB_PATH);
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    console.log('Available animation clips:', names);
  }, [names]);

  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return;
    
    // Attempt exact match for state, or fallback to first clip available
    const targetClipName = actions[state] ? state : names[0];
    const action = targetClipName ? actions[targetClipName] : undefined;

    if (!action) return;

    action.reset().fadeIn(0.3).play();
    return () => {
      action.fadeOut(0.3);
    };
  }, [state, actions, names]);

  return (
    <group ref={group} dispose={null}>
      <primitive
        object={scene}
        scale={scale}
        position={position}
        rotation={rotation}
      />
    </group>
  );
}

useGLTF.preload(MASCOT_GLB_PATH);
