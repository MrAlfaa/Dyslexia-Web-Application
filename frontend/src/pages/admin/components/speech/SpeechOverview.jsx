import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getAdminStudents, getGuardianSpeechOverview } from "../../../../services/admin/api";
import GuardianPageHeader from "../../../../components/guardian/ui/GuardianPageHeader";
import GuardianCard from "../../../../components/guardian/ui/GuardianCard";
import GuardianStatCard from "../../../../components/guardian/ui/GuardianStatCard";
import GuardianEmptyState from "../../../../components/guardian/ui/GuardianEmptyState";
import GuardianStatusBadge from "../../../../components/guardian/ui/GuardianStatusBadge";
import ChildSelector from "../../../../components/guardian/ui/ChildSelector";
import GuardianButton from "../../../../components/guardian/ui/GuardianButton";
import { activityTitle, formatPercent } from "./speechGuardianUtils";

const defaultActivities = [
  "First Sound Hunt",
  "Echo Roar",
  "Robot Word Safari",
  "Sound Twins",
  "Story Roar Trail",
];

const supportSignalText = {
  low_support: "Low Support",
  medium_support: "Medium Support",
  high_support: "High Support",
};

const formatModelScore = (value) =>
  value === undefined || value === null || value === "" ? "-" : Number(value).toFixed(2);

function SpeechOverview() {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const selectedChild = useMemo(
    () => children.find((child) => child._id === selectedChildId),
    [children, selectedChildId]
  );

  useEffect(() => {
    const loadChildren = async () => {
      try {
        const response = await getAdminStudents();
        const list = response.data?.data || [];
        setChildren(list);
        setSelectedChildId(list[0]?._id || "");
      } catch (error) {
        toast.error(error.response?.data?.message || "Could not load children");
      } finally {
        setLoading(false);
      }
    };
    loadChildren();
  }, []);

  useEffect(() => {
    const loadOverview = async () => {
      if (!selectedChildId) {
        setOverview(null);
        return;
      }
      try {
        const response = await getGuardianSpeechOverview(selectedChildId);
        setOverview(response.data?.data || null);
      } catch (error) {
        setOverview(null);
        toast.error(error.response?.data?.message || "Could not load Leo overview");
      }
    };
    loadOverview();
  }, [selectedChildId]);

  if (loading) {
    return <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#EAF7F0] border-t-[#157A5A]" />;
  }

  const speech = overview?.speech || {};
  const recommendation = overview?.recommendation || {};
  const isComplete = speech.identificationStatus === "completed";
  const pathActivities = overview?.activities?.length
    ? overview.activities
    : defaultActivities.map((title, index) => ({ activityId: title, title, state: index === 0 ? "locked" : "locked" }));

  return (
    <div className="space-y-5">
      <GuardianPageHeader
        title="Leo's Sound Safari"
        subtitle="Speech-reading support overview and next practice path."
        actions={<ChildSelector childrenList={children} selectedChildId={selectedChildId} onChange={setSelectedChildId} />}
      />

      {!selectedChild ? (
        <GuardianEmptyState title="No children yet" message="Add a child profile to see Leo's speech-reading support overview." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <GuardianStatCard label="Selected Child" value={selectedChild.fullName} helper={selectedChild.username || "No username"} tone="slate" />
            <GuardianStatCard label="Identification" value={<GuardianStatusBadge value={speech.identificationStatus || "not_started"} />} helper="Leo's First Sound Check" tone="sky" />
            <GuardianStatCard label="Support Indicator" value={<GuardianStatusBadge value={overview?.supportLevel || "unknown"} type="support" />} helper={formatPercent(overview?.supportScore)} tone="amber" />
            <GuardianStatCard label="Next Activity" value={activityTitle(recommendation?.nextActivity || overview?.nextActivity)} helper={recommendation?.skillFocus || overview?.nextActivity?.skill || "Waiting"} tone="emerald" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <GuardianCard>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#157A5A]">Leo Summary</p>
                  <h3 className="mt-2 text-[22px] font-bold tracking-[-0.01em] text-[#101828]">
                    {isComplete ? "Leo found this child's sound path." : "Leo's First Sound Check is waiting."}
                  </h3>
                </div>
                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF6DF] text-lg font-bold text-[#94600A] sm:flex">
                  L
                </div>
              </div>
              <p className="mt-3 text-sm font-medium leading-6 text-[#5B6475]">
                {isComplete
                  ? recommendation?.guardianReason || "Use this support indicator with the other LexiLand checks to understand the next practice path."
                  : "Ask your child to complete the check to unlock a clearer support path."}
              </p>
              <div className="mt-4 rounded-2xl border border-[#D8EAF7] bg-[#F3FAFF] p-4">
                <p className="text-sm font-semibold text-[#24516F]">Pronunciation Support Signal</p>
                <p className="mt-1 text-sm font-medium text-[#37556D]">
                  {supportSignalText[overview?.latestSession?.pronunciationSummary?.dominantPrediction] ||
                    overview?.latestSession?.pronunciationSummary?.status ||
                    "No prototype model signal yet"}
                  {" "}· Score {formatModelScore(overview?.latestSession?.pronunciationSummary?.meanPronunciationScore)}
                </p>
              </div>
              <div className="mt-5">
                <GuardianButton
                  variant="secondary"
                  onClick={() => navigate("/admin/speech-identification-result")}
                >
                  View Identification Result
                </GuardianButton>
              </div>
            </GuardianCard>

            <GuardianCard>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#157A5A]">Training Path Preview</p>
                  <h3 className="mt-2 text-xl font-bold text-[#101828]">Leo's practice sequence</h3>
                </div>
                <GuardianButton variant="ghost" onClick={() => navigate("/admin/speech-improvement-progress")}>
                  View Progress
                </GuardianButton>
              </div>

              <div className="mt-5 space-y-3">
                {pathActivities.slice(0, 5).map((activity, index) => (
                  <div key={activity.activityId} className="flex items-center gap-3 rounded-2xl border border-[#E5EDE7] bg-[#F8FBF8] p-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
                      activity.state === "completed"
                        ? "bg-[#157A5A] text-white"
                        : activity.state === "current" || activity.state === "recommended" || activity.state === "available"
                          ? "bg-[#F5B84B] text-[#10241E]"
                          : "bg-white text-[#5B6475]"
                    }`}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#101828]">{activity.title}</p>
                      <p className="text-xs font-medium text-[#5B6475]">
                        {activity.state || "locked"} · {activity.starsEarned || activity.stars || 0} stars
                      </p>
                    </div>
                    <GuardianStatusBadge value={activity.state || "locked"} />
                  </div>
                ))}
              </div>
            </GuardianCard>
          </div>
        </>
      )}
    </div>
  );
}

export default SpeechOverview;
