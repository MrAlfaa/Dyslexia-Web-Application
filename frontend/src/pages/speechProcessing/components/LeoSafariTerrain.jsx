import { useMemo } from "react";
import * as THREE from "three";

const PATCHES = [
  [-6.2, -3.2, 2.1, "#2d7b4b"], [-4.7, 4.1, 1.8, "#65a85d"],
  [-1.5, 3.6, 2.3, "#347f4d"], [1.5, -3.7, 2.1, "#63a657"],
  [4.8, 3.2, 2.5, "#327b49"], [7.1, -0.2, 1.7, "#66a95a"],
];

function TubeTrail({ points, radius, color, roughness = 0.9, scale = [1, 1, 1] }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      false,
      "catmullrom",
      0.35
    );
    return new THREE.TubeGeometry(curve, 72, radius, 10, false);
  }, [points, radius]);

  return (
    <mesh geometry={geometry} scale={scale} receiveShadow>
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

function LowPolyTree({ position, scale = 1, tint = "#167047" }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.19, 1.1, 7]} />
        <meshStandardMaterial color="#84502d" roughness={1} />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow>
        <coneGeometry args={[0.68, 1.55, 7]} />
        <meshStandardMaterial color={tint} roughness={0.92} flatShading />
      </mesh>
    </group>
  );
}

function LeoSafariTerrain({ zoneLayout }) {
  const pathPoints = useMemo(
    () => zoneLayout.map(({ position }) => [position[0], 0.08, position[2]]),
    [zoneLayout]
  );
  const riverPoints = useMemo(
    () => [
      [-7.5, 0.045, -2.2], [-4.5, 0.05, -2.9], [-1.5, 0.05, -2.45],
      [1.6, 0.05, -0.85], [4.2, 0.05, 1.25], [7.5, 0.045, 2.1],
    ],
    []
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 14]} />
        <meshStandardMaterial color="#4f9b55" roughness={1} />
      </mesh>

      {PATCHES.map(([x, z, radius, color]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[radius, 9]} />
          <meshStandardMaterial color={color} roughness={1} />
        </mesh>
      ))}

      <TubeTrail points={riverPoints} radius={0.72} color="#47b7c7" roughness={0.34} scale={[1, 0.11, 1]} />
      <TubeTrail points={pathPoints} radius={0.31} color="#e5bd68" />
      <TubeTrail
        points={pathPoints.map(([x, y, z]) => [x, y + 0.025, z])}
        radius={0.19}
        color="#f4d889"
        roughness={0.82}
      />

      {[
        [-7.2, 0, 1.2, 0.9, "#0f6d43"], [-6.5, 0, -3.7, 1.15, "#166f42"],
        [-5.6, 0, 4.4, 0.82, "#2b824c"], [-3.5, 0, 4.6, 1.05, "#11673e"],
        [-1.1, 0, 4.1, 0.88, "#2f8550"], [1.2, 0, 4.5, 1.15, "#0f6b40"],
        [3.8, 0, 4.2, 0.86, "#2d824c"], [6.5, 0, 3.7, 1.12, "#116a40"],
        [7.1, 0, -1.7, 0.9, "#2d824c"], [3.8, 0, -4.5, 1.18, "#0e6840"],
        [0.7, 0, -4.9, 0.95, "#2b824c"], [-2.8, 0, -4.8, 1.05, "#126b41"],
      ].map(([x, y, z, scale, tint]) => (
        <LowPolyTree key={`${x}-${z}`} position={[x, y, z]} scale={scale} tint={tint} />
      ))}
    </group>
  );
}

export default LeoSafariTerrain;
