import axios from "axios";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { TicketStatus } from "@helpdesk/core/enums/ticket-status";
import { TicketCategory } from "@helpdesk/core/enums/ticket-category";
import { TicketPriority } from "@helpdesk/core/enums/ticket-priority";
import type { AssignTicketInput } from "@helpdesk/core/schemas/tickets";
import NavBar from "../components/NavBar";
import { Badge, statusStyles, priorityStyles, categoryStyles } from "../components/TicketBadge";
import { Link } from "@/components/ui/link";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type TicketDetail = {
  id: string;
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string | null;
  status: TicketStatus;
  category: TicketCategory | null;
  priority: TicketPriority | null;
  assignedTo: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

type AssignableUser = { id: string; name: string };

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: ticket, isError: error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const res = await axios.get(`/api/tickets/${id}`);
      return res.data as TicketDetail;
    },
  });

  const { data: assignableUsers } = useQuery({
    queryKey: ["users", "assignable"],
    queryFn: async () => {
      const res = await axios.get("/api/users/assignable");
      return res.data.users as AssignableUser[];
    },
  });

  const assignMutation = useMutation({
    mutationFn: (data: AssignTicketInput) => axios.patch(`/api/tickets/${id}/assign`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
  });

  const assignError = axios.isAxiosError(assignMutation.error)
    ? (assignMutation.error.response?.data as { error?: string } | undefined)?.error
    : undefined;

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

            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
              <p className="text-sm">
                <span className="text-slate-500">From: </span>
                <span className="text-slate-900">
                  {ticket.fromName ? `${ticket.fromName} (${ticket.fromEmail})` : ticket.fromEmail}
                </span>
              </p>

              <div className="space-y-1 text-right">
                <div className="flex items-center gap-2">
                  <Label htmlFor="assignee" className="font-normal text-slate-500">
                    Assigned to:
                  </Label>
                  <Select
                    id="assignee"
                    className="h-9 w-44"
                    value={ticket.assignedTo?.id ?? ""}
                    disabled={assignMutation.isPending}
                    onChange={(e) =>
                      assignMutation.mutate({ assignedToId: e.target.value || null })
                    }
                  >
                    <option value="">Unassigned</option>
                    {assignableUsers?.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </Select>
                </div>
                {assignError && <p className="text-sm text-destructive">{assignError}</p>}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-4 text-sm">
              <p>
                <span className="text-slate-500">Created: </span>
                <span className="text-slate-900">{new Date(ticket.createdAt).toLocaleString()}</span>
              </p>
              <p>
                <span className="text-slate-500">Updated: </span>
                <span className="text-slate-900">{new Date(ticket.updatedAt).toLocaleString()}</span>
              </p>
            </div>

            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Message</p>
              <p className="text-sm text-slate-500">
                From {ticket.fromName ?? ticket.fromEmail}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-900">{ticket.body}</p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
