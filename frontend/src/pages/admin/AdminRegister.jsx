import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Eye, EyeOff, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AuthShell from "../../components/lexiland/AuthShell";
import ExpeditionButton from "../../components/lexiland/ExpeditionButton";
import guardianBackground from "../../assets/lexiland/guardian-console-bg.webp";
import { adminRegister } from "../../services/admin/api";

const AdminRegister = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const { fullName, email, password } = formData;
      const response = await adminRegister({ fullName, email, password });

      if (response.data.success) {
        toast.success(t("auth.register.success"));
        navigate("/admin/login");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t("auth.register.failure"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <AuthShell
        title={t("auth.register.title")}
        description={t("auth.register.description")}
        brandTagline={t("auth.guardianConsole")}
        mediaDescription={t("auth.register.mediaDescription")}
        workspaceLabel={t("auth.workspaceLabel")}
        media={<img src={guardianBackground} alt="" />}
        secondaryAction={(
          <div className="flex flex-wrap gap-2">
            <ExpeditionButton href="/" variant="quiet" icon={ArrowLeft}>
              {t("auth.backHome")}
            </ExpeditionButton>
            <ExpeditionButton href="/admin/login" variant="secondary">
              {t("auth.loginLink")}
            </ExpeditionButton>
          </div>
        )}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="guardian-register-name" className="mb-2 block text-sm font-bold text-slate-800">
              {t("auth.fullNameLabel")}
            </label>
            <input
              id="guardian-register-name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              autoComplete="name"
              placeholder={t("auth.fullNamePlaceholder")}
              className="min-h-12 w-full rounded-[10px] border border-[var(--lex-border)] bg-[var(--lex-surface-muted)] px-4 py-3 text-base font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--lex-forest-700)] focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label htmlFor="guardian-register-email" className="mb-2 block text-sm font-bold text-slate-800">
              {t("auth.emailLabel")}
            </label>
            <input
              id="guardian-register-email"
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
            <label htmlFor="guardian-register-password" className="mb-2 block text-sm font-bold text-slate-800">
              {t("auth.passwordLabel")}
            </label>
            <div className="relative">
              <input
                id="guardian-register-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
                aria-describedby="guardian-password-help"
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
            <p id="guardian-password-help" className="mt-2 text-sm font-medium text-slate-500">
              {t("auth.register.passwordHelp")}
            </p>
          </div>

          <ExpeditionButton
            type="submit"
            disabled={isLoading}
            icon={UserPlus}
            className="min-h-12 w-full"
          >
            {isLoading ? t("auth.register.submitting") : t("auth.register.submit")}
          </ExpeditionButton>
        </form>

        <p className="mt-6 text-center text-sm font-medium text-slate-600">
          {t("auth.register.hasAccount")} {" "}
          <Link
            to="/admin/login"
            className="inline-flex min-h-11 items-center px-1 font-bold text-[var(--lex-forest-700)] underline-offset-4 hover:underline"
          >
            {t("auth.register.loginLink")}
          </Link>
        </p>
      </AuthShell>
    </>
  );
};

export default AdminRegister;
