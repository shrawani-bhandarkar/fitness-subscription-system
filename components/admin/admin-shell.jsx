import Link from "next/link";
import {
  BadgePercent,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  Layers3,
  Users,
  WalletCards,
} from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";

const links = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/plans", label: "Manage Plans", icon: Layers3 },
  { href: "/admin/coupons", label: "Manage Coupons", icon: BadgePercent },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: Dumbbell },
  { href: "/admin/transactions", label: "Transactions", icon: CreditCard },
  { href: "/admin/members", label: "Members", icon: Users },
];

export function AdminShell({ user, activePath, children }) {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-200 bg-white px-5 py-7 lg:flex lg:flex-col">
        <Link href="/admin/dashboard" className="flex items-center gap-3 px-2 text-sm font-bold tracking-[0.12em] text-slate-950">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <Dumbbell size={19} aria-hidden="true" />
          </span>
          FITNESS CLUB
        </Link>
        <p className="mt-10 px-3 text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">Administration</p>
        <nav className="mt-3 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={activePath === href ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${activePath === href ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon size={18} aria-hidden="true" /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t border-slate-100 pt-5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <UserMenu />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/admin/dashboard" className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-950">
              <Dumbbell size={18} className="text-emerald-700" aria-hidden="true" /> FITNESS CLUB ADMIN
            </Link>
            <UserMenu />
          </div>
          <nav aria-label="Admin navigation" className="mt-3 flex gap-2 overflow-x-auto">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs ${activePath === href ? "bg-emerald-50 font-semibold text-emerald-800" : "text-slate-600"}`}>
                <Icon size={14} aria-hidden="true" />{label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

export function AdminPageHeading({ eyebrow = "ADMINISTRATION", title, description, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-emerald-700 uppercase">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
        {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function AdminNotice({ query }) {
  const success = {
    "member-updated": "Member details updated and recorded in the audit log.",
    "member-deleted": "Member account permanently deleted. Financial records were retained and anonymized.",
    "plan-created": "Plan created.",
    "plan-updated": "Plan updated. Existing subscription price snapshots remain unchanged.",
    "plan-deleted": "Plan deleted.",
    "plan-archived": "Plan deactivated because it has subscriptions; historical subscription records remain intact.",
    "coupon-created": "Coupon created.",
    "coupon-updated": "Coupon updated.",
    "coupon-deleted": "Coupon deleted.",
    "balance-waived": "Outstanding balance waived and recorded in the audit log; no payment was created.",
  };
  const error = {
    INVALID_MEMBER: "Check the member details and provide a change reason.",
    MEMBER_NOT_FOUND: "The selected member no longer exists.",
    INVALID_MEMBER_DELETION: "A valid member and confirmation email are required.",
    MEMBER_SELF_DELETE: "Administrators cannot delete their own account.",
    LAST_ADMIN_PROTECTED: "The last remaining administrator account cannot be deleted.",
    ADMIN_ACCOUNT_PROTECTED: "Administrator accounts cannot be deleted through member management.",
    MEMBER_EMAIL_CONFIRMATION_MISMATCH: "The confirmation email does not match this member.",
    MEMBER_CLERK_DELETION_FAILED: "The Clerk account could not be deleted. No member data was removed; retry later.",
    MEMBER_CLEANUP_FAILED: "The Clerk account is deleted, but member-data cleanup did not complete. Retry the deletion to finish safely.",
    INVALID_PLAN: "Check plan fields and provide a change reason.",
    PLAN_NOT_FOUND: "The selected plan no longer exists.",
    INVALID_COUPON: "Check coupon fields and provide a change reason.",
    COUPON_NOT_FOUND: "The selected coupon no longer exists.",
    COUPON_IN_USE: "This coupon has usage history and cannot be deleted.",
    COUPON_CONFLICT: "A coupon with this code already exists.",
    INVALID_OVERRIDE: "A valid subscription ID and a reason are required.",
    NO_BALANCE: "No eligible outstanding balance was found.",
  };
  const ok = typeof query?.success === "string" ? success[query.success] : null;
  const failed = typeof query?.error === "string" ? error[query.error] : null;
  if (!ok && !failed) return null;
  return (
    <p role={failed ? "alert" : "status"} className={`mt-5 rounded-xl px-4 py-3 text-sm ${failed ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"}`}>
      {failed ?? ok}
    </p>
  );
}

export function AdminStat({ label, value, note, icon: Icon, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
  };
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={`flex size-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={19} aria-hidden="true" /></span>
      </div>
      {note && <p className="mt-3 text-xs text-slate-500">{note}</p>}
    </article>
  );
}

export function AdminTableEmpty({ children = "No records found." }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">{children}</div>;
}

export function AdminPagination({ path, currentPage, totalPages, query = {} }) {
  if (totalPages <= 1) return null;

  function pageHref(page) {
    const params = new URLSearchParams();
    for (const key of ["q", "status", "membership", "from", "to"]) {
      if (typeof query[key] === "string" && query[key]) {
        params.set(key, query[key]);
      }
    }
    params.set("page", String(page));
    return `${path}?${params.toString()}`;
  }

  return (
    <nav aria-label="Admin list pages" className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-xs text-slate-500">Page {currentPage} of {totalPages}</span>
      <div className="flex gap-2">
        {currentPage > 1 ? (
          <Link href={pageHref(currentPage - 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Previous</Link>
        ) : (
          <span className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-400">Previous</span>
        )}
        {currentPage < totalPages ? (
          <Link href={pageHref(currentPage + 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Next</Link>
        ) : (
          <span className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-400">Next</span>
        )}
      </div>
    </nav>
  );
}
