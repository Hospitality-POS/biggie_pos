import React from "react";
import ReactDOM from "react-dom/client";
import { store } from "./store.ts";
import { Provider } from "react-redux";
import App from "./App.tsx";
import "typeface-inter";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { createTheme } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@emotion/react";
import { CssBaseline } from "@mui/material";
import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";

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
                colorPrimary: "#6c1c2c",
                colorBgContainer: "#f6ffed",
              },
              components: {
                Button: {
                  primaryShadow: "#f6ffed",
                },
                Card: {
                  actionsBg: "#6c1c2c",
                },
              },
            }}
          >
            <App />
          </ConfigProvider>
        </QueryClientProvider>
      </Provider>
    </ThemeProvider>
  </React.StrictMode>
);
