import { useNavigate, useLocation } from "react-router-dom";

function HomeButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show the home button on the dashboard itself or public pages.
  const hiddenPaths = ["/dashboard", "/", "/register"];
  if (hiddenPaths.includes(location.pathname)) return null;

  return (
    <button
      onClick={() => navigate("/dashboard")}
      className="fixed top-6 left-6 z-[100] group flex items-center justify-center"
      aria-label="Go to Dashboard"
    >
      <div className="relative">
        {/* Animated Background Ring */}
        <div className="absolute inset-0 bg-indigo-400 rounded-3xl blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-500 scale-110"></div>
        
        {/* Main Button Body */}
        <div className="relative flex items-center gap-3 bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-[0_8px_0_rgba(0,0,0,0.1)] group-hover:shadow-[0_4px_0_rgba(0,0,0,0.1)] group-hover:translate-y-1 transition-all duration-300 border-2 border-indigo-100 group-hover:border-indigo-400 overflow-hidden">
          <div className="text-2xl group-hover:scale-125 transition-transform duration-500">🏠</div>
          <span className="font-black text-indigo-600 uppercase tracking-widest text-sm translate-x-1 group-hover:translate-x-0 transition-transform">
            Home
          </span>
          
          {/* Subtle Shine Effect */}
          <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] group-hover:left-[200%] transition-all duration-1000 ease-in-out"></div>
        </div>
      </div>
      
      {/* Tooltip hint for kids */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter pointer-events-none">
        Go Back to Dashboard
      </div>
    </button>
  );
}

export default HomeButton;
