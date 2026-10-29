import {
  BookOpen,
  BookText,
  Brain,
  Briefcase,
  Church,
  Clapperboard,
  Code2,
  Cog,
  Dumbbell,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  Leaf,
  LineChart,
  Map as MapIcon,
  Music2,
  Palette,
  PiggyBank,
  Scale,
  ScrollText,
  Sigma,
  Stethoscope,
  Telescope,
  Users,
  type LucideIcon,
} from "lucide-react";
import { DOMAINS } from "@/lib/domains";

/** Lucide components keyed by the `icon` name used in `DOMAINS`. */
const BY_NAME: Record<string, LucideIcon> = {
  BookText,
  Brain,
  Briefcase,
  Church,
  Clapperboard,
  Code2,
  Cog,
  Dumbbell,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  Leaf,
  LineChart,
  Map: MapIcon,
  Music2,
  Palette,
  PiggyBank,
  Scale,
  ScrollText,
  Sigma,
  Stethoscope,
  Telescope,
  Users,
};

const BY_SLUG = new Map(DOMAINS.map((d) => [d.slug, d.icon]));

/** The icon for a subject slug, falling back to a generic book. */
export function subjectIcon(slug: string): LucideIcon {
  const name = BY_SLUG.get(slug);
  return (name && BY_NAME[name]) || BookOpen;
}
