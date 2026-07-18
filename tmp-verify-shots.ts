import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    httpCredentials: { username: "", password: "dev-local-admin" },
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3007/admin");
  await page.waitForLoadState("networkidle");

  // Overview
  await page.screenshot({ path: "/tmp/v-overview.png" });

  // Funnel
  await page.click("text=Funnel");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/v-funnel.png" });

  // User Journeys — open first row's Answers → then Event Timeline
  await page.click("text=User Journeys");
  await page.waitForTimeout(400);
  const answersBtn = page.locator('button:has-text("Answers →")').first();
  await answersBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/v-journeys-answers.png" });
  await page.click("button:has-text('Event Timeline')");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/tmp/v-journeys-timeline.png" });

  // Also verify Report → link exists and is clickable
  const reportLinks = page.locator('a:has-text("Report →")');
  const reportCount = await reportLinks.count();
  console.log("Report → links visible on page:", reportCount);

  // Close panel
  await page.click("button:has-text('Close')");
  await page.waitForTimeout(300);

  // Drop-offs
  await page.click("text=Drop-offs");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/v-dropoffs.png" });

  // LMS Activity
  await page.click("text=LMS Activity");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/v-lms.png" });

  // Users
  await page.click("text=Users");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/v-users.png" });

  // Archetypes
  await page.click("text=Archetypes");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/v-archetypes.png" });

  await browser.close();
  console.log("All screenshots done.");
}
main().catch(e => { console.error(e); process.exit(1); });
