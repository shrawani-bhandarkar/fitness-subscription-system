export function StatCard({
  description,
  icon: Icon,
  label,
  tone = "slate",
  value,
}) {
  const iconTone =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-700";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/[0.02]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
          <Icon size={19} aria-hidden="true" />
        </span>
      </div>
      {description && (
        <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
      )}
    </article>
  );
}
