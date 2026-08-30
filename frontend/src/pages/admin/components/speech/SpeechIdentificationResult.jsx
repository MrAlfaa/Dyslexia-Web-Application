import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  getGuardianSpeechIdentificationResult,
  getSpeechSystemActivities,
} from "../../../../services/admin/api";
import GuardianCard from "../../../../components/guardian/ui/GuardianCard";
import GuardianPageHeader from "../../../../components/guardian/ui/GuardianPageHeader";
import GuardianRequestState from "../../../../components/guardian/ui/GuardianRequestState";
import GuardianStatCard from "../../../../components/guardian/ui/GuardianStatCard";
import GuardianStatusBadge from "../../../../components/guardian/ui/GuardianStatusBadge";
import { useGuardianChild } from "../../../../contexts/GuardianChildContext";
import { activityById, formatDate, formatPercent, formatSpeechLabel } from "./speechGuardianUtils";
import { useGuardianPageData } from "./shared";

function SpeechIdentificationResult() {
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

  const loadIdentification = useCallback(async (childId) => {
    const [resultResponse, activitiesResponse] = await Promise.all([
      getGuardianSpeechIdentificationResult(childId),
      getSpeechSystemActivities(),
    ]);
    return {
      result: resultResponse.data?.data || null,
      activities: activitiesResponse.data?.data || [],
    };
  }, []);
  const pageRequest = useGuardianPageData({
    enabled: childState === "ready",
    selectedChildId,
    load: loadIdentification,
  });

  const effectiveState = childState === "ready" ? pageRequest.state : childState;
  const effectiveError = childState === "ready" ? pageRequest.error : childError;
  const retry = childState === "ready" ? pageRequest.retry : refreshChildren;
  const result = pageRequest.data?.result;
  const activities = pageRequest.data?.activities || [];
  const attempts = result?.attemptsSummary || {};
  const audio = attempts.audioQualitySummary || {};
  const wordReading = attempts.wordReadingSummary || {};
  const phoneme = attempts.phonemeSummary || {};
  const recommendedIds = result?.recommendedActivityIds || [];
  const baselineComplete = result?.identificationStatus === "completed";

  return (
    <div className="space-y-5">
      <GuardianPageHeader
        title={t("guardian_identification_title")}
        subtitle={t("guardian_identification_subtitle")}
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
          <GuardianCard>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#157A5A]">{t("guardian_baseline_completeness")}</p>
                    <h3 className="mt-1 text-xl font-bold text-[#101828]">
                      {baselineComplete
                        ? t("guardian_baseline_complete_heading")
                        : t("guardian_baseline_waiting_heading")}
                    </h3>
                  </div>
                  <GuardianStatusBadge value={result?.identificationStatus || "not_started"} />
                </div>
                <p className="mt-1.5 max-w-3xl text-[13px] font-medium leading-5 text-[#5B6475]">
                  {baselineComplete
                    ? t("guardian_baseline_complete_message")
                    : t("guardian_baseline_waiting_message")}
                </p>
              </div>
              <div className="border-t border-[#DCE5E0] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <p className="text-xs font-semibold text-[#5B6475]">{t("guardian_support_indicator")}</p>
                <div className="mt-2">
                  <GuardianStatusBadge value={baselineComplete ? result?.supportLevel : "unknown"} type="support" />
                </div>
                <p className="mt-2 text-xs font-medium leading-5 text-[#5B6475]">
                  {baselineComplete && result?.supportLevel && result.supportLevel !== "unknown"
                    ? t(`guardian_${result.supportLevel}_message`)
                    : t("guardian_support_indicator_pending")}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <GuardianStatCard label={t("guardian_total_attempts")} value={attempts.totalAttemptCount || 0} tone="slate" />
              <GuardianStatCard label={t("guardian_valid_recordings")} value={attempts.validAttemptCount || 0} tone="emerald" />
              <GuardianStatCard label={t("guardian_completed_date")} value={formatDate(result?.completedAt)} tone="sky" />
            </div>
            <p className="mt-3 text-xs font-medium leading-5 text-[#667085]">
              {t("guardian_support_non_clinical")}
            </p>
          </GuardianCard>

          <GuardianCard>
            <div>
              <p className="text-xs font-semibold text-[#157A5A]">{t("guardian_evidence_quality")}</p>
              <h3 className="mt-1 text-xl font-bold text-[#101828]">{t("guardian_recording_quality_heading")}</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-[#5B6475]">{t("guardian_recording_quality_message")}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <GuardianStatCard label={t("guardian_good_audio")} value={audio.good || 0} tone="emerald" />
              <GuardianStatCard label={t("guardian_fair_audio")} value={audio.fair || 0} tone="sky" />
              <GuardianStatCard label={t("guardian_poor_audio")} value={audio.poor || 0} tone="amber" />
              <GuardianStatCard label={t("guardian_invalid_recordings")} value={audio.invalid || 0} tone="slate" />
            </div>
          </GuardianCard>

          <GuardianCard>
            <p className="text-xs font-semibold text-[#157A5A]">{t("guardian_observations")}</p>
            <h3 className="mt-1 text-xl font-bold text-[#101828]">{t("guardian_observations_heading")}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <GuardianStatCard
                label={t("guardian_word_reading")}
                value={wordReading.wordReadingAccuracy === undefined ? t("guardian_not_available") : formatPercent(wordReading.wordReadingAccuracy)}
                helper={t("guardian_correct_words", { count: wordReading.correctWordCount || 0 })}
                tone="emerald"
              />
              <GuardianStatCard
                label={t("guardian_sound_patterns")}
                value={phoneme.meanPhonemeErrorRate === undefined ? t("guardian_not_available") : formatPercent(phoneme.meanPhonemeErrorRate)}
                helper={formatSpeechLabel(phoneme.commonErrorPattern, t("guardian_no_common_pattern"))}
                tone="amber"
              />
              <GuardianStatCard
                label={t("guardian_attempts_to_review")}
                value={phoneme.attemptsNeedingReview || 0}
                helper={t("guardian_review_recordings_helper")}
                tone="slate"
              />
              <GuardianStatCard
                label={t("guardian_baseline_use")}
                value={baselineComplete ? t("guardian_ready_for_comparison") : t("guardian_not_ready")}
                helper={t("guardian_baseline_use_helper")}
                tone="sky"
              />
            </div>
          </GuardianCard>

          <GuardianCard className="border-[#CFE6DC] bg-[#F8FBF8]">
            <p className="text-sm font-semibold text-[#157A5A]">{t("guardian_next_step")}</p>
            <h3 className="mt-1 text-xl font-bold text-[#101828]">
              {recommendedIds.length ? t("guardian_recommended_leo_activities") : t("guardian_waiting_for_recommendation")}
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {recommendedIds.length ? (
                recommendedIds.map((id) => (
                  <span key={id} className="rounded-lg border border-[#D8ECE3] bg-white px-3 py-2 text-sm font-semibold text-[#0F5F48]">
                    {activityById(activities, id)?.title || id}
                  </span>
                ))
              ) : (
                <p className="text-sm font-medium text-[#5B6475]">{t("guardian_complete_baseline_for_recommendation")}</p>
              )}
            </div>
          </GuardianCard>

          {isSuperAdmin && result?.recentSession && (
            <GuardianCard className="border-[#D8EAF7] bg-[#F3FAFF]">
              <p className="text-sm font-semibold text-[#24516F]">{t("guardian_super_admin_technical_evidence")}</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  [t("guardian_model_version"), result.recentSession.modelVersion || "-"],
                  [t("guardian_snapshot_status"), result.recentSession.snapshotStatus || "-"],
                  [t("guardian_prediction_count"), result.recentSession.pronunciationSummary?.validPredictionCount || 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-white px-4 py-3">
                    <dt className="text-xs font-semibold text-[#5B6475]">{label}</dt>
                    <dd className="mt-1 font-bold text-[#101828]">{value}</dd>
                  </div>
                ))}
              </dl>
            </GuardianCard>
          )}
        </>
      )}
    </div>
  );
}

export default SpeechIdentificationResult;
