import LeoActivityCard from "./LeoActivityCard";

function LeoTrainingMap({ activities, onSelect, locked, recommendation }) {
  return (
    <section className="rounded-[2.5rem] bg-white/80 p-5 shadow-2xl shadow-emerald-100/60 ring-1 ring-white/80 backdrop-blur sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">
            Jungle Path
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Training Safari Map</h2>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-600">
            Follow Leo through sound games, robot words, sound twins, and story trails.
          </p>
          {recommendation?.guardianReason && (
            <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
              Leo's pick: {recommendation.guardianReason}
            </p>
          )}
        </div>
        {locked && (
          <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 ring-1 ring-amber-100">
            Waiting for full LexiLand check
          </span>
        )}
      </div>

      <div className="relative mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <div className="pointer-events-none absolute left-8 right-8 top-16 hidden h-2 rounded-full bg-gradient-to-r from-emerald-200 via-amber-200 to-rose-200 xl:block" />
        {activities.map((activity, index) => (
          <LeoActivityCard
            key={activity.activityId}
            activity={activity}
            index={index}
            disabled={locked}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

export default LeoTrainingMap;
