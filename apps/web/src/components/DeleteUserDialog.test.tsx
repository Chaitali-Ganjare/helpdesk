import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { Role } from "@helpdesk/core/enums/role";
import { renderWithQuery } from "../test/render-with-query";
import DeleteUserDialog from "./DeleteUserDialog";
import type { User } from "./UsersTable";

vi.mock("axios");

beforeEach(() => {
  vi.clearAllMocks();
});

const targetUser: User = {
  id: "42",
  name: "Target Person",
  email: "target@example.com",
  role: Role.AGENT,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function Harness() {
  const [open, setOpen] = useState(true);
  return <DeleteUserDialog open={open} onOpenChange={setOpen} user={targetUser} />;
}

describe("DeleteUserDialog", () => {
  it("shows a confirmation naming the user", async () => {
    renderWithQuery(<Harness />);
    await screen.findByRole("alertdialog");

    expect(screen.getByText(/delete target person\?/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("does not call the delete API when cancelled", async () => {
    renderWithQuery(<Harness />);
    await screen.findByRole("alertdialog");

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(axios.delete).not.toHaveBeenCalled();
  });

  it("DELETEs the user and closes on confirm", async () => {
    vi.mocked(axios.delete).mockResolvedValue({});

    renderWithQuery(<Harness />);
    await screen.findByRole("alertdialog");

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(axios.delete).toHaveBeenCalledWith("/api/users/42"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("shows the server's error and keeps the dialog open on failure", async () => {
    vi.mocked(axios.delete).mockRejectedValue({
      response: { data: { error: "Admin users cannot be deleted" } },
    });
    vi.mocked(axios.isAxiosError).mockImplementation((error) => Boolean(error));

    renderWithQuery(<Harness />);
    await screen.findByRole("alertdialog");

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(await screen.findByText(/admin users cannot be deleted/i)).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
