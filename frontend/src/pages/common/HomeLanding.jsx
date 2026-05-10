import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginStudentByUsername } from "../../services/auth/api";
import logo from "../../assets/lexiland/lexiland-logo.png";
import jungleHero from "../../assets/lexiland/jungle-hero.png";

function LearningVisual() {
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-[560px]">
      <div className="absolute inset-8 rounded-full bg-gradient-to-br from-lime-200 via-emerald-100 to-amber-100 blur-3xl" />
      <img
        src={jungleHero}
        alt="LexiLand Jungle Adventure"
        className="relative h-full w-full rounded-[2.5rem] object-cover shadow-2xl shadow-emerald-200/60 ring-1 ring-white/70 animate-float"
      />
    </div>
  );
}

function HomeLanding() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginStudentByUsername({ username });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("role", response.data.role);
      localStorage.setItem("studentId", response.data.userId);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "We could not find that child username.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#f6f1c9,transparent_32%),linear-gradient(135deg,#efffe9,#ecfeff_48%,#fff7d7)] px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="absolute -left-24 top-28 h-72 w-72 rounded-full bg-lime-200/50 blur-3xl" />
      <div className="absolute -right-20 bottom-8 h-80 w-80 rounded-full bg-teal-200/45 blur-3xl" />

      <section className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-between gap-4 py-1">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img
              src={logo}
              alt="LexiLand"
              className="h-12 w-12 rounded-2xl bg-white object-cover p-1 shadow-sm ring-1 ring-emerald-100"
            />
            <span className="truncate text-xl font-black tracking-tight sm:text-2xl">
              LexiLand
            </span>
          </Link>
          <Link
            to="/admin/login"
            className="shrink-0 rounded-full border border-emerald-200/80 bg-white/75 px-4 py-2.5 text-sm font-extrabold text-emerald-900 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:px-5"
          >
            Guardian Console
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10 lg:py-5">
          <div className="max-w-2xl animate-fade-up">
            <p className="mb-4 text-sm font-black uppercase tracking-[0.28em] text-emerald-700">
              LexiLand Jungle Adventure
            </p>
            <h1 className="text-4xl font-black leading-[1.02] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Learn with sounds, stories, and stars
            </h1>
            <p className="mt-5 max-w-xl text-lg font-extrabold leading-8 text-slate-600 sm:text-xl">
              Dive into your learning adventure.
            </p>
            <p className="mt-3 max-w-xl text-base font-semibold leading-7 text-slate-500">
              Children play short jungle activities. Guardians monitor progress and learning support.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-7 max-w-md rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-xl shadow-emerald-100/70 backdrop-blur sm:p-6"
            >
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  Child Access
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Enter the username from your guardian.
                </p>
              </div>

              <label className="mt-5 block text-sm font-black text-slate-700">
                Child Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="example: leo-g3 or nimal-g3"
                required
                className="mt-2 w-full rounded-3xl border border-emerald-100 bg-white/90 px-5 py-4 text-base font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />

              {error && (
                <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full rounded-3xl bg-gradient-to-r from-emerald-700 to-teal-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-emerald-200/70 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Starting..." : "Start Adventure"}
              </button>
              <p className="mt-3 text-center text-sm font-bold text-slate-500">
                Need a username? Ask your guardian.
              </p>
            </form>
          </div>

          <div className="hidden lg:block">
            <LearningVisual />
          </div>
        </div>
      </section>
    </main>
  );
}

export default HomeLanding;
