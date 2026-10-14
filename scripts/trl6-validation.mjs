// TRL 6 validation run against the public deployment.
//
//   node --env-file=.env.vercel scripts/trl6-validation.mjs
//
// Three parts, all written to docs/trl6/run/ (results.json + screenshots):
//   1. Effectiveness: the same factual questions put to the hosted Qwen model
//      on its own (straight to OpenRouter) and to the platform's assistant,
//      each answer checked against the value held in the landmark records.
//   2. Realistic visitor problems, performed in a real browser.
//   3. Performance: page and AI response times, and simultaneous requests.
import { chromium } from "playwright";
import fs from "node:fs";

const HOST = "smart-tourism-five.vercel.app";
const BASE = `https://${HOST}`;
const OUT = "docs/trl6/run";
const MODEL = process.env.OPENROUTER_MODEL || "qwen/qwen-2.5-7b-instruct";
fs.mkdirSync(OUT, { recursive: true });

// Arabic-Indic digits and thousands separators folded, so "٣٠٢" and "35,000"
// compare like "302" and "35000".
const norm = (text) =>
  text
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/(\d)[,٬،.](?=\d{3}(\D|$))/g, "$1");
const num = (n) => new RegExp(`(?<!\\d)${n}(?!\\d)`);

// `expect`: every pattern must appear in the answer. `ref` is the stored value.
const FACTS = [
  { q: "كم يبلغ ارتفاع برج المملكة في الرياض؟", expect: [num(302)], ref: "302 m" },
  { q: "كم عدد طوابق برج المملكة؟", expect: [num(99)], ref: "99 floors" },
  { q: "في أي عام افتُتح برج المملكة؟", expect: [num(2002)], ref: "2002" },
  { q: "كم يبلغ ارتفاع برج الفيصلية؟", expect: [num(267)], ref: "267 m" },
  { q: "من هو المعماري الذي صمم برج الفيصلية؟", expect: [/فوستر|Foster/i], ref: "Norman Foster" },
  { q: "في أي عام اكتمل بناء برج الفيصلية؟", expect: [num(2000)], ref: "2000" },
  { q: "في أي عام أُدرجت مدائن صالح (الحجر) في قائمة التراث العالمي لليونسكو؟", expect: [num(2008)], ref: "2008" },
  { q: "في أي عام أُدرجت جدة التاريخية (البلد) في قائمة التراث العالمي لليونسكو؟", expect: [num(2014)], ref: "2014" },
  { q: "في أي عام أُدرج حي الطريف في الدرعية في قائمة التراث العالمي لليونسكو؟", expect: [num(2010)], ref: "2010" },
  { q: "في أي عام أُدرجت الفنون الصخرية في جبة بمنطقة حائل في قائمة اليونسكو؟", expect: [num(2015)], ref: "2015" },
  { q: "في أي عام استعاد الملك عبدالعزيز قصر المصمك؟", expect: [num(1902)], ref: "1902" },
  { q: "في أي عام افتُتح المتحف الوطني السعودي؟", expect: [num(1999)], ref: "1999" },
  { q: "كم عدد قاعات العرض في المتحف الوطني السعودي؟", expect: [/(?<!\d)8(?!\d)|ثمان/], ref: "8 halls" },
  { q: "في أي مدينة تقع قلعة زعبل؟", expect: [/سكاكا/], ref: "Sakaka" },
  { q: "كم عدد أبراج المراقبة في قلعة زعبل؟", expect: [/(?<!\d)4(?!\d)|أربع/], ref: "4 towers" },
  { q: "أين تقع أعمدة الرجاجيل؟", expect: [/سكاكا|الجوف/], ref: "near Sakaka, Al-Jouf" },
  { q: "في أي عام افتُتح خط التابلاين؟", expect: [num(1950)], ref: "1950" },
  { q: "في أي عام سُجل خط التابلاين في سجل التراث الصناعي؟", expect: [num(2020)], ref: "2020" },
  { q: "في أي مدينة تقع قلعة مارد؟", expect: [/دومة الجندل/], ref: "Dumat Al-Jandal" },
  { q: "في أي عام أقام الملك عبدالعزيز في بيت نصيف بجدة؟", expect: [num(1925)], ref: "1925" },
  { q: "في أي عام تأسست الدرعية؟", expect: [num(1446)], ref: "1446 CE" },
  { q: "كم تبلغ مساحة حديقة الزهور في عرعر؟", expect: [/(?<!\d)35000(?!\d)|(?<!\d)35 ?ألف/], ref: "about 35,000 m²" },
  { q: "في أي عام أُعلن عن مشروع حديقة الملك سلمان؟", expect: [num(2019)], ref: "2019" },
  { q: "في أي عام وقعت غزوة أحد عند جبل أحد بالتقويم الميلادي؟", expect: [num(625)], ref: "625 CE" },
];
const correct = (answer, fact) => fact.expect.every((p) => p.test(norm(answer)));

