import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const getSupportedMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported?.("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported?.("audio/webm")) return "audio/webm";
  return "";
};

const isCurrentRecordingContext = (activeContext, context) =>
  Boolean(context && activeContext === context && !context.discarded);

const releaseCurrentRecordingContext = (activeContextRef, context) => {
  if (!activeContextRef || activeContextRef.current !== context) return false;
  activeContextRef.current = null;
  return true;
};

const clearRecordingContextTimer = (context, clearIntervalFn = globalThis.clearInterval) => {
  if (!context || context.timer == null) return;
  clearIntervalFn(context.timer);
  context.timer = null;
};

const requestStopRecordingContext = (
  context,
  clearIntervalFn = globalThis.clearInterval
) => {
  if (!context) return false;
  if (context.stopRequested) {
    clearRecordingContextTimer(context, clearIntervalFn);
    return false;
  }
  context.stopRequested = true;
  clearRecordingContextTimer(context, clearIntervalFn);
  if (context.recorder?.state !== "recording") return false;
  context.recorder.stop();
  return true;
};

const releasePendingRecordingContext = (
  activeContextRef,
  context,
  clearIntervalFn = globalThis.clearInterval
) => {
  if (!isCurrentRecordingContext(activeContextRef?.current, context) || context.recorder) {
    return false;
  }
  context.discarded = true;
  requestStopRecordingContext(context, clearIntervalFn);
  return releaseCurrentRecordingContext(activeContextRef, context);
};

const stopRecordingContextStream = (context) => {
  context?.stream?.getTracks().forEach((track) => track.stop());
};

const createRecordingContext = ({ id, maxDurationMs }) => ({
  id,
  recorder: null,
  stream: null,
  chunks: [],
  startedAt: null,
  timer: null,
  discarded: false,
  stopRequested: false,
  maxDurationMs,
});

