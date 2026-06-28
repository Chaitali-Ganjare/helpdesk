import { authClient } from "../lib/auth-client";

export default function NavBar({ userName }: { userName: string }) {
  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <nav className="nav">
      <div className="nav-brand">
        <div className="nav-brand-icon">H</div>
        Helpdesk
      </div>
      <div className="nav-right">
        <span className="nav-user-name">{userName}</span>
        <div className="nav-avatar">{initials}</div>
        <button className="btn-signout" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