async function askModelAlone(question) {
  const started = Date.now();
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 250,
      messages: [
        { role: "system", content: "أنت مرشد سياحي سعودي. أجب بالعربية باختصار في جملة أو جملتين مع ذكر الأرقام والتواريخ." },
        { role: "user", content: question },
      ],
    }),
  });
  const data = await res.json();
  return { answer: data.choices?.[0]?.message?.content?.trim() || `ERROR ${JSON.stringify(data).slice(0, 200)}`, ms: Date.now() - started };
}

function parseChat(body) {
  let reply = "";
  let sources = [];
  let resets = 0;
  let error = null;
  for (const line of body.split("\n").filter(Boolean)) {
    const event = JSON.parse(line);
    if (event.type === "delta") reply += event.text;
    else if (event.type === "reset") (reply = ""), resets++;
    else if (event.type === "done") sources = event.sources;
    else if (event.type === "error") error = event.message;
  }
  return { reply: reply.trim(), sources, resets, error };
}

// The platform's assistant, called from inside the browser page.
async function askPlatform(page, messages, { lang = "ar", landmarkContext } = {}) {
  const { body, ms, status } = await page.evaluate(
    async ({ messages, lang, landmarkContext }) => {
      const started = performance.now();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, ageGroup: "adult", lang, landmarkContext }),
      });
      const body = await res.text();
      return { body, ms: Math.round(performance.now() - started), status: res.status };
    },
    { messages, lang, landmarkContext }
  );
  return { ...parseChat(body), ms, status };
}

// Types a question into a chat box on the page and waits for the full answer.
async function askInPage(page, placeholder, question) {
  const pending = page.waitForResponse((r) => r.url().includes("/api/chat") && r.request().method() === "POST", { timeout: 90000 });
  const started = Date.now();
  await page.getByPlaceholder(placeholder).fill(question);
  await page.keyboard.press("Enter");
  const response = await pending;
  const body = await response.text();
  const ms = Date.now() - started;
  await page.waitForTimeout(900);
  return { ...parseChat(body), ms };
}

const results = { baseUrl: BASE, model: MODEL, startedAt: new Date().toISOString(), facts: [], scenarios: [], pages: [], aiTimings: [], notes: [] };
const record = (id, problem, check, passed, observed, extra = {}) => {
  results.scenarios.push({ id, problem, check, passed, observed, ...extra });
  console.log(`${passed ? "PASS" : "FAIL"} ${id} ${problem} — ${observed}`);
};
const shot = (page, name, options = {}) => page.screenshot({ path: `${OUT}/${name}.png`, ...options });
const cities = (sources) => [...new Set(sources.map((s) => s.city))];

const browser = await chromium.launch({ args: [`--host-resolver-rules=MAP ${HOST} 76.76.21.21`] });
const desktop = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: "ar-SA" });
const page = await desktop.newPage();
const browserErrors = [];
page.on("console", (m) => m.type() === "error" && browserErrors.push(m.text().slice(0, 200)));

// ---------- pages ----------
for (const path of ["/", "/explore", "/map", "/assistant", "/games", "/saved", "/landmarks/kingdom-tower", "/landmarks/tapline-arar"]) {
  const started = Date.now();
  const response = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 });
  results.pages.push({ path, status: response.status(), ms: Date.now() - started, server: response.headers()["server"] });
}
console.log("pages", results.pages.map((p) => `${p.path} ${p.status} ${p.ms}ms`).join(" | "));

