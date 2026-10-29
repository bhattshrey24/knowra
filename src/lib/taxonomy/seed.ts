/**
 * The initial shared taxonomy (Phase 6.4): a diverse, reasonably comprehensive
 * starting set of subjects, topics, and concepts. This TypeScript file is the
 * single source of truth; a server routine loads it into the shared taxonomy
 * tables (migration `0007`). The taxonomy then expands as users explore new
 * areas — without creating duplicate entries.
 *
 * Subjects are derived from `DOMAINS` so they stay in sync with the predefined
 * subjects the quiz route can resolve. `taxonomy-seed.test` asserts the
 * structural validity of this data and that bridge.
 */

import type { Subject, Topic, Concept } from "@/types/learning";
import type { TaxonomyInput } from "@/lib/learning/taxonomy";
import { DOMAINS } from "@/lib/domains";

const subjects: Subject[] = DOMAINS.map((d) => ({
  id: d.slug,
  name: d.name,
  description: d.description,
}));

const topics: Topic[] = [
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
  // Computer Science
  {
    id: "programming-fundamentals",
    subjectId: "computer-science",
    name: "Programming Fundamentals",
  },
  {
    id: "data-structures-algorithms",
    subjectId: "computer-science",
    name: "Data Structures & Algorithms",
  },
  { id: "databases", subjectId: "computer-science", name: "Databases" },
  { id: "web-development", subjectId: "computer-science", name: "Web Development" },
  // History
  { id: "ancient-history", subjectId: "history", name: "Ancient History" },
  { id: "medieval-history", subjectId: "history", name: "Medieval History" },
  { id: "modern-history", subjectId: "history", name: "Modern History" },
  // Geography
  { id: "physical-geography", subjectId: "geography", name: "Physical Geography" },
  { id: "human-geography", subjectId: "geography", name: "Human Geography" },
  { id: "cartography", subjectId: "geography", name: "Cartography" },
  // Economics
  { id: "microeconomics", subjectId: "economics", name: "Microeconomics" },
  { id: "macroeconomics", subjectId: "economics", name: "Macroeconomics" },
  { id: "international-economics", subjectId: "economics", name: "International Economics" },
  // World Politics
  { id: "political-systems", subjectId: "world-politics", name: "Political Systems" },
  { id: "international-relations", subjectId: "world-politics", name: "International Relations" },
  { id: "political-economy", subjectId: "world-politics", name: "Political Economy" },
  // Philosophy
  { id: "ethics", subjectId: "philosophy", name: "Ethics" },
  { id: "logic", subjectId: "philosophy", name: "Logic" },
  { id: "metaphysics", subjectId: "philosophy", name: "Metaphysics" },
  { id: "epistemology", subjectId: "philosophy", name: "Epistemology" },
  // Psychology
  { id: "cognitive-psychology", subjectId: "psychology", name: "Cognitive Psychology" },
  { id: "developmental-psychology", subjectId: "psychology", name: "Developmental Psychology" },
  { id: "social-psychology", subjectId: "psychology", name: "Social Psychology" },
  // Sociology
  { id: "social-structures", subjectId: "sociology", name: "Social Structures" },
  { id: "culture-and-society", subjectId: "sociology", name: "Culture & Society" },
  { id: "social-change", subjectId: "sociology", name: "Social Change" },
  // Literature
  { id: "literary-devices", subjectId: "literature", name: "Literary Devices" },
  { id: "literary-genres", subjectId: "literature", name: "Genres" },
  { id: "literary-movements", subjectId: "literature", name: "Literary Movements" },
  // Linguistics
  { id: "phonetics-phonology", subjectId: "linguistics", name: "Phonetics & Phonology" },
  { id: "syntax-grammar", subjectId: "linguistics", name: "Syntax & Grammar" },
  { id: "semantics", subjectId: "linguistics", name: "Semantics" },
  // Music
  { id: "music-theory", subjectId: "music", name: "Music Theory" },
  { id: "music-history", subjectId: "music", name: "Music History" },
  { id: "instruments", subjectId: "music", name: "Instruments" },
  // Art & Design
  { id: "art-history", subjectId: "art-and-design", name: "Art History" },
  { id: "visual-design-principles", subjectId: "art-and-design", name: "Visual Design Principles" },
  { id: "drawing-painting", subjectId: "art-and-design", name: "Drawing & Painting" },
  // Film & Media
  { id: "film-history", subjectId: "film-and-media", name: "Film History" },
  { id: "film-techniques", subjectId: "film-and-media", name: "Film Techniques" },
  { id: "media-studies", subjectId: "film-and-media", name: "Media Studies" },
  // Astronomy
  { id: "the-solar-system", subjectId: "astronomy", name: "The Solar System" },
  { id: "stars-and-galaxies", subjectId: "astronomy", name: "Stars & Galaxies" },
  { id: "cosmology", subjectId: "astronomy", name: "Cosmology" },
  // Environmental Science
  { id: "ecology", subjectId: "environmental-science", name: "Ecology" },
  {
    id: "climate-sustainability",
    subjectId: "environmental-science",
    name: "Climate & Sustainability",
  },
  { id: "natural-resources", subjectId: "environmental-science", name: "Natural Resources" },
  // Health & Medicine
  { id: "human-anatomy", subjectId: "health-and-medicine", name: "Human Anatomy" },
  { id: "nutrition", subjectId: "health-and-medicine", name: "Nutrition" },
  { id: "disease-immunity", subjectId: "health-and-medicine", name: "Disease & Immunity" },
  // Sports & Fitness
  { id: "exercise-science", subjectId: "sports-and-fitness", name: "Exercise Science" },
  { id: "popular-sports", subjectId: "sports-and-fitness", name: "Popular Sports" },
  { id: "fitness-nutrition", subjectId: "sports-and-fitness", name: "Fitness Nutrition" },
  // Engineering
  { id: "mechanical-engineering", subjectId: "engineering", name: "Mechanical Engineering" },
  { id: "electrical-engineering", subjectId: "engineering", name: "Electrical Engineering" },
  { id: "civil-engineering", subjectId: "engineering", name: "Civil Engineering" },
  // Business & Management
  { id: "management-principles", subjectId: "business-management", name: "Management Principles" },
  { id: "marketing", subjectId: "business-management", name: "Marketing" },
  { id: "entrepreneurship", subjectId: "business-management", name: "Entrepreneurship" },
  // Finance & Investing
  { id: "personal-finance", subjectId: "finance-and-investing", name: "Personal Finance" },
  { id: "investing", subjectId: "finance-and-investing", name: "Investing" },
  { id: "corporate-finance", subjectId: "finance-and-investing", name: "Corporate Finance" },
  // Law
  { id: "types-of-law", subjectId: "law", name: "Types of Law" },
  { id: "legal-systems", subjectId: "law", name: "Legal Systems" },
  { id: "constitutional-law", subjectId: "law", name: "Constitutional Law" },
  // Religion & Mythology
  { id: "world-religions", subjectId: "religion-and-mythology", name: "World Religions" },
  { id: "mythology", subjectId: "religion-and-mythology", name: "Mythology" },
  { id: "comparative-religion", subjectId: "religion-and-mythology", name: "Comparative Religion" },
];

