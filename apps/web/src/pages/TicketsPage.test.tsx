import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { TicketStatus } from "@helpdesk/core/enums/ticket-status";
import { renderWithQuery } from "../test/render-with-query";
import TicketsPage from "./TicketsPage";

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

describe("TicketsPage", () => {
  it("renders the fetched tickets in newest-first order as returned by the API", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        tickets: [
          {
            id: "2",
            subject: "Newest ticket",
            fromEmail: "newest@example.com",
            fromName: "Newest Sender",
            status: TicketStatus.OPEN,
            createdAt: "2026-01-02T00:00:00.000Z",
          },
          {
            id: "1",
            subject: "Oldest ticket",
            fromEmail: "oldest@example.com",
            fromName: null,
            status: TicketStatus.CLOSED,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    });

    renderWithQuery(
      <MemoryRouter>
        <TicketsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Newest ticket")).toBeInTheDocument();
    expect(screen.getByText("Oldest ticket")).toBeInTheDocument();
    expect(screen.getByText("Newest Sender")).toBeInTheDocument();
    expect(screen.getByText("newest@example.com")).toBeInTheDocument();
    expect(screen.getByText("oldest@example.com")).toBeInTheDocument();
    expect(screen.getByText(TicketStatus.OPEN)).toBeInTheDocument();
    expect(screen.getByText(TicketStatus.CLOSED)).toBeInTheDocument();

    const subjects = screen.getAllByRole("row").map((row) => row.textContent);
    const newestIndex = subjects.findIndex((text) => text?.includes("Newest ticket"));
    const oldestIndex = subjects.findIndex((text) => text?.includes("Oldest ticket"));
    expect(newestIndex).toBeGreaterThanOrEqual(0);
    expect(newestIndex).toBeLessThan(oldestIndex);
  });

  it("shows an error message when the request fails", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("network error"));

    renderWithQuery(
      <MemoryRouter>
        <TicketsPage />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByText(/couldn't load tickets/i)).toBeInTheDocument()
    );
  });

  it("shows an empty state when there are no tickets", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { tickets: [] } });

    renderWithQuery(
      <MemoryRouter>
        <TicketsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("No tickets yet.")).toBeInTheDocument();
  });
});
