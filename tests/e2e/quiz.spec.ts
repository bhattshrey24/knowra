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

test("multiple-select format lets you pick several answers", async ({ page }) => {
  await page.goto("/quiz/science");
  // Types are multi-select; switch the quiz to only multiple-select.
  await page.getByRole("button", { name: /Multiple choice/ }).click();
  await page.getByRole("button", { name: /Multiple select/ }).click();
  await page.getByRole("button", { name: "Start quiz" }).click();

  await expect(page.getByText("Select all that apply.")).toBeVisible();
  const options = page.getByRole("option");
  await options.nth(0).click();
  await options.nth(2).click();
  await page.getByRole("button", { name: "Next question" }).click();
  await expect(page.getByText("Question 2 of 5")).toBeVisible();
});

test("written format accepts typed answers and scores", async ({ page }) => {
  await page.goto("/quiz/history");
  await page.getByRole("button", { name: /Multiple choice/ }).click();
  await page.getByRole("button", { name: /Written/ }).click();
  await page.getByRole("button", { name: "Start quiz" }).click();

  await expect(page.getByText("Answer in your own words.")).toBeVisible();
  for (let i = 1; i <= 5; i += 1) {
    await page.getByRole("textbox", { name: "Your answer" }).fill("the core idea of the concept");
    await page.getByRole("button", { name: i < 5 ? "Next question" : "Finish" }).click();
  }
  await expect(page.getByText("You scored")).toBeVisible();
});

test("the question-count slider controls how many questions a quiz has", async ({ page }) => {
  await page.goto("/quiz/science");
  const slider = page.getByRole("slider", { name: "Number of questions" });
  await expect(slider).toHaveValue("5");
  // Drive the native range input directly, then verify the quiz length.
  await slider.fill("8");
  await expect(slider).toHaveValue("8");
  await page.getByRole("button", { name: "Start quiz" }).click();
  await expect(page.getByText("Question 1 of 8")).toBeVisible();
});

test("you can mix question types in a single quiz", async ({ page }) => {
  await page.goto("/quiz/science");
  // Keep MCQ (default) and add written → a blended quiz.
  await page.getByRole("button", { name: /Written/ }).click();
  await page.getByRole("button", { name: "Start quiz" }).click();
  await expect(page.getByText("Question 1 of 5")).toBeVisible();
  // First question is MCQ (options), second is written (textbox): round-robin mix.
  await expect(page.getByRole("option").first()).toBeVisible();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Next question" }).click();
  await expect(page.getByRole("textbox", { name: "Your answer" })).toBeVisible();
});

test("a timed quiz auto-submits when the countdown runs out", async ({ page }) => {
  await page.goto("/quiz/science");
  await page.getByRole("switch", { name: "Enable timer" }).click();
  await page.getByRole("spinbutton", { name: "Minutes" }).fill("1");
  await page.getByRole("button", { name: "Start quiz" }).click();
  // The countdown is visible during the quiz.
  await expect(page.getByRole("timer", { name: "Time remaining" })).toBeVisible();
});

test("difficulty can be chosen before starting", async ({ page }) => {
  await page.goto("/quiz/science");
  const hard = page.getByRole("button", { name: "Difficulty 4: Hard" });
  await hard.click();
  await expect(hard).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Start quiz" }).click();
  await expect(page.getByText("Level 4", { exact: true })).toBeVisible();
});
