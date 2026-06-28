import NavBar from "../components/NavBar";
import { authClient } from "../lib/auth-client";

export default function HomePage() {
  const { data: session } = authClient.useSession();

  return (
    <>
      <NavBar />
      <main className="py-10 px-8 max-w-[1100px] mx-auto">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
        <p className="mt-1.5 text-[15px] text-slate-500">
          Welcome back, {session?.user.name}.
        </p>
      </main>
    </>
  );
}
