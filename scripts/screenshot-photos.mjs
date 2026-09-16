import { chromium } from "playwright";

const OUT = "C:/Users/rana0/AppData/Local/Temp/claude/c--Projects-smart-Torism/b613d8f1-fd0c-4a89-aa8b-45533c80173f/scratchpad/evidence";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  await page.goto("http://localhost:3000/", { waitUntil: "load" });
  await page.waitForSelector("img[alt*='الدرعية']", { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/photo-home.png`, fullPage: true });
  console.log("home OK");

  await page.goto("http://localhost:3000/landmarks/diriyah", { waitUntil: "load" });
  await page.waitForSelector("h1");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/photo-diriyah.png`, fullPage: false });
  console.log("diriyah OK");

  await page.goto("http://localhost:3000/landmarks/madain-saleh", { waitUntil: "load" });
  await page.waitForSelector("h1");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/photo-madain-saleh.png`, fullPage: false });
  console.log("madain-saleh OK");

  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
