import { chromium } from "playwright";

const PROD = "https://attention-architect-v2.vercel.app";
// Use the Glue session (3876b5dc) — confirmed live customer
const SESSION = "3876b5dc-acb7-4f4b-895b-829465147448";
const browser = await chromium.launch({ headless: true });

async function check(label: string, url: string): Promise<{ status: number; title: string; h1: string }> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  const status = resp?.status() ?? 0;
  const title = await page.title();
  const h1 = await page.locator("h1").first().innerText().catch(() => "");
  await ctx.close();
  return { status, title, h1 };
}

// /lms with session cookie simulation — pass session via query param as the app supports
const lms   = await check("/lms",    `${PROD}/lms?session=${SESSION}`);
const lmsv2 = await check("/lms-v2", `${PROD}/lms-v2?session=${SESSION}`);
// /admin — expect 401
const ctx3 = await browser.newContext();
const p3 = await ctx3.newPage();
const r3 = await p3.goto(`${PROD}/admin`, { waitUntil: "networkidle", timeout: 10000 });
const adminStatus = r3?.status() ?? 0;
await ctx3.close();

console.log(`/lms       status=${lms.status}  title="${lms.title}"  h1="${lms.h1}"`);
console.log(`/lms-v2    status=${lmsv2.status}  title="${lmsv2.title}"  h1="${lmsv2.h1}"`);
console.log(`/admin     status=${adminStatus}`);

await browser.close();
process.exit(0);
