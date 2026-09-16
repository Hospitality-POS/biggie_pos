import "./instrument";
import React from "react";
import ReactDOM from "react-dom/client";
import { store } from "src/store";
import { Provider } from "react-redux";
import App from "./App.tsx";
import "typeface-inter";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import { PrimaryColorProvider, usePrimaryColor } from "./context/PrimaryColorContext";
import { POSModeProvider } from "./context/POSModeContext";
import { RetailQueueProvider } from "./context/RetailQueueContext";
import GlobalErrorBoundary from "@components/GlobalErrorBoundary";

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
      <App />
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