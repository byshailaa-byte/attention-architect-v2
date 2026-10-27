// GET /api/admin/parents/detail?ids=<assessmentId,...>&sids=<sessionId,...>
// Returns the side-panel detail for one parent: per-child report talking-points + full call history.
// Admin-only (middleware HTTP Basic Auth on /api/admin/*). Read-only.
import { NextRequest, NextResponse } from "next/server";
import { getParentDetail } from "@/lib/admin/parents/detail";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const sids = (req.nextUrl.searchParams.get("sids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) return NextResponse.json({ error: "no ids" }, { status: 400 });
    const data = await getParentDetail(ids, sids);
    return NextResponse.json(data);
  } catch (e) {
    console.error("[admin/parents/detail]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
