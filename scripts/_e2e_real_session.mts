const BASE = "http://localhost:3007";
const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "dev-local-admin";
const sessionId = "c7b99c53-1178-4161-8efe-c23bcd886a66";

const genResp = await fetch(`${BASE}/api/report/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ADMIN_KEY}` },
  body: JSON.stringify({ sessionId }),
});
const text = await genResp.text();
console.log(`Status: ${genResp.status}`);
console.log(text.slice(0, 3000));
process.exit(0);
