import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type DayCount = { date: string; count: number };

const CHART_WIDTH = 760;
const CHART_HEIGHT = 200;
const PLOT_LEFT = 30;
const PLOT_BOTTOM = 22;
const MAX_BAR_WIDTH = 24;
const BAR_GAP = 2;

// Rounds up to a friendly axis max (…, 1, 2, 5, 10, 20, 50, 100, …) so
// gridlines land on clean numbers instead of the raw data max.
function niceMax(value: number) {
  if (value <= 0) return 4;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const residual = value / magnitude;
  const niceResidual = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1;
  return niceResidual * magnitude;
}

function formatDateLabel(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function TicketsPerDayChart({ data }: { data: DayCount[] | undefined }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900">
            Tickets per Day
          </CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </div>
        {data && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="text-[13px] font-medium text-indigo-600 hover:underline"
          >
            {showTable ? "Show chart" : "Show table"}
          </button>
        )}
      </CardHeader>
      <CardContent>
        {!data && <Skeleton className="h-[200px] w-full" />}

        {data && showTable && (
          <div className="max-h-[220px] overflow-y-auto rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Tickets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((d) => (
                  <tr key={d.date}>
                    <td className="px-3 py-1.5 text-slate-900">{formatDateLabel(d.date)}</td>
                    <td className="px-3 py-1.5 text-slate-900">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && !showTable && (
          <TicketsPerDayBars data={data} hovered={hovered} onHover={setHovered} />
        )}
      </CardContent>
    </Card>
  );
}

function TicketsPerDayBars({
  data,
  hovered,
  onHover,
}: {
  data: DayCount[];
  hovered: number | null;
  onHover: (i: number | null) => void;
}) {
  const max = niceMax(Math.max(...data.map((d) => d.count)));
  const plotWidth = CHART_WIDTH - PLOT_LEFT;
  const plotHeight = CHART_HEIGHT - PLOT_BOTTOM;
  const bandWidth = plotWidth / data.length;
  const barWidth = Math.min(MAX_BAR_WIDTH, bandWidth - BAR_GAP);
  const yTicks = [0, max / 2, max];
  const labelEvery = Math.ceil(data.length / 6);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Tickets created per day, ${formatDateLabel(data[0]!.date)} through ${formatDateLabel(data[data.length - 1]!.date)}`}
      >
        {yTicks.map((tick) => {
          const y = plotHeight - (tick / max) * plotHeight;
          return (
            <g key={tick}>
              <line
                x1={PLOT_LEFT}
                x2={CHART_WIDTH}
                y1={y}
                y2={y}
                className="stroke-slate-200"
                strokeWidth={1}
              />
              <text
                x={PLOT_LEFT - 6}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                className="fill-slate-400"
              >
                {Math.round(tick)}
              </text>
            </g>
          );
        })}

        <line
          x1={PLOT_LEFT}
          x2={CHART_WIDTH}
          y1={plotHeight}
          y2={plotHeight}
          className="stroke-slate-300"
          strokeWidth={1}
        />

        {data.map((d, i) => {
          const barHeight = (d.count / max) * plotHeight;
          const bandX = PLOT_LEFT + i * bandWidth;
          const barX = bandX + (bandWidth - barWidth) / 2;
          const barY = plotHeight - barHeight;
          const label = `${formatDateLabel(d.date)}: ${d.count} ticket${d.count === 1 ? "" : "s"}`;

          return (
            <g key={d.date}>
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={Math.max(barHeight, 0)}
                rx={4}
                className="fill-indigo-600"
                opacity={hovered === i ? 0.8 : 1}
              />
              {/* Transparent full-height hit target — bigger than the bar itself,
                  so short/zero-count bars are still easy to hover or focus. */}
              <rect
                x={bandX}
                y={0}
                width={bandWidth}
                height={plotHeight}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={label}
                onMouseEnter={() => onHover(i)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(i)}
                onBlur={() => onHover(null)}
              >
                <title>{label}</title>
              </rect>
            </g>
          );
        })}

        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text
              key={d.date}
              x={PLOT_LEFT + i * bandWidth + bandWidth / 2}
              y={CHART_HEIGHT - 4}
              textAnchor="middle"
              fontSize={10}
              className="fill-slate-400"
            >
              {formatDateLabel(d.date)}
            </text>
          ) : null
        )}
      </svg>

      {hovered !== null && (
        <div
          className="pointer-events-none absolute rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm"
          style={{
            left: `${((PLOT_LEFT + hovered * bandWidth + bandWidth / 2) / CHART_WIDTH) * 100}%`,
            top: 0,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-semibold text-slate-900">
            {data[hovered]!.count} ticket{data[hovered]!.count === 1 ? "" : "s"}
          </p>
          <p className="text-slate-500">{formatDateLabel(data[hovered]!.date)}</p>
        </div>
      )}
    </div>
  );
}
