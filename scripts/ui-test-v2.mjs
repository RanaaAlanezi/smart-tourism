import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const EVIDENCE_DIR =
  "C:/Users/rana0/AppData/Local/Temp/claude/c--Projects-smart-Torism/b613d8f1-fd0c-4a89-aa8b-45533c80173f/scratchpad/evidence-v2";
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const errors = [];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[console] ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.stack || err}`));

  // 1. Home page — new sections
  await page.goto("http://localhost:3000/", { waitUntil: "load" });
  await page.waitForSelector("text=استكشف حسب النوع", { timeout: 15000 });
  await page.waitForSelector("text=استكشف السعودية على الخريطة");
  await page.waitForSelector("text=لست متأكدًا إلى أين تذهب؟");
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "01-home.png"), fullPage: true });
  console.log("01-home OK");

  // 2. Navbar links present
  for (const label of ["استكشف", "الخريطة", "المساعد الذكي", "المحفوظات"]) {
    await page.waitForSelector(`nav >> text=${label}`);
  }
  console.log("02-navbar-links OK");

  // 3. Explore page
  await page.click('nav >> text=استكشف');
  await page.waitForSelector("text=استكشف معالم السعودية");
  await page.waitForSelector('button[aria-label="حفظ في المحفوظات"]', { timeout: 20000 });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "03-explore.png"), fullPage: true });
  console.log("03-explore OK");

  // filter by category
  await page.click('button:has-text("طبيعي")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "04-explore-filtered.png"), fullPage: true });
  console.log("04-explore-filtered OK");

  // 4. favorite a card from explore
  const heartButtons = page.locator('button[aria-label="حفظ في المحفوظات"]');
  const heartCount = await heartButtons.count();
  console.log("heart buttons found:", heartCount);
  let favoritedName = null;
  if (heartCount > 0) {
    const card = page.locator('a[href^="/landmarks/"]').first();
    favoritedName = await card.locator(".font-bold").first().innerText();
    await heartButtons.first().click();
    await page.waitForTimeout(1500);
    const nowActive = await page.locator('button[aria-label="إزالة من المحفوظات"]').count();
    console.log("favorited landmark:", favoritedName, "| now-active hearts:", nowActive);
  }

  // 5. Map page
  await page.goto("http://localhost:3000/map", { waitUntil: "load" });
  await page.waitForSelector("text=خريطة معالم السعودية");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "05-map.png"), fullPage: true });
  console.log("05-map OK");

  // click a marker (circle elements)
  const markers = page.locator("svg circle");
  const markerCount = await markers.count();
  console.log("marker circles found:", markerCount);
  if (markerCount > 0) {
    await markers.nth(1).click({ force: true });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, "06-map-popup.png"), fullPage: true });
    console.log("06-map-popup OK");
  }

  // 6. Saved page (should show the favorite from explore, if it persisted)
  await page.goto("http://localhost:3000/saved", { waitUntil: "load" });
  await page.waitForSelector("text=وجهاتي المحفوظة");
  await page.waitForTimeout(2000);
  const savedCount = await page.locator('a[href^="/landmarks/"]').count();
  console.log("saved page card count:", savedCount, "(expected favoritedName:", favoritedName, ")");
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "07-saved.png"), fullPage: true });
  console.log("07-saved OK");

  // 7. Assistant page
  await page.goto("http://localhost:3000/assistant", { waitUntil: "load" });
  await page.waitForSelector("text=كيف يمكنني مساعدتك؟");
  await page.waitForSelector('button:has-text("طفل")');
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "08-assistant.png"), fullPage: true });
  console.log("08-assistant OK");

  // 8. Landmark detail page — favorite + map link + AI Q&A section
  await page.goto("http://localhost:3000/landmarks/diriyah", { waitUntil: "load" });
  await page.waitForSelector("text=اسأل الذكاء الاصطناعي عن هذا المعلم");
  await page.waitForSelector("text=عرض على الخريطة");
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "09-detail.png"), fullPage: true });
  console.log("09-detail OK");

  await browser.close();

  console.log("\n--- Console/page errors captured ---");
  if (errors.length === 0) console.log("(none)");
  else errors.forEach((e) => console.log(e));
}

main().catch((err) => {
  console.error("UI TEST FAILED:", err);
  process.exit(1);
});
