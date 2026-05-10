import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SIDEBAR_KEY = "lexilandGuardianSidebarCollapsed";

const Icon = ({ type }) => {
  const paths = {
    children:
      "M17 20h5v-2a4 4 0 00-4-4h-1M9 20H3v-2a4 4 0 014-4h2m6-7a4 4 0 11-8 0 4 4 0 018 0zm6 2a3 3 0 11-6 0 3 3 0 016 0z",
    subscription:
      "M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 3h18",
    identify:
      "M12 3v2m6.36.64l-1.42 1.42M21 12h-2M5 12H3m4.06-4.94L5.64 5.64M12 19v2m4-9a4 4 0 11-8 0 4 4 0 018 0z",
    improve:
      "M4 17l6-6 4 4 6-8m0 0v6m0-6h-6",
    history:
      "M12 8v5l3 2m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    dev:
      "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
    menu: "M4 6h16M4 12h16M4 18h16",
    close: "M6 18L18 6M6 6l12 12",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  };

  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d={paths[type] || paths.identify} />
    </svg>
  );
};

const getIconType = (item) => {
  if (item.name.includes("Children")) return "children";
  if (item.name.includes("Subscription")) return "subscription";
  if (item.name.includes("Progress") || item.name.includes("Improve")) return "improve";
  if (item.name.includes("History")) return "history";
  if (item.dev) return "dev";
  return "identify";
};

function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("adminUser") || "{}");
  const isSuperAdmin = user.role === "super admin";
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === "true");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const menuSections = useMemo(() => {
    const sections = [
      {
        title: isSuperAdmin ? "Core Administration" : "Guardian Console",
        items: [
          { name: "My Children", path: "/admin/students" },
          { name: "Subscription", path: "/admin/subscription" },
        ],
      },
      {
        title: "Working Memory",
        items: [
          { name: "Identify Results", path: "/admin/wm-identify" },
          { name: "Improve Results", path: "/admin/wm-improve" },
        ],
      },
      {
        title: "Phonological Awareness",
        items: [
          { name: "Identify Results", path: "/admin/pa-identify" },
          { name: "Improve Results", path: "/admin/pa-improve" },
        ],
      },
      {
        title: "Reading Processing",
        items: [
          { name: "Identify Results", path: "/admin/reading-identify" },
          { name: "Improve Results", path: "/admin/reading-improve" },
        ],
      },
      {
        title: "Speech Processing",
        items: [
          { name: "Speech Overview", path: "/admin/speech-overview" },
          { name: "Identification Result", path: "/admin/speech-identification-result" },
          { name: "Improvement Progress", path: "/admin/speech-improvement-progress" },
          { name: "Session History", path: "/admin/speech-session-history" },
        ],
      },
    ];

    if (isSuperAdmin) {
      sections.push({
        title: "Developer Tools",
        items: [
          { name: "Speech Support Results", path: "/admin/speech-support", dev: true },
          { name: "Data Collection", path: "/admin/speech-data-collection", dev: true },
          { name: "Activity Assignments", path: "/admin/speech-assignments", dev: true },
          { name: "Prompt Bank", path: "/admin/speech-prompt-bank", dev: true },
          { name: "Identify Results", path: "/admin/speech-identify", dev: true },
          { name: "Improve Results", path: "/admin/speech-improve", dev: true },
        ],
      });
    }

    return sections;
  }, [isSuperAdmin]);

  const pageTitle = useMemo(() => {
    for (const section of menuSections) {
      const match = section.items.find((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));
      if (match) return match.name;
    }
    return "Guardian Console";
  }, [location.pathname, menuSections]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/admin/login");
  };

  const Sidebar = ({ mobile = false }) => (
    <aside
      className={`flex h-full flex-col border-r border-white/8 bg-[#10241E] text-white shadow-[12px_0_40px_rgba(16,36,30,0.14)] transition-all duration-300 ${
        collapsed && !mobile ? "w-[84px]" : "w-[288px]"
      }`}
    >
      <div className="p-4">
        <div className={`flex items-center ${collapsed && !mobile ? "flex-col justify-center" : "justify-between"} gap-3`}>
          <Link to="/admin/students" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F5B84B] text-base font-extrabold text-[#10241E] shadow-[0_10px_22px_rgba(0,0,0,0.12)]">
              L
            </div>
            {(!collapsed || mobile) && (
              <div className="min-w-0">
                <h2 className="text-base font-extrabold leading-tight">LexiLand</h2>
                <p className="text-xs font-medium text-emerald-100/80">Guardian Console</p>
              </div>
            )}
          </Link>
          {mobile ? (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="guardian-focus rounded-2xl bg-white/[0.10] p-2.5 text-emerald-50"
              aria-label="Close menu"
            >
              <Icon type="close" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="guardian-focus hidden rounded-2xl bg-white/[0.08] p-2.5 text-emerald-50 transition hover:bg-white/[0.14] lg:block"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon type="menu" />
            </button>
          )}
        </div>
        {(!collapsed || mobile) && (
          <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100">
            {isSuperAdmin ? "Super Admin" : "Guardian"}
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-5">
        {menuSections.map((section) => (
          <div key={section.title} className="space-y-2">
            {(!collapsed || mobile) && (
              <h3 className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200/58">
                {section.title}
              </h3>
            )}
            {section.items.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed && !mobile ? item.name : undefined}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-semibold transition ${
                    isActive
                      ? "bg-white text-[#10241E] shadow-[0_10px_22px_rgba(0,0,0,0.13)]"
                      : "text-emerald-50/70 hover:bg-white/[0.09] hover:text-white"
                  } ${collapsed && !mobile ? "justify-center" : ""}`}
                >
                  <span className={isActive ? "text-[#157A5A]" : "text-emerald-200/78"}>
                    <Icon type={getIconType(item)} />
                  </span>
                  {(!collapsed || mobile) && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
          className={`guardian-focus flex w-full items-center gap-3 rounded-2xl bg-white/[0.06] px-3 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/[0.16] ${
            collapsed && !mobile ? "justify-center" : "justify-center"
          }`}
        >
          <Icon type="logout" />
          {(!collapsed || mobile) && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="guardian-shell min-h-screen overflow-hidden text-[#101828]">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="flex h-screen overflow-hidden">
        <div className="hidden shrink-0 lg:block">
          <Sidebar />
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <button
              type="button"
              aria-label="Close menu overlay"
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-10">
              <Sidebar mobile />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[#E5EDE7]/80 bg-white/[0.88] px-4 py-3 shadow-[0_10px_28px_rgba(16,36,30,0.045)] backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="guardian-focus rounded-2xl bg-[#EAF7F0] p-2.5 text-[#0F5F48] lg:hidden"
                  aria-label="Open Guardian Console menu"
                >
                  <Icon type="menu" />
                </button>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-bold tracking-[-0.01em] text-[#101828]">{pageTitle}</h1>
                  <p className="hidden text-xs font-medium text-[#5B6475] sm:block">
                    {new Date().toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3">
                <div className="hidden min-w-0 text-right sm:block">
                  <p className="truncate text-sm font-semibold text-[#101828]">{user.fullName || "Guardian"}</p>
                  <p className="truncate text-xs font-medium text-[#5B6475]">{user.email || "LexiLand account"}</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF7F0] text-base font-bold text-[#0F5F48] ring-1 ring-[#D8ECE3]">
                  {(user.fullName || "G").charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </header>

          <main className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-[1200px] animate-fade-up">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
