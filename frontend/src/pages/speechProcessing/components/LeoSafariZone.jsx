import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

const SAFARI_ZONE_THEMES = {
  leo_first_sound_hunt: { landmark: "sound-grove", color: "#f4aa21" },
  leo_echo_roar: { landmark: "echo-cave", color: "#e96555" },
  leo_robot_words: { landmark: "robot-ruins", color: "#159bd7" },
  leo_sound_twins: { landmark: "twin-bridge", color: "#6b62d9" },
  leo_story_roar: { landmark: "story-tree", color: "#08785f" },
};

const Rock = ({ position, scale = 1, color = "#66756f" }) => (
  <mesh position={position} scale={scale} castShadow>
    <dodecahedronGeometry args={[0.45, 0]} />
    <meshStandardMaterial color={color} roughness={0.94} flatShading />
  </mesh>
);

function SoundGrove() {
  return (
    <group>
      {[-0.72, 0, 0.72].map((x, index) => (
        <group key={x} position={[x, 0, index === 1 ? -0.22 : 0.12]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.17, 1.1, 7]} />
            <meshStandardMaterial color="#79502f" roughness={1} />
          </mesh>
          <mesh position={[0, 1.35, 0]} castShadow>
            <icosahedronGeometry args={[0.48, 0]} />
            <meshStandardMaterial color={index === 1 ? "#2f9859" : "#51ad63"} flatShading />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.36, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.065, 8, 18]} />
        <meshStandardMaterial color="#ffe280" emissive="#d89000" emissiveIntensity={0.24} />
      </mesh>
      <mesh position={[0, 1.36, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.035, 7, 18]} />
        <meshStandardMaterial color="#fff4bd" />
      </mesh>
    </group>
  );
}

