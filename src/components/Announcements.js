// ============================================================================
// Announcements.js — Platform-wide announcements (admin broadcasting)
// ============================================================================
// Used in two modes:
//   1. Read-only feed  — students / alumni / businesses see the announcements
//      targeted at their role (RLS filters the rows server-side).
//   2. Admin composer  — <Announcements isAdmin /> shows the compose form and
//      lets the administrator publish / delete targeted broadcasts.
//
// A database trigger inserts a notification row per active user in the target
// audience the moment an announcement is created, so the real-time bell and
// this screen update simultaneously.
// ============================================================================

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getSupabase } from "../lib/supabase";
import { ensureSupabaseSession, timeAgo } from "../lib/social";

const AUDIENCES = [
  { key: "all", label: "Everyone", hint: "Students, alumni, businesses & admins" },
  { key: "students", label: "Students & Alumni", hint: "Students + alumni" },
  { key: "alumni", label: "Alumni only", hint: "Verified alumni" },
  { key: "business", label: "Businesses", hint: "Company accounts" },
  { key: "admins", label: "Admins", hint: "Platform administrators" },
];

const AUDIENCE_LABEL = {
  all: "Everyone",
  students: "Students & Alumni",
  alumni: "Alumni",
  business: "Businesses",
  admins: "Admins",
};

