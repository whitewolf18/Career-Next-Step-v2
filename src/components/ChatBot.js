// ============================================================================
// ChatBot.js — "Nexi" AI assistant (brief 2.6: recognized AI framework)
// Floating bubble + chat modal. Talks to the deployed `ai-assistant` Edge
// Function (the AI key lives server-side only). Session JWT is attached so
// the function can be locked to authenticated users.
// ============================================================================

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { getSupabase } from "../lib/supabase";

const QUICK_PROMPTS = [
  "How do I make my profile stand out?",
  "How does smart job matching work?",
  "Give me interview preparation tips",
  "How do I get verified as an alumnus?",
];

const GREETING = {
  role: "assistant",
  content:
    "Hi! 👋 I'm Nexi, your AI career assistant.\n\nI can help you improve your profile, prepare for interviews, understand how job matching works, or find your way around the app. What would you like to work on?",
};

export default function ChatBot({ accent = "#208AEF" }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current && open) {
      setTimeout(
        () => scrollRef.current?.scrollToEnd({ animated: true }),
        120
      );
    }
  }, [messages, busy, open]);

  async function send(text) {
    const clean = text.trim();
    if (!clean || busy) return;

    const history = [...messages, { role: "user", content: clean }];
    setMessages(history);
    setInput("");
    setBusy(true);

    try {
      const sb = getSupabase();
      if (!sb) throw new Error("offline");

      const { data: sessionData } = await sb.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(
        `${sb.supabaseUrl}/functions/v1/ai-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            mode: "chat",
            messages: history.slice(-12),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        const friendly =
          data?.error && data.error.includes("OPENAI_API_KEY")
            ? "The AI service isn't connected yet — ask your administrator to add an OPENAI_API_KEY secret to the Supabase project."
            : data?.error ||
              "I couldn't reach the AI service. Try again in a moment.";
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `⚠️ ${friendly}` },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.reply || "(no reply)" },
        ]);
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "⚠️ You appear to be offline. Reconnect to chat with Nexi.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: accent },
            pressed && styles.fabPressed,
          ]}
          onPress={() => setOpen(true)}
        >
          <Text style={styles.fabIcon}>🤖</Text>
        </Pressable>
      )}

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.container}>
          <View style={[styles.header, { backgroundColor: accent }]}>
            <View style={styles.headerInfo}>
              <Text style={styles.headerAvatar}>🤖</Text>
              <View>
                <Text style={styles.headerTitle}>
                  Nexi — AI Assistant
                </Text>
                <Text style={styles.headerSubtitle}>
                  {busy ? "Typing…" : "Online • powered by AI"}
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.closeButton}
              onPress={() => setOpen(false)}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            ref={scrollRef}
            style={styles.chatArea}
            contentContainerStyle={styles.chatContent}
          >
            {messages.map((m, i) => (
              <View
                key={i}
                style={[
                  styles.bubble,
                  m.role === "user" ? styles.bubbleUser : styles.bubbleBot,
                ]}
              >
                <Text
                  style={
                    m.role === "user"
                      ? styles.bubbleUserText
                      : styles.bubbleBotText
                  }
                >
                  {m.content}
                </Text>
              </View>
            ))}

            {busy && (
              <View style={[styles.bubble, styles.bubbleBot]}>
                <ActivityIndicator size="small" color={accent} />
              </View>
            )}
          </ScrollView>

          {messages.length <= 2 && !busy && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRow}
            >
              {QUICK_PROMPTS.map((p) => (
                <Pressable
                  key={p}
                  style={styles.quickChip}
                  onPress={() => send(p)}
                >
                  <Text style={styles.quickChipText}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                placeholder="Ask Nexi anything…"
                placeholderTextColor="#94A3B8"
                value={input}
                onChangeText={setInput}
                multiline
                onSubmitEditing={() => send(input)}
              />

              <Pressable
                style={[
                  styles.sendButton,
                  { backgroundColor: accent },
                  (!input.trim() || busy) && styles.sendDisabled,
                ]}
                onPress={() => send(input)}
                disabled={!input.trim() || busy}
              >
                <Text style={styles.sendText}>➤</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 18,
    bottom: 88,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },

  fabIcon: {
    fontSize: 26,
  },

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    paddingTop: 46,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  headerAvatar: {
    fontSize: 30,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 2,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  chatArea: {
    flex: 1,
  },

  chatContent: {
    padding: 16,
    paddingBottom: 8,
    gap: 10,
  },

  bubble: {
    maxWidth: "85%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: "#208AEF",
    borderBottomRightRadius: 4,
  },

  bubbleBot: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  bubbleUserText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
  },

  bubbleBotText: {
    color: "#1E293B",
    fontSize: 14,
    lineHeight: 20,
  },

  quickRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },

  quickChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  quickChipText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "600",
  },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    backgroundColor: "#F1F5F9",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: "#0F172A",
    fontSize: 14,
  },

  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  sendDisabled: {
    opacity: 0.4,
  },

  sendText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
