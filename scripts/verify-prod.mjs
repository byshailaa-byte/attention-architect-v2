import { chromium } from "playwright";

const BASE = "https://attentionparents.thehumandecision.in";
const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? "";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  httpCredentials: ADMIN_PASS ? { username: "admin", password: ADMIN_PASS } : undefined,
});
const page = await ctx.newPage();

// 1. Public report page
console.log("Loading report page...");
const reportRes = await page.goto(`${BASE}/report/25805e5b-d777-4680-af7d-3d513c4b6a8d`, { waitUntil: "networkidle", timeout: 30000 });
console.log("Report status:", reportRes?.status());
await page.screenshot({ path: "/tmp/report-page.png", fullPage: false });
console.log("Report screenshot saved.");

// 2. Admin dashboard (if password provided)
if (ADMIN_PASS) {
  console.log("Loading admin dashboard...");
  const adminRes = await page.goto(`${BASE}/admin`, { waitUntil: "networkidle", timeout: 30000 });
  console.log("Admin status:", adminRes?.status());
  await page.screenshot({ path: "/tmp/admin-dashboard.png", fullPage: false });
  console.log("Admin screenshot saved.");
} else {
  console.log("ADMIN_PASSWORD not set — skipping admin screenshot");
}

await browser.close();
