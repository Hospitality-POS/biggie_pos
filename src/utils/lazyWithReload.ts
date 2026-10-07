import { ComponentType, lazy } from "react";

// After a deploy, users still holding an old index.html (open tab or a
// precached copy served by the service worker) request hashed chunks that
// may no longer exist on the server. Reloading once picks up the new
// index.html and recovers. The timestamp guard prevents reload loops if the
// server itself is actually broken.
const RELOAD_FLAG = "chunk-reload-at";

export const isChunkLoadError = (error: unknown): boolean => {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("importing a module script failed")
  );
};

export const reloadForNewVersion = (): boolean => {
  const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0);
  if (Date.now() - last > 60_000) {
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
    window.location.reload();
    return true;
  }
  return false;
};

export const lazyWithReload = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) =>
  lazy(() =>
    factory().catch((error) => {
      if (isChunkLoadError(error) && reloadForNewVersion()) {
        // Keep suspense fallback visible during reload instead of flashing
        // error boundary or logging false-alarm errors to Sentry
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    })
  );
