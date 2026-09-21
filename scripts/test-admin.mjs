import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:3000/admin", { waitUntil: "load" });
await page.waitForSelector("text=لوحة تحكم المعالم", { timeout: 15000 });

await page.fill('input[type="password"]', "SmartTourism2026");
await page.click('button:has-text("دخول")');
await page.waitForSelector("text=إضافة معلم جديد", { timeout: 10000 });
console.log("gate unlocked OK");

// Reload same tab to verify sessionStorage persistence across navigations
await page.goto("http://localhost:3000/admin", { waitUntil: "load" });
await page.waitForSelector("text=إضافة معلم جديد", { timeout: 10000 });
console.log("gate stayed unlocked after reload (sessionStorage persisted)");

async function fillByLabel(labelText, value) {
  const input = page.locator("label", { hasText: labelText }).locator("xpath=following-sibling::*[1]");
  await input.fill(value);
}

await fillByLabel("المعرف", "test-landmark-admin2");
await fillByLabel("الاسم", "معلم اختباري ثاني");
await fillByLabel("المدينة", "جدة");
await fillByLabel("خط العرض", "21.5");
await fillByLabel("خط الطول", "39.2");
await fillByLabel("وصف مختصر", "وصف اختباري.");
await fillByLabel("الحقائق الكاملة", "حقائق اختبارية.");
await page.click('button:has-text("إضافة المعلم")');
await page.waitForSelector("text=تم إضافة المعلم.", { timeout: 15000 });
console.log("add landmark OK");

page.on("dialog", (d) => d.accept());
await page.locator('button[aria-label="حذف"]').last().click();
await page.waitForTimeout(1200);
const stillThere = await page.locator("text=معلم اختباري ثاني").count();
console.log("cleanup delete OK:", stillThere === 0);

console.log("errors:", errors.length ? errors : "none");
await browser.close();
