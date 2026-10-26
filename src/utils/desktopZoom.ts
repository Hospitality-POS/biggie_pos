const ZOOM_STORAGE_KEY = "desktop_zoom";
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const STEP = 0.1;

export const isTauri = (): boolean =>
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const getDesktopZoom = (): number => {
    const stored = parseFloat(localStorage.getItem(ZOOM_STORAGE_KEY) || "");
    return Number.isFinite(stored) ? stored : 1;
};

const applyZoom = async (factor: number): Promise<void> => {
    if (!isTauri()) return;
    try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        await getCurrentWebview().setZoom(factor);
    } catch (err) {
        // Fall back to CSS zoom if the webview zoom API is unavailable/denied
        console.warn("[desktopZoom] webview setZoom failed, using CSS zoom:", err);
        document.documentElement.style.zoom = String(factor);
    }
};

export const setDesktopZoom = async (factor: number): Promise<number> => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(factor * 100) / 100));
    localStorage.setItem(ZOOM_STORAGE_KEY, clamped.toString());
    await applyZoom(clamped);
    return clamped;
};

export const zoomIn = () => setDesktopZoom(getDesktopZoom() + STEP);
export const zoomOut = () => setDesktopZoom(getDesktopZoom() - STEP);
export const resetZoom = () => setDesktopZoom(1);

// Apply the persisted zoom and register Ctrl +/-/0 shortcuts. Call once at boot.
export const initDesktopZoom = (): void => {
    if (!isTauri()) return;

    const stored = getDesktopZoom();
    if (stored !== 1) applyZoom(stored).catch(() => {});

    window.addEventListener("keydown", (e) => {
        if (!e.ctrlKey) return;
        if (e.key === "=" || e.key === "+") {
            e.preventDefault();
            zoomIn();
        } else if (e.key === "-") {
            e.preventDefault();
            zoomOut();
        } else if (e.key === "0") {
            e.preventDefault();
            resetZoom();
        }
    });
};
