import { chromium } from "playwright";
const OUT = "C:/Users/rana0/AppData/Local/Temp/claude/c--Projects-smart-Torism/b613d8f1-fd0c-4a89-aa8b-45533c80173f/scratchpad/evidence-v2";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.waitForSelector("text=استكشف حسب النوع");
await page.click('button[aria-label="فتح القائمة"]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/mobile-menu-open.png` });
console.log("menu opened, errors:", errors);

await page.getByRole("link", { name: "المساعد الذكي", exact: true }).click();
await page.waitForSelector("text=كيف يمكنني مساعدتك؟", { timeout: 10000 });
console.log("navigated to assistant via mobile menu OK");

await browser.close();
