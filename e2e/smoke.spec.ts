import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end smoke test against a real Supabase project.
 *
 * Every run creates fresh accounts, so it is safe to re-run and never depends
 * on data left behind by a previous run.
 */

const SHOTS = process.env.E2E_SCREENSHOT_DIR;

/**
 * Everything except the landing-page test needs to reach Supabase. Some
 * sandboxes (including the one this was built in) deny outbound HTTPS to the
 * project host by egress policy, which would otherwise surface as an opaque
 * 30-second navigation timeout. Probe once and skip with a clear reason.
 */
let supabaseReachable: boolean | null = null;

async function requireSupabase(test: { skip: (c: boolean, r: string) => void }) {
  if (supabaseReachable === null) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) {
      supabaseReachable = false;
    } else {
      try {
        const response = await fetch(`${url}/auth/v1/health`, {
          signal: AbortSignal.timeout(10_000),
        });
        supabaseReachable = response.ok || response.status < 500;
      } catch {
        supabaseReachable = false;
      }
    }
  }

  test.skip(
    !supabaseReachable,
    `Supabase (${process.env.NEXT_PUBLIC_SUPABASE_URL}) is unreachable from this ` +
      "environment, so auth-dependent flows cannot run here. Run with network " +
      "access to the project host.",
  );
}

