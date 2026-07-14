import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import { TicketStatus } from "@helpdesk/core/enums/ticket-status";
import { TicketCategory } from "@helpdesk/core/enums/ticket-category";
import { TicketPriority } from "@helpdesk/core/enums/ticket-priority";
import { renderWithQuery } from "../test/render-with-query";
import TicketDetailPage from "./TicketDetailPage";

vi.mock("axios");

vi.mock("../lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false }),
    signOut: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const baseTicket = {
  id: "1",
  subject: "Cannot log in",
  body: "I keep getting an invalid password error.",
  fromEmail: "jane@example.com",
  fromName: "Jane Doe",
  status: TicketStatus.OPEN,
  category: TicketCategory.ACCOUNT,
  priority: TicketPriority.HIGH,
  assignedTo: null,
  assignedToAI: false,
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const assignableUsers = [
  { id: "agent-1", name: "Alex Agent" },
  { id: "agent-2", name: "Sam Support" },
];

function mockGetResponses(ticket: unknown, replies: unknown[] = []) {
  vi.mocked(axios.get).mockImplementation((url: string) => {
    if (url === "/api/users/assignable") {
      return Promise.resolve({ data: { users: assignableUsers } });
    }
    if (url.endsWith("/replies")) {
      return Promise.resolve({ data: { replies } });
    }
    return Promise.resolve({ data: ticket });
  });
}

function renderDetailPage(id = "1") {
  return renderWithQuery(
    <MemoryRouter initialEntries={[`/tickets/${id}`]}>
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("TicketDetailPage", () => {
  it("renders the fetched ticket's details", async () => {
    mockGetResponses(baseTicket);

    renderDetailPage("1");

    expect(await screen.findByText("Cannot log in")).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith("/api/tickets/1");
    expect(screen.getByText("I keep getting an invalid password error.")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe (jane@example.com)")).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toHaveValue(TicketStatus.OPEN);
    expect(screen.getByLabelText(/category/i)).toHaveValue(TicketCategory.ACCOUNT);
    expect(screen.getByText(TicketPriority.HIGH)).toBeInTheDocument();
  });

  it("shows an error message when the ticket fails to load", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("Not found"));

    renderDetailPage("missing");

    expect(await screen.findByText(/couldn't load this ticket/i)).toBeInTheDocument();
  });

  it("shows 'Not yet classified' when the ticket has no category", async () => {
    mockGetResponses({ ...baseTicket, category: null });

    renderDetailPage("1");
    await screen.findByText("Cannot log in");

    expect(screen.getByLabelText(/category/i)).toHaveValue("");
  });

  it("PATCHes the ticket when a new status is chosen", async () => {
    mockGetResponses(baseTicket);
    vi.mocked(axios.patch).mockResolvedValue({
      data: { ...baseTicket, status: TicketStatus.RESOLVED },
    });

    renderDetailPage("1");
    await screen.findByText("Cannot log in");

    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: TicketStatus.RESOLVED },
    });

    await waitFor(() =>
      expect(axios.patch).toHaveBeenCalledWith("/api/tickets/1/status", {
        status: TicketStatus.RESOLVED,
      })
    );
  });

  it("shows the server's error message when a status update fails", async () => {
    mockGetResponses(baseTicket);
    vi.mocked(axios.patch).mockRejectedValue({
      response: { data: { error: "Ticket not found" } },
    });
    vi.mocked(axios.isAxiosError).mockImplementation((error) => Boolean(error));

    renderDetailPage("1");
    await screen.findByText("Cannot log in");

    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: TicketStatus.CLOSED },
    });

    expect(await screen.findByText(/ticket not found/i)).toBeInTheDocument();
  });

  it("PATCHes the ticket when a new category is chosen", async () => {
    mockGetResponses(baseTicket);
    vi.mocked(axios.patch).mockResolvedValue({
      data: { ...baseTicket, category: TicketCategory.BILLING },
    });

    renderDetailPage("1");
    await screen.findByText("Cannot log in");

    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: TicketCategory.BILLING },
    });

    await waitFor(() =>
      expect(axios.patch).toHaveBeenCalledWith("/api/tickets/1/category", {
        category: TicketCategory.BILLING,
      })
    );
  });

  it("shows the server's error message when a category update fails", async () => {
    mockGetResponses(baseTicket);
    vi.mocked(axios.patch).mockRejectedValue({
      response: { data: { error: "Ticket not found" } },
    });
    vi.mocked(axios.isAxiosError).mockImplementation((error) => Boolean(error));

    renderDetailPage("1");
    await screen.findByText("Cannot log in");

    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: TicketCategory.TECHNICAL },
    });

    expect(await screen.findByText(/ticket not found/i)).toBeInTheDocument();
  });

  it("shows 'Unassigned' by default and lists assignable users", async () => {
    mockGetResponses(baseTicket);

    renderDetailPage("1");
    await screen.findByText("Cannot log in");

    expect(screen.getByLabelText(/assigned to/i)).toHaveValue("");
    expect(await screen.findByRole("option", { name: "Alex Agent" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sam Support" })).toBeInTheDocument();
  });

  it("pre-selects the currently assigned agent", async () => {
    mockGetResponses({ ...baseTicket, assignedTo: { id: "agent-2", name: "Sam Support" } });

    renderDetailPage("1");
    await screen.findByText("Cannot log in");
    await screen.findByRole("option", { name: "Sam Support" });

    expect(screen.getByLabelText(/assigned to/i)).toHaveValue("agent-2");
  });

  it("PATCHes the ticket when a new assignee is chosen", async () => {
    mockGetResponses(baseTicket);
    vi.mocked(axios.patch).mockResolvedValue({
      data: { ...baseTicket, assignedTo: { id: "agent-1", name: "Alex Agent" } },
    });

    renderDetailPage("1");
    await screen.findByText("Cannot log in");
    await screen.findByRole("option", { name: "Alex Agent" });

    fireEvent.change(screen.getByLabelText(/assigned to/i), { target: { value: "agent-1" } });

    await waitFor(() =>
      expect(axios.patch).toHaveBeenCalledWith("/api/tickets/1/assign", {
        assignedTo: "agent-1",
      })
    );
  });

  it("unassigns the ticket when 'Unassigned' is chosen", async () => {
    mockGetResponses({ ...baseTicket, assignedTo: { id: "agent-2", name: "Sam Support" } });
    vi.mocked(axios.patch).mockResolvedValue({ data: { ...baseTicket, assignedTo: null } });

    renderDetailPage("1");
    await screen.findByText("Cannot log in");
    await screen.findByRole("option", { name: "Sam Support" });

    fireEvent.change(screen.getByLabelText(/assigned to/i), { target: { value: "" } });

    await waitFor(() =>
      expect(axios.patch).toHaveBeenCalledWith("/api/tickets/1/assign", {
        assignedTo: null,
      })
    );
  });

  it("pre-selects AI when the ticket is assigned to AI", async () => {
    mockGetResponses({ ...baseTicket, assignedToAI: true });

    renderDetailPage("1");
    await screen.findByText("Cannot log in");

    expect(screen.getByLabelText(/assigned to/i)).toHaveValue("AI");
  });

  it("PATCHes the ticket with AI when 'AI' is chosen", async () => {
    mockGetResponses(baseTicket);
    vi.mocked(axios.patch).mockResolvedValue({
      data: { ...baseTicket, assignedTo: null, assignedToAI: true },
    });

    renderDetailPage("1");
    await screen.findByText("Cannot log in");

    fireEvent.change(screen.getByLabelText(/assigned to/i), { target: { value: "AI" } });

    await waitFor(() =>
      expect(axios.patch).toHaveBeenCalledWith("/api/tickets/1/assign", {
        assignedTo: "AI",
      })
    );
  });

  it("disables the select while an assignment is in flight", async () => {
    mockGetResponses(baseTicket);
    let resolvePatch!: (value: { data: unknown }) => void;
    vi.mocked(axios.patch).mockReturnValue(
      new Promise((resolve) => {
        resolvePatch = resolve;
      })
    );

    renderDetailPage("1");
    await screen.findByText("Cannot log in");
    await screen.findByRole("option", { name: "Alex Agent" });

    fireEvent.change(screen.getByLabelText(/assigned to/i), { target: { value: "agent-1" } });

    await waitFor(() => expect(screen.getByLabelText(/assigned to/i)).toBeDisabled());

    resolvePatch({ data: { ...baseTicket, assignedTo: { id: "agent-1", name: "Alex Agent" } } });

    await waitFor(() => expect(screen.getByLabelText(/assigned to/i)).not.toBeDisabled());
  });

  it("shows the server's error message when assignment fails", async () => {
    mockGetResponses(baseTicket);
    vi.mocked(axios.patch).mockRejectedValue({
      response: { data: { error: "Assignee not found" } },
    });
    vi.mocked(axios.isAxiosError).mockImplementation((error) => Boolean(error));

    renderDetailPage("1");
    await screen.findByText("Cannot log in");
    await screen.findByRole("option", { name: "Alex Agent" });

    fireEvent.change(screen.getByLabelText(/assigned to/i), { target: { value: "agent-1" } });

    expect(await screen.findByText(/assignee not found/i)).toBeInTheDocument();
  });

  it("renders existing replies in order", async () => {
    mockGetResponses(baseTicket, [
      {
        id: "reply-1",
        body: "We're looking into this.",
        senderType: "AGENT",
        createdAt: "2026-01-03T00:00:00.000Z",
        author: { id: "agent-1", name: "Alex Agent" },
      },
    ]);

    renderDetailPage("1");
    await screen.findByText("Cannot log in");

    const replyBody = await screen.findByText("We're looking into this.");
    expect(replyBody.closest("div")).toHaveTextContent("Alex Agent");
    expect(replyBody.closest("div")).toHaveTextContent("Agent");
  });

  it("shows a validation error and does not submit when the reply is empty", async () => {
    mockGetResponses(baseTicket);

    renderDetailPage("1");
    await screen.findByText("Cannot log in");

    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));

    expect(await screen.findByText(/reply cannot be empty/i)).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("submits a reply and clears the form", async () => {
    mockGetResponses(baseTicket);
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        id: "reply-1",
        body: "Please try again.",
        senderType: "AGENT",
        createdAt: "2026-01-03T00:00:00.000Z",
        author: { id: "agent-1", name: "Alex Agent" },
      },
    });

    renderDetailPage("1");
    await screen.findByText("Cannot log in");

    fireEvent.change(screen.getByLabelText(/reply/i), {
      target: { value: "Please try again." },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith("/api/tickets/1/replies", {
        body: "Please try again.",
      })
    );
    await waitFor(() => expect(screen.getByLabelText(/reply/i)).toHaveValue(""));
  });

  it("shows the server's error message when a reply fails to send", async () => {
    mockGetResponses(baseTicket);
    vi.mocked(axios.post).mockRejectedValue({
      response: { data: { error: "Failed to send email" } },
    });
    vi.mocked(axios.isAxiosError).mockImplementation((error) => Boolean(error));

    renderDetailPage("1");
    await screen.findByText("Cannot log in");

    fireEvent.change(screen.getByLabelText(/reply/i), {
      target: { value: "Please try again." },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));

    expect(await screen.findByText(/failed to send email/i)).toBeInTheDocument();
  });
});
