import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

function CandidateProfile({
  candidate,
  onClose,
  onStatusChange,
}) {
  const [profile, setProfile] = useState({});
  const [cv, setCv] = useState({});

  useEffect(() => {
    async function loadCandidateData() {
      if (!candidate?.seekerEmail) {
        setProfile({});
        setCv({});
        return;
      }

      const candidateEmail =
        candidate.seekerEmail.trim().toLowerCase();

      try {
        const savedProfile =
          await AsyncStorage.getItem(
            `careerAI_profile_${candidateEmail}`
          );

        if (savedProfile) {
          const parsedProfile = JSON.parse(savedProfile);

          setProfile(
            parsedProfile &&
              typeof parsedProfile === "object"
              ? parsedProfile
              : {}
          );
        } else {
          setProfile({});
        }
      } catch (error) {
        console.error(
          "Could not load candidate profile:",
          error
        );
        setProfile({});
      }

      try {
        const savedCV =
          await AsyncStorage.getItem(
            `careerAI_cv_${candidateEmail}`
          );

        if (savedCV) {
          const parsedCV = JSON.parse(savedCV);

          setCv(
            parsedCV &&
              typeof parsedCV === "object"
              ? parsedCV
              : {}
          );
        } else {
          setCv({});
        }
      } catch (error) {
        console.error(
          "Could not load candidate CV:",
          error
        );
        setCv({});
      }
    }

    loadCandidateData();
  }, [candidate]);

  if (!candidate) {
    return null;
  }

  const rawScore = candidate.matchScore;

  const score =
    rawScore !== undefined &&
    rawScore !== null &&
    !Number.isNaN(Number(rawScore))
      ? Math.max(
          0,
          Math.min(100, Number(rawScore))
        )
      : null;

  const status = candidate.status || "Applied";

  const candidateName =
    candidate.seekerName ||
    profile.name ||
    "Job Seeker";

  const candidateEmail =
    candidate.seekerEmail ||
    profile.email ||
    "Email not available";

  const location =
    profile.location ||
    candidate.location ||
    "Not provided";

  let skills = [];

  if (
    Array.isArray(candidate.seekerSkills) &&
    candidate.seekerSkills.length > 0
  ) {
    skills = candidate.seekerSkills;
  } else if (Array.isArray(profile.skills)) {
    skills = profile.skills;
  } else if (Array.isArray(cv.skills)) {
    skills = cv.skills;
  } else if (typeof profile.skills === "string") {
    skills = profile.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
  } else if (typeof cv.skills === "string") {
    skills = cv.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  const education =
    profile.education ||
    profile.qualification ||
    profile.degree ||
    cv.education ||
    cv.qualification ||
    cv.degree ||
    "Not provided";

  const experience =
    profile.experience ||
    profile.workExperience ||
    cv.experience ||
    cv.workExperience ||
    "Not provided";

  const targetCareer =
    profile.targetCareer ||
    profile.careerGoal ||
    profile.targetJob ||
    cv.targetCareer ||
    "Not provided";

  const about =
    profile.about ||
    profile.bio ||
    profile.description ||
    cv.about ||
    cv.bio ||
    "The candidate has not added an introduction yet.";

  const phone =
    profile.phone ||
    profile.phoneNumber ||
    cv.phone ||
    "Not provided";

  const employmentType =
    candidate.type || "Not specified";

  const salary =
    candidate.salary || "Not specified";

  function getInitials(name) {
    if (!name) {
      return "JS";
    }

    const parts = name
      .trim()
      .split(" ")
      .filter(Boolean);

    if (parts.length === 1) {
      return parts[0]
        .substring(0, 2)
        .toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  function getMatchText() {
    if (score === null) {
      return "Match score unavailable";
    }

    if (score >= 85) {
      return "Excellent Match";
    }

    if (score >= 70) {
      return "Good Match";
    }

    if (score >= 50) {
      return "Potential Match";
    }

    return "Low Match";
  }

  function changeStatus(newStatus) {
    if (!onStatusChange) {
      return;
    }

    onStatusChange(
      candidate.id,
      newStatus
    );
  }

  function formatDate(date) {
    if (!date) {
      return "Not available";
    }

    const parsedDate = new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "Not available";
    }

    return parsedDate.toLocaleDateString(
      "en-ZA",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  function getStatusStyle() {
    switch (status) {
      case "Shortlisted":
        return styles.statusShortlisted;

      case "Interview":
      case "Interview Scheduled":
        return styles.statusInterview;

      case "Hired":
        return styles.statusHired;

      case "Rejected":
        return styles.statusRejected;

      default:
        return styles.statusApplied;
    }
  }

  function getStatusIcon() {
    switch (status) {
      case "Shortlisted":
        return "⭐";

      case "Interview":
      case "Interview Scheduled":
        return "📅";

      case "Hired":
        return "🎉";

      case "Rejected":
        return "✕";

      default:
        return "✓";
    }
  }

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>

          {/* CLOSE */}

          <Pressable
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeText}>
              ×
            </Text>
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.scrollContent
            }
          >

            {/* PROFILE HEADER */}

            <View style={styles.header}>

              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(candidateName)}
                </Text>
              </View>

              <View style={styles.heading}>

                <Text style={styles.name}>
                  {candidateName}
                </Text>

                <Text style={styles.email}>
                  {candidateEmail}
                </Text>

                <Text style={styles.contact}>
                  📍 {location}
                </Text>

                {phone !== "Not provided" && (
                  <Text style={styles.contact}>
                    📞 {phone}
                  </Text>
                )}

              </View>

            </View>

            {/* AI MATCH */}

            <View
              style={[
                styles.matchBox,
                score !== null &&
                score >= 85
                  ? styles.matchHigh
                  : score !== null &&
                    score >= 70
                  ? styles.matchMedium
                  : styles.matchLow,
              ]}
            >
              <Text style={styles.matchScore}>
                {score !== null
                  ? `${score}%`
                  : "N/A"}
              </Text>

              <Text style={styles.matchLabel}>
                AI Match
              </Text>

              <Text style={styles.matchText}>
                {getMatchText()}
              </Text>
            </View>

            {/* APPLICATION STATUS */}

            <View style={styles.statusRow}>

              <View
                style={[
                  styles.statusBadge,
                  getStatusStyle(),
                ]}
              >
                <Text style={styles.statusText}>
                  {getStatusIcon()} {status}
                </Text>
              </View>

              <DetailRow
                label="Applied for"
                value={
                  candidate.jobTitle ||
                  candidate.title ||
                  "Position"
                }
              />

              {candidate.appliedAt && (
                <DetailRow
                  label="Applied"
                  value={formatDate(
                    candidate.appliedAt
                  )}
                />
              )}

              {candidate.statusUpdatedAt && (
                <DetailRow
                  label="Updated"
                  value={formatDate(
                    candidate.statusUpdatedAt
                  )}
                />
              )}

            </View>

            {/* ABOUT */}

            <View style={styles.section}>

              <Text style={styles.sectionTitle}>
                About Candidate
              </Text>

              <Text style={styles.bodyText}>
                {about}
              </Text>

            </View>

            {/* SKILLS */}

            <View style={styles.section}>

              <View style={styles.sectionHeadingRow}>

                <Text style={styles.sectionTitle}>
                  Skills
                </Text>

                <Text style={styles.skillCount}>
                  {skills.length}{" "}
                  {skills.length === 1
                    ? "skill"
                    : "skills"}
                </Text>

              </View>

              {skills.length > 0 ? (
                <View style={styles.skillsContainer}>

                  {skills.map(
                    (skill, index) => (
                      <View
                        key={`${skill}-${index}`}
                        style={styles.skillTag}
                      >
                        <Text style={styles.skillText}>
                          {skill}
                        </Text>
                      </View>
                    )
                  )}

                </View>
              ) : (
                <Text style={styles.mutedText}>
                  No skills have been added yet.
                </Text>
              )}

            </View>

            {/* EDUCATION */}

            <View style={styles.section}>

              <Text style={styles.sectionTitle}>
                Education
              </Text>

              <View style={styles.infoBox}>

                <Text style={styles.infoIcon}>
                  🎓
                </Text>

                <View style={styles.infoContent}>

                  <Text style={styles.infoTitle}>
                    Education / Qualification
                  </Text>

                  <Text style={styles.bodyText}>
                    {education}
                  </Text>

                </View>

              </View>

            </View>

            {/* EXPERIENCE */}

            <View style={styles.section}>

              <Text style={styles.sectionTitle}>
                Experience
              </Text>

              <View style={styles.experienceBox}>

                {experience !== "Not provided" ? (
                  <Text style={styles.bodyText}>
                    {experience}
                  </Text>
                ) : (
                  <Text style={styles.mutedText}>
                    No work experience has been
                    added yet.
                  </Text>
                )}

              </View>

            </View>

            {/* CAREER GOAL */}

            <View style={styles.section}>

              <Text style={styles.sectionTitle}>
                Career Goal
              </Text>

              <View style={styles.infoBox}>

                <Text style={styles.infoIcon}>
                  🎯
                </Text>

                <View style={styles.infoContent}>

                  <Text style={styles.infoTitle}>
                    Target Career
                  </Text>

                  <Text style={styles.bodyText}>
                    {targetCareer}
                  </Text>

                </View>

              </View>

            </View>

            {/* APPLICATION CARD */}

            <View style={styles.card}>

              <Text style={styles.cardTitle}>
                Application
              </Text>

              <DetailRow
                label="Position"
                value={
                  candidate.jobTitle ||
                  candidate.title ||
                  "Position"
                }
              />

              <DetailRow
                label="Company"
                value={
                  candidate.company ||
                  candidate.companyName ||
                  "Company"
                }
              />

              <DetailRow
                label="Location"
                value={
                  candidate.location ||
                  location
                }
              />

              <DetailRow
                label="Employment Type"
                value={employmentType}
              />

              <DetailRow
                label="Salary"
                value={salary}
              />

            </View>

            {/* AI MATCH ANALYSIS */}

            <View style={styles.aiCard}>

              <View style={styles.aiTitleRow}>

                <Text style={styles.aiIcon}>
                  ✦
                </Text>

                <Text style={styles.cardTitle}>
                  AI Match Analysis
                </Text>

              </View>

              <Text style={styles.aiScore}>
                {score !== null
                  ? `${score}%`
                  : "N/A"}
              </Text>

              <Text style={styles.aiMatchText}>
                {getMatchText()}
              </Text>

              <Text style={styles.aiDescription}>
                Career Next Step compares the
                candidate's skills, career
                information and application
                data with the requirements of
                the position.
              </Text>

              {score !== null && (
                <View style={styles.scoreBarBackground}>

                  <View
                    style={[
                      styles.scoreBar,
                      {
                        width: `${score}%`,
                      },
                    ]}
                  />

                </View>
              )}

            </View>

            {/* CANDIDATE ACTIONS */}

            <View style={styles.card}>

              <Text style={styles.cardTitle}>
                Candidate Actions
              </Text>

              <View style={styles.actions}>

                <ActionButton
                  icon="✓"
                  label={
                    status === "Shortlisted"
                      ? "Shortlisted"
                      : "Shortlist"
                  }
                  disabled={
                    status === "Shortlisted"
                  }
                  style={styles.shortlistButton}
                  onPress={() =>
                    changeStatus(
                      "Shortlisted"
                    )
                  }
                />

                <ActionButton
                  icon="◷"
                  label={
                    status === "Interview" ||
                    status ===
                      "Interview Scheduled"
                      ? "Interview Stage"
                      : "Move to Interview"
                  }
                  disabled={
                    status === "Interview" ||
                    status ===
                      "Interview Scheduled"
                  }
                  style={styles.interviewButton}
                  onPress={() =>
                    changeStatus(
                      "Interview"
                    )
                  }
                />

                <ActionButton
                  icon="★"
                  label={
                    status === "Hired"
                      ? "Hired"
                      : "Hire Candidate"
                  }
                  disabled={
                    status === "Hired"
                  }
                  style={styles.hireButton}
                  onPress={() =>
                    changeStatus("Hired")
                  }
                />

                <ActionButton
                  icon="×"
                  label={
                    status === "Rejected"
                      ? "Rejected"
                      : "Reject"
                  }
                  disabled={
                    status === "Rejected"
                  }
                  style={styles.rejectButton}
                  onPress={() =>
                    changeStatus("Rejected")
                  }
                />

              </View>

            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* =========================
   DETAIL ROW
========================= */

function DetailRow({
  label,
  value,
}) {
  return (
    <View style={styles.detailRow}>

      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value}
      </Text>

    </View>
  );
}

/* =========================
   ACTION BUTTON
========================= */

function ActionButton({
  icon,
  label,
  disabled,
  style,
  onPress,
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        style,
        disabled && styles.disabledButton,
      ]}
    >

      <Text style={styles.actionIcon}>
        {icon}
      </Text>

      <Text style={styles.actionText}>
        {label}
      </Text>

    </Pressable>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: 12,
  },

  modal: {
    flex: 1,
    maxHeight: "96%",
    backgroundColor: "#ffffff",
    borderRadius: 22,
    overflow: "hidden",
  },

  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },

  closeButton: {
    position: "absolute",
    right: 14,
    top: 12,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    fontSize: 30,
    lineHeight: 32,
    color: "#172033",
    fontWeight: "500",
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  avatarText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },

  heading: {
    flex: 1,
    paddingRight: 8,
  },

  name: {
    fontSize: 23,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 5,
  },

  email: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 5,
  },

  contact: {
    fontSize: 13,
    color: "#475569",
    marginTop: 3,
  },

  matchBox: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: "center",
    minWidth: 105,
    marginLeft: 8,
    marginBottom: 18,
  },

  matchHigh: {
    backgroundColor: "#dcfce7",
  },

  matchMedium: {
    backgroundColor: "#fef3c7",
  },

  matchLow: {
    backgroundColor: "#fee2e2",
  },

  matchScore: {
    fontSize: 25,
    fontWeight: "900",
    color: "#172033",
  },

  matchLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginTop: 2,
  },

  matchText: {
    fontSize: 10,
    color: "#64748b",
    textAlign: "center",
    marginTop: 3,
  },

  statusRow: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },

  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },

  statusApplied: {
    backgroundColor: "#e2e8f0",
  },

  statusShortlisted: {
    backgroundColor: "#fef3c7",
  },

  statusInterview: {
    backgroundColor: "#dbeafe",
  },

  statusHired: {
    backgroundColor: "#dcfce7",
  },

  statusRejected: {
    backgroundColor: "#fee2e2",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#172033",
  },

  section: {
    marginBottom: 22,
  },

  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 10,
  },

  skillCount: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },

  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#475569",
  },

  mutedText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#94a3b8",
    fontStyle: "italic",
  },

  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  skillTag: {
    backgroundColor: "#eff6ff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },

  skillText: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "700",
  },

  infoBox: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 14,
  },

  infoIcon: {
    fontSize: 25,
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 5,
  },

  experienceBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 14,
  },

  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 15,
  },

  detailRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 10,
  },

  detailLabel: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
  },

  detailValue: {
    fontSize: 14,
    color: "#172033",
    fontWeight: "700",
  },

  aiCard: {
    backgroundColor: "#f5f3ff",
    borderRadius: 16,
    padding: 17,
    marginBottom: 18,
  },

  aiTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  aiIcon: {
    fontSize: 21,
    color: "#7c3aed",
    marginRight: 8,
  },

  aiScore: {
    fontSize: 34,
    fontWeight: "900",
    color: "#172033",
  },

  aiMatchText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#7c3aed",
    marginBottom: 10,
  },

  aiDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: "#64748b",
    marginBottom: 14,
  },

  scoreBarBackground: {
    width: "100%",
    height: 9,
    borderRadius: 10,
    backgroundColor: "#ddd6fe",
    overflow: "hidden",
  },

  scoreBar: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#7c3aed",
  },

  actions: {
    gap: 10,
  },

  actionButton: {
    minHeight: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  shortlistButton: {
    backgroundColor: "#fef3c7",
  },

  interviewButton: {
    backgroundColor: "#dbeafe",
  },

  hireButton: {
    backgroundColor: "#dcfce7",
  },

  rejectButton: {
    backgroundColor: "#fee2e2",
  },

  disabledButton: {
    opacity: 0.55,
  },

  actionIcon: {
    fontSize: 16,
    fontWeight: "900",
    marginRight: 8,
    color: "#172033",
  },

  actionText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#172033",
  },
});

export default CandidateProfile;