function uniqueEmail(tag: string) {
  return `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
}

async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill(email.split("@")[0].slice(0, 20));
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Create account" }).click();

  // Landing on /app means the session cookie was set and the proxy let us in.
  await page.waitForURL("**/app", { timeout: 30_000 });
}

async function createDeckByHand(page: Page, title: string) {
  await page.goto("/app/decks/new");
  await page.getByRole("tab", { name: "By hand" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Create deck" }).click();
  await page.waitForURL(/\/app\/decks\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  return page.url();
}

async function addCard(page: Page, term: string, translation: string) {
  await page.getByLabel("Term").fill(term);
  await page.getByLabel("Translation").fill(translation);
  await page.getByRole("button", { name: "Add card" }).click();
  await expect(page.getByText(term, { exact: false }).first()).toBeVisible();
}

test("landing page presents the product without a pricing section", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Remember the words/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Start learning" })).toBeVisible();

  // Billing was explicitly out of scope, so there must be no pricing anywhere.
  await expect(page.getByText(/\$8\.99|\$79\.99|per month|\/mo\b/i)).toHaveCount(0);

  await shot(page, "01-landing");
});

test("signing out and back in preserves the account", async ({ page }) => {
  await requireSupabase(test);
  const email = uniqueEmail("auth");
  await signUp(page, email);

  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/", { timeout: 30_000 });

  // /app must now be unreachable.
  await page.goto("/app");
  await page.waitForURL(/\/login/, { timeout: 30_000 });

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/app", { timeout: 30_000 });

  await expect(page.getByRole("heading", { name: /Hi |Welcome back/ })).toBeVisible();
});

test("a full study loop schedules the card for review", async ({ page }) => {
  await requireSupabase(test);
  await signUp(page, uniqueEmail("study"));
  await shot(page, "02-dashboard-empty");

  const deckUrl = await createDeckByHand(page, "Cafe basics");
  await addCard(page, "cafe", "coffee shop");
  await addCard(page, "agua", "water");
  await shot(page, "03-deck");

  // Study both cards through the flashcard mode.
  await page.goto(`${deckUrl}/study/flashcards`);
  await expect(page.getByText("Tap or press space to flip")).toBeVisible();
  await shot(page, "04-flashcard");

  for (let i = 0; i < 2; i += 1) {
    await page.getByRole("button", { name: /Reveal the translation|Show the term/ }).click();
    await page.getByRole("button", { name: "Good" }).click();
  }

  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible({
    timeout: 30_000,
  });
  await shot(page, "05-session-complete");

  // The dashboard should now show a streak, proving the session was persisted.
  await page.goto("/app");
  await expect(page.getByText("day in a row")).toBeVisible({ timeout: 30_000 });
  await shot(page, "06-dashboard-active");
});

test("decks are private to their owner", async ({ browser }) => {
  await requireSupabase(test);
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signUp(ownerPage, uniqueEmail("owner"));
  const deckUrl = await createDeckByHand(ownerPage, "Private vocabulary");
  await addCard(ownerPage, "secreto", "secret");

  const intruderContext = await browser.newContext();
  const intruderPage = await intruderContext.newPage();
  await signUp(intruderPage, uniqueEmail("intruder"));

  // The other account must not see the deck in its own list...
  await intruderPage.goto("/app/decks");
  await expect(intruderPage.getByText("Private vocabulary")).toHaveCount(0);

  // ...nor by navigating straight to its URL. RLS returns no row, so the page
  // 404s rather than leaking the title.
  await intruderPage.goto(deckUrl);
  await expect(intruderPage.getByText("Private vocabulary")).toHaveCount(0);
  await expect(intruderPage.getByText("secreto")).toHaveCount(0);

  await ownerContext.close();
  await intruderContext.close();
});

test("a teacher can create a class and a student can join with the code", async ({
  browser,
}) => {
  await requireSupabase(test);
  const teacherContext = await browser.newContext();
  const teacherPage = await teacherContext.newPage();
  await signUp(teacherPage, uniqueEmail("teacher"));

  await teacherPage.goto("/app/classes/new");
  await teacherPage.getByLabel("Class name").fill("Period 3 Spanish");
  await teacherPage.getByRole("button", { name: "Create class" }).click();
  await teacherPage.waitForURL(/\/app\/classes\/[0-9a-f-]{36}$/, { timeout: 30_000 });

  const joinCode = (
    await teacherPage.locator("p.font-mono").first().innerText()
  ).trim();
  expect(joinCode).toMatch(/^[A-Z2-9]{6}$/);
  await shot(teacherPage, "07-class-teacher");

  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  await signUp(studentPage, uniqueEmail("student"));

  await studentPage.goto("/app/classes");
  await studentPage.getByLabel("Class code").fill(joinCode);
  await studentPage.getByRole("button", { name: "Join class" }).click();
  await studentPage.waitForURL(/\/app\/classes\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  await expect(
    studentPage.getByRole("heading", { name: "Period 3 Spanish" }),
  ).toBeVisible();

  // The student is not the teacher, so no join code is exposed to them.
  await expect(studentPage.getByText("Join code")).toHaveCount(0);

  // The teacher's roster now shows the student.
  await teacherPage.reload();
  await expect(teacherPage.getByText("1 student")).toBeVisible();
  await shot(studentPage, "08-class-student");

  await teacherContext.close();
  await studentContext.close();
});

test("a bad join code is rejected", async ({ page }) => {
  await requireSupabase(test);
  await signUp(page, uniqueEmail("badcode"));

  await page.goto("/app/classes");
  await page.getByLabel("Class code").fill("ZZZZZZ");
  await page.getByRole("button", { name: "Join class" }).click();

  await expect(page.getByText("No class matches that code.")).toBeVisible({
    timeout: 30_000,
  });
});

test("AI deck generation works without an API key via the mock path", async ({
  page,
}) => {
  await requireSupabase(test);
  await signUp(page, uniqueEmail("ai"));

  await page.goto("/app/decks/new");
  await page.getByRole("tab", { name: "From text" }).click();
  await page
    .getByLabel("Text")
    .fill(
      "The restaurant near the station serves breakfast every morning. " +
        "Travellers often order coffee and pastries before catching their train.",
    );
  await page.getByRole("button", { name: "Create deck" }).click();

  await page.waitForURL(/\/app\/decks\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  // Cards exist and the study modes are offered.
  await expect(page.getByRole("link", { name: /Flashcards/ })).toBeVisible();
  await shot(page, "09-generated-deck");
});
