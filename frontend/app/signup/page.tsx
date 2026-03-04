"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function SignupPage() {
  // Router for navigation after successful signup
  const router = useRouter();

  // Form State - These store what the users type into the form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // UI State - These control what the user sees on the page
  // Show a "Creating Account..." message while the signup process is happening
  const [loading, setLoading] = useState(false);
  // Display and error messages if something goes wrong during signup
  const [error, setError] = useState<string | null>(null);
  // Show a success message when the account is created successfully
  const [success, setSuccess] = useState(false);

  // Supabase Setup - Get the Supabase credentials from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Create a Supabase client using the same structure as the profile page
  // useMemo will prevent recreating the client on every render
  const supabase = useMemo(
    () => createClient(supabaseUrl, supabaseAnonKey),
  [supabaseUrl, supabaseAnonKey]
);

// Form Validation - Check if the form inputs are valid before allowing submission
const validateForm = (): boolean => {
  setError(null); // This will clear any previous error messages when the user tries to submit the form again

  // Check if the email is in a valid format
  if (!email.trim()) {
    setError("Email is required");
    return false;
  }

  // Check if the email format is valid using a basic regex check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setError("Please enter a valid email address");
    return false;
  }

  // Check if the password is in a valid format
  if (!password) {
    setError("Password is required");
    return false;
  }

  // Check if the password is at least 8 characters long
  if (password.length < 8) {
    setError("Password must be at least 8 characters long");
    return false;
  }

  // Ensure the password contains at least one lowercase letter (a-z)
  if (!/(?=.*[a-z])/.test(password)) {
    setError("Password must contain at least one lowercase letter");
    return false;
  }

  // Ensure the password contains at least one uppercase letter (A-Z)
  if (!/(?=.*[A-Z])/.test(password)) {
    setError("Password must contain at least one uppercase letter");
    return false;
  }

  // Ensure the password contains at least one number (0-9)
  if (!/(?=.*\d)/.test(password)) {
    setError("Password must contain at least one number");
    return false;
  }

  // Confirm that both password fields match
  if (password !== confirmPassword) {
    setError("Passwords do not match");
    return false;
  }

  // Terms of Service - The user must agree to terms before signing up
  if (!agreeToTerms) {
    setError("You must agree to the Terms of Service and Privacy Policy");
    return false;
  }

  // If all checks pass, the form is valid
  return true;
};

// Signup Handler - This function runs when the user clicks "Sign Up"
const handleSignup = async (e: React.FormEvent) => {
  // This will prevent the page from refreshing when the form is submitted
  e.preventDefault();

  // Validate the form before making API calls to Supabase
  if (!validateForm()) {
    return; // The form is not valid, so we stop the signup process
  }

  try {
    // This will show the loading state to the user
    setLoading(true); // Indicates that the signup process has started
    setError(null); // Clears any previous error messages

    // This will create the user's email/password account in Supabase
    const { data: authData, error: authError} = 
      await supabase.auth.signUp({
        email: email.trim(), // This will remove any extra whitespace from the email input
        password, // The password will be sent as is, since we want to preserve the user's intended password
        // This will redirect the user when they click the link to verify their emai
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      // Check if the signup process returned an error
      if (authError) {
        // This will provide a more user-friendly error message for common issues
        if (authError.message.includes("already registered")) {
          setError("This email is already registered. Please log in instead or use a different email.");
        } else {
          setError(authError.message || "Signup failed. Please try again.");
        }
        return; // This will stop the signup process if there was an error
      }

      // After a user is authenticated, we can create a profile for them in the database like username, profile pricture, etc.
      const { error: profileError } = await supabase
        .from("users") // This is the table name in the supabase database where user profiles are stored
        .insert([
          {
            id: authData.user!.id, // Use the authenticated user ID as the profile ID to link them together
            email: email.trim(), // This will store the user's email in the profile for easy access later
            username: null, // The username can be set later by the user in the profile page
            created_at: new Date().toISOString(), // This will record when the account was created
          },
        ]);
      
        if (profileError) {
          console.error("Profile creation error:", profileError);
          // If the signup does fail at this step, we can still allow the user to complete it later
        }

        // If we reach this point, the signup process was successful
        setSuccess(true);

        // This will clear the form fields so the next signup will start with empty inputs
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setAgreeToTerms(false);

        // This will redirect the user to the browse page after a short delay and will show a success message before navigating away
        setTimeout(() => {
          router.push("/browse");
        }, 2000); // This will wait 2 seconds before redirecting
  } catch (error) {
    // Handle any unexpected errors that might occur during the signup process
    console.error("Signup error:", error);
    setError("An unexpected error occurred. Please try again.");
  } finally {
    // This will hide the loading state regardless of whether the signup was successful or if there was an error
    setLoading(false);
  }
};

return (
  <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center px-4 py-8">
    <div className="w-full max-w-md">
      {/* Page Title */}
      <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
        Create Account
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-8">
        Join Resonance to share your synth presets with the community
      </p>

      {/* Error Message - Will only be visible when there's an error */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            {error}
          </p>
        </div>
      )}

      {/* Success Message - Will only show this after a successful signup */}
      {success && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            ✓ Account created successfully! Redirecting to browse page...
          </p>
        </div>
      )}

      {/* Signup Form - This will be hidden after a successful signup and show a success message instead */}
      {!success && (
        <form onSubmit={handleSignup} className="space-y-4 mb-6">
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 space-y-5">
            {/* Email Input Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)} // This will update the email state as user types
                disabled={loading} // This will disable the input field while the sign up process is happening to prevent changes
                placeholder="you@example.com"
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              />
            </div>

            {/* Password Input Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password" // This will hide the password as the user types for security purposes
                value={password}
                onChange={(e) => setPassword(e.target.value)} // This will update the password state as user types
                disabled={loading} // This will disable the input field while the sign up process is happening to prevent changes
                placeholder="Please enter your password"
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              />

              {/* Password requirements hint */}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                Must be at least 8 characters, with uppercase, lowercase, and a number
              </p>
            </div>

            {/* Confirm Password Input Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Confirm Password
              </label>
              <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} // Update the confirm password state
                  disabled={loading}
                  placeholder="please re-enter your password"
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              />
            </div>

            {/* Terms of Agreement Checkbox */}
            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)} // Update checkbox state
                disabled={loading}
                className="mt-1 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
              />
              <label
                htmlFor="terms"
                className="ml-3 text-sm text-zinc-600 dark:text-zinc-400"
              >
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 underline"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading} // Disable submit button while signing up to prevent multiple submissions
              className="w-full mt-6 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Show different text based on loading state */}
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
          </div>
        </form>
      )}

      {/* Login Link - Link to login page for users who already have an account */}
      <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 underline"
        >
          Log In
        </Link>
      </div>
    </div>
  </div>
  );
}

