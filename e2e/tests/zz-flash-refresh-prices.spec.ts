import { test, expect, Page } from "@playwright/test";
import { ListsPage } from "../pages/ListsPage";
import { ListDetailPage } from "../pages/ListDetailPage";
import { waitForConvex, clickPressable } from "../fixtures/base";

/**
 * Ad-hoc verification for the FlashInsightBanner on list detail.
 *
 * The refresh-prices button used to call showToast() which was never
 * rendered — feedback was silent. This test drives the happy path and
 * asserts the banner now appears with one of the expected titles.
 */

/**
 * Click a React Native Web Pressable/GlassButton by its visible text.
 *
 * Strategy: find the text node in the DOM, walk up to the nearest
 * cursor:pointer ancestor (the actual Pressable), get its bounding rect, then
 * use Playwright's real mouse to dispatch trusted pointerdown/pointerup
 * events at the center. RNW Pressable ignores untrusted synthetic clicks on
 * inner text spans, and not all Pressables expose role="button".
 */
async function clickButton(page: Page, text: string): Promise<boolean> {
  await page.waitForTimeout(200);
  const rect = await page.evaluate((needle) => {
    const n = needle.toLowerCase();
    const all = Array.from(document.querySelectorAll("*")) as HTMLElement[];
    for (const el of all) {
      if (!(el instanceof HTMLElement)) continue;
      const txt = (el.textContent || "").toLowerCase().trim();
      if (!txt.includes(n)) continue;
      // Prefer leaf-ish elements so we find the *innermost* matching ancestor
      if (el.childElementCount > 3) continue;
      let cur: HTMLElement | null = el;
      while (cur) {
        if (getComputedStyle(cur).cursor === "pointer") {
          const r = cur.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }
        cur = cur.parentElement;
      }
    }
    return null;
  }, text);

  if (!rect || rect.width === 0 || rect.height === 0) return false;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.mouse.up();
  return true;
}

test.describe("FlashInsightBanner — list refresh prices", () => {
  test.describe.configure({ mode: "serial" });

  let lists: ListsPage;
  let detail: ListDetailPage;

  test.beforeEach(async ({ page }) => {
    lists = new ListsPage(page);
    detail = new ListDetailPage(page);
  });

  test("tapping Refresh Prices surfaces a FlashInsightBanner", async ({ page }) => {
    test.setTimeout(180_000);

    // ── Navigate to Lists ─────────────────────────────────────
    await lists.goto();
    await page.waitForTimeout(1500);

    // Use a specific existing-list signal: an "Active" status badge on a card.
    // The previous "budget" matcher hit the "set a budget" description text
    // in the empty state, which led to clicking the paragraph instead.
    const activeBadge = page.getByText("Active", { exact: true });
    const badgeCount = await activeBadge.count().catch(() => 0);
    // badgeCount > 1 means we have the tab chip plus at least one list card badge
    const hasExisting = badgeCount > 1;

    if (hasExisting) {
      // Open the first list card — walk up from its Active badge to a
      // cursor:pointer ancestor (the card Pressable).
      const opened = await page.evaluate(() => {
        const badges = Array.from(document.querySelectorAll("*")).filter(
          (el) => el instanceof HTMLElement && el.textContent?.trim() === "Active"
        ) as HTMLElement[];
        // Skip the first (tab chip) — take a card badge
        for (let i = 1; i < badges.length; i++) {
          let cur: HTMLElement | null = badges[i];
          while (cur) {
            if (getComputedStyle(cur).cursor === "pointer") {
              cur.click();
              return true;
            }
            cur = cur.parentElement;
          }
        }
        return false;
      });
      console.log("Opened existing list card?", opened);
      await page.waitForURL(/\/list\//, { timeout: 15_000 }).catch(() => {});
    }

    if (!/\/list\//.test(page.url())) {
      // Empty state OR card click didn't navigate — drive the create flow.
      const createClicked = await clickButton(page, "Create a New List");
      console.log("Clicked 'Create a New List'?", createClicked);
      expect(createClicked, "Create button must be clickable").toBeTruthy();
      await page.waitForTimeout(2500);

      // CreateListOptionsModal → "Start from Scratch"
      const scratchClicked = await clickButton(page, "Start from Scratch");
      console.log("Clicked 'Start from Scratch'?", scratchClicked);
      expect(scratchClicked, "Start from Scratch must be clickable").toBeTruthy();
      await page.waitForURL(/\/list\//, { timeout: 30_000 });
    }

    expect(page.url()).toMatch(/\/list\//);
    await waitForConvex(page, 2000);

    // ── Capture baseline (no banner visible) ─────────────────
    await page.screenshot({
      path: "test-results/flash-refresh-01-before.png",
      fullPage: false,
    });

    // Refresh Prices only renders when itemCount > 0 and canEdit.
    // Ensure at least one item exists.
    let refreshVisible = await detail.refreshPricesButton
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (!refreshVisible) {
      await detail.addItem("Milk").catch((err) => {
        console.log("addItem failed:", err?.message);
      });
      const goToList = page.getByText("Go to List", { exact: false });
      if (await goToList.isVisible({ timeout: 2000 }).catch(() => false)) {
        await goToList.click();
      }
      await waitForConvex(page, 1500);
      refreshVisible = await detail.refreshPricesButton
        .isVisible({ timeout: 3000 })
        .catch(() => false);
    }

    expect(refreshVisible, "Refresh Prices button must be visible").toBeTruthy();

    // ── Click Refresh Prices ─────────────────────────────────
    const refreshClicked = await clickButton(page, "Refresh Prices");
    if (!refreshClicked) {
      await clickPressable(page, "Refresh Prices", { exact: false });
    }

    // ── Assert the FlashInsightBanner appears ─────────────────
    const banner = page
      .getByText("Prices refreshed", { exact: false })
      .or(page.getByText("Prices already up to date", { exact: false }))
      .or(page.getByText("Nothing to refresh", { exact: false }))
      .or(page.getByText("Couldn't refresh prices", { exact: false }));

    await expect(banner.first()).toBeVisible({ timeout: 10_000 });

    const titleShown = await banner.first().textContent();
    console.log("Flash banner title shown:", titleShown?.trim());

    // Screenshot while the banner is dwelling
    await page.screenshot({
      path: "test-results/flash-refresh-02-banner-visible.png",
      fullPage: false,
    });

    // ── Assert the banner disappears after the dwell ──────────
    // ENTER (520) + DWELL (3800) + EXIT (320) ≈ 4700ms — give headroom
    await expect(banner.first()).toBeHidden({ timeout: 10_000 });

    await page.screenshot({
      path: "test-results/flash-refresh-03-after.png",
      fullPage: false,
    });
  });
});
