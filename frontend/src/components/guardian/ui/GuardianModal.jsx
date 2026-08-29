import { useEffect, useId, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "audio[controls]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function GuardianModal({
  title,
  subtitle,
  children,
  onClose,
  closeLabel = "Close",
  variant = "modal",
}) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const restoreTarget = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = panelRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || [];
    (focusable[0] || panelRef.current)?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const items = Array.from(
        panelRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || []
      ).filter((element) => element.getClientRects().length > 0);
      if (!items.length) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (restoreTarget instanceof HTMLElement && document.contains(restoreTarget)) {
        restoreTarget.focus();
      }
    };
  }, []);

  const isDrawer = variant === "drawer";

  return (
    <div
      className={`fixed inset-0 z-50 flex bg-[#10241E]/55 backdrop-blur-sm ${
        isDrawer ? "justify-end" : "items-center justify-center p-4"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={
          isDrawer
            ? "h-full w-full max-w-3xl overflow-y-auto border-l border-[#DCE7E1] bg-white shadow-[-20px_0_55px_rgba(16,36,30,0.2)] outline-none"
            : "max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl outline-none"
        }
      >
        <div className={`flex items-start justify-between gap-4 ${isDrawer ? "sticky top-0 z-10 border-b border-[#E5EDE7] bg-white px-5 py-4 sm:px-6" : ""}`}>
          <div>
            <h3 id={titleId} className="text-xl font-bold text-[#101828] sm:text-2xl">{title}</h3>
            {subtitle && <p className="mt-1 text-sm font-medium text-[#5B6475]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="guardian-focus min-h-11 rounded-xl bg-[#F5F7F6] px-4 py-2 text-sm font-semibold text-[#101828] transition hover:bg-[#EAF7F0]"
          >
            {closeLabel}
          </button>
        </div>
        <div className={isDrawer ? "px-5 py-5 sm:px-6" : "mt-6"}>{children}</div>
      </div>
    </div>
  );
}

export default GuardianModal;
