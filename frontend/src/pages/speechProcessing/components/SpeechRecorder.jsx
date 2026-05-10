import { useEffect, useMemo, useRef, useState } from "react";

const getSupportedMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported?.("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported?.("audio/webm")) return "audio/webm";
  return "";
};

function SpeechRecorder({ onRecordingReady, onSupportChange, onRecordingStateChange, resetKey }) {
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);
  const audioUrlRef = useRef("");
  const onRecordingReadyRef = useRef(onRecordingReady);
  const onRecordingStateChangeRef = useRef(onRecordingStateChange);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState("");
  const supported = useMemo(
    () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices) && typeof MediaRecorder !== "undefined",
    []
  );

  useEffect(() => {
    onSupportChange?.(supported);
  }, [onSupportChange, supported]);

  useEffect(() => {
    onRecordingReadyRef.current = onRecordingReady;
  }, [onRecordingReady]);

  useEffect(() => {
    onRecordingStateChangeRef.current = onRecordingStateChange;
  }, [onRecordingStateChange]);

  useEffect(() => {
    audioUrlRef.current = audioUrl;
  }, [audioUrl]);

  useEffect(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    recorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
    clearInterval(timerRef.current);
    setDurationMs(0);
    setError("");
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = "";
    setAudioUrl("");
    setIsRecording(false);
    onRecordingReadyRef.current?.(null);
    onRecordingStateChangeRef.current?.(false);
  }, [resetKey]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      recorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      onRecordingStateChangeRef.current?.(false);
    };
  }, []);

  const startRecording = async () => {
    if (!supported) {
      setError("Recording is not supported in this browser.");
      return;
    }

    setError("");
    setDurationMs(0);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        clearInterval(timerRef.current);
        const audioDurationMs = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        const nextAudioUrl = URL.createObjectURL(blob);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = nextAudioUrl;
        setAudioUrl(nextAudioUrl);
        setIsRecording(false);
        setDurationMs(audioDurationMs);
        onRecordingReadyRef.current?.({
          audioBlob: blob,
          audioUrl: nextAudioUrl,
          audioDurationMs,
        });
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        onRecordingStateChangeRef.current?.(false);
      };

      recorder.start();
      setIsRecording(true);
      onRecordingStateChangeRef.current?.(true);
      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startedAtRef.current);
      }, 250);
    } catch {
      onRecordingStateChangeRef.current?.(false);
      setError("Microphone access is needed for Leo's sound check.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      setIsRecording(false);
      onRecordingStateChangeRef.current?.(false);
    }
  };

  const resetRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    recorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = "";
    setAudioUrl("");
    setDurationMs(0);
    setIsRecording(false);
    onRecordingReadyRef.current?.(null);
    onRecordingStateChangeRef.current?.(false);
  };

  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-emerald-100/60 ring-1 ring-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-700">
          Timer {(durationMs / 1000).toFixed(1)}s
        </p>
        {isRecording && (
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">
            Recording
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!supported}
          className={`rounded-3xl px-5 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60 ${
            isRecording
              ? "bg-rose-500 shadow-rose-100"
              : "bg-gradient-to-r from-emerald-700 to-teal-500 shadow-emerald-100"
          }`}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
        <button
          type="button"
          onClick={resetRecording}
          disabled={!audioUrl || isRecording}
          className="rounded-3xl bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-800 ring-1 ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Record Again
        </button>
      </div>

      {audioUrl && (
        <audio controls src={audioUrl} className="mt-4 w-full rounded-2xl bg-slate-50" />
      )}

      {!supported && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          Recording is not supported in this browser.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}

export default SpeechRecorder;
