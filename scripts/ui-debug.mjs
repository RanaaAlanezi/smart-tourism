import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("console", (msg) => console.log(`[console:${msg.type()}]`, msg.text()));
  page.on("pageerror", (err) => console.log("[pageerror]", err.stack || String(err)));
  page.on("requestfailed", (req) => console.log("[requestfailed]", req.url(), req.failure()?.errorText));
  page.on("response", (res) => {
    if (res.status() >= 400) console.log("[bad response]", res.status(), res.url());
  });

  await page.goto("http://localhost:3000/", { waitUntil: "load" });
  console.log("--- loaded home ---");
  await page.waitForTimeout(1000);
  console.log("url after 1s:", page.url());

  await page.fill('input[placeholder*="ابحث"]', "جدة");
  console.log("--- filled search ---");
  await page.waitForTimeout(1000);
  console.log("url after search:", page.url());
  console.log("input count:", await page.locator("input").count());

  await browser.close();
}

main().catch((e) => console.error("FAILED", e));
