import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  createStudentByAdmin,
  deleteAdminStudent,
  getAssignableAdminGuardians,
  getAdminStudents,
  getMySubscription,
  repairAdminStudentOwnership,
  updateAdminStudent,
} from "../../../services/admin/api";
import GuardianPageHeader from "../../../components/guardian/ui/GuardianPageHeader";
import GuardianCard from "../../../components/guardian/ui/GuardianCard";
import GuardianStatCard from "../../../components/guardian/ui/GuardianStatCard";
import GuardianStatusBadge from "../../../components/guardian/ui/GuardianStatusBadge";
import GuardianButton from "../../../components/guardian/ui/GuardianButton";
import GuardianModal from "../../../components/guardian/ui/GuardianModal";
import { getCanRepairChildOwnership } from "./studentOwnershipCapability.utils";

const GRADES = ["2", "3", "4", "5"];
const GENDERS = [
  { value: "", label: "Select gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  fullName: "",
  username: "",
  age: "",
  grade: "3",
  gender: "",
  school: "",
  notes: "",
  accountStatus: "active",
};

const inputClass =
  "guardian-focus w-full rounded-2xl border border-[#E5EDE7] bg-white px-4 py-3 text-sm font-medium text-[#101828] outline-none transition focus:border-[#157A5A]";

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B6475]">
      {label}
    </span>
    {children}
  </label>
);

function ChildFormModal({ mode, student, onClose, onSubmit }) {
  const [formData, setFormData] = useState(() => ({
    ...emptyForm,
    ...(student || {}),
    accountStatus: student?.accountStatus || "active",
  }));
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    await onSubmit(formData);
    setSaving(false);
  };

  return (
    <GuardianModal
      title={mode === "create" ? "Add Child" : "Edit Child"}
      subtitle="No email or password is required. Children use their username to enter LexiLand."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Child full name">
          <input className={inputClass} name="fullName" value={formData.fullName} onChange={handleChange} required />
        </Field>
        <Field label="Username">
          <input className={inputClass} name="username" value={formData.username} onChange={handleChange} required />
        </Field>
        <Field label="Age">
          <input className={inputClass} name="age" type="number" min="5" max="15" value={formData.age} onChange={handleChange} required />
        </Field>
        <Field label="Grade">
          <select className={inputClass} name="grade" value={formData.grade} onChange={handleChange}>
            {GRADES.map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
          </select>
        </Field>
        <Field label="Gender">
          <select className={inputClass} name="gender" value={formData.gender || ""} onChange={handleChange}>
            {GENDERS.map((gender) => <option key={gender.value} value={gender.value}>{gender.label}</option>)}
          </select>
        </Field>
        <Field label="School">
          <input className={inputClass} name="school" value={formData.school || ""} onChange={handleChange} />
        </Field>
        <Field label="Notes">
          <input className={inputClass} name="notes" value={formData.notes || ""} onChange={handleChange} />
        </Field>
        <Field label="Account status">
          <select className={inputClass} name="accountStatus" value={formData.accountStatus} onChange={handleChange}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <GuardianButton type="submit" className="w-full py-3" disabled={saving}>
            {saving ? "Saving..." : mode === "create" ? "Create Child" : "Save Changes"}
          </GuardianButton>
        </div>
      </form>
    </GuardianModal>
  );
}

