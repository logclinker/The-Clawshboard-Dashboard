#!/usr/bin/env node
/**
 * Clawshboard screenshot tool (headless) using Playwright.
 *
 * Usage:
 *   node scripts/screenshot.mjs http://10.0.0.170:7010/ out.png
 *
 * First-time setup (one-time download, ~150MB):
 *   npm i -D playwright
 *   npx playwright install chromium
 */

import fs from 'fs';

const [,, url, out] = process.argv;
if (!url || !out) {
  console.error('Usage: node scripts/screenshot.mjs <url> <out.png>');
  process.exit(2);
}

let playwright;
try {
  playwright = await import('playwright');
} catch (e) {
  console.error('Playwright not installed. Run: npm i -D playwright');
  process.exit(2);
}

const { chromium } = playwright;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: true });
await browser.close();

console.log('Wrote', out);
