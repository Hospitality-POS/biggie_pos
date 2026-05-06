import React from "react";
import ReactDOM from "react-dom/client";
import { store } from "./store.ts";
import { Provider } from "react-redux";
import App from "./App.tsx";
import "typeface-inter";
import "./index.css";
import { createTheme } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@emotion/react";
import { CssBaseline } from "@mui/material";
import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import DraggableTawkWidget from "./components/tawk/DraggableTawkWidget.tsx";
import ErrorBoundary from "./components/tawk/ErrorBoundary.tsx";
import { PrimaryColorProvider, usePrimaryColor } from "./context/PrimaryColorContext";
import { POSModeProvider } from "./context/POSModeContext";
import { RetailQueueProvider } from "./context/RetailQueueContext";  // ← ADD

// Force-unregister stale service workers and clear caches in dev
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
  caches.keys().then((names) => {
    names.forEach((name) => caches.delete(name));
  });
}

const theme = createTheme({
  typography: {
    fontFamily: "Inter, sans-serif",
  },
});

export const queryClient = new QueryClient();

const AppWithColor = () => {
  const primaryColor = usePrimaryColor();
  return (
    <ConfigProvider
      key={primaryColor}
      locale={enUS}
      theme={{
        token: {
          colorPrimary: primaryColor,
          colorBgContainer: "#f6ffed",
        },
        components: {
          Button: { primaryShadow: "#f6ffed" },
          Card: { actionsBg: primaryColor },
        },
      }}
    >
      <App />
      {/* <ErrorBoundary>
        <DraggableTawkWidget />
      </ErrorBoundary> */}
    </ConfigProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <PrimaryColorProvider>
            <POSModeProvider>
              <RetailQueueProvider>      {/* ← ADD */}
                <AppWithColor />
              </RetailQueueProvider>     {/* ← ADD */}
            </POSModeProvider>
          </PrimaryColorProvider>
        </QueryClientProvider>
      </Provider>
    </ThemeProvider>
  </React.StrictMode>
);