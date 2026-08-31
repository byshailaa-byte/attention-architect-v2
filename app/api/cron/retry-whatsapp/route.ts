import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { sendWhatsAppReport } from "@/lib/whatsapp";

// Runs hourly via Vercel Cron. Retries released WhatsApp claims that haven't
// hit the attempt ceiling. Logs exhausted sessions at error level for admin recovery.
export const maxDuration = 60;

const MAX_WA_ATTEMPTS = 5;
const BATCH_SIZE = 10;

export async function GET(req: NextRequest) {
  // Vercel Cron automatically passes Authorization: Bearer <CRON_SECRET>.
  // Skip auth check when CRON_SECRET isn't configured (e.g. local dev).
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const sql = getSql();

  // Find sessions where:
  // - gate was submitted (parent_name IS NOT NULL)
  // - no send in progress and not yet sent
  // - under the attempt ceiling
  // - a published report exists (INNER JOIN) — never send before the report is there
  // Covers both: in-process retries that failed AND claim-route crashes (attempts=0).
  const candidates = await sql`
    SELECT a.session_id::text, a.child_name, a.parent_name, a.phone
    FROM assessments a
    INNER JOIN reports r
      ON r.assessment_id = a.id
      AND r.status = 'published'
      AND r.superseded_by IS NULL
    WHERE a.whatsapp_send_claimed_at IS NULL
      AND a.whatsapp_report_sent_at   IS NULL
      AND a.whatsapp_send_attempts    < ${MAX_WA_ATTEMPTS}
      AND a.archetype IS NOT NULL
      AND a.phone IS NOT NULL
      AND a.parent_name IS NOT NULL
    ORDER BY a.created_at ASC
    LIMIT ${BATCH_SIZE}
  ` as unknown as { session_id: string; child_name: string | null; parent_name: string | null; phone: string | null }[];

  const results: { sessionId: string; result: "sent" | "failed" | "skipped" }[] = [];

  for (const c of candidates) {
    // Atomic claim — also guards against a concurrent claim route invocation.
    const claimed = await sql`
      UPDATE assessments
      SET whatsapp_send_claimed_at = NOW(),
          whatsapp_send_attempts   = whatsapp_send_attempts + 1
      WHERE session_id = ${c.session_id}::uuid
        AND whatsapp_send_claimed_at IS NULL
        AND whatsapp_report_sent_at   IS NULL
        AND whatsapp_send_attempts    < ${MAX_WA_ATTEMPTS}
        AND EXISTS (
          SELECT 1 FROM reports r
          JOIN assessments a ON a.id = r.assessment_id
          WHERE a.session_id = ${c.session_id}::uuid
            AND r.status = 'published'
            AND r.superseded_by IS NULL
        )
      RETURNING child_name, parent_name, phone
    ` as unknown as { child_name: string | null; parent_name: string | null; phone: string | null }[];

    if (claimed.length === 0) {
      results.push({ sessionId: c.session_id, result: "skipped" });
      continue;
    }

    const row = claimed[0];
    try {
      await sendWhatsAppReport({
        parentName: row.parent_name ?? c.parent_name ?? "Parent",
        childName:  row.child_name  ?? c.child_name  ?? "your child",
        sessionId:  c.session_id,
        rawPhone:   row.phone       ?? c.phone       ?? "",
      });
      await sql`UPDATE assessments SET whatsapp_report_sent_at = NOW() WHERE session_id = ${c.session_id}::uuid`;
      results.push({ sessionId: c.session_id, result: "sent" });
    } catch (e: unknown) {
      console.error("[cron/retry-whatsapp] send failed:", c.session_id, (e as Error).message);
      await sql`
        UPDATE assessments SET whatsapp_send_claimed_at = NULL
        WHERE session_id = ${c.session_id}::uuid
      `.catch((e2: unknown) => console.error("[cron/retry-whatsapp] claim release failed:", (e2 as Error).message));
      results.push({ sessionId: c.session_id, result: "failed" });
    }
  }

  // Alert on exhausted sessions — these need manual recovery via the admin panel.
  const exhaustedRows = await sql`
    SELECT COUNT(*)::int AS count
    FROM assessments
    WHERE whatsapp_report_sent_at IS NULL
      AND whatsapp_send_attempts  >= ${MAX_WA_ATTEMPTS}
      AND whatsapp_send_claimed_at IS NULL
      AND archetype IS NOT NULL
      AND phone IS NOT NULL
  ` as unknown as { count: number }[];

  const exhausted = (exhaustedRows[0] as { count: number })?.count ?? 0;
  if (exhausted > 0) {
    console.error(
      `[cron/retry-whatsapp] ${exhausted} session(s) exhausted all ${MAX_WA_ATTEMPTS} attempts.`,
      "Manual recovery required — see Admin > Overview > WhatsApp Recovery.",
    );
  }

  // Alert on sessions where generation never completed — report never published,
  // parent submitted gate, more than 10 minutes ago. See Admin > Overview > Report Generation Failed.
  const neverGeneratedRows = await sql`
    SELECT COUNT(*)::int AS count
    FROM assessments a
    WHERE a.parent_name IS NOT NULL
      AND a.archetype IS NOT NULL
      AND a.phone IS NOT NULL
      AND a.created_at < NOW() - INTERVAL '10 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM reports r
        WHERE r.assessment_id = a.id
          AND r.status = 'published'
          AND r.superseded_by IS NULL
      )
  ` as unknown as { count: number }[];

  const neverGenerated = (neverGeneratedRows[0] as { count: number })?.count ?? 0;
  if (neverGenerated > 0) {
    console.error(
      `[cron/retry-whatsapp] ${neverGenerated} session(s) have no published report after gate submission.`,
      "Report generation may have failed — see Admin > Overview > Report Generation Failed.",
    );
  }

  return NextResponse.json({
    processed:     candidates.length,
    sent:          results.filter(r => r.result === "sent").length,
    failed:        results.filter(r => r.result === "failed").length,
    skipped:       results.filter(r => r.result === "skipped").length,
    exhausted,
    neverGenerated,
  });
}
