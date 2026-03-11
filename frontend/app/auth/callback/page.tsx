"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const next = searchParams.get("next");
    // Only allow relative paths to prevent open-redirect attacks
    const destination = next && next.startsWith("/") ? next : "/browse";

    // Guard against double-firing (INITIAL_SESSION + SIGNED_IN both carrying a user)
    let redirected = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user && !redirected) {
        redirected = true;
        // Ensure a public.users row exists for OAuth (e.g. Discord) sign-ins.
        await supabase.from("users").upsert(
          {
            id: session.user.id,
            email: session.user.email ?? null,
            username: null,
          },
          { onConflict: "id", ignoreDuplicates: true }
        );
        router.replace(destination);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <p className="text-white text-lg">Signing you in...</p>
    </div>
  );
}
