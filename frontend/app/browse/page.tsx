"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

// Added import statement for new LoginPanel component with Discord OAuth authentication (Sprint 4 - User Story 5)
import LoginPanel from "@/app/components/Authentication/LoginPanel";

import { PresetViewer, parseVitalPreset, type ParsedPreset, type RawVitalPreset } from "../components/PresetViewer";

// Added import statement for PostForm for authenticated users to create posts
import PostForm, { type PostFormValues } from "@/app/components/CreatePost/PostForm";
import CreatePostDialog from "@/app/components/CreatePost/CreatePostDialog";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

interface Post {
  id: string;
  title: string;
  description: string | null;
  preset_id: string | null;
  created_at: string;
  owner_user_id: string | null;
  visibility: string;
  votes: number;
  author?: {
    username: string;
  } | null;
  preview_object_key: string | null;
}

// Backend API endpoints for posts, presets, votes
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Supabase storage bucket for uploaded files
const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/";


export default function BrowsePage() {
  // State management for user authentication and UI state
  const [user, setUser] = useState<User | null>(null);
  const [showAuthPanel, setShowAuthPanel] = useState(false);

  // All posts fetched from the backend API
  const [posts, setPosts] = useState<Post[]>([]);

  // Loading state for initial post fetch
  const [postsLoading, setPostsLoading] = useState(true);

  // User's search query for filtering posts by title/description
  const [searchQuery, setSearchQuery] = useState("");

  // Parsed preset data for compact preview in post
  const [parsedPresets, setParsedPresets] = useState<Record<string, ParsedPreset>>({});

  // Currently expanded post ID for full preset viewer
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  // Full preset data for expanded posts
  const [presetData, setPresetData] = useState<Record<string, ParsedPreset | null>>({});

  // Post ID that's currently loading preset data
  const [presetLoading, setPresetLoading] = useState<string | null>(null);

  // State for managing post creation dialog and form
  const [showCreatePostDialog, setShowCreatePostDialog] = useState(false);

  // Controls the visibility of the post creation form for authenticated users
  const [showPostForm, setShowPostForm] = useState(false);

  // Controls the feed type
  const [feedType, setFeedType] = useState("new");

  // Store current values being entered in the post form
  const [postFormValues, setPostFormValues] = useState<PostFormValues>({
    title: "",
    description: "",
    preset_id: null,
    uploaded_file: null,
  });

  // Error message to display if post creation fails
  const [postError, setPostError] = useState<string | null>(null);

  // Loading state for when the post form is being submitted
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Environment variables for Supabase authentication
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;


  // Create a Supabase client using the same structure as the profile page
  // useMemo will prevent recreating the client on every render
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    const { createClient } = require("@supabase/supabase-js");
    return createClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      handleCreatePostClick();
    }
  }, [searchParams, user]);

  useEffect(() => {
    const fetchPosts = async () => {
      setPostsLoading(true);

      try {
        let url = "";

        if (feedType === "recommended") {
          if (!user?.id) {
            setPosts([]);
            return;
          }
          url = `${API_URL}/feed?type=recommended&user_uuid=${user.id}`;
        } else {
          url = `${API_URL}/feed?type=${feedType}`;
        }

        if (searchQuery.trim()) {
          url += `&search=${encodeURIComponent(searchQuery)}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch posts");

        const data = await response.json();
        setPosts(data.posts || []);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    };

    fetchPosts();
  }, [feedType, searchQuery, user?.id]);

  // Fetch preset data when expanding a post
  const handleExpandPost = useCallback(async (post: Post) => {
    // Toggle off if already expanded
    if (expandedPostId === post.id) {
      setExpandedPostId(null);
      return;
    }

    setExpandedPostId(post.id);

    // Check if we already have the preset data
    if (presetData[post.id]) return;

    // Fetch preset if we have a preset_id
    if (!post.preset_id) return;

    setPresetLoading(post.id);
    try {
      // Use backend API to fetch preset data
      const response = await fetch(`${API_URL}/presets/${post.preset_id}/data`);
      if (!response.ok) {
        console.error("Preset fetch failed:", response.status, response.statusText);
        throw new Error("Failed to fetch preset");
      }

      // Parse and store the preset data for this post
      const rawPreset: RawVitalPreset = await response.json();
      const parsedPreset = parseVitalPreset(rawPreset);
      setPresetData((prev) => ({
        ...prev,
        [post.id]: parsedPreset
      }));
    } catch (error) {
      console.error("Error fetching preset data:", error);
      setPresetData((prev) => ({
        ...prev,
        [post.id]: null, // Set to null to indicate that preset data could not be loaded
      }));
    } finally {
      setPresetLoading(null);
    }
  }, [expandedPostId, presetData, API_URL]);

  // Handle upvote/downvote via backend API
  const handleVote = async (postId: string, direction: "up" | "down") => {
    if (!user) {
      setShowAuthPanel(true);
      return;
    }

    try {
      // Send vote request to backend API, which will handle updating the vote count
      const response = await fetch(`${API_URL}/posts/${postId}/${direction}vote`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        // Update vote count in local state based on response from backend
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, votes: data.votes } : p
          )
        );
      }
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  // Post Creation Handler
  /**
   * handleCreatePostClick
   * Purpose: Triggered when the user clicks the green + button to create a new post
   * - If the user is logged in, then open PostForm with the options
   *  1. Sign up: Navigates the user to signup page
   *  2. Post Anonymously: Opens the post form without login
   */

  const handleCreatePostClick = () => {
    if (user) {
      // Use is logged in, this will directly show post form
      setShowPostForm(true);
    } else {
      // Use is not logged in, show the create post dialog with options to sign up or post anonymously
      setShowCreatePostDialog(true);
    }
  };

  /**
   * handlePostAnonymously
   * Purpose: Called when the user clicks "Post Anonymously" button in the CreatePostDialog
   * - This will close the CreatePostDialog and open the PostForm which allows post creation without authentication
   * - Posts ill be submitted without owner_user_id and will be displayed as "Anonymous"
   */
  const handlePostAnonymously = () => {
    setShowCreatePostDialog(false);
    setShowPostForm(true);
  };

  /**
   * handleSubmitPost
   * Purpose: Handles form submission when the user clicks "Create Post" button
   * - This will validate the form inputs, create form data objects with all fields and send post request to backend API
   * - If successful, the new post will be added to the top of the posts feed, it will reset the form fields, close the post form, and show a succes message
   * - If there is an error durng submission, it wil display an error message in the form and keep the form open so the user can retry
   */
  const handleSubmitPost = async () => {
    // Validate that the title is not empty
    if (!postFormValues.title.trim()) {
      setPostError("Title is required");
      return;
    }

    setIsSubmitting(true);
    setPostError(null);

    try {
      // Prepare form data for submission
      const formData = new FormData();
      formData.append("title", postFormValues.title);
      formData.append("description", postFormValues.description);

      // Only append a preset_id if one was selected in the form
      if (postFormValues.preset_id) {
        formData.append("preset_id", postFormValues.preset_id);
      }

      // Only append a file if one was uploaded in the form
      if (postFormValues.uploaded_file) {
        formData.append("preset_file", postFormValues.uploaded_file);
      }

      // Send post request to backend API
      const response = await fetch(`${API_URL}/posts`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create post");
      }

      // If successful, add the new post to the top of the feed
      const newPost = await response.json();

      // Add new post to the top of the posts feed
      setPosts([newPost, ...posts]);

      // Reset the form fields
      setShowPostForm(false);
      setPostFormValues({
        title: "",
        description: "",
        preset_id: null,
        uploaded_file: null,
      });
      setPostError(null);

      // Show a success message
      alert("Post created successfully!");
    } catch (error) {
      console.error("Error creating post:", error);
      setPostError(error instanceof Error ? error.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * handleClosePostForm
   * Purpose: Called when the user clicks the "close" button in the post form or clicks outside the form area
   * - This will hide the post form and reset all form fields and error messages 
   * - This is done for the next time the user wants to create a post
   */
  const handleClosePostForm = () => {
    setShowPostForm(false);
    setPostFormValues({
      title: "",
      description: "",
      preset_id: null,
      uploaded_file: null,
    });
    setPostError(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 0) return "just now";

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
    return `${diffYears} yr${diffYears === 1 ? "" : "s"} ago`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      {/* Navbar */}
      <Navbar
        user={user}
        onLoginClick={() => setShowAuthPanel(true)}
        onProfileClick={() => setShowAuthPanel((open) => !open)}
        onCreatePost={handleCreatePostClick}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />


      {/* Create Post Dialog - Show when non-authenticated users try to create a post */}
      <CreatePostDialog
        isOpen={showCreatePostDialog}
        onClose={() => setShowCreatePostDialog(false)}
        onPostAnonymously={handlePostAnonymously}
      />

      {/* Create Post Form - shown when user chooses to create a post */}
      {showPostForm && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-black dark:text-white">
                Create a Post
              </h2>
              <button
                onClick={handleClosePostForm}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <PostForm
              presets={[]}
              values={postFormValues}
              onChange={setPostFormValues}
              onSubmit={handleSubmitPost}
              isSubmitting={isSubmitting}
              error={postError}
              isAuthenticated={!!user}
            />
          </div>
        </div>
      )}

      {/* Main Content - Posts Feed */}
      <main className="flex flex-1 w-full justify-center bg-white dark:bg-black px-8 py-8">
        <div className="w-full max-w-2xl">

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-black dark:text-white">Browse</h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">Discover synth presets shared by the community</p>
          </div>

          <div className="mb-6 flex gap-2">
            {[
              { key: "new", label: "New" },
              { key: "trending", label: "Trending" },
              { key: "recommended", label: "For You" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key === "recommended" && !user) {
                    setShowAuthPanel(true);
                    return;
                  }
                  setFeedType(tab.key);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${feedType === tab.key
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>


          {/* Posts List */}
          {postsLoading ? (
            // Loading state while fetching posts from backend API
            <div className="flex items-center justify-center py-12">
              <div className="text-zinc-500 dark:text-zinc-400">Loading posts...</div>
            </div>
          ) : posts.length === 0 ? (
            // Empty state when there are no posts to display (either none exists or search returned nothing)
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-zinc-500 dark:text-zinc-400">
                {searchQuery ? "No posts match your search" : "No posts yet. Be the first to share!"}
              </div>
            </div>
          ) : (
            // Success state - display list of posts fetched from backend API
            <div className="space-y-6">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                        <svg
                          className="h-5 w-5 text-zinc-600 dark:text-zinc-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-black dark:text-white">
                          {post.author?.username || "Anonymous"}
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">
                          {formatDate(post.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  <h2 className="text-xl font-semibold text-black dark:text-white mb-2">
                    {post.title}
                  </h2>
                  {post.description && (
                    <p className="text-zinc-700 dark:text-zinc-300 mb-4">{post.description}</p>
                  )}

                  {/* Audio Player - from preset's preview */}
                  {post.preview_object_key && (
                    <div className="mb-4">
                      <audio
                        controls
                        className="w-full h-10 rounded-lg"
                        src={`${STORAGE_URL}${post.preview_object_key}`}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    {/* Upvote Button */}
                    <button
                      onClick={() => handleVote(post.id, "up")}
                      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>

                    {/* Vote Count */}
                    <span className="text-sm font-medium text-black dark:text-white min-w-[2rem] text-center">
                      {post.votes}
                    </span>

                    {/* Downvote Button */}
                    <button
                      onClick={() => handleVote(post.id, "down")}
                      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Comment Button (placeholder for now) */}
                    <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition ml-4">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <span>Comments</span>
                    </button>
                  </div>

                  {/* Preset Viewer - Expandable */}
                  {expandedPostId === post.id && (
                    <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                      {presetLoading === post.id ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-zinc-500 dark:text-zinc-400">Loading preset...</div>
                        </div>
                      ) : presetData[post.id] ? (
                        // Preset data loaded successfully and will display the full preset view with all details and parameters
                        <PresetViewer
                          preset={presetData[post.id]!}
                          presetName={post.title.split(' - ')[0]}
                          uploadDate={new Date(post.created_at)}
                        />
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-zinc-500 dark:text-zinc-400">Could not load preset data</div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <footer >
        <Footer />
      </footer>
    </div>
  );
}