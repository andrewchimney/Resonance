import { useState, useEffect, useCallback } from "react";
import type { CommentsState, CommentData } from "./types";

// Restrict sort values to valid backend options to prevent invalid API calls and ensure type safety
export type CommentSort = "recent" | "relevant" | "interacted";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

// Helper function to keep endpoint paths consistent
function api(path: string) {
    return `${API_URL}${path}`;
}

/*
  useComments manages all server interaction for a post's comments:
  - Fetching the comment list
  - Submitting a new comment
  - Voting (up or down) on a comment
*/
export function useComments(postId: string, sortOption: CommentSort = "recent") {
    const [state, setState] = useState<CommentsState>({
        comments: [],
        loading: true,
        error: null,
        submitting: false,
    });

    // Fetch all comments for the given post from the backend
    // sortOption will determine the order: "recent", "relevant", or "interacted"
    const fetchComments = useCallback(async () => {
        if (!postId) {
            setState(prev => ({ ...prev, loading: false }));
            return;
        }

        setState(prev => ({ ...prev, loading: true, error: null }));
        
        try {
            const response = await fetch(api(`/api/posts/${postId}/comments?sort=${encodeURIComponent(sortOption)}`));
            if (!response.ok) throw new Error(`Failed to fetch comments (${response.status})`);
            const data = await response.json();
            setState(prev => ({ ...prev, comments: data.comments, loading: false }));
        } catch {
            setState(prev => ({ ...prev, error: "Could not load comments.", loading: false }));
        }
    }, [postId, sortOption]);

    // Fetch comments when the component first mounts or postId changes
    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    /*
      submitComment — POST a new comment to the backend.
      On success, prepend the returned comment to the top of the list
      so the user sees their new comment immediately.
    */
    const submitComment = async (body: string, userId: string, presetId?: string, visibility: "public" | "private" = "public") => {
        const trimmed = body.trim();
        if (!trimmed) return; // This will prevent empty comments from being submited
        setState(prev => ({ ...prev, submitting: true, error: null }));
        try {
            const response = await fetch(api(`/api/posts/${postId}/comments?user_id=${encodeURIComponent(userId)}`), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: trimmed, preset_id: presetId ?? null, visibility, }),
            });
            if (!response.ok) throw new Error(`Failed to submit comment (${response.status})`);
            const data = await response.json();
            
            // If the backend returns full comment data, we can add it to the top of the list without re-fetching all comments
            if (data?.comment) {
                setState((prev) => ({
                    ...prev,
                    comments: [data.comment as CommentData, ...prev.comments],
                    submitting: false,
                }));
            } else {
                setState((prev) => ({ ...prev, submitting: false }));
                await fetchComments();
            }
        } catch {
            setState(prev => ({
                ...prev,
                submitting: false,
                error: "Could not post comment.",
            }));
        }
    };

    /*
      voteComment — POST an upvote or downvote to the backend.
      On success, update the vote count of that comment in local state
      without re-fetching the whole list.
    */
    const voteComment = async (commentId: string, direction: "up" | "down") => {
        try {
            const response = await fetch(api(`/api/comments/${commentId}/${direction}vote`), {
                method: "POST",
            });
            if (!response.ok) throw new Error(`Failed to vote (${response.status})`);
            const data = await response.json();
            setState(prev => ({
                ...prev,
                comments: prev.comments.map((c) =>
                    c.id === commentId ? { ...c, votes: data?.votes ?? c.votes } : c
                ),
            }));
        } catch (err) {
            console.error("Vote error:", err);
        }
    };

    return { ...state, fetchComments, submitComment, voteComment };
}