import { Component, Suspense, useMemo } from "react";
import { Billboard, useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import leoImage from "../../../assets/lexiland/leo-lion.png";
import LeoSafariCheckpointShrine from "./LeoSafariCheckpointShrine";
import LeoSafariTerrain from "./LeoSafariTerrain";
import LeoSafariZone from "./LeoSafariZone";

const SAFARI_ZONE_LAYOUT = [
  { activityId: "leo_first_sound_hunt", position: [-5.2, 0.18, 2.5] },
  { activityId: "leo_echo_roar", position: [-2.7, 0.22, 0.25] },
  { activityId: "leo_robot_words", position: [0, 0.25, -1.7] },
  { activityId: "leo_sound_twins", position: [2.75, 0.24, 0.2] },
  { activityId: "leo_story_roar", position: [5.25, 0.28, -2.3] },
];

const OVERVIEW_POSITION = new THREE.Vector3(0, 9.6, 10.8);
const OVERVIEW_TARGET = new THREE.Vector3(0, 0.7, 0);
const CAMERA_POSITION = new THREE.Vector3();
const CAMERA_TARGET = new THREE.Vector3();

const ZONE_POSITIONS = new Map(
  SAFARI_ZONE_LAYOUT.map(({ activityId, position }) => [activityId, position])
);

const CHECKPOINTS = [
  { sequence: 1, threshold: 2, position: [-1.25, 0.1, -0.5] },
  { sequence: 2, threshold: 4, position: [4.05, 0.1, -0.85] },
  { sequence: 3, threshold: 5, position: [6.45, 0.1, -2.75] },
];

class SafariCanvasBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function GuidedCamera({ focusedActivityId, paused }) {
  const focusedPosition = ZONE_POSITIONS.get(focusedActivityId);

  useFrame(({ camera }, delta) => {
    if (paused) return;

    if (focusedPosition) {
      CAMERA_POSITION.set(focusedPosition[0], 5.15, focusedPosition[2] + 5.8);
      CAMERA_TARGET.set(focusedPosition[0], 0.75, focusedPosition[2]);
    } else {
      CAMERA_POSITION.copy(OVERVIEW_POSITION);
      CAMERA_TARGET.copy(OVERVIEW_TARGET);
    }

    const smoothing = 1 - Math.exp(-Math.min(delta, 0.05) * 3.8);
    camera.position.lerp(CAMERA_POSITION, smoothing);
    camera.lookAt(CAMERA_TARGET);
  });

  return null;
}

function LeoBillboard({ position }) {
  const texture = useTexture(leoImage);

  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      <mesh position={[0, 1.25, 0]} renderOrder={3}>
        <planeGeometry args={[1.75, 2.5]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.08} toneMapped={false} />
      </mesh>
    </Billboard>
  );
}

function SafariScene({ zones, focusedActivityId, active, recording }) {
  const completedCount = zones.filter((zone) => zone.state === "replay").length;
  const leoPosition = useMemo(() => {
    const focused = ZONE_POSITIONS.get(focusedActivityId) || SAFARI_ZONE_LAYOUT[0].position;
    return [focused[0] - 1.4, 0.1, focused[2] + 0.95];
  }, [focusedActivityId]);

  return (
    <>
      <color attach="background" args={["#a7d9bc"]} />
      <fog attach="fog" args={["#a7d9bc", 11, 24]} />
      <hemisphereLight intensity={1.05} color="#fff8dc" groundColor="#245b42" />
      <directionalLight
        castShadow
        position={[-5, 10, 7]}
        intensity={1.45}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />

      <GuidedCamera focusedActivityId={focusedActivityId} paused={!active || recording} />
      <LeoSafariTerrain zoneLayout={SAFARI_ZONE_LAYOUT} />

      {SAFARI_ZONE_LAYOUT.map(({ activityId, position }) => {
        const zone = zones.find((item) => item.activityId === activityId);
        if (!zone) return null;

        return (
          <LeoSafariZone
            key={activityId}
            zone={{ ...zone, isFocused: activityId === focusedActivityId }}
            position={position}
            active={active}
            recording={recording}
          />
        );
      })}

      {CHECKPOINTS.map((checkpoint) => (
        <LeoSafariCheckpointShrine
          key={checkpoint.sequence}
          position={checkpoint.position}
          sequence={checkpoint.sequence}
          active={completedCount >= checkpoint.threshold}
          animate={active && !recording}
        />
      ))}

      <Suspense fallback={null}>
        <LeoBillboard position={leoPosition} />
      </Suspense>
    </>
  );
}

function LeoSafari3DMap({
  zones = [],
  focusedActivityId = null,
  recording = false,
  active = true,
  fallback = null,
}) {
  const paused = recording || !active;

  return (
    <SafariCanvasBoundary fallback={fallback}>
      <Canvas
        aria-hidden="true"
        camera={{ position: [0, 9.6, 10.8], fov: 43, near: 0.1, far: 40 }}
        dpr={[1, 1.5]}
        fallback={fallback}
        frameloop={paused ? "demand" : "always"}
        gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
        shadows={!recording}
      >
        <SafariScene
          zones={zones}
          focusedActivityId={focusedActivityId}
          active={active}
          recording={recording}
        />
      </Canvas>
    </SafariCanvasBoundary>
  );
}

export default LeoSafari3DMap;
