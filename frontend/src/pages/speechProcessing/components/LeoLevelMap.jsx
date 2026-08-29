import { useTranslation } from "react-i18next";
import LeoLevelNode from "./LeoLevelNode";
import LeoRewardChest from "./LeoRewardChest";

function getNodeState({ prompt, currentIndex, index, completedPromptIds, invalidPromptIds }) {
  if (completedPromptIds.includes(prompt.promptId)) return "completed";
  if (index === currentIndex && invalidPromptIds.includes(prompt.promptId)) return "invalid_retry";
  if (index === currentIndex) return "current";
  return "locked";
}

function LeoLevelMap({
  prompts = [],
  currentIndex = 0,
  completedPromptIds = [],
  levelStars = {},
  invalidPromptIds = [],
  theme,
  guideMessage,
  collectibleLabel,
  rewardLabel,
  onNodeClick,
  compact = false,
  variant = "default",
  className = "",
}) {
  const { t } = useTranslation("sp");
  const completed = prompts.length > 0 && completedPromptIds.length >= prompts.length;
  const totalStars = Object.values(levelStars).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const adventure = variant === "adventure";

  if (adventure) {
    return (
      <section className={`relative min-h-[360px] overflow-hidden rounded-[2.25rem] border-4 border-amber-200/80 bg-emerald-900/30 p-4 shadow-2xl shadow-emerald-950/35 backdrop-blur-[1px] ${className}`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(254,240,138,0.35),transparent_18%),radial-gradient(circle_at_82%_26%,rgba(20,184,166,0.26),transparent_22%),linear-gradient(180deg,rgba(22,101,52,0.12),rgba(20,83,45,0.35))]" />
        <div className="pointer-events-none absolute left-[6%] top-[32%] h-20 w-[88%] rotate-[-5deg] rounded-[999px] bg-amber-200/70 shadow-inner shadow-amber-950/15" />
        <div className="pointer-events-none absolute bottom-[18%] left-[7%] h-20 w-[76%] rotate-[5deg] rounded-[999px] bg-amber-200/70 shadow-inner shadow-amber-950/15" />
        <div className="pointer-events-none absolute bottom-[34%] right-[8%] h-36 w-24 rounded-[999px] bg-amber-200/65 shadow-inner shadow-amber-950/15" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-[1.3rem] border-4 border-amber-100 bg-amber-50 px-4 py-2 text-amber-950 shadow-lg shadow-emerald-950/20">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
              {t("jungle_level_path")}
            </p>
            <h2 className="text-lg font-black sm:text-2xl">
              {t("collect_every_activity_item", {
                item: collectibleLabel || t("sound_gems"),
              })}
            </h2>
          </div>
          <span className="rounded-[1.3rem] border-4 border-amber-100 bg-amber-50 px-4 py-2 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-950/20">
            {t("start_overlay_level_progress", {
              completed: completedPromptIds.length,
              total: prompts.length,
            })}
          </span>
        </div>

        <div className="relative z-10 mt-3 grid grid-cols-2 gap-y-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {prompts.map((prompt, index) => {
            const state = getNodeState({
              prompt,
              currentIndex,
              index,
              completedPromptIds,
              invalidPromptIds,
            });
            const waveOffset = [22, -8, 28, -2, 34, -12, 18, -18, 30, -4, 22, -10][index % 12];

            return (
              <div
                key={prompt.promptId || index}
                className="flex justify-center"
                style={{ transform: `translateY(${waveOffset}px)` }}
              >
                <LeoLevelNode
                  index={index}
                  prompt={prompt}
                  state={state}
                  stars={levelStars[prompt.promptId] || 0}
                  theme={theme}
                  compact={false}
                  variant="adventure"
                  onClick={state === "current" || state === "invalid_retry" ? onNodeClick : undefined}
                />
              </div>
            );
          })}
          <div className="flex justify-center sm:col-span-1" style={{ transform: "translateY(8px)" }}>
            <LeoRewardChest
              unlocked={completed}
              theme={theme}
              rewardLabel={rewardLabel}
              totalStars={totalStars}
              compact={false}
              variant="adventure"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`relative overflow-hidden border border-emerald-900/10 bg-[radial-gradient(circle_at_18%_12%,rgba(254,240,138,0.75),transparent_22%),radial-gradient(circle_at_84%_18%,rgba(20,184,166,0.35),transparent_20%),linear-gradient(135deg,#14532d,#16a34a_42%,#84cc16)] shadow-2xl shadow-emerald-950/20 ${
        compact ? "rounded-[1.8rem] p-3" : "rounded-[2.4rem] p-4 sm:p-5"
      } ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_20px_20px,rgba(255,255,255,0.28)_0_2px,transparent_3px)] [background-size:54px_54px]" />
      <div className="relative z-10">
        <div className={`${compact ? "mb-3" : "mb-4"} flex flex-wrap items-center justify-between gap-3`}>
          <div>
            <p className={`${compact ? "text-[10px]" : "text-xs"} font-black uppercase tracking-[0.2em] text-emerald-50`}>
              {t("jungle_level_path")}
            </p>
            <h2 className={`${compact ? "text-lg" : "text-2xl"} font-black text-white drop-shadow`}>
              {guideMessage || t("follow_sound_path")}
            </h2>
          </div>
          <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-black text-emerald-900 shadow-sm">
            {t("start_overlay_level_progress", {
              completed: completedPromptIds.length,
              total: prompts.length,
            })}
          </span>
        </div>

        <div className={`relative bg-amber-100/45 ring-1 ring-white/40 ${
          compact ? "rounded-[1.4rem] p-3" : "rounded-[2rem] p-4"
        }`}>
          <div className="pointer-events-none absolute left-8 right-8 top-16 hidden h-3 rounded-full bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 opacity-80 md:block" />
          <div className={`relative z-10 grid grid-cols-2 gap-2 ${
            compact ? "sm:grid-cols-3 xl:grid-cols-2" : "sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
          }`}>
            {prompts.map((prompt, index) => {
              const state = getNodeState({
                prompt,
                currentIndex,
                index,
                completedPromptIds,
                invalidPromptIds,
              });

              return (
                <LeoLevelNode
                  key={prompt.promptId || index}
                  index={index}
                  prompt={prompt}
                  state={state}
                  stars={levelStars[prompt.promptId] || 0}
                  theme={theme}
                  compact={compact}
                  variant="default"
                  onClick={state === "current" || state === "invalid_retry" ? onNodeClick : undefined}
                />
              );
            })}
            <LeoRewardChest
              unlocked={completed}
              theme={theme}
              rewardLabel={rewardLabel}
              totalStars={totalStars}
              compact={compact}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default LeoLevelMap;
