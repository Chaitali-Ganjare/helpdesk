import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { Role } from "@helpdesk/core/enums/role";
import { renderWithQuery } from "../test/render-with-query";
import UserFormDialog from "./UserFormDialog";
import type { User } from "./UsersTable";

vi.mock("axios");

beforeEach(() => {
  vi.clearAllMocks();
});

const existingUser: User = {
  id: "42",
  name: "Existing Person",
  email: "existing@example.com",
  role: Role.AGENT,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function Harness({ initialUser }: { initialUser?: User }) {
  const [open, setOpen] = useState(true);
  return <UserFormDialog open={open} onOpenChange={setOpen} user={initialUser} />;
}

describe("UserFormDialog", () => {
  describe("create mode", () => {
    it("renders empty fields with 'Create user' copy", async () => {
      renderWithQuery(<Harness />);
      await screen.findByRole("dialog");

      expect(screen.getByRole("heading", { name: /create user/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toHaveValue("");
      expect(screen.getByLabelText(/email/i)).toHaveValue("");
      expect(screen.getByLabelText(/password/i)).toHaveValue("");
      expect(screen.getByRole("button", { name: /create user/i })).toBeInTheDocument();
    });

    it("requires a non-empty password", async () => {
      renderWithQuery(<Harness />);
      await screen.findByRole("dialog");

      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "New Person" } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "new@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: /create user/i }));

      expect(
        await screen.findByText(/password must be at least 8 characters/i)
      ).toBeInTheDocument();
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("POSTs the new user and closes on success", async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: { user: { ...existingUser, id: "99" } } });

      renderWithQuery(<Harness />);
      await screen.findByRole("dialog");

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
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });
  });

  describe("edit mode", () => {
    it("prefills the form with the user's data and an empty password", async () => {
      renderWithQuery(<Harness initialUser={existingUser} />);
      await screen.findByRole("dialog");

      expect(screen.getByRole("heading", { name: /edit user/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toHaveValue("Existing Person");
      expect(screen.getByLabelText(/email/i)).toHaveValue("existing@example.com");
      expect(screen.getByLabelText(/password/i)).toHaveValue("");
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    });

    it("saves with an unchanged, blank password field", async () => {
      vi.mocked(axios.patch).mockResolvedValue({ data: { user: existingUser } });

      renderWithQuery(<Harness initialUser={existingUser} />);
      await screen.findByRole("dialog");

      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Updated Name" } });
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() =>
        expect(axios.patch).toHaveBeenCalledWith("/api/users/42", {
          name: "Updated Name",
          email: "existing@example.com",
          password: "",
        })
      );
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("includes the new password when one is provided", async () => {
      vi.mocked(axios.patch).mockResolvedValue({ data: { user: existingUser } });

      renderWithQuery(<Harness initialUser={existingUser} />);
      await screen.findByRole("dialog");

      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "newpassword1" } });
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() =>
        expect(axios.patch).toHaveBeenCalledWith("/api/users/42", {
          name: "Existing Person",
          email: "existing@example.com",
          password: "newpassword1",
        })
      );
    });

    it("rejects a too-short password instead of silently ignoring it", async () => {
      renderWithQuery(<Harness initialUser={existingUser} />);
      await screen.findByRole("dialog");

      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "short" } });
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

      expect(
        await screen.findByText(/password must be at least 8 characters/i)
      ).toBeInTheDocument();
      expect(axios.patch).not.toHaveBeenCalled();
    });

    it("shows the server's error message on failure", async () => {
      vi.mocked(axios.patch).mockRejectedValue({
        response: { data: { error: "A user with this email already exists" } },
      });
      vi.mocked(axios.isAxiosError).mockImplementation((error) => Boolean(error));

      renderWithQuery(<Harness initialUser={existingUser} />);
      await screen.findByRole("dialog");

      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "taken@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

      expect(
        await screen.findByText(/a user with this email already exists/i)
      ).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
