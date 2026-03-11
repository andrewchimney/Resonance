"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Processing authentication...");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

        if (!supabaseUrl || !supabaseAnonKey) {
          setStatus("Error: Supabase not configured");
          setTimeout(() => router.push("/"), 2000);
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Get the session - Supabase automatically handles the OAuth callback
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setStatus("Error: Failed to get session");
          setTimeout(() => router.push("/"), 2000);
          return;
        }

        if (!session?.user) {
          setStatus("Error: No user session found");
          setTimeout(() => router.push("/"), 2000);
          return;
        }

        // Success! Now ensure the public.users entry exists
        setStatus("Creating user profile...");

        try {
          const response = await fetch(`${apiUrl}/auth/ensure-user`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: session.user.id,
              email: session.user.email,
              raw_user_meta_data: session.user.user_metadata,
            }),
          });

          if (!response.ok) {
            console.warn("Failed to ensure user profile:", await response.text());
            // Don't fail the flow, just log it
          } else {
            const data = await response.json();
            console.log("User profile result:", data);
          }
        } catch (err) {
          console.warn("Error calling ensure-user:", err);
          // Don't fail the flow if the backend call fails
        }

        setStatus("Redirecting to profile...");
        
        // Give a brief moment for the profile to be created, then redirect
        setTimeout(() => {
          router.push("/profile");
        }, 500);
      } catch (error) {
        console.error("Unexpected error:", error);
        setStatus("Error: " + String(error));
        setTimeout(() => router.push("/"), 2000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-black dark:text-white mb-2">
          {status}
        </h1>
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
        </div>
      </div>
    </div>
  );
}
