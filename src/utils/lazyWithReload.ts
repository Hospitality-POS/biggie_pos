import { ComponentType, lazy } from "react";

// After a deploy, users still holding an old index.html (open tab or a
// precached copy served by the service worker) request hashed chunks that
// may no longer exist on the server. Reloading once picks up the new
// index.html and recovers. The timestamp guard prevents reload loops if the
// server itself is actually broken.
const RELOAD_FLAG = "chunk-reload-at";

export const reloadForNewVersion = () => {
  const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0);
  if (Date.now() - last > 60_000) {
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
    window.location.reload();
  }
};

export const lazyWithReload = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) =>
  lazy(() =>
    factory().catch((error) => {
      reloadForNewVersion();
      throw error;
    })
  );
