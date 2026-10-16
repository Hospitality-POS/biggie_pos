/**
 * Keep already-open copies of the app on the latest deploy.
 *
 * The service worker (vite-plugin-pwa, autoUpdate + skipWaiting +
 * clientsClaim) installs a new version in the background, but a page that is
 * already open — especially a PWA left running on a phone's home screen —
 * keeps executing the old JavaScript until it is fully reloaded. Users then
 * see an outdated UI long after a release (e.g. a phone still showing the old
 * Omnichannel screens while desktop shows the new ones).
 *
 * This:
 *  - checks for a new version whenever the app returns to the foreground,
 *    and every 30 minutes while it stays open;
 *  - reloads once when a new version takes control — immediately if the user
 *    has just opened/returned to the app or isn't typing, otherwise on their
 *    next return, so a half-typed message is never lost.
 */

const CHECK_EVERY_MS = 30 * 60 * 1000;
const JUST_RETURNED_MS = 15 * 1000;

const isTyping = () => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
};

export const initPwaFreshness = () => {
    if (!import.meta.env.PROD || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // The very first install also fires controllerchange (clientsClaim);
    // only an update that replaces an existing worker should reload.
    const hadController = !!navigator.serviceWorker.controller;
    let lastVisibleAt = Date.now();
    let pendingReload = false;
    let reloading = false;

    const reload = () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
    };

    const checkForUpdate = () => {
        navigator.serviceWorker
            .getRegistration()
            .then((reg) => reg?.update())
            .catch(() => {
                /* offline or no registration — try again later */
            });
    };

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController) return;
        const justReturned = Date.now() - lastVisibleAt < JUST_RETURNED_MS;
        if (document.visibilityState === "hidden" || justReturned || !isTyping()) reload();
        else pendingReload = true;
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return;
        lastVisibleAt = Date.now();
        if (pendingReload) reload();
        else checkForUpdate();
    });

    window.setInterval(() => {
        if (document.visibilityState === "visible") checkForUpdate();
    }, CHECK_EVERY_MS);
};
