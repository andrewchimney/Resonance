"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import CreatePostDialog from "../components/CreatePost/CreatePostDialog";
import PostForm, { type PostFormValues } from "../components/CreatePost/PostForm";
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

import { Comments } from "../components/Comments/Comments";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/";

export default function BrowsePage() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postFormValues, setPostFormValues] = useState<PostFormValues>({
    title: "",
    description: "",
    preset_id: null,
    uploaded_file: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const router = useRouter();
  const searchParams = useSearchParams();

  // Open create post dialog if ?create=1 is in the URL
  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setShowCreatePost(true);
    }
  }, [searchParams]);


  // Supabase client for auth only
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseAnonKey, supabaseUrl]);

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setUser(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  // Fetch posts from backend API
  useEffect(() => {
    const fetchPosts = async () => {
      setPostsLoading(true);
      
      try {
        const url = searchQuery 
          ? `${API_URL}/posts?search=${encodeURIComponent(searchQuery)}`
          : `${API_URL}/posts`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch posts");
        
        const data = await response.json();
        setPosts(data.posts);
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
      
      setPostsLoading(false);
    };

    fetchPosts();
  }, [searchQuery]);

  // Handle upvote/downvote via backend API
  const handleVote = async (postId: string, direction: "up" | "down") => {
    if (!user) {
      setShowAuthPanel(true);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/posts/${postId}/${direction}vote`, {
        method: "POST",
      });
      
      if (response.ok) {
        const data = await response.json();
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

  const handleToggleComments = (postId: string) => {
    setExpandedPostId((prev) => (prev === postId ? null : postId));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDiscordLogin = async () => {
    if (!supabase) {
      setAuthError("Supabase not configured (set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY).");
      return;
    }

    setAuthError(null);
    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
      },
    });

    setAuthLoading(false);
    if (error) setAuthError(error.message);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setShowAuthPanel(false);
  };

  const handleCreatePostClick = () => {
    if (user) {
      setShowPostForm(true);
    } else {
      setShowCreatePost(true);
    }
  };

  const handleSubmitPost = async () => {
    if (!postFormValues.title.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let preset_id = postFormValues.preset_id;

      if (postFormValues.uploaded_file) {
        const fd = new FormData();
        fd.append("file", postFormValues.uploaded_file);
        if (user) {
          const { data: session } = await supabase!.auth.getSession();
          if (session.session?.access_token) {
            fd.append("access_token", session.session.access_token);
          }
        }
        const uploadRes = await fetch(`${API_URL}/api/presets/upload`, { method: "POST", body: fd });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          preset_id = uploadData.preset_id ?? preset_id;
        }
      }

      const res = await fetch(`${API_URL}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: postFormValues.title,
          description: postFormValues.description || null,
          preset_id,
          owner_user_id: user?.id ?? null,
          visibility: "public",
        }),
      });

      if (!res.ok) throw new Error("Failed to create post");

      setShowPostForm(false);
      setPostFormValues({ title: "", description: "", preset_id: null, uploaded_file: null });
      // Refresh posts
      const postsRes = await fetch(`${API_URL}/posts`);
      if (postsRes.ok) {
        const data = await postsRes.json();
        setPosts(data.posts);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      {/* Navbar */}
      <nav className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
        {/* Logo/Brand */}
        <Link href="/" className="text-xl font-semibold text-black dark:text-white hover:opacity-80 transition">
          Resonance
        </Link>
        
        {/* Search Box */}
        <div className="flex-1 mx-8 max-w-2xl">
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm text-black placeholder-zinc-500 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-400"
          />
        </div>
        
        {/* Generate and Profile */}
        <div className="relative flex items-center gap-6">
          <Link href="/generate" className="text-sm font-medium text-black transition-colors hover:text-zinc-600 hover:underline dark:text-white dark:hover:text-zinc-300 cursor-pointer">
            Generate
          </Link>
          {user ? (
            <button
              aria-label="Profile"
              onClick={() => setShowAuthPanel(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 transition-colors hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 cursor-pointer"
            >
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={user.email || "User"}
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
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
              )}
            </button>
          ) : (
            <button
              onClick={() => setShowAuthPanel(true)}
              className="text-sm font-medium text-black transition-colors hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300 cursor-pointer"
            >
              Log In
            </button>
          )}

          <button
            onClick={handleCreatePostClick}
            title="Create a post"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 transition-colors hover:bg-zinc-800 dark:bg-zinc-600 dark:hover:bg-zinc-500 cursor-pointer"
          >
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {showAuthPanel && (
            <div className="fixed right-6 top-16 z-50 w-80 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900">
              {!supabase && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  Supabase env vars missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
                </div>
              )}

              {supabase && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-black dark:text-white">Account</div>
                    <button
                      className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      onClick={() => setShowAuthPanel(false)}
                    >
                      Close
                    </button>
                  </div>
                    {user ? (
                   <div className="space-y-3">
                  <button
                    onClick={() => router.push("/profile")}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 text-left hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 w-full"
                    >
                    Signed in as <span className="font-medium">{user.email}</span>
                    </button>
                    <button
                    onClick={handleSignOut}
                  className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                          >
                        Sign out
                      </button>
                    </div>
                  ) : (

                    <div className="space-y-3">
                      <div className="text-sm text-zinc-700 dark:text-zinc-200">Sign in to continue</div>
                      <button
                        onClick={handleDiscordLogin}
                        disabled={authLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                      >
                        <span aria-hidden>💬</span>
                        {authLoading ? "Redirecting..." : "Continue with Discord"}
                      </button>
                      {authError && <div className="text-xs text-red-600 dark:text-red-400">{authError}</div>}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      <CreatePostDialog
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostAnonymously={() => { setShowCreatePost(false); setShowPostForm(true); }}
      />

      {showPostForm && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setShowPostForm(false)}>
          <div
            className="fixed left-1/2 top-1/2 z-50 w-[480px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-black dark:text-white">Create a Post</h2>
              <button onClick={() => setShowPostForm(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">✕</button>
            </div>
            <PostForm
              presets={[]}
              values={postFormValues}
              onChange={setPostFormValues}
              onSubmit={handleSubmitPost}
              isSubmitting={isSubmitting}
              error={submitError}
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

          {/* Posts List */}
          {postsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-zinc-500 dark:text-zinc-400">Loading posts...</div>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-zinc-500 dark:text-zinc-400">
                {searchQuery ? "No posts match your search" : "No posts yet. Be the first to share!"}
              </div>
            </div>
          ) : (
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
                          {post.author?.username ? (
                            <Link
                              href={`/profile/${encodeURIComponent(post.author.username)}`}
                              className="hover:underline"
                            >
                              {post.author.username}
                            </Link>
                          ) : (
                            "Anonymous"
                          )}
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

                    {/* Comment Toggle Button */}
                    <button
                        onClick={() => handleToggleComments(post.id)}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ml-4 cursor-pointer ${
                            expandedPostId === post.id
                                ? "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-white"
                                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        }`}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <span>{expandedPostId === post.id ? "Hide Comments" : "Comments"}</span>
                    </button>

                    {/* Comment Section — only rendered for the expanded post */}
                    {expandedPostId === post.id && (
                        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                          <Comments postId={post.id} user={user} />
                        </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}