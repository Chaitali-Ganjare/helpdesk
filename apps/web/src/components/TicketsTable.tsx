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

export default function TicketsTable({ tickets }: { tickets: Ticket[] | undefined }) {
  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Subject</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Priority</th>
            <th className="px-4 py-3 font-medium">Sender</th>
            <th className="px-4 py-3 font-medium">Date</th>
          </tr>
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
          {tickets?.map((ticket) => (
            <tr key={ticket.id}>
              <td className="px-4 py-3 font-medium text-slate-900">{ticket.subject}</td>
              <td className="px-4 py-3">
                <Badge text={ticket.status} className={statusStyles[ticket.status]} />
              </td>
              <td className="px-4 py-3">
                {ticket.category ? (
                  <Badge text={ticket.category} className={categoryStyles[ticket.category]} />
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {ticket.priority ? (
                  <Badge text={ticket.priority} className={priorityStyles[ticket.priority]} />
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-500">
                {ticket.fromName ? (
                  <>
                    <div className="text-slate-900">{ticket.fromName}</div>
                    <div className="text-xs">{ticket.fromEmail}</div>
                  </>
                ) : (
                  ticket.fromEmail
                )}
              </td>
              <td className="px-4 py-3 text-slate-500">
                {new Date(ticket.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {tickets?.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-slate-500">No tickets yet.</p>
      )}
    </div>
  );
}
