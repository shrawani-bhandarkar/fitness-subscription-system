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
import { UserMenu } from "../auth/user-menu";
import { NotificationBell } from "./notification-bell.jsx";
import { getMemberNotifications } from "../../features/notifications/service.js";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/subscriptions", label: "Memberships", icon: ScrollText },
  { href: "/plans", label: "Plans", icon: PanelsTopLeft },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/account", label: "Account settings", icon: Settings },
];

export async function MemberSidebar({ user, activePath }) {
  const notifications = await getMemberNotifications(user._id, { limit: 8 });

  return (
    <>
      <aside className="hidden min-h-screen w-64 shrink-0 overflow-visible border-r border-white/10 bg-[#111b17] px-5 py-7 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-2 text-sm font-bold tracking-[0.12em] text-white"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-lime-300 text-[#17231d]">
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
                    ? "bg-lime-300/10 text-lime-200 ring-1 ring-inset ring-lime-200/10"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
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
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
            >
              <PanelsTopLeft size={18} aria-hidden="true" />
              Admin
            </Link>
          )}
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t border-white/10 pt-5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {user.name}
            </p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
          <NotificationBell notifications={notifications} />
          <UserMenu />
        </div>
      </aside>

      <div className="relative overflow-visible border-b border-white/10 bg-[#111b17] px-4 py-3 text-white lg:hidden">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-bold tracking-[0.1em] text-white"
          >
            <Dumbbell size={18} className="text-lime-300" aria-hidden="true" />
            FITNESS CLUB
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-36 truncate text-xs text-slate-300 sm:block">
              {user.name}
            </span>
            <NotificationBell notifications={notifications} />
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
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "bg-lime-300/10 text-lime-200"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
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
              className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white"
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
