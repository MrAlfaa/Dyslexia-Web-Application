import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Compass, Map, RotateCcw, ShieldAlert, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import ChildTopBar from "../../components/lexiland/ChildTopBar";
import ExpeditionButton from "../../components/lexiland/ExpeditionButton";
import ExpeditionDestination from "../../components/lexiland/ExpeditionDestination";
import leo from "../../assets/lexiland/leo-lion.webp";
import { getStudentProfile } from "../../services/student/api";
import { buildChildJourney, normalizeChildProfile } from "./childJourney.utils";

const activityTitleKeys = {
  leo_first_sound_hunt: "journey.activities.firstSoundHunt",
  leo_echo_roar: "journey.activities.echoRoar",
  leo_robot_words: "journey.activities.robotWords",
  leo_sound_twins: "journey.activities.soundTwins",
  leo_story_roar: "journey.activities.storyTrail",
};

const Dashboard = () => {
  const { t } = useTranslation("common");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const devUnlock = import.meta.env.VITE_LEXILAND_DEV_UNLOCK === "true";

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await getStudentProfile();
      setProfile(normalizeChildProfile(response.data));
    } catch (error) {
      console.error("Error fetching profile:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const journey = useMemo(
    () => buildChildJourney({ profile, devUnlock }),
    [profile, devUnlock],
  );
  const speechProgress = profile?.lexilandProgress?.speech || {};
  const currentMission = journey.currentMission;
  const missionActivityKey = activityTitleKeys[currentMission.currentActivityId];
  const childName = profile?.fullName || t("journey.adventurer");
  const stars = Number.isFinite(Number(speechProgress.stars))
    ? Number(speechProgress.stars)
    : 0;

  const getDescription = (destination) => {
    if (destination.id === "sp" && destination.section === "improvement") {
      return t(destination.descriptionKey, {
        activity: missionActivityKey
          ? t(missionActivityKey)
          : t("journey.activities.nextLeoGame"),
        completed: destination.completedCount,
      });
    }
    return t(destination.descriptionKey);
  };

  const renderDestination = (destination, compact = false) => (
    <ExpeditionDestination
      key={`${destination.section}-${destination.id}`}
      destination={destination}
      title={t(destination.titleKey)}
      description={getDescription(destination)}
      statusLabel={t(destination.statusKey)}
      actionLabel={destination.actionKey ? t(destination.actionKey) : undefined}
      lockReason={destination.lockReasonKey ? t(destination.lockReasonKey) : undefined}
      devPreviewLabel={t("journey.developmentPreview")}
      compact={compact}
    />
  );

  return (
    <main className="child-game-shell min-h-screen bg-[#f4faf7] text-slate-950">
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-8 pt-3 sm:px-6 lg:px-8">
        <ChildTopBar
          stars={stars}
          profileLabel={t("journey.openProfile")}
          starsAriaLabel={t("journey.starsAriaLabel", { count: stars })}
          brandTagline={t("public.brandTagline")}
        >
          <LanguageSwitcher />
        </ChildTopBar>

        <section className="mt-4 border-b border-emerald-100 pb-4">
          <div>
            <p className="text-xs font-extrabold uppercase text-emerald-700">
              {t("journey.dashboardKicker")}
            </p>
            <h1 className="mt-1 text-3xl font-black leading-tight sm:text-4xl">
              {t("journey.greeting", { name: childName })}
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {t("journey.dashboardSubtitle", { grade: profile?.grade || "-" })}
            </p>
          </div>
        </section>

        {loading ? (
          <section className="mt-5 flex min-h-52 items-center justify-center border border-emerald-100 bg-white p-6 text-center">
            <div>
              <Compass className="mx-auto h-9 w-9 animate-pulse text-emerald-700" aria-hidden="true" />
              <p className="mt-3 font-extrabold text-slate-700">{t("journey.loading")}</p>
            </div>
          </section>
        ) : loadError ? (
          <section className="mt-5 flex min-h-52 flex-col items-center justify-center border border-rose-200 bg-white p-6 text-center">
            <ShieldAlert className="h-9 w-9 text-rose-600" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-extrabold">{t("journey.loadErrorTitle")}</h2>
            <p className="mt-1 max-w-lg text-sm font-semibold text-slate-600">
              {t("journey.loadErrorDescription")}
            </p>
            <ExpeditionButton className="mt-4" icon={RotateCcw} onClick={fetchProfile}>
              {t("journey.tryAgain")}
            </ExpeditionButton>
          </section>
        ) : (
          <>
            <section className="relative mt-5 overflow-hidden rounded-xl bg-[#07382d] px-5 py-5 text-white sm:px-7 lg:grid lg:grid-cols-[1fr_180px] lg:items-center">
              <div className="relative z-10 max-w-3xl">
                <p className="flex items-center gap-2 text-xs font-extrabold uppercase text-amber-300">
                  <Compass aria-hidden="true" className="h-4 w-4" />
                  {t("journey.currentMission")}
                </p>
                <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
                  {t(currentMission.titleKey)}
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-emerald-50">
                  {getDescription(currentMission)}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {currentMission.state !== "locked" ? (
                    <ExpeditionButton
                      href={currentMission.route}
                      variant="secondary"
                      icon={ArrowRight}
                    >
                      {t(currentMission.actionKey || "journey.actions.viewSpeechPath")}
                    </ExpeditionButton>
                  ) : (
                    <span className="text-sm font-bold text-amber-100">
                      {t(currentMission.lockReasonKey)}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-sm font-extrabold text-amber-200">
                    <Star aria-hidden="true" className="h-4 w-4 fill-current" />
                    {t("journey.starsCount", { count: stars })}
                  </span>
                  {currentMission.devPreview ? (
                    <span className="text-xs font-extrabold text-violet-200">
                      {t("journey.developmentPreview")}
                    </span>
                  ) : null}
                </div>
              </div>
              <img
                src={leo}
                alt={t("journey.leoAlt")}
                className="pointer-events-none absolute -bottom-8 right-2 hidden h-48 w-48 object-contain lg:block"
              />
            </section>

            <div className="mt-6 grid gap-7 xl:grid-cols-[1.08fr_0.92fr]">
              <section aria-labelledby="identification-heading">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase text-sky-700">
                      {t("journey.identificationEyebrow")}
                    </p>
                    <h2 id="identification-heading" className="mt-1 text-2xl font-black">
                      {t("journey.identificationTitle")}
                    </h2>
                  </div>
                  <span className="hidden text-sm font-semibold text-slate-500 sm:block">
                    {t("journey.identificationHint")}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {journey.identification.map((destination) => renderDestination(destination))}
                </div>
              </section>

              <section aria-labelledby="improvement-heading">
                <div className="mb-3">
                  <p className="text-xs font-extrabold uppercase text-amber-700">
                    {t("journey.improvementEyebrow")}
                  </p>
                  <h2 id="improvement-heading" className="mt-1 text-2xl font-black">
                    {t("journey.improvementTitle")}
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {journey.improvement.map((destination) => renderDestination(destination, true))}
                </div>
              </section>
            </div>

            <aside className="mt-6 flex flex-col gap-3 border-t border-emerald-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-extrabold text-slate-900">
                  {t("journey.progressTitle")}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {t("journey.progressDescription")}
                </p>
              </div>
              <ExpeditionButton href="/speech-processing" variant="quiet" icon={Map}>
                {t("journey.viewLeoProgress")}
              </ExpeditionButton>
            </aside>
          </>
        )}
      </div>
    </main>
  );
};

export default Dashboard;
