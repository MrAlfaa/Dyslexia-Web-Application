import { useTranslation } from "react-i18next";
import GuardianButton from "../../../../components/guardian/ui/GuardianButton";
import GuardianCard from "../../../../components/guardian/ui/GuardianCard";
import GuardianStatusBadge from "../../../../components/guardian/ui/GuardianStatusBadge";

function GuardianSpeechInsightCard({ data, loading, error, onRefresh, refreshing, isSuperAdmin = false }) {
  const { t, i18n } = useTranslation("sp");
  const insight = data?.insight;
  const statusLabel = t(`guardian_insight_status_${data?.status || "default"}`, {
    defaultValue: t("guardian_insight_status_default"),
  });

  return (
    <GuardianCard className="overflow-hidden border-[#CFE6DC] bg-white">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-[#157A5A]">{t("guardian_insight_title")}</p>
            {data?.status && <GuardianStatusBadge value={data.status === "ready" ? "completed" : "processing"} />}
          </div>
          <h3 className="mt-2 text-2xl font-bold tracking-[-0.01em] text-[#101828]">
            {loading ? t("guardian_insight_preparing") : statusLabel}
          </h3>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#5B6475]">
            {insight?.summary || error || t("guardian_insight_fallback_message")}
          </p>
        </div>
        <GuardianButton variant="secondary" onClick={onRefresh} disabled={loading || refreshing}>
          {refreshing ? t("guardian_insight_refreshing") : t("guardian_insight_refresh")}
        </GuardianButton>
      </div>

      {insight && (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-[#D8ECE3] bg-[#F8FBF8] p-4">
              <p className="text-xs font-bold text-[#0F5F48]">{t("guardian_current_strengths")}</p>
              <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-[#315A49]">
                {(insight.strengths || []).map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </section>
            <section className="rounded-2xl border border-[#F4D7A1] bg-[#FFF9EB] p-4">
              <p className="text-xs font-bold text-[#8A5A10]">{t("guardian_next_focus")}</p>
              <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-[#6E4A0A]">
                {(insight.focusAreas || []).map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </section>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(insight.homeActivities || []).map((activity, index) => (
              <article key={`${activity.title}-${index}`} className="rounded-2xl border border-[#D8EAF7] bg-[#F3FAFF] p-4">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-base font-bold text-[#101828]">{activity.title}</h4>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#24516F] ring-1 ring-[#D8EAF7]">
                    {t("guardian_minutes", { count: activity.minutes })}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium leading-6 text-[#37556D]">{activity.instruction}</p>
              </article>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-[#E5EDE7] bg-[#F8FBF8] px-4 py-3 text-xs font-medium leading-5 text-[#5B6475] sm:flex-row sm:items-center sm:justify-between">
            <span>{insight.disclaimer}</span>
            <span>
              {t("guardian_insight_prepared_from_evidence")}
              {data.generatedAt ? ` · ${new Date(data.generatedAt).toLocaleString(i18n.resolvedLanguage)}` : ""}
            </span>
          </div>

          {isSuperAdmin && data.source && (
            <p className="mt-3 text-xs font-semibold text-[#667085]">
              {t("guardian_insight_technical_source", { source: data.source })}
            </p>
          )}
        </>
      )}
    </GuardianCard>
  );
}

export default GuardianSpeechInsightCard;
