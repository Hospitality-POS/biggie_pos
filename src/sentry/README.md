# Sentry Instrumentation for Biggie POS

This folder encapsulates all Sentry error monitoring, distributed tracing, and session replay configuration.

## Files
- `index.ts`: Initializes Sentry and re-exports SDK methods.

## Environment Policy
Sentry is configured to be **strictly active in production**:
```typescript
enabled: import.meta.env.PROD && !["localhost", "127.0.0.1"].includes(window.location.hostname)
```
- **Local Dev (`pnpm dev`)**: Sentry is completely inert and sends 0 network requests.
- **Local Preview (`vite preview`)**: Blocked by the hostname check.
- **Production Deployment**: Actively reports errors, traces, and replays to Sentry.

## Integrations
1. **React Router v6 Tracing**: `reactRouterV6BrowserTracingIntegration` + `wrapCreateBrowserRouterV6` in `src/routes/Routers.tsx`.
2. **Session Replay**: `replayIntegration` with text masking and media blocking enabled.
3. **Redux Store**: `createReduxEnhancer()` attached in `src/store.ts` for action breadcrumbs.
4. **React Error Boundary**: `captureReactException` hooked into `src/components/GlobalErrorBoundary.tsx`.
