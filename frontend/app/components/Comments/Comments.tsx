"use client";

import React, { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useComments, type CommentSort } from "./useComments";
import { CommentForm } from "./CommentForm";
import { CommentView } from "./CommentView";

interface CommentsProps {
    postId: string;      // The post whose comments we are displaying
    user: User | null;   // The currently logged-in Supabase user (null if not logged in)
    postOwnerId?: string; // Owner of the post, used to determine if pin/heart controls should be shown
}

/*
  Comments is the top-level container for the comment section on a post.
  It wires together:
  - useComments (data fetching, voting, submitting)
  - CommentForm (new comment input)
  - A list of Comment cards
*/
export function Comments({ postId, user, postOwnerId }: CommentsProps) {
    // State for sort option
    const [ sortOption, setSortOption ] = useState<CommentSort>("recent");

    const { comments, loading, error, submitting, submitComment, voteComment, togglePin, toggleHeart, } = useComments(postId, sortOption);

    // Only post owner can see pin/heart controls, so we check if the logged-in user's ID matches the post owner's ID
    const isPostOwner = !!user && !!postOwnerId && user.id === postOwnerId;
    
    // Pass the logged-in user's ID down to submitComment for attribution
    const handleSubmit = (body: string) => {
        if (!user) return;
        submitComment(body, user.id);
    };

    return (
        <section className="mt-6 space-y-4">
            {/* Header with title and sort dropdown */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
                <h3 className="text-lg font-semibold text-black dark:text-white">
                    Comments from the Community
                </h3>

                {/* Sort Dropdown */}
                <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as CommentSort)}
                    disabled={loading} // Disable while loading comments
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-black focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Sort comments by"
                    title="Sort comments"
                >
                    <option value="recent">Most Recent</option>
                    <option value="relevant">Most Relevant</option>
                    <option value="interacted">Most Interacted</option>
                </select>
            </div>

            {/* Section header with live comment count */}
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
                {!loading && `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
            </div>

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
                onTogglePin={togglePin}
                onToggleHeart={toggleHeart}
                isPostOwner={isPostOwner}
            />
        </section>
    );
}