import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import NavBar from "../components/NavBar";
import TicketsTable, { type Ticket } from "../components/TicketsTable";

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const sortField = sorting[0]?.id ?? "createdAt";
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";

  const { data: tickets, isError: error } = useQuery({
    queryKey: ["tickets", { sort: sortField, order: sortOrder }],
    queryFn: async () => {
      const res = await axios.get("/api/tickets", {
        params: { sort: sortField, order: sortOrder },
      });
      return res.data.tickets as Ticket[];
    },
  });

  return (
    <>
      <NavBar />
      <main className="py-10 px-8 max-w-[1100px] mx-auto">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Tickets</h2>

        {error && (
          <p className="mt-4 text-sm text-destructive">
            Couldn't load tickets. Try refreshing the page.
          </p>
        )}

        {!error && tickets === undefined && (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        )}

        {!error && (
          <TicketsTable tickets={tickets} sorting={sorting} onSortingChange={setSorting} />
        )}
      </main>
    </>
  );
}
