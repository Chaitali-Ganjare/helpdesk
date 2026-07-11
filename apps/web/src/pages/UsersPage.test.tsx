import { describe, it, expect, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { renderWithQuery } from "../test/render-with-query";
import UsersPage from "./UsersPage";

vi.mock("axios");

vi.mock("../lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false }),
    signOut: vi.fn(),
  },
}));

describe("UsersPage", () => {
  it("renders the fetched users in a table", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        users: [
          {
            id: "1",
            name: "Admin",
            email: "admin@example.com",
            role: "ADMIN",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    });

    renderWithQuery(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("network error"));

    renderWithQuery(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByText(/couldn't load users/i)).toBeInTheDocument()
    );
  });

  it("shows validation errors for an invalid new-user form", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { users: [] } });

    renderWithQuery(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    );

    await screen.findByText("No users yet.");

    fireEvent.click(screen.getByRole("button", { name: /new user/i }));
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "ab" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    expect(await screen.findByText(/name must be at least 3 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("creates a user and closes the modal on success", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { users: [] } });
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        user: {
          id: "2",
          name: "New Person",
          email: "new@example.com",
          role: "AGENT",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      },
    });

    renderWithQuery(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    );

    await screen.findByText("No users yet.");

    fireEvent.click(screen.getByRole("button", { name: /new user/i }));
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "New Person" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith("/api/users", {
        name: "New Person",
        email: "new@example.com",
        password: "password1",
      })
    );

    await waitFor(() =>
      expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument()
    );
  });
});
