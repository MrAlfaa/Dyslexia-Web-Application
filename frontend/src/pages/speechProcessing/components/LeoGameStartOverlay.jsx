import { useTranslation } from "react-i18next";
import leo from "../../../assets/lexiland/leo-lion.webp";
import jungleMapBg from "../../../assets/lexiland/leo-training-map-bg.webp";
import LeoLevelMap from "./LeoLevelMap";

function LeoGameStartOverlay({
  title,
  subtitle,
  startLabel,
  backLabel,
  onStart,
  onBack,
  prompts = [],
  completedPromptIds = [],
  totalStars = 0,
  theme,
  startDisabled = false,
}) {
  const { t } = useTranslation("sp");
  const totalLevels = prompts.length || 1;
  const completedLevels = completedPromptIds.length;
  const resolvedStartLabel = startLabel || t("start_adventure");
  const resolvedBackLabel = backLabel || t("back_to_sound_safari");
  const collectibleLabel = theme?.collectible || t("sound_gems");

  return (
    <section
      className="relative min-h-[640px] overflow-hidden rounded-[2.5rem] border border-emerald-950/20 bg-emerald-950 text-white shadow-2xl shadow-emerald-950/35 ring-1 ring-white/20 sm:rounded-[3rem]"
      style={{
        backgroundImage: `linear-gradient(180deg,rgba(4,47,46,0.18),rgba(4,47,46,0.44)),url(${jungleMapBg})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_4%,rgba(255,236,157,0.45),transparent_18%),linear-gradient(180deg,rgba(5,46,22,0.08),rgba(5,46,22,0.38))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-emerald-950/55 to-transparent" />

      <div className="relative z-10 flex min-h-[640px] flex-col p-4 sm:p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border-4 border-amber-100 bg-gradient-to-br from-amber-200 to-orange-400 px-5 py-3 text-sm font-black text-amber-950 shadow-xl shadow-emerald-950/25 transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-amber-100"
          >
            {resolvedBackLabel}
          </button>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <span className="rounded-[1.35rem] border-4 border-amber-100 bg-amber-50 px-4 py-2 text-sm font-black text-emerald-950 shadow-xl shadow-emerald-950/20">
              {t("start_overlay_level_progress", { completed: completedLevels, total: totalLevels })}
            </span>
            <span className="rounded-[1.35rem] border-4 border-amber-100 bg-amber-50 px-4 py-2 text-sm font-black text-emerald-950 shadow-xl shadow-emerald-950/20">
              {totalStars} {collectibleLabel}
            </span>
          </div>
        </div>

        <div className="mx-auto mt-3 w-full max-w-4xl text-center">
          <div className="relative mx-auto rounded-[2rem] border-[6px] border-amber-900/45 bg-[linear-gradient(180deg,#9a5a20,#6f3d16)] px-5 py-4 shadow-2xl shadow-emerald-950/45 ring-4 ring-amber-200/65">
            <div className="pointer-events-none absolute inset-x-8 -bottom-4 h-5 rounded-full bg-amber-950/35 blur-sm" />
            <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-100">
              {t("leo_sound_safari_title")}
            </p>
            <h1 className="mt-1 text-3xl font-black leading-tight text-white drop-shadow-[0_3px_0_rgba(69,26,3,0.65)] sm:text-4xl lg:text-5xl">
              {title}
            </h1>
          </div>

          <div className="mx-auto mt-4 max-w-2xl rounded-[1.6rem] border-4 border-amber-100 bg-amber-50 px-5 py-3 text-sm font-black leading-6 text-amber-950 shadow-xl shadow-emerald-950/20 sm:text-base">
            {subtitle || t("follow_sound_path")}
          </div>
        </div>

        <div className="mt-4 grid flex-1 items-center gap-4 lg:grid-cols-[240px_1fr_250px]">
          <aside className="order-3 flex flex-col items-center lg:order-1 lg:items-start">
            <div className="relative">
              <img
                src={leo}
                alt={t("leo_the_lion")}
                className="h-40 object-contain mix-blend-multiply drop-shadow-[0_18px_24px_rgba(6,78,59,0.55)] sm:h-52 lg:h-56"
              />
              <div className="absolute -right-5 top-12 max-w-[150px] rounded-[1.4rem] border-4 border-amber-100 bg-amber-50 px-4 py-3 text-center text-sm font-black leading-5 text-amber-950 shadow-xl shadow-emerald-950/20">
                {t("lets_find_sound_path")}
              </div>
            </div>
          </aside>

          <aside className="order-1 flex flex-col items-center gap-4 lg:order-3 lg:items-stretch">
            <button
              type="button"
              onClick={onStart}
              disabled={startDisabled}
              className="w-full max-w-[280px] rounded-[2rem] border-4 border-amber-100 bg-gradient-to-br from-amber-300 via-orange-400 to-orange-500 px-8 py-5 text-lg font-black text-amber-950 shadow-2xl shadow-emerald-950/30 transition hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:grayscale disabled:opacity-60"
            >
              {resolvedStartLabel}
            </button>

            <div className="w-full max-w-[260px] rounded-[1.75rem] border-4 border-amber-100 bg-amber-50 p-4 text-center text-emerald-950 shadow-2xl shadow-emerald-950/25">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                {t("collected_label")}
              </p>
              <p className="mt-1 text-4xl font-black text-amber-700">{totalStars}</p>
              <p className="text-sm font-black">{collectibleLabel}</p>
            </div>

            <p className="max-w-[260px] rounded-[1.35rem] bg-emerald-950/72 px-4 py-3 text-center text-xs font-bold leading-5 text-emerald-50 ring-1 ring-white/20">
              {t("start_game_ready_hint")}
            </p>
          </aside>

          <div className="order-2 lg:order-2">
            <LeoLevelMap
              prompts={prompts}
              currentIndex={completedLevels}
              completedPromptIds={completedPromptIds}
              levelStars={{}}
              invalidPromptIds={[]}
              theme={theme}
              variant="adventure"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default LeoGameStartOverlay;