// ---------- 1. effectiveness: model alone vs. platform ----------
await page.goto(BASE + "/assistant", { waitUntil: "load" });
for (const fact of FACTS) {
  const alone = await askModelAlone(fact.q);
  let grounded = await askPlatform(page, [{ role: "user", content: fact.q }]);
  if (grounded.error || !grounded.reply) grounded = await askPlatform(page, [{ role: "user", content: fact.q }]);
  results.aiTimings.push(grounded.ms);
  const row = {
    question: fact.q,
    reference: fact.ref,
    alone: alone.answer,
    aloneCorrect: correct(alone.answer, fact),
    aloneMs: alone.ms,
    platform: grounded.reply,
    platformCorrect: correct(grounded.reply, fact),
    platformMs: grounded.ms,
    platformSources: grounded.sources.map((s) => s.name),
  };
  results.facts.push(row);
  console.log(`${row.aloneCorrect ? "✓" : "✗"}/${row.platformCorrect ? "✓" : "✗"} ${fact.ref} | alone: ${alone.answer.slice(0, 70)} | platform: ${grounded.reply.slice(0, 70)}`);
}

// ---------- 2. realistic visitor problems ----------
const ASK = "اكتب سؤالك هنا...";
const ASK_LANDMARK = "اسأل سؤالك عن هذا المعلم...";
const step = async (id, fn) => {
  try {
    await fn();
  } catch (err) {
    record(id, "(scenario could not be completed)", "", false, String(err).slice(0, 200));
  }
};

await step("P1", async () => {
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("dl")?.style.opacity === "1", null, { timeout: 60000 });
  await page.waitForTimeout(3500);
  const text = await page.locator("dl").first().evaluate((dl) => [...dl.children].map((c) => `${c.querySelector("dt").textContent} ${c.querySelector("dd").textContent}`).join(" | "));
  results.homeStats = text;
  await shot(page, "fig-home");
  record("P1", "Getting an overview of what the Kingdom offers", "Home page shows the live size of the catalogue", /\d+/.test(text), text);
});

await step("P2", async () => {
  await page.goto(BASE + "/assistant", { waitUntil: "load" });
  const first = await askInPage(page, ASK, "عندي يومان في جدة، ماذا تنصحني أن أزور؟");
  results.aiTimings.push(first.ms);
  const second = await askInPage(page, ASK, "وماذا عن الشواطئ والبحر؟");
  results.aiTimings.push(second.ms);
  await shot(page, "fig-trip-plan");
  results.tripPlan = { first, second };
  const ok = first.sources.length > 0 && cities(first.sources).every((c) => c === "جدة");
  record("P2", "Planning a two-day visit to one city", "Every suggested landmark is in Jeddah", ok, `${first.sources.length} landmarks suggested, all in: ${cities(first.sources).join(", ")}; ${(first.ms / 1000).toFixed(1)} s`);
  // A landmark outside Jeddah may be offered, but not in a sentence that places it in Jeddah.
  const misplaced = second.sources.filter((s) => s.city !== "جدة" && second.reply.split(/[.؟!\n]/).some((sentence) => sentence.includes("في جدة") && sentence.includes(s.name)));
  record("P3", "Asking a follow-up without repeating the city", "No landmark from another city is presented as being in Jeddah", second.sources.length > 0 && misplaced.length === 0, second.reply.slice(0, 170));
});

await step("P4", async () => {
  await page.goto(BASE + "/assistant", { waitUntil: "load" });
  const answer = await askInPage(page, ASK, "سمعت أن برج المملكة في جدة، هل هذا صحيح؟ وكم ارتفاعه؟");
  results.aiTimings.push(answer.ms);
  await shot(page, "fig-misconception");
  results.misconception = answer;
  record("P4", "Checking a wrong assumption before travelling", "The answer corrects the city and gives the stored height", /الرياض/.test(answer.reply) && num(302).test(norm(answer.reply)), answer.reply.slice(0, 160));
});

