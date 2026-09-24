import { chromium } from "playwright";
import { mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3007";
const OUT  = path.join(__dirname, "../tmp-mobile-check");
mkdirSync(OUT, { recursive: true });

const WIDTHS = [375, 412, 430];
const SESSIONS = [
  { sid: "0565e804-3291-4748-9cef-4215366e6bc1", label: "all-in-kid" },
  { sid: "fc4e9430-4016-4b41-aaf4-adf6f8c84133", label: "explorer"   },
];

(async () => {
  const browser = await chromium.launch();

  for (const width of WIDTHS) {
    for (const { sid, label } of SESSIONS) {
      const ctx  = await browser.newContext({ viewport: { width, height: 812 } });
      const page = await ctx.newPage();

      // Report
      await page.goto(`${BASE}/preview/simplified-v1?session=${sid}`, { waitUntil: "networkidle", timeout: 25000 });
      await page.screenshot({ path: path.join(OUT, `report-${label}-${width}.png`), fullPage: true });
      console.log(`  report-${label}-${width}.png`);

      // Roadmap
      await page.goto(`${BASE}/simplified/roadmap?session=${sid}`, { waitUntil: "networkidle", timeout: 25000 });
      await page.screenshot({ path: path.join(OUT, `roadmap-${label}-${width}.png`), fullPage: true });
      console.log(`  roadmap-${label}-${width}.png`);

      await ctx.close();
    }
  }

  await browser.close();
  console.log("done — screenshots in tmp-mobile-check/");
})();
