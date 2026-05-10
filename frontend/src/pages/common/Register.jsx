import { Link } from "react-router-dom";
import logo from "../../assets/lexiland/lexiland-logo.png";

function Register() {
  return (
    <main className="premium-page min-h-screen px-4 py-5 text-slate-950 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-4xl items-center justify-center">
        <div className="premium-card w-full rounded-[2.5rem] p-6 text-center sm:p-10">
          <Link to="/" className="mx-auto inline-flex items-center gap-3">
            <img
              src={logo}
              alt="LexiLand"
              className="h-14 w-14 rounded-2xl bg-white object-cover p-1 shadow-sm ring-1 ring-slate-100"
            />
            <span className="text-2xl font-black tracking-tight">LexiLand</span>
          </Link>

          <div className="mx-auto mt-10 max-w-2xl">
            <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-sky-100 text-3xl font-black text-sky-700">
              ID
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Child accounts are created by guardians.
            </h1>
            <p className="mt-5 text-lg font-bold leading-8 text-slate-500">
              Ask your guardian for your child username. Then return to Child Login and start your adventure.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/login"
                className="rounded-3xl bg-gradient-to-r from-slate-950 to-teal-700 px-6 py-4 text-base font-black text-white shadow-lg shadow-teal-100 transition hover:-translate-y-0.5"
              >
                Back to Child Login
              </Link>
              <Link
                to="/admin/login"
                className="rounded-3xl border border-slate-200 bg-white px-6 py-4 text-base font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                Guardian Console
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Register;
