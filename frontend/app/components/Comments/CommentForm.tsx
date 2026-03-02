import React, { useState } from "react";

interface CommentFormProps {
    onSubmit: (body: string) => void; // Called with trimmed comment text on submit
    submitting: boolean;              // Disables the form while a request is in-flight
    isLoggedIn: boolean;              // Hides the form and shows a prompt if not logged in
}

/*
  CommentForm renders the textarea + submit button for posting a new comment.
  If the user is not logged in, it shows a prompt instead of the form.
*/
export function CommentForm({ onSubmit, submitting, isLoggedIn }: CommentFormProps) {
    const [body, setBody] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim()) return; // Do not submit empty comments
        onSubmit(body.trim());
        setBody(""); // Clear the textarea after a successful submit
    };

    // Prompt unauthenticated users to log in rather than showing the form
    if (!isLoggedIn) {
        return (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 py-2 mb-4">
                You must be logged in to post a comment.
            </p>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-6">
            <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                disabled={submitting}
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm text-black placeholder-zinc-500 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-400 resize-none disabled:opacity-50"
            />
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={submitting || !body.trim()}
                    className="rounded-lg bg-black px-4 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-zinc-200 cursor-pointer"
                >
                    {submitting ? "Posting..." : "Post Comment"}
                </button>
            </div>
        </form>
    );
}
