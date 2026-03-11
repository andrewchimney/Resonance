"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AudioNotePlayer from "../../components/AudioNotePlayer";
import { Comments } from "../../components/Comments/Comments";

interface PublicUser {
  id: string;
  username: string;
  profile_picture: string | null;
  created_at: string | null;
}

interface Post {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  owner_user_id: string | null;
  preview_url: string | null;
  votes: number;
  preset_id: string | null;
  author?: { username: string; avatar?: string | null } | null;
}

const INITIAL_SHOW = 3;

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchUsername, setSearchUsername] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [profileUser, setProfileUser] = useState<PublicUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showCount, setShowCount] = useState(INITIAL_SHOW);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [savingPresetIds, setSavingPresetIds] = useState<Set<string>>(new Set());
  const [savedPresetIds, setSavedPresetIds] = useState<Set<string>>(new Set());

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const STORAGE_URL = supabaseUrl + "/storage/v1/object/public/";
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const supabase = useMemo(
    () => createClient(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUser(data.session?.user ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    if (!username) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const userRes = await fetch(
          `${API_URL}/users/by-username/${encodeURIComponent(username)}`
        );
        if (!userRes.ok) {
          setNotFound(true);
          return;
        }
        const userData = await userRes.json();
        const user = userData.user as PublicUser;
        setProfileUser(user);

        if (user.profile_picture) {
          setProfilePicUrl(`${STORAGE_URL}profile_pictures/${user.profile_picture}`);
        }

        const postsRes = await fetch(`${API_URL}/posts`);
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          const allPosts: Post[] = postsData.posts || [];
          const userPosts = allPosts
            .filter((p) => p.owner_user_id === user.id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setPosts(userPosts);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, API_URL, STORAGE_URL]);

  async function handleUsernameSearch(e: { preventDefault(): void }) {
    e.preventDefault();
    const trimmed = searchUsername.trim();
    if (!trimmed) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await fetch(`${API_URL}/users/by-username/${encodeURIComponent(trimmed)}`);
      if (!res.ok) { setSearchError("User not found"); return; }
      router.push(`/profile/${encodeURIComponent(trimmed)}`);
    } catch {
      setSearchError("Error searching for user");
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSavePreset(presetId: string | null, postOwnerUserId: string | null) {
    if (!presetId || !currentUser || !supabase) return;
    if (savingPresetIds.has(presetId) || savedPresetIds.has(presetId)) return;

    setSavingPresetIds((prev) => new Set(prev).add(presetId));
    try {
      const { data: preset, error: presetError } = await supabase
        .from("presets")
        .select("owner_user_id, title, supabase_key, preset_object_key, preview_object_key")
        .eq("id", presetId)
        .single();

      if (presetError || !preset) throw new Error("Failed to load preset details");

      const { error: insertError } = await supabase
        .from("saved_presets")
        .insert({
          owner_user_id: currentUser.id,
          creator_user_id: preset.owner_user_id ?? postOwnerUserId ?? null,
          title: preset.title,
          description: null,
          visibility: "public",
          supabase_key: preset.supabase_key,
          preset_object_key: preset.preset_object_key,
          preview_object_key: preset.preview_object_key,
          source: "saved",
        });

      if (insertError) throw new Error(insertError.message);
      setSavedPresetIds((prev) => new Set(prev).add(presetId));
    } catch (error) {
      console.error("Error saving preset:", error);
    } finally {
      setSavingPresetIds((prev) => { const next = new Set(prev); next.delete(presetId); return next; });
    }
  }

  async function handleVote(postId: string, direction: "up" | "down") {
    try {
      const res = await fetch(`${API_URL}/posts/${postId}/${direction}vote`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, votes: data.votes } : p));
    } catch {
      // silently ignore
    }
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  const visiblePosts = posts.slice(0, showCount);
  const hasMore = posts.length > showCount;

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/70 mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );

  if (notFound)
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-white text-2xl font-bold mb-2">User not found</p>
          <p className="text-white/60 mb-6">@{username} doesn&apos;t exist.</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
          >
            Go back
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 h-16 flex items-center justify-between gap-4 border-b border-zinc-200 bg-white/90 px-6 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
        <div
          className="cursor-pointer text-xl font-extrabold shrink-0"
          onClick={() => router.push("/")}
        >
          Resonance
        </div>

        <form onSubmit={handleUsernameSearch} className="flex flex-1 max-w-sm flex-col gap-0.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchUsername}
              onChange={(e: { target: { value: string } }) => { setSearchUsername(e.target.value); setSearchError(null); }}
              placeholder="Search user..."
              className="flex-1 px-3 py-1.5 rounded-lg text-sm bg-zinc-100 text-black placeholder-zinc-400 border border-zinc-300 focus:outline-none focus:border-zinc-500 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:border-zinc-700"
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-700 transition disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200 shrink-0"
            >
              {searchLoading ? "..." : "Search"}
            </button>
          </div>
          {searchError && <p className="text-xs text-red-500">{searchError}</p>}
        </form>

        <div className="flex items-center gap-6">
          <button onClick={() => router.push("/browse")} className="text-sm font-semibold hover:underline shrink-0">Browse</button>
          <button onClick={() => router.push("/generate")} className="text-sm font-semibold hover:underline shrink-0">Generate</button>
          {currentUser && (
            <button onClick={() => router.push("/profile")} className="text-sm font-semibold hover:underline shrink-0">My Profile</button>
          )}
        </div>
      </nav>

      {/* BACKGROUND */}
      <div
        className="relative flex-1"
        style={{ backgroundImage: "url('/bwire.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="min-h-full px-8 py-12 max-w-3xl mx-auto">

          {/* PROFILE HEADER */}
          <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-8 flex items-center gap-6">
            <img
              src={
                profilePicUrl ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser?.username || "U")}&background=888&color=fff&size=96`
              }
              className="h-24 w-24 rounded-full object-cover border-2 border-white/30 shadow-lg flex-shrink-0"
              alt={profileUser?.username}
            />
            <div>
              <h1 className="text-4xl font-extrabold text-white">{profileUser?.username}</h1>
              <p className="text-white/60 text-sm mt-1">Joined {formatDate(profileUser?.created_at)}</p>
            </div>
          </div>

          {/* POSTS SECTION */}
          <div>
            <div className="bg-black/50 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20 mb-6 inline-block">
              <h2 className="text-2xl font-bold text-white">Posts</h2>
            </div>

            {posts.length === 0 ? (
              <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
                <p className="text-white/70 text-lg">No posts yet.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  {visiblePosts.map((post) => (
                    <article
                      key={post.id}
                      className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      {/* Post Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex-shrink-0">
                          {post.author?.avatar ? (
                            <img
                              src={post.author.avatar}
                              alt={post.author.username}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                const el = e.currentTarget;
                                el.style.display = "none";
                                el.nextElementSibling?.removeAttribute("style");
                              }}
                            />
                          ) : null}
                          <svg
                            style={post.author?.avatar ? { display: "none" } : undefined}
                            className="h-5 w-5 text-zinc-600 dark:text-zinc-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-black dark:text-white">
                            {post.author?.username ? (
                              <Link href={`/profile/${encodeURIComponent(post.author.username)}`} className="hover:underline">
                                {post.author.username}
                              </Link>
                            ) : (
                              profileUser?.username ?? "Anonymous"
                            )}
                          </div>
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">{formatDate(post.created_at)}</div>
                        </div>
                      </div>

                      {/* Title + Description */}
                      <h2 className="text-xl font-semibold text-black dark:text-white mb-2">{post.title}</h2>
                      {post.description && (
                        <p className="text-zinc-700 dark:text-zinc-300 mb-4">{post.description}</p>
                      )}

                      {/* Audio Preview */}
                      {post.preview_url && (
                        <div className="mb-4">
                          <audio controls className="w-full h-10 rounded-lg" src={post.preview_url}>
                            Your browser does not support the audio element.
                          </audio>
                          <AudioNotePlayer audioPath={post.preview_url} buttonText="Test other notes" className="mt-2" />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        {/* Upvote */}
                        <button
                          onClick={() => handleVote(post.id, "up")}
                          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>

                        <span className="text-sm font-medium text-black dark:text-white min-w-[2rem] text-center">{post.votes}</span>

                        {/* Downvote */}
                        <button
                          onClick={() => handleVote(post.id, "down")}
                          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Comments */}
                        <button
                          onClick={() => setExpandedPostId((prev) => (prev === post.id ? null : post.id))}
                          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ml-4 cursor-pointer ${
                            expandedPostId === post.id
                              ? "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-white"
                              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>{expandedPostId === post.id ? "Hide Comments" : "Comments"}</span>
                        </button>
                        {/* Save */}
                        <button
                          onClick={() => handleSavePreset(post.preset_id, post.owner_user_id)}
                          disabled={
                            !post.preset_id ||
                            savingPresetIds.has(post.preset_id ?? "") ||
                            savedPresetIds.has(post.preset_id ?? "")
                          }
                          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition cursor-pointer ${
                            savedPresetIds.has(post.preset_id ?? "")
                              ? "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-white"
                              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {savingPresetIds.has(post.preset_id ?? "")
                            ? "Saving..."
                            : savedPresetIds.has(post.preset_id ?? "")
                              ? "Saved"
                              : "Save"}
                        </button>
                      </div>

                      {/* Comment Section */}
                      {expandedPostId === post.id && (
                        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                          <Comments postId={post.id} user={currentUser} />
                        </div>
                      )}
                    </article>
                  ))}
                </div>

                {/* SHOW MORE */}
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setShowCount((c) => c + 3)}
                      className="flex items-center gap-2 px-6 py-3 bg-black/50 backdrop-blur-sm border border-white/20 text-white rounded-full hover:bg-black/70 transition font-semibold"
                    >
                      Show more
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
