import Link from "next/link";

const authNavigation = {
  "sign-in": {
    question: "New to Fitness Club?",
    href: "/sign-up",
    label: "Create New Account",
  },
  "sign-up": {
    question: "Already have an account?",
    href: "/sign-in",
    label: "Log In",
  },
};

export function AuthShell({
  children,
  description,
  mode,
  title,
}) {
  const navigation = authNavigation[mode];

  return (
    <main className="grid min-h-screen bg-[#111b17] lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
      <section className="relative hidden overflow-hidden px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(132,204,22,0.14),transparent_50%),linear-gradient(145deg,#16231d,#0c1310_72%)]" />
        <div className="relative">
          <Link href="/" className="text-sm font-semibold tracking-[0.2em]">
            FITNESS CLUB
          </Link>
        </div>
        <div className="relative max-w-xl pb-12">
          <p className="mb-5 text-xs font-semibold tracking-[0.25em] text-lime-300 uppercase">
            Stronger, every day
          </p>
          <h1 className="text-5xl leading-tight font-semibold tracking-tight xl:text-6xl">
            Make room for
            <span className="block text-lime-300">your best self.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-zinc-300">
            A membership that keeps your training, progress, and account in one
            place.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm text-zinc-300">
            <span className="h-px w-10 bg-lime-300" />
            Built around your goals
          </div>
        </div>
        <p className="relative text-xs text-zinc-500">
          Your fitness journey, managed simply.
        </p>
      </section>

      <section className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-5 py-10 sm:px-8">
        <div className="mb-8 w-full max-w-md lg:hidden">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.18em] text-slate-950"
          >
            FITNESS CLUB
          </Link>
        </div>
        <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-8">
          <div className="mb-7">
            <p className="text-xs font-semibold tracking-[0.16em] text-emerald-800 uppercase">
              FITNESS CLUB
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>
          {children}
          <p className="mt-6 text-center text-sm text-slate-600">
            {navigation.question}{" "}
            <Link
              href={navigation.href}
              className="font-semibold text-emerald-800 underline-offset-4 hover:underline"
            >
              {navigation.label}
            </Link>
          </p>
          <p className="mt-8 text-center text-xs text-slate-500">
            Authentication is managed by Clerk.
          </p>
        </div>
      </section>
    </main>
  );
}
