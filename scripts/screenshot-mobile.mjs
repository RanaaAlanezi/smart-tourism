import { chromium } from "playwright";
const OUT = "C:/Users/rana0/AppData/Local/Temp/claude/c--Projects-smart-Torism/b613d8f1-fd0c-4a89-aa8b-45533c80173f/scratchpad/evidence-v2";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

for (const [name, url, wait] of [
  ["home", "/", "text=استكشف حسب النوع"],
  ["explore", "/explore", "text=استكشف السعودية"],
  ["map", "/map", "text=استكشف السعودية على الخريطة"],
  ["assistant", "/assistant", "text=كيف يمكنني مساعدتك؟"],
]) {
  await page.goto(`http://localhost:3000${url}`, { waitUntil: "load" });
  await page.waitForSelector(wait, { timeout: 15000 });
  await page.waitForTimeout(1500);
  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  );
  console.log(name, "horizontal overflow:", hasHorizontalScroll);
  await page.screenshot({ path: `${OUT}/mobile-${name}.png`, fullPage: true });
}

console.log("errors:", errors.length ? errors : "none");
await browser.close();
