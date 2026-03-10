"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import Navbar from "@/app/components/Navbar";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthPanel, setShowAuthPanel] = useState(false);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const handleDiscordLogin = async () => {
    if (!supabase) return;
    setAuthError(null);
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
      },
    });
    setAuthLoading(false);
    if (error) setAuthError(error.message);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setShowAuthPanel(false);
  };

  return (
    <div
      className="relative min-h-full overflow-hidden bg-white font-sans dark:bg-black"
      style={{
        backgroundImage: "url(/background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center 30%",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Blur overlay for better text readability */}
      <div className="absolute inset-0 backdrop-blur-md" />

      {/* Navbar */}
      <div className="relative z-20 w-full">
        <Navbar
          user={user}
          onLoginClick={() => setShowAuthPanel(true)}
          onProfileClick={() => setShowAuthPanel(true)}
          onCreatePost={() => {
            window.location.href = "/browse?create=1";
          }}
        />
      </div>

      {showAuthPanel && (
        <div className="fixed right-6 top-16 z-50 w-80 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-black dark:text-white">Account</div>
            <button
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              onClick={() => setShowAuthPanel(false)}
            >
              Close
            </button>
          </div>
          {user ? (
            <div className="space-y-3">
              <button
                onClick={() => { window.location.href = "/profile"; }}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 text-left hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 w-full"
              >
                Signed in as <span className="font-medium">{user.email}</span>
              </button>
              <button
                onClick={handleSignOut}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-zinc-700 dark:text-zinc-200">Sign in to continue</div>
              <button
                onClick={handleDiscordLogin}
                disabled={authLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
              >
                <span aria-hidden>💬</span>
                {authLoading ? "Redirecting..." : "Continue with Discord"}
              </button>
              {authError && <div className="text-xs text-red-600 dark:text-red-400">{authError}</div>}
            </div>
          )}
        </div>
      )}

      <main className="relative z-10 flex min-h-[calc(100vh-72px)] flex-col items-center justify-center gap-6 px-6 py-10 text-center sm:gap-8 sm:px-8">
        <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl md:text-8xl">
          Resonance
        </h1>
        <p className="max-w-2xl text-base text-zinc-300 sm:text-lg md:text-xl">
          AI-powered synth preset discovery. Describe the sound you want, and we&apos;ll find the perfect presets for you.
        </p>
        <div className="mt-2 flex w-full max-w-md flex-col gap-3 sm:mt-4 sm:max-w-none sm:w-auto sm:flex-row sm:gap-4">
          <Link
            href="/generate"
            className="w-full border-2 border-white bg-white px-6 py-3 text-center text-base font-semibold text-black transition hover:bg-transparent hover:text-white sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
          >
            Start Generating
          </Link>
          <Link
            href="/browse"
            className="w-full border-2 border-white bg-transparent px-6 py-3 text-center text-base font-semibold text-white transition hover:bg-white hover:text-black sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
          >
            Browse Presets
          </Link>
        </div>
      </main>
    </div>
  );
}