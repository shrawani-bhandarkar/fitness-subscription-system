const statusStyles = {
  ACTIVE: "bg-emerald-50 text-emerald-800 ring-emerald-700/10",
  SUCCEEDED: "bg-emerald-50 text-emerald-800 ring-emerald-700/10",
  PAID: "bg-emerald-50 text-emerald-800 ring-emerald-700/10",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-700/10",
  PARTIAL: "bg-sky-50 text-sky-800 ring-sky-700/10",
  EXPIRED: "bg-slate-100 text-slate-700 ring-slate-500/10",
  CANCELLED: "bg-slate-100 text-slate-700 ring-slate-500/10",
  FAILED: "bg-rose-50 text-rose-800 ring-rose-700/10",
  REFUNDED: "bg-violet-50 text-violet-800 ring-violet-700/10",
};

const statusLabels = {
  SUCCEEDED: "Paid",
  PAID: "Paid",
  PENDING: "Pending",
  PARTIAL: "Partial",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }) {
  const normalized = status ?? "UNKNOWN";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        statusStyles[normalized] ?? "bg-slate-100 text-slate-700 ring-slate-500/10"
      }`}
    >
      {statusLabels[normalized] ?? normalized}
    </span>
  );
}
