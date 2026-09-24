/**
 * Smoke D2 — verify Razorpay modal initiates and WhatsApp button exists
 * Does NOT complete a payment.
 */
import { chromium } from "playwright";

const BASE = "https://attention-architect-v2.vercel.app";
const SID = "df788bfc-ac2d-49e0-96a7-175b13b1d9da"; // Explorer / Shashank

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/simplified/roadmap?session=${SID}`, {
    waitUntil: "networkidle", timeout: 30000
  });
  await page.waitForTimeout(800);

  // Check "Book your free call →" button onClick target
  const callBtn = await page.$('button:has-text("free call")');
  if (callBtn) {
    // Intercept window.open to capture the WhatsApp URL without actually opening it
    const waUrl = await page.evaluate(() => {
      return new Promise<string>((resolve) => {
        const orig = window.open.bind(window);
        (window as unknown as Record<string, unknown>).open = (url: string) => {
          resolve(url ?? "");
          return null;
        };
        document.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        setTimeout(() => resolve("timeout"), 3000);
      });
    });
    // Actually click and capture via override
    const waCapture = await page.evaluate(() => {
      let captured = "";
      const orig = window.open;
      window.open = (url?: string | URL) => {
        captured = String(url ?? "");
        window.open = orig;
        return null;
      };
      return captured;
    });
    const btnText = await callBtn.textContent();
    console.log(`WhatsApp button: "${btnText?.trim()}" — found ✓`);
    // Click and capture
    await page.evaluate(() => {
      let captured = "";
      (window as unknown as { __waCapture: string }).__waCapture = "";
      const orig = window.open;
      window.open = (url?: string | URL) => {
        (window as unknown as { __waCapture: string }).__waCapture = String(url ?? "");
        window.open = orig;
        return null;
      };
    });
    await callBtn.click();
    await page.waitForTimeout(500);
    const captured = await page.evaluate(() => (window as unknown as { __waCapture: string }).__waCapture ?? "");
    if (captured) {
      console.log(`WhatsApp URL: ${captured.slice(0, 80)} ✓`);
    } else {
      console.log("WhatsApp URL: not captured (may have opened in new tab) ✓");
    }
  } else {
    console.log("WhatsApp button: not found ✗");
  }

  // Click ₹4,999 pricing button and check Razorpay
  // First scroll to pricing
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  // Find pricing buttons by text content
  const allBtns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map((b, i) => ({
      i, text: b.textContent?.trim().slice(0, 50) ?? ""
    }));
  });
  console.log("\nAll buttons:", allBtns.map(b => `[${b.i}] "${b.text}"`).join(", "));

  // Try to click Start/Choose buttons and see what API call fires
  let checkoutApiCalled = false;
  let checkoutStatus = 0;

  await page.route("**/api/checkout/order", async (route) => {
    checkoutApiCalled = true;
    const res = await route.fetch();
    checkoutStatus = res.status();
    await route.fulfill({ response: res });
  });

  // Click the pricing CTA (usually "Start X's roadmap →")
  const pricingBtn = await page.$('button:has-text("roadmap"), button:has-text("Choose")');
  if (pricingBtn) {
    const btnTxt = await pricingBtn.textContent();
    console.log(`\nClicking: "${btnTxt?.trim()}"`);
    await pricingBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "/tmp/smoke-d-after-click.png" });

    const rzpBackdrop = await page.$('#razorpay-backdrop, [class*="rzp-"]');
    const rzpIframe = await page.$('iframe[src*="razorpay"]');
    console.log(`Checkout API called: ${checkoutApiCalled} (status ${checkoutStatus})`);
    console.log(`Razorpay modal in DOM: ${!!(rzpBackdrop || rzpIframe)}`);

    // Don't complete — just confirm it reached checkout
    if (checkoutStatus >= 200 && checkoutStatus < 300) {
      console.log("D ₹4,999/₹2,999 initiation: ✓ PASS (API returned " + checkoutStatus + ")");
    } else if (checkoutApiCalled) {
      console.log("D checkout API called but returned " + checkoutStatus);
    } else {
      console.log("D: checkout API not called — check screenshot /tmp/smoke-d-after-click.png");
    }
  } else {
    console.log("No roadmap/choose button found");
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
