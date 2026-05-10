import { useEffect, useMemo, useState } from "react";
import AppBootSplash, { SPLASH_DURATION_MS } from "./AppBootSplash";
import HomeLanding from "./HomeLanding";

const SPLASH_SESSION_KEY = "dyslexiaAidSplashShown";

function LandingGate() {
  const forceSplash = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("splash") === "1";
  }, []);

  const [showSplash, setShowSplash] = useState(() => {
    return forceSplash || sessionStorage.getItem(SPLASH_SESSION_KEY) !== "true";
  });

  useEffect(() => {
    if (!showSplash) return undefined;

    const timer = window.setTimeout(() => {
      sessionStorage.setItem(SPLASH_SESSION_KEY, "true");
      setShowSplash(false);
    }, SPLASH_DURATION_MS + 420);

    return () => window.clearTimeout(timer);
  }, [showSplash]);

  const handleSplashDone = () => {
    sessionStorage.setItem(SPLASH_SESSION_KEY, "true");
    setShowSplash(false);
  };

  return showSplash ? <AppBootSplash onDone={handleSplashDone} /> : <HomeLanding />;
}

export default LandingGate;
