import axios from "axios";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { TicketStatus } from "@helpdesk/core/enums/ticket-status";
import { TicketCategory } from "@helpdesk/core/enums/ticket-category";
import { TicketPriority } from "@helpdesk/core/enums/ticket-priority";
import { ReplySenderType } from "@helpdesk/core/enums/reply-sender-type";
import {
  AI_ASSIGNEE,
  type AssignTicketInput,
  type UpdateTicketStatusInput,
  type UpdateTicketCategoryInput,
} from "@helpdesk/core/schemas/tickets";
import type { Ticket } from "@helpdesk/core/types/tickets";
import NavBar from "../components/NavBar";
import ReplyForm from "../components/ReplyForm";
import { Badge, priorityStyles, senderTypeStyles } from "../components/TicketBadge";
import { axiosErrorMessage } from "@/lib/axios-error";
import { Link } from "@/components/ui/link";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { ErrorMessage } from "@/components/ui/error-message";

type AssignableUser = { id: string; name: string };

type Reply = {
  id: string;
  body: string;
  senderType: ReplySenderType;
  createdAt: string;
  author: { id: string; name: string };
};

const senderTypeLabels: Record<ReplySenderType, string> = {
  AGENT: "Agent",
  CUSTOMER: "Customer",
};

// Shared by the Status/Category/Assigned-to selects so they can never drift
// apart in width — all three live in the same right-hand column.
const DETAIL_SELECT_CLASS = "w-full";

const statusLabels: Record<TicketStatus, string> = {
  OPEN: "Open",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const categoryLabels: Record<TicketCategory, string> = {
  TECHNICAL: "Technical",
  BILLING: "Billing",
  ACCOUNT: "Account",
  GENERAL: "General",
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: ticket, isError: error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const res = await axios.get(`/api/tickets/${id}`);
      return res.data as Ticket;
    },
  });

  const { data: assignableUsers } = useQuery({
    queryKey: ["users", "assignable"],
    queryFn: async () => {
      const res = await axios.get("/api/users/assignable");
      return res.data.users as AssignableUser[];
    },
  });

  const { data: replies } = useQuery({
    queryKey: ["ticket", id, "replies"],
    queryFn: async () => {
      const res = await axios.get(`/api/tickets/${id}/replies`);
      return res.data.replies as Reply[];
    },
  });

  const assignMutation = useMutation({
    mutationFn: (data: AssignTicketInput) => axios.patch(`/api/tickets/${id}/assign`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (data: UpdateTicketStatusInput) => axios.patch(`/api/tickets/${id}/status`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
  });

  const categoryMutation = useMutation({
    mutationFn: (data: UpdateTicketCategoryInput) =>
      axios.patch(`/api/tickets/${id}/category`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
  });

  const assignError = axiosErrorMessage(assignMutation.error);
  const statusError = axiosErrorMessage(statusMutation.error);
  const categoryError = axiosErrorMessage(categoryMutation.error);

  return (
    <>
      <NavBar />
      <main className="py-10 px-8 max-w-[900px] mx-auto">
        <Link to="/tickets" variant="nav" className="inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to tickets
        </Link>

        <ErrorMessage show={error}>Couldn't load this ticket. It may not exist.</ErrorMessage>

        {!error && ticket === undefined && <p className="mt-4 text-sm text-slate-500">Loading…</p>}

        {!error && ticket && (
          <div className="mt-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{ticket.subject}</h2>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {ticket.priority && (
                <Badge text={ticket.priority} className={priorityStyles[ticket.priority]} />
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[3fr_1fr]">
              <div>
                <p className="text-sm">
                  <span className="text-slate-500">From: </span>
                  <span className="text-slate-900">
                    {ticket.fromName
                      ? `${ticket.fromName} (${ticket.fromEmail})`
                      : ticket.fromEmail}
                  </span>
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  <p>
                    <span className="text-slate-500">Created: </span>
                    <span className="text-slate-900">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-500">Updated: </span>
                    <span className="text-slate-900">
                      {new Date(ticket.updatedAt).toLocaleString()}
                    </span>
                  </p>
                </div>

                <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Message</p>
                  <p className="text-sm text-slate-500">
                    From {ticket.fromName ?? ticket.fromEmail}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-900">{ticket.body}</p>
                </div>

                <div className="mt-4 space-y-3">
                  {replies?.map((reply) => (
                    <div key={reply.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{reply.author.name}</p>
                        <Badge
                          text={senderTypeLabels[reply.senderType]}
                          className={senderTypeStyles[reply.senderType]}
                        />
                      </div>
                      <p className="text-sm text-slate-500">
                        {new Date(reply.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-900">{reply.body}</p>
                    </div>
                  ))}
                </div>

                <ReplyForm ticketId={ticket.id} />
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    id="status"
                    className={DETAIL_SELECT_CLASS}
                    value={ticket.status}
                    disabled={statusMutation.isPending}
                    onChange={(e) =>
                      statusMutation.mutate({ status: e.target.value as TicketStatus })
                    }
                  >
                    {Object.values(TicketStatus).map((value) => (
                      <option key={value} value={value}>
                        {statusLabels[value]}
                      </option>
                    ))}
                  </Select>
                  <FieldError message={statusError} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    id="category"
                    className={DETAIL_SELECT_CLASS}
                    value={ticket.category ?? ""}
                    disabled={categoryMutation.isPending}
                    onChange={(e) =>
                      categoryMutation.mutate({ category: e.target.value as TicketCategory })
                    }
                  >
                    <option value="" disabled>
                      Not yet classified
                    </option>
                    {Object.values(TicketCategory).map((value) => (
                      <option key={value} value={value}>
                        {categoryLabels[value]}
                      </option>
                    ))}
                  </Select>
                  <FieldError message={categoryError} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="assignee">Assigned to</Label>
                  <Select
                    id="assignee"
                    className={DETAIL_SELECT_CLASS}
                    value={ticket.assignedToAI ? AI_ASSIGNEE : ticket.assignedTo?.id ?? ""}
                    disabled={assignMutation.isPending}
                    onChange={(e) => assignMutation.mutate({ assignedTo: e.target.value || null })}
                  >
                    <option value="">Unassigned</option>
                    <option value={AI_ASSIGNEE}>AI</option>
                    {assignableUsers?.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </Select>
                  <FieldError message={assignError} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
