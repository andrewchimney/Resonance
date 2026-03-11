"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AudioNotePlayer from "../components/AudioNotePlayer";
import { Comments } from "../components/Comments/Comments";
import { PresetViewer, parseVitalPreset } from "../components/PresetViewer";
import type { ParsedPreset } from "../components/PresetViewer/types";

interface UserProfile {
  username: string | null;
  created_at?: string;
}

interface SavedPresetData {
  id: string;
  owner_user_id: string;
  creator_user_id: string | null;
  title: string;
  description: string | null;
  visibility: string;
  preset_object_key: string;
  preview_object_key: string | null;
  source: string;
  created_at: string;
}

interface PostData {
  id: string;
  owner_user_id: string | null;
  preset_id: string | null;
  title: string;
  description: string | null;
  visibility: string;
  created_at: string;
  votes: number;
  author?: {
    username: string;
  } | null;
  preview_object_key?: string | null;
  preview_url?: string | null;
}


const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAccountPopup, setShowAccountPopup] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [showPreferencesPopup, setShowPreferencesPopup] = useState(false);
  const [generationPreferences, setGenerationPreferences] = useState("");
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  //states History and Posts
  const [showHistoryPopup, setShowHistoryPopup] = useState(false);
  const [showPostsPopup, setShowPostsPopup] = useState(false);
  const [presets, setPresets] = useState<SavedPresetData[]>([]);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [creatorUsernames, setCreatorUsernames] = useState<Record<string, string>>({});
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [expandedHistoryPresetId, setExpandedHistoryPresetId] = useState<string | null>(null);
  const [expandedPostPresetId, setExpandedPostPresetId] = useState<string | null>(null);
  const [historyPresetDataCache, setHistoryPresetDataCache] = useState<Record<string, ParsedPreset | "loading" | "error">>({});
  const [postPresetDataCache, setPostPresetDataCache] = useState<Record<string, ParsedPreset | "loading" | "error">>({});

  const [searchUsername, setSearchUsername] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = useMemo(
    () => createClient(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey]
  );
  
  useEffect(() => {
    let mounted = true;
    // UNAUTHHENTICATED USER REDIRECT BACK TO LANDING PAGE
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;

      const currentUser = data.session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setIsLoading(false);
        router.push("/");
        return;
      }

      // PROFILE PICTURE 
      const { data: profile } = await supabase
        .from("users")
        .select("profile_picture, username, generation_preferences, created_at")
        .eq("id", currentUser.id)
        .single();

      if (profile?.profile_picture) {
        const { data } = supabase.storage
          .from("profile_pictures")
          .getPublicUrl(profile.profile_picture);
        setProfileUrl(data.publicUrl);
      }
      
      setUserProfile({
        username: profile?.username || null,
        created_at: profile?.created_at
      });
      
      if (profile?.username) {
        setNewUsername(profile.username);
      }
      
      if (profile?.generation_preferences) {
        setGenerationPreferences(profile.generation_preferences);
      }

      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          router.push("/");
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, router]);

  ///HANDES PROFILE PICTURE UPLOAD
  
  async function uploadProfilePicture(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file || !user) return;

      const filePath = `${user.id}/${Date.now()}-${file.name}`;

      await supabase.storage
        .from("profile_pictures")
        .upload(filePath, file, { upsert: true });

      await supabase
        .from("users")
        .update({ profile_picture: filePath })
        .eq("id", user.id);

      const { data } = supabase.storage
        .from("profile_pictures")
        .getPublicUrl(filePath);

      setProfileUrl(data.publicUrl);
    } finally {
      setUploading(false);
    }
  }

  //GET FOR ACCOUNNT INFO

  async function fetchAccountData() {
    if (!user) return;
    
    try {
      setLoadingAccount(true);
      
      // Fetch user profile data
      const { data: profile } = await supabase
        .from("users")
        .select("username, created_at")
        .eq("id", user.id)
        .single();

      setUserProfile({
        username: profile?.username || null,
        created_at: profile?.created_at
      });
      
      if (profile?.username) {
        setNewUsername(profile.username);
      }
      
    } catch (error) {
      console.log("Error in account data fetch:", error);
    } finally {
      setLoadingAccount(false);
    }
  }
  //GET FOR PREFERENCES
  async function fetchPreferencesData() {
    if (!user) return;
    
    try {
      setLoadingPreferences(true);
      const { data } = await supabase
        .from("users")
        .select("generation_preferences")
        .eq("id", user.id)
        .single();

      setGenerationPreferences(data?.generation_preferences || "");
    } catch (error) {
      console.log("Error fetching preferences:", error);
    } finally {
      setLoadingPreferences(false);
    }
  }

  //HANDLES SAVED PRESTES FOR HISTORY
 async function fetchPresetsData() {
  if (!user) return;

  try {
    setLoadingPresets(true);
    let associatedPresets: SavedPresetData[] = [];

    const { data: associatedRows, error: associatedError } = await supabase
      .from("saved_presets")
      .select(
        "id, owner_user_id, creator_user_id, title, description, visibility, preset_object_key, preview_object_key, source, created_at"
      )
      .or(`owner_user_id.eq.${user.id},creator_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (associatedError) {
      const savedPresetsUrl = API_URL
        ? `${API_URL}/users/${user.id}/saved-presets`
        : `http://localhost:8000/api/users/${user.id}/saved-presets`;

      const response = await fetch(savedPresetsUrl);
      if (!response.ok) throw new Error("Failed to fetch presets");
      const data = await response.json();
      associatedPresets = data.presets || [];
    } else {
      associatedPresets = (associatedRows || []) as SavedPresetData[];
    }

    const creatorIds = Array.from(
      new Set(
        associatedPresets
          .map((preset) => preset.creator_user_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (creatorIds.length > 0) {
      const { data: creatorRows, error: creatorError } = await supabase
        .from("users")
        .select("id, username")
        .in("id", creatorIds);

      let creatorMap: Record<string, string> = {};

      if (!creatorError && creatorRows) {
        for (const creator of creatorRows as Array<{ id: string; username: string | null }>) {
          if (creator.username) {
            creatorMap[creator.id] = creator.username;
          }
        }
      }

      const unresolvedCreatorIds = creatorIds.filter((id) => !creatorMap[id]);
      if (unresolvedCreatorIds.length > 0) {
        const postsApiUrl = API_URL ? `${API_URL}/posts` : "http://localhost:8000/api/posts";
        const postsRes = await fetch(postsApiUrl);
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          const posts = (postsData.posts || []) as Array<{
            owner_user_id?: string | null;
            author?: { username?: string | null } | null;
          }>;

          for (const post of posts) {
            if (post.owner_user_id && post.author?.username && unresolvedCreatorIds.includes(post.owner_user_id)) {
              creatorMap[post.owner_user_id] = post.author.username;
            }
          }
        }
      }

      setCreatorUsernames(creatorMap);
    } else {
      setCreatorUsernames({});
    }

    setPresets(associatedPresets);
  } catch (error) {
    console.log("Error fetching presets:", error);
    setPresets([]);
    setCreatorUsernames({});
  } finally {
    setLoadingPresets(false);
  }
}

  async function removeSavedPreset(savedPresetId: string) {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("saved_presets")
        .delete()
        .eq("id", savedPresetId)
        .eq("owner_user_id", user.id);

      if (error) throw error;

      setPresets((prev) => prev.filter((preset) => preset.id !== savedPresetId));
    } catch (error) {
      console.log("Error removing saved preset:", error);
    }
  }

  async function fetchPostsData() {
    if (!user) return;
    
    try {
      setLoadingPosts(true);
      const postsApiUrl = API_URL ? `${API_URL}/posts` : "http://localhost:8000/api/posts";
      const response = await fetch(postsApiUrl);
      if (!response.ok) throw new Error("Failed to fetch posts");
      
      const data = await response.json();

      const { data: associatedPresets } = await supabase
        .from("presets")
        .select("id")
        .or(`owner_user_id.eq.${user.id},creator_user_id.eq.${user.id}`);

      const associatedPresetIds = new Set(
        (associatedPresets || []).map((preset: { id: string }) => preset.id)
      );
      const normalizedUsername = userProfile?.username?.trim().toLowerCase();

      const associatedPosts =
        data.posts?.filter((post: PostData) => {
        const isOwner = post.owner_user_id === user.id;
        const isFromAssociatedPreset = Boolean(post.preset_id && associatedPresetIds.has(post.preset_id));
        const isSameAuthorUsername =
          Boolean(normalizedUsername) &&
          Boolean(post.author?.username) &&
          post.author?.username.toLowerCase() === normalizedUsername;

        return isOwner || isFromAssociatedPreset || isSameAuthorUsername;
        }) || [];

      setPosts(associatedPosts);
    } catch (error) {
      console.log("Error fetching posts:", error);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }

  async function handleVote(postId: string, direction: "up" | "down") {
    const voteApiUrl = API_URL
      ? `${API_URL}/posts/${postId}/${direction}vote`
      : `http://localhost:8000/api/posts/${postId}/${direction}vote`;

    try {
      const response = await fetch(voteApiUrl, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setPosts((prev: PostData[]) =>
          prev.map((post: PostData) =>
            post.id === postId ? { ...post, votes: data.votes } : post
          )
        );
      }
    } catch (error) {
      console.error("Error voting:", error);
    }
  }

  async function savePreferences() {
    if (!user) return;
    
    try {
      setSavingPreferences(true);
      const { error } = await supabase
        .from("users")
        .update({ generation_preferences: generationPreferences.trim() })
        .eq("id", user.id);

      if (error) throw error;
      
    } catch (error) {
      console.log("Failed to save preferences:", error);
    } finally {
      setSavingPreferences(false);
    }
  }

  async function saveUsername() {
    if (!user || !newUsername.trim()) return;
    
    try {
      setSavingUsername(true);
      const { error } = await supabase
        .from("users")
        .update({ username: newUsername.trim() })
        .eq("id", user.id);

      if (error) throw error;

      // Update user profile data
      setUserProfile(prev => prev ? {
        ...prev,
        username: newUsername.trim()
      } : {
        username: newUsername.trim(),
        created_at: undefined
      });
      
      setEditingUsername(false);
    } catch (error) {
      console.log("Failed to update username:", error);
    } finally {
      setSavingUsername(false);
    }
  }

  const handleAccountClick = async () => {
    if (!showAccountPopup) {
      await fetchAccountData();
    }
    setShowAccountPopup(!showAccountPopup);
  };

  const handlePreferencesClick = async () => {
    if (!showPreferencesPopup) {
      await fetchPreferencesData();
    }
    setShowPreferencesPopup(!showPreferencesPopup);
  };

  const handleHistoryClick = async () => {
    if (!showHistoryPopup) {
      await fetchPresetsData();
    }
    setShowHistoryPopup(!showHistoryPopup);
  };

  const handlePostsClick = async () => {
    if (!showPostsPopup) {
      await fetchPostsData();
    }
    setShowPostsPopup(!showPostsPopup);
  };

  const closeAccountPopup = () => {
    setShowAccountPopup(false);
  };

  const closePreferencesPopup = () => {
    setShowPreferencesPopup(false);
  };

  const closeHistoryPopup = () => {
    setShowHistoryPopup(false);
    setExpandedHistoryPresetId(null);
  };

  const closePostsPopup = () => {
    setShowPostsPopup(false);
    setExpandedPostId(null);
    setExpandedPostPresetId(null);
  };

  const handleToggleComments = (postId: string) => {
    setExpandedPostId((prev) => (prev === postId ? null : postId));
  };

  const handleToggleHistoryPresetDetails = async (savedPresetId: string) => {
    if (!user) return;

    if (expandedHistoryPresetId === savedPresetId) {
      setExpandedHistoryPresetId(null);
      return;
    }

    setExpandedHistoryPresetId(savedPresetId);

    if (historyPresetDataCache[savedPresetId]) return;

    setHistoryPresetDataCache((prev) => ({ ...prev, [savedPresetId]: "loading" }));
    try {
      const baseApi = API_URL ?? "http://localhost:8000/api";
      const res = await fetch(`${baseApi}/saved-presets/${user.id}/${savedPresetId}/data`);
      if (!res.ok) throw new Error("Failed to fetch preset");
      const rawPreset = await res.json();
      const parsed = parseVitalPreset(rawPreset);
      setHistoryPresetDataCache((prev) => ({ ...prev, [savedPresetId]: parsed }));
    } catch {
      setHistoryPresetDataCache((prev) => ({ ...prev, [savedPresetId]: "error" }));
    }
  };

  const handleTogglePostPresetDetails = async (post: PostData) => {
    if (!post.preset_id) return;

    if (expandedPostPresetId === post.id) {
      setExpandedPostPresetId(null);
      return;
    }

    setExpandedPostPresetId(post.id);

    if (postPresetDataCache[post.preset_id]) return;

    setPostPresetDataCache((prev) => ({ ...prev, [post.preset_id!]: "loading" }));
    try {
      const baseApi = API_URL ?? "http://localhost:8000/api";
      const res = await fetch(`${baseApi}/presets/${post.preset_id}/data`);
      if (!res.ok) throw new Error("Failed to fetch preset");
      const rawPreset = await res.json();
      const parsed = parseVitalPreset(rawPreset);
      setPostPresetDataCache((prev) => ({ ...prev, [post.preset_id!]: parsed }));
    } catch {
      setPostPresetDataCache((prev) => ({ ...prev, [post.preset_id!]: "error" }));
    }
  };

  async function handleUsernameSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchUsername.trim();
    if (!trimmed) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${API_URL}/users/by-username/${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        setSearchError("User not found");
        return;
      }
      router.push(`/profile/${encodeURIComponent(trimmed)}`);
    } catch {
      setSearchError("Error searching for user");
    } finally {
      setSearchLoading(false);
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not available";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const resolveStorageAssetUrl = (
    objectKey: string | null | undefined,
    bucket: "presets" | "previews"
  ) => {
    if (!objectKey) return null;
    if (/^https?:\/\//i.test(objectKey)) return objectKey;

    const normalized = objectKey.replace(/^\/+/, "");
    if (normalized.startsWith("presets/") || normalized.startsWith("previews/")) {
      return `${STORAGE_URL}${normalized}`;
    }

    return `${STORAGE_URL}${bucket}/${normalized}`;
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-black">
    {isLoading ? (
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/70 mb-4"></div>
        <p className="text-white text-lg">Loading...</p>
      </div>
    ) : (
      <p className="text-white text-lg">Redirecting to login...</p>
    )}
  </div>;

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
              onChange={(e) => { setSearchUsername(e.target.value); setSearchError(null); }}
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
          <button
            onClick={() => router.push("/browse")}
            className="text-sm font-semibold hover:underline shrink-0"
          >
            Browse
          </button>

          <button
            onClick={() => router.push("/generate")}
            className="text-sm font-semibold hover:underline shrink-0"
          >
            Generate
          </button>
        </div>
      </nav>

      {/* BACKGROUND */}
      <div
        className="relative flex-1"
        style={{
          backgroundImage: "url('/bwire.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* ACCOUNT INFORMATION */}
        {showAccountPopup && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={closeAccountPopup}
          >
            <div 
              className="relative max-w-md w-full mx-4 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{
                border: "2px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div 
                className="bg-black px-12 pt-12 pb-8"
              >
                <button
                  onClick={closeAccountPopup}
                  className="absolute top-6 right-6 text-3xl text-white/90 hover:text-white transition-colors duration-200"
                >
                  ×
                </button>
                  <div className="text-center mb-6">
                  <span className="text-4xl font-extrabold text-white">
                    Account Information
                  </span>
                </div>
              </div>
              <div 
                className="px-12 pb-12"
                style={{
                  backgroundImage: "url('/bwire2.jpg')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {loadingAccount ? (
                  <div className="text-center pt-4">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/70 mb-4"></div>
                    <div className="text-center">
                      <span className="text-xl font-semibold text-white">
                        Loading account information...
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 pt-4">
                    <div className="bg-white/95 backdrop-blur-sm p-6 border border-white/30 shadow-lg">
                      <div className="text-lg font-bold text-zinc-800 mb-3">
                        Change Username
                      </div>
                      {editingUsername ? (
                        <div className="flex flex-col gap-3">
                          <input
                            type="text"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className="w-full px-4 py-3 border border-zinc-300 bg-zinc-50 text-base text-black placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
                            placeholder="Enter new username"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveUsername}
                              disabled={savingUsername || !newUsername.trim()}
                              className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
                            >
                              {savingUsername ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={() => {
                                setEditingUsername(false);
                                setNewUsername(userProfile?.username || "");
                              }}
                              className="flex-1 px-4 py-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="text-xl text-zinc-700 font-medium">
                            {userProfile?.username || user.user_metadata?.username || user.email?.split('@')[0] || "Not set"}
                          </div>
                          <button
                            onClick={() => setEditingUsername(true)}
                            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-900 text-white font-semibold transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>

                  
                    <div className="bg-white/95 backdrop-blur-sm p-6 border border-white/30 shadow-lg">
                      <div className="text-lg font-bold text-zinc-800 mb-3">
                        Email
                      </div>
                      <div className="text-xl text-zinc-700 font-medium">
                        {user.email}
                      </div>
                    </div>
                    <div className="bg-white/95 backdrop-blur-sm p-6 border border-white/30 shadow-lg">
                      <div className="text-lg font-bold text-zinc-800 mb-3">
                        Member Since
                      </div>
                      <div className="text-xl text-zinc-700 font-medium">
                        {formatDate(userProfile?.created_at)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PREFERENCES */}
        {showPreferencesPopup && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={closePreferencesPopup}
          >
            <div 
              className="relative max-w-md w-full mx-4 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{
                border: "2px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div 
                className="bg-black px-12 pt-12 pb-8"
              >
                {/* CLOSE */}
                <button
                  onClick={closePreferencesPopup}
                  className="absolute top-6 right-6 text-3xl text-white/90 hover:text-white transition-colors duration-200"
                >
                  ×
                </button>
                
                {/* TITLE */}
                <div className="text-center mb-6">
                  <span className="text-4xl font-extrabold text-white">
                    Preferences
                  </span>
                </div>
                
                
              </div>
              
              <div 
                className="px-12 pb-12"
                style={{
                  backgroundImage: "url('/bwire2.jpg')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {loadingPreferences ? (
                  <div className="text-center pt-4">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/70 mb-4"></div>
                    <div className="text-center">
                      <span className="text-xl font-semibold text-white">
                        Loading preferences...
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 pt-4">
                    <div>
                      <textarea
                        value={generationPreferences}
                        onChange={(e) => setGenerationPreferences(e.target.value)}
                        className="w-full h-40 px-4 py-3 border border-zinc-300 bg-zinc-50 text-base text-black placeholder-zinc-500 focus:border-zinc-400 focus:outline-none resize-none"
                        placeholder="Rock, Jazz, Electronic, Ambient..."
                      />
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={savePreferences}
                          disabled={savingPreferences}
                          className="border border-zinc-300 bg-white px-8 py-3 text-base font-medium text-black transition hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingPreferences ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HISTORY  */}
        {showHistoryPopup && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={closeHistoryPopup}
          >
            <div 
              className="relative max-w-4xl w-full mx-4 overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              style={{
                border: "2px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div 
                className="bg-black px-12 pt-12 pb-8"
              >
                <button
                  onClick={closeHistoryPopup}
                  className="absolute top-6 right-6 text-3xl text-white/90 hover:text-white transition-colors duration-200"
                >
                  ×
                </button>
                <div className="text-center mb-6">
                  <span className="text-4xl font-extrabold text-white">
                    Saved Presets
                  </span>
                </div>
              </div>
              <div 
                className="relative px-12 pb-12 overflow-hidden"
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: "url('/bwire3.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "invert(1)",
                  }}
                />
                <div className="relative z-10">
                {loadingPresets ? (
                  <div className="text-center pt-4">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/70 mb-4"></div>
                    <div className="text-center">
                      <span className="text-xl font-semibold text-white">
                        Loading presets...
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 pt-4">
                    {presets.length === 0 ? (
                      <div className="bg-white/95 backdrop-blur-sm p-8 border border-white/30 shadow-lg">
                        <div className="text-center">
                          <span className="text-2xl font-bold text-zinc-800">
                            No presets found
                          </span>
                          <p className="text-lg text-zinc-600 mt-2">
                            You haven't saved any presets yet.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {presets.map((preset) => {
                          const previewUrl = resolveStorageAssetUrl(preset.preview_object_key, "previews");

                          return (
                            <div
                              key={preset.id}
                              className="w-full bg-zinc-900 p-6 border border-zinc-700 shadow-lg"
                            >
                              <div className="mb-2 flex items-center gap-3">
                                <h3 className="text-xl font-semibold text-white">
                                  {preset.title || "Untitled Preset"}
                                </h3>
                                {preset.creator_user_id && creatorUsernames[preset.creator_user_id] && (
                                  <span className="text-sm text-zinc-300">
                                    Posted by:{" "}
                                    <Link
                                      href={`/profile/${encodeURIComponent(creatorUsernames[preset.creator_user_id])}`}
                                      className="underline hover:text-white"
                                    >
                                      {creatorUsernames[preset.creator_user_id]}
                                    </Link>
                                  </span>
                                )}
                              </div>
                              {preset.description && (
                                <p className="text-zinc-300 mb-4">{preset.description}</p>
                              )}

                              {previewUrl ? (
                                <div className="mb-2">
                                  <audio
                                    controls
                                    className="w-full h-10 rounded-lg"
                                    src={previewUrl}
                                  >
                                    Your browser does not support the audio element.
                                  </audio>
                                  <div className="mt-2 flex items-center gap-3">
                                    <AudioNotePlayer
                                      audioPath={previewUrl}
                                      buttonText="Test other notes"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-zinc-400 italic">No preview available</div>
                              )}

                              <div className="mt-2 flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleHistoryPresetDetails(preset.id)}
                                  className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                                    expandedHistoryPresetId === preset.id
                                      ? "border-zinc-400 bg-zinc-700 text-white"
                                      : "border-zinc-600 text-zinc-200 hover:bg-zinc-800"
                                  }`}
                                >
                                  {expandedHistoryPresetId === preset.id ? "Hide Preset" : "View Preset"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeSavedPreset(preset.id)}
                                  className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-800"
                                >
                                  Remove
                                </button>
                              </div>

                              {expandedHistoryPresetId === preset.id && (
                                <div className="mt-4 pt-4 border-t border-zinc-700">
                                  {historyPresetDataCache[preset.id] === "loading" && (
                                    <div className="flex items-center justify-center py-6 text-sm text-zinc-300">
                                      Loading preset details...
                                    </div>
                                  )}
                                  {historyPresetDataCache[preset.id] === "error" && (
                                    <div className="flex items-center justify-center py-6 text-sm text-red-400">
                                      Failed to load preset details.
                                    </div>
                                  )}
                                  {historyPresetDataCache[preset.id] &&
                                    historyPresetDataCache[preset.id] !== "loading" &&
                                    historyPresetDataCache[preset.id] !== "error" && (
                                      <PresetViewer
                                        preset={historyPresetDataCache[preset.id] as ParsedPreset}
                                        presetName={preset.title}
                                        compact
                                      />
                                    )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* POSTS - HANDLED BY BROWSER STRUCTURE FOR COMMENTS */}
        {showPostsPopup && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={closePostsPopup}
          >
            <div 
              className="relative max-w-2xl w-full mx-4 overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              style={{
                border: "2px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div 
                className="bg-black px-12 pt-12 pb-8"
              >
                <button
                  onClick={closePostsPopup}
                  className="absolute top-6 right-6 text-3xl text-white/90 hover:text-white transition-colors duration-200"
                >
                  ×
                </button>
                <div className="text-center mb-6">
                  <span className="text-4xl font-extrabold text-white">
                    Your Posts
                  </span>
                </div>
              </div>
              <div 
                className="px-12 pb-12"
                style={{
                  backgroundImage: "url('/bwire2.jpg')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "invert(1)",
                }}
              >
                {loadingPosts ? (
                  <div className="text-center pt-4">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/70 mb-4"></div>
                    <div className="text-center">
                      <span className="text-xl font-semibold text-white">
                        Loading posts...
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 pt-4">
                    {posts.length === 0 ? (
                      <div className="bg-white/95 backdrop-blur-sm p-8 border border-white/30 shadow-lg">
                        <div className="text-center">
                          <span className="text-2xl font-bold text-zinc-800">
                            No posts found
                          </span>
                          <p className="text-lg text-zinc-600 mt-2">
                            No posts are associated with this account yet.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {posts.map((post) => (
                          <article
                            key={post.id}
                            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                          >
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
                                    {post.author?.username || userProfile?.username || "Anonymous"}
                                  </div>
                                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {formatDate(post.created_at)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <h2 className="text-xl font-semibold text-black dark:text-white mb-2">
                              {post.title}
                            </h2>
                            {post.description && (
                              <p className="text-zinc-700 dark:text-zinc-300 mb-4">{post.description}</p>
                            )}

                            {(post.preview_url || post.preview_object_key) && (
                              <div className="mb-4">
                                <audio
                                  controls
                                  className="w-full h-10 rounded-lg"
                                  src={post.preview_url || `${STORAGE_URL}${post.preview_object_key}`}
                                >
                                  Your browser does not support the audio element.
                                </audio>
                              </div>
                            )}

                            <div className="flex items-center gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
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

                              <span className="text-sm font-medium text-black dark:text-white min-w-[2rem] text-center">
                                {post.votes}
                              </span>

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

                              {post.preset_id && (
                                <button
                                  onClick={() => handleTogglePostPresetDetails(post)}
                                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition cursor-pointer ${
                                    expandedPostPresetId === post.id
                                      ? "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-white"
                                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                  }`}
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                                    />
                                  </svg>
                                  <span className="flex items-center gap-1">
                                    {expandedPostPresetId === post.id ? "Hide Preset" : "View Preset"}
                                    <svg
                                      className={`h-3.5 w-3.5 transition-transform ${expandedPostPresetId === post.id ? "rotate-180" : ""}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </span>
                                </button>
                              )}
                            </div>

                            {expandedPostPresetId === post.id && post.preset_id && (
                              <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                {postPresetDataCache[post.preset_id] === "loading" && (
                                  <div className="flex items-center justify-center py-6 text-sm text-zinc-500 dark:text-zinc-400">
                                    Loading preset details...
                                  </div>
                                )}
                                {postPresetDataCache[post.preset_id] === "error" && (
                                  <div className="flex items-center justify-center py-6 text-sm text-red-500 dark:text-red-400">
                                    Failed to load preset details.
                                  </div>
                                )}
                                {postPresetDataCache[post.preset_id] &&
                                  postPresetDataCache[post.preset_id] !== "loading" &&
                                  postPresetDataCache[post.preset_id] !== "error" && (
                                    <PresetViewer
                                      preset={postPresetDataCache[post.preset_id] as ParsedPreset}
                                      presetName={post.title}
                                      compact
                                    />
                                  )}
                              </div>
                            )}

                            {expandedPostId === post.id && (
                              <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                <Comments postId={post.id} user={user} />
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col items-start">
          <div className="w-full bg-black pt-4 pb-4">
            <h1 className="text-6xl font-extrabold text-white text-center">
              My Profile
            </h1>
          </div>

          <div className="flex justify-center w-full">
            <div className="h-full w-[420px] p-8 flex flex-col items-center">

            {/* PROFILE PICTURE  */}
            <div className="flex flex-col items-center mb-12">
              <img
                src={
                  profileUrl ??
                  "https://ui-avatars.com/api/?name=User&background=ccc"
                }
                className="h-44 w-44 rounded-full object-cover border mb-5 border-white/30 cursor-pointer hover:opacity-80 transition"
                onClick={() => fileInputRef.current?.click()}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={uploadProfilePicture}
              />

              {uploading && (
                <p className="text-white text-sm opacity-80 mt-2">
                  Uploading…
                </p>
              )}
            </div>

            {/* HISTORY, ACCOUNT INFORMATION, PREFERENCES AND POSTS BUTTONS*/}
            <div className="flex flex-col gap-6 w-full">
              <button
                onClick={handleHistoryClick}
                className="
                  group relative px-8 py-6
                  border-2 border-white/30
                  backdrop-invert mix-blend-difference
                  transition-all duration-300
                  active:scale-95
                "
              >
                <span className="text-2xl font-extrabold text-center block group-hover:backdrop-invert group-hover:mix-blend-difference">
                  History
                </span>
              </button>
              <button
                onClick={handleAccountClick}
                className="
                  group relative px-8 py-6
                  border-2 border-white/30
                  backdrop-invert mix-blend-difference
                  transition-all duration-300
                  active:scale-95
                "
              >
                <span className="text-xl font-extrabold text-center block leading-tight group-hover:backdrop-invert group-hover:mix-blend-difference">
                  Account Information
                </span>
              </button>
              <button
                onClick={handlePreferencesClick}
                className="
                  group border px-8 py-6
                  backdrop-invert mix-blend-difference
                  transition-all duration-300
                  active:scale-95
                "
              >
                <span className="text-xl font-extrabold text-center block group-hover:backdrop-invert group-hover:mix-blend-difference">
                  Preferences
                </span>
              </button>
              <button
                onClick={handlePostsClick}
                className="
                  group border px-8 py-6
                  backdrop-invert mix-blend-difference
                  transition-all duration-300
                  active:scale-95
                "
              >
                <span className="text-xl font-extrabold text-center block group-hover:backdrop-invert group-hover:mix-blend-difference">
                  Posts
                </span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
    </div>
  );
}