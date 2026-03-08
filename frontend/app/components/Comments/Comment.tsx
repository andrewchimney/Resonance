import React from "react";
import type { CommentData } from "./types";

interface CommentProps {
    comment: CommentData;
    // Called when the user clicks the upvote or downvote button
    onVote: (commentId: string, direction: "up" | "down") => void;
    // Controls whether vote buttons are active (requires login)
    isLoggedIn: boolean;

    // Optional handlers for pin/heart (only available to post owner)
    onTogglePin?: (commentId: string) => void;
    onToggleHeart?: (commentId: string) => void;
    // This is only valid if the current user is the post owner
    canManage?: boolean;
}

/*
  Comment renders a single comment card containing:
  - Profile picture (or initials fallback)
  - Author username + formatted post date
  - Comment body text
  - Upvote / vote count / downvote controls
  - Pin button (only for post owner)
  - Heart button (only for post owner)
*/
export function Comment({ comment, onVote, isLoggedIn, onTogglePin, onToggleHeart, canManage=false }: CommentProps) {

    // Format the ISO timestamp to a readable date e.g. "Mar 2, 2026"
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    // Fall back to the first two letters of the username if no avatar is available
    const initials = comment.author?.username
        ? comment.author.username.slice(0, 2).toUpperCase()
        : "?";

    // Shared style for vote buttons — disabled appearance when logged out
    const voteButtonClass = (hoverColor: string) =>
        `flex items-center justify-center transition-colors ${
            isLoggedIn
                ? `text-zinc-400 ${hoverColor} cursor-pointer`
                : "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
        }`;

    return (
        <div className="flex gap-3 py-4 border-b border-zinc-200 dark:border-zinc-800 last:border-0">

            {/* ── Profile Picture ───────────────────────────────────── */}
            <div className="flex-shrink-0">
                {comment.author?.avatar_url ? (
                    <img
                        src={comment.author.avatar_url}
                        alt={comment.author.username}
                        className="h-9 w-9 rounded-full object-cover"
                    />
                ) : (
                    // Initials avatar fallback when no profile picture exists
                    <div className="h-9 w-9 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                        {initials}
                    </div>
                )}
            </div>

            {/* ── Comment Body ──────────────────────────────────────── */}
            <div className="flex flex-col flex-1 min-w-0">

                {/* Username + Date + Pin Button */}
                <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-black dark:text-white truncate">
                        {comment.author?.username ?? "Anonymous"}
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                        {formatDate(comment.created_at)}
                    </span>
                </div>

                {/* Pin button */}
                {canManage && (
                    <button
                        type="button"
                        onClick={() => onTogglePin?.(comment.id)}
                        className="flex-shrink-0 rounded-md px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title={comment.is_pinned ? "Unpin comment" : "Pin comment"}
                        aria-label={comment.is_pinned ? "Unpin comment" : "Pin comment"}
                    >
                        {comment.is_pinned ? "📌" : "📍"}
                    </button>
                )}
            </div>

                {/* Comment Text */}
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {comment.body}
                </p>

                {/* ── Vote Controls + Heart Button ─────────────────────────────────── */}
                <div className="flex items-center justify-between mt-2">
                    
                    {/* Vote Buttons */}
                    <div className="flex items-center gap-2">
                        {/* Upvote */}
                        <button
                            onClick={() => isLoggedIn && onVote(comment.id, "up")}
                            title={isLoggedIn ? "Upvote" : "Log in to vote"}
                            className={voteButtonClass("hover:text-green-500 dark:hover:text-green-400")}
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 19V6M5 12l7-7 7 7" />
                            </svg>
                        </button>

                    {/* Net Vote Count */}
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 min-w-[1ch] text-center">
                        {comment.votes}
                    </span>

                    {/* Downvote */}
                    <button
                        onClick={() => isLoggedIn && onVote(comment.id, "down")}
                        title={isLoggedIn ? "Downvote" : "Log in to vote"}
                        className={voteButtonClass("hover:text-red-500 dark:hover:text-red-400")}
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v13M5 12l7 7 7-7" />
                        </svg>
                    </button>
                </div>

                {/* Heart button */}
                {canManage && (
                    <button
                        type="button"
                        onClick={() => onToggleHeart?.(comment.id)}
                        className="rounded-md px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title={comment.is_owner_hearted ? "Remove heart" : "Heart comment"}
                        aria-label={comment.is_owner_hearted ? "Remove heart" : "Heart comment"}
                    >
                        {comment.is_owner_hearted ? "❤️" : "🤍"}
                    </button>
                )}
            </div>
        </div>
    </div>
    );
}
