import type { Domain } from "@/types/learning";

/**
 * Predefined learning domains shown on the home page (FEATURES.md #1).
 * This is the single source of truth reused by the UI now and by the
 * database seed later. `icon` names map to lucide-react icons.
 */
export const DOMAINS: Domain[] = [
  {
    id: "mathematics",
    slug: "mathematics",
    name: "Mathematics",
    description: "Arithmetic, algebra, geometry, calculus, and beyond.",
    icon: "Sigma",
  },
  {
    id: "science",
    slug: "science",
    name: "Science",
    description: "Physics, chemistry, biology, and the scientific method.",
    icon: "FlaskConical",
  },
  {
    id: "history",
    slug: "history",
    name: "History",
    description: "Civilisations, turning points, and the people who shaped them.",
    icon: "Landmark",
  },
  {
    id: "world-politics",
    slug: "world-politics",
    name: "World Politics",
    description: "Governments, institutions, and global affairs.",
    icon: "Globe2",
  },
  {
    id: "music",
    slug: "music",
    name: "Music",
    description: "Theory, history, instruments, and how sound works.",
    icon: "Music2",
  },
];
