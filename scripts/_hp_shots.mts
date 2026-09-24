import { chromium } from "playwright";
import fs from "fs";

const URL = "http://localhost:3007/";
const OUT = "/tmp/hp-shots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

// Desktop — 1280px
const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const d = await desktop.newPage();
await d.goto(URL, { waitUntil: "load", timeout: 20000 });
await d.waitForTimeout(1500);
await d.screenshot({ path: `${OUT}/desktop-full.png`, fullPage: true });
await d.screenshot({ path: `${OUT}/desktop-hero.png`,     fullPage: false });
await d.locator("text=It is the one capability").first().scrollIntoViewIfNeeded();
await d.waitForTimeout(300);
await d.screenshot({ path: `${OUT}/desktop-s2.png`,       fullPage: false });
await d.locator("text=We look at your child").first().scrollIntoViewIfNeeded();
await d.waitForTimeout(300);
await d.screenshot({ path: `${OUT}/desktop-s3.png`,       fullPage: false });
await d.close();

// Mobile — 390px
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const m = await mobile.newPage();
await m.goto(URL, { waitUntil: "load", timeout: 20000 });
await m.waitForTimeout(1500);
await m.screenshot({ path: `${OUT}/mobile-full.png`, fullPage: true });
await m.screenshot({ path: `${OUT}/mobile-hero.png`,     fullPage: false });
await m.locator("text=It is the one capability").first().scrollIntoViewIfNeeded();
await m.waitForTimeout(300);
await m.screenshot({ path: `${OUT}/mobile-s2.png`,       fullPage: false });
await m.close();

await browser.close();
console.log("Done:", fs.readdirSync(OUT).sort().join(", "));
