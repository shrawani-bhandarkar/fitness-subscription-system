import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold tracking-[0.16em]">
          FITNESS CLUB
        </Link>
        <p className="mt-16 text-sm font-semibold tracking-[0.18em] text-emerald-700 uppercase">
          About us
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Training is personal.
          <span className="block text-emerald-700">Managing it should be easy.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
          Fitness Club helps members keep their account and membership
          information organized, so they can focus on showing up and making
          progress.
        </p>
        <Link
          href="/sign-up"
          className="mt-8 inline-flex rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          Create your account
        </Link>
      </div>
    </main>
  );
}
