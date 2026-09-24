// Screenshots for What to Say feature. Two users:
//   1. Neel Nitin — The Glue × The Negotiator — W3 D3 active
//   2. Test Pusher — The Captain × The Pusher — W3 D3 active

import { chromium } from "/Users/ablespace/attention-architect-v2/node_modules/playwright/index.mjs";
import { createHmac } from "crypto";

const SECRET = "2022b399b4ce69505506e0a6af4111ad74bdf615198db142757c720938446975";
const BASE   = "http://localhost:3007";

function makeToken(userId) {
  const expires = Math.floor(Date.now() / 1000) + 86400 * 7;
  const payload = `${userId}.${expires}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

const NEEL_ID   = "66cbb0d0-5082-43bb-b743-51016b80bf1b";
const PUSHER_ID = "aaaabbbb-0001-0001-0001-000000000001";

async function shots(browser, userId, label, pages) {
  const token = makeToken(userId);
  const ctx   = await browser.newContext();
  const page  = await ctx.newPage();
  await ctx.addCookies([{ name:"lms_session", value:token, domain:"localhost", path:"/", httpOnly:true }]);

  for (const { path, name, width } of pages) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}${path}`, { waitUntil:"networkidle", timeout:20000 });
    await page.screenshot({ path:`/tmp/wts_ss/${label}_${name}_${width}.png`, fullPage:true });
    console.log(`✓ ${label} ${name} @${width}`);
  }
  await ctx.close();
}

const browser = await chromium.launch();

const commonPages = [
  { path:"/lms-v2",                   name:"home",       width:1280 },
  { path:"/lms-v2",                   name:"home",       width:390  },
  { path:"/lms-v2/what-to-say",       name:"wts",        width:1280 },
  { path:"/lms-v2/what-to-say",       name:"wts",        width:390  },
  { path:"/lms-v2/week/3/day/3",      name:"day3",       width:1280 },
  { path:"/lms-v2/week/3/day/3",      name:"day3",       width:390  },
];

await shots(browser, NEEL_ID,   "neel",   commonPages);
await shots(browser, PUSHER_ID, "pusher", commonPages);

// Also after-roadmap screenshot with accordions open
const roadmapCtx  = await browser.newContext();
const roadmapPage = await roadmapCtx.newPage();
await roadmapPage.setViewportSize({ width:1280, height:900 });
await roadmapPage.goto(`${BASE}/simplified/roadmap?session=ef5e0b12-428b-4e8a-9d14-68ddd7d1866d`, { waitUntil:"networkidle", timeout:20000 });
const summaries = await roadmapPage.$$("summary");
for (const s of summaries) { await s.click(); await roadmapPage.waitForTimeout(80); }
await roadmapPage.screenshot({ path:"/tmp/wts_ss/roadmap_AFTER.png", fullPage:true });
console.log("✓ roadmap AFTER");

await browser.close();
console.log("All done. Files in /tmp/wts_ss/");
