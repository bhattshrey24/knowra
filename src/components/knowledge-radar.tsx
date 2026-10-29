import { Compass } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface RadarSubject {
  name: string;
  mastery: number; // 0..1
}

export function KnowledgeRadar({ subjects }: { subjects: RadarSubject[] }) {
  // Only display radar if there are at least 3 subjects for a proper polygon
  if (subjects.length < 3) return null;

  const size = 260;
  const center = size / 2;
  const radius = center - 42;
  const total = subjects.length;

  const angleStep = (Math.PI * 2) / total;

  // Grid levels (25%, 50%, 75%, 100%)
  const levels = [0.25, 0.5, 0.75, 1.0];

  const points = subjects.map((s, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = radius * Math.max(0.08, Math.min(1, s.mastery));
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, name: s.name, mastery: s.mastery, angle };
  });

  const polygonPoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Compass className="text-primary size-4" />
          Knowledge balance radar
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          A bird&apos;s-eye view of your mastery balance across active subjects.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-2">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full max-w-[280px] overflow-visible"
          aria-label="Knowledge radar chart"
        >
          {/* Concentric grid rings */}
          {levels.map((lvl) => (
            <circle
              key={lvl}
              cx={center}
              cy={center}
              r={radius * lvl}
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeDasharray={lvl < 1.0 ? "2,2" : undefined}
              strokeWidth={1}
            />
          ))}

          {/* Axes from center to each subject */}
          {points.map((p, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="currentColor"
                className="text-border"
                strokeWidth={1}
              />
            );
          })}

          {/* Value polygon */}
          <polygon
            points={polygonPoints}
            className="fill-primary/20 stroke-primary"
            strokeWidth={2}
          />

          {/* Data point markers & labels */}
          {points.map((p, i) => {
            const labelDist = radius + 22;
            const lx = center + labelDist * Math.cos(p.angle);
            const ly = center + labelDist * Math.sin(p.angle);

            return (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  className="fill-primary stroke-background"
                  strokeWidth={1.5}
                />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-foreground text-[10px] font-medium"
                >
                  {p.name.length > 10 ? `${p.name.slice(0, 9)}…` : p.name}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}

