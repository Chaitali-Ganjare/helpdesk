import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import type { DashboardStats as DashboardStatsData } from "@helpdesk/core/types/dashboard";
import NavBar from "../components/NavBar";
import DashboardStats from "../components/DashboardStats";
import TicketsPerDayChart from "../components/TicketsPerDayChart";
import { authClient } from "../lib/auth-client";
import { ErrorMessage } from "@/components/ui/error-message";

export default function HomePage() {
  const { data: session } = authClient.useSession();

  const { data: stats, isError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await axios.get("/api/dashboard/stats");
      return res.data as DashboardStatsData;
    },
  });

  return (
    <>
      <NavBar />
      <main className="py-10 px-8 max-w-[1100px] mx-auto">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
        <p className="mt-1.5 text-[15px] text-slate-500">
          Welcome back, {session?.user.name}.
        </p>

        <ErrorMessage show={isError}>
          Couldn't load dashboard stats. Try refreshing the page.
        </ErrorMessage>

        {!isError && (
          <div className="mt-6 space-y-6">
            <DashboardStats stats={stats} />
            <TicketsPerDayChart data={stats?.ticketsPerDay} />
          </div>
        )}
      </main>
    </>
  );
}
