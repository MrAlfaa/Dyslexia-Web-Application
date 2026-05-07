import { useState, useEffect } from "react";
import { getStudentProfile, updateStudentProfile } from "../../services/student/api";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Toast from "../../components/ui/Toast";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";

function Profile() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    grade: "",
    gender: "",
    school: "",
    profilePhoto: "",
  });
  const [initialProfile, setInitialProfile] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("studentId");
    navigate("/");
  };

  const hasChanges = initialProfile && (
    profile.fullName !== initialProfile.fullName ||
    profile.grade !== initialProfile.grade ||
    profile.gender !== initialProfile.gender ||
    profile.school !== initialProfile.school ||
    profile.profilePhoto !== initialProfile.profilePhoto
  );

  useEffect(() => {
    fetchProfile();
  }, []);

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
      };
      setProfile(data);
      setInitialProfile(data);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setToast({ show: true, message: t("failed_load_profile"), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (optional but recommended)
      if (file.size > 5 * 1024 * 1024) {
        setToast({ show: true, message: t("file_too_large"), type: "error" });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, profilePhoto: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    } catch (err) {
      console.error("Error updating profile:", err);
      setToast({ 
        show: true, 
        message: err.response?.data?.message || "Failed to update profile.", 
        type: "error" 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Navigation */}
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-8 flex items-center text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("back_to_dashboard")}
        </button>

        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-indigo-100">
          <div className="md:flex">
            {/* Sidebar / Photo Section */}
            <div className="md:w-1/3 bg-indigo-600 p-8 flex flex-col items-center justify-center text-white">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl bg-indigo-500 flex items-center justify-center">
                  {profile.profilePhoto ? (
                    <img
                      src={profile.profilePhoto}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "https://ui-avatars.com/api/?name=" + profile.fullName + "&background=random";
                      }}
                    />
                  ) : (
                    <span className="text-4xl font-bold">
                      {profile.fullName?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Upload Button overlay */}
                <label className="absolute bottom-0 right-0 bg-white text-indigo-600 p-2 rounded-full shadow-lg cursor-pointer hover:bg-indigo-50 transition-colors border border-indigo-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              <h2 className="mt-6 text-2xl font-bold text-center">{profile.fullName}</h2>
              <p className="mt-2 text-indigo-100 opacity-80">{profile.email}</p>
              <div className="mt-4 px-4 py-1 bg-white/20 rounded-full text-sm font-semibold uppercase tracking-widest">
                {profile.grade ? `${t("grade")} ${profile.grade}` : t("not_set")}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="mt-12 flex items-center text-indigo-100 hover:text-white transition-all font-bold text-sm bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl border border-white/20"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t("logout_account")}
              </button>
            </div>

            {/* Main Form Section */}
            <div className="md:w-2/3 p-8 md:p-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">{t("hello_this_is_profile")}</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t("full_name")}</label>
                  <input
                    type="text"
                    name="fullName"
                    value={profile.fullName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-800 bg-gray-50/50"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                {/* Email - READONLY */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t("email_address")}</label>
                  <input
                    type="email"
                    value={profile.email}
                    readOnly
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-100 text-gray-500 cursor-not-allowed outline-none"
                  />
                </div>

                {/* Grade */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t("grade")}</label>
                  <select
                    name="grade"
                    value={profile.grade}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-800 bg-gray-50/50 appearance-none"
                    required
                  >
                    <option value="" disabled>{t("select_grade")}</option>
                    <option value="2">{t("grade")} 2</option>
                    <option value="3">{t("grade")} 3</option>
                    <option value="4">{t("grade")} 4</option>
                  </select>
                </div>
                
                {/* Gender */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t("gender")}</label>
                  <select
                    name="gender"
                    value={profile.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-800 bg-gray-50/50 appearance-none"
                  >
                    <option value="">{t("not_set")}</option>
                    <option value="male">{t("male")}</option>
                    <option value="female">{t("female")}</option>
                    <option value="other">{t("other")}</option>
                  </select>
                </div>

                {/* School */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t("school")}</label>
                  <input
                    type="text"
                    name="school"
                    value={profile.school}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-800 bg-gray-50/50"
                    placeholder="Enter your school name"
                  />
                </div>


                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={saving || !hasChanges}
                    className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transform transition-all active:scale-95 ${
                      saving || !hasChanges
                        ? "bg-gray-400 cursor-not-allowed grayscale opacity-70" 
                        : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:-translate-y-1 shadow-indigo-200"
                    }`}
                  >
                    {saving ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t("saving_changes")}
                      </span>
                    ) : (
                      t("save_profile_changes")
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast({ ...toast, show: false })} 
        />
      )}
    </div>
  );
}

export default Profile;
