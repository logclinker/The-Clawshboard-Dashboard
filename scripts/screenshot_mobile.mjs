import { chromium } from 'playwright';
const [,, url, out] = process.argv;
if(!url||!out){ console.error('usage: node screenshot_mobile.mjs <url> <out>'); process.exit(2); }
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 880 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('Wrote', out);
