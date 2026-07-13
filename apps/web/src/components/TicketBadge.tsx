import { TicketStatus } from "@helpdesk/core/enums/ticket-status";
import { TicketCategory } from "@helpdesk/core/enums/ticket-category";
import { TicketPriority } from "@helpdesk/core/enums/ticket-priority";
import { ReplySenderType } from "@helpdesk/core/enums/reply-sender-type";

export const statusStyles: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: "bg-blue-50 text-blue-600",
  [TicketStatus.RESOLVED]: "bg-green-50 text-green-600",
  [TicketStatus.CLOSED]: "bg-slate-100 text-slate-600",
};

export const priorityStyles: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: "bg-slate-100 text-slate-600",
  [TicketPriority.MEDIUM]: "bg-yellow-50 text-yellow-700",
  [TicketPriority.HIGH]: "bg-orange-50 text-orange-600",
  [TicketPriority.URGENT]: "bg-red-50 text-red-600",
};

export const categoryStyles: Record<TicketCategory, string> = {
  [TicketCategory.TECHNICAL]: "bg-purple-50 text-purple-600",
  [TicketCategory.BILLING]: "bg-emerald-50 text-emerald-600",
  [TicketCategory.ACCOUNT]: "bg-sky-50 text-sky-600",
  [TicketCategory.GENERAL]: "bg-slate-100 text-slate-600",
};

export const senderTypeStyles: Record<ReplySenderType, string> = {
  [ReplySenderType.AGENT]: "bg-indigo-50 text-indigo-600",
  [ReplySenderType.CUSTOMER]: "bg-slate-100 text-slate-600",
};

export function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {text}
    </span>
  );
}
