import { NextRequest, NextResponse } from "next/server";
import { verifySessionTokenEdge, COOKIE_NAME } from "@/lib/auth/session-edge";
import { LMS_VER_COOKIE } from "@/lib/auth/lms-version-cookie";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Expire the legacy admin-view marker cookie on LMS + LMS API paths. Admin view is now decided
  // ONLY by the x-aa-admin-view request header, so a stale aa_lms_view cookie must never 403 a
  // normal parent. These paths handle their own auth, so just clear + continue.
  if (pathname.startsWith("/lms-v2") || pathname.startsWith("/api/lms")) {
    const res = NextResponse.next();
    res.cookies.set("aa_lms_view", "", { path: "/", maxAge: 0 });
    return res;
  }

  // ── Admin: HTTP Basic Auth ────────────────────────────────────────────────
  // Covers both the dashboard UI (/admin/*) and the admin API (/api/admin/*).
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const auth = req.headers.get("authorization") ?? "";
    const b64 = auth.replace(/^Basic\s+/i, "");

    let valid = false;
    try {
      // atob is available on Edge Runtime; Buffer.from is not
      const decoded = atob(b64);
      const colonIdx = decoded.indexOf(":");
      const pass = colonIdx >= 0 ? decoded.slice(colonIdx + 1) : "";
      // Timing-safe comparison: XOR all bytes so early-exit timing can't reveal the password.
      // crypto.timingSafeEqual is Node-only; Edge Runtime has only Web Crypto.
      const ae = new TextEncoder().encode(pass);
      const be = new TextEncoder().encode(password);
      const maxLen = Math.max(ae.length, be.length);
      let diff = ae.length !== be.length ? 1 : 0;
      for (let i = 0; i < maxLen; i++) diff |= (ae[i] ?? 0) ^ (be[i] ?? 0);
      valid = diff === 0;
    } catch {
      valid = false;
    }

    if (!valid) {
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
      });
    }
    const res = NextResponse.next();
    // Mark this browser as internal/operator for 30 days so any v2 start-flow session it
    // begins is excluded from the funnel stats. This is the PRODUCTION is_internal signal:
    // /admin uses Basic Auth (no session cookie of its own), so we set a dedicated marker
    // cookie here that /api/flow/* reads.
    res.cookies.set("aa_internal", "1", { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });

    // The admin-view read-only signal is NOT a cookie anymore (it was sticky and leaked into the
    // operator's own normal-parent session). It's the x-aa-admin-view header added by AdminLmsView.
    // Expire any stale cookie from the old build.
    res.cookies.set("aa_lms_view", "", { path: "/", maxAge: 0 });
    return res;
  }

  // ── LMS: cookie session ───────────────────────────────────────────────────
  if (pathname.startsWith("/lms")) {
    if (
      pathname === "/lms/login" ||
      pathname === "/lms/set-password" ||
      pathname === "/lms/forgot-password" ||
      pathname === "/lms/reset-password"
    ) return NextResponse.next();

    const token = req.cookies.get(COOKIE_NAME)?.value ?? "";
    const userId = await verifySessionTokenEdge(token);
    if (!userId) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/lms/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // A v2 user who lands on the v1 app is sent to /lms-v2. Driven by the hint
    // cookie, which is ONLY ever "v2" — v1 customers and legacy sessions have no
    // cookie (or "v1"), so this never fires for them and /lms stays untouched.
    if (req.cookies.get(LMS_VER_COOKIE)?.value === "v2") {
      const v2 = req.nextUrl.clone();
      v2.pathname = "/lms-v2";
      v2.search = "";
      return NextResponse.redirect(v2);
    }
    const res = NextResponse.next();
    res.cookies.set("aa_lms_view", "", { path: "/", maxAge: 0 }); // expire stale admin-view cookie
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/lms/:path*", "/lms-v2/:path*", "/api/lms/:path*"],
};