function SpeechRecorder({
  onRecordingReady,
  onSupportChange,
  onRecordingStateChange,
  resetKey,
  maxDurationMs = null,
  showDurationLimit = false,
  onAutoSubmit,
  submitting = false,
  autoSubmitDelayMs = 2000,
}) {
  const { t } = useTranslation("sp");
  const activeContextRef = useRef(null);
  const nextContextIdRef = useRef(0);
  const audioUrlRef = useRef("");
  const recordingStateRef = useRef(false);
  const onRecordingReadyRef = useRef(onRecordingReady);
  const onRecordingStateChangeRef = useRef(onRecordingStateChange);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const pendingRecordingRef = useRef(null);
  const autoSubmitTimerRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState("");
  const supported = useMemo(
    () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices) && typeof MediaRecorder !== "undefined",
    []
  );
  const durationLimitSeconds = Number.isFinite(Number(maxDurationMs)) && Number(maxDurationMs) > 0
    ? Math.round(Number(maxDurationMs) / 1000)
    : null;

  const notifyRecordingState = useCallback((nextState) => {
    if (recordingStateRef.current === nextState) return;
    recordingStateRef.current = nextState;
    setIsRecording(nextState);
    onRecordingStateChangeRef.current?.(nextState);
  }, []);

  const clearAutoSubmitRefs = useCallback(() => {
    if (autoSubmitTimerRef.current) {
      window.clearInterval(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
    pendingRecordingRef.current = null;
  }, []);

  const clearAutoSubmit = useCallback(() => {
    clearAutoSubmitRefs();
  }, [clearAutoSubmitRefs]);

  const submitPendingRecording = useCallback(() => {
    const pendingRecording = pendingRecordingRef.current;
    if (!pendingRecording) return;
    clearAutoSubmit();
    onAutoSubmitRef.current?.(pendingRecording);
  }, [clearAutoSubmit]);

  const queueAutoSubmit = useCallback((nextRecording) => {
    clearAutoSubmit();
    if (!onAutoSubmitRef.current || !nextRecording?.audioBlob) return;
    const delayMs = Math.max(500, Number(autoSubmitDelayMs) || 2000);
    const dueAt = Date.now() + delayMs;
    pendingRecordingRef.current = nextRecording;
    autoSubmitTimerRef.current = window.setInterval(() => {
      const remaining = Math.max(0, dueAt - Date.now());
      if (remaining === 0) submitPendingRecording();
    }, 100);
  }, [autoSubmitDelayMs, clearAutoSubmit, submitPendingRecording]);

  const stopRecording = useCallback(() => {
    const context = activeContextRef.current;
    if (releasePendingRecordingContext(activeContextRef, context, window.clearInterval)) {
      notifyRecordingState(false);
      return true;
    }
    return requestStopRecordingContext(context, window.clearInterval);
  }, [notifyRecordingState]);

  const revokeCurrentAudioUrl = useCallback(() => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = "";
    setAudioUrl("");
  }, []);

  const discardCurrentContext = useCallback(() => {
    const context = activeContextRef.current;
    if (!context) return null;
    context.discarded = true;
    releaseCurrentRecordingContext(activeContextRef, context);
    requestStopRecordingContext(context, window.clearInterval);
    stopRecordingContextStream(context);
    return context;
  }, []);

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
    onAutoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  useEffect(() => {
    clearAutoSubmitRefs();
    discardCurrentContext();
    const resetTimer = window.setTimeout(() => {
      if (activeContextRef.current) return;
      notifyRecordingState(false);
      setDurationMs(0);
      setError("");
      revokeCurrentAudioUrl();
      onRecordingReadyRef.current?.(null);
    }, 0);
    return () => window.clearTimeout(resetTimer);
  }, [clearAutoSubmitRefs, discardCurrentContext, notifyRecordingState, resetKey, revokeCurrentAudioUrl]);

  useEffect(() => {
    return () => {
      clearAutoSubmitRefs();
      discardCurrentContext();
      recordingStateRef.current = false;
      onRecordingStateChangeRef.current?.(false);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [clearAutoSubmitRefs, discardCurrentContext]);

  const startRecording = async () => {
    if (!supported) {
      setError(t("recorder_not_supported"));
      return;
    }

    clearAutoSubmit();
    const previousContext = discardCurrentContext();
    if (previousContext) notifyRecordingState(false);
    const context = createRecordingContext({
      id: nextContextIdRef.current + 1,
      maxDurationMs: Number(maxDurationMs),
    });
    nextContextIdRef.current = context.id;
    activeContextRef.current = context;
    setError("");
    setDurationMs(0);
    revokeCurrentAudioUrl();
    onRecordingReadyRef.current?.(null);
    notifyRecordingState(true);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      context.stream = stream;
      const currentAtPermissionResolution = isCurrentRecordingContext(
        activeContextRef.current,
        context
      );
      if (!currentAtPermissionResolution || context.stopRequested) {
        context.discarded = true;
        stopRecordingContextStream(context);
        if (currentAtPermissionResolution && releaseCurrentRecordingContext(activeContextRef, context)) {
          notifyRecordingState(false);
        }
        return;
      }

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      context.recorder = recorder;
      context.startedAt = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) context.chunks.push(event.data);
      };

      recorder.onstop = () => {
        clearRecordingContextTimer(context, window.clearInterval);
        stopRecordingContextStream(context);
        if (!isCurrentRecordingContext(activeContextRef.current, context)) return;

        releaseCurrentRecordingContext(activeContextRef, context);
        const elapsedMs = context.startedAt ? Date.now() - context.startedAt : 0;
        const limitMs = context.maxDurationMs;
        const audioDurationMs = Number.isFinite(limitMs) && limitMs > 0
          ? Math.min(elapsedMs, limitMs)
          : elapsedMs;
        notifyRecordingState(false);

        const blob = new Blob(context.chunks, { type: mimeType || "audio/webm" });
        const nextAudioUrl = URL.createObjectURL(blob);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = nextAudioUrl;
        setAudioUrl(nextAudioUrl);
        setDurationMs(audioDurationMs);
        const nextRecording = {
          audioBlob: blob,
          audioUrl: nextAudioUrl,
          audioDurationMs,
        };
        onRecordingReadyRef.current?.(nextRecording);
        queueAutoSubmit(nextRecording);
      };

      recorder.start();
      context.timer = window.setInterval(() => {
        if (!isCurrentRecordingContext(activeContextRef.current, context)) {
          context.discarded = true;
          requestStopRecordingContext(context, window.clearInterval);
          return;
        }
        const elapsedMs = Date.now() - context.startedAt;
        const limitMs = context.maxDurationMs;
        const hasLimit = Number.isFinite(limitMs) && limitMs > 0;
        setDurationMs(hasLimit ? Math.min(elapsedMs, limitMs) : elapsedMs);
        if (hasLimit && elapsedMs >= limitMs) {
          requestStopRecordingContext(context, window.clearInterval);
        }
      }, 250);
    } catch {
      if (stream && !context.stream) context.stream = stream;
      clearRecordingContextTimer(context, window.clearInterval);
      stopRecordingContextStream(context);
      if (!isCurrentRecordingContext(activeContextRef.current, context)) return;
      const permissionWasCancelled = context.stopRequested && !context.recorder;
      releaseCurrentRecordingContext(activeContextRef, context);
      notifyRecordingState(false);
      if (!permissionWasCancelled) setError(t("recorder_microphone_needed"));
    }
  };

  const resetRecording = () => {
    clearAutoSubmit();
    discardCurrentContext();
    notifyRecordingState(false);
    revokeCurrentAudioUrl();
    setDurationMs(0);
    setError("");
    onRecordingReadyRef.current?.(null);
  };

  return (
    <div className="min-w-0 rounded-[2rem] bg-white p-5 shadow-xl shadow-emerald-100/60 ring-1 ring-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-700">
          {durationLimitSeconds
            ? t("recorder_timer_with_limit", {
                elapsed: (durationMs / 1000).toFixed(1),
                limit: durationLimitSeconds,
              })
            : t("recorder_timer", { elapsed: (durationMs / 1000).toFixed(1) })}
        </p>
        {isRecording && (
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">
            {t("recorder_recording")}
          </span>
        )}
      </div>

      {showDurationLimit && durationLimitSeconds && (
        <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
          {t("recorder_time_guidance", { seconds: durationLimitSeconds })}
        </p>
      )}

      {audioUrl && !isRecording && !onAutoSubmit && (
        <audio className="mt-4 w-full" controls src={audioUrl} />
      )}

      {!audioUrl || isRecording || !onAutoSubmit ? (
        <div className={`mt-4 grid gap-3 ${onAutoSubmit ? "" : "sm:grid-cols-2"}`}>
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!supported || submitting}
            className={`rounded-3xl px-5 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60 ${
              isRecording
                ? "bg-rose-500 shadow-rose-100"
                : "bg-gradient-to-r from-emerald-700 to-teal-500 shadow-emerald-100"
            }`}
          >
            {isRecording ? t("recorder_stop") : t("recorder_start")}
          </button>
          {!onAutoSubmit && (
            <button
              type="button"
              onClick={resetRecording}
              disabled={!audioUrl || isRecording || submitting}
              className="rounded-3xl bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-800 ring-1 ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("recorder_again")}
            </button>
          )}
        </div>
      ) : (
        <p
          className="mt-4 min-h-12 rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm font-black text-amber-900 ring-1 ring-amber-100"
          aria-live="polite"
        >
          {submitting ? t("sending_to_leo") : t("recorder_auto_send")}
        </p>
      )}

      {!supported && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          {t("recorder_not_supported")}
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
