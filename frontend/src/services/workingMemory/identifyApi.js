import API from "../api";

export const saveWorkingMemoryResult = (data) => {
  return API.post(
    "/working-memory/identification/save-result",
    data
  );
};

export const getWorkingMemoryIdentifyResults = (studentId) => {
  return API.get(`/working-memory/identification/student-results/${studentId}`);
};