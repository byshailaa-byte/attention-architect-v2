import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const WHERE: Record<string, Record<string, string>> = {
  attention_shape: {
    "narrow-deep":       "Starting something they can go right into, and staying there.",
    "wide-shifting":     "Starting homework, a new topic, anything unfamiliar.",
    "social-anchored":   "Anything done at the kitchen table rather than alone.",
    "sensation-seeking": "Whatever's most alive in the room at the time.",
  },
  attention_competition: {
    novelty:  "A thought arriving mid-task, and the page stopping.",
    external: "Screens, a sibling in the room, noise from the next flat.",
    internal: "The moment it stops being interesting, before anything else happens.",
    social:   "Whatever's going on with the people nearby.",
  },
  friction_response: {
    avoid:              "Whether they step back quietly, before anyone notices.",
    "solo-push":        "Whether they ask, push on, or quietly stop.",
    "support-seek":     "Whether they come and find you, or wait.",
    "emotional-derail": "How long it takes to get back to it after a wobble.",
  },
  recharge_type: {
    "sensory-quiet":           "What the hour after school needs to look like.",
    "social-connection":       "Whether they want company or space after a hard day.",
    "cognitive-displacement":  "What they reach for when they need to switch off.",
    "autonomous-unstructured": "How much of the evening needs to be theirs.",
  },
};

function cleanOpener(s: string): string {
  s = s.replace(/^[…\.]+\s*/, "");
  s = s.replace(/^(But|And|Yet|So|However),?\s+/, "");
  s = s.replace(/^The structural tension here is that\s+/i, "");
  s = s.replace(/^The tension (here is|with this particular pattern is) that\s+/i, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fixLoop(s: string): string {
  return s.replace(/\bThe loop\b/g, "This dynamic").replace(/\bthe loop\b/g, "this dynamic");
}

const AXIS_TO_DIM: Record<string, string> = {
  Stability:  "friction_response",
  Resistance: "attention_competition",
  Recovery:   "recharge_type",
  Attention:  "attention_shape",
};

for (const partial of ["9d57f819", "f8fb86f2"]) {
  const rows = await sql`
    SELECT
      a.session_id, a.child_name,
      r.archetype, r.parent_instinct,
      a.weakest_two,
      a.dimensions,
      m_fit.value->>'content' AS fit_content,
      m_fit.value->>'moment_id' AS fit_moment_id,
      -- profile moment
      m_p.value->>'content' AS profile_content
    FROM reports r
    JOIN assessments a ON a.id = r.assessment_id
    LEFT JOIN LATERAL (
      SELECT value FROM jsonb_array_elements(r.narrative_moments)
      WHERE value->>'moment_id' IN ('m_03','m_instinct_interaction_fallback')
      LIMIT 1
    ) AS m_fit(value) ON true
    LEFT JOIN LATERAL (
      SELECT value FROM jsonb_array_elements(r.narrative_moments)
      WHERE value->>'moment_id' = 'm_profile'
      LIMIT 1
    ) AS m_p(value) ON true
    WHERE a.session_id::text LIKE ${partial + '%'} AND r.status = 'published'
    LIMIT 1
  `;
  if (!rows[0]) { console.log(`No row for ${partial}`); continue; }
  const r = rows[0];
  const dims = r.dimensions as Record<string, {label:string;desc:string;value:string}> ?? {};
  const wt = (r.weakest_two as string[] ?? []).map((ax: string) => AXIS_TO_DIM[ax]).filter(Boolean);
  const weakKeys = new Set(wt);

  const DIMS = [
    { key: "attention_shape",      label: "How they focus",          val: dims.attention_shape?.value ?? "", desc: dims.attention_shape?.desc ?? "" },
    { key: "attention_competition", label: "What breaks their focus", val: dims.attention_competition?.value ?? "", desc: dims.attention_competition?.desc ?? "" },
    { key: "friction_response",    label: "When it gets hard",       val: dims.friction_response?.value ?? "", desc: dims.friction_response?.desc ?? "" },
    { key: "recharge_type",        label: "How they recharge",       val: dims.recharge_type?.value ?? "", desc: dims.recharge_type?.desc ?? "" },
  ];
  const teal = DIMS.filter(d => !weakKeys.has(d.key));
  const amber = DIMS.filter(d => weakKeys.has(d.key));

  // Tension
  const content = r.fit_content as string ?? "";
  const paras = fixLoop(content).split(/\n\n+/).filter(Boolean);
  let tension: string;
  if (paras.length > 1 && (paras[paras.length-1]?.length ?? 999) < 320) {
    tension = cleanOpener(paras[paras.length-1] ?? "");
  } else {
    const text = paras[0] ?? content;
    const sentences = text.trim().split(/(?<=[.!?])\s+(?=[A-Z"])/).map((s: string) => s.trim()).filter(Boolean);
    tension = cleanOpener(sentences[sentences.length-1] ?? text);
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`${r.archetype} × ${r.parent_instinct} [${r.fit_moment_id}]`);
  console.log(`Child: ${r.child_name ?? "—"} | Session: ${(r.session_id as string).slice(0,8)}`);
  
  console.log(`\n── SNAPSHOT GRID ──`);
  for (const d of [...teal, ...amber]) {
    const isAmber = weakKeys.has(d.key);
    const whereText = WHERE[d.key]?.[d.val];
    const oneLine = whereText ?? d.desc;
    const source = whereText ? `WHERE[${d.val}]` : "desc";
    console.log(`  [${isAmber ? "Start here" : "Working  "}] ${d.label}`);
    console.log(`           val=${d.val} → source=${source}`);
    console.log(`           "${oneLine}"`);
  }

  console.log(`\n── TENSION ──`);
  console.log(`  "${tension}"`);
}
