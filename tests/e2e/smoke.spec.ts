import { test, expect } from "@playwright/test";

test("landing page loads and links into the app", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("remember it");

  await page.getByRole("link", { name: "Start a quiz" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { name: "What do you want to learn?" })).toBeVisible();
});

test("a subject opens the quiz start screen with difficulty selection", async ({ page }) => {
  await page.goto("/home");
  await page.getByRole("link", { name: /Mathematics/ }).click();
  await expect(page).toHaveURL(/\/quiz\/mathematics$/);
  await expect(page.getByRole("button", { name: "Start quiz" })).toBeVisible();
});
