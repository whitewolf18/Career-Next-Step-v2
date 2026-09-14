import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "./supabase";

/**
 * REAL-TIME NOTIFICATIONS HOOK (brief 2.8)
 * =========================================================
 * Loads the signed-in user's notifications and keeps them live
 * through a Supabase Realtime WebSocket subscription. Database
 * triggers (job match, application, connection, comment) insert
 * the rows — this hook simply mirrors them the moment they land.
 *
 * The Supabase client is created with persistSession disabled, so
 * after an app restart the session is restored from the copy that
 * Login saves in AsyncStorage (see careerAI_supabase_session).
 */

const SESSION_KEY = "careerAI_supabase_session";
const PAGE_SIZE = 30;

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ready, setReady] = useState(false);
  const userIdRef = useRef(null);

  const applyRows = useCallback((rows) => {
    const list = (rows || []).map((row) => ({
      ...row,
      id: String(row.id),
    }));
    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.read_at).length);
  }, []);

  useEffect(() => {
    let active = true;
    let channel = null;

    async function start() {
      const supabase = getSupabase();
      if (!supabase) {
        setReady(true);
        return;
      }

      try {
        // 1. Session: in-memory first, otherwise restore from storage.
        const { data: sessionData } = await supabase.auth.getSession();
        let userId = sessionData?.session?.user?.id || null;

        if (!userId) {
          const saved = await AsyncStorage.getItem(SESSION_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.access_token && parsed?.refresh_token) {
              const { data: restored, error: restoreError } =
                await supabase.auth.setSession({
                  access_token: parsed.access_token,
                  refresh_token: parsed.refresh_token,
                });
              if (!restoreError) {
                userId = restored?.user?.id || null;
              }
            }
          }
        }

        if (!userId || !active) {
          setReady(true);
          return;
        }
        userIdRef.current = userId;

        // 2. Initial load. RLS guarantees only the owner's rows return.
        const { data, error } = await supabase
          .from("notifications")
          .select("id, type, title, body, link, read_at, created_at")
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);

        if (!active) return;
        if (!error) {
          applyRows(data);
        }

        // 3. Live updates: INSERTs are pushed over the WebSocket channel.
        channel = supabase
          .channel(`notifications-${userId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const row = payload?.new;
              if (!row) return;
              setNotifications((prev) =>
                [
                  { ...row, id: String(row.id) },
                  ...prev,
                ].slice(0, PAGE_SIZE)
              );
              setUnreadCount((count) => count + 1);
            }
          )
          .subscribe();
      } catch {
        // Never block the dashboard on notification failures.
      } finally {
        if (active) {
          setReady(true);
        }
      }
    }

    start();

    return () => {
      active = false;
      if (channel) {
        const supabase = getSupabase();
        if (supabase) {
          supabase.removeChannel(channel);
        }
      }
    };
  }, [applyRows]);

  const markRead = useCallback(async (id) => {
    const supabase = getSupabase();
    const key = String(id);
    if (!supabase) return;

    // Optimistic UI first; the write below reconciles the backend.
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === key && !n.read_at
          ? { ...n, read_at: new Date().toISOString() }
          : n
      )
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
    } catch {
      // Next load reconciles any drift.
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const stamp = new Date().toISOString();

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || stamp }))
    );
    setUnreadCount(0);

    try {
      await supabase
        .from("notifications")
        .update({ read_at: stamp })
        .eq("user_id", userIdRef.current)
        .is("read_at", null);
    } catch {
      // Optimistic only.
    }
  }, []);

  return { notifications, unreadCount, ready, markRead, markAllRead };
}
