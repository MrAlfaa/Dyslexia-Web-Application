import { useEffect, useRef, useState } from "react";

const RecorderButton = ({ onRecordingComplete }) => {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      mediaRecorderRef.current?.stream
        ?.getTracks()
        .forEach((track) => track.stop());
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const nextUrl = URL.createObjectURL(blob);
        const audioDurationMs = Date.now() - startedAtRef.current;

        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }

        setAudioUrl(nextUrl);
        onRecordingComplete({
          audioBlob: blob,
          audioUrl: nextUrl,
          audioDurationMs,
        });
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Microphone access is needed for the speech demo.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-sky-100 ring-1 ring-slate-100">
      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex-1 rounded-2xl px-6 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-1 ${
            isRecording
              ? "bg-rose-500 shadow-rose-100"
              : "bg-gradient-to-r from-sky-600 to-teal-500 shadow-sky-100"
          }`}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
        {audioUrl && (
          <audio
            src={audioUrl}
            controls
            className="w-full flex-1 rounded-2xl bg-slate-50"
          />
        )}
      </div>
      {error && (
        <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </p>
      )}
      <p className="mt-4 text-xs font-bold text-slate-500">
        Your recording is sent securely so your guardian can review your progress.
      </p>
    </div>
  );
};

export default RecorderButton;
