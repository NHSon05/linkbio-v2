"use client";

import { useEffect } from "react";

const ENDPOINT = "/api/v1/events";

function send(event: object) {
  const body = JSON.stringify(event);
  // sendBeacon survives the page unloading when a visitor follows a link.
  if (!navigator.sendBeacon?.(ENDPOINT, body))
    fetch(ENDPOINT, { method: "POST", body, keepalive: true }).catch(() => {});
}

/** AN-01: one view per tab session and a click for each tracked link on a public page. */
export function PageTracker({ path }: { path: string }) {
  useEffect(() => {
    if (navigator.webdriver) return;
    const utmSource =
      new URLSearchParams(location.search).get("utm_source")?.slice(0, 100) ||
      undefined;

    let seen = false;
    try {
      seen = sessionStorage.getItem("viewed:" + path) === "1";
      sessionStorage.setItem("viewed:" + path, "1");
    } catch {
      // Storage blocked: count the view anyway.
    }
    if (!seen) {
      let referrerHost: string | undefined;
      try {
        const ref = new URL(document.referrer);
        if (ref.host !== location.host) referrerHost = ref.hostname;
      } catch {
        // No referrer (direct visit).
      }
      send({ path, type: "view", referrerHost, utmSource });
    }

    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[data-block-id]");
      const blockId = link?.getAttribute("data-block-id");
      if (blockId) send({ path, type: "click", blockId, utmSource });
    };
    document.addEventListener("click", onClick);
    document.addEventListener("auxclick", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("auxclick", onClick);
    };
  }, [path]);
  return null;
}
