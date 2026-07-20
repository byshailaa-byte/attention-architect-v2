import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const pw = process.env.MIGRATE_TOKEN;
  if (!pw || auth !== `Bearer ${pw}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getSql();

  // Phase 10a — make child_name nullable on production
  await sql`ALTER TABLE assessments ALTER COLUMN child_name DROP NOT NULL`;

  // Verify
  const rows = await sql`
    SELECT is_nullable
    FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'child_name'
  ` as { is_nullable: string }[];

  return NextResponse.json({ child_name_nullable: rows[0]?.is_nullable });
}
