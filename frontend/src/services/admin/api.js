import axios from "axios";

const AdminAPI = axios.create({
  baseURL: "http://localhost:5000/api",
});

AdminAPI.interceptors.request.use((req) => {
  const token = localStorage.getItem("adminToken");

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;
});

export const adminLogin = (data) => AdminAPI.post("/admin/login", data);

export const adminRegister = (data) => AdminAPI.post("/admin/register", data);

export const getAdminStudents = () => AdminAPI.get("/admin/students");

export const createStudentByAdmin = (data) => AdminAPI.post("/admin/students", data);

export const updateAdminStudent = (id, data) =>
  AdminAPI.put(`/admin/students/${id}`, data);

export const deleteAdminStudent = (id) => AdminAPI.delete(`/admin/students/${id}`);

export const getGuardianChildren = () => AdminAPI.get("/guardian/children");

export const createGuardianChild = (data) => AdminAPI.post("/guardian/children", data);

export const updateGuardianChild = (id, data) =>
  AdminAPI.put(`/guardian/children/${id}`, data);

export const deactivateGuardianChild = (id) =>
  AdminAPI.delete(`/guardian/children/${id}/deactivate`);

export const getMySubscription = () => AdminAPI.get("/subscription/me");

export const devChangeSubscriptionPlan = (subscriptionPlan) =>
  AdminAPI.put("/subscription/me/dev-change-plan", { subscriptionPlan });

export const getLexilandProgress = (childId) =>
  AdminAPI.get(`/lexiland/progress/${childId}`);

export const recalculateLexilandProgress = (childId) =>
  AdminAPI.post(`/lexiland/progress/recalculate/${childId}`);

export const getAdminSpeechResults = () =>
  AdminAPI.get("/speech-processing/admin/results");

const toQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });
  const text = query.toString();
  return text ? `?${text}` : "";
};

export const getFilteredAdminSpeechResults = (params = {}) =>
  AdminAPI.get(`/speech-processing/admin/results${toQuery(params)}`);

export const getSpeechSessions = (params = {}) =>
  AdminAPI.get(`/speech-processing/admin/sessions${toQuery(params)}`);

export const getSpeechSessionDetail = (sessionId) =>
  AdminAPI.get(`/speech-processing/admin/sessions/${sessionId}`);

export const getSpeechSystemActivities = () =>
  AdminAPI.get("/speech-processing/system-activities");

export const getGuardianSpeechIdentificationResult = (childId) =>
  AdminAPI.get(`/speech-processing/guardian/identification-result/${childId}`);

export const getGuardianSpeechOverview = (childId) =>
  AdminAPI.get(`/speech-processing/guardian/overview/${childId}`);

export const getGuardianSpeechImprovementProgress = (childId) =>
  AdminAPI.get(`/speech-processing/guardian/improvement-progress/${childId}`);

export const getGuardianSpeechSessionHistory = (childId) =>
  AdminAPI.get(`/speech-processing/guardian/session-history/${childId}`);

export const getGuardianSpeechActivityPlan = (childId) =>
  AdminAPI.get(`/speech-processing/guardian/activity-plan/${childId}`);

export const getGuardianSpeechActivityProgress = (childId) =>
  AdminAPI.get(`/speech-processing/guardian/activity-progress/${childId}`);

export const startDataCollectionSession = (payload) =>
  AdminAPI.post("/speech-processing/admin/data-collection/session/start", payload);

export const completeAdminSpeechSession = (sessionId) =>
  AdminAPI.post(`/speech-processing/admin/session/${sessionId}/complete`);

export const uploadAdminSpeechAttempt = (formData) =>
  AdminAPI.post("/speech-processing/admin/attempt/upload", formData);

export const labelSpeechAttempt = (attemptId, payload) =>
  AdminAPI.post(`/speech-processing/admin/attempts/${attemptId}/label`, payload);

export const getUnlabeledSpeechAttempts = () =>
  AdminAPI.get("/speech-processing/admin/attempts/unlabeled");

export const getAttemptPronunciationModel = (attemptId) =>
  AdminAPI.get(`/speech-processing/admin/attempts/${attemptId}/pronunciation-model`);

export const getSpeechPromptBank = () =>
  AdminAPI.get("/speech-processing/admin/prompts");

export const createSpeechPrompt = (payload) =>
  AdminAPI.post("/speech-processing/admin/prompts", payload);

export const updateSpeechPrompt = (id, payload) =>
  AdminAPI.put(`/speech-processing/admin/prompts/${id}`, payload);

export const deleteSpeechPrompt = (id) =>
  AdminAPI.delete(`/speech-processing/admin/prompts/${id}`);

export const seedSpeechPrompts = () =>
  AdminAPI.post("/speech-processing/admin/prompts/seed");

export const getSpeechAssignments = () =>
  AdminAPI.get("/speech-processing/admin/assignments");

export const createSpeechAssignment = (payload) =>
  AdminAPI.post("/speech-processing/admin/assignments", payload);

export const updateSpeechAssignment = (id, payload) =>
  AdminAPI.put(`/speech-processing/admin/assignments/${id}`, payload);

export const cancelSpeechAssignment = (id) =>
  AdminAPI.put(`/speech-processing/admin/assignments/${id}/cancel`);

export const exportSpeechAttemptsCsv = () =>
  AdminAPI.get("/speech-processing/admin/export/attempts.csv", { responseType: "blob" });

export const exportSpeechSessionsCsv = () =>
  AdminAPI.get("/speech-processing/admin/export/sessions.csv", { responseType: "blob" });

export const exportSpeechManualLabelsCsv = () =>
  AdminAPI.get("/speech-processing/admin/export/manual-labels.csv", { responseType: "blob" });

export default AdminAPI;
