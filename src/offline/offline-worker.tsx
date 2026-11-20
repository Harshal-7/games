"use client";

import { useEffect } from "react";

import { OFFLINE_PAGES } from "./pages";

/**
 * Production builds register the service worker (public/sw.js) that keeps the site for
 * offline play. Its URL carries this build's version, so every deploy installs a fresh copy.
 * Development registers nothing and removes any worker it finds: a worker left on
 * localhost:3000 would answer for whichever project runs there next.
 */
export function OfflineWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((all) => all.forEach((worker) => worker.unregister()));
      return;
    }
    const query = new URLSearchParams([
      ["v", process.env.OFFLINE_VERSION ?? ""],
      ...OFFLINE_PAGES.map((page) => ["page", page]),
    ]);
    // After the page has loaded, so saving the site doesn't slow down the first visit.
    const register = () => {
      navigator.serviceWorker.register(`/sw.js?${query}`, { updateViaCache: "none" }).catch(() => {
        // Without a worker the site just isn't saved for offline; everything else works.
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
