import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function PrivacyPolicy({ onAccept, showAcceptButton = false }) {
  const [accepted, setAccepted] = useState(false);
  function handleAccept() { setAccepted(true); if (onAccept) onAccept(true); }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <Text style={styles.logoSquare}>P</Text>
          </View>
          <Text style={styles.title}>Privacy Policy & POPIA Compliance</Text>
          <Text style={styles.subtitle}>Career Next Step — Protection of Personal Information Act (POPIA)</Text>
          <Text style={styles.effectiveDate}>Effective Date: January 2026</Text>
        </View>
        <Section title="1. Introduction">
          <Text style={styles.para}>Career Next Step ("we", "us", "our") is committed to protecting your personal information and ensuring compliance with the Protection of Personal Information Act 4 of 2013 (POPIA) of South Africa.</Text>
        </Section>
        <Section title="2. Information We Collect">
          <Text style={styles.para}>We collect the following types of personal information:</Text>
          <Bullet text="Identity data: Full name, email address, student/alumni number" />
          <Bullet text="Profile data: Skills, work experience, education, certifications" />
          <Bullet text="Usage data: Job applications, event RSVPs, connections, messages" />
          <Bullet text="Technical data: Device information, app usage analytics" />
          <Bullet text="Communication data: Direct messages, comments, feedback" />
        </Section>
        <Section title="3. How We Use Your Information">
          <Text style={styles.para}>Your personal information is used to: provide services, connect students with opportunities, facilitate networking, send notifications, improve our platform, and comply with legal obligations.</Text>
        </Section>
        <Section title="4. Legal Basis (POPIA)">
          <Text style={styles.para}>We process data based on: your consent, legitimate interest, legal obligation, and to fulfill our service contract with you.</Text>
        </Section>
        <Section title="5. Information Sharing">
          <Text style={styles.para}>We do NOT sell your data. Information may be shared with: recruiters (when you apply), institution (anonymized analytics), service providers (Supabase, OpenAI), and legal authorities when required.</Text>
        </Section>
        <Section title="6. Your Rights">
          <Text style={styles.para}>Under POPIA you have the right to: access, correct, delete, object to processing, data portability, withdraw consent, and lodge a complaint with the Information Regulator.</Text>
        </Section>
        <Section title="7. Data Security">
          <Text style={styles.para}>We use: Row Level Security (RLS), encrypted transmission (HTTPS/TLS), role-based access control, regular security audits, and Supabase enterprise infrastructure.</Text>
        </Section>
        <Section title="8. Data Retention">
          <Text style={styles.para}>Data is retained while your account is active. You may request deletion at any time. Account data is permanently removed within 30 days.</Text>
        </Section>
        <Section title="9. Cookies & Tracking">
          <Text style={styles.para}>We use minimal local storage for session management only. No third-party cookies or tracking technologies.</Text>
        </Section>
        <Section title="10. Contact">
          <Bullet text="Email: privacy@careernextstep.ac.za" />
          <Bullet text="Data Protection Officer: Richfield Legal Team" />
          <Bullet text="Information Regulator: www.justice.gov.za/inforeg/" />
        </Section>
        <Section title="11. Changes to Policy">
          <Text style={styles.para}>We may update this policy. Material changes will be notified through the app or email.</Text>
        </Section>
        {showAcceptButton && (
          <View style={styles.consentBox}>
            <Text style={styles.consentTitle}>Consent</Text>
            <Text style={styles.consentText}>By clicking "I Accept", you acknowledge that you have read this Privacy Policy and consent to the processing of your personal information in accordance with POPIA.</Text>
            <Pressable style={[styles.acceptBtn, accepted && styles.acceptBtnDone]} onPress={handleAccept}>
              <Text style={styles.acceptBtnText}>{accepted ? "Accepted" : "I Accept — Continue Registration"}</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Career Next Step — Richfield Institute of Technology</Text>
          <Text style={styles.footerText}>Built for the 2026 Richfield Hackathon</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ text }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  header: { backgroundColor: "#F0F9FF", borderBottomWidth: 1, borderBottomColor: "#BFDBFE", paddingHorizontal: 24, paddingTop: 40, paddingBottom: 28, alignItems: "center" },
  logo: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: "800", color: "#1E3A5F", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 12, color: "#208AEF", textAlign: "center", marginBottom: 6, fontWeight: "600" },
  effectiveDate: { fontSize: 11, color: "#64748B", marginTop: 4 },
  section: { paddingHorizontal: 24, paddingTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#1E3A5F", marginBottom: 10 },
  para: { fontSize: 13, lineHeight: 21, color: "#374151", marginBottom: 8 },
  bulletRow: { flexDirection: "row", marginBottom: 6, paddingLeft: 8 },
  bulletDot: { fontSize: 14, color: "#208AEF", marginRight: 8, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 20, color: "#4B5563" },
  consentBox: { marginTop: 24, marginHorizontal: 24, padding: 20, backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  consentTitle: { fontSize: 15, fontWeight: "800", color: "#1E3A5F", marginBottom: 8 },
  consentText: { fontSize: 13, lineHeight: 20, color: "#4B5563", marginBottom: 16 },
  acceptBtn: { backgroundColor: "#208AEF", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  acceptBtnDone: { backgroundColor: "#16A34A" },
  acceptBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  footer: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 24 },
  footerText: { fontSize: 11, color: "#9CA3AF", textAlign: "center", marginBottom: 4 },
});
