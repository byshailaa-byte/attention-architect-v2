import { chromium } from "playwright";

const BASE = "https://attentionparents.thehumandecision.in";

const REPORTS = [
  { session: "25805e5b-d777-4680-af7d-3d513c4b6a8d", label: "Virti/Pooja — The All-In Kid" },
  { session: "18c76938-8ad1-4d9d-8bc5-f7dc34b6c712", label: "Ayaan/Neena — The Inventor" },
  { session: "2105c54c-b338-4f43-ab30-42dc1b475be9", label: "Haseena/Sumaya — The Storm" },
];

async function verifyOne({ session, label }) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  const apiHits = [];
  const navigatedToCheckoutStub = [];

  page.on("response", resp => {
    if (resp.url().includes("/api/checkout/order")) {
      apiHits.push(`${resp.status()} ${resp.url()}`);
    }
  });
  page.on("request", req => {
    // If the broken <a href="/checkout"> stub is hit, Next.js redirects to "/"
    // That shows up as a navigation to "/"
  });

  const pageRes = await page.goto(`${BASE}/report/${session}`, { waitUntil: "networkidle", timeout: 40000 });
  const pageStatus = pageRes?.status();

  // Scroll to bottom to reach PriceCards
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);

  // Confirm buttons exist, not broken <a> links
  const btn999Count = await page.locator("button").filter({ hasText: /Open.*Roadmap/ }).count();
  const brokenLinkCount = await page.locator('a[href*="/checkout?session"]').count();

  // Click ₹999
  const btn = page.locator("button").filter({ hasText: /Open.*Roadmap/ }).first();
  await btn.click();
  await page.waitForTimeout(4000);

  const frames = page.frames();
  const razorpayFrames = frames.filter(f => f.url().includes("razorpay") || f.url().includes("api.razorpay"));

  await page.screenshot({ path: `/tmp/checkout-${session.slice(0,8)}.png` });
  await browser.close();

  return {
    label,
    session,
    pageStatus,
    btn999Found: btn999Count > 0,
    brokenLinksRemaining: brokenLinkCount,
    orderApiStatus: apiHits[0] ?? "no hit",
    razorpayOpened: razorpayFrames.length > 0,
    razorpayUrl: razorpayFrames[0]?.url()?.slice(0, 80) ?? "none",
  };
}

const results = await Promise.all(REPORTS.map(verifyOne));

for (const r of results) {
  console.log(`\n── ${r.label}`);
  console.log(`   page status:         ${r.pageStatus}`);
  console.log(`   ₹999 button found:   ${r.btn999Found}`);
  console.log(`   broken <a> links:    ${r.brokenLinksRemaining} (must be 0)`);
  console.log(`   /api/checkout/order: ${r.orderApiStatus}`);
  console.log(`   Razorpay opened:     ${r.razorpayOpened}`);
  console.log(`   screenshot:          /tmp/checkout-${r.session.slice(0,8)}.png`);
}

const allPass = results.every(r =>
  r.pageStatus === 200 &&
  r.btn999Found &&
  r.brokenLinksRemaining === 0 &&
  r.orderApiStatus.startsWith("200") &&
  r.razorpayOpened
);
console.log(`\nOverall: ${allPass ? "ALL PASS" : "FAILURE"}`);
