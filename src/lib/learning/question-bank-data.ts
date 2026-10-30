/**
 * Curated sample question bank (Phase 6.4 support). Hand-authored, correct
 * questions keyed to real taxonomy concept ids, used as the reliable fallback
 * when live LLM generation fails or times out for content we cover. This is the
 * single source of truth; `question-bank.ts` indexes and selects from it.
 *
 * Coverage is intentionally partial — a representative set across the most-used
 * subjects (Mathematics, Science, Computer Science). Concepts without an entry
 * are LLM-only; if the LLM is unavailable for them, the quiz route reports that
 * generation is temporarily unavailable rather than showing unrelated samples.
 *
 * Authoring rules (enforced by `question-bank.test.ts`):
 * - `conceptId` must exist in the seed taxonomy.
 * - mcq: exactly 4 options, exactly one correctIndices entry, in range.
 * - every question has a plain, self-contained prompt and an explanation.
 */

import type { Difficulty, QuestionFormat } from "@/types/learning";

export interface CuratedQuestion {
  conceptId: string;
  difficulty: Difficulty;
  format: QuestionFormat;
  prompt: string;
  options?: string[];
  correctIndices?: number[];
  referenceAnswer?: string;
  explanation?: string;
}

/** Convenience for the common case: a single-answer multiple-choice question. */
function mcq(
  conceptId: string,
  difficulty: Difficulty,
  prompt: string,
  options: [string, string, string, string],
  correctIndex: 0 | 1 | 2 | 3,
  explanation: string,
): CuratedQuestion {
  return {
    conceptId,
    difficulty,
    format: "mcq",
    prompt,
    options,
    correctIndices: [correctIndex],
    explanation,
  };
}

