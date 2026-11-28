// Browser push notifications (Firebase Cloud Messaging).
//
// biggie_api pushes every in-app notification (leave, bookings, stock
// alerts…) to its recipient, plus a push to the assigned agent on every new
// chat message. This registers the browser with the API after sign-in
// (POST /notifications/devices) and removes it on sign-out. The service
// worker side lives in public/push-sw.js.
//
// Configure with the Firebase web app's settings (all public values):
//   VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID,
//   VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID,
//   VITE_FIREBASE_VAPID_KEY  (Cloud Messaging › Web Push certificates)
// Without them push is off. It also needs the production service worker, so
// it doesn't run under `pnpm dev`.
import type { FirebaseApp } from "firebase/app";
import axiosInstance from "./request";
import { BASE_URL } from "@utils/config";

const env = import.meta.env;
const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
    appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};
const vapidKey = env.VITE_FIREBASE_VAPID_KEY as string | undefined;

const TOKEN_KEY = "push_token";

export type PushData = Record<string, string | undefined>;
export type IncomingPush = { title: string; body: string; data: PushData };

/** Keep in step with pushTargetUrl() in public/push-sw.js */
export const pushTargetUrl = (data: PushData = {}): string => {
    const type = data.type || "";
    if (type === "omnichannel_message" && data.conversation_id) {
        return `/omnichannel?conversation=${encodeURIComponent(data.conversation_id)}`;
    }
    if (type.startsWith("leave_")) return "/hr/leave";
    return "/notifications";
};

const isConfigured = () =>
    !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId && vapidKey);

/** This browser can receive push and the app is set up for it. */
export const isPushSupported = (): boolean =>
    isConfigured() &&
    import.meta.env.PROD &&
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

export const pushPermission = (): NotificationPermission | "unsupported" =>
    isPushSupported() ? Notification.permission : "unsupported";

let appPromise: Promise<FirebaseApp> | null = null;
const getApp = () => {
    if (!appPromise) {
        appPromise = import("firebase/app").then(({ initializeApp, getApps }) =>
            getApps()[0] || initializeApp(firebaseConfig as Required<typeof firebaseConfig>)
        );
    }
    return appPromise;
};

/**
 * Register this browser for push for the signed-in user. Asks for permission
 * only when [askPermission] is true — call that from a click: Safari and
 * Firefox ignore permission prompts that don't come from one.
 * Resolves true when the browser is registered.
 */
export const enablePush = async ({ askPermission = false } = {}): Promise<boolean> => {
    if (!isPushSupported()) return false;
    try {
        let permission = Notification.permission;
        if (permission === "default" && askPermission) permission = await Notification.requestPermission();
        if (permission !== "granted") return false;

        // The PWA service worker (with public/push-sw.js imported) receives pushes
        const registration = await navigator.serviceWorker.ready;
        const [{ getMessaging, getToken }, app] = await Promise.all([import("firebase/messaging"), getApp()]);
        const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
        if (!token) return false;

        await axiosInstance.post(`${BASE_URL}/notifications/devices`, { token, platform: "web", app: "biggie_pos" });
        localStorage.setItem(TOKEN_KEY, token);
        return true;
    } catch (err) {
        console.warn("[push] could not enable push:", err);
        return false;
    }
};

/**
 * Stop pushes to this browser (sign-out). Call while the company code is
 * still stored. The API only needs the token, so this works after the session
 * expired too; keepalive lets it finish while the page navigates away.
 */
export const disablePush = (): void => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    localStorage.removeItem(TOKEN_KEY);
    try {
        const companyCode = localStorage.getItem("companyCode") || "";
        void fetch(`${BASE_URL}/notifications/devices`, {
            method: "DELETE",
            keepalive: true,
            headers: { "Content-Type": "application/json", ...(companyCode ? { companycode: companyCode } : {}) },
            body: JSON.stringify({ token }),
        }).catch(() => undefined);
    } catch {
        // Never block signing out
    }
};

/**
 * Listen for messages from the service worker: a push that arrived while this
 * tab was focused, or a notification click asking the app to open a page.
 * Returns an unsubscribe function.
 */
export const listenForPushes = (handlers: {
    onPush: (push: IncomingPush) => void;
    onOpen: (path: string) => void;
}): (() => void) => {
    if (!("serviceWorker" in navigator)) return () => undefined;
    const listener = (event: MessageEvent) => {
        const msg = event.data;
        if (!msg || msg.source !== "base-push") return;
        if (msg.push) handlers.onPush(msg.push as IncomingPush);
        if (msg.open) {
            const url = new URL(msg.open, window.location.origin);
            handlers.onOpen(url.pathname + url.search);
        }
    };
    navigator.serviceWorker.addEventListener("message", listener);
    return () => navigator.serviceWorker.removeEventListener("message", listener);
};
