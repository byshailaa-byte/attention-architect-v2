import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const session = req.nextUrl.searchParams.get("session");
  if (!session || !UUID_RE.test(session)) {
    return NextResponse.json({ ready: false });
  }

  const sql = getSql();
  const rows = (await sql`
    SELECT r.id FROM reports r
    JOIN assessments a ON a.id = r.assessment_id
    WHERE a.session_id = ${session}::uuid
      AND r.status = 'published'
      AND r.superseded_by IS NULL
    LIMIT 1
  `) as unknown as { id: string }[];

  return NextResponse.json({ ready: rows.length > 0 });
}
