import API from "../api";

// Register Student
export const registerStudent = (data) => {
  return API.post("/auth/register/student", data);
};

// Register Admin
export const registerAdmin = (data) => {
  return API.post("/auth/register/admin", data);
};

// Login
export const login = (data) => {
  return API.post("/auth/login", data);
};

export const loginStudentByUsername = (data) => {
  return API.post("/auth/login/student", data);
};
