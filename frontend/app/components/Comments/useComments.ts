import { useState, useEffect, useCallback } from "react";
import type { CommentsState, CommentData } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/*
  useComments manages all server interaction for a post's comments:
  - Fetching the comment list
  - Submitting a new comment
  - Voting (up or down) on a comment
*/
export function useComments(postId: string) {
    const [state, setState] = useState<CommentsState>({
        comments: [],
        loading: true,
        error: null,
        submitting: false,
    });

    // Fetch all comments for the given post from the backend
    const fetchComments = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const response = await fetch(`${API_URL}/posts/${postId}/comments`);
            if (!response.ok) throw new Error("Failed to fetch comments");
            const data = await response.json();
            setState(prev => ({ ...prev, comments: data.comments, loading: false }));
        } catch {
            setState(prev => ({ ...prev, error: "Could not load comments.", loading: false }));
        }
    }, [postId]);

    // Fetch comments when the component first mounts or postId changes
    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    /*
      submitComment — POST a new comment to the backend.
      On success, prepend the returned comment to the top of the list
      so the user sees their new comment immediately.
    */
    const submitComment = async (body: string, userId: string) => {
        setState(prev => ({ ...prev, submitting: true, error: null }));
        try {
            const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body, owner_user_id: userId }),
            });
            if (!response.ok) throw new Error("Failed to submit comment");
            const data = await response.json();
            setState(prev => ({
                ...prev,
                comments: [data.comment as CommentData, ...prev.comments],
                submitting: false,
            }));
        } catch {
            setState(prev => ({ ...prev, submitting: false, error: "Could not post comment." }));
        }
    };

    /*
      voteComment — POST an upvote or downvote to the backend.
      On success, update the vote count of that comment in local state
      without re-fetching the whole list.
    */
    const voteComment = async (commentId: string, direction: "up" | "down") => {
        try {
            const response = await fetch(`${API_URL}/comments/${commentId}/${direction}vote`, {
                method: "POST",
            });
            if (!response.ok) throw new Error("Failed to vote");
            const data = await response.json();
            setState(prev => ({
                ...prev,
                comments: prev.comments.map(c =>
                    c.id === commentId ? { ...c, votes: data.votes } : c
                ),
            }));
        } catch (err) {
            console.error("Vote error:", err);
        }
    };

    return { state, fetchComments, submitComment, voteComment };
}