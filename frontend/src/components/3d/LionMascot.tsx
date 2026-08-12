import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MascotState } from './MascotCanvas';

/**
 * Procedural lion mascot built entirely in code (no GLB asset needed).
 *
 * Three poses are expressed as rotation/position offsets on the shared rig:
 *   - idle / talk : neutral stance
 *   - celebrate   : arms thrown up, body leaning back, head tilted up
 *   - sulk        : slumped, head down, arms hanging forward
 *
 * The rig is authored around the origin and its true bounding box is measured
 * at runtime, so the parent can scale it to fit any viewport without clipping.
 */

// ── Pose definitions ────────────────────────────────────────────────────────
interface Pose {
  body: { position: [number, number, number]; rotation: [number, number, number] };
  head: [number, number, number];
  leftArm: [number, number, number];
  rightArm: [number, number, number];
  leftLeg: [number, number, number];
  rightLeg: [number, number, number];
  pupilY: number;
}

const POSES: Record<'normal' | 'celebrate' | 'sulk', Pose> = {
  normal: {
    body: { position: [0, 0, 0], rotation: [0, 0, 0] },
    head: [0, 0, 0],
    leftArm: [0, 0, 0.2],
    rightArm: [0, 0, -0.2],
    leftLeg: [0, 0, 0],
    rightLeg: [0, 0, 0],
    pupilY: 0.12,
  },
  celebrate: {
    body: { position: [0, 0.4, 0], rotation: [-0.1, 0, 0] },
    head: [-0.3, 0, 0],
    leftArm: [0, 0, 2.5],
    rightArm: [0, 0, -2.5],
    leftLeg: [0.2, 0, -0.1],
    rightLeg: [-0.2, 0, 0.1],
    pupilY: 0.15,
  },
  sulk: {
    body: { position: [0, -0.2, 0], rotation: [0.25, 0, 0] },
    head: [0.5, 0, 0],
    leftArm: [0.4, 0, -0.1],
    rightArm: [0.4, 0, 0.1],
    leftLeg: [-0.25, 0, 0],
    rightLeg: [-0.25, 0, 0],
    pupilY: 0.08,
  },
};

function poseFor(state: MascotState): Pose {
  if (state === 'celebrate') return POSES.celebrate;
  if (state === 'sulk') return POSES.sulk;
  return POSES.normal;
}

// Overlapping spheres arranged in a ring to fake a shaggy lion mane. Radii and
// sizes alternate so the silhouette is uneven (fur-like) rather than a
// perfectly smooth donut.
const MANE_LOBES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const alt = i % 2 === 0;
  return {
    angle,
    radius: alt ? 0.66 : 0.58,
    size: alt ? 0.29 : 0.25,
    z: alt ? -0.16 : -0.24,
  };
});

// ── Jersey texture ──────────────────────────────────────────────────────────
function createJerseyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#5b21b6';
  ctx.fillRect(0, 0, 512, 512);

  // The cylinder's UV wraps horizontally, so u=0.5 lands on the front of the
  // torso — the crest and wordmark are drawn there.
  const cx = 256;

  // Crest shield
  ctx.fillStyle = '#ede9fe';
  ctx.beginPath();
  ctx.moveTo(cx, 150);
  ctx.lineTo(cx + 62, 178);
  ctx.lineTo(cx + 62, 246);
  ctx.quadraticCurveTo(cx, 300, cx - 62, 246);
  ctx.lineTo(cx - 62, 178);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#5b21b6';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BQ', cx, 212);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText('BHARAT', cx, 330);
  ctx.fillText('QUEST', cx, 372);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

interface LionMascotProps {
  state: MascotState;
  /** Largest dimension (world units) the mascot is scaled to fit within. */
  fitSize?: number;
  rotation?: [number, number, number];
}

