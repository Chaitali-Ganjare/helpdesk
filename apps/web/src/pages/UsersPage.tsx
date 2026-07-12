import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import NavBar from "../components/NavBar";
import UserFormDialog from "../components/UserFormDialog";
import DeleteUserDialog from "../components/DeleteUserDialog";
import { Button } from "@/components/ui/button";
import UsersTable, { type User } from "../components/UsersTable";

type DialogState = { mode: "create" } | { mode: "edit"; user: User } | null;

export default function UsersPage() {
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { data: users, isError: error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await axios.get("/api/users");
      return res.data.users as User[];
    },
  });

  return (
    <>
      <NavBar />
      <main className="py-10 px-8 max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Users</h2>
          <Button onClick={() => setDialogState({ mode: "create" })}>New user</Button>
        </div>

        {error && (
          <p className="mt-4 text-sm text-destructive">
            Couldn't load users. Try refreshing the page.
          </p>
        )}

        {!error && users === undefined && (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        )}

        {!error && (
          <UsersTable
            users={users}
            onEdit={(user) => setDialogState({ mode: "edit", user })}
            onDelete={(user) => setDeleteTarget(user)}
          />
        )}
      </main>

      <UserFormDialog
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) setDialogState(null);
        }}
        user={dialogState?.mode === "edit" ? dialogState.user : undefined}
      />

      <DeleteUserDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        user={deleteTarget ?? undefined}
      />
    </>
  );
}
