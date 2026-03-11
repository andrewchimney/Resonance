"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

export default function AuthCallback() {
  const router = useRouter();
  const { supabase } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const destination = next && next.startsWith("/") ? next : "/browse";

    if (!supabase) {
      router.replace(destination);
      return;
    }

    let redirected = false;
    const doRedirect = (user: { id: string; email?: string | null } | null) => {
      if (redirected) return;
      redirected = true;
      if (user) {
        // Fire-and-forget: ensure a public.users row exists for OAuth sign-ins
        supabase.from("users").upsert(
          { id: user.id, email: user.email ?? null, username: null },
          { onConflict: "id", ignoreDuplicates: true }
        );
      }
      router.replace(destination);
    };

    // Strategy 1: Listen for auth events on the shared client.
    // When registered, Supabase fires INITIAL_SESSION with the current session.
    // If hash is still being processed, it fires SIGNED_IN once done.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) doRedirect(session.user);
    });

    // Strategy 2: Directly check for an existing session (in case hash was
    // already processed before this effect ran).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) doRedirect(data.session.user);
    });

    // Strategy 3: Fallback — redirect after 3 s even if no session was found.
    const fallback = setTimeout(() => doRedirect(null), 3000);

    return () => {
      redirected = true;
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, [supabase, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <p className="text-white text-lg">Signing you in...</p>
    </div>
  );
}
