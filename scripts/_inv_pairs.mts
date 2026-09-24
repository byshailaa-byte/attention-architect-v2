import { neon } from "@neondatabase/serverless";
const PROD = "postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(PROD);

// ── C: THE FOUR REPEAT PAIRS ───────────────────────────────────────────────────
// Anup, Rithvik, Aditi, Batul
// We need to find their sessions. From _inv_db.mts output:
//   Anup: email gap=18d archetypes=[Explorer, Captain], phone=...9921
//   Rithvik: phone=...7773, gap=16d archetypes=[Live Wire, All-In Kid]
//   Aditi: phone=...5577, gap=0d archetypes=[All-In Kid, Explorer]
//   Batul: email=rashidan100@gmail.com, phone=...2234, gap=24d archetypes=[Magnet×2]

const PAIRS = [
  { name: "Anup" },
  { name: "Rithvik" },
  { name: "Aditi" },
  { name: "Batul" },
];

for (const pair of PAIRS) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`=== PAIR: ${pair.name} ===`);
  console.log('='.repeat(70));

  const sessions = await sql`
    SELECT
      a.session_id,
      a.child_name,
      a.email,
      a.phone,
      a.created_at,
      a.age_band,
      a.answers,
      a.dimensions,
      a.archetype,
      a.parent_pattern,
      r.id AS report_id,
      r.archetype AS r_archetype,
      r.parent_instinct AS r_parent_instinct,
      r.archetype_fit_tier,
      r.generated_at
    FROM assessments a
    LEFT JOIN reports r ON r.assessment_id = a.id AND r.status = 'published'
    WHERE a.child_name = ${pair.name}
    ORDER BY a.created_at
  ` as unknown as {
    session_id: string;
    child_name: string;
    email: string;
    phone: string;
    created_at: string;
    age_band: string;
    answers: Record<string, string>;
    dimensions: Record<string, {value:string;consistency:number;data_points:number;winning_votes:number}>;
    archetype: string;
    parent_pattern: string;
    report_id: string;
    r_archetype: string;
    r_parent_instinct: string;
    archetype_fit_tier: string;
    generated_at: string;
  }[];

  if (sessions.length === 0) {
    console.log(`  No sessions found for ${pair.name}`);
    continue;
  }

  console.log(`  Found ${sessions.length} session(s):`);
  sessions.forEach((s,i) => {
    console.log(`\n  [Session ${i+1}] session_id=${s.session_id}`);
    console.log(`    created_at=${s.created_at}`);
    console.log(`    email=${s.email}  phone=${s.phone ? '...'+s.phone.slice(-4) : 'null'}`);
    console.log(`    age_band=${s.age_band}`);
    console.log(`    archetype(assessment)=${s.archetype}  parent_pattern=${s.parent_pattern}`);
    console.log(`    archetype(report)=${s.r_archetype}  instinct(report)=${s.r_parent_instinct}  fit_tier=${s.archetype_fit_tier}`);
    console.log(`    report_generated=${s.generated_at}`);

    if (s.answers) {
      console.log(`    ANSWERS (${Object.keys(s.answers).length} items):`);
      const sorted = Object.entries(s.answers).sort(([a],[b]) => a.localeCompare(b, undefined, {numeric: true}));
      sorted.forEach(([qid, ans]) => console.log(`      ${qid.padEnd(12)} = ${ans}`));
    } else {
      console.log(`    ANSWERS: null`);
    }

    if (s.dimensions) {
      console.log(`    DIMENSIONS:`);
      Object.entries(s.dimensions).forEach(([dim, val]) => {
        console.log(`      ${dim.padEnd(24)} = ${(val as {value:string;consistency:number;data_points:number;winning_votes:number}).value}  (consistency=${(val as {value:string;consistency:number;data_points:number;winning_votes:number}).consistency.toFixed(2)}, dp=${(val as {value:string;consistency:number;data_points:number;winning_votes:number}).data_points}, wv=${(val as {value:string;consistency:number;data_points:number;winning_votes:number}).winning_votes})`);
      });
    }
  });

  // Diff answers between sessions 1 and 2
  if (sessions.length >= 2) {
    const s1 = sessions[0];
    const s2 = sessions[1];
    const ans1 = s1.answers || {};
    const ans2 = s2.answers || {};
    const allQids = new Set([...Object.keys(ans1), ...Object.keys(ans2)]);

    console.log(`\n  DIFF (session 1 vs session 2):`);
    const d1s = String(s1.created_at).substring(0,10);
    const d2s = String(s2.created_at).substring(0,10);
    console.log(`  date gap: ${d1s} → ${d2s}`);
    console.log(`  archetype change: ${s1.r_archetype || s1.archetype} → ${s2.r_archetype || s2.archetype}`);

    const diffLines: string[] = [];
    const sameLines: string[] = [];
    const onlyIn1: string[] = [];
    const onlyIn2: string[] = [];

    const sorted = Array.from(allQids).sort((a,b) => a.localeCompare(b, undefined, {numeric:true}));
    for (const qid of sorted) {
      if (qid in ans1 && qid in ans2) {
        if (ans1[qid] !== ans2[qid]) {
          diffLines.push(`      ${qid.padEnd(12)}: ${ans1[qid].padEnd(24)} → ${ans2[qid]}`);
        } else {
          sameLines.push(`      ${qid.padEnd(12)}: ${ans1[qid]} (same)`);
        }
      } else if (qid in ans1) {
        onlyIn1.push(`      ${qid.padEnd(12)}: ${ans1[qid]} (only in s1 — not routed in s2)`);
      } else {
        onlyIn2.push(`      ${qid.padEnd(12)}: ${ans2[qid]} (only in s2 — not routed in s1)`);
      }
    }

    console.log(`\n  Questions asked in BOTH (${sameLines.length + diffLines.length}):`);
    sameLines.forEach(l => console.log(l));
    diffLines.forEach(l => console.log(l));

    if (onlyIn1.length) {
      console.log(`\n  Only in session 1 (${onlyIn1.length}):`);
      onlyIn1.forEach(l => console.log(l));
    }
    if (onlyIn2.length) {
      console.log(`\n  Only in session 2 (${onlyIn2.length}):`);
      onlyIn2.forEach(l => console.log(l));
    }

    console.log(`\n  CHANGED answers: ${diffLines.length}`);
    console.log(`  ROUTED SET DIFF: s1_only=${onlyIn1.length}  s2_only=${onlyIn2.length}`);

    // Determine cause of archetype change
    const arch1 = s1.r_archetype || s1.archetype;
    const arch2 = s2.r_archetype || s2.archetype;
    if (arch1 === arch2) {
      console.log(`\n  ARCHETYPE: unchanged (${arch1})`);
    } else {
      console.log(`\n  ARCHETYPE CHANGED: ${arch1} → ${arch2}`);
      const dims1 = s1.dimensions || {};
      const dims2 = s2.dimensions || {};
      // The archetype is determined by attention_shape × reward_driver
      const shape1 = (dims1.attention_shape as {value:string})?.value;
      const shape2 = (dims2.attention_shape as {value:string})?.value;
      const driver1 = (dims1.reward_driver as {value:string})?.value;
      const driver2 = (dims2.reward_driver as {value:string})?.value;
      console.log(`    attention_shape:  ${shape1} → ${shape2} (${shape1===shape2 ? 'SAME' : 'CHANGED'})`);
      console.log(`    reward_driver:    ${driver1} → ${driver2} (${driver1===driver2 ? 'SAME' : 'CHANGED'})`);

      if (shape1 === shape2 && driver1 === driver2) {
        console.log(`    => Dimensions unchanged but archetype differs — INVESTIGATE: likely same-session duplicate`);
      } else if (diffLines.length === 0 && (onlyIn1.length > 0 || onlyIn2.length > 0)) {
        console.log(`    => No answer changes, but different question set was routed → dimension tallies differ → archetype changed`);
      } else if (diffLines.length > 0) {
        console.log(`    => Answer(s) changed → dimension tally changed → archetype changed`);
      }
    }

    // Check report generation dates vs any code deploy dates
    console.log(`\n  Generation dates: s1=${String(s1.generated_at??'').substring(0,10)}  s2=${String(s2.generated_at??'').substring(0,10)}`);
  }
}

console.log("\nDone with C.");
