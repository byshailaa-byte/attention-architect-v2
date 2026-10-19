// Constraint audit: for every coach-related table, pull CHECK constraints and compare the allowed
// value set against every value the CODE can write. Flags any code value a CHECK would reject (the
// class of bug that broke the opener: origin='opener' vs a CHECK of ('script','llm')).
// Runs READ-ONLY (SELECT from pg_constraint / information_schema only). TARGET=prod|dev (default dev);
// prod uses DATABASE_URL_PROD and is never written to. Gitignored.
import * as dotenv from "dotenv";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const target = process.env.TARGET === "prod" ? "prod" : "dev";
const url = target === "prod" ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL;
if (!url) throw new Error(`No ${target === "prod" ? "DATABASE_URL_PROD" : "DATABASE_URL"} set`);
const host = url.match(/@([^/:]+)/)?.[1] ?? "(unknown)";
const sql = neon(url);

// Every value the code can write, per table.column (from the TS source).
const CODE_WRITES = {
  "coach_messages.role": ["parent", "coach", "safety"],
  "coach_messages.origin": ["script", "llm", "opener"],
  "coach_messages.source": ["coach", "home", "day_card", "after_done", "chip", "module"],
  "lms_day_outcome.outcome": ["tried_worked", "tried_partly", "tried_didnt_work", "missed", "not_tried", "unclear"],
  "lms_day_outcome.source": ["tap", "chat", "model", "backstop"],
  "lms_day_outcome.trigger": ["hard", "boring", "didnt_know", "upset", "unknown"],
  "coach_trial_day_outcome.outcome": ["tried_worked", "tried_partly", "tried_didnt_work", "missed", "not_tried", "unclear"],
  "coach_trial_day_outcome.source": ["tap", "chat", "model", "backstop"],
  "coach_trial_day_outcome.trigger": ["hard", "boring", "didnt_know", "upset", "unknown"],
  "coach_tracked_number.kind": ["paid", "trial"],
  "coach_tracked_number.phase": ["baseline", "checkin"],
  "parent_memory.kind": ["paid", "trial"],
  "parent_memory.language": ["en", "hinglish", "hi"],
  "gold_examples.language": ["en", "hinglish", "hi"],
  "gold_examples.status": ["seed", "approved", "pending"],
  "coach_call_request.kind": ["paid", "trial"],
  "coach_call_request.urgency": ["urgent", "normal"],
  "coach_call_request.source": ["coach_flag", "needs_a_call"],
  "coach_call_request.status": ["open", "done", "dismissed"],
  "coach_checkin_number.kind": ["paid", "trial"],
};
const TABLES = [...new Set(Object.keys(CODE_WRITES).map((k) => k.split(".")[0]))];

async function main() {
  console.log(`\n######## COACH CONSTRAINT AUDIT — target=${target} host=${host} ########`);
  const mism = [];
  for (const table of TABLES) {
    const exists = (await sql`SELECT to_regclass(${table}) t`)[0].t;
    if (!exists) { console.log(`\n== ${table} ==  (TABLE MISSING on ${target})`); continue; }
    const cons = await sql`SELECT conname, pg_get_constraintdef(oid) def FROM pg_constraint WHERE conrelid = ${table}::regclass AND contype='c'`;
    console.log(`\n== ${table} ==`);
    for (const c of cons) console.log(`  CHECK ${c.conname}: ${c.def}`);
    // For each code-written column of this table, extract the CHECK's allowed literal set and compare.
    for (const key of Object.keys(CODE_WRITES).filter((k) => k.startsWith(table + "."))) {
      const col = key.split(".")[1];
      const relevant = cons.find((c) => new RegExp(`\\b${col}\\b`).test(c.def) && /ARRAY\[/.test(c.def));
      if (!relevant) { console.log(`  [${col}] no value CHECK → any value allowed (code writes: ${CODE_WRITES[key].join(",")})`); continue; }
      const allowed = [...relevant.def.matchAll(/'([^']+)'::text/g)].map((m) => m[1]);
      const bad = CODE_WRITES[key].filter((v) => !allowed.includes(v));
      if (bad.length) { mism.push(`${target} ${key}: code writes [${bad.join(",")}] NOT allowed by CHECK [${allowed.join(",")}]`); console.log(`  [${col}] ❌ MISMATCH — code writes ${JSON.stringify(bad)} but CHECK allows ${JSON.stringify(allowed)}`); }
      else console.log(`  [${col}] ✓ all code values allowed (${CODE_WRITES[key].length} vs CHECK ${allowed.length})`);
    }
  }
  console.log(`\n######## RESULT (${target}) ########`);
  if (mism.length === 0) console.log("  ✓ No mismatches — every code value is permitted by the table constraints.");
  else { console.log(`  ❌ ${mism.length} mismatch(es):`); mism.forEach((m) => console.log("   - " + m)); }
}
main().catch((e) => { console.error("[audit] ERROR:", e.message); process.exit(1); });
