import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSupabase } from "./supabase";

/**
 * SOCIAL SHARED HELPERS (brief 2.4)
 * =========================================================
 * Every social screen (Network / Feed / Messages) is
 * self-contained, but they all need the same two things:
 * the restored Supabase session and a few tiny formatting
 * helpers. This module is that single source of truth.
 *
 * The Supabase client is created with persistSession
 * disabled, so after an app restart the session is restored
 * from the copy Login saves in AsyncStorage
 * (careerAI_supabase_session — the same key useNotifications
 * restores, so both features share one session).
 */

export const SUPABASE_SESSION_KEY = "careerAI_supabase_session";

/**
 * Restores the Supabase session (in-memory first, then from
 * AsyncStorage) and returns { supabase, userId } or null when
 * the user is not signed in on the backend.
 */
export async function ensureSupabaseSession() {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  try {
    // 1. In-memory session first.
    const { data: sessionData } = await supabase.auth.getSession();
    let userId = sessionData?.session?.user?.id || null;

    // 2. Otherwise restore the persisted session.
    if (!userId) {
      const saved = await AsyncStorage.getItem(SUPABASE_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.access_token && parsed?.refresh_token) {
          const { data: restored, error } = await supabase.auth.setSession({
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
          });
          if (!error) {
            userId = restored?.user?.id || null;
          }
        }
      }
    }

    if (!userId) {
      return null;
    }

    return { supabase, userId };
  } catch {
    return null;
  }
}

/**
 * Loads the signed-in user's own profiles row.
 */
export async function fetchMyProfile(supabase, userId) {
  if (!supabase || !userId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Best display name for a profiles row (student/alumni OR business).
 */
export function displayName(profileRow) {
  return (
    profileRow?.full_name ||
    profileRow?.company_name ||
    "Member"
  );
}

/**
 * Role label shown on cards across the social screens.
 */
export function roleLabel(role) {
  if (role === "alumni") return "Alumni";
  if (role === "business") return "Business";
  if (role === "admin") return "Admin";
  return "Student";
}

/**
 * "2 h ago" style timestamps for posts / messages.
 */
export function timeAgo(isoString) {
  if (!isoString) return "";
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(isoString).toLocaleDateString();
}
