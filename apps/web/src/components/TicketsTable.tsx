import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { TicketStatus } from "@helpdesk/core/enums/ticket-status";
import { TicketCategory } from "@helpdesk/core/enums/ticket-category";
import { TicketPriority } from "@helpdesk/core/enums/ticket-priority";
import { Skeleton } from "@/components/ui/skeleton";

export type Ticket = {
  id: string;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  status: TicketStatus;
  category: TicketCategory | null;
  priority: TicketPriority | null;
  createdAt: string;
};

const statusStyles: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: "bg-blue-50 text-blue-600",
  [TicketStatus.RESOLVED]: "bg-green-50 text-green-600",
  [TicketStatus.CLOSED]: "bg-slate-100 text-slate-600",
};

const priorityStyles: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: "bg-slate-100 text-slate-600",
  [TicketPriority.MEDIUM]: "bg-yellow-50 text-yellow-700",
  [TicketPriority.HIGH]: "bg-orange-50 text-orange-600",
  [TicketPriority.URGENT]: "bg-red-50 text-red-600",
};

const categoryStyles: Record<TicketCategory, string> = {
  [TicketCategory.TECHNICAL]: "bg-purple-50 text-purple-600",
  [TicketCategory.BILLING]: "bg-emerald-50 text-emerald-600",
  [TicketCategory.ACCOUNT]: "bg-sky-50 text-sky-600",
  [TicketCategory.GENERAL]: "bg-slate-100 text-slate-600",
};

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {text}
    </span>
  );
}

const columnHelper = createColumnHelper<Ticket>();

const columns = [
  columnHelper.accessor("subject", {
    id: "subject",
    header: "Subject",
    cell: (info) => <span className="font-medium text-slate-900">{info.getValue()}</span>,
  }),
  columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    cell: (info) => {
      const status = info.getValue();
      return <Badge text={status} className={statusStyles[status]} />;
    },
  }),
  columnHelper.accessor("category", {
    id: "category",
    header: "Category",
    cell: (info) => {
      const category = info.getValue();
      return category ? (
        <Badge text={category} className={categoryStyles[category]} />
      ) : (
        <span className="text-slate-400">—</span>
      );
    },
  }),
  columnHelper.accessor("priority", {
    id: "priority",
    header: "Priority",
    cell: (info) => {
      const priority = info.getValue();
      return priority ? (
        <Badge text={priority} className={priorityStyles[priority]} />
      ) : (
        <span className="text-slate-400">—</span>
      );
    },
  }),
  columnHelper.accessor("fromEmail", {
    id: "fromEmail",
    header: "Sender",
    cell: (info) => {
      const ticket = info.row.original;
      return (
        <span className="text-slate-500">
          {ticket.fromName ? (
            <>
              <div className="text-slate-900">{ticket.fromName}</div>
              <div className="text-xs">{ticket.fromEmail}</div>
            </>
          ) : (
            ticket.fromEmail
          )}
        </span>
      );
    },
  }),
  columnHelper.accessor("createdAt", {
    id: "createdAt",
    header: "Date",
    cell: (info) => (
      <span className="text-slate-500">{new Date(info.getValue()).toLocaleString()}</span>
    ),
  }),
];

export default function TicketsTable({
  tickets,
  sorting,
  onSortingChange,
  hasActiveFilters = false,
}: {
  tickets: Ticket[] | undefined;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  hasActiveFilters?: boolean;
}) {
  const table = useReactTable({
    data: tickets ?? [],
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
    enableSortingRemoval: false,
    sortDescFirst: false,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-3 font-medium">
                  {header.column.getCanSort() ? (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-1"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" && <ChevronUp className="h-3.5 w-3.5" />}
                      {header.column.getIsSorted() === "desc" && (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      {!header.column.getIsSorted() && (
                        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tickets === undefined &&
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-48" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-20 rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-40" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-32" />
                </td>
              </tr>
            ))}
          {tickets !== undefined &&
            table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>

      {tickets?.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-slate-500">
          {hasActiveFilters ? "No tickets match the selected filters." : "No tickets yet."}
        </p>
      )}
    </div>
  );
}
