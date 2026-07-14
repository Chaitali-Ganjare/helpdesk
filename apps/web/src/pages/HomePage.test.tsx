import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { renderWithQuery } from "../test/render-with-query";
import HomePage from "./HomePage";

function ticketsPerDay(counts: number[]) {
  return counts.map((count, i) => ({
    date: `2026-06-${String(15 + i).padStart(2, "0")}`,
    count,
  }));
}

vi.mock("axios");

vi.mock("../lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: { user: { name: "Ada Lovelace" } }, isPending: false }),
    signOut: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HomePage", () => {
  it("renders the fetched dashboard stats", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        total: 42,
        open: 10,
        aiResolved: 20,
        aiResolvedPercent: 47.6,
        avgResolutionMinutes: 125,
        ticketsPerDay: ticketsPerDay([1, 2, 0]),
      },
    });

    renderWithQuery(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("47.6%")).toBeInTheDocument();
    expect(screen.getByText("2.1h")).toBeInTheDocument();
    expect(screen.getByText(/welcome back, ada lovelace/i)).toBeInTheDocument();
  });

  it("shows a placeholder when there is no resolution data yet", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        total: 0,
        open: 0,
        aiResolved: 0,
        aiResolvedPercent: null,
        avgResolutionMinutes: null,
        ticketsPerDay: ticketsPerDay([0, 0, 0]),
      },
    });

    renderWithQuery(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(await screen.findAllByText("—")).toHaveLength(2);
  });

  it("renders the tickets-per-day chart and can switch to a table view", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        total: 3,
        open: 3,
        aiResolved: 0,
        aiResolvedPercent: 0,
        avgResolutionMinutes: null,
        ticketsPerDay: ticketsPerDay([1, 2, 0]),
      },
    });

    renderWithQuery(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(await screen.findByRole("img", { name: "Jun 16: 2 tickets" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show table/i }));

    expect(screen.getByRole("cell", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show chart/i })).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("network error"));

    renderWithQuery(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByText(/couldn't load dashboard stats/i)).toBeInTheDocument()
    );
  });
});
