"use client";

import React from "react";
import type { User } from "@supabase/supabase-js";
import { useComments } from "./useComments";
import { CommentForm } from "./CommentForm.tsx";
import { CommentView } from "./CommentView";

interface CommentsProps {
    postId: string;      // The post whose comments we are displaying
    user: User | null;   // The currently logged-in Supabase user (null if not logged in)
}

/*
  Comments is the top-level container for the comment section on a post.
  It wires together:
  - useComments (data fetching, voting, submitting)
  - CommentForm (new comment input)
  - A list of Comment cards
*/
export function Comments({ postId, user }: CommentsProps) {
    const { state, submitComment, voteComment } = useComments(postId);
    const { comments, loading, error, submitting } = state;

    // Pass the logged-in user's ID down to submitComment for attribution
    const handleSubmit = (body: string) => {
        if (!user) return;
        submitComment(body, user.id);
    };

    return (
        <section className="mt-6">

            {/* Section header with live comment count */}
            <h3 className="text-sm font-semibold text-black dark:text-white mb-4">
                Comments {!loading && `(${comments.length})`}
            </h3>

            {/* New comment form — shows a login prompt if user is null */}
            <CommentForm
                onSubmit={handleSubmit}
                submitting={submitting}
                isLoggedIn={!!user}
            />

            {/* Comment list — loading / error / empty / populated states handled inside CommentView */}
            <CommentView
                comments={comments}
                loading={loading}
                error={error}
                onVote={voteComment}
                isLoggedIn={!!user}
            />

        </section>
    );
}
