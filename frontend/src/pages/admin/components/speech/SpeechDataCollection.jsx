import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  completeAdminSpeechSession,
  getAdminStudents,
  getSpeechPromptBank,
  labelSpeechAttempt,
  startDataCollectionSession,
  uploadAdminSpeechAttempt,
} from "../../../../services/admin/api";
import { ERROR_TYPES, Field, GRADES, inputClass, PageHeader } from "./shared";

const API_ORIGIN = "http://localhost:5000";

const AdminRecorder = ({ onRecordingComplete }) => {
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    chunksRef.current = [];
    startedAtRef.current = Date.now();

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const nextUrl = URL.createObjectURL(blob);
      setAudioUrl(nextUrl);
      onRecordingComplete({ audioBlob: blob, audioUrl: nextUrl, audioDurationMs: Date.now() - startedAtRef.current });
      stream.getTracks().forEach((track) => track.stop());
    };
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`rounded-2xl px-5 py-3 text-sm font-black text-white ${isRecording ? "bg-rose-600" : "bg-teal-700"}`}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
        {audioUrl && <audio src={audioUrl} controls className="w-full" />}
      </div>
    </div>
  );
};

const emptyLabel = {
  itemCorrect: "true",
  teacherTranscript: "",
  errorType: "none",
  expectedPhoneme: "",
  spokenPhoneme: "",
  teacherConfidence: 5,
  comment: "",
};

const ManualLabelForm = ({ attemptId, onSaved }) => {
  const [form, setForm] = useState(emptyLabel);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await labelSpeechAttempt(attemptId, {
        ...form,
        itemCorrect: form.itemCorrect === "true",
        teacherConfidence: Number(form.teacherConfidence),
      });
      toast.success("Manual label saved");
      onSaved?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save label");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-[2rem] bg-white p-5 ring-1 ring-slate-100 sm:grid-cols-2">
      <Field label="Quick Label">
        <select className={inputClass} name="itemCorrect" value={form.itemCorrect} onChange={handleChange}>
          <option value="true">Correct</option>
          <option value="false">Incorrect / Needs review</option>
        </select>
      </Field>
      <Field label="Error Type">
        <select className={inputClass} name="errorType" value={form.errorType} onChange={handleChange}>
          {ERROR_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </Field>
      <Field label="Teacher Transcript">
        <input className={inputClass} name="teacherTranscript" value={form.teacherTranscript} onChange={handleChange} />
      </Field>
      <Field label="Teacher Confidence">
        <input className={inputClass} type="number" min="1" max="5" name="teacherConfidence" value={form.teacherConfidence} onChange={handleChange} />
      </Field>
      <Field label="Expected Phoneme">
        <input className={inputClass} name="expectedPhoneme" value={form.expectedPhoneme} onChange={handleChange} />
      </Field>
      <Field label="Spoken Phoneme">
        <input className={inputClass} name="spokenPhoneme" value={form.spokenPhoneme} onChange={handleChange} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Comment">
          <textarea className={inputClass} rows={2} name="comment" value={form.comment} onChange={handleChange} />
        </Field>
      </div>
      <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white sm:col-span-2">
        Save Manual Label
      </button>
    </form>
  );
};

