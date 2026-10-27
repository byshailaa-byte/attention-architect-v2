import { NextResponse } from "next/server";

// GET /admin/mark-internal — one-tap: mark THIS device/browser as internal/operator for ~2 years, so
// opening a parent's report / plan / roadmap from it (e.g. a WhatsApp link on the operator's phone,
// which may never have hit /admin) never writes funnel_events or reaches an ad platform. Admin Basic
// Auth gates this route (middleware). Longer-lived than the 30-day marker middleware sets on /admin.
export const dynamic = "force-dynamic";

export async function GET() {
  const res = new NextResponse(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<body style="font-family:system-ui,sans-serif;max-width:430px;margin:56px auto;padding:0 22px;color:#1E3A5F">
  <h2 style="margin:0 0 10px">✓ This device is now internal</h2>
  <p style="color:#5B6577;line-height:1.5">Opening a parent's report, plan or roadmap from this browser will no longer write funnel events or analytics — for about 2 years. Re-tap any time to refresh. Use this on your phone.</p>
  <p style="margin-top:22px"><a href="/admin" style="color:#E8A33D;font-weight:700;text-decoration:none">← Back to admin</a></p>
</body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
  res.cookies.set("aa_internal", "1", { path: "/", maxAge: 60 * 60 * 24 * 365 * 2, sameSite: "lax" });
  return res;
}
