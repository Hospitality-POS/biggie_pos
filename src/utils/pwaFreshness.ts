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
 *  - reloads once when a new version takes control, but only while nobody is
 *    using the page: when it's in the background, or it has just come back
 *    to the foreground and hasn't been touched yet. Otherwise the reload waits
 *    for the next return, so a cashier is never reloaded mid-sale.
 */

const CHECK_EVERY_MS = 30 * 60 * 1000;

export const initPwaFreshness = () => {
    if (!import.meta.env.PROD || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // The very first install also fires controllerchange (clientsClaim);
    // only an update that replaces an existing worker should reload.
    const hadController = !!navigator.serviceWorker.controller;
    // True from the moment the page is shown until the user clicks, taps or
    // types — any interaction means someone may be mid-task.
    let untouchedSinceShown = true;
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

    const markInteraction = () => {
        untouchedSinceShown = false;
    };
    ["pointerdown", "keydown"].forEach((type) =>
        window.addEventListener(type, markInteraction, { capture: true, passive: true })
    );

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController) return;
        if (document.visibilityState === "hidden" || untouchedSinceShown) reload();
        else pendingReload = true;
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return;
        untouchedSinceShown = true;
        if (pendingReload) reload();
        else checkForUpdate();
    });

    window.setInterval(() => {
        if (document.visibilityState === "visible") checkForUpdate();
    }, CHECK_EVERY_MS);
};
