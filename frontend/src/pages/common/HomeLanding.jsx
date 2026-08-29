import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ExpeditionButton from "../../components/lexiland/ExpeditionButton";
import LexiLandBrand from "../../components/lexiland/LexiLandBrand";
import jungleHero from "../../assets/lexiland/jungle-hero.webp";
import { loginStudentByUsername } from "../../services/auth/api";

function HomeLanding() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginStudentByUsername({ username: username.trim() });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("role", response.data.role);
      localStorage.setItem("studentId", response.data.userId);
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message || t("public.childLoginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#e5f3e7] font-[var(--font-child)] text-[var(--lex-ink-950)]">
      <section className="relative isolate flex min-h-[calc(100svh-68px)] overflow-hidden">
        <img
          src={jungleHero}
          alt={t("public.heroImageAlt")}
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[58%_center] sm:object-center"
        />

        <div className="mx-auto flex w-full max-w-[1440px] flex-col px-4 pb-7 pt-4 sm:px-7 sm:pb-10 sm:pt-6 lg:px-12">
          <header className="flex items-center justify-between gap-3">
            <LexiLandBrand
              href="/"
              tagline={t("public.brandTagline")}
              ariaLabel={t("public.homeAriaLabel")}
              className="rounded-xl bg-white/90 px-2.5 py-2 shadow-sm backdrop-blur-sm sm:bg-white/75"
            />
            <ExpeditionButton
              href="/admin/login"
              variant="secondary"
              icon={ShieldCheck}
              className="shrink-0 bg-white/90 shadow-sm backdrop-blur-sm"
            >
              <span className="hidden sm:inline">{t("public.guardianConsole")}</span>
              <span className="sm:hidden">{t("public.guardianShort")}</span>
            </ExpeditionButton>
          </header>

          <div className="flex flex-1 items-end py-6 sm:items-center sm:py-8">
            <div className="w-full max-w-[610px]">
              <div className="max-w-[560px] rounded-xl bg-white/90 p-4 shadow-[0_16px_45px_rgba(7,56,45,0.15)] backdrop-blur-sm sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
                <h1 className="max-w-[11ch] text-[clamp(2.35rem,6vw,5.35rem)] font-extrabold leading-[1.02]">
                  {t("public.heroTitle")}
                </h1>
                <p className="mt-3 max-w-[38rem] text-base font-semibold leading-7 text-slate-700 sm:mt-5 sm:text-lg lg:text-xl">
                  {t("public.heroDescription")}
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-4 w-full max-w-[510px] rounded-xl border border-white/90 bg-white/95 p-4 shadow-[0_20px_55px_rgba(7,56,45,0.18)] backdrop-blur-md sm:mt-7 sm:p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold sm:text-2xl">
                      {t("public.childAccess")}
                    </h2>
                    <p className="mt-1 text-sm font-medium leading-5 text-slate-600">
                      {t("public.childAccessHelp")}
                    </p>
                  </div>
                  <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[var(--lex-amber-100)] text-xl sm:flex" aria-hidden="true">
                    ★
                  </span>
                </div>

                <label htmlFor="child-username" className="mt-4 block text-sm font-bold text-slate-800">
                  {t("public.usernameLabel")}
                </label>
                <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
                  <input
                    id="child-username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder={t("public.usernamePlaceholder")}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck="false"
                    required
                    aria-describedby={error ? "child-login-error" : "child-login-help"}
                    className="min-h-12 min-w-0 flex-1 rounded-[10px] border border-[var(--lex-border)] bg-white px-4 py-3 text-base font-semibold outline-none transition placeholder:text-slate-400 focus:border-[var(--lex-sky-500)] focus:ring-4 focus:ring-sky-100"
                  />
                  <ExpeditionButton
                    type="submit"
                    disabled={loading}
                    icon={ArrowRight}
                    className="min-h-12 whitespace-nowrap"
                  >
                    {loading ? t("public.starting") : t("public.continue")}
                  </ExpeditionButton>
                </div>

                {error ? (
                  <p id="child-login-error" role="alert" className="mt-3 text-sm font-semibold text-rose-700">
                    {error}
                  </p>
                ) : (
                  <p id="child-login-help" className="mt-3 text-sm font-medium text-slate-500">
                    {t("public.usernameHelp")}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-[68px] items-center bg-[var(--lex-forest-950)] px-5 py-4 text-white" aria-label={t("public.nextBandLabel")}>
        <p className="mx-auto w-full max-w-[1344px] text-center text-sm font-semibold sm:text-base">
          {t("public.nextBandText")}
        </p>
      </section>
    </main>
  );
}

export default HomeLanding;
