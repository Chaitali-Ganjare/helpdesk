import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App";
import { initSentry } from "./lib/sentry";

initSentry();

// Every call site does `axios.get("/api/...")` with a relative path (see
// CLAUDE.md's Frontend Data Fetching conventions). In dev that resolves
// against the Vite proxy; in production the web and API apps are separate
// Railway services on different origins, so both defaults.baseURL and
// withCredentials (to still send the session cookie cross-origin) must be
// set globally here rather than per call site.
axios.defaults.baseURL = import.meta.env.VITE_API_URL || "";
axios.defaults.withCredentials = true;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
