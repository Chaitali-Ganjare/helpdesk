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
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const assignableUsers = [
  { id: "agent-1", name: "Alex Agent" },
  { id: "agent-2", name: "Sam Support" },
];

function mockGetResponses(ticket: unknown) {
  vi.mocked(axios.get).mockImplementation((url: string) => {
    if (url === "/api/users/assignable") {
      return Promise.resolve({ data: { users: assignableUsers } });
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
    expect(screen.getByText(TicketStatus.OPEN)).toBeInTheDocument();
    expect(screen.getByText(TicketCategory.ACCOUNT)).toBeInTheDocument();
    expect(screen.getByText(TicketPriority.HIGH)).toBeInTheDocument();
  });

  it("shows an error message when the ticket fails to load", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("Not found"));

    renderDetailPage("missing");

    expect(await screen.findByText(/couldn't load this ticket/i)).toBeInTheDocument();
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
        assignedToId: "agent-1",
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
        assignedToId: null,
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
});
