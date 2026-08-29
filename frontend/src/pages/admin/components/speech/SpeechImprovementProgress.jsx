import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  getGuardianSpeechImprovementProgress,
  getGuardianSpeechProgressComparison,
} from "../../../../services/admin/api";
import GuardianCard from "../../../../components/guardian/ui/GuardianCard";
import GuardianEmptyState from "../../../../components/guardian/ui/GuardianEmptyState";
import GuardianPageHeader from "../../../../components/guardian/ui/GuardianPageHeader";
import GuardianRequestState from "../../../../components/guardian/ui/GuardianRequestState";
import GuardianStatCard from "../../../../components/guardian/ui/GuardianStatCard";
import GuardianStatusBadge from "../../../../components/guardian/ui/GuardianStatusBadge";
import { useGuardianChild } from "../../../../contexts/GuardianChildContext";
import { activityTitle, formatPercent } from "./speechGuardianUtils";
import SpeechProgressTimeline from "./SpeechProgressTimeline";
import { useGuardianPageData } from "./shared";

const formatStatus = (value, fallback) =>
  value ? String(value).replaceAll("_", " ") : fallback;

function SpeechImprovementProgress() {
  const { t } = useTranslation("sp");
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");
  const isSuperAdmin = adminUser.role === "super admin";
  const {
    selectedChildId,
    state: childState,
    error: childError,
    refreshChildren,
  } = useGuardianChild();

  const loadProgress = useCallback(async (childId) => {
    const [progressResponse, comparisonResponse] = await Promise.all([
      getGuardianSpeechImprovementProgress(childId),
      getGuardianSpeechProgressComparison(childId),
    ]);
    return {
      progress: progressResponse.data?.data || null,
      comparison: comparisonResponse.data?.data || null,
    };
  }, []);
  const pageRequest = useGuardianPageData({
    enabled: childState === "ready",
    selectedChildId,
    load: loadProgress,
  });

  const effectiveState = childState === "ready" ? pageRequest.state : childState;
  const effectiveError = childState === "ready" ? pageRequest.error : childError;
  const retry = childState === "ready" ? pageRequest.retry : refreshChildren;
  const progress = pageRequest.data?.progress;
  const comparison = pageRequest.data?.comparison;
  const activities = progress?.activities || [];
  const completedCount = progress?.completedActivityIds?.length || 0;
  const recommendation = progress?.recommendation || {};
  const currentActivity = activities.find(
    (activity) => activity.activityId === (progress?.currentActivityId || recommendation.nextActivity?.activityId)
  ) || recommendation.nextActivity;
  const latestSession = progress?.latestSession;

  return (
    <div className="space-y-5">
      <GuardianPageHeader
        title={t("guardian_improvement_title")}
        subtitle={t("guardian_improvement_subtitle")}
      />

      {effectiveState !== "ready" ? (
        <GuardianRequestState
          state={effectiveState}
          error={effectiveError}
          onRetry={retry}
          onAddChild={() => navigate("/admin/students")}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <GuardianStatCard
              label={t("guardian_training_status")}
              value={progress?.improvementUnlocked ? t("guardian_unlocked") : t("guardian_locked")}
              helper={t("guardian_training_state_helper")}
              tone={progress?.improvementUnlocked ? "emerald" : "amber"}
            />
            <GuardianStatCard label={t("guardian_stars_earned")} value={progress?.stars || 0} helper={t("guardian_activity_stars_helper")} tone="amber" />
            <GuardianStatCard label={t("guardian_completed_activities")} value={`${completedCount}/${activities.length || 5}`} helper={t("guardian_activity_progress_helper")} tone="sky" />
            <GuardianStatCard label={t("guardian_current_focus")} value={progress?.weakSkillFocus || recommendation.skillFocus || t("guardian_waiting")} helper={t("guardian_current_focus_helper")} tone="slate" />
          </div>

          <GuardianCard className="border-[#CFE6DC] bg-[#F8FBF8]">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)] lg:items-stretch">
              <div>
                <p className="text-sm font-semibold text-[#157A5A]">{t("guardian_recommended_action")}</p>
                <h3 className="mt-1 text-2xl font-bold text-[#101828]">
                  {activityTitle(recommendation.nextActivity || currentActivity) || t("guardian_waiting_for_next_activity")}
                </h3>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#5B6475]">
                  {recommendation.guardianReason || t("guardian_recommendation_fallback")}
                </p>
              </div>
              <div className="rounded-lg border border-[#D8ECE3] bg-white p-4">
                <p className="text-xs font-semibold text-[#5B6475]">{t("guardian_current_activity")}</p>
                <p className="mt-1 text-lg font-bold text-[#101828]">{activityTitle(currentActivity)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <GuardianStatusBadge value={currentActivity?.state || (progress?.improvementUnlocked ? "current" : "locked")} />
                  <span className="rounded-lg bg-[#FFF6DF] px-3 py-1 text-xs font-semibold text-[#94600A]">
                    {t("guardian_star_count", { count: currentActivity?.starsEarned || currentActivity?.stars || 0 })}
                  </span>
                </div>
              </div>
            </div>
          </GuardianCard>

          {!progress?.improvementUnlocked && (
            <GuardianCard className="border-[#F4D7A1] bg-[#FFF9EB]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#8A5A10]">{t("guardian_training_locked_title")}</p>
                  <h3 className="mt-1 text-xl font-bold text-[#101828]">{t("guardian_training_locked_heading")}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-[#6E4A0A]">{t("guardian_training_locked_message")}</p>
                </div>
                <GuardianStatusBadge value="locked" />
              </div>
            </GuardianCard>
          )}

          <GuardianCard>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#157A5A]">{t("guardian_baseline_and_checks")}</p>
                <h3 className="mt-1 text-xl font-bold text-[#101828]">{t("guardian_progress_timeline")}</h3>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#5B6475]">{t("guardian_progress_timeline_message")}</p>
              </div>
              <div className="text-sm font-bold capitalize text-[#5B6475]">
                {formatStatus(comparison?.currentTrend, t("guardian_waiting_for_baseline"))}
              </div>
            </div>
            <div className="mt-5">
              <SpeechProgressTimeline
                baseline={comparison?.baseline}
                activityEstimates={comparison?.activityEstimates}
                checkpoints={comparison?.checkpoints || []}
              />
            </div>
          </GuardianCard>

          <GuardianCard>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#157A5A]">{t("guardian_activity_map")}</p>
                <h3 className="mt-1 text-xl font-bold text-[#101828]">{t("guardian_practice_path_preview")}</h3>
              </div>
              <GuardianStatusBadge value={progress?.improvementUnlocked ? "current" : "locked"} />
            </div>

            {activities.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {activities.map((activity, index) => {
                  const active = ["current", "recommended", "available"].includes(activity.state);
                  const done = activity.state === "completed";
                  return (
                    <article key={activity.activityId} className="rounded-lg border border-[#E5EDE7] bg-[#F8FBF8] p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${done ? "bg-[#157A5A] text-white" : active ? "bg-[#F5B84B] text-[#10241E]" : "bg-white text-[#5B6475]"}`}>
                          {index + 1}
                        </span>
                        <GuardianStatusBadge value={activity.state || "locked"} />
                      </div>
                      <h4 className="mt-3 text-sm font-bold text-[#101828]">{activity.title}</h4>
                      <p className="mt-1 text-xs font-medium leading-5 text-[#5B6475]">{activity.skill || activity.description}</p>
                      <p className="mt-3 text-xs font-semibold text-[#94600A]">{t("guardian_star_count", { count: activity.starsEarned || activity.stars || 0 })}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4"><GuardianEmptyState title={t("guardian_no_activity_map")} message={t("guardian_no_activity_map_message")} /></div>
            )}
          </GuardianCard>

          <GuardianCard>
            <p className="text-sm font-semibold text-[#157A5A]">{t("guardian_latest_training_evidence")}</p>
            {latestSession ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <GuardianStatCard label={t("guardian_activity")} value={activityTitle(activities.find((activity) => activity.activityId === latestSession.activityId))} tone="emerald" />
                <GuardianStatCard label={t("guardian_stars_earned")} value={latestSession.starsEarned || 0} tone="amber" />
                <GuardianStatCard
                  label={t("guardian_word_reading")}
                  value={latestSession.wordReadingSummary?.wordReadingAccuracy === undefined ? t("guardian_not_available") : formatPercent(latestSession.wordReadingSummary.wordReadingAccuracy)}
                  helper={t("guardian_correct_words", { count: latestSession.wordReadingSummary?.correctWordCount || 0 })}
                  tone="emerald"
                />
                <GuardianStatCard
                  label={t("guardian_sound_patterns")}
                  value={latestSession.phonemeSummary?.meanPhonemeErrorRate === undefined ? t("guardian_not_available") : formatPercent(latestSession.phonemeSummary.meanPhonemeErrorRate)}
                  helper={latestSession.phonemeSummary?.commonErrorPattern || t("guardian_no_common_pattern")}
                  tone="sky"
                />
              </div>
            ) : (
              <div className="mt-4"><GuardianEmptyState title={t("guardian_no_training_sessions")} message={t("guardian_no_training_sessions_message")} /></div>
            )}
          </GuardianCard>

          {isSuperAdmin && latestSession && (
            <GuardianCard className="border-[#D8EAF7] bg-[#F3FAFF]">
              <p className="text-sm font-semibold text-[#24516F]">{t("guardian_super_admin_technical_evidence")}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <GuardianStatCard label={t("guardian_snapshot_status")} value={latestSession.snapshotStatus || "-"} tone="sky" />
                <GuardianStatCard label={t("guardian_model_version")} value={latestSession.modelVersion || latestSession.pronunciationSummary?.modelVersion || "-"} tone="slate" />
                <GuardianStatCard label={t("guardian_prediction_count")} value={latestSession.pronunciationSummary?.validPredictionCount || 0} tone="slate" />
              </div>
            </GuardianCard>
          )}
        </>
      )}
    </div>
  );
}

export default SpeechImprovementProgress;