const concepts: Concept[] = [
  // Mathematics
  { id: "fractions", name: "Fractions", topicIds: ["arithmetic"] },
  { id: "percentages", name: "Percentages", topicIds: ["arithmetic"] },
  { id: "ratios-proportions", name: "Ratios & proportions", topicIds: ["arithmetic"] },
  { id: "linear-equations", name: "Linear equations", topicIds: ["algebra"] },
  { id: "quadratic-equations", name: "Quadratic equations", topicIds: ["algebra"] },
  { id: "polynomials", name: "Polynomials", topicIds: ["algebra"] },
  { id: "pythagorean-theorem", name: "Pythagorean theorem", topicIds: ["geometry"] },
  { id: "circles", name: "Circles", topicIds: ["geometry"] },
  { id: "triangle-congruence", name: "Triangle congruence", topicIds: ["geometry"] },
  { id: "limits", name: "Limits", topicIds: ["calculus"] },
  { id: "derivatives", name: "Derivatives", topicIds: ["calculus"] },
  { id: "integrals", name: "Integrals", topicIds: ["calculus"] },
  {
    id: "descriptive-statistics",
    name: "Descriptive statistics",
    topicIds: ["statistics-probability"],
  },
  // Shared across Mathematics and Science — one concept, two topics.
  {
    id: "probability",
    name: "Probability",
    topicIds: ["statistics-probability", "scientific-method"],
  },

  // Science
  { id: "newtons-laws", name: "Newton's laws of motion", topicIds: ["physics"] },
  { id: "energy-conservation", name: "Conservation of energy", topicIds: ["physics"] },
  { id: "electricity-basics", name: "Basics of electricity", topicIds: ["physics"] },
  { id: "periodic-table", name: "The periodic table", topicIds: ["chemistry"] },
  { id: "chemical-bonding", name: "Chemical bonding", topicIds: ["chemistry"] },
  { id: "acids-bases", name: "Acids & bases", topicIds: ["chemistry"] },
  { id: "cell-structure", name: "Cell structure", topicIds: ["biology"] },
  { id: "genetics-basics", name: "Basics of genetics", topicIds: ["biology"] },
  { id: "evolution", name: "Evolution by natural selection", topicIds: ["biology"] },
  { id: "hypothesis-testing", name: "Hypothesis testing", topicIds: ["scientific-method"] },
  { id: "experimental-design", name: "Experimental design", topicIds: ["scientific-method"] },

  // Computer Science
  {
    id: "variables-and-types",
    name: "Variables & data types",
    topicIds: ["programming-fundamentals"],
  },
  { id: "control-flow", name: "Control flow", topicIds: ["programming-fundamentals"] },
  { id: "functions-cs", name: "Functions", topicIds: ["programming-fundamentals"] },
  {
    id: "recursion",
    name: "Recursion",
    topicIds: ["programming-fundamentals", "data-structures-algorithms"],
  },
  { id: "arrays-and-lists", name: "Arrays & lists", topicIds: ["data-structures-algorithms"] },
  { id: "hash-tables", name: "Hash tables", topicIds: ["data-structures-algorithms"] },
  {
    id: "sorting-algorithms",
    name: "Sorting algorithms",
    topicIds: ["data-structures-algorithms"],
  },
  { id: "big-o-notation", name: "Big-O notation", topicIds: ["data-structures-algorithms"] },
  { id: "relational-databases", name: "Relational databases", topicIds: ["databases"] },
  { id: "sql-queries", name: "SQL queries", topicIds: ["databases"] },
  { id: "database-normalization", name: "Normalization", topicIds: ["databases"] },
  { id: "http-protocol", name: "The HTTP protocol", topicIds: ["web-development"] },
  { id: "html-css-basics", name: "HTML & CSS basics", topicIds: ["web-development"] },
  { id: "rest-apis", name: "REST APIs", topicIds: ["web-development"] },

  // History
  { id: "ancient-egypt", name: "Ancient Egypt", topicIds: ["ancient-history"] },
  { id: "roman-empire", name: "The Roman Empire", topicIds: ["ancient-history"] },
  { id: "ancient-greece", name: "Ancient Greece", topicIds: ["ancient-history"] },
  { id: "feudalism", name: "Feudalism", topicIds: ["medieval-history"] },
  { id: "the-crusades", name: "The Crusades", topicIds: ["medieval-history"] },
  { id: "black-death", name: "The Black Death", topicIds: ["medieval-history"] },
  { id: "industrial-revolution", name: "The Industrial Revolution", topicIds: ["modern-history"] },
  { id: "world-war-i", name: "World War I", topicIds: ["modern-history"] },
  { id: "world-war-ii", name: "World War II", topicIds: ["modern-history"] },

  // Geography
  { id: "plate-tectonics", name: "Plate tectonics", topicIds: ["physical-geography"] },
  { id: "climate-zones", name: "Climate zones", topicIds: ["physical-geography"] },
  { id: "the-water-cycle", name: "The water cycle", topicIds: ["physical-geography"] },
  { id: "urbanization", name: "Urbanization", topicIds: ["human-geography"] },
  { id: "population-distribution", name: "Population distribution", topicIds: ["human-geography"] },
  { id: "migration-patterns", name: "Migration patterns", topicIds: ["human-geography"] },
  { id: "map-projections", name: "Map projections", topicIds: ["cartography"] },
  { id: "latitude-longitude", name: "Latitude & longitude", topicIds: ["cartography"] },
  { id: "gis-basics", name: "GIS basics", topicIds: ["cartography"] },

  // Economics
  { id: "supply-and-demand", name: "Supply & demand", topicIds: ["microeconomics"] },
  { id: "price-elasticity", name: "Price elasticity", topicIds: ["microeconomics"] },
  { id: "market-structures", name: "Market structures", topicIds: ["microeconomics"] },
  { id: "gdp-and-growth", name: "GDP & economic growth", topicIds: ["macroeconomics"] },
  { id: "inflation", name: "Inflation", topicIds: ["macroeconomics"] },
  { id: "monetary-policy", name: "Monetary policy", topicIds: ["macroeconomics"] },
  { id: "fiscal-policy", name: "Fiscal policy", topicIds: ["macroeconomics"] },
  {
    id: "comparative-advantage",
    name: "Comparative advantage",
    topicIds: ["international-economics"],
  },
  { id: "exchange-rates", name: "Exchange rates", topicIds: ["international-economics"] },

  // World Politics
  { id: "democracy", name: "Democracy", topicIds: ["political-systems"] },
  { id: "authoritarianism", name: "Authoritarianism", topicIds: ["political-systems"] },
  { id: "federalism", name: "Federalism", topicIds: ["political-systems"] },
  { id: "united-nations", name: "The United Nations", topicIds: ["international-relations"] },
  { id: "diplomacy", name: "Diplomacy", topicIds: ["international-relations"] },
  { id: "geopolitics", name: "Geopolitics", topicIds: ["international-relations"] },
  { id: "globalization", name: "Globalization", topicIds: ["political-economy"] },
  { id: "trade-policy", name: "Trade policy", topicIds: ["political-economy"] },

  // Philosophy
  { id: "utilitarianism", name: "Utilitarianism", topicIds: ["ethics"] },
  { id: "deontology", name: "Deontology", topicIds: ["ethics"] },
  { id: "virtue-ethics", name: "Virtue ethics", topicIds: ["ethics"] },
  { id: "deductive-reasoning", name: "Deductive reasoning", topicIds: ["logic"] },
  { id: "logical-fallacies", name: "Logical fallacies", topicIds: ["logic"] },
  { id: "syllogisms", name: "Syllogisms", topicIds: ["logic"] },
  { id: "free-will-determinism", name: "Free will & determinism", topicIds: ["metaphysics"] },
  { id: "mind-body-problem", name: "The mind–body problem", topicIds: ["metaphysics"] },
  { id: "theories-of-knowledge", name: "Theories of knowledge", topicIds: ["epistemology"] },
  { id: "skepticism", name: "Skepticism", topicIds: ["epistemology"] },

  // Psychology
  { id: "memory-systems", name: "Memory systems", topicIds: ["cognitive-psychology"] },
  { id: "attention", name: "Attention", topicIds: ["cognitive-psychology"] },
  { id: "cognitive-biases", name: "Cognitive biases", topicIds: ["cognitive-psychology"] },
  {
    id: "piaget-stages",
    name: "Piaget's stages of development",
    topicIds: ["developmental-psychology"],
  },
  { id: "attachment-theory", name: "Attachment theory", topicIds: ["developmental-psychology"] },
  { id: "conformity", name: "Conformity", topicIds: ["social-psychology"] },
  { id: "cognitive-dissonance", name: "Cognitive dissonance", topicIds: ["social-psychology"] },
  { id: "group-dynamics", name: "Group dynamics", topicIds: ["social-psychology"] },

  // Sociology
  { id: "social-institutions", name: "Social institutions", topicIds: ["social-structures"] },
  { id: "social-stratification", name: "Social stratification", topicIds: ["social-structures"] },
  { id: "roles-and-norms", name: "Roles & norms", topicIds: ["social-structures"] },
  { id: "socialization", name: "Socialization", topicIds: ["culture-and-society"] },
  { id: "cultural-norms", name: "Cultural norms", topicIds: ["culture-and-society"] },
  { id: "subcultures", name: "Subcultures", topicIds: ["culture-and-society"] },
  { id: "social-movements", name: "Social movements", topicIds: ["social-change"] },
  { id: "modernization", name: "Modernization", topicIds: ["social-change"] },

  // Literature
  { id: "metaphor-simile", name: "Metaphor & simile", topicIds: ["literary-devices"] },
  { id: "symbolism", name: "Symbolism", topicIds: ["literary-devices"] },
  { id: "foreshadowing", name: "Foreshadowing", topicIds: ["literary-devices"] },
  { id: "poetry", name: "Poetry", topicIds: ["literary-genres"] },
  { id: "drama", name: "Drama", topicIds: ["literary-genres"] },
  { id: "the-novel", name: "The novel", topicIds: ["literary-genres"] },
  { id: "romanticism-literature", name: "Romanticism", topicIds: ["literary-movements"] },
  { id: "modernism-literature", name: "Modernism", topicIds: ["literary-movements"] },
  { id: "realism-literature", name: "Realism", topicIds: ["literary-movements"] },

  // Linguistics
  { id: "phonemes", name: "Phonemes", topicIds: ["phonetics-phonology"] },
  { id: "the-ipa", name: "The IPA", topicIds: ["phonetics-phonology"] },
  { id: "intonation", name: "Intonation", topicIds: ["phonetics-phonology"] },
  { id: "parts-of-speech", name: "Parts of speech", topicIds: ["syntax-grammar"] },
  { id: "sentence-structure", name: "Sentence structure", topicIds: ["syntax-grammar"] },
  { id: "morphology", name: "Morphology", topicIds: ["syntax-grammar"] },
  { id: "word-meaning", name: "Word meaning", topicIds: ["semantics"] },
  { id: "pragmatics", name: "Pragmatics", topicIds: ["semantics"] },
  { id: "language-change", name: "Language change", topicIds: ["semantics"] },

  // Music
  { id: "scales-and-keys", name: "Scales & keys", topicIds: ["music-theory"] },
  { id: "chords-and-harmony", name: "Chords & harmony", topicIds: ["music-theory"] },
  { id: "rhythm-and-meter", name: "Rhythm & meter", topicIds: ["music-theory"] },
  { id: "baroque-era", name: "The Baroque era", topicIds: ["music-history"] },
  { id: "classical-era", name: "The Classical era", topicIds: ["music-history"] },
  { id: "jazz-origins", name: "Origins of jazz", topicIds: ["music-history"] },
  { id: "string-instruments", name: "String instruments", topicIds: ["instruments"] },
  { id: "percussion-instruments", name: "Percussion instruments", topicIds: ["instruments"] },

  // Art & Design
  { id: "renaissance-art", name: "Renaissance art", topicIds: ["art-history"] },
  { id: "impressionism", name: "Impressionism", topicIds: ["art-history"] },
  { id: "modern-art", name: "Modern art", topicIds: ["art-history"] },
  { id: "color-theory", name: "Color theory", topicIds: ["visual-design-principles"] },
  { id: "composition-design", name: "Composition", topicIds: ["visual-design-principles"] },
  { id: "typography", name: "Typography", topicIds: ["visual-design-principles"] },
  { id: "perspective-drawing", name: "Perspective", topicIds: ["drawing-painting"] },
  { id: "shading-techniques", name: "Shading techniques", topicIds: ["drawing-painting"] },

  // Film & Media
  { id: "silent-era", name: "The silent era", topicIds: ["film-history"] },
  { id: "hollywood-golden-age", name: "Hollywood's golden age", topicIds: ["film-history"] },
  { id: "new-wave-cinema", name: "New wave cinema", topicIds: ["film-history"] },
  { id: "cinematography", name: "Cinematography", topicIds: ["film-techniques"] },
  { id: "film-editing", name: "Editing", topicIds: ["film-techniques"] },
  { id: "mise-en-scene", name: "Mise-en-scène", topicIds: ["film-techniques"] },
  { id: "mass-media", name: "Mass media", topicIds: ["media-studies"] },
  { id: "propaganda-persuasion", name: "Propaganda & persuasion", topicIds: ["media-studies"] },
  { id: "digital-media", name: "Digital media", topicIds: ["media-studies"] },

  // Astronomy
  { id: "the-planets", name: "The planets", topicIds: ["the-solar-system"] },
  { id: "moons-and-asteroids", name: "Moons & asteroids", topicIds: ["the-solar-system"] },
  { id: "the-sun", name: "The Sun", topicIds: ["the-solar-system"] },
  { id: "stellar-life-cycle", name: "Stellar life cycle", topicIds: ["stars-and-galaxies"] },
  { id: "black-holes", name: "Black holes", topicIds: ["stars-and-galaxies"] },
  { id: "the-milky-way", name: "The Milky Way", topicIds: ["stars-and-galaxies"] },
  { id: "the-big-bang", name: "The Big Bang", topicIds: ["cosmology"] },
  { id: "dark-matter-energy", name: "Dark matter & dark energy", topicIds: ["cosmology"] },
  { id: "expanding-universe", name: "The expanding universe", topicIds: ["cosmology"] },

  // Environmental Science
  { id: "ecosystems", name: "Ecosystems", topicIds: ["ecology"] },
  { id: "food-chains", name: "Food chains", topicIds: ["ecology"] },
  { id: "biodiversity", name: "Biodiversity", topicIds: ["ecology"] },
  { id: "climate-change", name: "Climate change", topicIds: ["climate-sustainability"] },
  { id: "renewable-energy", name: "Renewable energy", topicIds: ["climate-sustainability"] },
  { id: "carbon-cycle", name: "The carbon cycle", topicIds: ["climate-sustainability"] },
  { id: "water-resources", name: "Water resources", topicIds: ["natural-resources"] },
  { id: "deforestation", name: "Deforestation", topicIds: ["natural-resources"] },
  { id: "conservation", name: "Conservation", topicIds: ["natural-resources"] },

  // Health & Medicine
  { id: "circulatory-system", name: "The circulatory system", topicIds: ["human-anatomy"] },
  { id: "nervous-system", name: "The nervous system", topicIds: ["human-anatomy"] },
  { id: "digestive-system", name: "The digestive system", topicIds: ["human-anatomy"] },
  { id: "macronutrients", name: "Macronutrients", topicIds: ["nutrition"] },
  { id: "vitamins-minerals", name: "Vitamins & minerals", topicIds: ["nutrition"] },
  { id: "balanced-diet", name: "A balanced diet", topicIds: ["nutrition"] },
  { id: "the-immune-system", name: "The immune system", topicIds: ["disease-immunity"] },
  { id: "infectious-diseases", name: "Infectious diseases", topicIds: ["disease-immunity"] },
  { id: "vaccines", name: "Vaccines", topicIds: ["disease-immunity"] },

  // Sports & Fitness
  { id: "muscular-system", name: "The muscular system", topicIds: ["exercise-science"] },
  {
    id: "cardio-vs-strength",
    name: "Cardio vs. strength training",
    topicIds: ["exercise-science"],
  },
  { id: "recovery-and-rest", name: "Recovery & rest", topicIds: ["exercise-science"] },
  { id: "association-football", name: "Football (soccer)", topicIds: ["popular-sports"] },
  { id: "basketball", name: "Basketball", topicIds: ["popular-sports"] },
  { id: "track-and-field", name: "Track & field", topicIds: ["popular-sports"] },
  { id: "protein-and-muscle", name: "Protein & muscle", topicIds: ["fitness-nutrition"] },
  { id: "hydration", name: "Hydration", topicIds: ["fitness-nutrition"] },
  { id: "pre-workout-nutrition", name: "Pre-workout nutrition", topicIds: ["fitness-nutrition"] },

  // Engineering
  { id: "forces-and-motion", name: "Forces & motion", topicIds: ["mechanical-engineering"] },
  { id: "thermodynamics-eng", name: "Thermodynamics", topicIds: ["mechanical-engineering"] },
  {
    id: "machines-mechanisms",
    name: "Machines & mechanisms",
    topicIds: ["mechanical-engineering"],
  },
  { id: "electric-circuits", name: "Electric circuits", topicIds: ["electrical-engineering"] },
  { id: "ohms-law", name: "Ohm's law", topicIds: ["electrical-engineering"] },
  { id: "electronics-basics", name: "Electronics basics", topicIds: ["electrical-engineering"] },
  { id: "structural-loads", name: "Structural loads", topicIds: ["civil-engineering"] },
  { id: "strength-of-materials", name: "Strength of materials", topicIds: ["civil-engineering"] },
  { id: "bridges-and-structures", name: "Bridges & structures", topicIds: ["civil-engineering"] },

  // Business & Management
  { id: "leadership-styles", name: "Leadership styles", topicIds: ["management-principles"] },
  {
    id: "organizational-structure",
    name: "Organizational structure",
    topicIds: ["management-principles"],
  },
  { id: "decision-making", name: "Decision making", topicIds: ["management-principles"] },
  { id: "the-marketing-mix", name: "The marketing mix", topicIds: ["marketing"] },
  { id: "branding", name: "Branding", topicIds: ["marketing"] },
  { id: "market-segmentation", name: "Market segmentation", topicIds: ["marketing"] },
  { id: "business-models", name: "Business models", topicIds: ["entrepreneurship"] },
  { id: "startups-and-funding", name: "Startups & funding", topicIds: ["entrepreneurship"] },
  { id: "value-proposition", name: "Value proposition", topicIds: ["entrepreneurship"] },

  // Finance & Investing
  { id: "budgeting", name: "Budgeting", topicIds: ["personal-finance"] },
  { id: "compound-interest", name: "Compound interest", topicIds: ["personal-finance"] },
  { id: "credit-and-debt", name: "Credit & debt", topicIds: ["personal-finance"] },
  { id: "stocks-and-bonds", name: "Stocks & bonds", topicIds: ["investing"] },
  { id: "diversification", name: "Diversification", topicIds: ["investing"] },
  { id: "risk-and-return", name: "Risk & return", topicIds: ["investing"] },
  { id: "financial-statements", name: "Financial statements", topicIds: ["corporate-finance"] },
  { id: "valuation", name: "Valuation", topicIds: ["corporate-finance"] },
  { id: "capital-structure", name: "Capital structure", topicIds: ["corporate-finance"] },

  // Law
  { id: "criminal-law", name: "Criminal law", topicIds: ["types-of-law"] },
  { id: "civil-law", name: "Civil law", topicIds: ["types-of-law"] },
  { id: "contract-law", name: "Contract law", topicIds: ["types-of-law"] },
  { id: "common-law", name: "Common law", topicIds: ["legal-systems"] },
  { id: "civil-law-systems", name: "Civil-law systems", topicIds: ["legal-systems"] },
  { id: "international-law", name: "International law", topicIds: ["legal-systems"] },
  { id: "separation-of-powers", name: "Separation of powers", topicIds: ["constitutional-law"] },
  { id: "civil-rights", name: "Civil rights", topicIds: ["constitutional-law"] },
  { id: "judicial-review", name: "Judicial review", topicIds: ["constitutional-law"] },

  // Religion & Mythology
  { id: "christianity", name: "Christianity", topicIds: ["world-religions"] },
  { id: "islam", name: "Islam", topicIds: ["world-religions"] },
  { id: "hinduism", name: "Hinduism", topicIds: ["world-religions"] },
  { id: "buddhism", name: "Buddhism", topicIds: ["world-religions"] },
  { id: "greek-mythology", name: "Greek mythology", topicIds: ["mythology"] },
  { id: "norse-mythology", name: "Norse mythology", topicIds: ["mythology"] },
  { id: "egyptian-mythology", name: "Egyptian mythology", topicIds: ["mythology"] },
  { id: "rituals-and-practices", name: "Rituals & practices", topicIds: ["comparative-religion"] },
  { id: "creation-myths", name: "Creation myths", topicIds: ["comparative-religion"] },
];

export const SEED_TAXONOMY: TaxonomyInput = { subjects, topics, concepts };
