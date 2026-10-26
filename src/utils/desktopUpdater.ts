import { Modal, message } from "antd";
import { isTauri } from "./desktopZoom";

// Check GitHub Releases for a newer version; if found, prompt to install it.
// Call once at boot — no-op in the browser.
export const initDesktopUpdater = (): void => {
    if (!isTauri()) return;
    // Delay so the login screen renders first; failures are silent (offline is fine)
    setTimeout(() => {
        checkForUpdate().catch((err) => console.warn("[updater] check failed:", err));
    }, 5000);
};

const checkForUpdate = async (): Promise<void> => {
    const { check } = await import("@tauri-apps/plugin-updater");
    const { relaunch } = await import("@tauri-apps/plugin-process");

    const update = await check();
    if (!update) return;

    Modal.confirm({
        title: "Update available",
        content: `Version ${update.version} is available${update.date ? ` (${update.date.split(" ")[0]})` : ""}. Update now? The app will restart.`,
        okText: "Update",
        cancelText: "Later",
        onOk: async () => {
            const key = "desktop-update";
            message.loading({ content: "Downloading update…", key, duration: 0 });
            try {
                let downloaded = 0;
                let total = 0;
                await update.downloadAndInstall((event) => {
                    if (event.event === "Started" && event.data.contentLength) {
                        total = event.data.contentLength;
                    } else if (event.event === "Progress") {
                        downloaded += event.data.chunkLength;
                        if (total > 0) {
                            const pct = Math.round((downloaded / total) * 100);
                            message.loading({ content: `Downloading update… ${pct}%`, key, duration: 0 });
                        }
                    }
                });
                message.success({ content: "Update installed. Restarting…", key });
                await relaunch();
            } catch (err) {
                message.error({ content: "Update failed — will retry next launch.", key });
                console.error("[updater] install failed:", err);
            }
        },
    });
};
