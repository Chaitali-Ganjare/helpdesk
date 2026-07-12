import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Role } from "@helpdesk/core/enums/role";
import { Link } from "@/components/ui/link";
import { authClient } from "../lib/auth-client";

export default function NavBar() {
  const { data: session } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const userName = session?.user.name ?? "";
  const isAdmin = (session?.user as { role?: Role })?.role === Role.ADMIN;

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    setIsSigningOut(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/login";
        },
        onError: () => {
          setIsSigningOut(false);
        },
      },
    });
  }

  return (
    <nav className="flex items-center justify-between px-7 h-[60px] bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
      <div className="flex items-center gap-6">
        <RouterLink
          to="/"
          className="flex items-center gap-2.5 font-bold text-base text-slate-900 tracking-tight"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
            H
          </div>
          Helpdesk
        </RouterLink>
        <Link to="/tickets" variant="nav" className="text-[13px] font-medium">
          Tickets
        </Link>
        {isAdmin && (
          <Link to="/users" variant="nav" className="text-[13px] font-medium">
            Users
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-500">{userName}</span>
        <div className="w-[34px] h-[34px] rounded-full bg-indigo-50 text-indigo-600 text-[13px] font-semibold flex items-center justify-center">
          {initials}
        </div>
        <button
          className="px-3.5 py-[7px] text-[13px] font-medium border border-slate-200 rounded-lg bg-white text-slate-500 cursor-pointer hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </nav>
  );
}
