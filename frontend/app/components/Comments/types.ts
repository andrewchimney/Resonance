// Type definitions for the Comments component

// The author info joined onto a comment response from the API
export interface CommentAuthor {
    username: string;          // Display name of the commenter
    avatar_url: string | null; // Profile picture URL — null if not set, falls back to initials
}

// Mirrors the `comments` table in schema.sql, with the author joined in
export interface CommentData {
    id: string;                    // UUID of the comment
    owner_user_id: string | null;  // UUID of the user who posted the comment
    post_id: string;               // UUID of the post this comment belongs to
    body: string;                  // The actual comment text
    visibility: string;            // "public" or otherwise
    created_at: string;            // ISO timestamp string
    votes: number;                 // Net vote count (upvotes - downvotes)
    preset_id: string | null;      // Optional linked preset UUID
    author?: CommentAuthor | null; // Joined author info from the users table

    // New: Pin and heart features for post owners
    is_pinned?: boolean;          // Whether the comment is pinned by the post owner
    is_owner_hearted?: boolean;   // Whether the comment is hearted by the post owner
}

// Tracks the full state managed by useComments
export interface CommentsState {
    comments: CommentData[]; // The list of comments for a post
    loading: boolean;        // Whether comments are currently being fetched
    error: string | null;    // Any fetch or submit error message
    submitting: boolean;     // Whether a new comment is currently being submitted
}