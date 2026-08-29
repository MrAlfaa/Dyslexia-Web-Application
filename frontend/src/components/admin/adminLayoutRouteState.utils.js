const SELF_MANAGED_CHILD_STATE_ROUTES = new Set([
  "/admin/students",
  "/admin/speech-overview",
  "/admin/speech-identification-result",
  "/admin/speech-improvement-progress",
  "/admin/speech-session-history",
]);

const normalizePathname = (pathname = "") => {
  const normalized = String(pathname || "/").replace(/\/+$/, "");
  return normalized || "/";
};

export const isSelfManagedChildStateRoute = (pathname) =>
  SELF_MANAGED_CHILD_STATE_ROUTES.has(normalizePathname(pathname));
