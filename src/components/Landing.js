import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandMark from "./BrandMark";
import { Brand } from "../theme/brand";

const FEATURES = [
  {
    number: "01",
    title: "Know your readiness",
    text: "See where you stand today, then close the gaps that actually matter to employers.",
  },
  {
    number: "02",
    title: "Find the right roles",
    text: "Match your skills to openings instead of scrolling through every generic job board.",
  },
  {
    number: "03",
    title: "Walk the path",
    text: "A personal roadmap, CV help, and interview practice — one step at a time.",
  },
];

const STEPS = [
  { n: "01", title: "Create your profile" },
  { n: "02", title: "Measure readiness" },
  { n: "03", title: "Apply with confidence" },
];

export default function Landing({ onLogin, onRegister }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 24) + 16 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* NAVBAR */}
      <View
        style={[
          styles.navbar,
          { paddingTop: Math.max(insets.top, 16) + 8 },
        ]}
      >
        <View style={styles.logo}>
          <BrandMark size={44} />

          <View>
            <Text style={styles.logoTitle}>Career Next Step</Text>
            <Text style={styles.logoSubtitle}>From graduate to hire</Text>
          </View>
        </View>

        <View style={styles.navActions}>
          <Pressable
            style={styles.navLogin}
            onPress={onLogin}
          >
            <Text style={styles.navLoginText}>Log in</Text>
          </Pressable>

          <Pressable
            style={styles.navRegister}
            onPress={onRegister}
          >
            <Text style={styles.navRegisterText}>Join free</Text>
          </Pressable>
        </View>
      </View>

      {/* HERO */}
      <LinearGradient
        colors={Brand.gradientHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />

        <View style={styles.heroBadge}>
          <View style={styles.heroBadgeDot} />
          <Text style={styles.heroBadgeText}>
            A career coach in your pocket
          </Text>
        </View>

        <Text style={styles.heroTitle}>
          Turn what you know into{" "}
          <Text style={styles.heroTitleAccent}>
            what you do next.
          </Text>
        </Text>

        <Text style={styles.heroDescription}>
          Career Next Step helps graduates understand job readiness,
          find matching roles, strengthen a CV, and walk into interviews
          prepared — without the noise.
        </Text>

        <View style={styles.heroButtons}>
          <Pressable
            style={styles.primaryButton}
            onPress={onRegister}
          >
            <Text style={styles.primaryButtonText}>
              Start your path
            </Text>
            <Text style={styles.primaryButtonArrow}>→</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={onLogin}
          >
            <Text style={styles.secondaryButtonText}>
              I already have an account
            </Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* SAMPLE READINESS CARD */}
      <View style={styles.heroCard}>
        <View style={styles.heroCardHeader}>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreBadgeText}>Sample score</Text>
          </View>
          <Text style={styles.heroCardEyebrow}>
            What you get inside
          </Text>
        </View>

        <View style={styles.scoreCircle}>
          <Text style={styles.scoreNumber}>87</Text>
          <Text style={styles.scorePercent}>%</Text>
        </View>

        <Text style={styles.scoreLabel}>Job readiness</Text>

        <Text style={styles.heroCardTitle}>
          Your next role is closer than it feels.
        </Text>

        <View style={styles.miniProgressBackground}>
          <View style={[styles.miniProgress, { width: "87%" }]} />
        </View>

        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>8 / 10</Text>
            <Text style={styles.statLabel}>Skills matched</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Recommended jobs</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Roadmap steps</Text>
          </View>
        </View>
      </View>
{/* HOW IT WORKS */}
      <View style={styles.steps}>
        <Text style={styles.stepsEyebrow}>How it works</Text>

        {STEPS.map((step, index) => (
          <View key={step.n} style={styles.stepItem}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>{step.n}</Text>
            </View>

            <Text style={styles.stepTitle}>{step.title}</Text>

            {index < STEPS.length - 1 ? (
              <View style={styles.stepLine} />
            ) : null}
          </View>
        ))}
      </View>

      {/* FEATURES */}
      <View style={styles.features}>
        {FEATURES.map((feature) => (
          <Pressable
            key={feature.title}
            style={styles.featureCard}
            onPress={onRegister}
          >
            <LinearGradient
              colors={Brand.gradientPurple}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.featureIconWrap}
            >
              <Text style={styles.featureNumber}>
                {feature.number}
              </Text>
            </LinearGradient>

            <View style={styles.featureBody}>
              <Text style={styles.featureTitle}>
                {feature.title}
              </Text>
              <Text style={styles.featureText}>
                {feature.text}
              </Text>
            </View>

            <Text style={styles.featureArrow}>→</Text>
          </Pressable>
        ))}
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2026 Career Next Step — Richfield
        </Text>

        <Text style={styles.footerLinks}>
          <Text style={styles.footerLink}>Privacy Policy</Text>
          <Text style={styles.footerSep}> · </Text>
          <Text style={styles.footerLink}>POPIA Compliance</Text>
        </Text>

        <Text style={styles.footerText}>
          Built for the 2026 Richfield Hackathon
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Brand.bg,
  },

  container: {
    paddingBottom: 40,
  },

  /* NAVBAR */
  navbar: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: Brand.surface,
    borderBottomWidth: 1,
    borderBottomColor: Brand.line,
    ...Brand.shadow.subtle,
  },

  logo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },

  logoTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Brand.ink,
  },

  logoSubtitle: {
    fontSize: 12,
    color: Brand.muted,
    marginTop: 2,
  },

  navActions: {
    flexDirection: "row",
    gap: 10,
  },

  navLogin: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Brand.primary,
    backgroundColor: Brand.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },

  navLoginText: {
    color: Brand.primaryDark,
    fontSize: 14,
    fontWeight: "800",
  },

  navRegister: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: Brand.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Brand.shadow.subtle,
  },

  navRegisterText: {
    color: Brand.surface,
    fontSize: 14,
    fontWeight: "800",
  },

  /* HERO */
  hero: {
    marginHorizontal: 0,
    marginTop: 8,
    borderRadius: 28,
    padding: 28,
    overflow: "hidden",
  },

  heroGlowOne: {
    position: "absolute",
    top: -60,
    right: -50,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(15, 122, 114, 0.10)",
  },

  heroGlowTwo: {
    position: "absolute",
    bottom: -40,
    left: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(217, 137, 91, 0.12)",
  },

  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Brand.primaryMist,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  heroBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.primary,
    marginRight: 7,
  },

  heroBadgeText: {
    color: Brand.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },

  heroTitle: {
    fontSize: 32,
    lineHeight: 41,
    fontWeight: "900",
    color: Brand.ink,
    marginTop: 16,
  },

  heroTitleAccent: {
    color: Brand.primary,
  },

  heroDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: Brand.muted,
    marginTop: 14,
  },

  heroButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
  },

  primaryButton: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: Brand.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    ...Brand.shadow.card,
  },

  primaryButtonText: {
    color: Brand.surface,
    fontSize: 15,
    fontWeight: "800",
  },

  primaryButtonArrow: {
    color: Brand.surface,
    fontSize: 17,
    fontWeight: "800",
  },

  secondaryButton: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Brand.primary,
    backgroundColor: Brand.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  secondaryButtonText: {
    color: Brand.primaryDark,
    fontSize: 14,
    fontWeight: "800",
  },

  /* SAMPLE READINESS CARD */
  heroCard: {
    marginTop: -18,
    marginHorizontal: 20,
    backgroundColor: Brand.ink,
    borderRadius: 20,
    padding: 22,
    ...Brand.shadow.lift,
  },

  heroCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  scoreBadge: {
    backgroundColor: Brand.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  scoreBadgeText: {
    color: Brand.ink,
    fontSize: 11,
    fontWeight: "800",
  },

  heroCardEyebrow: {
    color: "#B8C4BC",
    fontSize: 11,
    fontWeight: "700",
  },

  scoreCircle: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 7,
    borderColor: "rgba(255, 251, 244, 0.25)",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },

  scoreNumber: {
    fontSize: 34,
    fontWeight: "900",
    color: Brand.surface,
  },

  scorePercent: {
    fontSize: 18,
    fontWeight: "800",
    color: Brand.surface,
  },

  scoreLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: Brand.surface,
    alignSelf: "center",
    marginTop: 10,
  },

  heroCardTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
    color: Brand.surface,
    marginTop: 16,
    textAlign: "center",
  },

  miniProgressBackground: {
    height: 8,
    width: "100%",
    borderRadius: 10,
    backgroundColor: "rgba(255, 251, 244, 0.18)",
    overflow: "hidden",
    marginTop: 12,
  },

  miniProgress: {
    height: "100%",
    backgroundColor: Brand.primary,
    borderRadius: 10,
  },

  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 251, 244, 0.18)",
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statValue: {
    fontSize: 17,
    fontWeight: "900",
    color: Brand.surface,
  },

  statLabel: {
    fontSize: 10,
    color: "#B8C4BC",
    marginTop: 4,
    textAlign: "center",
  },

  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 251, 244, 0.18)",
    marginHorizontal: 8,
  },

  /* HOW IT WORKS */
  steps: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: Brand.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Brand.line,
    gap: 16,
    ...Brand.shadow.subtle,
  },

  stepsEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: Brand.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  stepItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.primaryMist,
    alignItems: "center",
    justifyContent: "center",
  },

  stepNumber: {
    fontSize: 12,
    fontWeight: "900",
    color: Brand.primaryDark,
  },

  stepTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: Brand.ink,
    marginLeft: 12,
  },

  stepLine: {
    width: 22,
    height: 1,
    backgroundColor: Brand.bgDeep,
  },

  /* FEATURES */
  features: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },

  featureCard: {
    backgroundColor: Brand.surfaceRaised,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Brand.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    ...Brand.shadow.subtle,
  },

  featureIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  featureNumber: {
    fontSize: 12,
    color: Brand.surface,
    fontWeight: "900",
  },

  featureBody: {
    flex: 1,
  },

  featureTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Brand.ink,
    marginBottom: 5,
  },

  featureText: {
    fontSize: 13,
    lineHeight: 20,
    color: Brand.muted,
  },

  featureArrow: {
    fontSize: 18,
    color: Brand.primary,
    fontWeight: "800",
  },

  /* FOOTER */
  footer: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
  },

  footerText: {
    fontSize: 11,
    color: Brand.muted,
    marginBottom: 4,
  },

  footerLinks: {
    flexDirection: "row",
    marginVertical: 4,
  },

  footerLink: {
    fontSize: 11,
    color: Brand.primary,
    fontWeight: "700",
  },

  footerSep: {
    fontSize: 11,
    color: Brand.bgDeep,
  },
});