export default function LionMascot({
  state,
  fitSize = 2.4,
  // The face (muzzle, nose, eyes) is authored on +Z, and the camera looks down
  // -Z, so zero yaw already faces the viewer. A slight turn adds a friendly
  // 3/4 view without hiding the face.
  rotation = [0, Math.PI * 0.06, 0],
}: LionMascotProps) {
  const outerRef = useRef<THREE.Group>(null!);
  const rigRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Group>(null!);
  const headRef = useRef<THREE.Group>(null!);
  const leftArmRef = useRef<THREE.Group>(null!);
  const rightArmRef = useRef<THREE.Group>(null!);
  const leftLegRef = useRef<THREE.Group>(null!);
  const rightLegRef = useRef<THREE.Group>(null!);
  const leftPupilRef = useRef<THREE.Mesh>(null!);
  const rightPupilRef = useRef<THREE.Mesh>(null!);

  const jerseyTexture = useMemo(() => createJerseyTexture(), []);

  // Palette tuned to the reference mascot costume: tan/golden fur, shaggy
  // rust-brown mane, cream muzzle, violet-blue eyes, purple kit.
  const materials = useMemo(
    () => ({
      fur: new THREE.MeshStandardMaterial({ color: 0xc98a4b, roughness: 0.85 }),
      mane: new THREE.MeshStandardMaterial({ color: 0x8b4a1f, roughness: 1 }),
      innerEar: new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.9 }),
      jersey: new THREE.MeshStandardMaterial({ map: jerseyTexture, roughness: 0.55 }),
      shorts: new THREE.MeshStandardMaterial({ color: 0x5b21b6, roughness: 0.6 }),
      trim: new THREE.MeshStandardMaterial({ color: 0xc4b5fd, roughness: 0.5 }),
      muzzle: new THREE.MeshStandardMaterial({ color: 0xf5e6d3, roughness: 0.7 }),
      white: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }),
      iris: new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 0.25 }),
      black: new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 0.35 }),
    }),
    [jerseyTexture]
  );

  // Dispose GPU resources on unmount.
  useEffect(() => {
    return () => {
      Object.values(materials).forEach((m) => m.dispose());
      jerseyTexture.dispose();
    };
  }, [materials, jerseyTexture]);

  // Squashed-sphere geometries (scale() mutates, so build them once).
  const muzzleGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(0.3, 32, 32);
    g.scale(1.2, 0.8, 1);
    return g;
  }, []);
  const noseGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(0.1, 16, 16);
    g.scale(1.3, 0.8, 0.8);
    return g;
  }, []);
  useEffect(() => {
    return () => {
      muzzleGeo.dispose();
      noseGeo.dispose();
    };
  }, [muzzleGeo, noseGeo]);

  // Fit the rig to `fitSize` using its real measured bounds.
  //
  // The measurement is taken ONCE with every joint forced to the neutral pose,
  // so the framing stays rock-steady when the mascot switches to celebrate
  // (arms overhead) or sulk (slumped). MARGIN_RATIO reserves headroom for those
  // poses, which extend beyond the neutral silhouette.
  const MARGIN_RATIO = 0.82;
  useEffect(() => {
    const rig = rigRef.current;
    const outer = outerRef.current;
    if (!rig || !outer) return;

    // Snapshot current transforms, force neutral, measure, then restore.
    const joints: Array<[THREE.Object3D | null, [number, number, number]]> = [
      [bodyRef.current, POSES.normal.body.rotation],
      [headRef.current, POSES.normal.head],
      [leftArmRef.current, POSES.normal.leftArm],
      [rightArmRef.current, POSES.normal.rightArm],
      [leftLegRef.current, POSES.normal.leftLeg],
      [rightLegRef.current, POSES.normal.rightLeg],
    ];
    const saved = joints.map(([o]) => (o ? o.rotation.clone() : null));
    const savedBodyPos = bodyRef.current ? bodyRef.current.position.clone() : null;

    joints.forEach(([o, r]) => o && o.rotation.set(r[0], r[1], r[2]));
    if (bodyRef.current) bodyRef.current.position.set(...POSES.normal.body.position);
    rig.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(rig);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    joints.forEach(([o], i) => {
      const s = saved[i];
      if (o && s) o.rotation.copy(s);
    });
    if (bodyRef.current && savedBodyPos) bodyRef.current.position.copy(savedBodyPos);

    const largest = Math.max(size.x, size.y, size.z, 0.0001);
    const s = (fitSize * MARGIN_RATIO) / largest;

    outer.scale.setScalar(s);
    outer.position.set(-center.x * s, -center.y * s, -center.z * s);
  }, [fitSize]);

  // Smoothly interpolate the rig toward the active pose each frame.
  useFrame((_, delta) => {
    const pose = poseFor(state);
    // Frame-rate independent smoothing.
    const k = 1 - Math.exp(-9 * Math.min(delta, 0.05));

    const approach = (obj: THREE.Object3D | null, rot: [number, number, number]) => {
      if (!obj) return;
      obj.rotation.x += (rot[0] - obj.rotation.x) * k;
      obj.rotation.y += (rot[1] - obj.rotation.y) * k;
      obj.rotation.z += (rot[2] - obj.rotation.z) * k;
    };

    if (bodyRef.current) {
      const [px, py, pz] = pose.body.position;
      bodyRef.current.position.x += (px - bodyRef.current.position.x) * k;
      bodyRef.current.position.y += (py - bodyRef.current.position.y) * k;
      bodyRef.current.position.z += (pz - bodyRef.current.position.z) * k;
      approach(bodyRef.current, pose.body.rotation);
    }

    approach(headRef.current, pose.head);
    approach(leftArmRef.current, pose.leftArm);
    approach(rightArmRef.current, pose.rightArm);
    approach(leftLegRef.current, pose.leftLeg);
    approach(rightLegRef.current, pose.rightLeg);

    // Pupils live inside the eye group, so only the small vertical offset is
    // animated (looking up when celebrating, down when sulking).
    const pupilOffset = pose.pupilY - POSES.normal.pupilY;
    [leftPupilRef.current, rightPupilRef.current].forEach((pupil) => {
      if (pupil) pupil.position.y += (pupilOffset - pupil.position.y) * k;
    });
  });

  const arm = (side: 'left' | 'right') => {
    const xMult = side === 'left' ? -1 : 1;
    return (
      <group
        ref={side === 'left' ? leftArmRef : rightArmRef}
        position={[xMult * 0.6, 0.4, 0]}
      >
        {/* Jersey sleeve + trim cuff */}
        <mesh position={[0, -0.15, 0]} material={materials.jersey}>
          <cylinderGeometry args={[0.18, 0.2, 0.35, 16]} />
        </mesh>
        <mesh position={[0, -0.33, 0]} material={materials.trim}>
          <cylinderGeometry args={[0.205, 0.205, 0.06, 16]} />
        </mesh>
        {/* Forearm + paw */}
        <mesh position={[0, -0.45, 0]} material={materials.fur}>
          <cylinderGeometry args={[0.14, 0.12, 0.6, 16]} />
        </mesh>
        <mesh position={[0, -0.75, 0]} material={materials.fur}>
          <sphereGeometry args={[0.17, 16, 16]} />
        </mesh>
      </group>
    );
  };

  const leg = (side: 'left' | 'right') => {
    const xMult = side === 'left' ? -1 : 1;
    return (
      <group
        ref={side === 'left' ? leftLegRef : rightLegRef}
        position={[xMult * 0.25, -0.9, 0]}
      >
        {/* Bare thigh, then purple sock with trim band, then boot */}
        <mesh position={[0, -0.2, 0]} material={materials.fur}>
          <cylinderGeometry args={[0.15, 0.13, 0.4, 16]} />
        </mesh>
        <mesh position={[0, -0.5, 0]} material={materials.shorts}>
          <cylinderGeometry args={[0.145, 0.13, 0.42, 16]} />
        </mesh>
        <mesh position={[0, -0.34, 0]} material={materials.trim}>
          <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
        </mesh>
        <mesh position={[0, -0.68, 0.09]} material={materials.black}>
          <boxGeometry args={[0.26, 0.18, 0.46]} />
        </mesh>
      </group>
    );
  };

  return (
    <group ref={outerRef}>
      <group ref={rigRef} rotation={rotation}>
        <group ref={bodyRef}>
          {/* Torso jersey */}
          <mesh material={materials.jersey} castShadow>
            <cylinderGeometry args={[0.55, 0.5, 1.2, 32]} />
          </mesh>
          {/* Collar trim */}
          <mesh position={[0, 0.58, 0]} material={materials.trim}>
            <cylinderGeometry args={[0.5, 0.5, 0.07, 32]} />
          </mesh>
          {/* Shorts + hem trim */}
          <mesh position={[0, -0.7, 0]} material={materials.shorts}>
            <cylinderGeometry args={[0.51, 0.56, 0.5, 32]} />
          </mesh>
          <mesh position={[0, -0.93, 0]} material={materials.trim}>
            <cylinderGeometry args={[0.565, 0.565, 0.06, 32]} />
          </mesh>

          {/* Head */}
          <group ref={headRef} position={[0, 1.1, 0]}>
            {/* Shaggy mane: a ring of overlapping lobes behind the face, which
                reads far more like the costume's fur than a single smooth
                torus. Kept on -Z so it never occludes the muzzle or eyes. */}
            {MANE_LOBES.map(({ angle, radius, size, z }, i) => (
              <mesh
                key={i}
                position={[Math.cos(angle) * radius, Math.sin(angle) * radius, z]}
                material={materials.mane}
              >
                <sphereGeometry args={[size, 14, 14]} />
              </mesh>
            ))}

            {/* Ears — outer fur cup with a darker inner cup */}
            {[-1, 1].map((side) => (
              <group key={side} position={[side * 0.52, 0.5, -0.02]}>
                <mesh material={materials.fur}>
                  <sphereGeometry args={[0.21, 18, 18]} />
                </mesh>
                <mesh position={[side * 0.02, 0, 0.14]} material={materials.innerEar}>
                  <sphereGeometry args={[0.12, 16, 16]} />
                </mesh>
              </group>
            ))}

            {/* Skull */}
            <mesh material={materials.fur} castShadow>
              <sphereGeometry args={[0.65, 32, 32]} />
            </mesh>

            {/* Brow ridges give the face definition instead of a blank ball */}
            {[-1, 1].map((side) => (
              <mesh
                key={side}
                position={[side * 0.23, 0.27, 0.5]}
                rotation={[0, 0, side * -0.3]}
                material={materials.fur}
              >
                <boxGeometry args={[0.24, 0.07, 0.1]} />
              </mesh>
            ))}

            {/* Muzzle + nose */}
            <mesh position={[0, -0.15, 0.45]} geometry={muzzleGeo} material={materials.muzzle} />
            <mesh position={[0, -0.05, 0.72]} geometry={noseGeo} material={materials.black} />
            {/* Mouth line */}
            <mesh position={[0, -0.26, 0.66]} material={materials.black}>
              <boxGeometry args={[0.22, 0.03, 0.04]} />
            </mesh>

            {/* Eyes: white sclera, violet-blue iris, black pupil */}
            {[-1, 1].map((side) => (
              <group key={side} position={[side * 0.23, 0.13, 0.5]}>
                <mesh material={materials.white}>
                  <sphereGeometry args={[0.13, 18, 18]} />
                </mesh>
                <mesh position={[0, 0, 0.07]} material={materials.iris}>
                  <sphereGeometry args={[0.085, 16, 16]} />
                </mesh>
                <mesh
                  ref={side === -1 ? leftPupilRef : rightPupilRef}
                  position={[0, 0, 0.12]}
                  material={materials.black}
                >
                  <sphereGeometry args={[0.045, 14, 14]} />
                </mesh>
              </group>
            ))}
          </group>

          {arm('left')}
          {arm('right')}
          {leg('left')}
          {leg('right')}
        </group>
      </group>
    </group>
  );
}
