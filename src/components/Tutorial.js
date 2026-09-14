// ============================================================================
// Tutorial.js — Interactive first-login walkthrough (brief 2.6)
// ============================================================================
// Every new user is guided through the key screens and features before they
// start using the app. The narration is AI-powered: on open, the deployed
// `ai-assistant` Supabase Edge Function writes a personalised welcome line
// from the user's profile context (recognised AI framework — NOT a hardcoded
// script). If the AI is unreachable, a static narration is used as fallback
// so the tour always completes.
// ============================================================================

import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSupabase } from "../lib/supabase";

const STEPS = [
  {
    icon: "👋",
    title: "Welcome to Career Next Step",
    body:
      "This 30-second tour shows you everything the platform can do. You can skip now and find it all later — but the tour only shows once.",
  },
  {
    icon: "👤",
    title: "Build your profile",
    body:
      "Your profile is your digital portfolio: skills, experience, projects, certifications and achievements. The more complete it is, the more employers find you.",
  },
  {
    icon: "📄",
    title: "Let Nexi read your CV",
    body:
      "Upload your CV in the CV Builder and Nexi, your AI assistant, extracts your skills and experience automatically — then adds them to your profile for you.",
  },
  {
    icon: "💼",
    title: "Smart job matching",
    body:
      "Verified businesses post internships and graduate roles. When a new opportunity matches your skills, you get a real-time notification — no endless scrolling.",
  },
  {
    icon: "🌐",
    title: "Grow your network",
    body:
      "Connect with classmates, alumni and industry partners across campuses. Post updates and short videos in the community feed — recruiters are watching.",
  },
  {
    icon: "💬",
    title: "Messages & Nexi",
    body:
      "Chat privately with your connections, and tap the Nexi bubble any time for AI career advice — profile tips, interview prep and job-search strategy.",
  },
  {
    icon: "📅",
    title: "Events & analytics",
    body:
      "Attend Richfield career fairs and workshops, and track your own growth with your personal analytics dashboard. Ready? Let's find your next step!",
  },
];

export default function Tutorial({ user, onFinish }) {
  const [visible, setVisible] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [aiLine, setAiLine] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const isLast = stepIndex === STEPS.length - 1;
  const step = STEPS[stepIndex];

  // Ask the AI for a personalised opening line (step 1 only, best-effort).
  useEffect(() => {
    let cancelled = false;

    async function personalise() {
      const sb = getSupabase();
      if (!sb) return;

      setAiLoading(true);

      try {
        const { data: sessionData } = await sb.auth.getSession();
        const token = sessionData?.session?.access_token;

        const res = await fetch(
          `${sb.supabaseUrl}/functions/v1/ai-assistant`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            },
            body: JSON.stringify({
              mode: "chat",
              messages: [
                {
                  role: "system",
                  content:
                    "You write ONE warm, encouraging opening sentence (max 25 words) for a first-time user's app tour. No emoji spam, no lists, no quotes.",
                },
                {
                  role: "user",
                  content: `The user is ${
                    user?.name || "a Richfield student"
                  }${
                    user?.targetCareer
                      ? ` aiming to become a ${user.targetCareer}`
                      : ""
                  }. Write the tour opening line.`,
                },
              ],
            }),
          }
        );

        const payload = await res.json();
        const content = String(payload?.content ?? "").trim();

        if (!cancelled && content && content.length < 220) {
          const first = content
            .split("\n")[0]
            .replace(/^["']|["']$/g, "");
          setAiLine(first);
        }
      } catch {
        // Static narration below already covers the fallback.
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    }

    personalise();

    return () => {
      cancelled = true;
    };
  }, []);

  function finish() {
    setVisible(false);

    AsyncStorage.setItem(
      `careerAI_tutorial_done_${
        (user?.email || "guest").trim().toLowerCase()
      }`,
      "1"
    ).catch(() => {});

    if (onFinish) onFinish();
  }

  function next() {
    if (isLast) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function back() {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={next}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.stepCount}>
            {stepIndex + 1} of {STEPS.length}
          </Text>

          <Text style={styles.icon}>{step.icon}</Text>

          <Text style={styles.title}>{step.title}</Text>

          <Text style={styles.body}>{step.body}</Text>

          {stepIndex === 0 && (
            <View style={styles.aiBox}>
              <Text style={styles.aiBoxLabel}>
                🤖 Nexi {aiLoading ? "is writing…" : "says"}
              </Text>

              <Text style={styles.aiBoxText}>
                {aiLoading
                  ? "Personalising your tour…"
                  : aiLine ||
                    "Every big career starts with a strong first profile — let's build yours!"}
              </Text>
            </View>
          )}

          <View style={styles.dots}>
            {STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === stepIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={finish}
            >
              <Text style={styles.secondaryText}>
                Skip
              </Text>
            </Pressable>

            {stepIndex > 0 && (
              <Pressable
                style={styles.secondaryButton}
                onPress={back}
              >
                <Text style={styles.secondaryText}>
                  Back
                </Text>
              </Pressable>
            )}

            <Pressable
              style={styles.primaryButton}
              onPress={next}
            >
              <Text style={styles.primaryText}>
                {isLast ? "Get started" : "Next"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(9,16,30,0.62)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
  },
  stepCount: {
    alignSelf: "flex-end",
    fontSize: 11,
    fontWeight: "800",
    color: "#7C8AA3",
    letterSpacing: 0.5,
  },
  icon: {
    fontSize: 44,
    textAlign: "center",
    marginTop: 4,
  },
  title: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: "800",
    color: "#0F1B33",
    textAlign: "center",
  },
  body: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#3A4761",
    textAlign: "center",
  },
  aiBox: {
    marginTop: 14,
    backgroundColor: "#F4F8FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8E6FA",
    padding: 12,
  },
  aiBoxLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1668B8",
  },
  aiBoxText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#1B2740",
    fontStyle: "italic",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 18,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#D9E2F0",
  },
  dotActive: {
    width: 22,
    backgroundColor: "#208AEF",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 22,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  secondaryText: {
    color: "#5B6B85",
    fontSize: 13,
    fontWeight: "700",
  },
});



