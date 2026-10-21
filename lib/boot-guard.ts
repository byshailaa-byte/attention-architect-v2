/**
 * Boot-time safety checks. Import this at the top of any server entry point.
 * Throws (exits the process) rather than warning — a warning can be ignored.
 */

const PRODUCTION_HOST = "neon.tech";

export function assertBootGuards() {
  // During `next build`, Next.js evaluates route modules to collect page data. Secrets such as
  // ADMIN_PASSWORD are intentionally absent from the BUILD environment (e.g. Sensitive env vars,
  // which Vercel only injects at runtime), so running these checks at build time would throw and
  // fail the build — that is exactly how a missing build-time variable froze prod for ~10 days.
  // Skip the guards during the build phase only. They still run (and fail closed) at request time
  // on the server, where NEXT_PHASE is not set, so a truly-missing ADMIN_PASSWORD still refuses
  // to serve /admin.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const dbUrl = process.env.DATABASE_URL ?? "";
  // VERCEL_ENV is set automatically by Vercel to "production" | "preview" | "development".
  // On a real production deploy the DB endpoint will legitimately point at the production
  // Neon branch — skip the host check so the build doesn't block itself.
  // Local dev (VERCEL_ENV unset) still gets the full check.
  const isVercelProduction = process.env.VERCEL_ENV === "production";
  if (dbUrl && !isVercelProduction) {
    try {
      const host = new URL(dbUrl).hostname;
      // Block the staging/production Neon branches (ep-spring-pond, ep-wild-frog, etc.)
      // Allow only the v2-dev branch (ep-wild-paper)
      if (host.includes(PRODUCTION_HOST) && !host.includes("ep-wild-paper")) {
        throw new Error(
          `[BOOT GUARD] DATABASE_URL matches a production-like Neon host (${host}). ` +
            `Only the v2-dev branch (ep-wild-paper) is permitted in this process. ` +
            `Set DATABASE_URL to the v2-dev connection string.`
        );
      }
    } catch (e) {
      if ((e as Error).message.startsWith("[BOOT GUARD]")) throw e;
      // malformed URL — let DB connection fail naturally
    }
  }

  if (!isVercelProduction) {
    for (const [key, val] of Object.entries(process.env)) {
      if (key.startsWith("rzp_live_") || (val ?? "").startsWith("rzp_live_")) {
        throw new Error(
          `[BOOT GUARD] Live Razorpay key detected in env (${key}). ` +
            `This process must never run with live payment keys.`
        );
      }
    }
  }

  if (!process.env.ADMIN_PASSWORD) {
    throw new Error(
      `[BOOT GUARD] ADMIN_PASSWORD is unset. ` +
        `The /admin route cannot be safely served without it. ` +
        `Set ADMIN_PASSWORD in .env.local.`
    );
  }
}
