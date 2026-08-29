export const GUARDIAN_CHILD_STORAGE_KEY = "lexilandGuardianSpeechChildId";

export const getGuardianChildId = (child) => {
  const id = child?._id ?? child?.id;
  return id === undefined || id === null ? "" : String(id);
};

export const normalizeGuardianChildren = (children) =>
  Array.isArray(children)
    ? children.filter((child) => Boolean(getGuardianChildId(child)))
    : [];

export const findGuardianChild = (children, childId) => {
  const normalizedId = childId === undefined || childId === null ? "" : String(childId);
  return normalizeGuardianChildren(children).find(
    (child) => getGuardianChildId(child) === normalizedId
  ) || null;
};

export const getFirstGuardianChildId = (children) =>
  getGuardianChildId(normalizeGuardianChildren(children)[0]);

export const deriveGuardianChildState = ({
  loading,
  error,
  children,
  selectedChildId,
  storedId,
}) => {
  if (loading) return "loading";
  if (error) return "request_failed";

  const normalizedChildren = normalizeGuardianChildren(children);
  if (normalizedChildren.length === 0) return "no_owned_children";

  const candidateId = selectedChildId ?? storedId ?? "";
  return findGuardianChild(normalizedChildren, candidateId)
    ? "ready"
    : "stale_selected_child";
};
