import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";

export function MemberHeader({ user }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/dashboard" className="text-sm font-bold tracking-[0.14em]">
          FITNESS CLUB
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-600 hover:text-zinc-950"
          >
            Dashboard
          </Link>
          <Link
            href="/billing"
            className="text-sm text-zinc-600 hover:text-zinc-950"
          >
            Billing
          </Link>
          {user.role === "ADMIN" && (
            <Link
              href="/admin/dashboard"
              className="hidden text-sm text-zinc-600 hover:text-zinc-950 sm:block"
            >
              Admin
            </Link>
          )}
          <span className="hidden text-sm text-zinc-500 md:block">
            {user.name}
          </span>
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
