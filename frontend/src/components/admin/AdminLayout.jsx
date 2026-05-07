import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const NavIcon = ({ name }) => {
  switch (name) {
    case "Student Profiles":
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
    case "WM Identify Results":
    case "PA Identify Results":
    case "Reading Identify Results":
    case "Speech Identify Results":
    case "Identify Results":
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
    case "WM Improve Results":
    case "PA Improve Results":
    case "Reading Improve Results":
    case "Speech Improve Results":
    case "Improve Results":
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
    default:
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
  }
};

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("adminUser") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/admin/login");
  };

  const menuSections = [
    {
      title: "Core Administration",
      items: [
        { name: "Student Profiles", path: "/admin/students" }
      ]
    },
    {
      title: "Working Memory",
      items: [
        { name: "Identify Results", path: "/admin/wm-identify" },
        { name: "Improve Results", path: "/admin/wm-improve" }
      ]
    },
    {
      title: "Phonological Awareness",
      items: [
        { name: "Identify Results", path: "/admin/pa-identify" },
        { name: "Improve Results", path: "/admin/pa-improve" }
      ]
    },
    {
      title: "Reading Processing",
      items: [
        { name: "Identify Results", path: "/admin/reading-identify" },
        { name: "Improve Results", path: "/admin/reading-improve" }
      ]
    },
    {
      title: "Speech Processing",
      items: [
        { name: "Identify Results", path: "/admin/speech-identify" },
        { name: "Improve Results", path: "/admin/speech-improve" }
      ]
    }
  ];

  const getPageTitle = () => {
    for (const section of menuSections) {
      for (const item of section.items) {
        if (location.pathname.includes(item.path)) {
          return `${section.title} - ${item.name}`;
        }
      }
    }
    return "Dashboard";
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Sidebar */}
      <aside className="w-80 bg-slate-900 flex flex-col transition-all duration-300 border-r border-slate-800">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Lexi World <span className="text-indigo-400">Admin</span></h2>
          </div>
          <div className="px-2 py-1 inline-flex items-center gap-2 rounded-lg bg-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            {user.role}
          </div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-8 overflow-y-auto custom-scrollbar pb-10">
          {menuSections.map((section) => (
            <div key={section.title} className="space-y-2">
              <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-3">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname.includes(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                        ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                        }`}
                    >
                      <div className={`transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                        <NavIcon name={item.name} />
                      </div>
                      <span className="text-sm font-bold tracking-tight">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-6 bg-slate-900 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-black text-rose-400 bg-rose-400/5 hover:bg-rose-400/10 rounded-xl border border-rose-400/20 transition-all duration-300 uppercase tracking-widest"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout Session
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              {getPageTitle()}
            </h1>
            <div className="h-6 w-px bg-slate-200"></div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{new Date().toDateString()}</p>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex flex-col items-end">
              <span className="text-sm font-black text-slate-800">{user.fullName}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em]">{user.email}</span>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-2xl border-2 border-white shadow-sm flex items-center justify-center text-indigo-600 font-black text-lg">
              {user.fullName?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-10 bg-slate-50 custom-scrollbar">
          <div className="max-w-7xl mx-auto animate-fadeIn">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
