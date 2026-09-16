import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const EVIDENCE_DIR =
  "C:/Users/rana0/AppData/Local/Temp/claude/c--Projects-smart-Torism/b613d8f1-fd0c-4a89-aa8b-45533c80173f/scratchpad/evidence";
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const errors = [];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  // 1. Home page
  await page.goto("http://localhost:3000/", { waitUntil: "load" });
  await page.waitForSelector("text=الدرعية", { timeout: 15000 });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "01-home.png"), fullPage: true });
  console.log("01-home OK");

  // 2. Search filter
  await page.fill('input[placeholder*="ابحث"]', "جدة");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "02-search.png"), fullPage: true });
  console.log("02-search OK");

  // reset search, go to landmark detail
  await page.waitForTimeout(300);
  const anyInputCount = await page.locator("input").count();
  console.log("any input count:", anyInputCount);
  console.log("body text sample:", (await page.locator("body").innerText()).slice(0, 300));
  console.log("errors so far:", JSON.stringify(errors));
  await page.locator("input").first().fill("");
  await page.click("text=الدرعية");
  await page.waitForSelector("text=شرح مخصص حسب العمر");
  console.log("navigated to detail page");

  // 3. Child explanation
  await page.click('button:has-text("طفل")');
  await page.click('button:has-text("ولّد الشرح")');
  await page.waitForSelector("text=النموذج:", { timeout: 60000 });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "03-child-explanation.png"), fullPage: true });
  console.log("03-child-explanation OK");

  // 4. Adult explanation
  await page.click('button:has-text("بالغ")');
  await page.click('button:has-text("ولّد الشرح")');
  await page.waitForTimeout(500);
  await page.waitForSelector("text=النموذج:", { timeout: 60000 });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "04-adult-explanation.png"), fullPage: true });
  console.log("04-adult-explanation OK");

  // 5. Dashboard
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "load" });
  await page.waitForSelector("text=إجمالي الطلبات", { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "05-dashboard.png"), fullPage: true });
  console.log("05-dashboard OK");

  await browser.close();

  console.log("\n--- Console/page errors captured ---");
  if (errors.length === 0) console.log("(none)");
  else errors.forEach((e) => console.log(e));
}

main().catch((err) => {
  console.error("UI TEST FAILED:", err);
  process.exit(1);
});
