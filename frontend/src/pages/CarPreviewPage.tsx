import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload, OrbitControls } from '@react-three/drei';
import { Enhanced3DCar } from '../components/map/CarAnimator';

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
