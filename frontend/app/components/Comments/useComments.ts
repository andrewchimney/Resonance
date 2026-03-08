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
  - Pinning/unpinning comments (post owner only)
  - Hearting/unhearting comments (post owner only)
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
        if (!trimmed) return; // This will prevent empty comments from being submitted
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

    /** 
     * togglePin - POST request to pin/unpin a comment
     * Only callable by the post owner
     * On success, update the is_pinned flag in local state without re-fetching the whole list
    */
   const togglePin = async (commentId: string) => {
    try {
        const response = await fetch(api(`/api/comments/${commentId}/pin`), {
            method: "POST",
        });
        if (!response.ok) throw new Error(`Failed to pin comment (${response.status})`);
        const data = await response.json();

        setState(prev => ({
            ...prev,
            comments: prev.comments.map((c) =>
                c.id === commentId ? {...c, is_pinned: data?.is_pinned ?? !c.is_pinned } : c
            ),
        }));
    } catch (err) {
        console.error("Pin error:", err);
    }
    };

    /**
     * toggleHeart - POST request to heart/unheart a comment
     * Only callable by the post owner.
     * On success, update the is_owner_hearted flag in local state without re-fetching the whole list
     */
    const toggleHeart = async (commentId: string) => {
        try {
            const response = await fetch(api(`/api/comments/${commentId}/heart`), {
                method: "POST",
            });
            if (!response.ok) throw new Error(`Failed to heart comment (${response.status})`);
            const data = await response.json();

            setState(prev => ({
                ...prev,
                comments: prev.comments.map((c) =>
                    c.id === commentId ? { ...c, is_owner_hearted: data?.is_owner_hearted ?? !c.is_owner_hearted } : c
                ),
            }));
        } catch (err) {
            console.error("Heart error:", err);
        }
    };

    return { ...state, fetchComments, submitComment, voteComment, togglePin, toggleHeart };
}