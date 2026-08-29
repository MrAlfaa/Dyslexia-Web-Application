const ADMIN_AUTH_PATHS = new Set(["/admin/login", "/admin/register"]);

export const isAdminAuthFailure = (error, sessionState) =>
  error?.response?.status === 401 &&
  sessionState === "authenticated" &&
  !ADMIN_AUTH_PATHS.has(error?.config?.url);

export const clearAdminSession = (storage) => {
  storage.removeItem("adminToken");
  storage.removeItem("adminUser");
};

export const getAdminSessionState = (storage) =>
  storage.getItem("adminToken") ? "authenticated" : "anonymous";
