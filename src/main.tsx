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

// Get tenant primary color from localStorage or use default
const getThemeColor = () => {
  // Default color
  const defaultColor = "#6c1c2c";

  try {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    return tenant && tenant.color_scheme.primary ? tenant.color_scheme.primary : defaultColor;
  } catch (error) {
    console.error("Error getting tenant color:", error);
    return defaultColor;
  }
};

const primaryColor = getThemeColor();

const theme = createTheme({
  typography: {
    fontFamily: "Inter, sans-serif",
  },
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
      </Provider>
    </ThemeProvider>
  </React.StrictMode>
);