function OwnershipRepairModal({ student, onClose, onRepaired }) {
  const [guardians, setGuardians] = useState([]);
  const [selectedGuardianId, setSelectedGuardianId] = useState("");
  const [loadingGuardians, setLoadingGuardians] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const guardianRequestSequence = useRef(0);

  const loadGuardians = useCallback(async () => {
    const requestId = guardianRequestSequence.current + 1;
    guardianRequestSequence.current = requestId;
    setLoadingGuardians(true);
    setLoadError("");
    try {
      const response = await getAssignableAdminGuardians();
      if (guardianRequestSequence.current !== requestId) return;
      const available = (response.data?.data || []).filter(
        (guardian) => guardian.subscriptionStatus !== "inactive",
      );
      setGuardians(available);
    } catch (error) {
      if (guardianRequestSequence.current !== requestId) return;
      setLoadError(error.response?.data?.message || "Could not load guardian accounts.");
    } finally {
      if (guardianRequestSequence.current === requestId) setLoadingGuardians(false);
    }
  }, []);

  useEffect(() => {
    loadGuardians();

    return () => {
      guardianRequestSequence.current += 1;
    };
  }, [loadGuardians]);

  const selectedGuardian = guardians.find(
    (guardian) => guardian.id === selectedGuardianId,
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedGuardian) return;

    setSaving(true);
    try {
      const response = await repairAdminStudentOwnership(student._id, selectedGuardian.id);
      toast.success(response.data?.message || "Child ownership updated");
      await onRepaired();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update child ownership");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GuardianModal
      title="Repair Child Ownership"
      subtitle="Super-admin action. The selected guardian becomes the owner in both ownership records."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border border-[#E5EDE7] bg-[#F8FAF9] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B6475]">
            Child account
          </p>
          <p className="mt-1 text-base font-bold text-[#101828]">{student.fullName}</p>
          <p className="mt-1 text-sm font-medium text-[#5B6475]">
            @{student.username || "no-username"} · Grade {student.grade || "-"}
          </p>
        </div>

        <Field label="Destination guardian">
          <select
            className={inputClass}
            value={selectedGuardianId}
            onChange={(event) => setSelectedGuardianId(event.target.value)}
            disabled={loadingGuardians || saving}
            required
          >
            <option value="">
              {loadingGuardians ? "Loading guardian accounts..." : "Select a guardian"}
            </option>
            {guardians.map((guardian) => (
              <option key={guardian.id} value={guardian.id}>
                {guardian.fullName} · {guardian.email} · {guardian.role}
              </option>
            ))}
          </select>
        </Field>

        {loadError && (
          <div role="alert" className="rounded-2xl border border-[#F4C7C7] bg-[#FFF4F3] p-4 text-sm font-semibold text-[#B42318]">
            <p>{loadError}</p>
            <GuardianButton
              variant="secondary"
              className="mt-3"
              onClick={loadGuardians}
              disabled={loadingGuardians}
            >
              {loadingGuardians ? "Retrying..." : "Retry guardian list"}
            </GuardianButton>
          </div>
        )}

        {!loadingGuardians && !loadError && guardians.length === 0 && (
          <p role="status" className="rounded-2xl border border-[#EAD9A8] bg-[#FFF9E8] p-4 text-sm font-semibold text-[#8A5A00]">
            No active or trial guardian accounts are available.
          </p>
        )}

        {selectedGuardian && (
          <div className="rounded-2xl border border-[#D8ECE3] bg-[#F3FBF7] p-4 text-sm text-[#23483C]">
            <p className="font-bold">Confirm ownership destination</p>
            <p className="mt-1 leading-6">
              Assign <strong>{student.fullName}</strong> to <strong>{selectedGuardian.fullName}</strong>
              {" "}({selectedGuardian.email}). Existing child activity and progress stay unchanged.
            </p>
            <p className="mt-2 text-xs font-semibold text-[#5B6475]">
              The server will reject inactive accounts or destinations that have reached their child limit.
            </p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <GuardianButton variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </GuardianButton>
          <GuardianButton type="submit" disabled={!selectedGuardian || saving || loadingGuardians}>
            {saving ? "Updating owner..." : "Confirm owner repair"}
          </GuardianButton>
        </div>
      </form>
    </GuardianModal>
  );
}

function StudentProfiles() {
  const [students, setStudents] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [ownershipRepair, setOwnershipRepair] = useState(null);
  const [createdUsername, setCreatedUsername] = useState("");
  const [canRepairChildOwnership, setCanRepairChildOwnership] = useState(false);

  const load = async () => {
    try {
      const [studentsRes, subscriptionRes] = await Promise.all([
        getAdminStudents(),
        getMySubscription().catch(() => ({ data: { data: null } })),
      ]);
      const canRepair = getCanRepairChildOwnership(studentsRes.data);
      setStudents(studentsRes.data?.data || []);
      setSubscription(subscriptionRes.data?.data || null);
      setCanRepairChildOwnership(canRepair);
      if (!canRepair) setOwnershipRepair(null);
    } catch (error) {
      setCanRepairChildOwnership(false);
      setOwnershipRepair(null);
      toast.error(error.response?.data?.message || "Failed to load children");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      [student.fullName, student.username, student.school, student.grade]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [search, students]);

  const activeCount = students.filter((student) => (student.accountStatus || "active") === "active").length;
  const childLimit = subscription?.childLimit || "-";

  const handleCreate = async (formData) => {
    try {
      const response = await createStudentByAdmin(formData);
      const child = response.data?.data;
      setCreatedUsername(child?.username || formData.username);
      toast.success("Child account created");
      setModal(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create child");
    }
  };

  const handleUpdate = async (id, formData) => {
    try {
      await updateAdminStudent(id, formData);
      toast.success("Child profile updated");
      setModal(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update child");
    }
  };

  const handleDeactivate = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteAdminStudent(deleteConfirm._id);
      toast.success("Child deactivated");
      setDeleteConfirm(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not deactivate child");
    }
  };

  if (loading) {
    return <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#EAF7F0] border-t-[#157A5A]" />;
  }

  return (
    <div className="space-y-5">
      <GuardianPageHeader
        title="My Children"
        subtitle="Manage child profiles and LexiLand access."
        actions={<GuardianButton onClick={() => setModal({ mode: "create" })}>Create Child</GuardianButton>}
      />

      {createdUsername && (
        <GuardianCard className="flex flex-col gap-3 border-[#D8ECE3] bg-[#F3FBF7] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#0F5F48]">
            Give this username to the child: <span className="font-extrabold">{createdUsername}</span>
          </p>
          <GuardianButton variant="secondary" onClick={() => navigator.clipboard?.writeText(createdUsername)}>
            Copy child username
          </GuardianButton>
        </GuardianCard>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <GuardianStatCard label="Children Used" value={students.length} helper="Total child profiles" tone="emerald" />
        <GuardianStatCard label="Plan Limit" value={childLimit} helper={subscription?.subscriptionLabel || "Current plan"} tone="amber" />
        <GuardianStatCard label="Active Children" value={activeCount} helper="Can enter LexiLand" tone="sky" />
      </div>

      <GuardianCard className="p-4">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by child name, username, school, or grade..."
          className="guardian-focus w-full rounded-2xl border border-[#E5EDE7] bg-white px-4 py-3 text-sm font-medium text-[#101828] outline-none focus:border-[#157A5A]"
        />
      </GuardianCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((student) => {
          const speechStatus = student.lexilandProgress?.speech?.identificationStatus || "not_started";
          return (
            <GuardianCard key={student._id} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-[#101828]">{student.fullName}</h3>
                  <p className="mt-1 text-sm font-medium text-[#5B6475]">@{student.username || "no-username"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#F3FAFF] px-3 py-1 text-xs font-semibold text-[#27658F] ring-1 ring-[#D8EAF7]">
                      Grade {student.grade || "-"}
                    </span>
                    <GuardianStatusBadge value={student.accountStatus || "active"} />
                    <GuardianStatusBadge value={speechStatus} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <GuardianButton variant="secondary" onClick={() => navigator.clipboard?.writeText(student.username || "")}>
                    Copy
                  </GuardianButton>
                  <GuardianButton variant="secondary" onClick={() => setModal({ mode: "edit", student })}>
                    Edit
                  </GuardianButton>
                  {canRepairChildOwnership && (
                    <GuardianButton variant="secondary" onClick={() => setOwnershipRepair(student)}>
                      Repair owner
                    </GuardianButton>
                  )}
                  <GuardianButton variant="danger" onClick={() => setDeleteConfirm(student)}>
                    Deactivate
                  </GuardianButton>
                </div>
              </div>
              <div className="mt-4 grid gap-3 border-t border-[#E5EDE7] pt-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="font-medium text-[#5B6475]">School</p>
                  <p className="mt-1 font-semibold text-[#101828]">{student.school || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-[#5B6475]">Age</p>
                  <p className="mt-1 font-semibold text-[#101828]">{student.age || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-[#5B6475]">Notes</p>
                  <p className="mt-1 truncate font-semibold text-[#101828]">{student.notes || "-"}</p>
                </div>
              </div>
            </GuardianCard>
          );
        })}
        {!filtered.length && (
          <div className="lg:col-span-2">
            <GuardianCard>
              <p className="text-center text-sm font-semibold text-[#5B6475]">No matching child records found.</p>
            </GuardianCard>
          </div>
        )}
      </div>

      {modal?.mode === "create" && (
        <ChildFormModal mode="create" onClose={() => setModal(null)} onSubmit={handleCreate} />
      )}
      {modal?.mode === "edit" && (
        <ChildFormModal
          mode="edit"
          student={modal.student}
          onClose={() => setModal(null)}
          onSubmit={(formData) => handleUpdate(modal.student._id, formData)}
        />
      )}
      {canRepairChildOwnership && ownershipRepair && (
        <OwnershipRepairModal
          student={ownershipRepair}
          onClose={() => setOwnershipRepair(null)}
          onRepaired={load}
        />
      )}
      {deleteConfirm && (
        <GuardianModal title="Deactivate Child" subtitle={deleteConfirm.fullName} onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm font-medium leading-6 text-[#5B6475]">
            This child will no longer be able to log in.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <GuardianButton variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</GuardianButton>
            <GuardianButton variant="danger" onClick={handleDeactivate}>Deactivate Child</GuardianButton>
          </div>
        </GuardianModal>
      )}
    </div>
  );
}

export default StudentProfiles;
