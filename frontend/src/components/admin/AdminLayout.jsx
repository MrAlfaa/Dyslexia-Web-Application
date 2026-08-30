import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Code2,
  CreditCard,
  History,
  LogOut,
  Menu,
  ScanSearch,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useGuardianChild } from "../../contexts/GuardianChildContext";
import ChildSelector from "../guardian/ui/ChildSelector";
import GuardianRequestState from "../guardian/ui/GuardianRequestState";
import { isSelfManagedChildStateRoute } from "./adminLayoutRouteState.utils";

const SIDEBAR_KEY = "lexilandGuardianSidebarCollapsed";

const Icon = ({ type }) => {
  const icons = {
    children: UsersRound,
    subscription: CreditCard,
    identify: ScanSearch,
    improve: TrendingUp,
    history: History,
    dev: Code2,
    menu: Menu,
    close: X,
    logout: LogOut,
  };
  const Glyph = icons[type] || ScanSearch;
  return <Glyph aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2} />;
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
      className={`guardian-sidebar flex h-full flex-col border-r text-white transition-all duration-300 ${
        collapsed && !mobile ? "w-[72px]" : "w-[244px]"
      }`}
    >
      <div className="guardian-sidebar__brand border-b border-white/[0.07] p-3">
        <div className={`flex items-center ${collapsed && !mobile ? "flex-col justify-center" : "justify-between"} gap-3`}>
          <Link to="/admin/students" onClick={handleNavigation} className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F5B84B] text-sm font-extrabold text-[#10241E]">
              L
            </div>
            {(!collapsed || mobile) && (
              <div className="min-w-0">
                <h2 className="text-sm font-bold leading-tight">LexiLand</h2>
                <p className="text-[11px] font-medium text-[#AFC7BD]">Guardian Console</p>
              </div>
            )}
          </Link>
          {mobile ? (
            <button
              type="button"
              onClick={onMobileClose}
              data-mobile-drawer-close={mobile ? "true" : undefined}
              className="guardian-focus guardian-sidebar__menu-button flex h-10 w-10 items-center justify-center rounded-lg text-[#DCEBE5]"
              aria-label="Close menu"
            >
              <Icon type="close" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onCollapseToggle}
              className="guardian-focus guardian-sidebar__menu-button hidden h-10 w-10 items-center justify-center rounded-lg text-[#DCEBE5] transition lg:flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon type="menu" />
            </button>
          )}
        </div>
        {(!collapsed || mobile) && (
          <div className="mt-3 inline-flex rounded-md border border-[#D9A63D]/30 bg-[#F5B84B]/10 px-2.5 py-1 text-[10px] font-semibold uppercase text-[#F6CD7C]">
            {isSuperAdmin ? "Super Admin" : "Guardian"}
          </div>
        )}
      </div>

      <nav ref={sidebarNavRef} className="guardian-sidebar__nav flex-1 space-y-2.5 overflow-y-auto px-2.5 py-3">
        {menuSections.map((section, sectionIndex) => (
          <div
            key={section.title}
            data-nav-section={section.title}
            className={`space-y-1 ${sectionIndex ? "border-t border-white/[0.055] pt-2.5" : ""}`}
          >
            {(!collapsed || mobile) && (
              <h3 className="guardian-sidebar__section-label px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
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
                  className={`guardian-sidebar__link group relative flex min-h-10 items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-2 text-[13px] font-semibold transition ${
                    isActive
                      ? "bg-[#F8FAF9] text-[#17211E] shadow-[0_5px_16px_rgba(0,0,0,0.16)]"
                      : "text-[#C0CEC8] hover:bg-white/[0.065] hover:text-white"
                  } ${collapsed && !mobile ? "justify-center" : ""}`}
                >
                  <span className={isActive ? "text-[#157A5A]" : "text-[#78BBA4]"}>
                    <Icon type={getIconType(item)} />
                  </span>
                  {(!collapsed || mobile) && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="guardian-sidebar__footer border-t border-white/[0.07] p-2.5">
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? "Logout" : undefined}
          className="guardian-focus flex min-h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-[13px] font-semibold text-[#F1D4D0] transition hover:border-[#E58D82]/30 hover:bg-[#E96555]/10 hover:text-white"
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
          { name: "Speech Support Results", path: "/admin/speech-support" },
        ],
      },
    ];

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
            <div className="flex min-h-[58px] items-center justify-between gap-4 px-4 py-2 md:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  ref={mobileMenuButtonRef}
                  onClick={() => setMobileOpen(true)}
                  className="guardian-focus flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF7F0] text-[#0F5F48] lg:hidden"
                  aria-label="Open Guardian Console menu"
                >
                  <Icon type="menu" />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#101828]">{isSuperAdmin ? "Administration Console" : "Guardian Console"}</p>
                  <p className="hidden text-[11px] font-medium text-[#667085] sm:block">
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
                  <p className="truncate text-[13px] font-semibold text-[#101828]">{user.fullName || "Guardian"}</p>
                  <p className="truncate text-[11px] font-medium text-[#667085]">{user.email || "LexiLand account"}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF7F0] text-sm font-bold text-[#0F5F48] ring-1 ring-[#D8ECE3]">
                  {(user.fullName || "G").charAt(0).toUpperCase()}
                </div>
              </div>
            </div>

            {(childRequestState === "ready" || !isSelfManagedChildRoute) && (
              <div className="border-t border-[#EDF1EF] bg-[#F8FAF9] px-4 py-1.5 md:px-5">
                {childRequestState === "ready" ? (
                  <div className="mx-auto flex min-h-10 w-full max-w-[1320px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E7F4ED] text-xs font-bold text-[#0F5F48]">
                        {(selectedChild?.fullName || "C").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#667085]">Monitoring child</p>
                        <p className="truncate text-[13px] font-semibold text-[#101828]">
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
                  <div className="mx-auto w-full max-w-[1320px]">
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

          <main className="guardian-workspace relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-5 lg:p-6">
            <div className="mx-auto w-full max-w-[1320px] animate-fade-up">{children}</div>
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
