import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Use "all time" range (epoch to now)
const fromISO = "1970-01-01T00:00:00.000Z";
const toISO = new Date().toISOString();

async function kpi(showInternal: boolean) {
  const [kpiRows] = await sql`
    SELECT
      COALESCE((SELECT SUM(p.amount_paise) FROM purchases p WHERE p.status = 'paid'
                AND p.created_at >= ${fromISO}::timestamptz AND p.created_at <= ${toISO}::timestamptz
                AND EXISTS (SELECT 1 FROM assessments ax WHERE ax.id = p.assessment_id AND (${showInternal} OR NOT ax.is_internal)))::bigint, 0) AS revenue_paise,
      (SELECT COUNT(*)::int FROM purchases p WHERE p.status = 'paid'
       AND p.created_at >= ${fromISO}::timestamptz AND p.created_at <= ${toISO}::timestamptz
       AND EXISTS (SELECT 1 FROM assessments ax WHERE ax.id = p.assessment_id AND (${showInternal} OR NOT ax.is_internal)))                      AS paid_count,
      (SELECT COUNT(*)::int FROM assessments WHERE archetype IS NOT NULL
       AND created_at >= ${fromISO}::timestamptz AND created_at <= ${toISO}::timestamptz
       AND (${showInternal} OR NOT is_internal))                                                                                                  AS completed_count,
      (SELECT archetype FROM assessments WHERE archetype IS NOT NULL
       AND created_at >= ${fromISO}::timestamptz AND created_at <= ${toISO}::timestamptz
       AND (${showInternal} OR NOT is_internal)
       GROUP BY archetype ORDER BY COUNT(*) DESC LIMIT 1)                                                                                         AS top_archetype
  ` as { revenue_paise: bigint; paid_count: number; completed_count: number; top_archetype: string }[];

  const archetypeRows = await sql`
    SELECT archetype, COUNT(*)::int AS count
    FROM assessments
    WHERE archetype IS NOT NULL
      AND created_at >= ${fromISO}::timestamptz AND created_at <= ${toISO}::timestamptz
      AND (${showInternal} OR NOT is_internal)
    GROUP BY archetype
    ORDER BY count DESC
  ` as { archetype: string; count: number }[];

  return { kpi: kpiRows, archetypes: archetypeRows };
}

const off = await kpi(false);
const on  = await kpi(true);

console.log("══════════════════════════════════════════");
console.log("KPI — showInternal OFF (default, real users only)");
console.log("══════════════════════════════════════════");
console.log(`  revenue_paise:     ${off.kpi.revenue_paise}`);
console.log(`  paid_count:        ${off.kpi.paid_count}`);
console.log(`  completed_count:   ${off.kpi.completed_count}`);
console.log(`  top_archetype:     ${off.kpi.top_archetype}`);
console.log("\nArchetype distribution:");
for (const r of off.archetypes) console.log(`  ${r.archetype.padEnd(30)} ${r.count}`);

console.log("\n══════════════════════════════════════════");
console.log("KPI — showInternal ON (all sessions)");
console.log("══════════════════════════════════════════");
console.log(`  revenue_paise:     ${on.kpi.revenue_paise}`);
console.log(`  paid_count:        ${on.kpi.paid_count}`);
console.log(`  completed_count:   ${on.kpi.completed_count}`);
console.log(`  top_archetype:     ${on.kpi.top_archetype}`);
console.log("\nArchetype distribution:");
for (const r of on.archetypes) console.log(`  ${r.archetype.padEnd(30)} ${r.count}`);

const internalSessions = on.kpi.completed_count - off.kpi.completed_count;
console.log(`\n  → ${internalSessions} internal sessions currently filtered out by default`);
