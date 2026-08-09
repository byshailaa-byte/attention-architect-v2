import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const [settings, autoGenCount] = await Promise.all([
  sql`SELECT key, value FROM app_settings WHERE key IN ('auto_generate_enabled', 'auto_generate_pipeline_start_at')` as unknown as Promise<{ key: string; value: string }[]>,
  sql`SELECT COUNT(*)::int AS n FROM reports WHERE auto_generated = true` as unknown as Promise<{ n: number }[]>,
]);

const byKey = Object.fromEntries((settings as any[]).map((r: any) => [r.key, r.value]));
const count = (autoGenCount as any[])[0]?.n ?? 0;

console.log("auto_generate_enabled:", byKey["auto_generate_enabled"] ?? "(not set)");
console.log("auto_generate_pipeline_start_at:", byKey["auto_generate_pipeline_start_at"] ?? "(not set — clock not started)");
console.log("auto_generated report count:", count);
console.log("gating window armed:", count < 20 ? `YES (${count}/20 used)` : "NO — window already closed");
