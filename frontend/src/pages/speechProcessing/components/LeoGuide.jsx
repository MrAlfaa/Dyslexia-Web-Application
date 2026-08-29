import { useTranslation } from "react-i18next";
import leo from "../../../assets/lexiland/leo-lion.webp";

function LeoGuide({ title, message, compact = false }) {
  const { t } = useTranslation("sp");

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
          alt={t("leo_the_lion")}
          className={`${compact ? "h-20 w-20" : "h-28 w-28"} object-contain`}
        />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            {t("leo_the_lion")}
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{title || t("hi_explorer")}</h2>
        </div>
      </div>
      <div className="relative mt-5 rounded-3xl bg-emerald-50 px-5 py-4 text-base font-bold leading-7 text-emerald-950 ring-1 ring-emerald-100">
        {message || t("lets_find_sound_path")}
      </div>
    </aside>
  );
}

export default LeoGuide;
