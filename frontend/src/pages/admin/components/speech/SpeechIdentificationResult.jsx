import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getAdminStudents, getGuardianSpeechIdentificationResult, getSpeechSystemActivities } from "../../../../services/admin/api";
import GuardianPageHeader from "../../../../components/guardian/ui/GuardianPageHeader";
import GuardianCard from "../../../../components/guardian/ui/GuardianCard";
import GuardianStatCard from "../../../../components/guardian/ui/GuardianStatCard";
import GuardianEmptyState from "../../../../components/guardian/ui/GuardianEmptyState";
import GuardianStatusBadge from "../../../../components/guardian/ui/GuardianStatusBadge";
import ChildSelector from "../../../../components/guardian/ui/ChildSelector";
import { activityById, formatDate, formatPercent } from "./speechGuardianUtils";

const supportSignalText = {
  low_support: "Low Support",
  medium_support: "Medium Support",
  high_support: "High Support",
};

const formatModelScore = (value) =>
  value === undefined || value === null || value === "" ? "-" : Number(value).toFixed(2);

function SpeechIdentificationResult() {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [activities, setActivities] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const selectedChild = useMemo(
    () => children.find((child) => child._id === selectedChildId),
    [children, selectedChildId]
  );

  useEffect(() => {
    const loadBase = async () => {
      try {
        const [childrenRes, activitiesRes] = await Promise.all([getAdminStudents(), getSpeechSystemActivities()]);
        const list = childrenRes.data?.data || [];
        setChildren(list);
        setSelectedChildId(list[0]?._id || "");
        setActivities(activitiesRes.data?.data || []);
      } catch (error) {
        toast.error(error.response?.data?.message || "Could not load identification result");
      } finally {
        setLoading(false);
      }
    };
    loadBase();
  }, []);

  useEffect(() => {
    const loadResult = async () => {
      if (!selectedChildId) {
        setResult(null);
        return;
      }
      try {
        const response = await getGuardianSpeechIdentificationResult(selectedChildId);
        setResult(response.data?.data || null);
      } catch (error) {
        setResult(null);
        toast.error(error.response?.data?.message || "Could not load Leo's result");
      }
    };
    loadResult();
  }, [selectedChildId]);

  if (loading) {
    return <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#EAF7F0] border-t-[#157A5A]" />;
  }

  const recommendedIds = result?.recommendedActivityIds || [];

  return (
    <div className="space-y-5">
      <GuardianPageHeader
        title="Identification Result"
        subtitle="Review Leo's First Sound Check and the recommended speech-reading practice path."
        actions={<ChildSelector childrenList={children} selectedChildId={selectedChildId} onChange={setSelectedChildId} />}
      />

      {!selectedChild ? (
        <GuardianEmptyState title="No children yet" message="Add a child to review Leo's Sound Safari results." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <GuardianCard>
            <p className="text-sm font-semibold text-[#157A5A]">Result Summary</p>
            <h3 className="mt-2 text-2xl font-bold tracking-[-0.01em] text-[#101828]">
              {result?.identificationStatus === "completed"
                ? "Leo found this child's speech-reading support path."
                : "Leo's First Sound Check is not complete yet."}
            </h3>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <GuardianStatCard label="Status" value={<GuardianStatusBadge value={result?.identificationStatus || "not_started"} />} tone="sky" />
              <GuardianStatCard label="Support Level" value={<GuardianStatusBadge value={result?.supportLevel || "unknown"} type="support" />} tone="amber" />
              <GuardianStatCard label="Support Score" value={formatPercent(result?.supportScore)} helper="Placeholder indicator" tone="emerald" />
              <GuardianStatCard label="Completed" value={formatDate(result?.completedAt)} tone="slate" />
            </div>

            <div className="mt-5 rounded-2xl border border-[#D8EAF7] bg-[#F3FAFF] p-4">
              <p className="text-sm font-medium leading-6 text-[#37556D]">
                This is a speech-reading support indicator used with other LexiLand checks to plan support. It is not a clinical diagnosis.
              </p>
            </div>
          </GuardianCard>

          <div className="space-y-5">
            <GuardianCard>
              <p className="text-sm font-semibold text-[#157A5A]">Recommended Leo Activities</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {recommendedIds.length ? (
                  recommendedIds.map((id) => (
                    <span key={id} className="rounded-full border border-[#D8ECE3] bg-[#F3FBF7] px-3 py-1.5 text-sm font-semibold text-[#0F5F48]">
                      {activityById(activities, id)?.title || id}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-[#E5EDE7] bg-[#F5F7F6] px-3 py-1.5 text-sm font-semibold text-[#5B6475]">
                    No recommendation yet
                  </span>
                )}
              </div>
            </GuardianCard>

            <GuardianCard>
              <p className="text-sm font-semibold text-[#157A5A]">Latest Session</p>
              <dl className="mt-4 grid gap-3 text-sm">
                {[
                  ["Status", result?.recentSession?.status || "-"],
                  ["Model", result?.recentSession?.modelVersion || "placeholder_v1"],
                  ["Pronunciation Support Signal", supportSignalText[result?.recentSession?.pronunciationSummary?.dominantPrediction] || result?.recentSession?.pronunciationSummary?.status || "No signal"],
                  ["Prototype score", formatModelScore(result?.recentSession?.pronunciationSummary?.meanPronunciationScore)],
                  ["Model predictions", result?.recentSession?.pronunciationSummary?.validPredictionCount ?? 0],
                  ["Attempts", `${result?.attemptsSummary?.validAttemptCount || 0}/${result?.attemptsSummary?.totalAttemptCount || 0} valid`],
                  ["Good audio", result?.attemptsSummary?.audioQualitySummary?.good ?? 0],
                  ["Fair audio", result?.attemptsSummary?.audioQualitySummary?.fair ?? 0],
                  ["Invalid recordings", result?.attemptsSummary?.audioQualitySummary?.invalid ?? 0],
                  ["Completed", formatDate(result?.completedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 rounded-2xl bg-[#F8FBF8] px-4 py-3">
                    <dt className="font-medium text-[#5B6475]">{label}</dt>
                    <dd className="text-right font-semibold text-[#101828]">{value}</dd>
                  </div>
                ))}
              </dl>
            </GuardianCard>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpeechIdentificationResult;
