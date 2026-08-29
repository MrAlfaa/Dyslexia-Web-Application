import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  LogOut,
  MapPin,
  School,
  Sparkles,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getStudentProfile, updateStudentProfile } from "../../services/student/api";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import Toast from "../../components/ui/Toast";
import leo from "../../assets/lexiland/leo-lion.webp";
import logo from "../../assets/lexiland/lexiland-logo.webp";

const leoActivityTitleKeys = {
  leo_first_sound_hunt: "profile_activity_first_sound_hunt",
  leo_echo_roar: "profile_activity_echo_roar",
  leo_robot_words: "profile_activity_robot_words",
  leo_sound_twins: "profile_activity_sound_twins",
  leo_story_roar: "profile_activity_story_roar",
};

const createEmptyProfile = () => ({
  fullName: "",
  email: "",
  grade: "",
  gender: "",
  school: "",
  profilePhoto: "",
  lexilandProgress: {},
});

function Profile() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const photoInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(createEmptyProfile);
  const [initialProfile, setInitialProfile] = useState(null);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    messageKey: null,
    type: "success",
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("studentId");
    navigate("/");
  };

  const hasChanges = Boolean(
    initialProfile &&
      (profile.fullName !== initialProfile.fullName ||
        profile.grade !== initialProfile.grade ||
        profile.gender !== initialProfile.gender ||
        profile.school !== initialProfile.school ||
        profile.profilePhoto !== initialProfile.profilePhoto),
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getStudentProfile();
        const data = {
          fullName: res.data.fullName || "",
          email: res.data.email || "",
          grade: res.data.grade || "",
          gender: res.data.gender || "",
          school: res.data.school || "",
          profilePhoto: res.data.profilePhoto || "",
          lexilandProgress: res.data.lexilandProgress || {},
        };
        setProfile(data);
        setInitialProfile(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
        setToast({ show: true, message: "", messageKey: "failed_load_profile", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const showPhotoError = (messageKey, input) => {
    setToast({ show: true, message: "", messageKey, type: "error" });
    input.value = "";
  };

  const decodeImageFile = (file) =>
    new Promise((resolve, reject) => {
      const imageUrl = URL.createObjectURL(file);
      const image = new Image();
      const cleanup = () => URL.revokeObjectURL(imageUrl);

      image.onload = () => {
        const isDecoded = image.naturalWidth > 0 && image.naturalHeight > 0;
        cleanup();
        if (isDecoded) resolve();
        else reject(new Error("Image has no decodable dimensions."));
      };
      image.onerror = () => {
        cleanup();
        reject(new Error("Image decoding failed."));
      };
      image.src = imageUrl;
    });

  const readImageDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("Image reading failed."));
      reader.onabort = () => reject(new Error("Image reading was cancelled."));
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (event) => {
    const input = event.currentTarget;
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      showPhotoError("profile_image_only", input);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showPhotoError("file_too_large", input);
      return;
    }

    try {
      await decodeImageFile(file);
      const dataUrl = await readImageDataUrl(file);
      if (typeof dataUrl !== "string" || !dataUrl.startsWith(`data:${file.type};base64,`)) {
        throw new Error("Unexpected image encoding.");
      }
      setProfile((current) => ({ ...current, profilePhoto: dataUrl }));
    } catch (error) {
      console.error("Error reading profile photo:", error);
      showPhotoError("profile_image_invalid", input);
    }
  };

  const openPhotoPickerFromKeyboard = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    photoInputRef.current?.click();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasChanges || saving) return;

    setSaving(true);
    try {
      await updateStudentProfile({
        fullName: profile.fullName,
        grade: profile.grade,
        gender: profile.gender,
        school: profile.school,
        profilePhoto: profile.profilePhoto,
      });
      setInitialProfile({ ...profile });
      setToast({ show: true, message: t("profile_updated_success"), type: "success" });
    } catch (error) {
      console.error("Error updating profile:", error);
      setToast({
        show: true,
        message: error.response?.data?.message || t("failed_update_profile"),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4faf7]" aria-busy="true">
        <div className="flex flex-col items-center gap-4" role="status">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700 motion-reduce:animate-none" />
          <span className="font-semibold text-slate-600">{t("profile_loading")}</span>
        </div>
      </main>
    );
  }

  const speech = profile.lexilandProgress?.speech || {};
  const speechStatus = speech.identificationStatus || "not_started";
  const speechStatusText =
    speechStatus === "completed"
      ? t("completed")
      : speechStatus === "in_progress"
        ? t("in_progress")
        : t("not_started");
  const activityTitleKey = leoActivityTitleKeys[speech.currentActivityId];
  const nextLeoActivity = activityTitleKey
    ? t(activityTitleKey)
    : t("profile_activity_sound_practice");
  const stars = Number(speech.stars ?? speech.totalStars ?? 0) || 0;
  const summaryItems = [
    {
      icon: <Sparkles aria-hidden="true" size={18} strokeWidth={2.3} />,
      label: t("profile_summary_grade"),
      value: profile.grade ? `${t("grade")} ${profile.grade}` : t("not_set"),
    },
    {
      icon: <School aria-hidden="true" size={18} strokeWidth={2.3} />,
      label: t("profile_summary_school"),
      value: profile.school || t("profile_no_school"),
    },
    {
      icon: <Star aria-hidden="true" size={18} strokeWidth={2.3} />,
      label: t("profile_summary_stars"),
      value: stars,
    },
    {
      icon: <CheckCircle2 aria-hidden="true" size={18} strokeWidth={2.3} />,
      label: t("profile_summary_leo_status"),
      value: speechStatusText,
    },
    {
      icon: <MapPin aria-hidden="true" size={18} strokeWidth={2.3} />,
      label: t("profile_summary_next_activity"),
      value: nextLeoActivity,
    },
  ];

  return (
    <main className="child-game-shell min-h-screen bg-[#f4faf7] text-slate-950">
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <nav className="mb-5 flex min-h-12 items-center justify-between gap-3" aria-label={t("profile_navigation")}>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 text-sm font-extrabold text-emerald-900 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
          >
            <ArrowLeft aria-hidden="true" size={19} strokeWidth={2.5} />
            <span>{t("back_to_dashboard")}</span>
          </button>
          <LanguageSwitcher />
        </nav>

        <section
          data-profile-region="identity"
          className="relative isolate overflow-hidden rounded-lg bg-[#064e3b] px-5 py-7 text-white shadow-[0_18px_50px_rgba(6,78,59,0.18)] sm:px-8 lg:px-10"
        >
          <div className="relative z-10 grid items-center gap-6 md:grid-cols-[auto_1fr_180px]">
            <div className="relative mx-auto md:mx-0">
              <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border-4 border-amber-200 bg-emerald-700 shadow-lg sm:h-36 sm:w-36">
                <span className="text-5xl font-extrabold" aria-hidden="true">
                  {profile.fullName?.charAt(0).toUpperCase() || "L"}
                </span>
                {profile.profilePhoto ? (
                  <img
                    src={profile.profilePhoto}
                    alt={t("profile_photo")}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.hidden = true;
                    }}
                  />
                ) : null}
              </div>
              <label
                htmlFor="profile-photo-input"
                role="button"
                tabIndex={0}
                onKeyDown={openPhotoPickerFromKeyboard}
                className="absolute -bottom-3 -right-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-amber-300 px-3 text-sm font-extrabold text-amber-950 shadow-md ring-4 ring-[#064e3b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200"
                aria-label={t("profile_photo_action")}
              >
                <Camera aria-hidden="true" size={18} strokeWidth={2.5} />
                <span className="hidden sm:inline">{t("upload_photo")}</span>
              </label>
              <input
                ref={photoInputRef}
                id="profile-photo-input"
                type="file"
                tabIndex={-1}
                className="sr-only"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
              />
            </div>

            <div className="min-w-0 text-center md:text-left">
              <div className="mb-4 inline-flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-[#064e3b]">
                <img src={logo} alt="" className="h-9 w-9 rounded-md object-cover" aria-hidden="true" />
                <span className="text-lg font-extrabold">LexiLand</span>
              </div>
              <h1 className="break-words text-3xl font-extrabold leading-tight sm:text-4xl">
                {profile.fullName || t("not_set")}
              </h1>
              <p className="mt-2 text-base font-semibold text-emerald-100">
                {t("profile_identity_subtitle", {
                  grade: profile.grade || t("not_set"),
                })}
              </p>
              <p className="mt-3 break-all text-sm text-emerald-100/85">
                {profile.email || t("readonly_email")}
              </p>
            </div>

            <img
              src={leo}
              alt={t("profile_leo_alt")}
              className="mx-auto hidden max-h-44 w-auto object-contain md:block"
            />
          </div>
        </section>

        <section
          data-profile-region="summary"
          className="mt-8 border-y border-slate-200 bg-white/60"
          aria-labelledby="profile-summary-title"
        >
          <h2 id="profile-summary-title" className="sr-only">{t("profile_summary")}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5">
            {summaryItems.map(({ icon, label, value }, index) => (
              <div
                key={label}
                className={`min-w-0 px-4 py-5 ${
                  index > 0 ? "border-t border-slate-200 sm:border-l lg:border-t-0" : ""
                } ${index === 2 ? "sm:border-l-0 lg:border-l" : ""} ${
                  index === 4 ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div className="flex items-center gap-2 text-emerald-800">
                  {icon}
                  <p className="text-xs font-bold text-slate-500">{label}</p>
                </div>
                <p className="mt-2 break-words text-base font-extrabold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section data-profile-region="edit" className="mx-auto mt-10 max-w-4xl" aria-labelledby="profile-edit-title">
          <div className="mb-6">
            <p className="text-sm font-bold text-emerald-700">{t("profile_learning_card")}</p>
            <h2 id="profile-edit-title" className="mt-1 text-2xl font-extrabold text-slate-950 sm:text-3xl">
              {t("profile_account_card")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
              {t("profile_form_hint")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-x-5 gap-y-6 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">{t("full_name")}</span>
              <input
                type="text"
                name="fullName"
                value={profile.fullName}
                onChange={handleChange}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                placeholder={t("enter_full_name")}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">{t("email_address")}</span>
              <input
                type="email"
                value={profile.email}
                readOnly
                className="mt-2 min-h-11 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-4 text-base text-slate-500 outline-none"
                aria-describedby="profile-email-hint"
              />
              <span id="profile-email-hint" className="mt-1 block text-xs font-medium text-slate-500">
                {t("readonly_email")}
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">{t("grade")}</span>
              <select
                name="grade"
                value={profile.grade}
                onChange={handleChange}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                required
              >
                <option value="" disabled>{t("select_grade")}</option>
                {[2, 3, 4, 5].map((grade) => (
                  <option key={grade} value={String(grade)}>{t("grade")} {grade}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">{t("gender")}</span>
              <select
                name="gender"
                value={profile.gender}
                onChange={handleChange}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="">{t("not_set")}</option>
                <option value="male">{t("male")}</option>
                <option value="female">{t("female")}</option>
                <option value="other">{t("other")}</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-bold text-slate-700">{t("school")}</span>
              <input
                type="text"
                name="school"
                value={profile.school}
                onChange={handleChange}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                placeholder={t("enter_school_name")}
              />
            </label>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 md:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-5 text-sm font-extrabold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
              >
                <LogOut aria-hidden="true" size={18} strokeWidth={2.4} />
                {t("logout_account")}
              </button>
              <button
                type="submit"
                disabled={saving || !hasChanges}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-6 text-base font-extrabold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
              >
                {saving ? t("saving_changes") : t("save_profile_changes")}
              </button>
            </div>
          </form>
        </section>
      </div>

      {toast.show ? (
        <Toast
          message={toast.messageKey ? t(toast.messageKey) : toast.message}
          type={toast.type}
          onClose={() => setToast((current) => ({ ...current, show: false }))}
        />
      ) : null}
    </main>
  );
}

export default Profile;
