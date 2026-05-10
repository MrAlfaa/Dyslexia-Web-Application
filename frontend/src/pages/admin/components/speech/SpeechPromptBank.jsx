import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  createSpeechPrompt,
  deleteSpeechPrompt,
  getSpeechPromptBank,
  seedSpeechPrompts,
  updateSpeechPrompt,
} from "../../../../services/admin/api";
import {
  DIFFICULTIES,
  Field,
  GRADES,
  inputClass,
  ModalShell,
  PageHeader,
  TASK_TYPES,
} from "./shared";

const emptyPrompt = {
  promptId: "",
  taskType: "read_aloud_word",
  targetText: "",
  targetPhonemes: "",
  gradeMin: "2",
  gradeMax: "5",
  difficulty: "easy",
  skill: "",
  targetSound: "",
  confusionGroup: "",
  instructionSi: "",
  instructionEn: "",
};

const toForm = (prompt) => ({
  ...emptyPrompt,
  ...prompt,
  targetPhonemes: (prompt?.targetPhonemes || []).join(", "),
});

const toPayload = (form) => ({
  ...form,
  targetPhonemes: form.targetPhonemes
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
});

const PromptModal = ({ prompt, onClose, onSave }) => {
  const [form, setForm] = useState(toForm(prompt));
  const isEditing = Boolean(prompt?._id);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(prompt?._id, toPayload(form));
  };

  return (
    <ModalShell
      title={isEditing ? "Edit Prompt" : "Create Prompt"}
      subtitle="Manage English words, pseudowords, sentences, and sound targets."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Prompt ID">
            <input className={inputClass} name="promptId" value={form.promptId} onChange={handleChange} required />
          </Field>
          <Field label="Task Type">
            <select className={inputClass} name="taskType" value={form.taskType} onChange={handleChange}>
              {TASK_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Target Text">
            <input className={inputClass} name="targetText" value={form.targetText} onChange={handleChange} required />
          </Field>
          <Field label="Target Phonemes">
            <input className={inputClass} name="targetPhonemes" value={form.targetPhonemes} onChange={handleChange} placeholder="K, AE, T" />
          </Field>
          <Field label="Grade Min">
            <select className={inputClass} name="gradeMin" value={form.gradeMin} onChange={handleChange}>
              {GRADES.map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
            </select>
          </Field>
          <Field label="Grade Max">
            <select className={inputClass} name="gradeMax" value={form.gradeMax} onChange={handleChange}>
              {GRADES.map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
            </select>
          </Field>
          <Field label="Difficulty">
            <select className={inputClass} name="difficulty" value={form.difficulty} onChange={handleChange}>
              {DIFFICULTIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Skill">
            <input className={inputClass} name="skill" value={form.skill} onChange={handleChange} />
          </Field>
          <Field label="Target Sound">
            <input className={inputClass} name="targetSound" value={form.targetSound} onChange={handleChange} />
          </Field>
          <Field label="Confusion Group">
            <input className={inputClass} name="confusionGroup" value={form.confusionGroup} onChange={handleChange} />
          </Field>
          <Field label="Sinhala Instruction">
            <input className={inputClass} name="instructionSi" value={form.instructionSi} onChange={handleChange} />
          </Field>
          <Field label="English Instruction">
            <input className={inputClass} name="instructionEn" value={form.instructionEn} onChange={handleChange} />
          </Field>
        </div>
        <button className="w-full rounded-3xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-teal-700">
          Save Prompt
        </button>
      </form>
    </ModalShell>
  );
};

const SpeechPromptBank = () => {
  const [prompts, setPrompts] = useState([]);
  const [modalPrompt, setModalPrompt] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const activeCount = useMemo(
    () => prompts.filter((prompt) => prompt.isActive).length,
    [prompts]
  );

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const response = await getSpeechPromptBank();
      setPrompts(response.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load prompt bank");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  const handleSeed = async () => {
    try {
      const response = await seedSpeechPrompts();
      toast.success(response.data?.message || "Prompt bank seeded");
      loadPrompts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to seed prompts");
    }
  };

  const handleSave = async (id, payload) => {
    try {
      if (id) await updateSpeechPrompt(id, payload);
      else await createSpeechPrompt(payload);
      toast.success("Prompt saved");
      setModalPrompt(null);
      setShowCreate(false);
      loadPrompts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save prompt");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSpeechPrompt(id);
      toast.success("Prompt deactivated");
      loadPrompts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete prompt");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Speech Prompt Bank"
        subtitle="Manage English words, pseudowords, sentences, and sound targets."
        actions={
          <>
            <button onClick={handleSeed} className="rounded-2xl bg-teal-50 px-5 py-3 text-sm font-black text-teal-700 ring-1 ring-teal-100">
              Seed Default Prompts
            </button>
            <button onClick={() => setShowCreate(true)} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
              Create Prompt
            </button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Total Prompts</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{prompts.length}</p>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Active</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{activeCount}</p>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Dataset Status</p>
          <p className="mt-2 text-lg font-black text-teal-700">Ready for collection</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                {["Prompt", "Task", "Text", "Phonemes", "Grades", "Skill", "Sound", "Status", "Actions"].map((heading) => (
                  <th key={heading} className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-400">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="p-10 text-center font-bold text-slate-500">Loading prompt bank...</td></tr>
              ) : prompts.map((prompt) => (
                <tr key={prompt._id} className="hover:bg-sky-50/30">
                  <td className="px-5 py-4 font-black text-slate-950">{prompt.promptId}</td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-600">{prompt.taskType}</td>
                  <td className="px-5 py-4 text-sm font-black text-teal-700">{prompt.targetText}</td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-600">{(prompt.targetPhonemes || []).join(", ") || "—"}</td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-600">{prompt.gradeMin}-{prompt.gradeMax}</td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-600">{prompt.skill || "—"}</td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-600">{prompt.targetSound || "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${prompt.isActive ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                      {prompt.isActive ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => setModalPrompt(prompt)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">Edit</button>
                      <button onClick={() => handleDelete(prompt._id)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-black text-rose-600">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(showCreate || modalPrompt) && (
        <PromptModal
          prompt={modalPrompt}
          onClose={() => {
            setShowCreate(false);
            setModalPrompt(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default SpeechPromptBank;
