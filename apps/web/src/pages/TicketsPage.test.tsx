import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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
    const table = screen.getByRole("table");
    expect(within(table).getByText(TicketStatus.OPEN)).toBeInTheDocument();
    expect(within(table).getByText(TicketStatus.CLOSED)).toBeInTheDocument();

    const subjects = screen.getAllByRole("row").map((row) => row.textContent);
    const newestIndex = subjects.findIndex((text) => text?.includes("Newest ticket"));
    const oldestIndex = subjects.findIndex((text) => text?.includes("Oldest ticket"));
    expect(newestIndex).toBeGreaterThanOrEqual(0);
    expect(newestIndex).toBeLessThan(oldestIndex);
  });

  it("sends the default sort params on initial load", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { tickets: [] } });

    renderWithQuery(
      <MemoryRouter>
        <TicketsPage />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/tickets", {
        params: { sort: "createdAt", order: "desc" },
      })
    );
  });

  it("re-fetches with new sort params when a sortable column header is clicked", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { tickets: [] } });

    renderWithQuery(
      <MemoryRouter>
        <TicketsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /subject/i }));

    await waitFor(() =>
      expect(axios.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { sort: "subject", order: "asc" },
      })
    );
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

  it("re-fetches with a status filter param when the status filter changes", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { tickets: [] } });

    renderWithQuery(
      <MemoryRouter>
        <TicketsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByRole("combobox", { name: /filter by status/i }), {
      target: { value: TicketStatus.RESOLVED },
    });

    await waitFor(() =>
      expect(axios.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { sort: "createdAt", order: "desc", status: TicketStatus.RESOLVED },
      })
    );
  });

  it("re-fetches with a search param after debounce when typing in the search box", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { tickets: [] } });

    renderWithQuery(
      <MemoryRouter>
        <TicketsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByRole("searchbox", { name: /search tickets/i }), {
      target: { value: "crashing" },
    });

    await waitFor(() =>
      expect(axios.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { sort: "createdAt", order: "desc", search: "crashing" },
      })
    );
  });

  it("shows a filtered empty state when filters are active and no tickets match", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { tickets: [] } });

    renderWithQuery(
      <MemoryRouter>
        <TicketsPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByRole("combobox", { name: /filter by status/i }), {
      target: { value: TicketStatus.RESOLVED },
    });

    expect(await screen.findByText("No tickets match the selected filters.")).toBeInTheDocument();
  });
});
