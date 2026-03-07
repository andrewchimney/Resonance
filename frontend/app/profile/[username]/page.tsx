"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import { useRouter, useParams } from "next/navigation";
import AudioPreview from "../../components/AudioPreview/AudioPreview";
import { parseVitalPreset } from "../../components/PresetViewer/parsePreset";
import type { ParsedPreset, RawVitalPreset } from "../../components/PresetViewer/types";

interface PublicUser {
  id: string;
  username: string;
  profile_picture: string | null;
  created_at: string | null;
}

interface PublicPreset {
  id: string;
  owner_user_id: string;
  creator_user_id: string | null;
  creator_username: string | null;
  description: string | null;
  title: string;
  visibility: string;
  preset_object_key: string;
  preview_object_key: string | null;
  source: string;
  created_at: string;
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
  const [presets, setPresets] = useState<PublicPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showCount, setShowCount] = useState(INITIAL_SHOW);
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [presetDetails, setPresetDetails] = useState<Record<string, ParsedPreset | null>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

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
          setProfilePicUrl(
            `${STORAGE_URL}profile_pictures/${user.profile_picture}`
          );
        }

        const presetsRes = await fetch(
          `${API_URL}/users/${user.id}/public-presets`
        );
        if (presetsRes.ok) {
          const presetsData = await presetsRes.json();
          setPresets(presetsData.presets || []);
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

  async function loadPresetDetails(preset: PublicPreset) {
    if (presetDetails[preset.id] !== undefined || loadingDetails[preset.id]) return;
    setLoadingDetails((prev) => ({ ...prev, [preset.id]: true }));
    try {
      const res = await fetch(`${STORAGE_URL}${preset.preset_object_key}`);
      if (res.ok) {
        const raw: RawVitalPreset = await res.json();
        setPresetDetails((prev) => ({ ...prev, [preset.id]: parseVitalPreset(raw) }));
      } else {
        setPresetDetails((prev) => ({ ...prev, [preset.id]: null }));
      }
    } catch {
      setPresetDetails((prev) => ({ ...prev, [preset.id]: null }));
    } finally {
      setLoadingDetails((prev) => ({ ...prev, [preset.id]: false }));
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

  const visiblePresets = presets.slice(0, showCount);
  const hasMore = presets.length > showCount;

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

        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => router.push("/generate")}
            className="text-sm font-semibold hover:underline"
          >
            Generate
          </button>
          {currentUser && (
            <button
              onClick={() => router.push("/profile")}
              className="text-sm font-semibold hover:underline"
            >
              My Profile
            </button>
          )}
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
        <div className="min-h-full px-8 py-12 max-w-5xl mx-auto">

          {/* PROFILE HEADER */}
          <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-8 flex items-center gap-6">
            <img
              src={
                profilePicUrl ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  profileUser?.username || "U"
                )}&background=888&color=fff&size=96`
              }
              className="h-24 w-24 rounded-full object-cover border-2 border-white/30 shadow-lg flex-shrink-0"
              alt={profileUser?.username}
            />
            <div>
              <h1 className="text-4xl font-extrabold text-white">
                {profileUser?.username}
              </h1>
              <p className="text-white/60 text-sm mt-1">
                Joined {formatDate(profileUser?.created_at)}
              </p>
            </div>
          </div>

          {/* PRESETS SECTION */}
          <div>
            <div className="bg-black/50 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20 mb-6 inline-block">
              <h2 className="text-2xl font-bold text-white">
                Saved Presets
              </h2>
            </div>

            {presets.length === 0 ? (
              <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
                <p className="text-white/70 text-lg">
                  No public presets shared yet.
                </p>
              </div>
            ) : (
              <>
                {/* PRESET GRID — 3 cols desktop, 1 col mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-start">
                  {visiblePresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="bg-black/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg overflow-hidden flex flex-col"
                    >
                      {/* Card Header */}
                      <div className="p-4 pb-2">
                        <h3 className="text-white font-bold text-base leading-snug line-clamp-2">
                          {preset.title || "Untitled Preset"}
                        </h3>
                        <p className="text-white/50 text-sm mt-1">
                          by{" "}
                          {preset.creator_username ||
                            preset.description ||
                            profileUser?.username ||
                            "Unknown"}
                        </p>
                      </div>

                      {/* Audio Preview */}
                      <div className="px-4 py-2">
                        {preset.preview_object_key ? (
                          <audio
                            controls
                            className="w-full h-8 rounded"
                            src={`${STORAGE_URL}${preset.preview_object_key}`}
                          />
                        ) : (
                          <div className="h-8 flex items-center text-white/30 text-xs">
                            No preview available
                          </div>
                        )}
                      </div>

                      {/* Show Details Toggle */}
                      <div className="px-4 pb-4 mt-auto">
                        <button
                          onClick={() => {
                            const newId = expandedPresetId === preset.id ? null : preset.id;
                            setExpandedPresetId(newId);
                            if (newId) loadPresetDetails(preset);
                          }}
                          className="text-white/60 text-xs hover:text-white transition flex items-center gap-1"
                        >
                          {expandedPresetId === preset.id ? (
                            <>
                              Hide details
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </>
                          ) : (
                            <>
                              Show details
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          )}
                        </button>

                        {expandedPresetId === preset.id && (
                          loadingDetails[preset.id] ? (
                            <div className="mt-2 pt-2 border-t border-white/20">
                              <p className="text-white/30 text-xs">Loading...</p>
                            </div>
                          ) : presetDetails[preset.id] ? (
                            <AudioPreview preset={presetDetails[preset.id]!} />
                          ) : presetDetails[preset.id] === null ? (
                            <div className="mt-2 pt-2 border-t border-white/20">
                              <p className="text-white/30 text-xs">Details unavailable</p>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* SHOW MORE BUTTON */}
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setShowCount((c) => c + 3)}
                      className="flex items-center gap-2 px-6 py-3 bg-black/50 backdrop-blur-sm border border-white/20 text-white rounded-full hover:bg-black/70 transition font-semibold"
                    >
                      Show more
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
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
