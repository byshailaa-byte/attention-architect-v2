/**
 * Boot-time safety checks. Import this at the top of any server entry point.
 * Throws (exits the process) rather than warning — a warning can be ignored.
 */

const PRODUCTION_HOST = "neon.tech";

export function assertBootGuards() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (dbUrl) {
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

  for (const [key, val] of Object.entries(process.env)) {
    if (key.startsWith("rzp_live_") || (val ?? "").startsWith("rzp_live_")) {
      throw new Error(
        `[BOOT GUARD] Live Razorpay key detected in env (${key}). ` +
          `This process must never run with live payment keys.`
      );
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
