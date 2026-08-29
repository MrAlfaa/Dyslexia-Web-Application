import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useGuardianChild } from "../../contexts/GuardianChildContext";
import ChildSelector from "../guardian/ui/ChildSelector";
import GuardianRequestState from "../guardian/ui/GuardianRequestState";
import { isSelfManagedChildStateRoute } from "./adminLayoutRouteState.utils";

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

function Sidebar({
  mobile = false,
  collapsed,
  isSuperAdmin,
  menuSections,
  pathname,
  sidebarNavRef,
  onRememberScroll,
  onCollapseToggle,
  onMobileClose,
  onLogout,
}) {
  const handleNavigation = () => {
    onRememberScroll();
    if (mobile) onMobileClose();
  };

  return (
    <aside
      className={`flex h-full flex-col border-r border-white/8 bg-[#10241E] text-white transition-all duration-300 ${
        collapsed && !mobile ? "w-[84px]" : "w-[288px]"
      }`}
    >
      <div className="p-4">
        <div className={`flex items-center ${collapsed && !mobile ? "flex-col justify-center" : "justify-between"} gap-3`}>
          <Link to="/admin/students" onClick={handleNavigation} className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5B84B] text-base font-extrabold text-[#10241E]">
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
              onClick={onMobileClose}
              data-mobile-drawer-close={mobile ? "true" : undefined}
              className="guardian-focus min-h-11 min-w-11 rounded-[10px] bg-white/[0.10] p-2.5 text-emerald-50"
              aria-label="Close menu"
            >
              <Icon type="close" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onCollapseToggle}
              className="guardian-focus hidden min-h-11 min-w-11 rounded-[10px] bg-white/[0.08] p-2.5 text-emerald-50 transition hover:bg-white/[0.14] lg:block"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon type="menu" />
            </button>
          )}
        </div>
        {(!collapsed || mobile) && (
          <div className="mt-4 inline-flex rounded-lg border border-white/10 bg-white/[0.08] px-3 py-1 text-xs font-semibold text-emerald-100">
            {isSuperAdmin ? "Super Admin" : "Guardian"}
          </div>
        )}
      </div>

      <nav ref={sidebarNavRef} className="flex-1 space-y-5 overflow-y-auto px-3 pb-5">
        {menuSections.map((section) => (
          <div key={section.title} className="space-y-2">
            {(!collapsed || mobile) && (
              <h3 className="px-3 text-xs font-semibold text-emerald-200/58">
                {section.title}
              </h3>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed && !mobile ? item.name : undefined}
                  onClick={handleNavigation}
                  data-guardian-nav-active={isActive ? "true" : undefined}
                  className={`group flex min-h-11 items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-white text-[#10241E]"
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
          onClick={onLogout}
          title={collapsed ? "Logout" : undefined}
          className="guardian-focus flex min-h-11 w-full items-center justify-center gap-3 rounded-[10px] bg-white/[0.06] px-3 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/[0.16]"
        >
          <Icon type="logout" />
          {(!collapsed || mobile) && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    children: ownedChildren,
    selectedChildId,
    selectedChild,
    state: childRequestState,
    error: childRequestError,
    selectChild,
    refreshChildren,
  } = useGuardianChild();
  const user = JSON.parse(localStorage.getItem("adminUser") || "{}");
  const isSuperAdmin = user.role === "super admin";
  const normalizedPathname = location.pathname.replace(/\/+$/, "") || "/";
  const isSelfManagedChildRoute = isSelfManagedChildStateRoute(normalizedPathname);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === "true");
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarNavRef = useRef(null);
  const sidebarScrollTopRef = useRef(0);
  const mobileDrawerRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const mobileSidebarNavRef = useRef(null);
  const mobileSidebarScrollTopRef = useRef(0);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const nav = sidebarNavRef.current;
    if (!nav) return;
    const savedScrollTop = sidebarScrollTopRef.current;
    window.requestAnimationFrame(() => {
      nav.scrollTop = savedScrollTop;
      const activeItem = nav.querySelector('[data-guardian-nav-active="true"]');
      activeItem?.scrollIntoView({ block: "nearest" });
    });
  }, [location.pathname, collapsed]);

  const rememberSidebarScroll = () => {
    if (sidebarNavRef.current) {
      sidebarScrollTopRef.current = sidebarNavRef.current.scrollTop;
    }
  };

  const rememberMobileSidebarScroll = useCallback(() => {
    if (mobileSidebarNavRef.current) {
      mobileSidebarScrollTopRef.current = mobileSidebarNavRef.current.scrollTop;
    }
  }, []);

  const closeMobileDrawer = useCallback(() => {
    rememberMobileSidebarScroll();
    setMobileOpen(false);
  }, [rememberMobileSidebarScroll]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const drawer = mobileDrawerRef.current;
    const mobileNav = mobileSidebarNavRef.current;
    const opener = mobileMenuButtonRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    let focusFrame;

    document.body.style.overflow = "hidden";

    const getFocusableElements = () => {
      if (!drawer) return [];
      return Array.from(
        drawer.querySelectorAll(
          'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
    };

    focusFrame = window.requestAnimationFrame(() => {
      if (mobileNav) {
        mobileNav.scrollTop = mobileSidebarScrollTopRef.current;
        const activeItem = mobileNav.querySelector('[data-guardian-nav-active="true"]');
        activeItem?.scrollIntoView({ block: "nearest" });
      }

      const initialFocus = drawer?.querySelector('[data-mobile-drawer-close="true"]') || drawer;
      initialFocus?.focus();
    });

    const handleDrawerKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileDrawer();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        drawer?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === firstElement || !drawer?.contains(activeElement))) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && (activeElement === lastElement || !drawer?.contains(activeElement))) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleDrawerKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDrawerKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [closeMobileDrawer, mobileOpen]);

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
          { name: "Legacy Identify Results", path: "/admin/speech-identify", dev: true },
          { name: "Legacy Improve Results", path: "/admin/speech-improve", dev: true },
        ],
      });
    }

    return sections;
  }, [isSuperAdmin]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/admin/login");
  };

  return (
    <div className="guardian-shell min-h-screen overflow-hidden text-[#101828]">
      <div
        className="h-screen"
        inert={mobileOpen || undefined}
        aria-hidden={mobileOpen ? "true" : undefined}
      >
        <ToastContainer position="top-right" autoClose={3000} />

        <div className="flex h-full overflow-hidden">
        <div className="hidden shrink-0 lg:block">
          <Sidebar
            collapsed={collapsed}
            isSuperAdmin={isSuperAdmin}
            menuSections={menuSections}
            pathname={location.pathname}
            sidebarNavRef={sidebarNavRef}
            onRememberScroll={rememberSidebarScroll}
            onCollapseToggle={() => setCollapsed((value) => !value)}
            onMobileClose={closeMobileDrawer}
            onLogout={handleLogout}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[#DCE5E0] bg-white/95 backdrop-blur">
            <div className="flex min-h-[68px] items-center justify-between gap-4 px-4 py-2.5 md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  ref={mobileMenuButtonRef}
                  onClick={() => setMobileOpen(true)}
                  className="guardian-focus min-h-11 min-w-11 rounded-[10px] bg-[#EAF7F0] p-2.5 text-[#0F5F48] lg:hidden"
                  aria-label="Open Guardian Console menu"
                >
                  <Icon type="menu" />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-[#101828]">Guardian Console</p>
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF7F0] text-base font-bold text-[#0F5F48] ring-1 ring-[#D8ECE3]">
                  {(user.fullName || "G").charAt(0).toUpperCase()}
                </div>
              </div>
            </div>

            {(childRequestState === "ready" || !isSelfManagedChildRoute) && (
              <div className="border-t border-[#EDF1EF] bg-[#F8FAF9] px-4 py-2 md:px-6">
                {childRequestState === "ready" ? (
                  <div className="mx-auto flex min-h-11 w-full max-w-[1200px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#E7F4ED] text-sm font-bold text-[#0F5F48]">
                        {(selectedChild?.fullName || "C").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#667085]">Monitoring child</p>
                        <p className="truncate text-sm font-semibold text-[#101828]">
                          {selectedChild?.fullName || "Selected child"}
                          {selectedChild?.grade
                            ? ` · ${String(selectedChild.grade).toLowerCase().startsWith("grade") ? selectedChild.grade : `Grade ${selectedChild.grade}`}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <ChildSelector
                      childrenList={ownedChildren}
                      selectedChildId={selectedChildId}
                      onChange={selectChild}
                      hideLabel
                      label="Change monitored child"
                      className="w-full sm:w-[280px]"
                    />
                  </div>
                ) : (
                  <div className="mx-auto w-full max-w-[1200px]">
                    <GuardianRequestState
                      state={childRequestState}
                      error={childRequestError}
                      onRetry={refreshChildren}
                      onAddChild={() => navigate("/admin/students")}
                    />
                  </div>
                )}
              </div>
            )}
          </header>

          <main className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-[1200px] animate-fade-up">{children}</div>
          </main>
        </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close Guardian Console menu"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={closeMobileDrawer}
          />
          <div
            ref={mobileDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Guardian Console navigation"
            tabIndex={-1}
            className="relative z-10 h-full outline-none"
          >
            <div className="h-full">
              <Sidebar
                mobile
                collapsed={collapsed}
                isSuperAdmin={isSuperAdmin}
                menuSections={menuSections}
                pathname={location.pathname}
                sidebarNavRef={mobileSidebarNavRef}
                onRememberScroll={rememberMobileSidebarScroll}
                onCollapseToggle={() => setCollapsed((value) => !value)}
                onMobileClose={closeMobileDrawer}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminLayout;
