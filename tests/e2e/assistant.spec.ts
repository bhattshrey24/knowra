import { test, expect } from "@playwright/test";

test("the assistant answers a question grounded in the profile", async ({ page }) => {
  await page.goto("/assistant");
  await expect(page.getByRole("heading", { name: "Learning assistant" })).toBeVisible();

  // Use a starter suggestion; the mock provider replies deterministically.
  await page.getByRole("button", { name: "What should I study next?" }).click();

  // The user's message and an assistant reply both appear.
  await expect(page.getByText("What should I study next?")).toBeVisible();
  await expect(page.getByText(/quiz/i)).toBeVisible();
});

test("the assistant can be reached from the nav", async ({ page }) => {
  await page.goto("/home");
  await page.getByRole("link", { name: "Assistant" }).click();
  await expect(page).toHaveURL(/\/assistant$/);
});