function EchoCave() {
  return (
    <group>
      <Rock position={[-0.72, 0.55, 0]} scale={[1.25, 1.6, 1]} />
      <Rock position={[0.72, 0.55, 0]} scale={[1.25, 1.6, 1]} />
      <Rock position={[0, 1.15, -0.08]} scale={[1.7, 1, 1]} color="#74847d" />
      <mesh position={[0, 0.58, 0.28]}>
        <circleGeometry args={[0.58, 18]} />
        <meshStandardMaterial color="#203d3b" roughness={1} />
      </mesh>
      {[0.82, 1.08].map((radius) => (
        <mesh key={radius} position={[0, 0.72, 0.36]}>
          <torusGeometry args={[radius, 0.035, 7, 20, Math.PI]} />
          <meshStandardMaterial color="#ffc4b6" emissive="#d95543" emissiveIntensity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function RobotRuins() {
  return (
    <group>
      <mesh position={[0, 0.64, 0]} castShadow>
        <boxGeometry args={[1.15, 1.18, 0.82]} />
        <meshStandardMaterial color="#7cc8df" roughness={0.66} metalness={0.12} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <boxGeometry args={[0.86, 0.52, 0.7]} />
        <meshStandardMaterial color="#d8f1f6" roughness={0.55} metalness={0.1} />
      </mesh>
      {[-0.23, 0.23].map((x) => (
        <mesh key={x} position={[x, 1.46, 0.37]}>
          <sphereGeometry args={[0.09, 12, 8]} />
          <meshStandardMaterial color="#144f73" emissive="#159bd7" emissiveIntensity={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 1.88, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.38, 6]} />
        <meshStandardMaterial color="#5c6d70" />
      </mesh>
      <mesh position={[0, 2.08, 0]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#ffd24d" emissive="#eaa900" emissiveIntensity={0.42} />
      </mesh>
      <Rock position={[-0.95, 0.28, -0.1]} scale={0.62} color="#a8b8b8" />
      <Rock position={[1, 0.22, 0.18]} scale={0.52} color="#91a5a5" />
    </group>
  );
}

function TwinBridge() {
  return (
    <group>
      {[-0.72, 0.72].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.66, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.32, 1.3, 8]} />
            <meshStandardMaterial color="#7367bf" roughness={0.75} />
          </mesh>
          <mesh position={[0, 1.42, 0]} castShadow>
            <coneGeometry args={[0.42, 0.52, 6]} />
            <meshStandardMaterial color="#c4bcff" roughness={0.68} />
          </mesh>
        </group>
      ))}
      {[-0.6, -0.3, 0, 0.3, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 0.12, 1.5]} />
          <meshStandardMaterial color="#d8a75a" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.62, 0]}>
        <torusGeometry args={[0.85, 0.045, 7, 24, Math.PI]} />
        <meshStandardMaterial color="#fff0a0" />
      </mesh>
    </group>
  );
}

function StoryTree() {
  return (
    <group>
      <mesh position={[0, 0.88, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.48, 1.8, 8]} />
        <meshStandardMaterial color="#7b4a2b" roughness={1} />
      </mesh>
      <mesh position={[0, 1.95, 0]} scale={[1.35, 1, 1.2]} castShadow>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshStandardMaterial color="#187958" roughness={0.9} flatShading />
      </mesh>
      <group position={[0, 0.58, 0.48]} rotation={[-0.28, 0, 0]}>
        <mesh position={[-0.33, 0, 0]} rotation={[0, 0.24, 0]}>
          <boxGeometry args={[0.62, 0.08, 0.72]} />
          <meshStandardMaterial color="#fff3c4" roughness={0.88} />
        </mesh>
        <mesh position={[0.33, 0, 0]} rotation={[0, -0.24, 0]}>
          <boxGeometry args={[0.62, 0.08, 0.72]} />
          <meshStandardMaterial color="#fff3c4" roughness={0.88} />
        </mesh>
      </group>
      <mesh position={[0.82, 2.36, 0.05]}>
        <octahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial color="#ffe067" emissive="#db9c00" emissiveIntensity={0.34} />
      </mesh>
    </group>
  );
}

const LANDMARKS = {
  "sound-grove": SoundGrove,
  "echo-cave": EchoCave,
  "robot-ruins": RobotRuins,
  "twin-bridge": TwinBridge,
  "story-tree": StoryTree,
};

function LeoSafariZone({ zone, position, active = true, recording = false }) {
  const beaconRef = useRef(null);
  const theme = SAFARI_ZONE_THEMES[zone.activityId] || { landmark: "sound-grove", color: "#64748b" };
  const Landmark = LANDMARKS[theme.landmark];
  const isLocked = zone.state === "locked";
  const isFocused = Boolean(zone.isFocused);
  const markerColor = isLocked ? "#78857e" : zone.state === "replay" ? "#15966e" : theme.color;

  useFrame(({ clock }) => {
    if (!active || recording || !beaconRef.current) return;
    beaconRef.current.rotation.y = clock.elapsedTime * 0.48;
    beaconRef.current.position.y = 2.58 + Math.sin(clock.elapsedTime * 1.15) * 0.07;
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[1.34, 1.48, 0.16, 12]} />
        <meshStandardMaterial color={isLocked ? "#83918a" : "#78b967"} roughness={0.96} />
      </mesh>
      <group position={[0, 0.14, 0]} scale={isLocked ? 0.86 : 1}>
        <Landmark />
      </group>
      <mesh ref={beaconRef} position={[0, 2.58, 0]} castShadow>
        <octahedronGeometry args={[isFocused ? 0.27 : 0.2, 0]} />
        <meshStandardMaterial
          color={markerColor}
          emissive={isFocused ? markerColor : "#000000"}
          emissiveIntensity={isFocused ? 0.6 : 0}
          roughness={0.42}
        />
      </mesh>
      {isFocused && (
        <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.58, 0.065, 8, 30]} />
          <meshStandardMaterial color="#fff2a8" emissive="#d99b00" emissiveIntensity={0.34} />
        </mesh>
      )}
      {isLocked && (
        <group position={[0, 1.68, 0.52]}>
          <mesh>
            <boxGeometry args={[0.52, 0.42, 0.12]} />
            <meshStandardMaterial color="#40534b" roughness={0.72} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <torusGeometry args={[0.18, 0.07, 7, 16, Math.PI]} />
            <meshStandardMaterial color="#40534b" roughness={0.72} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default LeoSafariZone;
