import axios from "axios";
import API from "../api";

const GuardianSpeechAPI = axios.create({
  baseURL: "http://localhost:5000/api",
});

GuardianSpeechAPI.interceptors.request.use((req) => {
  const token = localStorage.getItem("adminToken");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

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

export const getSpeechPrompts = (params) => {
  const normalizedParams =
    typeof params === "string" ? { grade: params } : params || {};
  return API.get(`/speech-processing/prompts${toQuery(normalizedParams)}`);
};

export const getMySpeechAssignments = () =>
  API.get("/speech-processing/my-assignments");

export const startSpeechSession = (payload) =>
  API.post("/speech-processing/session/start", payload);

export const analyzeSpeechAttempt = (payload) =>
  API.post("/speech-processing/attempt/analyze", payload);

export const uploadSpeechAttempt = (formData) =>
  API.post("/speech-processing/attempt/upload", formData);

export const completeSpeechSession = (sessionId) =>
  API.post(`/speech-processing/session/${sessionId}/complete`);

export const getMySpeechProgress = () =>
  API.get("/speech-processing/my-progress");

export const getChildSpeechProgress = () =>
  API.get("/speech-processing/child/progress");

export const getChildSpeechProgressTrend = () =>
  API.get("/speech-processing/child/progress-trend");

export const getSpeechIdentificationStatus = () =>
  API.get("/speech-processing/identification/status");

export const getLeoIdentificationPrompts = () =>
  API.get("/speech-processing/identification/prompts");

export const startLeoIdentification = () =>
  API.post("/speech-processing/identification/start");

export const submitLeoIdentificationAttempt = (payload) =>
  API.post("/speech-processing/identification/attempt", payload);

export const completeLeoIdentification = (sessionId) =>
  API.post("/speech-processing/identification/complete", { sessionId });

export const startSpeechIdentification = () =>
  API.post("/speech-processing/identification/start");

export const completeSpeechIdentification = (sessionId) =>
  API.post("/speech-processing/identification/complete", { sessionId });

export const getSpeechSystemActivities = () =>
  API.get("/speech-processing/system-activities");

export const getGuardianSpeechIdentificationResult = (childId) =>
  GuardianSpeechAPI.get(`/speech-processing/guardian/identification-result/${childId}`);

export const getImprovementStatus = () =>
  API.get("/speech-processing/improvement/status");

export const getImprovementActivities = () =>
  API.get("/speech-processing/improvement/activities");

export const getImprovementRecommendation = () =>
  API.get("/speech-processing/improvement/recommendation");

export const getImprovementMap = () =>
  API.get("/speech-processing/improvement/map");

export const getImprovementActivity = (activityId) =>
  API.get(`/speech-processing/improvement/activity/${activityId}`);

export const startImprovementSession = (activityId) =>
  API.post("/speech-processing/improvement/session/start", activityId ? { activityId } : {});

export const submitImprovementAttempt = (payload) =>
  API.post("/speech-processing/improvement/attempt", payload);

export const completeImprovementSession = (sessionId) =>
  API.post(`/speech-processing/improvement/session/${sessionId}/complete`);

export const getGuardianSpeechOverview = (childId) =>
  GuardianSpeechAPI.get(`/speech-processing/guardian/overview/${childId}`);

export const getGuardianSpeechImprovementProgress = (childId) =>
  GuardianSpeechAPI.get(`/speech-processing/guardian/improvement-progress/${childId}`);

export const getGuardianSpeechSessionHistory = (childId) =>
  GuardianSpeechAPI.get(`/speech-processing/guardian/session-history/${childId}`);

export const getGuardianSpeechProgressComparison = (childId) =>
  GuardianSpeechAPI.get(`/speech-processing/guardian/progress-comparison/${childId}`);

export const getGuardianSpeechActivityPlan = (childId) =>
  GuardianSpeechAPI.get(`/speech-processing/guardian/activity-plan/${childId}`);

export const getGuardianSpeechActivityProgress = (childId) =>
  GuardianSpeechAPI.get(`/speech-processing/guardian/activity-progress/${childId}`);
