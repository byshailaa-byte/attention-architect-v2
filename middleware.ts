import { NextRequest, NextResponse } from "next/server";
import { verifySessionTokenEdge, COOKIE_NAME } from "@/lib/auth/session-edge";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Admin: HTTP Basic Auth ────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
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
      valid = pass === password;
    } catch {
      valid = false;
    }

    if (!valid) {
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
      });
    }
    return NextResponse.next();
  }

  // ── LMS: cookie session ───────────────────────────────────────────────────
  if (pathname.startsWith("/lms")) {
    if (pathname === "/lms/login") return NextResponse.next();

    const token = req.cookies.get(COOKIE_NAME)?.value ?? "";
    const userId = await verifySessionTokenEdge(token);
    if (!userId) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/lms/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/lms/:path*"],
};
