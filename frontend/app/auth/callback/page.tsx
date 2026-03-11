"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Supabase automatically detects the #access_token hash and establishes the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Ensure a public.users row exists for OAuth (e.g. Discord) sign-ins.
        // Email/password signups create this row in signup/page.tsx, but OAuth
        // logins skip that flow entirely, so we upsert here on every sign-in.
        await supabase.from("users").upsert(
          {
            id: session.user.id,
            email: session.user.email ?? null,
            username: null,
          },
          { onConflict: "id", ignoreDuplicates: true }
        );
        router.replace("/browse");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <p className="text-white text-lg">Signing you in...</p>
    </div>
  );
}
