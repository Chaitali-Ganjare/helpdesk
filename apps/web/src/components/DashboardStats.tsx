import type { DashboardStats as DashboardStatsData } from "@helpdesk/core/types/dashboard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "—";
  if (minutes < 60) return `${Math.round(minutes)}m`;

  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;

  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}

function formatPercent(percent: number | null) {
  if (percent === null) return "—";
  return `${percent.toFixed(1)}%`;
}

type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton({ label }: { label: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

const STAT_LABELS = [
  "Total Tickets",
  "Open Tickets",
  "Resolved by AI",
  "AI Resolution Rate",
  "Avg. Resolution Time",
] as const;

export default function DashboardStats({ stats }: { stats: DashboardStatsData | undefined }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_LABELS.map((label) => (
          <StatCardSkeleton key={label} label={label} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Total Tickets" value={String(stats.total)} />
      <StatCard label="Open Tickets" value={String(stats.open)} />
      <StatCard label="Resolved by AI" value={String(stats.aiResolved)} />
      <StatCard label="AI Resolution Rate" value={formatPercent(stats.aiResolvedPercent)} />
      <StatCard label="Avg. Resolution Time" value={formatMinutes(stats.avgResolutionMinutes)} />
    </div>
  );
}
