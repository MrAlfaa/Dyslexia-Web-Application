import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  cancelSpeechAssignment,
  createSpeechAssignment,
  getAdminStudents,
  getSpeechAssignments,
  getSpeechPromptBank,
} from "../../../../services/admin/api";
import { Field, inputClass, ModalShell, PageHeader } from "./shared";

const AssignmentModal = ({ students, prompts, onClose, onSave }) => {
  const [form, setForm] = useState({
    studentId: "",
    title: "",
    description: "",
    targetSkill: "",
    dueDate: "",
    promptIds: [],
  });

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const togglePrompt = (promptId) => {
    setForm((prev) => ({
      ...prev,
      promptIds: prev.promptIds.includes(promptId)
        ? prev.promptIds.filter((id) => id !== promptId)
        : [...prev.promptIds, promptId],
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <ModalShell
      title="Create Assignment"
      subtitle="Assign sound and reading activities to an individual student."
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Student">
            <select className={inputClass} name="studentId" value={form.studentId} onChange={handleChange} required>
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.fullName} ({student.username || "no username"}) - Grade {student.grade || "—"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Target Skill">
            <input className={inputClass} name="targetSkill" value={form.targetSkill} onChange={handleChange} placeholder="decoding" />
          </Field>
          <Field label="Title">
            <input className={inputClass} name="title" value={form.title} onChange={handleChange} placeholder="Sound practice set" />
          </Field>
          <Field label="Due Date">
            <input className={inputClass} type="date" name="dueDate" value={form.dueDate} onChange={handleChange} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea className={inputClass} rows={3} name="description" value={form.description} onChange={handleChange} />
            </Field>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Select Prompts</p>
          <div className="grid max-h-72 gap-3 overflow-y-auto rounded-3xl bg-slate-50 p-4 sm:grid-cols-2">
            {prompts.filter((prompt) => prompt.isActive).map((prompt) => (
              <label key={prompt._id} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                <input
                  type="checkbox"
                  checked={form.promptIds.includes(prompt.promptId)}
                  onChange={() => togglePrompt(prompt.promptId)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-black text-slate-950">{prompt.promptId} - {prompt.targetText}</span>
                  <span className="text-xs font-bold text-slate-500">{prompt.taskType} | {prompt.skill || "skill"}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <button className="w-full rounded-3xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-teal-700">
          Save Assignment
        </button>
      </form>
    </ModalShell>
  );
};

const SpeechAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const promptMap = useMemo(
    () => prompts.reduce((map, prompt) => ({ ...map, [prompt.promptId]: prompt }), {}),
    [prompts]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignmentsRes, studentsRes, promptsRes] = await Promise.all([
        getSpeechAssignments(),
        getAdminStudents(),
        getSpeechPromptBank(),
      ]);
      setAssignments(assignmentsRes.data?.data || []);
      setStudents(studentsRes.data?.data || []);
      setPrompts(promptsRes.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (payload) => {
    try {
      await createSpeechAssignment(payload);
      toast.success("Assignment created");
      setShowCreate(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create assignment");
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelSpeechAssignment(id);
      toast.success("Assignment cancelled");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel assignment");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Speech Activity Assignments"
        subtitle="Assign sound and reading activities to individual students."
        actions={
          <button onClick={() => setShowCreate(true)} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Create Assignment
          </button>
        }
      />

      <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                {["Student", "Username", "Grade", "Title", "Prompts", "Target Skill", "Status", "Due Date", "Actions"].map((heading) => (
                  <th key={heading} className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-400">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="p-10 text-center font-bold text-slate-500">Loading assignments...</td></tr>
              ) : assignments.map((assignment) => (
                <tr key={assignment._id} className="hover:bg-sky-50/30">
                  <td className="px-5 py-4 font-black text-slate-950">{assignment.studentId?.fullName || "Student"}</td>
                  <td className="px-5 py-4 text-sm font-bold text-teal-700">{assignment.studentId?.username || "—"}</td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-600">{assignment.studentId?.grade || "—"}</td>
                  <td className="px-5 py-4 text-sm font-black text-slate-800">{assignment.title}</td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-600">
                    {(assignment.promptIds || []).map((id) => promptMap[id]?.targetText || id).join(", ")}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-600">{assignment.targetSkill || "—"}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">{assignment.status}</span>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-600">
                    {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => handleCancel(assignment._id)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-black text-rose-600">
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !assignments.length && (
                <tr><td colSpan={9} className="p-14 text-center font-bold text-slate-500">No speech assignments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <AssignmentModal
          students={students}
          prompts={prompts}
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
};

export default SpeechAssignments;
