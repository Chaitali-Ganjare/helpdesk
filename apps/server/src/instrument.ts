import * as Sentry from "@sentry/node";

// Must be imported before any other module (Sentry patches Node internals for
// automatic instrumentation) — see the `import "./instrument"` at the top of index.ts.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  // Error tracking only — no performance tracing for now.
  tracesSampleRate: 0,
});
