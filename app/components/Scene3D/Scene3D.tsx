"use client";

import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Float,
  MeshDistortMaterial,
} from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function DeepSeaOrb({
  position = [0, 0, 0] as [number, number, number],
  color = "#4fc3f7",
  size = 1,
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={1.5}>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[size, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          roughness={0.1}
          metalness={0.8}
          distort={0.3}
          speed={1.5}
          transparent
          opacity={0.85}
        />
      </mesh>
    </Float>
  );
}

function SeaFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <planeGeometry args={[50, 50, 32, 32]} />
      <meshStandardMaterial
        color="#0a1628"
        roughness={0.9}
        metalness={0.1}
        wireframe={false}
      />
    </mesh>
  );
}

function Particles({ count = 80 }) {
  const positions = useRef(
    Float32Array.from({ length: count * 3 }, () => (Math.random() - 0.5) * 20)
  );

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions.current, 3]}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#88ccff"
        size={0.05}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

export default function Scene3D({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={className} style={{ width: "100%", height: "100%", ...style }}>
      <Canvas
        camera={{ position: [0, 2, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]} intensity={0.8} color="#4fc3f7" />
        <pointLight position={[-5, -2, -5]} intensity={0.4} color="#0288d1" />
        <spotLight
          position={[0, 10, 0]}
          intensity={0.3}
          color="#b3e5fc"
          angle={0.5}
          penumbra={1}
        />

        <DeepSeaOrb position={[0, 0, 0]} color="#4fc3f7" size={1.2} />
        <DeepSeaOrb position={[-3, 1, -2]} color="#0288d1" size={0.6} />
        <DeepSeaOrb position={[2.5, -0.5, -1]} color="#00bcd4" size={0.8} />

        <SeaFloor />
        <Particles count={80} />

        <fog attach="fog" args={["#030d1a", 5, 25]} />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2}
        />
        <Environment preset="night" />
      </Canvas>
    </div>
  );
}
