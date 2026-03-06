"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            Resonance
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            AI-powered synth preset discovery and generation for producers.
          </p>
        </div>

        <div className="flex gap-12 text-sm sm:items-start">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-black dark:text-white">Explore</span>
            <Link
              href="/browse"
              className="text-zinc-700 transition hover:text-black dark:text-zinc-300 dark:hover:text-white"
            >
              Browse
            </Link>
            <Link
              href="/generate"
              className="text-zinc-700 transition hover:text-black dark:text-zinc-300 dark:hover:text-white"
            >
              Generate
            </Link>
            <Link
              href="/browse?create=1"
              className="text-zinc-700 transition hover:text-black dark:text-zinc-300 dark:hover:text-white"
            >
              Create Post
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-medium text-black dark:text-white">Project</span>
            <a
              href="https://github.com/andrewchimney/Resonance"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-700 transition hover:text-black dark:text-zinc-300 dark:hover:text-white"
            >
              GitHub
            </a>
            <a
              href="mailto:aweckwer@ucsc.edu"
              className="text-zinc-700 transition hover:text-black dark:text-zinc-300 dark:hover:text-white"
            >
              Contact
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-6 w-full max-w-6xl border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        © 2026 Resonance. All rights reserved.
      </div>
    </footer>
  );
}