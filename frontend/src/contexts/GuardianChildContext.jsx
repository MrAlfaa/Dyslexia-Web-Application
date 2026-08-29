import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getGuardianChildren } from "../services/admin/api";
import {
  deriveGuardianChildState,
  findGuardianChild,
  getFirstGuardianChildId,
  getGuardianChildId,
  GUARDIAN_CHILD_STORAGE_KEY,
  normalizeGuardianChildren,
} from "./guardianChildState.utils";

const GuardianChildContext = createContext(null);

const readStoredChildId = () => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(GUARDIAN_CHILD_STORAGE_KEY) || "";
};

export function GuardianChildProvider({ children: content }) {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(readStoredChildId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestSequence = useRef(0);

  const refreshChildren = useCallback(async () => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const response = await getGuardianChildren();
      if (requestSequence.current !== requestId) return;

      const ownedChildren = normalizeGuardianChildren(response.data?.data);
      setChildren(ownedChildren);
      setSelectedChildId((currentId) => {
        if (ownedChildren.length === 0) return "";
        if (findGuardianChild(ownedChildren, currentId)) return currentId;
        return currentId || getFirstGuardianChildId(ownedChildren);
      });
    } catch (requestError) {
      if (requestSequence.current !== requestId) return;
      setError(requestError);
    } finally {
      if (requestSequence.current === requestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshChildren();
  }, [refreshChildren]);

  const state = deriveGuardianChildState({
    loading,
    error,
    children,
    selectedChildId,
  });

  useEffect(() => {
    if (state !== "stale_selected_child") return;
    setSelectedChildId(getFirstGuardianChildId(children));
  }, [children, state]);

  const selectedChild = useMemo(
    () => findGuardianChild(children, selectedChildId),
    [children, selectedChildId]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedChild) {
      window.localStorage.setItem(
        GUARDIAN_CHILD_STORAGE_KEY,
        getGuardianChildId(selectedChild)
      );
    } else if (state === "no_owned_children") {
      window.localStorage.removeItem(GUARDIAN_CHILD_STORAGE_KEY);
    }
  }, [selectedChild, state]);

  const selectChild = useCallback((childId) => {
    const child = findGuardianChild(children, childId);
    if (child) setSelectedChildId(getGuardianChildId(child));
  }, [children]);

  const value = useMemo(() => ({
    children,
    selectedChildId,
    selectedChild,
    state,
    error,
    selectChild,
    refreshChildren,
  }), [
    children,
    selectedChildId,
    selectedChild,
    state,
    error,
    selectChild,
    refreshChildren,
  ]);

  return (
    <GuardianChildContext.Provider value={value}>
      {content}
    </GuardianChildContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGuardianChild() {
  const context = useContext(GuardianChildContext);
  if (!context) {
    throw new Error("useGuardianChild must be used within GuardianChildProvider");
  }
  return context;
}
