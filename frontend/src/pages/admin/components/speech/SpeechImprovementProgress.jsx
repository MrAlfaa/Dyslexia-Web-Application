import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getAdminStudents, getGuardianSpeechImprovementProgress } from "../../../../services/admin/api";
import GuardianPageHeader from "../../../../components/guardian/ui/GuardianPageHeader";
import GuardianCard from "../../../../components/guardian/ui/GuardianCard";
import GuardianStatCard from "../../../../components/guardian/ui/GuardianStatCard";
import GuardianEmptyState from "../../../../components/guardian/ui/GuardianEmptyState";
import GuardianStatusBadge from "../../../../components/guardian/ui/GuardianStatusBadge";
import ChildSelector from "../../../../components/guardian/ui/ChildSelector";
import { activityTitle, formatPercent } from "./speechGuardianUtils";

const supportSignalText = {
  low_support: "Low Support",
  medium_support: "Medium Support",
  high_support: "High Support",
};

const formatModelScore = (value) =>
  value === undefined || value === null || value === "" ? "-" : Number(value).toFixed(2);

function SpeechImprovementProgress() {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [progress, setProgress] = useState(null);
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
    const loadProgress = async () => {
      if (!selectedChildId) {
        setProgress(null);
        return;
      }
      try {
        const response = await getGuardianSpeechImprovementProgress(selectedChildId);
        setProgress(response.data?.data || null);
      } catch (error) {
        setProgress(null);
        toast.error(error.response?.data?.message || "Could not load improvement progress");
      }
    };
    loadProgress();
  }, [selectedChildId]);

  if (loading) {
    return <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#EAF7F0] border-t-[#157A5A]" />;
  }

  const activities = progress?.activities || [];
  const completedCount = progress?.completedActivityIds?.length || 0;
  const recommendation = progress?.recommendation || {};

  return (
    <div className="space-y-5">
      <GuardianPageHeader
        title="Improvement Progress"
        subtitle="Track Leo's Training Safari progress, stars, and next practice focus."
        actions={<ChildSelector childrenList={children} selectedChildId={selectedChildId} onChange={setSelectedChildId} />}
      />

      {!selectedChild ? (
        <GuardianEmptyState title="No children yet" message="Add a child to review Leo's Training Safari progress." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <GuardianStatCard label="Training Status" value={progress?.improvementUnlocked ? "Unlocked" : "Locked"} helper="LexiLand unlock state" tone={progress?.improvementUnlocked ? "emerald" : "amber"} />
            <GuardianStatCard label="Stars Earned" value={progress?.stars || 0} helper="Leo activity stars" tone="amber" />
            <GuardianStatCard label="Completed" value={`${completedCount}/${activities.length || 5}`} helper="Activities completed" tone="sky" />
            <GuardianStatCard label="Current Focus" value={progress?.weakSkillFocus || recommendation.skillFocus || "Waiting"} helper={recommendation.guardianReason || "Next skill"} tone="slate" />
          </div>

          <GuardianCard>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#157A5A]">Leo Activity Map</p>
                <h3 className="mt-1 text-xl font-bold text-[#101828]">Practice path preview</h3>
              </div>
              <GuardianStatusBadge value={progress?.improvementUnlocked ? "current" : "locked"} />
            </div>

            <div className="mt-6 overflow-x-auto pb-2">
              <div className="flex min-w-[780px] items-start gap-3">
                {activities.map((activity, index) => {
                  const active = activity.state === "current" || activity.state === "recommended" || activity.state === "available";
                  const done = activity.state === "completed";
                  return (
                    <div key={activity.activityId} className="flex flex-1 items-start gap-3">
                      <div className="min-w-0 flex-1 rounded-[20px] border border-[#E5EDE7] bg-[#F8FBF8] p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold ${
                            done ? "bg-[#157A5A] text-white" : active ? "bg-[#F5B84B] text-[#10241E]" : "bg-white text-[#5B6475]"
                          }`}
                          >
                            {index + 1}
                          </div>
                          <GuardianStatusBadge value={activity.state} />
                        </div>
                        <h4 className="mt-3 truncate text-[15px] font-bold text-[#101828]">{activity.title}</h4>
                        <p className="mt-1 truncate text-xs font-medium text-[#5B6475]">{activity.skill || activity.description}</p>
                        <p className="mt-3 text-sm font-semibold text-[#94600A]">{activity.starsEarned || activity.stars || 0} stars</p>
                        {activity.bestScore !== undefined && (
                          <p className="mt-1 text-xs font-semibold text-[#5B6475]">Best score {formatPercent(activity.bestScore)}</p>
                        )}
                      </div>
                      {index < activities.length - 1 && (
                        <div className="mt-9 h-px w-8 shrink-0 bg-[#D8ECE3]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </GuardianCard>

          <GuardianCard>
            <p className="text-sm font-semibold text-[#157A5A]">Recommendation</p>
            <h3 className="mt-2 text-xl font-bold text-[#101828]">
              {recommendation.nextActivity?.title || "Waiting for the next Leo activity"}
            </h3>
            <p className="mt-2 text-sm font-medium leading-6 text-[#5B6475]">
              {recommendation.guardianReason || "Leo will recommend the next activity after more progress is available."}
            </p>
          </GuardianCard>

          <GuardianCard>
            <p className="text-sm font-semibold text-[#157A5A]">Latest Training Session</p>
            {progress?.latestSession ? (
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <GuardianStatCard label="Activity" value={activityTitle(activities.find((activity) => activity.activityId === progress.latestSession.activityId))} tone="emerald" />
                <GuardianStatCard label="Score" value={formatPercent(progress.latestSession.supportScore)} tone="sky" />
                <GuardianStatCard label="Stars" value={progress.latestSession.starsEarned || 0} tone="amber" />
                <GuardianStatCard label="Pronunciation Signal" value={supportSignalText[progress.latestSession.pronunciationSummary?.dominantPrediction] || progress.latestSession.pronunciationSummary?.status || "No signal"} helper={`Score ${formatModelScore(progress.latestSession.pronunciationSummary?.meanPronunciationScore)}`} tone="slate" />
              </div>
            ) : (
              <GuardianEmptyState title="No training sessions yet" message="Leo's Training Safari sessions will appear after activities are played." />
            )}
          </GuardianCard>
        </>
      )}
    </div>
  );
}

export default SpeechImprovementProgress;
