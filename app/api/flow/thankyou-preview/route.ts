import { NextRequest, NextResponse } from "next/server";
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { buildModules } from "@/lib/lms/modules";
import { fillLmsContent } from "@/lib/lms/render";
import { WEEK_TITLES } from "@/lib/report/skills";
import type { AgeBand } from "@/content/types";
import type { Gender } from "@/lib/report/pronouns";

// Read-only "while you wait" preview for the v2 thank-you screen, built from the REAL
// LMS content for the child's archetype + age band (week 1). No DB, no prices, no links.

const BANDS: AgeBand[] = ["8-9", "10-11", "12-14"];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const archetype = sp.get("archetype") ?? "";
  const band = (BANDS.includes(sp.get("ageBand") as AgeBand) ? sp.get("ageBand") : "10-11") as AgeBand;
  const name = sp.get("name") ?? "";
  const gender = (sp.get("gender") ?? null) as Gender;

  // Week-1 content; fall back to band-agnostic if this band's copy is incomplete.
  const content = getLmsWeekContent(archetype, 1, band) ?? getLmsWeekContent(archetype, 1);
  if (!content) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const mods = buildModules(content, band);
  let fast = 0, slow = 0;
  for (const m of mods) { fast += Math.max(1, Math.ceil(m.words / 230)); slow += Math.max(1, Math.ceil(m.words / 170)); }
  const readingMin = fast === slow ? `${fast} min reading` : `${fast}–${slow} min reading`;

  const day2 = getDayCard(content, 2);
  const day2Title = day2 ? fillLmsContent(day2.title, name || "your child", gender) : "";

  return NextResponse.json({
    ok: true,
    weekTitle: WEEK_TITLES[1],
    readingLine: `${readingMin} · 5 min a day`,
    modules: mods.map((m) => ({ index: m.index, title: m.title })),
    day2Title,
    weeks: [1, 2, 3].map((n) => ({ n, title: WEEK_TITLES[n] })),
  });
}