const SpeechDataCollection = () => {
  const [students, setStudents] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [grade, setGrade] = useState("3");
  const [promptSet, setPromptSet] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recording, setRecording] = useState(null);
  const [lastUpload, setLastUpload] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedPrompts = useMemo(
    () => prompts.filter((prompt) => promptSet.includes(prompt.promptId)),
    [prompts, promptSet]
  );
  const currentPrompt = selectedPrompts[currentIndex];

  useEffect(() => {
    const loadData = async () => {
      try {
        const [studentsRes, promptsRes] = await Promise.all([
          getAdminStudents(),
          getSpeechPromptBank(),
        ]);
        setStudents(studentsRes.data?.data || []);
        setPrompts((promptsRes.data?.data || []).filter((prompt) => prompt.isActive));
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load data collection setup");
      }
    };
    loadData();
  }, []);

  const togglePrompt = (promptId) => {
    setPromptSet((prev) =>
      prev.includes(promptId) ? prev.filter((id) => id !== promptId) : [...prev, promptId]
    );
  };

  const handleStart = async () => {
    if (!selectedStudentId || !grade || !promptSet.length) {
      toast.error("Select a student, grade, and prompt set first");
      return;
    }
    setLoading(true);
    try {
      const response = await startDataCollectionSession({
        studentId: selectedStudentId,
        grade,
        promptSet,
      });
      setSessionId(response.data?.data?.sessionId);
      toast.success("Data collection session started");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!recording || !currentPrompt || !sessionId) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("audio", recording.audioBlob, `${currentPrompt.promptId}_teacher.webm`);
      formData.append("studentId", selectedStudentId);
      formData.append("sessionId", sessionId);
      formData.append("promptId", currentPrompt.promptId);
      formData.append("taskType", currentPrompt.taskType);
      formData.append("targetText", currentPrompt.targetText);
      formData.append("targetPhonemes", JSON.stringify(currentPrompt.targetPhonemes || []));
      formData.append("attemptNo", 1);
      formData.append("audioDurationMs", recording.audioDurationMs);
      formData.append("playedAudioFirst", false);

      const response = await uploadAdminSpeechAttempt(formData);
      setLastUpload(response.data?.data);
      toast.success("Attempt uploaded");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload attempt");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      await completeAdminSpeechSession(sessionId);
      toast.success("Session completed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to complete session");
    }
  };

  const nextPrompt = () => {
    setRecording(null);
    setLastUpload(null);
    setCurrentIndex((index) => Math.min(index + 1, selectedPrompts.length - 1));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Speech Data Collection"
        subtitle="Run supervised speech sessions, upload real audio, and add manual labels for future ML training."
      />

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="grid gap-5 lg:grid-cols-3">
          <Field label="Student">
            <select className={inputClass} value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} disabled={Boolean(sessionId)}>
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.fullName} ({student.username || "no username"})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Grade">
            <select className={inputClass} value={grade} onChange={(event) => setGrade(event.target.value)} disabled={Boolean(sessionId)}>
              {GRADES.map((item) => <option key={item} value={item}>Grade {item}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <button onClick={handleStart} disabled={loading || Boolean(sessionId)} className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
              Start Data Collection Session
            </button>
          </div>
        </div>

        {!sessionId && (
          <div className="mt-6">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Select Prompt Set</p>
            <div className="grid max-h-72 gap-3 overflow-y-auto rounded-3xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3">
              {prompts.map((prompt) => (
                <label key={prompt._id} className="flex cursor-pointer gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                  <input type="checkbox" checked={promptSet.includes(prompt.promptId)} onChange={() => togglePrompt(prompt.promptId)} />
                  <span>
                    <span className="block text-sm font-black text-slate-950">{prompt.promptId} - {prompt.targetText}</span>
                    <span className="text-xs font-bold text-slate-500">{prompt.taskType}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      {sessionId && currentPrompt && (
        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2.5rem] bg-white p-8 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">
              Prompt {currentIndex + 1} of {selectedPrompts.length}
            </p>
            <h3 className="mt-4 text-6xl font-black text-slate-950">{currentPrompt.targetText}</h3>
            <p className="mt-3 text-sm font-bold text-slate-500">{currentPrompt.taskType} | {currentPrompt.targetPhonemes?.join(", ") || "no phonemes"}</p>
            <div className="mt-6">
              <AdminRecorder onRecordingComplete={setRecording} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={handleUpload} disabled={!recording || loading || Boolean(lastUpload)} className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                Upload Attempt
              </button>
              <button onClick={nextPrompt} disabled={!lastUpload || currentIndex === selectedPrompts.length - 1} className="rounded-2xl bg-sky-100 px-5 py-3 text-sm font-black text-sky-700 disabled:opacity-50">
                Next Prompt
              </button>
              <button onClick={handleComplete} className="rounded-2xl bg-emerald-100 px-5 py-3 text-sm font-black text-emerald-700">
                Complete Session
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {lastUpload ? (
              <>
                <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Uploaded Audio</p>
                  <audio className="mt-3 w-full" src={`${API_ORIGIN}${lastUpload.audioUrl}`} controls />
                  <p className="mt-3 text-sm font-bold text-slate-600">
                    Valid audio: {lastUpload.validAudio ? "Yes" : "No"} | Score: {Math.round((lastUpload.itemResult?.pronunciationScore || 0) * 100)}%
                  </p>
                </div>
                <ManualLabelForm attemptId={lastUpload.attemptId} />
              </>
            ) : (
              <div className="rounded-[2rem] bg-white p-8 text-center font-bold text-slate-500 ring-1 ring-slate-100">
                Upload an attempt to save manual labels.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default SpeechDataCollection;
