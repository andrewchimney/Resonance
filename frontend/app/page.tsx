"use client";

import { useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import LoginPanel from "@/app/components/Authentication/LoginPanel";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthPanel, setShowAuthPanel] = useState(false);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-white font-sans dark:bg-black"
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
          onProfileClick={() => setShowAuthPanel((open) => !open)}
          onCreatePost={() => {
            window.location.href = "/browse?create=1";
          }}
        />
      </div>

      {showAuthPanel && (
        <div className="fixed right-6 top-16 z-50 w-80">
          <LoginPanel
            onClose={() => setShowAuthPanel(false)}
            onLoginSuccess={(newUser: User) => {
              setUser(newUser);
              setShowAuthPanel(false);
            }}
          />
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
      <footer className="relative z-10">
        <Footer />
      </footer>
    </div>
  );
}