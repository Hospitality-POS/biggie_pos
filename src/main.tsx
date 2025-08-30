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

const theme = createTheme({
  typography: {
    fontFamily: "Inter, sans-serif",
  },
});

const queryClient = new QueryClient();

// Custom wrapper to use primary color from context
const AppWithColor = () => {
  const primaryColor = usePrimaryColor();
  return (
    <ConfigProvider
      locale={enUS}
      theme={{
        token: {
          colorPrimary: primaryColor,
          colorBgContainer: "#f6ffed",
        },
        components: {
          Button: {
            primaryShadow: "#f6ffed",
          },
          Card: {
            actionsBg: primaryColor,
          },
        },
      }}
    >
      <App />
      <ErrorBoundary>
        <DraggableTawkWidget />
      </ErrorBoundary>
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
            <AppWithColor />
          </PrimaryColorProvider>
        </QueryClientProvider>
      </Provider>
    </ThemeProvider>
  </React.StrictMode>
);