export const CURATED_QUESTIONS: CuratedQuestion[] = [
  // ─── Mathematics ───────────────────────────────────────────────────────
  mcq(
    "fractions",
    2,
    "What is 1/2 + 1/4?",
    ["1/6", "2/6", "3/4", "1/8"],
    2,
    "Use a common denominator of 4: 1/2 = 2/4, so 2/4 + 1/4 = 3/4.",
  ),
  mcq(
    "fractions",
    3,
    "Which fraction is equivalent to 6/8?",
    ["2/3", "3/4", "4/5", "5/6"],
    1,
    "Divide numerator and denominator by their GCD, 2: 6/8 = 3/4.",
  ),
  mcq(
    "percentages",
    2,
    "What is 20% of 150?",
    ["15", "20", "30", "45"],
    2,
    "20% = 0.20, and 0.20 × 150 = 30.",
  ),
  mcq(
    "percentages",
    3,
    "A $80 item is discounted by 25%. What is the sale price?",
    ["$55", "$60", "$65", "$75"],
    1,
    "25% of 80 is 20, so the price drops to 80 − 20 = $60.",
  ),
  mcq(
    "linear-equations",
    2,
    "Solve for x: 3x + 6 = 15.",
    ["x = 2", "x = 3", "x = 5", "x = 7"],
    1,
    "Subtract 6 to get 3x = 9, then divide by 3: x = 3.",
  ),
  mcq(
    "linear-equations",
    3,
    "What is the slope of the line y = −2x + 4?",
    ["4", "2", "−2", "−4"],
    2,
    "In slope-intercept form y = mx + b, the slope m is the coefficient of x, which is −2.",
  ),
  mcq(
    "quadratic-equations",
    3,
    "What are the roots of x² − 5x + 6 = 0?",
    ["x = 1 and x = 6", "x = 2 and x = 3", "x = −2 and x = −3", "x = 0 and x = 5"],
    1,
    "Factor as (x − 2)(x − 3) = 0, so x = 2 or x = 3.",
  ),
  mcq(
    "quadratic-equations",
    4,
    "For ax² + bx + c = 0, what does a positive discriminant b² − 4ac indicate?",
    ["No real roots", "One repeated real root", "Two distinct real roots", "Two complex roots"],
    2,
    "A positive discriminant means two distinct real roots; zero means one repeated root; negative means complex roots.",
  ),
  mcq(
    "pythagorean-theorem",
    2,
    "In a right triangle with legs 3 and 4, what is the hypotenuse?",
    ["5", "6", "7", "12"],
    0,
    "By a² + b² = c²: 3² + 4² = 9 + 16 = 25, and √25 = 5.",
  ),
  mcq(
    "circles",
    2,
    "What is the circumference of a circle with radius r?",
    ["πr²", "2πr", "πr", "2πr²"],
    1,
    "Circumference is 2πr; πr² is the area.",
  ),
  mcq(
    "derivatives",
    3,
    "What is the derivative of f(x) = x³?",
    ["3x²", "x²", "3x", "x⁴/4"],
    0,
    "By the power rule, d/dx[xⁿ] = n·xⁿ⁻¹, so d/dx[x³] = 3x².",
  ),
  mcq(
    "derivatives",
    4,
    "What is the derivative of sin(x)?",
    ["−sin(x)", "cos(x)", "−cos(x)", "tan(x)"],
    1,
    "The derivative of sin(x) is cos(x).",
  ),

  // ─── Science ───────────────────────────────────────────────────────────
  mcq(
    "newtons-laws",
    2,
    "Newton's first law is also known as the law of what?",
    ["Acceleration", "Inertia", "Gravitation", "Action–reaction"],
    1,
    "The first law — an object stays at rest or in uniform motion unless acted on by a net force — is the law of inertia.",
  ),
  mcq(
    "newtons-laws",
    3,
    "According to F = ma, if force is constant and mass doubles, acceleration will…",
    ["Double", "Halve", "Stay the same", "Quadruple"],
    1,
    "With F fixed, a = F/m, so doubling m halves the acceleration.",
  ),
  mcq(
    "energy-conservation",
    2,
    "A ball falls freely. As it drops, its gravitational potential energy mostly converts to what?",
    ["Chemical energy", "Kinetic energy", "Nuclear energy", "Electrical energy"],
    1,
    "Conservation of energy: as height decreases, potential energy becomes kinetic energy.",
  ),
  mcq(
    "periodic-table",
    1,
    "What do elements in the same column (group) of the periodic table tend to share?",
    [
      "The same mass",
      "Similar chemical properties",
      "The same number of neutrons",
      "The same color",
    ],
    1,
    "Elements in a group have the same number of valence electrons, giving similar chemical behavior.",
  ),
  mcq(
    "acids-bases",
    2,
    "On the pH scale, a solution with pH 3 is…",
    ["Strongly basic", "Neutral", "Acidic", "A pure metal"],
    2,
    "pH below 7 is acidic, 7 is neutral, and above 7 is basic; pH 3 is acidic.",
  ),
  mcq(
    "cell-structure",
    1,
    "Which organelle is known as the 'powerhouse of the cell'?",
    ["Nucleus", "Ribosome", "Mitochondrion", "Golgi apparatus"],
    2,
    "Mitochondria produce most of the cell's ATP through respiration.",
  ),
  mcq(
    "genetics-basics",
    2,
    "In humans, how many chromosomes are in a typical body (somatic) cell?",
    ["23", "46", "48", "92"],
    1,
    "Humans have 23 pairs of chromosomes, 46 in total, in each somatic cell.",
  ),
  mcq(
    "evolution",
    3,
    "In natural selection, what does 'fitness' primarily measure?",
    ["Physical strength", "Reproductive success", "Body size", "Lifespan alone"],
    1,
    "Fitness is an organism's relative ability to survive and reproduce in its environment.",
  ),

  // ─── Computer Science ──────────────────────────────────────────────────
  mcq(
    "variables-and-types",
    1,
    "Which of these is a boolean value?",
    ["42", '"hello"', "true", "3.14"],
    2,
    'A boolean holds true or false; 42 is an integer, "hello" a string, and 3.14 a float.',
  ),
  mcq(
    "control-flow",
    2,
    "How many times does a loop 'for i in range(0, 3)' execute its body (0-indexed, exclusive end)?",
    ["2", "3", "4", "0"],
    1,
    "range(0, 3) yields 0, 1, 2 — three iterations.",
  ),
  mcq(
    "functions-cs",
    2,
    "What does the 'return' statement do in a function?",
    [
      "Prints to the screen",
      "Sends a value back to the caller",
      "Declares a variable",
      "Starts a loop",
    ],
    1,
    "return hands a value back to whoever called the function and ends its execution.",
  ),
  mcq(
    "recursion",
    3,
    "What is essential for a recursive function to avoid infinite recursion?",
    ["A global variable", "A base case", "A loop", "A print statement"],
    1,
    "A base case stops the recursion; without one, the function calls itself forever.",
  ),
  mcq(
    "arrays-and-lists",
    2,
    "What is the index of the first element in a zero-indexed array?",
    ["−1", "0", "1", "It has no index"],
    1,
    "Zero-indexed arrays number the first element as index 0.",
  ),
  mcq(
    "big-o-notation",
    3,
    "What is the average-case time complexity of binary search on a sorted array of n items?",
    ["O(1)", "O(log n)", "O(n)", "O(n²)"],
    1,
    "Binary search halves the search space each step, giving O(log n).",
  ),
  mcq(
    "big-o-notation",
    4,
    "Which complexity grows fastest as n increases?",
    ["O(log n)", "O(n)", "O(n log n)", "O(n²)"],
    3,
    "O(n²) grows faster than O(n log n), O(n), and O(log n).",
  ),
  mcq(
    "sql-queries",
    2,
    "Which SQL clause filters rows returned by a SELECT?",
    ["ORDER BY", "WHERE", "GROUP BY", "LIMIT"],
    1,
    "WHERE filters rows by a condition; ORDER BY sorts, GROUP BY aggregates, LIMIT caps the count.",
  ),
  mcq(
    "http-protocol",
    2,
    "Which HTTP status code means 'Not Found'?",
    ["200", "301", "404", "500"],
    2,
    "404 indicates the requested resource was not found; 200 is success and 500 a server error.",
  ),
];
