import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  getGuardianSpeechInsight,
  getGuardianSpeechOverview,
  getGuardianSpeechProgressComparison,
  getPronunciationModelEvaluation,
  refreshGuardianSpeechInsight,
} from "../../../../services/admin/api";
import GuardianButton from "../../../../components/guardian/ui/GuardianButton";
import GuardianCard from "../../../../components/guardian/ui/GuardianCard";
import GuardianPageHeader from "../../../../components/guardian/ui/GuardianPageHeader";
import GuardianRequestState from "../../../../components/guardian/ui/GuardianRequestState";
import GuardianStatCard from "../../../../components/guardian/ui/GuardianStatCard";
import GuardianStatusBadge from "../../../../components/guardian/ui/GuardianStatusBadge";
import { useGuardianChild } from "../../../../contexts/GuardianChildContext";
import { activityTitle, formatPercent } from "./speechGuardianUtils";
import GuardianSpeechInsightCard from "./GuardianSpeechInsightCard";
import { useGuardianPageData } from "./shared";

const formatStatus = (value, fallback) =>
  value ? String(value).replaceAll("_", " ") : fallback;

function SpeechOverview() {
  const { t, i18n } = useTranslation("sp");
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");
  const isSuperAdmin = adminUser.role === "super admin";
  const {
    selectedChildId,
    selectedChild,
    state: childState,
    error: childError,
    refreshChildren,
  } = useGuardianChild();
  const [modelEvaluation, setModelEvaluation] = useState(null);
  const [insightRefreshToken, setInsightRefreshToken] = useState(0);

  const loadOverview = useCallback(async (childId) => {
    const [overviewResponse, comparisonResponse] = await Promise.all([
      getGuardianSpeechOverview(childId),
      getGuardianSpeechProgressComparison(childId),
    ]);
    return {
      overview: overviewResponse.data?.data || null,
      comparison: comparisonResponse.data?.data || null,
    };
  }, []);

  const pageRequest = useGuardianPageData({
    enabled: childState === "ready",
    selectedChildId,
    load: loadOverview,
  });

  const locale = i18n.resolvedLanguage?.startsWith("en") ? "en-US" : "si-LK";
  const loadInsight = useCallback(
    async (childId) => {
      const response = insightRefreshToken
        ? await refreshGuardianSpeechInsight(childId, locale)
        : await getGuardianSpeechInsight(childId, locale);
      return response.data?.data || null;
    },
    [insightRefreshToken, locale]
  );
  const insightRequest = useGuardianPageData({
    enabled: childState === "ready",
    selectedChildId,
    load: loadInsight,
  });

  useEffect(() => {
    if (!isSuperAdmin) return undefined;
    let active = true;
    getPronunciationModelEvaluation()
      .then((response) => {
        if (active) setModelEvaluation(response.data?.data || null);
      })
      .catch(() => {
        if (active) setModelEvaluation(null);
      });
    return () => {
      active = false;
    };
  }, [isSuperAdmin]);

  const overview = pageRequest.data?.overview;
  const comparison = pageRequest.data?.comparison;
  const speech = overview?.speech || {};
  const recommendation = overview?.recommendation || {};
  const latestSession = overview?.latestSession || {};
  const identificationComplete = speech.identificationStatus === "completed";
  const improvementUnlocked = Boolean(speech.improvementUnlocked || overview?.improvementUnlocked);
  const attempts = latestSession?.attempts || [];
  const invalidAttempts = attempts.filter(
    (attempt) => attempt.validAudio === false || attempt.audioQuality?.qualityLabel === "invalid"
  ).length;
  const attemptsNeedingReview = latestSession?.phonemeSummary?.attemptsNeedingReview || 0;
  const attentionItems = (() => {
    if (!overview) return [];
    const items = [];
    if (!identificationComplete) items.push(t("guardian_overview_attention_finish_baseline"));
    if (identificationComplete && !improvementUnlocked) {
      items.push(t("guardian_overview_attention_clearer_baseline"));
    }
    if (latestSession?.sentenceAnalysisProcessing) {
      items.push(t("guardian_sentence_processing_message"));
    }
    if (invalidAttempts > 0) {
      items.push(t("guardian_overview_attention_invalid_audio", { count: invalidAttempts }));
    }
    if (attemptsNeedingReview > 0) {
      items.push(t("guardian_overview_attention_sound_review", { count: attemptsNeedingReview }));
    }
    return items;
  })();

  const effectiveState = childState === "ready" ? pageRequest.state : childState;
  const effectiveError = childState === "ready" ? pageRequest.error : childError;
  const retry = childState === "ready" ? pageRequest.retry : refreshChildren;

  return (
    <div className="space-y-5">
      <GuardianPageHeader title={t("guardian_overview_title")} subtitle={t("guardian_overview_subtitle")} />

      {effectiveState !== "ready" ? (
        <GuardianRequestState
          state={effectiveState}
          error={effectiveError}
          onRetry={retry}
          onAddChild={() => navigate("/admin/students")}
        />
      ) : (
        <>
          <section aria-labelledby="guardian-current-state">
            <h3 id="guardian-current-state" className="mb-3 text-lg font-bold text-[#101828]">
              {t("guardian_overview_current_state")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <GuardianStatCard
                label={t("guardian_selected_child")}
                value={selectedChild?.fullName || t("guardian_not_available")}
                helper={selectedChild?.grade ? t("guardian_grade", { grade: selectedChild.grade }) : ""}
                tone="slate"
              />
              <GuardianStatCard
                label={t("guardian_identification")}
                value={<GuardianStatusBadge value={speech.identificationStatus || "not_started"} />}
                helper={t("guardian_first_sound_check")}
                tone="sky"
              />
              <GuardianStatCard
                label={t("guardian_training_safari")}
                value={improvementUnlocked ? t("guardian_unlocked") : t("guardian_locked")}
                helper={t("guardian_training_state_helper")}
                tone={improvementUnlocked ? "emerald" : "amber"}
              />
              <GuardianStatCard
                label={t("guardian_completed_activities")}
                value={`${speech.completedActivityIds?.length || 0}/5`}
                helper={t("guardian_activity_progress_helper")}
                tone="emerald"
              />
            </div>
          </section>

          <GuardianCard className={attentionItems.length ? "border-[#F4D7A1] bg-[#FFF9EB]" : "border-[#D8ECE3] bg-[#F8FBF8]"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#157A5A]">{t("guardian_overview_attention_title")}</p>
                <h3 className="mt-1 text-xl font-bold text-[#101828]">
                  {attentionItems.length ? t("guardian_overview_attention_found") : t("guardian_overview_attention_clear")}
                </h3>
              </div>
              <GuardianStatusBadge value={attentionItems.length ? "needs_review" : "completed"} />
            </div>
            {attentionItems.length > 0 && (
              <ul className="mt-4 grid gap-2 text-sm font-medium leading-6 text-[#6E4A0A] md:grid-cols-2">
                {attentionItems.map((item) => (
                  <li key={item} className="rounded-lg bg-white/70 px-3 py-2">{item}</li>
                ))}
              </ul>
            )}
          </GuardianCard>

          <GuardianCard className="border-[#CFE6DC] bg-white">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <p className="text-sm font-semibold text-[#157A5A]">{t("guardian_overview_next_action")}</p>
                <h3 className="mt-1 text-2xl font-bold text-[#101828]">
                  {activityTitle(recommendation.nextActivity || overview?.nextActivity) || t("guardian_waiting_for_next_activity")}
                </h3>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#5B6475]">
                  {recommendation.guardianReason || t("guardian_overview_next_action_fallback")}
                </p>
              </div>
              <GuardianButton onClick={() => navigate("/admin/speech-improvement-progress")}>
                {t("guardian_view_improvement_progress")}
              </GuardianButton>
            </div>
          </GuardianCard>

          <GuardianCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#157A5A]">{t("guardian_overview_trend_title")}</p>
                <h3 className="mt-1 text-xl font-bold text-[#101828]">{t("guardian_overview_trend_heading")}</h3>
              </div>
              <GuardianStatusBadge value={comparison?.currentTrend || "not_started"} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <GuardianStatCard label={t("guardian_timeline_baseline")} value={formatStatus(comparison?.baseline?.status, t("guardian_not_started"))} tone="slate" />
              <GuardianStatCard label={t("guardian_trail_checks")} value={`${comparison?.checkpoints?.length || 0}/3`} tone="sky" />
              <GuardianStatCard label={t("guardian_current_trend")} value={formatStatus(comparison?.currentTrend, t("guardian_waiting"))} tone="emerald" />
            </div>
          </GuardianCard>

          <GuardianCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#157A5A]">{t("guardian_overview_evidence_title")}</p>
                <h3 className="mt-1 text-xl font-bold text-[#101828]">{t("guardian_overview_evidence_heading")}</h3>
              </div>
              <GuardianButton variant="secondary" onClick={() => navigate("/admin/speech-session-history")}>
                {t("guardian_review_sessions")}
              </GuardianButton>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <GuardianStatCard label={t("guardian_valid_recordings")} value={(attempts.length || 0) - invalidAttempts} helper={t("guardian_of_total_attempts", { count: attempts.length || 0 })} tone="sky" />
              <GuardianStatCard
                label={t("guardian_word_reading")}
                value={latestSession?.wordReadingSummary?.wordReadingAccuracy === undefined ? t("guardian_not_available") : formatPercent(latestSession.wordReadingSummary.wordReadingAccuracy)}
                helper={t("guardian_correct_words", { count: latestSession?.wordReadingSummary?.correctWordCount || 0 })}
                tone="emerald"
              />
              <GuardianStatCard
                label={t("guardian_sound_patterns")}
                value={latestSession?.phonemeSummary?.meanPhonemeErrorRate === undefined ? t("guardian_not_available") : formatPercent(latestSession.phonemeSummary.meanPhonemeErrorRate)}
                helper={latestSession?.phonemeSummary?.commonErrorPattern || t("guardian_no_common_pattern")}
                tone="amber"
              />
              <GuardianStatCard label={t("guardian_attempts_to_review")} value={attemptsNeedingReview} helper={t("guardian_review_recordings_helper")} tone="slate" />
            </div>
          </GuardianCard>

          <GuardianSpeechInsightCard
            data={insightRequest.data}
            loading={insightRequest.state === "loading" && !insightRequest.data}
            error={insightRequest.error?.response?.data?.message || insightRequest.error?.message || ""}
            onRefresh={() => setInsightRefreshToken((value) => value + 1)}
            refreshing={insightRequest.state === "loading" && Boolean(insightRequest.data)}
            isSuperAdmin={isSuperAdmin}
          />

          {isSuperAdmin && modelEvaluation && (
            <GuardianCard className="border-[#D8EAF7] bg-[#F3FAFF]">
              <p className="text-sm font-semibold text-[#24516F]">{t("guardian_super_admin_model_evidence")}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <GuardianStatCard label={t("guardian_model_status")} value={modelEvaluation.status || "-"} tone="sky" />
                <GuardianStatCard label={t("guardian_reported_accuracy")} value={formatPercent(modelEvaluation.reportedMetrics?.random_forest?.accuracy)} tone="slate" />
                <GuardianStatCard label={t("guardian_reported_macro_f1")} value={formatPercent(modelEvaluation.reportedMetrics?.random_forest?.macro_f1)} tone="slate" />
              </div>
            </GuardianCard>
          )}
        </>
      )}
    </div>
  );
}

export default SpeechOverview;
