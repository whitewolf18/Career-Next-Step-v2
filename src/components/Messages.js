import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  ensureSupabaseSession,
  displayName,
  roleLabel,
  timeAgo,
} from "../lib/social";
import { getSupabase } from "../lib/supabase";

/**
 * MESSAGES — Direct Messaging (brief 2.4)
 * =========================================================
 * One-on-one chat backed by the `messages` table. A single
 * Supabase Realtime WebSocket channel powers BOTH the
 * conversation list and the open chat: whenever a message row
 * the user may see is inserted server-side, the event is
 * pushed instantly (no polling). RLS restricts visibility to
 * conversation participants, so events only arrive for the
 * signed-in user's own threads.
 *
 * Chats open from an existing conversation, or from an
 * accepted connection listed at the bottom of the list view.
 */

export default function Messages() {
  const [session, setSession] = useState(null); // { supabase, userId }
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [view, setView] = useState("list"); // "list" | "chat"

  const [conversations, setConversations] = useState([]);
  const [connections, setConnections] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [partner, setPartner] = useState(null);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  const channelRef = useRef(null);
  const supabaseRef = useRef(null);
  const partnerRef = useRef(null);
  const scrollRef = useRef(null);

  // -----------------------------------------------------
  // DATA LOADERS
  // -----------------------------------------------------

  const loadConversations = useCallback(async (s) => {
    if (!s) return;
    const { supabase, userId } = s;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, sender_id, recipient_id, body, created_at, read_at, " +
            "sender:profiles!messages_sender_id_fkey(id, full_name, company_name, role, avatar_url), " +
            "recipient:profiles!messages_recipient_id_fkey(id, full_name, company_name, role, avatar_url)"
        )
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) {
        setOffline(true);
        return;
      }

      setOffline(false);

      // Collapse every message row into one entry per partner,
      // keeping the newest message and an unread count.
      const byPartner = new Map();

      (data || []).forEach((row) => {
        const mine = row.sender_id === userId;
        const other = mine ? row.recipient : row.sender;
        if (!other?.id) return;

        const existing = byPartner.get(other.id);

        if (!existing) {
          byPartner.set(other.id, {
            partner: other,
            lastMessage: row,
            unread: !mine && !row.read_at ? 1 : 0,
          });
        } else if (!mine && !row.read_at) {
          existing.unread += 1;
        }
      });

      setConversations(Array.from(byPartner.values()));
    } catch {
      setOffline(true);
    }
  }, []);

  const loadConnections = useCallback(async (s) => {
    if (!s) return;
    const { supabase, userId } = s;

    try {
      const { data, error } = await supabase
        .from("connections")
        .select(
          "requester_id, addressee_id, " +
            "requester:profiles!connections_requester_id_fkey(id, full_name, company_name, role, avatar_url), " +
            "addressee:profiles!connections_addressee_id_fkey(id, full_name, company_name, role, avatar_url)"
        )
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq("status", "connected");

      if (error) return;

      const rows = (data || []).map((row) =>
        row.requester_id === userId ? row.addressee : row.requester
      );

      setConnections(rows.filter((r) => r?.id));
    } catch {
      // Connections are optional extras for the list view.
    }
  }, []);

  const loadChat = useCallback(async (s, partnerRow) => {
    if (!s || !partnerRow) return;
    const { supabase, userId } = s;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, created_at, read_at")
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${partnerRow.id}),` +
            `and(sender_id.eq.${partnerRow.id},recipient_id.eq.${userId})`
        )
        .order("created_at", { ascending: true })
        .limit(300);

      if (error) {
        setOffline(true);
        return;
      }

      setOffline(false);
      setChatMessages(data || []);
    } catch {
      // Keep whatever is on screen.
    }
  }, []);

  // -----------------------------------------------------
  // REALTIME — one channel drives list + open chat
  // -----------------------------------------------------

  useEffect(() => {
    let active = true;
    let channel = null;

    async function start() {
      const s = await ensureSupabaseSession();
      if (!active) return;

      if (!s) {
        setLoading(false);
        setOffline(true);
        return;
      }

      setSession(s);
      supabaseRef.current = s.supabase;

      await Promise.all([
        loadConversations(s),
        loadConnections(s),
      ]);
      if (!active) return;
      setLoading(false);

      channel = s.supabase
        .channel(`messages-live-${s.userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            const row = payload?.new;
            if (!row) return;

            const me = s.userId;
            if (row.sender_id !== me && row.recipient_id !== me) {
              return;
            }

            // Open chat: append instantly (deduped by id).
            const current = partnerRef.current;
            const inOpenChat =
              current &&
              ((row.sender_id === me &&
                row.recipient_id === current.id) ||
                (row.sender_id === current.id &&
                  row.recipient_id === me));

            if (inOpenChat) {
              setChatMessages((prev) =>
                prev.some((m) => m.id === row.id)
                  ? prev
                  : [...prev, row]
              );
            }

            // Conversation list: refresh on any visible message.
            loadConversations(s);
          }
        )
        .subscribe();

      channelRef.current = channel;
    }

    start();

    return () => {
      active = false;
      const supabase = supabaseRef.current;
      if (supabase && channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [loadConversations, loadConnections]);

  // Auto-scroll the open chat to the newest message.
  useEffect(() => {
    if (view === "chat") {
      const t = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [chatMessages, view]);

  // -----------------------------------------------------
  // ACTIONS
  // -----------------------------------------------------

  const openChat = useCallback(
    async (partnerRow) => {
      setPartner(partnerRow);
      partnerRef.current = partnerRow;
      setView("chat");
      setInputText("");
      setChatMessages([]);

      if (session) {
        await loadChat(session, partnerRow);
      }
    },
    [session, loadChat]
  );

  function closeChat() {
    setView("list");
    setPartner(null);
    partnerRef.current = null;
    setChatMessages([]);
  }

  async function sendMessage() {
    const s = session;
    const body = inputText.trim();

    if (!s || !partner || !body || sending) return;

    setSending(true);
    setInputText("");

    try {
      const { data, error } = await s.supabase
        .from("messages")
        .insert({
          sender_id: s.userId,
          recipient_id: partner.id,
          body,
        })
        .select()
        .single();

      if (error) {
        setInputText(body);
        Alert.alert(
          "Message not sent",
          "Could not deliver your message. Please try again."
        );
        return;
      }

      // Optimistic append; the realtime echo is deduped by id.
      setChatMessages((prev) =>
        prev.some((m) => m.id === data?.id)
          ? prev
          : [...prev, data]
      );
    } catch {
      setInputText(body);
      Alert.alert("Message not sent", "Please try again.");
    } finally {
      setSending(false);
    }
  }

  // Best-effort read receipts: when a chat is open, mark the
  // partner's messages as read. RLS policy messages_update_own
  // (added in migration 0002) allows the recipient to set read_at.
  async function markPartnerRead(partnerRow) {
    const s = session;
    if (!s || !partnerRow) return;

    try {
      await s.supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", s.userId)
        .eq("sender_id", partnerRow.id)
        .is("read_at", null);
    } catch {
      // Cosmetic only — the list reconciles on next load.
    }
  }

  // -----------------------------------------------------
  // DERIVED LISTS
  // -----------------------------------------------------

  const needle = search.trim().toLowerCase();

  const visibleConversations =
    needle === ""
      ? conversations
      : conversations.filter((entry) =>
          displayName(entry.partner)
            .toLowerCase()
            .includes(needle)
        );

  const conversationIds = new Set(
    conversations.map((entry) => entry.partner.id)
  );

  const newChatConnections = connections.filter(
    (row) => !conversationIds.has(row.id)
  );

  function renderList() {
    if (loading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#208AEF"
          />
          <Text style={styles.centerText}>
            Loading conversations…
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        {offline ? (
          <View style={styles.offlineCard}>
            <Text style={styles.offlineText}>
              ⚠️ Could not reach the messaging
              service. Sign in and try again —
              conversations load live.
            </Text>
          </View>
        ) : null}

        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations"
          placeholderTextColor="#8A97AD"
          value={search}
          onChangeText={setSearch}
        />

        <Text style={styles.sectionLabel}>
          Conversations
        </Text>

        {visibleConversations.length === 0 ? (
          <View style={styles.emptyCard}>
                        <Text style={styles.emptyIcon}>
              —
            </Text>
            <Text style={styles.emptyText}>
              {needle
                ? "No conversations match your search."
                : "No messages yet. Start a chat from your connections below."}
            </Text>
          </View>
        ) : (
          visibleConversations.map((entry) => {
            const last = entry.lastMessage;
            const mine =
              last?.sender_id === session?.userId;

            return (
              <Pressable
                key={entry.partner.id}
                style={({ pressed }) => [
                  styles.conversationCard,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => {
                  openChat(entry.partner);
                  markPartnerRead(entry.partner);
                }}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {displayName(entry.partner)
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.convoMid}>
                  <View style={styles.convoTopRow}>
                    <Text
                      style={styles.convoName}
                      numberOfLines={1}
                    >
                      {displayName(entry.partner)}
                    </Text>

                    <Text style={styles.convoTime}>
                      {timeAgo(last?.created_at)}
                    </Text>
                  </View>

                  <Text style={styles.roleTag}>
                    {roleLabel(entry.partner.role)}
                  </Text>

                  <Text
                    style={styles.convoPreview}
                    numberOfLines={1}
                  >
                    {mine ? "You: " : ""}
                    {last?.body || ""}
                  </Text>
                </View>

                {entry.unread > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                      {entry.unread > 9
                        ? "9+"
                        : entry.unread}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}

          <Text style={styles.sectionLabel}>
            Start a new chat
          </Text>

          {newChatConnections.length ===
          0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>
                                —
              </Text>

              <Text style={styles.emptyText}>
                {connections.length === 0
                  ? "Connect with people in the Network tab first — then chat with them here."
                  : "All of your connections already have conversations above."}
              </Text>
            </View>
          ) : (
            <View
              style={styles.connectionRow}
            >
              {newChatConnections.map(
                (partner) => (
                  <Pressable
                    key={partner.id}
                    style={({ pressed }) => [
                      styles.connectionChip,
                      pressed &&
                        styles.cardPressed,
                    ]}
                    onPress={() =>
                      openChat(partner)
                    }
                  >
                    <View
                      style={
                        styles.chipAvatar
                      }
                    >
                      <Text
                        style={
                          styles.avatarText
                        }
                      >
                        {displayName(
                          partner
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.chipName
                      }
                      numberOfLines={1}
                    >
                      {displayName(
                        partner
                      )}
                    </Text>

                    <Text
                      style={
                        styles.chipRole
                      }
                      numberOfLines={1}
                    >
                      {roleLabel(
                        partner.role
                      )}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          )}
        </ScrollView>
    );
  }

  function renderChat() {
    return (
      <KeyboardAvoidingView
        style={styles.chatWrap}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.chatHeader}>
          <Pressable
            style={styles.backButton}
            onPress={closeChat}
          >
            <Text
              style={styles.backButtonText}
            >
              ‹ Back
            </Text>
          </Pressable>

          <View
            style={styles.chatPartner}
          >
            <View
              style={styles.avatarCircle}
            >
              <Text
                style={styles.avatarText}
              >
                {displayName(
                  partner
                )
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <View>
              <Text
                style={
                  styles.chatName
                }
                numberOfLines={1}
              >
                {displayName(partner)}
              </Text>

              <Text
                style={
                  styles.chatRole
                }
              >
                {roleLabel(
                  partner?.role
                )}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatBody}
          contentContainerStyle={
            styles.chatContent
          }
        >
          {chatMessages.length ===
          0 ? (
            <View style={styles.emptyCard}>
              <Text
                style={styles.emptyText}
              >
                No messages yet — say
                hello 👋
              </Text>
            </View>
          ) : (
            chatMessages.map(
              (message) => {
                const mine =
                  message.sender_id ===
                  session?.userId;

                return (
                  <View
                    key={message.id}
                    style={[
                      styles.bubbleRow,
                      mine &&
                        styles.bubbleRowMine,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        mine &&
                          styles.bubbleMine,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
                          mine &&
                            styles.bubbleTextMine,
                        ]}
                      >
                        {
                          message.body
                        }
                      </Text>

                      <Text
                        style={[
                          styles.bubbleTime,
                          mine &&
                            styles.bubbleTimeMine,
                        ]}
                      >
                        {timeAgo(
                          message.created_at
                        )}
                      </Text>
                    </View>
                  </View>
                );
              }
            )
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            placeholder="Type a message…"
            placeholderTextColor="#8A97AD"
            value={inputText}
            onChangeText={
              setInputText
            }
            multiline
          />

          <Pressable
            style={[
              styles.sendButton,
              (!inputText.trim() ||
                sending) &&
                styles.sendDisabled,
            ]}
            disabled={
              !inputText.trim() || sending
            }
            onPress={sendMessage}
          >
            <Text
              style={
                styles.sendButtonText
              }
            >
              {sending ? "…" : "Send"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.screen}>
      {view === "chat" && partner
        ? renderChat()
        : renderList()}
    </View>
  );
}

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  body: {
    flex: 1,
  },

  bodyContent: {
    padding: 16,
    paddingBottom: 40,
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },

  centerText: {
    marginTop: 12,
    fontSize: 14,
    color: "#5A6B85",
  },

  offlineCard: {
    backgroundColor: "#FFF4E5",
    borderColor: "#F0C36D",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  offlineText: {
    fontSize: 13,
    color: "#8A5A00",
  },

  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDE4EF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1B2537",
    marginBottom: 16,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5A6B85",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4EAF3",
    padding: 24,
    alignItems: "center",
    marginBottom: 12,
  },

  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    color: "#5A6B85",
    textAlign: "center",
    lineHeight: 20,
  },

  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },

  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4EAF3",
    padding: 14,
    marginBottom: 10,
  },

  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#208AEF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  convoMid: {
    flex: 1,
  },

  convoTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  convoName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1B2537",
    marginRight: 8,
  },

  convoTime: {
    fontSize: 11,
    color: "#8A97AD",
  },

  roleTag: {
    fontSize: 11,
    color: "#208AEF",
    marginTop: 2,
  },

  convoPreview: {
    fontSize: 13,
    color: "#5A6B85",
    marginTop: 3,
  },

  unreadBadge: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    marginLeft: 8,
  },

  unreadText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  connectionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  connectionChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDE4EF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    width: 104,
  },

  chipAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F1FD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  chipName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B2537",
    textAlign: "center",
  },

  chipRole: {
    fontSize: 10,
    color: "#8A97AD",
    marginTop: 2,
  },

  chatWrap: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E4EAF3",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
  },

  backButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#208AEF",
  },

  chatPartner: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  chatName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B2537",
  },

  chatRole: {
    fontSize: 11,
    color: "#8A97AD",
  },

  chatBody: {
    flex: 1,
  },

  chatContent: {
    padding: 14,
    paddingBottom: 24,
  },

  bubbleRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 10,
  },

  bubbleRowMine: {
    justifyContent: "flex-end",
  },

  bubble: {
    maxWidth: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E4EAF3",
  },

  bubbleMine: {
    backgroundColor: "#208AEF",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
    borderColor: "#208AEF",
  },

  bubbleText: {
    fontSize: 14,
    color: "#1B2537",
    lineHeight: 19,
  },

  bubbleTextMine: {
    color: "#FFFFFF",
  },

  bubbleTime: {
    fontSize: 10,
    color: "#8A97AD",
    marginTop: 4,
    alignSelf: "flex-end",
  },

  bubbleTimeMine: {
    color: "rgba(255,255,255,0.75)",
  },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E4EAF3",
    padding: 10,
    gap: 8,
  },

  composerInput: {
    flex: 1,
    backgroundColor: "#F5F7FB",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDE4EF",
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 14,
    color: "#1B2537",
    maxHeight: 110,
  },

  sendButton: {
    backgroundColor: "#208AEF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },

  sendDisabled: {
    backgroundColor: "#AECBF0",
  },

  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});



