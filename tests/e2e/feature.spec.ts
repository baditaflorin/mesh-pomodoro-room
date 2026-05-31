import { expect, test, type Page } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/**
 * Load-bearing cross-peer assertion for the ADVERTISED core action:
 * "Every phone runs the same mesh-time-synced 25/5 timer ... anyone presses
 * Start round 1 ... every phone switches between focus and break at the exact
 * same mesh-time instant."
 *
 * Starting the session on peer A writes a single Y.Map("session")["singleton"]
 * entry `{ startedAt, cycleMs, rounds }`. Each peer derives its phase from
 * `meshNow - startedAt`, so peer B — which never pressed start — must flip
 * from the idle "Start round 1" screen into the IDENTICAL running session
 * (same round count, live countdown) purely from the shared Yjs doc.
 */

/** Click through the "Connect" arm screen into the live room. */
async function connect(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^connect$/i }).click();
}

test("starting a session on peer A drives the synced timer on peer B", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await connect(a);
    await connect(b);

    // Both peers reach the idle pre-start screen with the "Start round 1" CTA.
    await expect(a.getByRole("button", { name: /start round 1/i })).toBeVisible();
    await expect(b.getByRole("button", { name: /start round 1/i })).toBeVisible();

    // Peer A drives the advertised core action.
    await a.getByRole("button", { name: /start round 1/i }).click();

    // Peer A enters the running focus phase.
    await expect(a.locator(".pomo-phase-label")).toHaveText(/focus/i);
    await expect(a.locator(".pomo-hud")).toContainText("round 1 of 3");

    // THE LOAD-BEARING CROSS-PEER ASSERTION: peer B never pressed start, yet
    // it transitions out of the idle screen into the SAME mesh-time-synced
    // session written by A into the shared Yjs "session" map.
    await expect(b.getByRole("button", { name: /start round 1/i })).toHaveCount(0);
    await expect(b.locator(".pomo-phase-label")).toHaveText(/focus/i);
    await expect(b.locator(".pomo-hud")).toContainText("round 1 of 3");

    // The live countdown is running on peer B (mm:ss derived from mesh-time).
    await expect(b.locator(".pomo-countdown")).toHaveText(/^\d{2}:\d{2}$/);
  } finally {
    await cleanup();
  }
});