export default function Announcements({ isAdmin = false, embedded = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [reloadFlag, setReloadFlag] = useState(0);

  // Composer state (admin mode only)
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const s = await ensureSupabaseSession();
    if (!s) {
      setOffline(true);
      setItems([]);
      setLoading(false);
      return;
    }
    setOffline(false);
    try {
      const { data, error } = await s.supabase
        .from("announcements")
        .select("id, title, body, audience, admin_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setItems(data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [reloadFlag]);

  // Live updates: new/edited/deleted announcements arrive over the WebSocket.
  useEffect(() => {
    let channel = null;
    let active = true;

    async function subscribe() {
      const session = await ensureSupabaseSession();
      if (!session || !active) return;

      channel = session.supabase
        .channel("announcements-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "announcements" },
          () => {
            if (active) setReloadFlag((f) => f + 1);
          }
        )
        .subscribe();
    }

    subscribe();

    return () => {
      active = false;
      if (channel) {
        const supabase = getSupabase();
        if (supabase) supabase.removeChannel(channel);
      }
    };
  }, []);

  // ---- Admin actions --------------------------------------------------------

  async function publish() {
    if (!title.trim()) {
      Alert.alert("Missing title", "Give the announcement a short, clear title.");
      return;
    }
    setSubmitting(true);

    try {
      const s = await ensureSupabaseSession();
      if (!s) {
        Alert.alert("Not Available", "Publishing requires the Supabase backend.");
        return;
      }

      const { error } = await s.supabase.from("announcements").insert({
        admin_id: s.userId,
        title: title.trim(),
        body: body.trim(),
        audience,
      });

      if (error) throw error;

      setTitle("");
      setBody("");
      setAudience("all");
      setComposing(false);
      setReloadFlag((f) => f + 1);
    } catch (error) {
      Alert.alert(
        "Could not publish",
        error?.message || "Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function remove(item) {
    Alert.alert(
      "Delete Announcement",
      `Delete "${item.title}"? Everyone will lose access to this update.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const s = await ensureSupabaseSession();
            if (!s) return;
            try {
              const { error } = await s.supabase
                .from("announcements")
                .delete()
                .eq("id", item.id);
              if (error) throw error;
              setReloadFlag((f) => f + 1);
            } catch (error) {
              Alert.alert("Could not delete", error?.message || "Please try again.");
            }
          },
        },
      ]
    );
  }

  // ---- Render ---------------------------------------------------------------

  // Embedded mode: compact, read-only list for dashboard home screens.
  if (embedded) {
    return (
      <View style={styles.embeddedWrap}>
        {!loading &&
          !offline &&
          items.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.embeddedCard}>
              <View style={styles.embeddedBadge}>
                <Text style={styles.embeddedBadgeText}>
                  {AUDIENCE_LABEL[item.audience] || "Everyone"}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.body ? (
                <Text style={styles.cardBody} numberOfLines={2}>
                  {item.body}
                </Text>
              ) : null}
              <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
            </View>
          ))}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {offline && (
        <View style={styles.offlineCard}>
          <Text style={styles.offlineText}>
            Announcements require an active connection. Please sign in.
          </Text>
        </View>
      )}

      {isAdmin && (
        <View style={styles.composerWrap}>
          {composing ? (
            <View style={styles.composer}>
              <Text style={styles.composerTitle}>✉️ New Announcement</Text>

              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Career Fair 2026 date change"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.fieldLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.bodyInput]}
                placeholder="What does your audience need to know?"
                placeholderTextColor="#94A3B8"
                value={body}
                onChangeText={setBody}
                multiline
              />

              <Text style={styles.fieldLabel}>Audience</Text>
              {AUDIENCES.map((a) => (
                <Pressable
                  key={a.key}
                  style={styles.audienceRow}
                  onPress={() => setAudience(a.key)}
                >
                  <View style={styles.radioOuter}>
                    {audience === a.key && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.audienceLabel}>{a.label}</Text>
                    <Text style={styles.audienceHint}>{a.hint}</Text>
                  </View>
                </Pressable>
              ))}

              <View style={styles.composerActions}>
                <Pressable
                  style={styles.cancelButton}
                  disabled={submitting}
                  onPress={() => {
                    setComposing(false);
                    setTitle("");
                    setBody("");
                    setAudience("all");
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.publishButton, submitting && styles.buttonDisabled]}
                  disabled={submitting}
                  onPress={publish}
                >
                  <Text style={styles.publishButtonText}>
                    {submitting ? "Publishing…" : "Broadcast"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.composeTrigger} onPress={() => setComposing(true)}>
              <Text style={styles.composeTriggerIcon}>📣</Text>
              <Text style={styles.composeTriggerText}>Broadcast an announcement to the platform</Text>
            </Pressable>
          )}
        </View>
      )}

      {!composing && items.length === 0 && !offline && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📣</Text>
          <Text style={styles.emptyText}>
            {isAdmin
              ? "No announcements published yet. Broadcast your first update to the platform."
              : "No announcements right now. When the institution broadcasts an update it will appear here."}
          </Text>
        </View>
      )}

      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {AUDIENCE_LABEL[item.audience] || "Everyone"}
              </Text>
            </View>
            {isAdmin && (
              <Pressable onPress={() => remove(item)} hitSlop={8}>
                <Text style={styles.deleteText}>🗑</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.body ? <Text style={styles.cardBody}>{item.body}</Text> : null}

          <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F8FC" },
  content: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F8FC",
  },
  embeddedWrap: {
    gap: 10,
    marginBottom: 18,
  },
  embeddedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E3EAF4",
    borderLeftWidth: 4,
    borderLeftColor: "#208AEF",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  embeddedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  embeddedBadgeText: {
    color: "#1565C0",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  offlineCard: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  offlineText: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "600",
    textAlign: "center",
  },
  composerWrap: { marginBottom: 16 },
  composeTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9EDF5",
    borderStyle: "dashed",
    padding: 14,
    gap: 10,
  },
  composeTriggerIcon: { fontSize: 22 },
  composeTriggerText: { fontSize: 14, fontWeight: "600", color: "#334155" },
  composer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDE7F5",
    padding: 16,
  },
  composerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1B33",
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5B6B85",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F1B33",
  },
  bodyInput: { minHeight: 90, textAlignVertical: "top" },
  audienceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#A3B8D4",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#208AEF",
  },
  audienceLabel: { fontSize: 14, fontWeight: "600", color: "#0F1B33" },
  audienceHint: { fontSize: 11, color: "#8A94A6" },
  composerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#EEF2F7",
  },
  cancelButtonText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  publishButton: {
    backgroundColor: "#208AEF",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  publishButtonText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  buttonDisabled: { opacity: 0.5 },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9EDF5",
  },
  emptyIcon: { fontSize: 30, marginBottom: 8 },
  emptyText: {
    fontSize: 13,
    color: "#5B6B85",
    textAlign: "center",
    lineHeight: 19,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9EDF5",
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  badge: {
    backgroundColor: "#E1EEFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#1565C0" },
  deleteText: { fontSize: 15, color: "#EF4444" },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#0F1B33", marginBottom: 4 },
  cardBody: { fontSize: 13, color: "#475569", lineHeight: 19, marginBottom: 8 },
  cardTime: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
});
