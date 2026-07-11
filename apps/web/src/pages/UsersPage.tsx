import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import NavBar from "../components/NavBar";
import CreateUserModal from "../components/CreateUserModal";
import { Skeleton } from "@/components/ui/skeleton";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "AGENT";
  createdAt: string;
};

export default function UsersPage() {
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
          <CreateUserModal />
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
          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users === undefined &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-40" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-20" />
                      </td>
                    </tr>
                  ))}
                {users?.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                    <td className="px-4 py-3 text-slate-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.role === "ADMIN"
                            ? "bg-indigo-50 text-indigo-600"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users?.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No users yet.</p>
            )}
          </div>
        )}
      </main>
    </>
  );
}
