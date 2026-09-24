// Recover reports for the 9 real parents with no published report.
// Calls /api/internal/report/auto-generate serially — one at a time.
// Does NOT send WhatsApp or email. Generation only.
//
// Fill in the 9 session IDs from the Neon query before running.
// Run from the project root — requires INTERNAL_API_SECRET in env.

const BASE = "https://attention-architect-v2.vercel.app";
const SECRET = process.env.INTERNAL_API_SECRET ?? "";
if (!SECRET) { console.error("INTERNAL_API_SECRET not set"); process.exit(1); }

const SESSION_IDS: string[] = [
  // paste the 9 session UUIDs here, one per line
];

if (SESSION_IDS.length === 0) {
  console.error("No session IDs provided — fill in SESSION_IDS before running.");
  process.exit(1);
}

for (const sessionId of SESSION_IDS) {
  process.stdout.write(`${sessionId.slice(0, 8)}… `);
  try {
    const r = await fetch(`${BASE}/api/internal/report/auto-generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": SECRET,
      },
      body: JSON.stringify({ sessionId }),
    });
    const json = await r.json() as Record<string, unknown>;
    if (!r.ok) {
      console.log(`HTTP ${r.status} — ${JSON.stringify(json)}`);
    } else if (json.stored === true) {
      console.log(`✓ generated  reportId=${json.reportId}  status=${json.status}`);
    } else if (json.skipped) {
      console.log(`skipped  reason=${json.reason}`);
    } else if (json.stored === false) {
      console.log(`quality failed  failures=${JSON.stringify((json as { failures?: unknown[] }).failures?.map?.((f: unknown) => (f as { rule?: string }).rule))}`);
    } else {
      console.log(JSON.stringify(json));
    }
  } catch (e: unknown) {
    console.log(`network error — ${(e as Error).message}`);
  }
  // 5-second gap between calls — generation takes ~48s, so this is effectively
  // serial: the previous call will have resolved long before the gap expires.
  await new Promise(r => setTimeout(r, 5000));
}

console.log("\ndone.");
