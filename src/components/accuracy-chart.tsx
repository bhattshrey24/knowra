"use client";

import { useMemo, useRef, useState } from "react";
import { accuracyTimeline, type AccuracyPoint, type AttemptLike } from "@/lib/learning/analytics";

const W = 600;
const H = 200;
const PAD = { t: 12, r: 12, b: 24, l: 34 };
const plotW = W - PAD.l - PAD.r;
const plotH = H - PAD.t - PAD.b;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function x(i: number, n: number) {
  return n <= 1 ? PAD.l + plotW / 2 : PAD.l + (i / (n - 1)) * plotW;
}
const y = (acc: number) => PAD.t + (1 - acc) * plotH;

export interface SubjectFilterOption {
  slug: string;
  name: string;
}

/**
 * Per-attempt accuracy over time with optional per-subject filtering (Phase 7.7).
 * One brand-hued series (so no legend and no categorical palette to validate);
 * recessive grid/axes; hover crosshair + tooltip; accessible data table fallback.
 */
export function AccuracyChart({
  points: initialPoints,
  attempts,
  subjects,
}: {
  points: AccuracyPoint[];
  attempts?: AttemptLike[];
  subjects?: SubjectFilterOption[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  const points = useMemo(() => {
    if (!attempts || selectedSubject === "all") {
      return initialPoints;
    }
    return accuracyTimeline(attempts, selectedSubject);
  }, [initialPoints, attempts, selectedSubject]);

  const n = points.length;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i, n)} ${y(p.accuracy)}`)
    .join(" ");
  const areaPath =
    n > 0 ? `${linePath} L ${x(n - 1, n)} ${PAD.t + plotH} L ${x(0, n)} ${PAD.t + plotH} Z` : "";

  function onMove(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const frac = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(frac * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, idx)));
  }

  const latest = points[n - 1];

  return (
    <figure className="space-y-3">
      {subjects && subjects.length > 1 && (
        <div className="flex items-center justify-between pb-1 text-xs">
          <span className="text-muted-foreground font-medium">Filter by subject:</span>
          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setHover(null);
            }}
            aria-label="Filter accuracy chart by subject"
            className="bg-background border-input focus-visible:ring-ring rounded-md border px-2.5 py-1 text-xs outline-none focus-visible:ring-1"
          >
            <option value="all">All subjects</option>
            {subjects.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {n < 2 ? (
        <div className="text-muted-foreground flex h-36 items-center justify-center rounded-lg border border-dashed text-xs">
          {n === 1
            ? `Only 1 quiz taken in this subject so far (${Math.round(points[0].accuracy * 100)}% accuracy). Take another to see trend lines.`
            : "No quizzes taken in this subject yet."}
        </div>
      ) : (
        <div
          ref={ref}
          className="relative"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-48 w-full"
            style={{ color: "var(--chart-1)" }}
            role="img"
            aria-label={`Accuracy over ${n} quizzes, most recent ${latest ? Math.round(latest.accuracy * 100) : 0}%`}
          >
            {[0, 0.5, 1].map((g) => (
              <g key={g}>
                <line
                  x1={PAD.l}
                  x2={W - PAD.r}
                  y1={y(g)}
                  y2={y(g)}
                  className="stroke-border"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={PAD.l - 6}
                  y={y(g) + 3}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px]"
                >
                  {g * 100}%
                </text>
              </g>
            ))}

            {areaPath && <path d={areaPath} fill="currentColor" fillOpacity={0.12} />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {latest && (
              <circle cx={x(n - 1, n)} cy={y(latest.accuracy)} r={4} fill="currentColor" />
            )}

            {hover !== null && points[hover] && (
              <g>
                <line
                  x1={x(hover, n)}
                  x2={x(hover, n)}
                  y1={PAD.t}
                  y2={PAD.t + plotH}
                  className="stroke-muted-foreground"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx={x(hover, n)} cy={y(points[hover].accuracy)} r={4} fill="currentColor" />
              </g>
            )}
          </svg>

          {hover !== null && points[hover] && (
            <div
              className="bg-popover text-popover-foreground pointer-events-none absolute top-0 rounded-md border px-2 py-1 text-xs shadow-sm"
              style={{ left: `${(x(hover, n) / W) * 100}%`, transform: "translateX(-50%)" }}
            >
              <div className="font-medium">{Math.round(points[hover].accuracy * 100)}%</div>
              <div className="text-muted-foreground">{fmtDate(points[hover].createdAt)}</div>
            </div>
          )}
        </div>
      )}

      {n >= 2 && (
        <details className="text-muted-foreground text-xs">
          <summary className="cursor-pointer">Show data</summary>
          <table className="mt-2 w-full">
            <thead>
              <tr className="text-left">
                <th className="font-medium">Quiz</th>
                <th className="font-medium">Date</th>
                <th className="font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.index}>
                  <td>{p.index + 1}</td>
                  <td>{fmtDate(p.createdAt)}</td>
                  <td>{Math.round(p.accuracy * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  );
}
