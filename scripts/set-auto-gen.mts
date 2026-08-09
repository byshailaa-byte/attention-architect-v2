import { neon } from "@neondatabase/serverless";

const val = process.env.SET_VALUE ?? "false";
const sql = neon(process.env.DATABASE_URL!);
const r = await sql`
  UPDATE app_settings
  SET value = ${val}, updated_at = now()
  WHERE key = 'auto_generate_enabled'
  RETURNING key, value
` as unknown as { key: string; value: string }[];

if (r.length === 0) {
  console.error("ERROR: row not found");
  process.exit(1);
}
console.log(`${r[0].key} = ${r[0].value}`);
