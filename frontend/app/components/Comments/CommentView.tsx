import React from "react";
import type { CommentData } from "./types";
import { Comment } from "./Comment";

interface CommentViewProps {
    comments: CommentData[];   // The list of comments to display
    loading: boolean;          // Shows a loading indicator while fetching
    error: string | null;      // Shows an error message if fetching failed
    onVote: (commentId: string, direction: "up" | "down") => void; // Passed down to each Comment
    isLoggedIn: boolean;       // Passed down to each Comment to gate vote buttons
}

/*
  CommentView is a pure presentational component.
  It takes a list of CommentData and renders each one as a Comment card.
  It also handles the loading, error, and empty states.
  It contains no data-fetching or form logic — that lives in Comments.tsx.
*/
export function CommentView({ comments, loading, error, onVote, isLoggedIn }: CommentViewProps) {

    // Loading state
    if (loading) {
        return (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Loading comments...
            </p>
        );
    }

    // Error state
    if (error) {
        return (
            <p className="text-sm text-red-500">{error}</p>
        );
    }

    // Empty state
    if (comments.length === 0) {
        return (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No comments yet. Be the first to comment!
            </p>
        );
    }

    // Render the list of Comment cards
    return (
        <div>
            {comments.map((comment) => (
                <Comment
                    key={comment.id}
                    comment={comment}
                    onVote={onVote}
                    isLoggedIn={isLoggedIn}
                />
            ))}
        </div>
    );
}
