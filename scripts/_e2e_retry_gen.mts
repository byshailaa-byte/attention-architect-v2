const BASE = "http://localhost:3007";
const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "dev-local-admin";
const sessionId = "fc950d80-e252-4061-a178-01e27b7b6ec8";

for (let attempt = 1; attempt <= 3; attempt++) {
  console.log(`\nAttempt ${attempt}...`);
  const genResp = await fetch(`${BASE}/api/report/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ADMIN_KEY}` },
    body: JSON.stringify({ sessionId }),
  });
  const gj = await genResp.json() as { moments?: {title:string;body:string}[]; archetype?: string; parent_instinct?: string; error?: string; failures?: unknown[] };
  if (genResp.ok) {
    console.log(`✓ Generate passed — archetype=${gj.archetype}  instinct=${gj.parent_instinct}`);
    const moments = gj.moments ?? [];
    console.log(`\n── Generated moments (${moments.length}) ──`);
    for (const m of moments) {
      console.log(`\n[${m.title}]`);
      console.log(m.body);
    }
    process.exit(0);
  }
  console.log(`✗ ${gj.error} — failures: ${JSON.stringify(gj.failures)}`);
  if (attempt === 3) { console.log("3 attempts exhausted"); process.exit(1); }
}
process.exit(0);
