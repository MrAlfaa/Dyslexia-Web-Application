import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AuthShell from "../../components/lexiland/AuthShell";
import ExpeditionButton from "../../components/lexiland/ExpeditionButton";
import guardianBackground from "../../assets/lexiland/guardian-console-bg.webp";
import { adminLogin } from "../../services/admin/api";

const AdminLogin = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await adminLogin(formData);

      if (response.data.success) {
        localStorage.setItem("adminToken", response.data.token);
        localStorage.setItem("adminUser", JSON.stringify(response.data.admin));
        toast.success(t("auth.login.success"));
        navigate("/admin/students");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t("auth.login.failure"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <AuthShell
        title={t("auth.login.title")}
        description={t("auth.login.description")}
        brandTagline={t("auth.guardianConsole")}
        mediaDescription={t("auth.login.mediaDescription")}
        workspaceLabel={t("auth.workspaceLabel")}
        media={<img src={guardianBackground} alt="" />}
        secondaryAction={(
          <div className="flex flex-wrap gap-2">
            <ExpeditionButton href="/" variant="quiet" icon={ArrowLeft}>
              {t("auth.backHome")}
            </ExpeditionButton>
            <ExpeditionButton href="/" variant="secondary">
              {t("auth.childAccess")}
            </ExpeditionButton>
          </div>
        )}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="guardian-login-email" className="mb-2 block text-sm font-bold text-slate-800">
              {t("auth.emailLabel")}
            </label>
            <input
              id="guardian-login-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              inputMode="email"
              placeholder={t("auth.emailPlaceholder")}
              className="min-h-12 w-full rounded-[10px] border border-[var(--lex-border)] bg-[var(--lex-surface-muted)] px-4 py-3 text-base font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--lex-forest-700)] focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label htmlFor="guardian-login-password" className="mb-2 block text-sm font-bold text-slate-800">
              {t("auth.passwordLabel")}
            </label>
            <div className="relative">
              <input
                id="guardian-login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                placeholder={t("auth.passwordPlaceholder")}
                className="min-h-12 w-full rounded-[10px] border border-[var(--lex-border)] bg-[var(--lex-surface-muted)] py-3 pl-4 pr-14 text-base font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--lex-forest-700)] focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="lex-interactive absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-[10px] text-slate-600 hover:text-[var(--lex-forest-700)]"
                aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff aria-hidden="true" size={20} /> : <Eye aria-hidden="true" size={20} />}
              </button>
            </div>
          </div>

          <ExpeditionButton
            type="submit"
            disabled={isLoading}
            icon={LogIn}
            className="min-h-12 w-full"
          >
            {isLoading ? t("auth.login.submitting") : t("auth.login.submit")}
          </ExpeditionButton>
        </form>

        <p className="mt-6 text-center text-sm font-medium text-slate-600">
          {t("auth.login.noAccount")} {" "}
          <Link
            to="/admin/register"
            className="inline-flex min-h-11 items-center px-1 font-bold text-[var(--lex-forest-700)] underline-offset-4 hover:underline"
          >
            {t("auth.login.registerLink")}
          </Link>
        </p>
      </AuthShell>
    </>
  );
};

export default AdminLogin;
