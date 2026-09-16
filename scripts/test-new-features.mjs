import { chromium } from "playwright";
const OUT = "C:/Users/rana0/AppData/Local/Temp/claude/c--Projects-smart-Torism/b613d8f1-fd0c-4a89-aa8b-45533c80173f/scratchpad/evidence-v3";
import fs from "node:fs";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

// 1. Homepage search dropdown
await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.waitForSelector("text=استكشف حسب النوع");
await page.fill('input[placeholder*="ابحث"]', "العلا");
await page.waitForTimeout(600);
const dropdownResults = await page.locator('[role="listbox"] a').count();
console.log("search dropdown results for 'العلا':", dropdownResults);
await page.screenshot({ path: `${OUT}/search-dropdown.png` });

// 2. Map filters
await page.goto("http://localhost:3000/map", { waitUntil: "load" });
await page.waitForSelector("text=استكشف السعودية على الخريطة");
await page.waitForTimeout(1000);
const allMarkers = await page.locator("svg circle").count();
await page.click('button:has-text("طبيعي")');
await page.waitForTimeout(500);
const filteredMarkers = await page.locator("svg circle").count();
console.log("markers before filter:", allMarkers, "| after 'طبيعي' filter:", filteredMarkers);
await page.screenshot({ path: `${OUT}/map-filtered.png` });

// 3. Map popup shows description + "عرض التفاصيل"
await page.locator("svg circle").nth(1).click({ force: true });
await page.waitForTimeout(300);
const detailsButton = await page.locator("text=عرض التفاصيل").count();
console.log("map popup 'عرض التفاصيل' button present:", detailsButton > 0);
await page.screenshot({ path: `${OUT}/map-popup.png` });

// 4. Assistant auto-send via ?q=
await page.goto("http://localhost:3000/assistant?q=" + encodeURIComponent("أبغى مكان تاريخي"), { waitUntil: "load" });
await page.waitForSelector("text=أبغى مكان تاريخي", { timeout: 10000 });
console.log("assistant auto-send: question appeared in chat");
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/assistant-autosend.png` });

await browser.close();
console.log("\nerrors:", errors.length ? errors : "none");
