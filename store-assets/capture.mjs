import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const assets = [
  { html: 'screenshot.html', output: 'screenshot-1280x800.png', width: 1280, height: 800 },
  { html: 'promo-small.html', output: 'promo-440x280.png', width: 440, height: 280 },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const asset of assets) {
  const filePath = path.join(__dirname, asset.html);
  await page.setViewportSize({ width: asset.width, height: asset.height });
  await page.goto(`file://${filePath}`);
  await page.screenshot({
    path: path.join(__dirname, asset.output),
    clip: { x: 0, y: 0, width: asset.width, height: asset.height },
  });
  console.log(`Created ${asset.output}`);
}

await browser.close();