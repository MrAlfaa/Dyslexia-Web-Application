import API from "../api";

// Get Student Profile
export const getStudentProfile = () => {
  return API.get("/students/profile");
};

// Update Student Profile
export const updateStudentProfile = (data) => {
  return API.put("/students/profile", data);
};

// Get Phonological Awareness Identification Results
export const getPhonologicalIdentifyResults = (studentId) => {
  return API.get(`/phonological-awareness/identification/student-results/${studentId}`);
};
