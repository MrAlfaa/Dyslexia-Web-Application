import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const MANE_BLOBS = [
  [-0.43, 2.14, -0.02, 0.28],
  [-0.16, 2.3, -0.04, 0.3],
  [0.16, 2.3, -0.04, 0.3],
  [0.43, 2.14, -0.02, 0.28],
  [0.55, 1.86, -0.02, 0.3],
  [0.45, 1.56, -0.03, 0.3],
  [0.16, 1.45, -0.05, 0.3],
  [-0.16, 1.45, -0.05, 0.3],
  [-0.45, 1.56, -0.03, 0.3],
  [-0.55, 1.86, -0.02, 0.3],
];

const COLORS = {
  mane: "#8b3f16",
  maneLight: "#b85b1d",
  fur: "#e89a35",
  furLight: "#ffd08a",
  vest: "#287a4b",
  vestDark: "#175b38",
  shorts: "#245f3c",
  belt: "#6d3b1e",
  nose: "#2e1b17",
  eye: "#17202a",
  eyeWhite: "#fffaf0",
  badge: "#f6c945",
};

function FurMaterial({ color, roughness = 0.82 }) {
  return <meshStandardMaterial color={color} roughness={roughness} />;
}

function ProceduralLeo3D({
  position = [0, 0, 0],
  active = true,
  recording = false,
  quality = "standard",
}) {
  const rootRef = useRef(null);
  const headRef = useRef(null);
  const wavingArmRef = useRef(null);
  const animate = active && !recording && quality === "standard";
  const castShadow = quality === "standard" && !recording;
  const tailCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.3, 0.88, -0.2),
        new THREE.Vector3(0.72, 0.92, -0.16),
        new THREE.Vector3(0.92, 1.2, -0.12),
        new THREE.Vector3(0.78, 1.43, -0.08),
      ]),
    []
  );

  useFrame(({ clock }, delta) => {
    if (!rootRef.current || !headRef.current || !wavingArmRef.current) return;

    const elapsed = clock.getElapsedTime();
    const bobTarget = animate ? Math.sin(elapsed * 2.1) * 0.035 : 0;
    const headTarget = animate ? Math.sin(elapsed * 1.45) * 0.055 : 0;
    const waveTarget = animate ? -0.72 + Math.sin(elapsed * 3.4) * 0.18 : -0.72;

    rootRef.current.position.y = THREE.MathUtils.damp(
      rootRef.current.position.y,
      bobTarget,
      7,
      delta
    );
    headRef.current.rotation.z = THREE.MathUtils.damp(
      headRef.current.rotation.z,
      headTarget,
      7,
      delta
    );
    wavingArmRef.current.rotation.z = THREE.MathUtils.damp(
      wavingArmRef.current.rotation.z,
      waveTarget,
      8,
      delta
    );
  });

  return (
    <group position={position}>
      <group ref={rootRef} scale={0.72}>
        <mesh position={[0.45, 1.08, -0.18]} castShadow={castShadow}>
          <tubeGeometry args={[tailCurve, 10, 0.055, 5, false]} />
          <FurMaterial color={COLORS.fur} />
        </mesh>
        <mesh position={[0.78, 1.43, -0.08]} scale={[0.12, 0.18, 0.12]} castShadow={castShadow}>
          <sphereGeometry args={[1, 7, 6]} />
          <FurMaterial color={COLORS.mane} />
        </mesh>

        <mesh position={[-0.2, 0.37, 0]} castShadow={castShadow}>
          <cylinderGeometry args={[0.13, 0.16, 0.58, 7]} />
          <FurMaterial color={COLORS.fur} />
        </mesh>
        <mesh position={[0.2, 0.37, 0]} castShadow={castShadow}>
          <cylinderGeometry args={[0.13, 0.16, 0.58, 7]} />
          <FurMaterial color={COLORS.fur} />
        </mesh>
        <mesh position={[-0.2, 0.1, 0.1]} scale={[0.2, 0.11, 0.28]} castShadow={castShadow}>
          <sphereGeometry args={[1, 7, 6]} />
          <FurMaterial color={COLORS.mane} />
        </mesh>
        <mesh position={[0.2, 0.1, 0.1]} scale={[0.2, 0.11, 0.28]} castShadow={castShadow}>
          <sphereGeometry args={[1, 7, 6]} />
          <FurMaterial color={COLORS.mane} />
        </mesh>

        <mesh position={[0, 0.78, 0]} castShadow={castShadow}>
          <capsuleGeometry args={[0.34, 0.58, 4, 8]} />
          <FurMaterial color={COLORS.shorts} />
        </mesh>
        <mesh position={[0, 1.06, 0.05]} scale={[0.72, 0.68, 0.72]} castShadow={castShadow}>
          <sphereGeometry args={[0.52, 8, 7]} />
          <FurMaterial color={COLORS.fur} />
        </mesh>
        <mesh position={[-0.22, 1.08, 0.38]} scale={[0.16, 0.46, 0.06]} castShadow={castShadow}>
          <boxGeometry args={[1, 1, 1]} />
          <FurMaterial color={COLORS.vest} roughness={0.7} />
        </mesh>
        <mesh position={[0.22, 1.08, 0.38]} scale={[0.16, 0.46, 0.06]} castShadow={castShadow}>
          <boxGeometry args={[1, 1, 1]} />
          <FurMaterial color={COLORS.vestDark} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.82, 0.4]} scale={[0.46, 0.07, 0.07]} castShadow={castShadow}>
          <boxGeometry args={[1, 1, 1]} />
          <FurMaterial color={COLORS.belt} />
        </mesh>
        <mesh position={[0, 1.18, 0.46]} rotation={[Math.PI / 2, 0, 0]} castShadow={castShadow}>
          <cylinderGeometry args={[0.09, 0.09, 0.06, 7]} />
          <meshStandardMaterial color={COLORS.badge} roughness={0.55} metalness={0.15} />
        </mesh>

        <mesh position={[-0.45, 1.1, 0]} rotation={[0, 0, -0.25]} castShadow={castShadow}>
          <cylinderGeometry args={[0.1, 0.13, 0.62, 7]} />
          <FurMaterial color={COLORS.fur} />
        </mesh>
        <mesh position={[-0.54, 0.8, 0.02]} scale={[0.14, 0.16, 0.13]} castShadow={castShadow}>
          <sphereGeometry args={[1, 7, 6]} />
          <FurMaterial color={COLORS.furLight} />
        </mesh>
        <group ref={wavingArmRef} position={[0.42, 1.3, 0.02]} rotation={[0, 0, -0.72]}>
          <mesh position={[0, 0.27, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.1, 0.13, 0.58, 7]} />
            <FurMaterial color={COLORS.fur} />
          </mesh>
          <mesh position={[0, 0.59, 0.02]} scale={[0.15, 0.17, 0.14]} castShadow={castShadow}>
            <sphereGeometry args={[1, 7, 6]} />
            <FurMaterial color={COLORS.furLight} />
          </mesh>
        </group>

        {MANE_BLOBS.map(([x, y, z, scale], index) => (
          <mesh key={index} position={[x, y, z]} scale={scale} castShadow={castShadow}>
            <sphereGeometry args={[1, 7, 6]} />
            <FurMaterial color={index % 2 ? COLORS.mane : COLORS.maneLight} />
          </mesh>
        ))}
        <mesh position={[-0.34, 2.16, 0.01]} rotation={[0, 0, -0.25]} castShadow={castShadow}>
          <coneGeometry args={[0.18, 0.28, 7]} />
          <FurMaterial color={COLORS.fur} />
        </mesh>
        <mesh position={[0.34, 2.16, 0.01]} rotation={[0, 0, 0.25]} castShadow={castShadow}>
          <coneGeometry args={[0.18, 0.28, 7]} />
          <FurMaterial color={COLORS.fur} />
        </mesh>

        <group ref={headRef}>
          <mesh position={[0, 1.9, 0.12]} scale={[0.52, 0.5, 0.46]} castShadow={castShadow}>
            <sphereGeometry args={[1, 9, 7]} />
            <FurMaterial color={COLORS.fur} />
          </mesh>
          <mesh position={[-0.17, 1.98, 0.5]} scale={[0.1, 0.13, 0.055]}>
            <sphereGeometry args={[1, 7, 6]} />
            <meshStandardMaterial color={COLORS.eyeWhite} roughness={0.5} />
          </mesh>
          <mesh position={[0.17, 1.98, 0.5]} scale={[0.1, 0.13, 0.055]}>
            <sphereGeometry args={[1, 7, 6]} />
            <meshStandardMaterial color={COLORS.eyeWhite} roughness={0.5} />
          </mesh>
          <mesh position={[-0.16, 1.98, 0.55]} scale={[0.045, 0.065, 0.035]}>
            <sphereGeometry args={[1, 7, 6]} />
            <meshStandardMaterial color={COLORS.eye} roughness={0.45} />
          </mesh>
          <mesh position={[0.16, 1.98, 0.55]} scale={[0.045, 0.065, 0.035]}>
            <sphereGeometry args={[1, 7, 6]} />
            <meshStandardMaterial color={COLORS.eye} roughness={0.45} />
          </mesh>
          <mesh position={[-0.12, 1.79, 0.52]} scale={[0.18, 0.14, 0.1]} castShadow={castShadow}>
            <sphereGeometry args={[1, 8, 6]} />
            <FurMaterial color={COLORS.furLight} />
          </mesh>
          <mesh position={[0.12, 1.79, 0.52]} scale={[0.18, 0.14, 0.1]} castShadow={castShadow}>
            <sphereGeometry args={[1, 8, 6]} />
            <FurMaterial color={COLORS.furLight} />
          </mesh>
          <mesh position={[0, 1.87, 0.62]} scale={[0.1, 0.075, 0.07]}>
            <sphereGeometry args={[1, 7, 6]} />
            <meshStandardMaterial color={COLORS.nose} roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.7, 0.58]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1, 0.025, 5, 10, Math.PI]} />
            <meshStandardMaterial color={COLORS.nose} roughness={0.55} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export default ProceduralLeo3D;
