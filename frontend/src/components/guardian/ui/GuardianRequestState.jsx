import { AlertCircle, RefreshCw, UserPlus } from "lucide-react";
import GuardianButton from "./GuardianButton";

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "We could not load your children right now.";

function GuardianRequestState({ state, error, onRetry, onAddChild }) {
  if (state === "ready") return null;

  if (state === "loading") {
    return (
      <div className="guardian-request-state" role="status" aria-live="polite" aria-label="Loading child profiles">
        <div className="guardian-request-state__skeleton guardian-request-state__skeleton--avatar" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="guardian-request-state__skeleton h-4 w-36 max-w-full" />
          <div className="guardian-request-state__skeleton h-3 w-52 max-w-full" />
        </div>
        <div className="guardian-request-state__skeleton hidden h-11 w-56 sm:block" />
        <span className="sr-only">Loading child profiles</span>
      </div>
    );
  }

  if (state === "request_failed") {
    return (
      <div className="guardian-request-state" role="alert">
        <AlertCircle className="h-5 w-5 shrink-0 text-[#B42318]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#101828]">Child profiles could not be loaded</p>
          <p className="mt-0.5 text-sm text-[#667085]">{getErrorMessage(error)}</p>
        </div>
        {onRetry && (
          <GuardianButton variant="secondary" onClick={onRetry} className="min-h-11 rounded-[10px]">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Retry
          </GuardianButton>
        )}
      </div>
    );
  }

  if (state === "no_owned_children") {
    return (
      <div className="guardian-request-state" role="status">
        <UserPlus className="h-5 w-5 shrink-0 text-[#157A5A]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#101828]">No child profiles yet</p>
          <p className="mt-0.5 text-sm text-[#667085]">Add a child before reviewing learning progress.</p>
        </div>
        {onAddChild && (
          <GuardianButton onClick={onAddChild} className="min-h-11 rounded-[10px]">
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add Child
          </GuardianButton>
        )}
      </div>
    );
  }

  if (state === "stale_selected_child") {
    return (
      <div className="guardian-request-state" role="status" aria-live="polite">
        <AlertCircle className="h-5 w-5 shrink-0 text-[#9A6700]" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#101828]">Saved child is no longer available</p>
          <p className="mt-0.5 text-sm text-[#667085]">LexiLand is selecting the first available child for you.</p>
        </div>
      </div>
    );
  }

  return null;
}

export default GuardianRequestState;
