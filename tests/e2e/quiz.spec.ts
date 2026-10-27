import { test, expect } from "@playwright/test";

test("a learner can complete a full quiz and see a score", async ({ page }) => {
  await page.goto("/quiz/mathematics");

  await page.getByRole("button", { name: "Start quiz" }).click();
  await expect(page.getByText("Question 1 of 5")).toBeVisible();

  for (let i = 1; i <= 5; i += 1) {
    await page.getByRole("option").first().click();
    const label = i < 5 ? "Next question" : "Finish";
    await page.getByRole("button", { name: label }).click();
  }

  await expect(page.getByText("You scored")).toBeVisible();
  await expect(page.getByText(/\d+%/)).toBeVisible();
  await expect(page.getByRole("button", { name: "New quiz" })).toBeVisible();
});

test("difficulty can be chosen before starting", async ({ page }) => {
  await page.goto("/quiz/science");
  const hard = page.getByRole("button", { name: "Difficulty 4: Hard" });
  await hard.click();
  await expect(hard).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Start quiz" }).click();
  await expect(page.getByText("Level 4", { exact: true })).toBeVisible();
});
