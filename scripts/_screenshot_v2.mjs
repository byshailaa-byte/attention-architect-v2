import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const TOKEN = "66cbb0d0-5082-43bb-b743-51016b80bf1b.1791904251.wcPEt3OAq08xJqMAGeAsyFCpt2O4XGlQsTNkU6Yt_yU";
const BASE  = "http://localhost:3007";
const OUT   = "/tmp/lmsv2_ss";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function makePage(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 860 } });
  await ctx.addCookies([{
    name: "lms_session", value: TOKEN,
    domain: "localhost", path: "/",
    httpOnly: true, sameSite: "Lax",
  }]);
  return ctx.newPage();
}

async function go(page, url, file) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: join(OUT, file), fullPage: false });
  console.log(`✓ ${file}`);
}

// Desktop (1280)
const desk = await makePage(1280);
await go(desk, "/lms-v2",                 "home_desk.png");
await go(desk, "/lms-v2/week/3",          "week3_desk.png");
await go(desk, "/lms-v2/week/3/day/3",    "day3_desk.png");
await go(desk, "/lms-v2/week/2/weekend",  "weekend_desk.png");
await go(desk, "/lms-v2/progress",        "progress_desk.png");
await desk.context().close();

// Mobile (390)
const mob = await makePage(390);
await go(mob, "/lms-v2",                  "home_mob.png");
await go(mob, "/lms-v2/week/3",           "week3_mob.png");
await go(mob, "/lms-v2/week/3/day/3",     "day3_mob.png");
await go(mob, "/lms-v2/progress",         "progress_mob.png");
await mob.context().close();

await browser.close();
console.log(`\nScreenshots → ${OUT}`);
