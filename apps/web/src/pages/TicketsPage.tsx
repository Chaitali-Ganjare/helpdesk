import { useEffect, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { TicketStatus } from "@helpdesk/core/enums/ticket-status";
import { TicketCategory } from "@helpdesk/core/enums/ticket-category";
import { TicketPriority } from "@helpdesk/core/enums/ticket-priority";
import NavBar from "../components/NavBar";
import TicketsTable, { type Ticket } from "../components/TicketsTable";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const sortField = sorting[0]?.id ?? "createdAt";
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";

  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const hasActiveFilters = status !== "" || category !== "" || priority !== "" || search !== "";

  const { data: tickets, isError: error } = useQuery({
    queryKey: ["tickets", { sort: sortField, order: sortOrder, status, category, priority, search }],
    queryFn: async () => {
      const res = await axios.get("/api/tickets", {
        params: {
          sort: sortField,
          order: sortOrder,
          ...(status && { status }),
          ...(category && { category }),
          ...(priority && { priority }),
          ...(search && { search }),
        },
      });
      return res.data.tickets as Ticket[];
    },
  });

  return (
    <>
      <NavBar />
      <main className="py-10 px-8 max-w-[1100px] mx-auto">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Tickets</h2>

        <div className="mt-4 flex items-center gap-3">
          <Input
            type="search"
            placeholder="Search subject or sender…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 w-64"
            aria-label="Search tickets"
          />

          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 w-auto"
          >
            <option value="">All statuses</option>
            {Object.values(TicketStatus).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 w-auto"
          >
            <option value="">All categories</option>
            {Object.values(TicketCategory).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="h-9 w-auto"
          >
            <option value="">All priorities</option>
            {Object.values(TicketPriority).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>

        {error && (
          <p className="mt-4 text-sm text-destructive">
            Couldn't load tickets. Try refreshing the page.
          </p>
        )}

        {!error && tickets === undefined && (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        )}

        {!error && (
          <TicketsTable
            tickets={tickets}
            sorting={sorting}
            onSortingChange={setSorting}
            hasActiveFilters={hasActiveFilters}
          />
        )}
      </main>
    </>
  );
}
