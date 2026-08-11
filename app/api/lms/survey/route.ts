import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";

assertBootGuards();

type SurveyType = "week3_pulse" | "week6_comprehensive";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value ?? "";
    const userId = verifySessionToken(token);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { type, dismiss } = body as {
      type: SurveyType;
      dismiss?: boolean;
      // pulse fields
      rating?: number;
      open_text?: string;
      // comprehensive fields
      nps_score?: number;
      behavior_change?: string;
      worked_best?: string;
      hardest?: string;
      advocate_selections?: string[];
    };

    if (type !== "week3_pulse" && type !== "week6_comprehensive") {
      return NextResponse.json({ error: "Invalid survey type" }, { status: 400 });
    }

    const sql = getSql();

    if (dismiss) {
      await sql`
        INSERT INTO lms_surveys (user_id, survey_type, dismissed_at)
        VALUES (${userId}, ${type}, NOW())
        ON CONFLICT (user_id, survey_type)
        DO UPDATE SET dismissed_at = COALESCE(lms_surveys.dismissed_at, NOW())
      `;
      return NextResponse.json({ ok: true });
    }

    if (type === "week3_pulse") {
      const rating = Number(body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: "rating must be 1–5" }, { status: 400 });
      }
      await sql`
        INSERT INTO lms_surveys (user_id, survey_type, submitted_at, rating, open_text)
        VALUES (${userId}, 'week3_pulse', NOW(), ${rating}, ${body.open_text ?? null})
        ON CONFLICT (user_id, survey_type)
        DO UPDATE SET submitted_at = NOW(), rating = EXCLUDED.rating, open_text = EXCLUDED.open_text
      `;
    } else {
      const nps = Number(body.nps_score);
      if (!Number.isInteger(nps) || nps < 0 || nps > 10) {
        return NextResponse.json({ error: "nps_score must be 0–10" }, { status: 400 });
      }
      const advocateSelections = Array.isArray(body.advocate_selections)
        ? body.advocate_selections.filter((s: unknown) =>
            typeof s === "string" && ["testimonial", "referral", "review"].includes(s)
          )
        : [];
      await sql`
        INSERT INTO lms_surveys (user_id, survey_type, submitted_at, nps_score, behavior_change, worked_best, hardest, advocate_selections)
        VALUES (${userId}, 'week6_comprehensive', NOW(), ${nps}, ${body.behavior_change ?? null}, ${body.worked_best ?? null}, ${body.hardest ?? null}, ${advocateSelections})
        ON CONFLICT (user_id, survey_type)
        DO UPDATE SET
          submitted_at = NOW(),
          nps_score = EXCLUDED.nps_score,
          behavior_change = EXCLUDED.behavior_change,
          worked_best = EXCLUDED.worked_best,
          hardest = EXCLUDED.hardest,
          advocate_selections = EXCLUDED.advocate_selections
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/lms/survey]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// GET: check if a user has already submitted or dismissed a survey
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value ?? "";
    const userId = verifySessionToken(token);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as SurveyType | null;
    if (type !== "week3_pulse" && type !== "week6_comprehensive") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const sql = getSql();
    const rows = (await sql`
      SELECT submitted_at, dismissed_at FROM lms_surveys
      WHERE user_id = ${userId} AND survey_type = ${type}
    `) as unknown as { submitted_at: Date | null; dismissed_at: Date | null }[];

    const row = rows[0];
    return NextResponse.json({
      done: !!(row?.submitted_at || row?.dismissed_at),
      submitted: !!row?.submitted_at,
      dismissed: !!row?.dismissed_at,
    });
  } catch (e) {
    console.error("[api/lms/survey GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
