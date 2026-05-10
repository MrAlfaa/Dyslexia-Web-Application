import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { adminRegister } from "../../services/admin/api";
import logo from "../../assets/lexiland/lexiland-logo.png";

const plans = [
  { value: "individual", label: "Individual", limit: "1 child" },
  { value: "plus", label: "Plus", limit: "5 children" },
  { value: "premium", label: "Premium", limit: "100 children" },
];

const AdminRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "school admin",
    subscriptionPlan: "individual",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await adminRegister(formData);
      if (response.data.success) {
        toast.success("Guardian account created");
        navigate("/admin/login");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4 py-5 text-slate-950 sm:px-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <section className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-5xl items-center justify-center">
        <div className="absolute left-10 top-12 h-32 w-32 rounded-full bg-lime-200/45 blur-3xl" />
        <div className="absolute bottom-14 right-12 h-40 w-40 rounded-full bg-teal-200/50 blur-3xl" />

        <div className="w-full overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/75 p-6 shadow-2xl shadow-emerald-100/70 backdrop-blur sm:p-10 lg:p-12">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3">
              <img
                src={logo}
                alt="LexiLand"
                className="h-12 w-12 rounded-2xl bg-white object-cover p-1 shadow-sm ring-1 ring-emerald-100"
              />
              <span className="text-xl font-black tracking-tight sm:text-2xl">
                LexiLand
              </span>
            </Link>
            <div className="flex flex-wrap gap-3 text-sm font-extrabold">
              <Link to="/" className="rounded-full bg-slate-100 px-4 py-2 text-slate-700 transition hover:bg-slate-200">
                Back to LexiLand
              </Link>
              <Link to="/login" className="rounded-full bg-emerald-50 px-4 py-2 text-emerald-700 transition hover:bg-emerald-100">
                Child Login
              </Link>
            </div>
          </header>

          <div className="mt-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-2xl font-black text-emerald-700 ring-1 ring-emerald-100">
                GC
              </div>
              <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Guardian Registration
              </h1>
              <p className="mt-4 max-w-md text-lg font-bold leading-8 text-slate-500">
                Create access to the Guardian Console and monitor your child's LexiLand journey.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white/85 p-5 shadow-sm ring-1 ring-emerald-100 sm:p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-black text-slate-700">Full Name</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base font-bold outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" name="fullName" value={formData.fullName} onChange={handleChange} required placeholder="Guardian name" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-black text-slate-700">Email Address</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base font-bold outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="guardian@example.com" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">Password</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base font-bold outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="Minimum 8 characters" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">Plan</label>
                  <select className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base font-bold outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" name="subscriptionPlan" value={formData.subscriptionPlan} onChange={handleChange}>
                    {plans.map((plan) => (
                      <option key={plan.value} value={plan.value}>{plan.label}: {plan.limit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="mt-6 w-full rounded-3xl bg-gradient-to-r from-emerald-700 to-teal-600 px-5 py-4 text-base font-black text-white shadow-xl shadow-emerald-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70">
                {isLoading ? "Creating..." : "Create Guardian Account"}
              </button>

              <p className="mt-5 text-center text-sm font-bold text-slate-500">
                Already have access?{" "}
                <Link to="/admin/login" className="font-black text-emerald-700 hover:text-emerald-900">
                  Guardian Console login
                </Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AdminRegister;
