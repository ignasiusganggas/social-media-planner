"use client";
import { useEffect } from "react";

// One-time safety net: if any browser has a leftover service worker registered
// for this site (from earlier testing, or a previous unrelated project on the
// same domain pattern), it can silently intercept and replay old cached
// responses even after normal cache-clearing. This removes any such worker
// the moment the app loads, for every visitor, going forward.
export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
    }
    if (typeof caches !== "undefined") {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
  }, []);

  return null;
}