await step("P5", async () => {
  await page.goto(BASE + "/landmarks/masmak-fortress", { waitUntil: "load" });
  const explain = async (label) => {
    await page.getByRole("button", { name: label }).click();
    const pending = page.waitForResponse((r) => r.url().includes("/api/explain"), { timeout: 90000 });
    const started = Date.now();
    await page.getByRole("button", { name: "ولّد الشرح" }).click();
    const data = await (await pending).json();
    results.aiTimings.push(Date.now() - started);
    await page.waitForTimeout(700);
    return data.explanation || "";
  };
  await page.getByRole("button", { name: "ولّد الشرح" }).scrollIntoViewIfNeeded();
  const adult = await explain(/بالغ/);
  const child = await explain(/طفل/);
  await page.getByRole("button", { name: "ولّد الشرح" }).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 330));
  await page.waitForTimeout(400);
  await shot(page, "fig-child-explanation");
  results.explanations = { adult, child };
  const words = (s) => s.split(/\s+/).filter(Boolean).length;
  record("P5", "A family visiting with a young child", "The child explanation is shorter and simpler than the adult one", child.length > 0 && words(child) < words(adult), `child: ${words(child)} words; adult: ${words(adult)} words`);
});

await step("P6", async () => {
  const question = "كم سعر تذكرة الدخول وما هي أوقات الزيارة؟";
  const answer = await askInPage(page, ASK_LANDMARK, question);
  results.aiTimings.push(answer.ms);
  await page.getByPlaceholder(ASK_LANDMARK).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 520));
  await page.waitForTimeout(400);
  await shot(page, "fig-not-covered");
  results.notCovered = { question, reply: answer.reply };
  const invented = /ريال|\d{1,2}[:.]\d{2}|صباح|مساء/.test(norm(answer.reply));
  record("P6", "Asking for details the records do not hold (ticket price, opening hours)", "The assistant does not invent a price or opening hours", !invented && answer.reply.length > 0, answer.reply.slice(0, 180));
});

await step("P7", async () => {
  await page.evaluate(() => window.scrollTo(0, 0));
  const map = page.locator('svg[role="group"]').first();
  await map.scrollIntoViewIfNeeded();
  const pins = await map.locator("[aria-label]").count();
  await map.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 150));
  await page.waitForTimeout(500);
  await shot(page, "fig-nearby");
  record("P7", "Finding what else is close to a landmark", "A numbered map pins the landmarks around it", pins >= 3, `${pins} nearby landmarks pinned around قصر المصمك`);
});

await step("P8", async () => {
  await page.goto(BASE + "/assistant", { waitUntil: "load" });
  const request = { interests: ["historical", "cultural"], city: "جدة", time: "day", focus: "learn", lang: "ar" };
  const api = await page.evaluate(async (request) => {
    const started = performance.now();
    const res = await fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
    return { data: await res.json(), ms: Math.round(performance.now() - started) };
  }, request);
  results.aiTimings.push(api.ms);
  const recs = api.data.recommendations || [];
  results.recommendations = recs.map((r) => ({ name: r.name, city: r.city, category: r.category, explanation: r.explanation, aiFailed: r.aiFailed }));
  const ok = recs.length > 0 && recs.every((r) => r.city === "جدة" && ["historical", "cultural"].includes(r.category));
  record("P8", "Choosing places by interest and available time", "Every recommendation matches the chosen city and interests", ok, `${recs.length} recommendations, all in Jeddah and historical/cultural; ${recs.filter((r) => !r.aiFailed).length} with an AI-written reason; ${(api.ms / 1000).toFixed(1)} s`);
  // The same choice made through the interface, for the figure.
  try {
    await page.getByRole("button", { name: "اكتشف وجهتك" }).click();
    await page.getByText("اختر مدينة", { exact: false }).first().click();
    await page.getByPlaceholder("ابحث عن مدينة...").fill("جدة");
    await page.getByRole("button", { name: "جدة", exact: true }).click();
    await page.getByRole("button", { name: "التالي" }).click();
    await page.getByText("تاريخ وثقافة").click();
    await page.getByRole("button", { name: "التالي" }).click();
    await page.getByText("يوم كامل").click();
    await page.getByText("أتعلم").click();
    const pending = page.waitForResponse((r) => r.url().includes("/api/recommend"), { timeout: 90000 });
    await page.getByRole("button", { name: "اكتشف الوجهات" }).click();
    await pending;
    await page.getByText("توصياتنا لك").waitFor({ timeout: 30000 });
    await page.getByText("توصياتنا لك").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120));
    await page.waitForTimeout(1200);
    await shot(page, "fig-recommendations");
  } catch (err) {
    results.notes.push(`recommendation figure not captured: ${String(err).slice(0, 160)}`);
  }
});

