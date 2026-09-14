import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { getSupabase } from "../lib/supabase";

export default function CV({ user }) {
  const [cvFile, setCvFile] = useState(null);
  const [saved, setSaved] = useState(false);

  /*
   * NLP-ASSISTED PROFILE BUILDING (brief 2.8)
   * CV text is sent to the deployed `ai-assistant` Supabase Edge Function,
   * which extracts skills / experience / suggestions via an LLM. The AI key
   * lives server-side only.
   */
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");

  const email =
    user?.email?.trim().toLowerCase() || "guest";

  const storageKey =
    `careerAI_cv_${email}`;

  useEffect(() => {
    loadCV();
  }, [storageKey, email]);

  async function loadCV() {
    try {
      const savedCV =
        await AsyncStorage.getItem(
          storageKey
        );

      if (savedCV) {
        try {
          const parsedCV =
            JSON.parse(savedCV);

          /*
           * Only load the CV if it belongs
           * to the currently logged-in user.
           */
          if (
            !parsedCV.email ||
            parsedCV.email.toLowerCase() ===
              email
          ) {
            setCvFile(parsedCV);
          } else {
            setCvFile(null);
          }

          setSaved(false);
          return;
        } catch {
          await AsyncStorage.removeItem(
            storageKey
          );

          setCvFile(null);
        }
      }

      /*
       * Migrate an old CV only when
       * it belongs to this account.
       */
      const oldCV =
        await AsyncStorage.getItem(
          "careerAI_cv"
        );

      if (oldCV) {
        try {
          const parsedCV =
            JSON.parse(oldCV);

          if (
            parsedCV?.name &&
            (
              !parsedCV.email ||
              parsedCV.email.toLowerCase() ===
                email
            )
          ) {
            const migratedCV = {
              ...parsedCV,
              email,
            };

            await AsyncStorage.setItem(
              storageKey,
              JSON.stringify(
                migratedCV
              )
            );

            setCvFile(migratedCV);
          } else {
            setCvFile(null);
          }
        } catch {
          setCvFile(null);
        }
      } else {
        setCvFile(null);
      }
    } catch (error) {
      console.error(
        "Could not load CV:",
        error
      );

      setCvFile(null);
    }

    setSaved(false);
  }

  async function handleFileChange() {
    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
          copyToCacheDirectory: true,
          multiple: false,
        });

      if (result.canceled) {
        return;
      }

      const file = result.assets?.[0];

      if (!file) {
        return;
      }

      const fileName =
        file.name?.toLowerCase() || "";

      const allowedExtensions = [
        ".pdf",
        ".doc",
        ".docx",
      ];

      const hasValidExtension =
        allowedExtensions.some(
          (extension) =>
            fileName.endsWith(extension)
        );

      if (!hasValidExtension) {
        Alert.alert(
          "Invalid file",
          "Please upload a PDF or Word document."
        );

        return;
      }

      const fileData = {
        name: file.name,
        size: file.size || 0,
        type: file.mimeType || "",
        uri: file.uri,
        uploadedAt:
          new Date().toISOString(),
        email,
      };

      setCvFile(fileData);

      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(fileData)
      );

      setSaved(true);
    } catch (error) {
      console.error(
        "Could not select CV:",
        error
      );

      Alert.alert(
        "Upload error",
        "Could not select your CV. Please try again."
      );
    }
  }

  /*
   * Sends the CV text to the ai-assistant Edge Function (mode: "profile").
   * The function returns structured JSON:
   *   { summary, skills[], experience[{title, company, period}], suggestions[] }
   */
  async function analyzeCV() {
    const text = aiText.trim();

    if (!text && !cvFile) {
      Alert.alert(
        "Nothing to analyse",
        "Paste your CV text below (or upload a CV first), then tap Analyze."
      );
      return;
    }

    if (!text) {
      Alert.alert(
        "Paste your CV text",
        "For privacy, paste the text of your CV into the box below — Nexi will extract your skills, experience and suggestions automatically."
      );
      return;
    }

    const sb = getSupabase();

    if (!sb) {
      setAiError(
        "Supabase is not configured yet, so the AI engine is offline."
      );
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiResult(null);

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
            mode: "profile",
            text: text.slice(0, 12000),
          }),
        }
      );

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(
          payload?.error ||
            `The AI engine returned an error (${res.status}).`
        );
      }

      // The model returns JSON, but strip markdown fences just in case.
      const raw = String(payload?.content ?? "")
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/, "")
        .trim();

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error(
          "The AI response could not be parsed. Please try again."
        );
      }

      setAiResult({
        summary: parsed.summary || "",
        skills: Array.isArray(parsed.skills)
          ? parsed.skills.slice(0, 12)
          : [],
        experience: Array.isArray(parsed.experience)
          ? parsed.experience.slice(0, 6)
          : [],
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.slice(0, 5)
          : [],
      });
    } catch (error) {
      setAiError(
        error?.message ||
          "Could not analyse your CV right now. Please try again."
      );
    } finally {
      setAiLoading(false);
    }
  }

  /*
   * Merges the AI-extracted skills (and summary, if the profile has none)
   * into the user's profile so business-user searches and the smart job
   * matching engine pick them up.
   */
  async function applyToProfile() {
    if (!aiResult || !aiResult.skills.length) {
      return;
    }

    const profileKey = `careerAI_profile_${email}`;

    try {
      const stored = await AsyncStorage.getItem(profileKey);
      const parsed = stored ? JSON.parse(stored) : {};
      const existingSkills = Array.isArray(parsed.skills)
        ? parsed.skills
        : [];

      const merged = [
        ...existingSkills,
        ...aiResult.skills.filter(
          (skill) =>
            !existingSkills.some(
              (s) =>
                String(s).toLowerCase() ===
                String(skill).toLowerCase()
            )
        ),
      ];

      const updated = {
        ...parsed,
        skills: merged,
        summary:
          !parsed.summary && aiResult.summary
            ? aiResult.summary
            : parsed.summary,
      };

      await AsyncStorage.setItem(
        profileKey,
        JSON.stringify(updated)
      );

      Alert.alert(
        "Profile updated ✓",
        `${aiResult.skills.length} skill(s) extracted by Nexi were added to your profile. They now feed the smart job-matching engine.`
      );
    } catch (error) {
      Alert.alert(
        "Could not update profile",
        error?.message || "Please try again."
      );
    }
  }

  function removeCV() {
    Alert.alert(
      "Remove CV",
      "Are you sure you want to remove your CV?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(
                storageKey
              );

              setCvFile(null);
              setSaved(false);
            } catch (error) {
              console.error(
                "Could not remove CV:",
                error
              );

              Alert.alert(
                "Error",
                "Could not remove your CV."
              );
            }
          },
        },
      ]
    );
  }

  function formatFileSize(bytes) {
    if (!bytes) {
      return "Unknown size";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={
        styles.pageContent
      }
    >
      {/* HEADER */}

      <View style={styles.pageHeading}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            Career Documents
          </Text>
        </View>

        <Text style={styles.title}>
          My CV
        </Text>

        <Text style={styles.description}>
          Upload your CV so Career Next Step
          can analyse your skills and help
          improve your job readiness.
        </Text>
      </View>

      {/* CV GRID */}

      <View style={styles.cvGrid}>
        {/* UPLOAD CARD */}

        <View style={styles.uploadCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>
                Upload your CV
              </Text>

              <Text style={styles.cardDescription}>
                PDF and Microsoft Word
                documents are supported.
              </Text>
            </View>

            <View style={styles.cvIcon}>
              <Text style={styles.iconText}>
                📄
              </Text>
            </View>
          </View>

          {!cvFile ? (
            <Pressable
              style={({ pressed }) => [
                styles.uploadArea,
                pressed &&
                  styles.buttonPressed,
              ]}
              onPress={
                handleFileChange
              }
            >
              <View style={styles.uploadIcon}>
                <Text style={styles.uploadIconText}>
                  ↑
                </Text>
              </View>

              <Text style={styles.uploadTitle}>
                Tap to upload your CV
              </Text>

              <Text style={styles.uploadTypes}>
                PDF, DOC or DOCX
              </Text>

              <Text style={styles.uploadSmall}>
                Your CV will be used for your
                Career Next Step assessment.
              </Text>
            </Pressable>
          ) : (
            <View style={styles.uploadedFile}>
              <View style={styles.uploadedFileIcon}>
                <Text style={styles.iconText}>
                  📄
                </Text>
              </View>

              <View style={styles.uploadedFileInfo}>
                <Text
                  style={styles.fileName}
                  numberOfLines={2}
                >
                  {cvFile.name}
                </Text>

                <Text style={styles.fileDetail}>
                  {formatFileSize(
                    cvFile.size
                  )}
                </Text>

                <Text style={styles.fileDetail}>
                  Uploaded{" "}
                  {new Date(
                    cvFile.uploadedAt
                  ).toLocaleDateString(
                    "en-ZA"
                  )}
                </Text>
              </View>

              <Pressable
                style={styles.removeButton}
                onPress={removeCV}
              >
                <Text
                  style={
                    styles.removeButtonText
                  }
                >
                  Remove
                </Text>
              </Pressable>
            </View>
          )}

          {saved && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                ✓ CV saved successfully
              </Text>
            </View>
          )}
        </View>

        {/* SCORE CARD */}

        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>
              {cvFile ? "82%" : "0%"}
            </Text>

            <Text style={styles.scoreLabel}>
              CV Score
            </Text>
          </View>

          <Text style={styles.scoreTitle}>
            {cvFile
              ? "Your CV is ready"
              : "Upload your CV"}
          </Text>

          <Text style={styles.scoreDescription}>
            {cvFile
              ? "Career Next Step can now analyse your CV and identify skills, experience and areas for improvement."
              : "Upload your CV to receive an AI-powered CV assessment."}
          </Text>

          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressBar,
                {
                  width: cvFile
                    ? "82%"
                    : "0%",
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* AI ANALYSIS */}

      <View style={styles.analysisCard}>
        <View style={styles.analysisHeader}>
          <View style={styles.analysisHeaderText}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                AI Analysis
              </Text>
            </View>

            <Text style={styles.analysisTitle}>
              CV Analysis
            </Text>

            <Text style={styles.analysisDescription}>
              Career Next Step will analyse
              your CV against your selected
              target career.
            </Text>
          </View>

          <Text style={styles.aiSymbol}>
            🤖
          </Text>
        </View>

        {/* ANALYSIS ITEMS */}

        <View style={styles.analysisGrid}>
          <AnalysisItem
            title="Skills"
            description="Identify technical and soft skills in your CV."
          />

          <AnalysisItem
            title="Experience"
            description="Analyse your education, projects and work experience."
          />

          <AnalysisItem
            title="Job Match"
            description="Compare your CV against your target career."
          />

          <AnalysisItem
            title="Improvements"
            description="Find areas where your CV can be strengthened."
          />
        </View>

        {/* NLP INPUT — paste CV text for extraction (brief 2.8) */}

        <Text style={styles.aiInputLabel}>
          {cvFile
            ? "CV uploaded — paste its text below so Nexi can extract your skills:"
            : "Paste your CV text below and Nexi will extract your skills, experience and suggestions:"}
        </Text>

        <TextInput
          style={styles.aiInput}
          placeholder="e.g. I studied a BCom IT degree at Richfield, completed a data analytics internship at…"
          placeholderTextColor="#93A1B8"
          value={aiText}
          onChangeText={setAiText}
          multiline
        />

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            aiLoading && styles.buttonPressed,
          ]}
          disabled={aiLoading}
          onPress={analyzeCV}
        >
          <Text style={styles.primaryButtonText}>
            {aiLoading
              ? "Nexi is analysing…"
              : "🤖 Analyse with Nexi AI"}
          </Text>
        </Pressable>

        {aiError ? (
          <View style={styles.aiErrorBox}>
            <Text style={styles.aiErrorText}>
              {aiError}
            </Text>
          </View>
        ) : null}

        {aiResult && (
          <View style={styles.aiResultCard}>
            <Text style={styles.aiResultTitle}>
              ✨ Nexi extracted from your CV
            </Text>

            {aiResult.summary ? (
              <Text style={styles.aiResultSummary}>
                {aiResult.summary}
              </Text>
            ) : null}

            {aiResult.skills.length > 0 && (
              <View style={styles.aiChipWrap}>
                {aiResult.skills.map((skill) => (
                  <View
                    style={styles.aiChip}
                    key={skill}
                  >
                    <Text style={styles.aiChipText}>
                      {skill}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {aiResult.experience.length > 0 && (
              <View style={styles.aiSection}>
                <Text style={styles.aiSectionTitle}>
                  Experience
                </Text>

                {aiResult.experience.map((item, index) => (
                  <Text
                    style={styles.aiExperienceItem}
                    key={`${item.title}-${index}`}
                  >
                    • {item.title}
                    {item.company ? ` — ${item.company}` : ""}
                    {item.period ? ` (${item.period})` : ""}
                  </Text>
                ))}
              </View>
            )}

            {aiResult.suggestions.length > 0 && (
              <View style={styles.aiSection}>
                <Text style={styles.aiSectionTitle}>
                  Suggestions
                </Text>

                {aiResult.suggestions.map((tip, index) => (
                  <Text
                    style={styles.aiSuggestionItem}
                    key={`${tip}-${index}`}
                  >
                    • {tip}
                  </Text>
                ))}
              </View>
            )}

            {aiResult.skills.length > 0 && (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={applyToProfile}
              >
                <Text style={styles.primaryButtonText}>
                  Add these skills to my profile
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function AnalysisItem({
  title,
  description,
}) {
  return (
    <View style={styles.analysisItem}>
      <View style={styles.checkCircle}>
        <Text style={styles.checkText}>
          ✓
        </Text>
      </View>

      <View style={styles.analysisItemText}>
        <Text style={styles.analysisItemTitle}>
          {title}
        </Text>

        <Text style={styles.analysisItemDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },

  pageContent: {
    padding: 16,
    paddingBottom: 40,
  },

  pageHeading: {
    marginBottom: 20,
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#e9eef8",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginBottom: 10,
  },

  badgeText: {
    color: "#34405a",
    fontSize: 11,
    fontWeight: "800",
  },

  title: {
    color: "#172033",
    fontSize: 29,
    fontWeight: "900",
  },

  description: {
    marginTop: 7,
    color: "#687386",
    fontSize: 14,
    lineHeight: 21,
  },

  cvGrid: {
    gap: 16,
  },

  uploadCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e4e8ef",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  cardHeaderText: {
    flex: 1,
    paddingRight: 10,
  },

  cardTitle: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "800",
  },

  cardDescription: {
    color: "#687386",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  cvIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f0f3f8",
    alignItems: "center",
    justifyContent: "center",
  },

  iconText: {
    fontSize: 22,
  },

  uploadArea: {
    minHeight: 190,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#cdd5e2",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fafbfe",
  },

  uploadIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e9eef8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  uploadIconText: {
    fontSize: 27,
    fontWeight: "700",
    color: "#34405a",
  },

  uploadTitle: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "800",
  },

  uploadTypes: {
    color: "#687386",
    fontSize: 12,
    marginTop: 6,
  },

  uploadSmall: {
    color: "#8a94a6",
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 17,
  },

  uploadedFile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f9fc",
    borderRadius: 13,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e4e8ef",
  },

  uploadedFileIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#e9eef8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  uploadedFileInfo: {
    flex: 1,
    minWidth: 0,
  },

  fileName: {
    color: "#172033",
    fontSize: 13,
    fontWeight: "800",
  },

  fileDetail: {
    color: "#687386",
    fontSize: 11,
    marginTop: 3,
  },

  removeButton: {
    marginLeft: 8,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#ffe7e7",
  },

  removeButtonText: {
    color: "#b42318",
    fontSize: 11,
    fontWeight: "800",
  },

  successBox: {
    marginTop: 12,
    padding: 11,
    borderRadius: 9,
    backgroundColor: "#e1f5e8",
  },

  successText: {
    color: "#217a43",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },

  scoreCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e4e8ef",
  },

  scoreCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#f0f3f8",
    borderWidth: 8,
    borderColor: "#dce3ef",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  scoreNumber: {
    color: "#172033",
    fontSize: 27,
    fontWeight: "900",
  },

  scoreLabel: {
    color: "#687386",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },

  scoreTitle: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  scoreDescription: {
    color: "#687386",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
  },

  progressBackground: {
    width: "100%",
    height: 8,
    backgroundColor: "#e8ecf2",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 17,
  },

  progressBar: {
    height: "100%",
    backgroundColor: "#34405a",
    borderRadius: 10,
  },

  analysisCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e4e8ef",
  },

  analysisHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  analysisHeaderText: {
    flex: 1,
    paddingRight: 10,
  },

  analysisTitle: {
    color: "#172033",
    fontSize: 21,
    fontWeight: "900",
  },

  analysisDescription: {
    color: "#687386",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },

  aiSymbol: {
    fontSize: 34,
  },

  analysisGrid: {
    marginTop: 20,
  },

  analysisItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  checkCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#e1f5e8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  checkText: {
    color: "#217a43",
    fontSize: 14,
    fontWeight: "900",
  },

  analysisItemText: {
    flex: 1,
  },

  analysisItemTitle: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "800",
  },

  analysisItemDescription: {
    color: "#687386",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },

  analysisMessage: {
    backgroundColor: "#f5f7fb",
    borderRadius: 10,
    padding: 13,
    marginTop: 3,
  },

  analysisMessageText: {
    color: "#687386",
    fontSize: 12,
    textAlign: "center",
  },

  primaryButton: {
    backgroundColor: "#172033",
    minHeight: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 20,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },

  buttonPressed: {
    opacity: 0.7,
  },

  // ---- NLP / AI analysis styles (brief 2.8) ----

  aiInputLabel: {
    marginTop: 18,
    fontSize: 13,
    fontWeight: "700",
    color: "#3A4761",
    lineHeight: 19,
  },

  aiInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E3E8F2",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    padding: 12,
    minHeight: 96,
    textAlignVertical: "top",
    fontSize: 13,
    color: "#0F1B33",
  },

  aiErrorBox: {
    marginTop: 12,
    backgroundColor: "#FDECEC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F5C2C2",
    padding: 12,
  },

  aiErrorText: {
    color: "#B3261E",
    fontSize: 12,
    lineHeight: 18,
  },

  aiResultCard: {
    marginTop: 14,
    backgroundColor: "#F4F8FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8E6FA",
    padding: 14,
  },

  aiResultTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F1B33",
  },

  aiResultSummary: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#1B2740",
  },

  aiChipWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  aiChip: {
    backgroundColor: "#E1EEFF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFDCF8",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },

  aiChipText: {
    color: "#1668B8",
    fontSize: 11,
    fontWeight: "700",
  },

  aiSection: {
    marginTop: 12,
  },

  aiSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#3A4761",
    marginBottom: 4,
  },

  aiExperienceItem: {
    fontSize: 12,
    color: "#1B2740",
    lineHeight: 18,
  },

  aiSuggestionItem: {
    fontSize: 12,
    color: "#1B2740",
    lineHeight: 18,
  },
});