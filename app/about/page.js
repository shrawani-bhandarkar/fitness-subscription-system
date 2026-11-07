import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Dumbbell,
  HeartPulse,
  Sparkles,
  UsersRound,
} from "lucide-react";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F3F5F3] text-[#17231F]">
      <header className="border-b border-[#17231F]/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-xs font-extrabold tracking-[0.14em] sm:text-sm"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#17362B] text-[#B7F36B]">
              <Dumbbell size={19} aria-hidden="true" />
            </span>
            FITNESS CLUB
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-1 text-xs font-semibold sm:gap-3 sm:text-sm">
            <Link href="/about" aria-current="page" className="rounded-lg px-2 py-2 text-[#17362B] sm:px-3">
              About
            </Link>
            <Link href="/plans" className="rounded-lg px-2 py-2 text-[#52615A] transition-colors hover:text-[#17362B] sm:px-3">
              Plans
            </Link>
            <Link href="/sign-in" className="hidden rounded-lg px-3 py-2 text-[#52615A] transition-colors hover:text-[#17362B] sm:inline-flex">
              Log in
            </Link>
            <Link href="/sign-up" className="rounded-xl bg-[#17362B] px-3 py-2.5 text-white transition-colors hover:bg-[#234B3A] sm:px-4">
              Join now
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[#10251D]">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-35"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2200&q=85')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#10251D] via-[#10251D]/90 to-[#10251D]/45" />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#B7F36B]/25 bg-[#B7F36B]/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-[#D8F7A8]">
              <Sparkles size={14} aria-hidden="true" />
              ABOUT FITNESS CLUB
            </p>
            <h1 className="mt-6 text-4xl leading-[1.08] font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Stronger habits.
              <span className="block text-[#B7F36B]">A healthier you.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
              Fitness is personal. We make it easier to find a membership that
              fits your goals, get the guidance to keep moving, and focus on
              making progress at your own pace.
            </p>
            <Link
              href="/plans"
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#B7F36B] px-5 py-3 text-sm font-bold text-[#17231F] shadow-lg shadow-black/15 transition-colors hover:bg-[#C8F78D]"
            >
              Explore Membership Plans
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="hidden justify-end lg:flex">
            <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#10251D]/65 p-6 shadow-2xl backdrop-blur-sm">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#B7F36B] text-[#17362B]">
                <HeartPulse size={23} aria-hidden="true" />
              </div>
              <p className="mt-7 text-xs font-semibold tracking-[0.16em] text-[#B7F36B] uppercase">
                Our mission
              </p>
              <p className="mt-3 text-xl leading-8 font-medium text-white">
                Make a supportive fitness journey feel simple, clear, and
                personal.
              </p>
              <div className="mt-6 flex items-center gap-2 border-t border-white/15 pt-5 text-sm text-white/70">
                <BadgeCheck size={17} className="text-[#B7F36B]" aria-hidden="true" />
                Memberships shaped around your goals
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
        <div>
          <p className="text-xs font-bold tracking-[0.17em] text-[#456C3A] uppercase">
            Our mission
          </p>
          <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            Fitness that meets you where you are.
          </h2>
        </div>
        <div className="space-y-4 text-base leading-7 text-[#52615A] sm:text-lg sm:leading-8">
          <p>
            We believe a healthier lifestyle grows from showing up consistently
            and feeling supported along the way. Fitness Club is here to help
            members take that next step, whatever their starting point.
          </p>
          <p>
            From choosing a membership to finding useful training and fitness
            guidance, our focus is on helping you work toward your goals with
            confidence.
          </p>
        </div>
      </section>

      <section className="border-y border-[#17231F]/[0.06] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-bold tracking-[0.17em] text-[#456C3A] uppercase">
                Find your way to move
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Our facilities &amp; member benefits
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#68766F]">
              Explore training and guidance options featured in our existing
              membership plans.
            </p>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Dumbbell,
                title: "Gym access & equipment",
                description: "Gym access and standard workout equipment for your routine.",
              },
              {
                icon: UsersRound,
                title: "Personal training",
                description: "Personal training options to support your fitness goals.",
              },
              {
                icon: HeartPulse,
                title: "Fitness guidance",
                description: "Fitness orientation and guidance to help you get started.",
              },
              {
                icon: Sparkles,
                title: "Group classes",
                description: "Group classes included with select membership options.",
              },
              {
                icon: BadgeCheck,
                title: "Progress reviews",
                description: "Fitness assessments and progress reviews available in select plans.",
              },
              {
                icon: ArrowUpRight,
                title: "Nutrition guidance",
                description: "Diet consultation offered with select membership options.",
              },
            ].map(({ icon: Icon, title, description }, index) => (
              <article
                key={title}
                className="group rounded-2xl border border-[#17231F]/10 bg-[#F8FAF8] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B7F36B] hover:shadow-lg hover:shadow-[#17231F]/[0.06] sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#EAF4E3] text-[#315B2D] transition-colors group-hover:bg-[#B7F36B]">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <span className="text-xs font-semibold tracking-widest text-[#9AA69F]">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#17231F]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#68766F]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-xs font-bold tracking-[0.17em] text-[#456C3A] uppercase">
            Why choose us?
          </p>
          <h2 className="mt-3 max-w-xl text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            A membership experience built around you.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#68766F]">
            Find options for different goals and routines, with a supportive
            approach that keeps your membership details clear while you focus
            on your fitness.
          </p>
        </div>
        <div className="grid gap-3">
          {[
            "Membership options for different goals and durations",
            "Training and fitness guidance in select plans",
            "A clear place to manage your membership details",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-[#17231F]/10 bg-white p-4 shadow-sm sm:p-5">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#EAF4E3] text-[#315B2D]">
                <BadgeCheck size={16} aria-hidden="true" />
              </span>
              <p className="text-sm leading-6 font-medium text-[#35443D]">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 sm:pb-16">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-3xl bg-[#17362B] p-7 shadow-xl shadow-[#17231F]/10 sm:p-10 md:flex-row md:items-center lg:p-12">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.17em] text-[#B7F36B] uppercase">
              Your next step starts here
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Ready to find your membership?
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/70 sm:text-base">
              Explore the plans currently available and choose what works for you.
            </p>
          </div>
          <Link
            href="/plans"
            className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-[#B7F36B] px-5 py-3 text-sm font-bold text-[#17231F] transition-colors hover:bg-[#C8F78D]"
          >
            Explore Membership Plans
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#17231F]/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-[#68766F] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link href="/" className="font-bold tracking-[0.12em] text-[#17362B]">
            FITNESS CLUB
          </Link>
          <p>Focused on helping members move toward their goals.</p>
        </div>
      </footer>
    </main>
  );
}
