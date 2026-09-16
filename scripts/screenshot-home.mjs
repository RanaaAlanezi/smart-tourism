import { chromium } from "playwright";

const OUT = "C:/Users/rana0/AppData/Local/Temp/claude/c--Projects-smart-Torism/b613d8f1-fd0c-4a89-aa8b-45533c80173f/scratchpad/evidence";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto("http://localhost:3000/", { waitUntil: "load" });
  await page.waitForSelector('input[placeholder*="ابحث"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/redesign-home.png`, fullPage: true });
  console.log("done");
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
