"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-black">
      <main className="flex flex-col items-center gap-8 px-8 text-center">
        <h1 className="text-8xl font-bold tracking-tight text-black dark:text-white">
          Resonance
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl">
          AI-powered synth preset discovery. Describe the sound you want, and we&apos;ll find the perfect presets for you.
        </p>
        <div className="flex gap-4 mt-4">
          <Link
            href="/generate"
            className="px-8 py-4 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-semibold text-lg hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition"
          >
            Start Generating
          </Link>
          <Link
            href="/browse"
            className="px-8 py-4 bg-white text-black dark:bg-black dark:text-white border-2 border-black dark:border-white font-semibold text-lg hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
          >
            Browse Presets
          </Link>
        </div>
      </main>
    </div>
  );
}
