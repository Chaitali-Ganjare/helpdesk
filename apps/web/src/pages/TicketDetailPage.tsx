import axios from "axios";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { TicketStatus } from "@helpdesk/core/enums/ticket-status";
import { TicketCategory } from "@helpdesk/core/enums/ticket-category";
import { TicketPriority } from "@helpdesk/core/enums/ticket-priority";
import NavBar from "../components/NavBar";
import { Badge, statusStyles, priorityStyles, categoryStyles } from "../components/TicketBadge";
import { Link } from "@/components/ui/link";

type TicketDetail = {
  id: string;
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string | null;
  status: TicketStatus;
  category: TicketCategory | null;
  priority: TicketPriority | null;
  createdAt: string;
  updatedAt: string;
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: ticket, isError: error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const res = await axios.get(`/api/tickets/${id}`);
      return res.data as TicketDetail;
    },
  });

  return (
    <>
      <NavBar />
      <main className="py-10 px-8 max-w-[900px] mx-auto">
        <Link to="/tickets" variant="nav" className="inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to tickets
        </Link>

        {error && (
          <p className="mt-4 text-sm text-destructive">
            Couldn't load this ticket. It may not exist.
          </p>
        )}

        {!error && ticket === undefined && <p className="mt-4 text-sm text-slate-500">Loading…</p>}

        {!error && ticket && (
          <div className="mt-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{ticket.subject}</h2>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge text={ticket.status} className={statusStyles[ticket.status]} />
              {ticket.category && (
                <Badge text={ticket.category} className={categoryStyles[ticket.category]} />
              )}
              {ticket.priority && (
                <Badge text={ticket.priority} className={priorityStyles[ticket.priority]} />
              )}
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">From</dt>
              <dd className="text-slate-900">
                {ticket.fromName ? `${ticket.fromName} <${ticket.fromEmail}>` : ticket.fromEmail}
              </dd>
              <dt className="text-slate-500">Received</dt>
              <dd className="text-slate-900">{new Date(ticket.createdAt).toLocaleString()}</dd>
            </dl>

            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 whitespace-pre-wrap text-sm text-slate-900">
              {ticket.body}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
