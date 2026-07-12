import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { Role } from "@helpdesk/core/enums/role";
import { renderWithQuery } from "../test/render-with-query";
import UsersPage from "./UsersPage";

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

describe("UsersPage", () => {
  it("renders the fetched users in a table", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        users: [
          {
            id: "1",
            name: "Admin",
            email: "admin@example.com",
            role: Role.ADMIN,
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
    expect(screen.getByText(Role.ADMIN)).toBeInTheDocument();
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

  it("shows the create-user dialog when New user is clicked", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { users: [] } });

    renderWithQuery(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    );

    await screen.findByText("No users yet.");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /new user/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /create user/i })).toBeInTheDocument();
  });

  it("opens the edit dialog prefilled when a row's edit button is clicked", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        users: [
          {
            id: "7",
            name: "Jane Doe",
            email: "jane@example.com",
            role: Role.AGENT,
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

    await screen.findByText("jane@example.com");

    fireEvent.click(screen.getByRole("button", { name: /edit jane doe/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /edit user/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toHaveValue("Jane Doe");
    expect(screen.getByLabelText(/email/i)).toHaveValue("jane@example.com");
    expect(screen.getByLabelText(/password/i)).toHaveValue("");
  });

  it("does not render a delete button for ADMIN rows", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        users: [
          {
            id: "1",
            name: "Admin",
            email: "admin@example.com",
            role: Role.ADMIN,
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

    await screen.findByText("admin@example.com");

    expect(screen.getByRole("button", { name: /edit admin/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete admin/i })).not.toBeInTheDocument();
  });

  it("deletes a user via the confirmation dialog", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        users: [
          {
            id: "7",
            name: "Jane Doe",
            email: "jane@example.com",
            role: Role.AGENT,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    });
    vi.mocked(axios.delete).mockResolvedValue({});

    renderWithQuery(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    );

    await screen.findByText("jane@example.com");

    const deleteButton = screen.getByRole("button", { name: /delete jane doe/i });
    expect(deleteButton).not.toBeDisabled();
    fireEvent.click(deleteButton);

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/delete jane doe\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(axios.delete).toHaveBeenCalledWith("/api/users/7"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("does not delete when the confirmation is cancelled", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        users: [
          {
            id: "7",
            name: "Jane Doe",
            email: "jane@example.com",
            role: Role.AGENT,
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

    await screen.findByText("jane@example.com");

    fireEvent.click(screen.getByRole("button", { name: /delete jane doe/i }));
    await screen.findByRole("alertdialog");

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(axios.delete).not.toHaveBeenCalled();
  });

  it("hides the create-user dialog when pressing Escape", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { users: [] } });

    renderWithQuery(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    );

    await screen.findByText("No users yet.");

    fireEvent.click(screen.getByRole("button", { name: /new user/i }));
    await screen.findByRole("dialog");

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("hides the create-user dialog when clicking outside", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { users: [] } });

    renderWithQuery(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    );

    await screen.findByText("No users yet.");

    fireEvent.click(screen.getByRole("button", { name: /new user/i }));
    await screen.findByRole("dialog");

    fireEvent.pointerDown(document.body);
    fireEvent.click(document.body);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
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
          role: Role.AGENT,
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
