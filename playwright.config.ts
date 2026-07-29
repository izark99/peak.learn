import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // These tests share a live Supabase project, so running them in parallel
  // makes the data assertions race each other.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },

  // Start the dev server automatically so `npm run test:e2e` works on its own.
  // Without this, running the suite with nothing on :3000 fails with a bare
  // connection error rather than anything actionable.
  //
  // Skipped when E2E_BASE_URL points somewhere else — that means the caller is
  // deliberately testing an already-running or deployed instance.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        // Reuse a server you already have running locally; always start a
        // fresh one in CI so a stale process can't mask a failure.
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // The container ships Chromium at this path (it's a symlink straight to
        // the binary). Never download one — the postinstall skip is deliberate.
        launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
      },
    },
  ],
});
