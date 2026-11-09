// Two independent browser windows join the same session and check live sync.
// Usage: node scripts/verify-sync.mjs [BASE]   (default http://localhost:3000)
import { chromium } from "playwright";

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const session = `verify-${Math.random().toString(36).slice(2, 8)}`;
const TIMEOUT = 15000;

const browserA = await chromium.launch();
const browserB = await chromium.launch();
const results = [];
let failed = false;

async function check(label, fn) {
  try {
    await fn();
    results.push(`ok   ${label}`);
  } catch (err) {
    failed = true;
    results.push(`FAIL ${label} — ${String(err.message).split("\n")[0]}`);
  }
}

try {
  const a = await (await browserA.newContext()).newPage();
  const b = await (await browserB.newContext()).newPage();
  // Join in order like the demo (Ji-won opens the session, then shares the link).
  // Two clients creating a brand-new room at the same instant can race on initial storage.
  await a.goto(`${BASE}/s/${session}?name=Ji-won`);
  await a.locator('[data-testid="avatars"] [data-name="Ji-won"]').waitFor({ timeout: TIMEOUT });
  await b.goto(`${BASE}/s/${session}?name=Min`);

  await check("1 avatars: each window sees the other", async () => {
    await a.locator('[data-testid="avatars"] [data-name="Min"]').waitFor({ timeout: TIMEOUT });
    await b.locator('[data-testid="avatars"] [data-name="Ji-won"]').waitFor({ timeout: TIMEOUT });
  });

  await check("2 storage: test step added in Ji-won shows in Min", async () => {
    const before = await b.locator('[data-testid="step"]').count();
    await a.getByRole("button", { name: "Add test step" }).click();
    await b.locator('[data-testid="step"]').nth(before).waitFor({ timeout: TIMEOUT });
  });
} finally {
  await browserA.close();
  await browserB.close();
}

console.log(`session ${session} @ ${BASE}`);
for (const line of results) console.log(line);
process.exit(failed ? 1 : 0);