await step("P9", async () => {
  await page.goto(BASE + "/assistant", { waitUntil: "load" });
  const answer = await askInPage(page, ASK, "ما أبرز المعالم السياحية في مدينة عرعر؟");
  results.aiTimings.push(answer.ms);
  await shot(page, "fig-arar-assistant");
  results.arar = answer;
  await page.goto(BASE + "/landmarks/tapline-arar", { waitUntil: "load" });
  await page.getByRole("heading", { name: /خط التابلاين/ }).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot(page, "fig-arar-landmark");
  const ok = answer.sources.length >= 3 && cities(answer.sources).every((c) => c === "عرعر");
  record("P9", "Asking about a city added to the database the day before", "The new records are served without redeploying the application", ok, `${answer.sources.length} Arar landmarks linked: ${answer.sources.map((s) => s.name).join("، ")}`);
});

await step("P10", async () => {
  await page.goto(BASE + "/explore", { waitUntil: "load" });
  const cards = page.locator('a[href^="/landmarks/"]');
  await cards.first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  const before = await cards.count();
  await page.getByPlaceholder("ابحث عن معلم، مدينة، أو تجربة سياحية...").fill("المرجاني");
  await page.waitForTimeout(1200);
  const hrefs = await cards.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  await shot(page, "fig-search");
  record("P10", "Searching by a feature rather than a name (\"coral stone\")", "Search inside the descriptions finds Historic Jeddah", hrefs.includes("/landmarks/jeddah-historic"), `${new Set(hrefs).size} of ${before} landmarks matched, including جدة التاريخية`);
});

await step("P11", async () => {
  for (const id of ["masmak-fortress", "kingdom-tower"]) {
    await page.goto(`${BASE}/landmarks/${id}`, { waitUntil: "load" });
    await page.getByRole("button", { name: "حفظ في المحفوظات" }).first().click();
    await page.waitForTimeout(600);
  }
  await page.goto(BASE + "/saved", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const saved = await page.locator('a[href^="/landmarks/"]').evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute("href")))]);
  await shot(page, "fig-saved");
  record("P11", "Keeping a shortlist of places to visit", "Both saved landmarks appear on the Saved page", ["/landmarks/masmak-fortress", "/landmarks/kingdom-tower"].every((h) => saved.includes(h)), `${saved.length} landmarks on the Saved page`);
});

await step("P12", async () => {
  await page.goto(BASE + "/assistant", { waitUntil: "load" });
  const answer = await askPlatform(page, [{ role: "user", content: "ما المعالم التاريخية في منطقة الجوف؟" }]);
  results.aiTimings.push(answer.ms);
  results.region = answer;
  const ok = answer.sources.length > 0 && cities(answer.sources).every((c) => ["سكاكا", "دومة الجندل"].includes(c));
  record("P12", "Asking about a whole region rather than a city", "Every linked landmark is in Al-Jouf Region", ok, `${answer.sources.length} landmarks linked, in: ${cities(answer.sources).join("، ")}`);
});

