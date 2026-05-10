import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginStudentByUsername } from "../../services/auth/api";
import logo from "../../assets/lexiland/lexiland-logo.png";

function Login() {
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
    <main className="premium-page min-h-screen overflow-hidden px-4 py-5 text-slate-950 sm:px-6">
      <section className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-5xl items-center justify-center">
        <div className="absolute left-10 top-16 h-28 w-28 rounded-full bg-sky-200/45 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-32 w-32 rounded-full bg-teal-200/55 blur-3xl" />

        <div className="grid w-full overflow-hidden rounded-[2.25rem] border border-white/70 bg-white/60 shadow-2xl shadow-sky-100/60 backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr]">
          <section className="hidden p-8 lg:flex lg:flex-col lg:justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img
                src={logo}
                alt="LexiLand"
                className="h-14 w-14 rounded-2xl bg-white object-cover p-1 shadow-sm ring-1 ring-slate-100"
              />
              <span className="text-2xl font-black tracking-tight">LexiLand</span>
            </Link>

            <div className="my-10 rounded-[2rem] bg-gradient-to-br from-sky-100 via-white to-teal-100 p-6">
              <div className="rounded-[1.7rem] bg-white/85 p-6 shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">
                  LexiLand Jungle Adventure
                </p>
                <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-slate-950">
                  Start with your guardian username.
                </h2>
                <p className="mt-4 text-base font-bold leading-7 text-slate-500">
                  Ask your guardian for your username, then play short reading and sound games.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white/84 p-6 sm:p-10 lg:p-12">
            <nav className="mb-9 flex flex-wrap gap-3 text-sm font-extrabold">
              <Link
                to="/"
                className="rounded-full bg-slate-100 px-4 py-2 text-slate-700 transition hover:bg-slate-200"
              >
                Back to Home
              </Link>
              <Link
                to="/admin/login"
                className="rounded-full bg-teal-50 px-4 py-2 text-teal-700 transition hover:bg-teal-100"
              >
                Guardian Console
              </Link>
            </nav>

            <div className="mb-7">
              <h1 className="text-4xl font-black tracking-tight text-slate-950">
                Child Login
              </h1>
              <p className="mt-3 text-lg font-bold text-slate-500">
                Enter the username your guardian gave you.
              </p>
            </div>

            {/* Production should use username + PIN or guardian-controlled device login for stronger access control. */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Child Username
                </label>
                <input
                  type="text"
                  name="username"
                  required
                  placeholder="example: s003 or nimal-g3"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>

              {error && (
                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-3xl bg-gradient-to-r from-slate-950 to-teal-700 px-5 py-4 text-base font-black text-white shadow-xl shadow-teal-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Starting..." : "Start Adventure"}
              </button>
            </form>

            <p className="mt-6 rounded-3xl bg-sky-50 px-5 py-4 text-center text-sm font-bold text-slate-600">
              Ask your guardian for your username.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}

export default Login;
