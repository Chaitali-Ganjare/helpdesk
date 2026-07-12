import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
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
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        id: "1",
        subject: "Cannot log in",
        body: "I keep getting an invalid password error.",
        fromEmail: "jane@example.com",
        fromName: "Jane Doe",
        status: TicketStatus.OPEN,
        category: TicketCategory.ACCOUNT,
        priority: TicketPriority.HIGH,
        createdAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    });

    renderDetailPage("1");

    expect(await screen.findByText("Cannot log in")).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith("/api/tickets/1");
    expect(screen.getByText("I keep getting an invalid password error.")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe <jane@example.com>")).toBeInTheDocument();
    expect(screen.getByText(TicketStatus.OPEN)).toBeInTheDocument();
    expect(screen.getByText(TicketCategory.ACCOUNT)).toBeInTheDocument();
    expect(screen.getByText(TicketPriority.HIGH)).toBeInTheDocument();
  });

  it("shows an error message when the ticket fails to load", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("Not found"));

    renderDetailPage("missing");

    expect(await screen.findByText(/couldn't load this ticket/i)).toBeInTheDocument();
  });
});
