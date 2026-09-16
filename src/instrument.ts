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
  // Only capture and send errors/telemetry in production, never in dev or on localhost
  enabled: import.meta.env.PROD && !["localhost", "127.0.0.1"].includes(window.location.hostname),

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
  tracesSampleRate: 0.2,
  tracePropagationTargets: [
    /^\//,
    /^https:\/\/api\.hospitality\.reliatech\.co\.ke/,
    /^https:\/\/api\.account\.reliatech\.co\.ke/,
    /^https:\/\/api\.admin\.reliatech\.co\.ke/,
  ],

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
