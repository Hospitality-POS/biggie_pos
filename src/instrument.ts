import * as React from "react";
import * as Sentry from "@sentry/react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,

  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Performance / Distributed Tracing
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,
  tracePropagationTargets: [
    "localhost",
    /^\//,
    /^https:\/\/api\.hospitality\.reliatech\.co\.ke/,
    /^https:\/\/api\.account\.reliatech\.co\.ke/,
    /^https:\/\/api\.admin\.reliatech\.co\.ke/,
  ],

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
