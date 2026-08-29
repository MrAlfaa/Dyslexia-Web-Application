import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

function LeoSafariCheckpointShrine({ position, sequence, active = false, animate = true }) {
  const crystalRef = useRef(null);

  useFrame(({ clock }) => {
    if (!animate || !active || !crystalRef.current) return;
    crystalRef.current.rotation.y = clock.elapsedTime * 0.7;
    crystalRef.current.position.y = 1.25 + Math.sin(clock.elapsedTime * 1.4) * 0.08;
  });

  const stone = active ? "#fff0b5" : "#a8b5aa";
  const crystal = active ? "#ffd44d" : "#718079";

  return (
    <group position={position} scale={0.68}>
      <mesh position={[-0.55, 0.62, 0]} castShadow>
        <boxGeometry args={[0.3, 1.25, 0.34]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
      <mesh position={[0.55, 0.62, 0]} castShadow>
        <boxGeometry args={[0.3, 1.25, 0.34]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.28, 0]} castShadow>
        <boxGeometry args={[1.35, 0.28, 0.38]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
      <mesh ref={crystalRef} position={[0, 1.25, 0.18]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <octahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial
          color={crystal}
          emissive={active ? "#e5a900" : "#000000"}
          emissiveIntensity={active ? 0.42 : 0}
          roughness={0.45}
        />
      </mesh>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[0.82, 0.92, 0.22, 8]} />
        <meshStandardMaterial color={active ? "#d69b36" : "#69756f"} roughness={0.9} />
      </mesh>
      {Array.from({ length: sequence }, (_, index) => (
        <mesh key={index} position={[(index - (sequence - 1) / 2) * 0.24, 0.18, 0.52]}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshStandardMaterial color={active ? "#fff7c2" : "#b5c0ba"} />
        </mesh>
      ))}
    </group>
  );
}

export default LeoSafariCheckpointShrine;
