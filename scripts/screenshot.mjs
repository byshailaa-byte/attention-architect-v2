import { chromium } from 'playwright';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const shots = [
  { url: 'http://localhost:3007/',               out: '/tmp/landing-390.png',  w: 390,  h: 844  },
  { url: 'http://localhost:3007/',               out: '/tmp/landing-768.png',  w: 768,  h: 1024 },
  { url: 'http://localhost:3007/',               out: '/tmp/landing-1440.png', w: 1440, h: 900  },
  { url: 'http://localhost:3007/pre-assessment', out: '/tmp/pre-390.png',      w: 390,  h: 844  },
  { url: 'http://localhost:3007/pre-assessment', out: '/tmp/pre-768.png',      w: 768,  h: 1024 },
  { url: 'http://localhost:3007/pre-assessment', out: '/tmp/pre-1440.png',     w: 1440, h: 900  },
];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h } });
  const page = await ctx.newPage();
  await page.goto(s.url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: s.out, fullPage: true });
  await ctx.close();
  console.log('done', s.out);
}
await browser.close();
