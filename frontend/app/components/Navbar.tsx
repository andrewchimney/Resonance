"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";

interface Props {
    user: User | null;
    onLoginClick: () => void;
    onProfileClick: () => void;
    onCreatePost: () => void;
    searchQuery?: string;
    onSearchChange?: (value: string) => void;
}
export default function Navbar({
    user,
    onLoginClick,
    onProfileClick,
    onCreatePost,
    searchQuery,
    onSearchChange,
}: Props) {
    return (
        <nav className="flex min-h-[72px] items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
            <Link href="/" className="text-xl font-semibold text-black dark:text-white">
                Resonance
            </Link>

            {typeof searchQuery === "string" && onSearchChange ? (
                <div className="mx-8 flex-1 max-w-2xl">
                    <input
                        type="text"
                        placeholder="Search posts..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm text-black placeholder-zinc-500 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-400"
                    />
                </div>
            ) : (
                <div className="mx-8 flex-1 max-w-2xl" />
            )}

            <div className="relative flex items-center gap-6">
                <Link
                    href="/browse"
                    className="text-sm font-medium text-black transition-colors hover:text-zinc-600 hover:underline dark:text-white dark:hover:text-zinc-300"
                >
                    Browse
                </Link>

                <Link
                    href="/generate"
                    className="text-sm font-medium text-black transition-colors hover:text-zinc-600 hover:underline dark:text-white dark:hover:text-zinc-300"
                >
                    Generate
                </Link>

                {user ? (
                    <button
                        aria-label="Profile"
                        onClick={onProfileClick}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 transition-colors hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 cursor-pointer"
                    >
                        <svg
                            className="h-5 w-5 text-zinc-600 dark:text-zinc-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                        </svg>
                    </button>
                ) : (
                    <button
                        onClick={onLoginClick}
                        className="text-sm font-medium text-black transition-colors hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300 cursor-pointer"
                    >
                        Log In
                    </button>
                )}

                <button
                    onClick={onCreatePost}
                    title="Create a post"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 transition-colors hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-600 cursor-pointer"
                >
                    <svg
                        className="h-5 w-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                </button>
            </div>
        </nav>
    );
}