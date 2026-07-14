const distDir = `${import.meta.dirname}/dist`;
const port = Number(process.env.PORT ?? 4173);

// Serves the Vite build for the Railway static-web service. Falls back to
// index.html for any path that isn't a built asset, so react-router-dom's
// client-side routes (e.g. /tickets/abc123) resolve on a hard refresh
// instead of 404ing — there's no server-side router to match them.
Bun.serve({
  port,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    const file = Bun.file(`${distDir}${pathname === "/" ? "/index.html" : pathname}`);
    const exists = await file.exists();
    return new Response(exists ? file : Bun.file(`${distDir}/index.html`));
  },
});

console.log(`Serving apps/web/dist on :${port}`);
