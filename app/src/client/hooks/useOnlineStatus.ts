import { useEffect, useState } from "react";

/**
 * Live online/offline state from the browser.
 * SSR-safe: defaults to true when window is unavailable.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return true;
    return navigator.onLine;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