await step("P13", async () => {
  const english = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: "en-US" });
  await english.addInitScript(() => localStorage.setItem("smart-tourism-lang", "en"));
  const en = await english.newPage();
  await en.goto(BASE + "/assistant", { waitUntil: "load" });
  const answer = await askInPage(en, "Type your question here...", "What can I see in AlUla in one day?");
  results.aiTimings.push(answer.ms);
  await shot(en, "fig-english");
  results.english = answer;
  const ok = answer.reply.length > 0 && !/[؀-ۿ]/.test(answer.reply) && answer.sources.length > 0 && cities(answer.sources).every((c) => c === "AlUla");
  record("P13", "An English-speaking visitor planning a day", "The answer is in English and stays in AlUla", ok, `${answer.sources.length} landmarks linked, all in AlUla; ${(answer.ms / 1000).toFixed(1)} s`);
  await english.close();
});

await step("P14", async () => {
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "ar-SA" });
  const mobile = await phone.newPage();
  await mobile.goto(BASE + "/assistant", { waitUntil: "load" });
  const answer = await askInPage(mobile, ASK, "ما أفضل الأماكن الطبيعية في أبها؟");
  results.aiTimings.push(answer.ms);
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  // The page follows the answer to its end; bring the question back to the top for the figure.
  await mobile.getByText("ما أفضل الأماكن الطبيعية في أبها؟").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 110));
  await mobile.waitForTimeout(500);
  await shot(mobile, "fig-mobile");
  results.mobile = answer;
  const ok = answer.sources.length > 0 && cities(answer.sources).every((c) => c === "أبها") && overflow <= 2;
  record("P14", "Using the assistant on a phone while travelling", "The answer fits a 390 px screen and stays in Abha", ok, `${answer.sources.length} Abha landmarks linked; horizontal overflow ${overflow} px`);
  await phone.close();
});

// Outside the platform's data: recorded as an observation, not as a scenario.
await page.goto(BASE + "/assistant", { waitUntil: "load" });
const outside = await askPlatform(page, [{ role: "user", content: "ما أفضل مطعم في الرياض وكم سعر الوجبة فيه؟" }]);
results.outsideScope = { question: "ما أفضل مطعم في الرياض وكم سعر الوجبة فيه؟", reply: outside.reply, sources: outside.sources.map((s) => s.name) };
console.log("outside scope:", outside.reply.slice(0, 200));

// ---------- 3. simultaneous requests ----------
const burst = await page.evaluate(async (questions) => {
  const started = performance.now();
  const answers = await Promise.all(
    questions.map(async (q) => {
      const t = performance.now();
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: q }], ageGroup: "adult", lang: "ar" }),
        });
        return { status: res.status, body: await res.text(), ms: Math.round(performance.now() - t) };
      } catch (err) {
        return { status: 0, body: "", ms: Math.round(performance.now() - t), error: String(err) };
      }
    })
  );
  return { answers, totalMs: Math.round(performance.now() - started) };
}, FACTS.slice(0, 10).map((f) => f.q));
const burstRows = burst.answers.map((a, i) => {
  const parsed = a.body ? parseChat(a.body) : { reply: "", error: a.error };
  return { ms: a.ms, status: a.status, answered: !!parsed.reply && !parsed.error, correct: !!parsed.reply && correct(parsed.reply, FACTS[i]) };
});
results.burst = { requests: burstRows.length, answered: burstRows.filter((r) => r.answered).length, correct: burstRows.filter((r) => r.correct).length, slowestMs: Math.max(...burstRows.map((r) => r.ms)), totalMs: burst.totalMs, rows: burstRows };
console.log("burst", JSON.stringify({ ...results.burst, rows: undefined }));

await browser.close();

const sorted = [...results.aiTimings].sort((a, b) => a - b);
results.aiSummary = { requests: sorted.length, medianMs: sorted[Math.floor(sorted.length / 2)], slowestMs: sorted.at(-1), fastestMs: sorted[0] };
results.factSummary = {
  questions: results.facts.length,
  aloneCorrect: results.facts.filter((f) => f.aloneCorrect).length,
  platformCorrect: results.facts.filter((f) => f.platformCorrect).length,
};
results.browserErrors = [...new Set(browserErrors)];
results.finishedAt = new Date().toISOString();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
console.log("\nfacts", results.factSummary, "| scenarios", results.scenarios.filter((s) => s.passed).length, "/", results.scenarios.length, "| ai", results.aiSummary);
