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

    // Supabase automatically detects the #access_token hash and establishes the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        const next = searchParams.get("next");
        // Only allow relative paths to prevent open-redirect attacks
        const destination = next && next.startsWith("/") ? next : "/browse";
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
