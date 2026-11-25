#!/usr/bin/env node
// Signs in to the running dev server as the demo business and screenshots
// each route. Prints one PNG path per route, then any console errors, page
// errors and failed requests seen along the way.
//
//   node .agents/skills/run-app/screenshot.mjs /tables /orders \
//     [--width 1440] [--height 900] [--out DIR]
//
// Needs BASE_DEMO_COMPANY_CODE and BASE_DEMO_PIN. APP_URL defaults to the dev
// server; CHROME_PATH overrides the installed Chrome.
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const [, value] = args.splice(i, 2);
  return value;
};
const width = Number(option("width", 1440));
const height = Number(option("height", 900));
const outDir = option("out", join(tmpdir(), "base-frontend-shots"));
const routes = args.length ? args : ["/"];

const appUrl = process.env.APP_URL || "http://localhost:5374";
const companyCode = process.env.BASE_DEMO_COMPANY_CODE;
const pin = process.env.BASE_DEMO_PIN;
if (!companyCode || !pin) {
  console.error("Set BASE_DEMO_COMPANY_CODE and BASE_DEMO_PIN (see the run-app skill).");
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" },
);
const page = await browser.newPage({ viewport: { width, height } });

const problems = new Set();
let devWarnings = 0;
page.on("console", (m) => {
  if (m.type() !== "error") return;
  // React and antd print development-only warnings as console errors.
  if (m.text().startsWith("Warning:")) devWarnings += 1;
  else problems.add(`console: ${m.text()}`);
});
page.on("pageerror", (e) => problems.add(`page error: ${e.message}`));
page.on("response", (r) => {
  if (r.status() >= 400) problems.add(`HTTP ${r.status()} ${r.request().method()} ${r.url()}`);
});

try {
  // Company code, then the on-screen PIN keypad.
  await page.goto(`${appUrl}/login`);
  await page.getByPlaceholder("Enter Company Code").fill(companyCode);
  await page.getByRole("button", { name: "Continue" }).click();
  for (const digit of pin) await page.getByRole("button", { name: digit, exact: true }).click();
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });

  for (const route of routes) {
    await page.goto(`${appUrl}${route}`);
    // The app polls (notifications, carts), so the network may never go idle.
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page
      .waitForFunction(() => !document.querySelector(".ant-spin-spinning, .ant-skeleton-active"), null, {
        timeout: 20_000,
      })
      .catch(() => console.error(`${route}: still loading after 20s, screenshot taken anyway`));
    await page.waitForTimeout(1_000); // let entry animations finish
    const name = route.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "home";
    const file = join(outDir, `${name}-${width}x${height}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
} catch (error) {
  const file = join(outDir, "failure.png");
  await page.screenshot({ path: file }).catch(() => {});
  console.error(`Failed at ${page.url()}: ${error.message}\nLast screen: ${file}`);
  process.exitCode = 1;
} finally {
  if (problems.size) {
    console.log("\nProblems seen:");
    for (const p of problems) console.log(`  ${p}`);
  }
  if (devWarnings) console.log(`\n(${devWarnings} React/antd development warnings not listed)`);
  await browser.close();
}
