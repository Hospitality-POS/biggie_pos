import "./sentry";
import React from "react";
import ReactDOM from "react-dom/client";
import { store } from "src/store";
import { Provider } from "react-redux";
import App from "./App.tsx";
import "typeface-inter";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App as AntdApp } from "antd";
import enUS from "antd/locale/en_US";
import { ProConfigProvider, enUSIntl } from "@ant-design/pro-components";
import { PrimaryColorProvider, usePrimaryColor } from "./context/PrimaryColorContext";
import { POSModeProvider } from "./context/POSModeContext";
import { RetailQueueProvider } from "./context/RetailQueueContext";
import GlobalErrorBoundary from "@components/GlobalErrorBoundary";
import { reloadForNewVersion } from "@utils/lazyWithReload";
import { initDesktopZoom } from "@utils/desktopZoom";
import { initDesktopUpdater } from "@utils/desktopUpdater";
import { initPwaFreshness } from "@utils/pwaFreshness";
import dayjs from "dayjs";

// ProComponents set dayjs's GLOBAL locale to "zh-cn" whenever one renders
// without an antd locale above it (static Modal.confirm, portals), which turns
// every "DD MMM YYYY" in the app into "27 10月 2026". The app is English-only,
// so global switches to anything else are ignored. Locale files registering
// themselves (isLocal) and per-instance .locale() calls are unaffected.
const setGlobalLocale = dayjs.locale;
dayjs.locale = ((preset?: string | ILocale, object?: Partial<ILocale>, isLocal?: boolean) => {
  const name = typeof preset === "string" ? preset : preset?.name;
  const allowed = isLocal || preset === undefined || (name || "").toLowerCase().startsWith("en");
  return setGlobalLocale(allowed ? preset : "en", object, isLocal);
}) as typeof dayjs.locale;
dayjs.locale("en");

initDesktopZoom();
initDesktopUpdater();
// Open tabs / installed PWAs pick up new deploys without a manual refresh.
initPwaFreshness();

// Recover from stale-asset failures right after a deploy: Vite fires
// vite:preloadError when a modulepreload'd chunk 404s, before React even
// mounts — which is the classic blank-white-page scenario.
if (import.meta.env.PROD) {
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadForNewVersion()) {
      event.preventDefault();
    }
  });
}

// Force-unregister stale service workers and clear caches in dev
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
  caches.keys().then((names) => {
    names.forEach((name) => caches.delete(name));
  });
}

export const queryClient = new QueryClient();

const AppWithColor = () => {
  const primaryColor = usePrimaryColor();
  return (
    <ConfigProvider
      locale={enUS}
      theme={{
        token: {
          colorPrimary: primaryColor,
          fontFamily: "Inter, sans-serif",
        },
        components: {
          Card: { actionsBg: primaryColor },
        },
      }}
    >
      <AntdApp>
        <ProConfigProvider intl={enUSIntl}>
          <App />
        </ProConfigProvider>
      </AntdApp>
    </ConfigProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <PrimaryColorProvider>
            <POSModeProvider>
              <RetailQueueProvider>
                <AppWithColor />
              </RetailQueueProvider>
            </POSModeProvider>
          </PrimaryColorProvider>
        </QueryClientProvider>
      </Provider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);