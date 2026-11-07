import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CreditCard,
  Dumbbell,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getActivePlans } from "@/features/member/data";
import { formatINR } from "@/features/member/presentation";

export const dynamic = "force-dynamic";

const highlights = [
  {
    icon: CalendarDays,
    title: "Membership, made clear",
    description:
      "See your plan, membership dates, and progress together in one place.",
  },
  {
    icon: CreditCard,
    title: "Know where you stand",
    description:
      "Keep a clear record of successful payments and any remaining balance.",
  },
  {
    icon: ShieldCheck,
    title: "Your account stays yours",
    description:
      "Your membership and billing views are scoped to your signed-in account.",
  },
];

export default async function Home() {
  const plans = await getActivePlans(3);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold tracking-[0.12em]">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Dumbbell size={19} aria-hidden="true" />
            </span>
            FITNESS CLUB
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-0.5 text-xs font-medium sm:gap-3 sm:text-sm">
            <Link href="/about" className="hidden rounded-lg px-2 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-950 sm:inline-flex sm:px-3">
              About
            </Link>
            <Link href="/plans" className="rounded-lg px-2 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-950 sm:px-3">
              Plans
            </Link>
            <Link href="/sign-in" className="rounded-lg px-2 py-2 text-slate-700 hover:bg-slate-50 sm:px-3">
              Log in
            </Link>
            <Link href="/sign-up" className="rounded-xl bg-emerald-800 px-3 py-2 text-white hover:bg-emerald-900 sm:px-4">
              Join now
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-slate-950">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_15%,rgba(16,185,129,0.28),transparent_42%),linear-gradient(120deg,#0f172a,#020617)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:py-32">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-emerald-200">
              <Sparkles size={14} aria-hidden="true" />
              A clearer way to manage your membership
            </p>
            <h1 className="mt-7 text-4xl leading-tight font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Make time for
              <span className="block text-emerald-300">your stronger self.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Find a fitness plan that fits your routine, then keep your
              membership and billing details organized as you go.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/plans" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400">
                Explore membership plans <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link href="/about" className="inline-flex min-h-12 items-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                Learn about Fitness Club
              </Link>
            </div>
            <p className="mt-5 text-xs text-slate-400">
              Membership prices and availability are shown from currently published plans.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.15em] text-emerald-300 uppercase">Your membership</p>
                <p className="mt-1 text-sm text-slate-300">All the essentials, together</p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                <Dumbbell size={22} aria-hidden="true" />
              </span>
            </div>
            <div className="space-y-3 pt-5">
              {[
                ["Plan details", "Dates, duration, and benefits"],
                ["Payment history", "Clear transaction records"],
                ["Account dashboard", "Your membership at a glance"],
              ].map(([title, detail], index) => (
                <div key={title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                    {index === 0 ? <BadgeCheck size={18} aria-hidden="true" /> : index === 1 ? <CreditCard size={18} aria-hidden="true" /> : <CalendarDays size={18} aria-hidden="true" />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={15} className="text-emerald-300" aria-hidden="true" />
              Secure account access for members
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.16em] text-emerald-700 uppercase">Designed around you</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Spend less time managing. More time moving.
          </h2>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {highlights.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                <Icon size={20} aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-emerald-700 uppercase">Membership options</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Plans that fit your goals</h2>
            </div>
            <Link href="/plans" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-950">
              See all plans <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          {plans.length ? (
            <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const original = plan.baseMonthlyPrice * plan.durationMonths;
                const total = Math.round(original * (100 - plan.discountPercentage) / 100);
                return (
                  <article key={plan._id.toString()} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-950">{plan.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">{plan.durationMonths} {plan.durationMonths === 1 ? "month" : "months"}</p>
                      </div>
                      {plan.isPopular && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">RECOMMENDED</span>}
                    </div>
                    <p className="mt-5 text-2xl font-semibold text-slate-950">{formatINR(total)}</p>
                    <p className="mt-1 text-xs text-slate-500">total for {plan.durationMonths} {plan.durationMonths === 1 ? "month" : "months"}</p>
                    <p className="mt-2 text-sm text-slate-600">{plan.description || "A membership to support your training routine."}</p>
                    <Link href="/plans" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-emerald-800">
                      View plan details <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-7">
              <p className="font-semibold text-slate-900">Plans are being prepared.</p>
              <p className="mt-1 text-sm text-slate-600">Check back soon for available membership options.</p>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm sm:px-8">
          <p className="font-semibold tracking-wide text-slate-900">FITNESS CLUB</p>
          <div className="flex gap-4 text-slate-600">
            <Link href="/about" className="hover:text-slate-950">About</Link>
            <Link href="/plans" className="hover:text-slate-950">Plans</Link>
            <Link href="/sign-in" className="hover:text-slate-950">Log in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
