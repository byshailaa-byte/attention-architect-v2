import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { getSql } from "@/lib/db/client";
import type { AgeBand } from "@/content/types";
import type { Gender } from "@/lib/report/pronouns";

export type LmsUserContext = {
  userId: string;
  assessmentId: string;
  childName: string;
  childGender: Gender;
  ageBand: AgeBand;
  archetype: string;
  parentPattern: string;
  weakestTwo: string[];
};

function normalizeGender(raw: string | null): Gender {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === "boy" || v === "m" || v === "male") return "boy";
  if (v === "girl" || v === "f" || v === "female") return "girl";
  if (v === "non-binary") return "non-binary";
  if (v === "prefer-not-to-say") return "prefer-not-to-say";
  return null;
}

// Server-side only. Reads the session cookie, verifies it, and loads the user's
// most recent paid assessment. Redirects to /lms/login if unauthenticated,
// redirects to / if no paid assessment exists.
export async function getLmsUserContext(): Promise<LmsUserContext> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? "";
  const userId = verifySessionToken(token);
  if (!userId) redirect("/lms/login");

  const sql = getSql();
  const rows = (await sql`
    SELECT
      a.id,
      a.child_name,
      a.child_gender,
      a.age_band,
      a.archetype,
      a.parent_pattern,
      a.weakest_two
    FROM assessments a
    JOIN purchases p ON p.assessment_id = a.id
    WHERE p.user_id = ${userId}
      AND p.status  = 'paid'
    ORDER BY p.created_at DESC
    LIMIT 1
  `) as unknown as {
    id: string;
    child_name: string;
    child_gender: string | null;
    age_band: AgeBand;
    archetype: string;
    parent_pattern: string;
    weakest_two: string[] | null;
  }[];

  if (rows.length === 0) redirect("/");

  const a = rows[0];
  return {
    userId,
    assessmentId: a.id,
    childName: a.child_name ?? "your child",
    childGender: normalizeGender(a.child_gender),
    ageBand: a.age_band,
    archetype: a.archetype,
    parentPattern: a.parent_pattern,
    weakestTwo: a.weakest_two ?? [],
  };
}
