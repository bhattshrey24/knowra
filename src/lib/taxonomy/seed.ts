/**
 * The initial shared taxonomy (Phase 6.4): a diverse, reasonably comprehensive
 * starting set of subjects, topics, and concepts. This TypeScript file is the
 * single source of truth; a server routine loads it into the shared taxonomy
 * tables (migration `0007`). The taxonomy then expands as users explore new
 * areas — without creating duplicate entries.
 *
 * Subject ids match the predefined `Domain.slug`s so the existing flat flow and
 * the new taxonomy line up during the incremental rollout. `taxonomy-seed.test`
 * asserts both the structural validity of this data and that bridge.
 */

import type { TaxonomyInput } from "@/lib/learning/taxonomy";

export const SEED_TAXONOMY: TaxonomyInput = {
  subjects: [
    {
      id: "mathematics",
      name: "Mathematics",
      description: "Arithmetic, algebra, geometry, calculus, and beyond.",
    },
    {
      id: "science",
      name: "Science",
      description: "Physics, chemistry, biology, and the scientific method.",
    },
    {
      id: "history",
      name: "History",
      description: "Civilisations, turning points, and the people who shaped them.",
    },
    {
      id: "world-politics",
      name: "World Politics",
      description: "Governments, institutions, and global affairs.",
    },
    {
      id: "music",
      name: "Music",
      description: "Theory, history, instruments, and how sound works.",
    },
  ],

  topics: [
    // Mathematics
    { id: "arithmetic", subjectId: "mathematics", name: "Arithmetic" },
    { id: "algebra", subjectId: "mathematics", name: "Algebra" },
    { id: "geometry", subjectId: "mathematics", name: "Geometry" },
    { id: "calculus", subjectId: "mathematics", name: "Calculus" },
    { id: "statistics-probability", subjectId: "mathematics", name: "Statistics & Probability" },
    // Science
    { id: "physics", subjectId: "science", name: "Physics" },
    { id: "chemistry", subjectId: "science", name: "Chemistry" },
    { id: "biology", subjectId: "science", name: "Biology" },
    { id: "scientific-method", subjectId: "science", name: "Scientific Method" },
    // History
    { id: "ancient-history", subjectId: "history", name: "Ancient History" },
    { id: "medieval-history", subjectId: "history", name: "Medieval History" },
    { id: "modern-history", subjectId: "history", name: "Modern History" },
    // World Politics
    { id: "political-systems", subjectId: "world-politics", name: "Political Systems" },
    { id: "international-relations", subjectId: "world-politics", name: "International Relations" },
    { id: "political-economy", subjectId: "world-politics", name: "Political Economy" },
    // Music
    { id: "music-theory", subjectId: "music", name: "Music Theory" },
    { id: "music-history", subjectId: "music", name: "Music History" },
    { id: "instruments", subjectId: "music", name: "Instruments" },
  ],

  concepts: [
    // Mathematics · Arithmetic
    { id: "fractions", name: "Fractions", topicIds: ["arithmetic"] },
    { id: "percentages", name: "Percentages", topicIds: ["arithmetic"] },
    { id: "ratios-proportions", name: "Ratios & proportions", topicIds: ["arithmetic"] },
    // Mathematics · Algebra
    { id: "linear-equations", name: "Linear equations", topicIds: ["algebra"] },
    { id: "quadratic-equations", name: "Quadratic equations", topicIds: ["algebra"] },
    { id: "polynomials", name: "Polynomials", topicIds: ["algebra"] },
    // Mathematics · Geometry
    { id: "pythagorean-theorem", name: "Pythagorean theorem", topicIds: ["geometry"] },
    { id: "circles", name: "Circles", topicIds: ["geometry"] },
    { id: "triangle-congruence", name: "Triangle congruence", topicIds: ["geometry"] },
    // Mathematics · Calculus
    { id: "limits", name: "Limits", topicIds: ["calculus"] },
    { id: "derivatives", name: "Derivatives", topicIds: ["calculus"] },
    { id: "integrals", name: "Integrals", topicIds: ["calculus"] },
    // Mathematics · Statistics & Probability
    {
      id: "descriptive-statistics",
      name: "Descriptive statistics",
      topicIds: ["statistics-probability"],
    },
    // Shared across Mathematics and Science — one concept, two topics, no duplication.
    {
      id: "probability",
      name: "Probability",
      topicIds: ["statistics-probability", "scientific-method"],
    },

    // Science · Physics
    { id: "newtons-laws", name: "Newton's laws of motion", topicIds: ["physics"] },
    { id: "energy-conservation", name: "Conservation of energy", topicIds: ["physics"] },
    { id: "electricity-basics", name: "Basics of electricity", topicIds: ["physics"] },
    // Science · Chemistry
    { id: "periodic-table", name: "The periodic table", topicIds: ["chemistry"] },
    { id: "chemical-bonding", name: "Chemical bonding", topicIds: ["chemistry"] },
    { id: "acids-bases", name: "Acids & bases", topicIds: ["chemistry"] },
    // Science · Biology
    { id: "cell-structure", name: "Cell structure", topicIds: ["biology"] },
    { id: "genetics-basics", name: "Basics of genetics", topicIds: ["biology"] },
    { id: "evolution", name: "Evolution by natural selection", topicIds: ["biology"] },
    // Science · Scientific Method
    { id: "hypothesis-testing", name: "Hypothesis testing", topicIds: ["scientific-method"] },
    { id: "experimental-design", name: "Experimental design", topicIds: ["scientific-method"] },

    // History · Ancient
    { id: "ancient-egypt", name: "Ancient Egypt", topicIds: ["ancient-history"] },
    { id: "roman-empire", name: "The Roman Empire", topicIds: ["ancient-history"] },
    { id: "ancient-greece", name: "Ancient Greece", topicIds: ["ancient-history"] },
    // History · Medieval
    { id: "feudalism", name: "Feudalism", topicIds: ["medieval-history"] },
    { id: "the-crusades", name: "The Crusades", topicIds: ["medieval-history"] },
    { id: "black-death", name: "The Black Death", topicIds: ["medieval-history"] },
    // History · Modern
    {
      id: "industrial-revolution",
      name: "The Industrial Revolution",
      topicIds: ["modern-history"],
    },
    { id: "world-war-i", name: "World War I", topicIds: ["modern-history"] },
    { id: "world-war-ii", name: "World War II", topicIds: ["modern-history"] },

    // World Politics · Systems
    { id: "democracy", name: "Democracy", topicIds: ["political-systems"] },
    { id: "authoritarianism", name: "Authoritarianism", topicIds: ["political-systems"] },
    { id: "federalism", name: "Federalism", topicIds: ["political-systems"] },
    // World Politics · International Relations
    { id: "united-nations", name: "The United Nations", topicIds: ["international-relations"] },
    { id: "diplomacy", name: "Diplomacy", topicIds: ["international-relations"] },
    { id: "geopolitics", name: "Geopolitics", topicIds: ["international-relations"] },
    // World Politics · Political Economy
    { id: "globalization", name: "Globalization", topicIds: ["political-economy"] },
    { id: "trade-policy", name: "Trade policy", topicIds: ["political-economy"] },

    // Music · Theory
    { id: "scales-and-keys", name: "Scales & keys", topicIds: ["music-theory"] },
    { id: "chords-and-harmony", name: "Chords & harmony", topicIds: ["music-theory"] },
    { id: "rhythm-and-meter", name: "Rhythm & meter", topicIds: ["music-theory"] },
    // Music · History
    { id: "baroque-era", name: "The Baroque era", topicIds: ["music-history"] },
    { id: "classical-era", name: "The Classical era", topicIds: ["music-history"] },
    { id: "jazz-origins", name: "Origins of jazz", topicIds: ["music-history"] },
    // Music · Instruments
    { id: "string-instruments", name: "String instruments", topicIds: ["instruments"] },
    { id: "percussion-instruments", name: "Percussion instruments", topicIds: ["instruments"] },
  ],
};
