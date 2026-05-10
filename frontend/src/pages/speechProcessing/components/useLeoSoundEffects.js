import { useCallback, useEffect, useMemo, useRef } from "react";

const SOUND_PATTERNS = {
  start: [523.25, 659.25, 783.99],
  success: [659.25, 783.99, 1046.5],
  reward: [523.25, 659.25, 783.99, 1046.5],
};

function useLeoSoundEffects() {
  const audioContextRef = useRef(null);
  const activeNodesRef = useRef([]);
  const mutedRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  }, []);

  const stopAll = useCallback(() => {
    activeNodesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch {
        // Oscillator may already be stopped.
      }
    });
    activeNodesRef.current = [];
  }, []);

  const setMuted = useCallback(
    (muted) => {
      mutedRef.current = muted;
      if (muted) {
        stopAll();
      }
    },
    [stopAll]
  );

  const play = useCallback(
    (type = "success") => {
      if (mutedRef.current) return;
      const context = getAudioContext();
      const pattern = SOUND_PATTERNS[type] || SOUND_PATTERNS.success;
      if (!context) return;

      stopAll();
      const now = context.currentTime;
      pattern.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, now + index * 0.1);
        gain.gain.linearRampToValueAtTime(0.07, now + index * 0.1 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.18);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + index * 0.1);
        oscillator.stop(now + index * 0.1 + 0.2);
        activeNodesRef.current.push(oscillator);
      });
    },
    [getAudioContext, stopAll]
  );

  useEffect(() => stopAll, [stopAll]);

  return useMemo(
    () => ({
      playStart: () => play("start"),
      playSuccess: () => play("success"),
      playReward: () => play("reward"),
      setMuted,
      stopAll,
    }),
    [play, setMuted, stopAll]
  );
}

export default useLeoSoundEffects;
