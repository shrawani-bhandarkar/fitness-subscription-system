import Link from "next/link";
import {
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  PanelsTopLeft,
  ScrollText,
  Settings,
  UserRound,
} from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/subscriptions", label: "Memberships", icon: ScrollText },
  { href: "/plans", label: "Plans", icon: PanelsTopLeft },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/account", label: "Account settings", icon: Settings },
];

export function MemberSidebar({ user, activePath }) {
  return (
    <>
      <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-200 bg-white px-5 py-7 lg:flex lg:flex-col">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-2 text-sm font-bold tracking-[0.12em] text-slate-950"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <Dumbbell size={19} aria-hidden="true" />
          </span>
          FITNESS CLUB
        </Link>
        <p className="mt-10 px-3 text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
          Workspace
        </p>
        <nav className="mt-3 space-y-1">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = activePath === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
          {user.role === "ADMIN" && (
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            >
              <PanelsTopLeft size={18} aria-hidden="true" />
              Admin
            </Link>
          )}
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t border-slate-100 pt-5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user.name}
            </p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <UserMenu />
        </div>
      </aside>

      <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-bold tracking-[0.1em] text-slate-950"
          >
            <Dumbbell size={18} className="text-emerald-700" aria-hidden="true" />
            FITNESS CLUB
          </Link>
          <div className="flex items-center gap-2">
            <span className="max-w-36 truncate text-xs text-slate-500">
              {user.name}
            </span>
            <UserMenu />
          </div>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = activePath === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                  active
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
          {user.role === "ADMIN" && (
            <Link
              href="/admin/dashboard"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <PanelsTopLeft size={15} aria-hidden="true" />
              Admin
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}
