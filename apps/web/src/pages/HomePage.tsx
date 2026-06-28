import NavBar from "../components/NavBar";
import { authClient } from "../lib/auth-client";

export default function HomePage() {
  const { data: session } = authClient.useSession();

  return (
    <>
      <NavBar userName={session?.user.name ?? ""} />
      <main className="page">
        <h2>Dashboard</h2>
        <p className="page-sub">Welcome back, {session?.user.name}.</p>
      </main>
    </>
  );
}
