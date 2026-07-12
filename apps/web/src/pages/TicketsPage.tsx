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
import { Button } from "@/components/ui/button";

type TicketsResponse = {
  tickets: Ticket[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

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

  const [page, setPage] = useState(1);
  // Any change to sort/filter/search invalidates the current page — reset
  // to page 1 so the user isn't left staring at an empty "page 3 of 1".
  useEffect(() => {
    setPage(1);
  }, [sortField, sortOrder, status, category, priority, search]);

  const { data, isError: error } = useQuery({
    queryKey: [
      "tickets",
      { sort: sortField, order: sortOrder, status, category, priority, search, page },
    ],
    queryFn: async () => {
      const res = await axios.get("/api/tickets", {
        params: {
          sort: sortField,
          order: sortOrder,
          ...(status && { status }),
          ...(category && { category }),
          ...(priority && { priority }),
          ...(search && { search }),
          page,
        },
      });
      return res.data as TicketsResponse;
    },
  });

  const tickets = data?.tickets;
  const pagination = data?.pagination;

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

        {!error && pagination && pagination.total > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
