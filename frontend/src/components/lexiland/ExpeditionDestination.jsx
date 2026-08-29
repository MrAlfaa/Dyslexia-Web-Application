import {
  AudioLines,
  BookOpenText,
  BrainCircuit,
  ChevronRight,
  LockKeyhole,
} from "lucide-react";
import leo from "../../assets/lexiland/leo-lion.webp";
import ExpeditionButton from "./ExpeditionButton";
import ExpeditionStatus from "./ExpeditionStatus";

const iconByVisual = {
  memory: BrainCircuit,
  sound: AudioLines,
  reading: BookOpenText,
};

const stateStyles = {
  current: "border-amber-300 bg-amber-50 shadow-[0_14px_32px_rgba(180,112,0,0.12)]",
  available: "border-sky-200 bg-white shadow-[0_12px_28px_rgba(25,105,145,0.09)]",
  completed: "border-emerald-300 bg-emerald-50 shadow-[0_12px_28px_rgba(6,95,70,0.09)]",
  locked: "border-slate-200 bg-slate-50",
};

const ExpeditionDestination = ({
  destination,
  title,
  description,
  statusLabel,
  actionLabel,
  lockReason,
  devPreviewLabel,
  compact = false,
}) => {
  const state = stateStyles[destination.state] ? destination.state : "locked";
  const Icon = iconByVisual[destination.visual] || BookOpenText;
  const isSpeech = destination.visual === "speech";

  return (
    <article
      className={[
        "group flex min-w-0 flex-col border p-4 transition-transform duration-200",
        "rounded-lg focus-within:-translate-y-0.5 hover:-translate-y-0.5",
        stateStyles[state],
        compact ? "min-h-40" : "min-h-48",
      ].join(" ")}
      data-state={state}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={[
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
            state === "locked" ? "bg-slate-200 text-slate-500" : "bg-white text-emerald-800",
          ].join(" ")}
          aria-hidden="true"
        >
          {isSpeech ? (
            <img src={leo} alt="" className="h-12 w-12 object-contain" />
          ) : (
            <Icon size={26} strokeWidth={2.2} />
          )}
        </div>
        <ExpeditionStatus state={state}>{statusLabel}</ExpeditionStatus>
      </div>

      <h3 className="mt-3 text-lg font-extrabold leading-tight text-slate-950">{title}</h3>
      <p className="mt-1.5 text-sm font-semibold leading-5 text-slate-600">{description}</p>

      {destination.devPreview && devPreviewLabel ? (
        <span className="mt-2 text-xs font-extrabold text-violet-700">{devPreviewLabel}</span>
      ) : null}

      <div className="mt-auto pt-3">
        {state === "locked" ? (
          <p className="flex min-h-11 items-center gap-2 border-t border-slate-200 pt-3 text-xs font-bold leading-4 text-slate-600">
            <LockKeyhole aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>{lockReason}</span>
          </p>
        ) : (
          <ExpeditionButton
            href={destination.route}
            variant={state === "current" ? "primary" : "secondary"}
            icon={ChevronRight}
            className="w-full justify-center"
          >
            {actionLabel}
          </ExpeditionButton>
        )}
      </div>
    </article>
  );
};

export default ExpeditionDestination;
