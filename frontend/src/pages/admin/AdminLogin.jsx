import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { adminLogin } from "../../services/admin/api";
import logo from "../../assets/lexiland/lexiland-logo.png";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await adminLogin(formData);

      if (response.data.success) {
        localStorage.setItem("adminToken", response.data.token);
        localStorage.setItem("adminUser", JSON.stringify(response.data.admin));
        toast.success("Login successful");
        navigate("/admin/students");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="premium-page min-h-screen overflow-hidden px-4 py-5 text-slate-950 sm:px-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <section className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-5xl items-center justify-center">
        <div className="absolute left-8 top-14 h-36 w-36 rounded-full bg-lime-200/45 blur-3xl" />
        <div className="absolute bottom-12 right-10 h-40 w-40 rounded-full bg-teal-200/50 blur-3xl" />

        <div className="premium-card grid w-full overflow-hidden rounded-[2.5rem] lg:grid-cols-[0.88fr_1.12fr]">
          <section className="hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 p-9 text-white lg:flex lg:flex-col lg:justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img
                src={logo}
                alt="LexiLand"
                className="h-14 w-14 rounded-2xl bg-white object-cover p-1 shadow-sm"
              />
              <span className="text-2xl font-black tracking-tight">LexiLand</span>
            </Link>

            <div className="my-12">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-2xl font-black ring-1 ring-white/10">
                GC
              </div>
              <h2 className="mt-7 max-w-sm text-4xl font-black leading-tight tracking-tight">
                LexiLand Guardian Console
              </h2>
              <p className="mt-5 max-w-sm text-base font-bold leading-7 text-slate-300">
                Learning support, progress, and recommendations in one calm workspace.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {[32, 54, 42, 68, 36].map((height, index) => (
                <span
                  key={index}
                  className="w-3 rounded-full bg-gradient-to-t from-teal-400 to-sky-300"
                  style={{ height }}
                />
              ))}
            </div>
          </section>

          <section className="bg-white/86 p-6 sm:p-10 lg:p-12">
            <nav className="mb-8 flex flex-wrap gap-3 text-sm font-extrabold">
              <Link
                to="/"
                className="rounded-full bg-slate-100 px-4 py-2 text-slate-700 transition hover:bg-slate-200"
              >
                Back to Home
              </Link>
              <Link
                to="/login"
                className="rounded-full bg-sky-50 px-4 py-2 text-sky-700 transition hover:bg-sky-100"
              >
                Child Login
              </Link>
            </nav>

            <div className="mb-8">
              <img
                src={logo}
                alt="LexiLand"
                className="mb-6 h-12 w-12 rounded-2xl bg-white object-cover p-1 shadow-sm ring-1 ring-slate-100 lg:hidden"
              />
              <h1 className="text-4xl font-black tracking-tight text-slate-950">
                Guardian Console
              </h1>
              <p className="mt-3 max-w-lg text-lg font-bold leading-8 text-slate-500">
                Monitor your child's LexiLand journey and learning support progress.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="guardian@example.com"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Password"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-3xl bg-gradient-to-r from-slate-950 to-teal-700 px-5 py-4 text-base font-black text-white shadow-xl shadow-teal-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? "Opening..." : "Open Guardian Console"}
              </button>
            </form>

            <div className="mt-7 text-center text-sm font-bold text-slate-500">
              Need guardian access?{" "}
              <Link
                to="/admin/register"
                className="font-black text-teal-700 transition hover:text-teal-900"
              >
                Register guardian account
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
};

export default AdminLogin;
