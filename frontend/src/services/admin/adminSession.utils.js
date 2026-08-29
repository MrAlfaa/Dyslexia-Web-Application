export const isAdminAuthFailure = (error) => error?.response?.status === 401;

export const clearAdminSession = (storage) => {
  storage.removeItem("adminToken");
  storage.removeItem("adminUser");
};

export const getAdminSessionState = (storage) =>
  storage.getItem("adminToken") ? "authenticated" : "anonymous";
