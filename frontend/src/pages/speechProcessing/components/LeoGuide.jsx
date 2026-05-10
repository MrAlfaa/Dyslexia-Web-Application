import leo from "../../../assets/lexiland/leo-lion.png";

function LeoGuide({ title = "Hi explorer! I'm Leo.", message, compact = false }) {
  return (
    <aside
      className={`relative overflow-hidden rounded-[2rem] bg-white/85 p-5 shadow-xl shadow-emerald-100/60 ring-1 ring-white ${
        compact ? "" : "lg:min-h-[260px]"
      }`}
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-200/50 blur-2xl" />
      <div className="relative flex items-center gap-4">
        <img
          src={leo}
          alt="Leo the Lion"
          className={`${compact ? "h-20 w-20" : "h-28 w-28"} object-contain`}
        />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            Leo the Lion
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2>
        </div>
      </div>
      <div className="relative mt-5 rounded-3xl bg-emerald-50 px-5 py-4 text-base font-bold leading-7 text-emerald-950 ring-1 ring-emerald-100">
        {message || "Let's find your sound path."}
      </div>
    </aside>
  );
}

export default LeoGuide;
