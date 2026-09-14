import { useEffect, useState } from "react";
import {
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
import AsyncStorage from "@react-native-async-storage/async-storage";

const questions = [
  {
    category: "Introduction",
    question:
      "Tell me about yourself and your background.",
    tip:
      "Keep your answer focused on your education, skills, projects and career goals.",
  },
  {
    category: "Technical",
    question:
      "What programming languages and technologies are you comfortable using?",
    tip:
      "Mention technologies you actually know and give a short example of how you used them.",
  },
  {
    category: "Projects",
    question:
      "Tell me about a project you have worked on.",
    tip:
      "Explain the problem, what you built, the technologies you used and what you learned.",
  },
  {
    category: "Problem Solving",
    question:
      "How would you approach solving a programming problem you have never seen before?",
    tip:
      "Explain how you would understand the problem, break it into smaller parts, research and test your solution.",
  },
  {
    category: "Behavioural",
    question:
      "Tell me about a challenge you faced and how you overcame it.",
    tip:
      "Use a real example and explain the situation, your actions and the result.",
  },
  {
    category: "Teamwork",
    question:
      "How do you work with other people on a software project?",
    tip:
      "Talk about communication, Git, code reviews, responsibilities and helping team members.",
  },
  {
    category: "Career",
    question:
      "Why do you want to work in this career?",
    tip:
      "Connect your interests, skills and long-term goals to the position.",
  },
  {
    category: "Closing",
    question:
      "Why should we hire you?",
    tip:
      "Focus on your strengths, willingness to learn, practical skills and the value you can bring.",
  },
];

export default function Interview({ user }) {
  const email =
    user?.email?.trim().toLowerCase() || "guest";

  const profileKey =
    `careerAI_profile_${email}`;

  const interviewKey =
    `careerAI_interview_${email}`;

  const [profile, setProfile] = useState({});

  const [currentQuestion, setCurrentQuestion] =
    useState(0);

  const [answers, setAnswers] = useState({});

  const [started, setStarted] = useState(false);

  const [finished, setFinished] = useState(false);

  /*
  ==========================================
  LOAD USER DATA
  ==========================================
  */

  useEffect(() => {
    loadUserData();
  }, [email]);

  async function loadUserData() {
    /*
      Reset state first so one account's
      interview cannot appear for another.
    */
    setProfile({});
    setCurrentQuestion(0);
    setAnswers({});
    setStarted(false);
    setFinished(false);

    /*
    ==========================================
    LOAD PROFILE
    ==========================================
    */

    try {
      const savedProfile =
        await AsyncStorage.getItem(
          profileKey
        );

      if (savedProfile) {
        try {
          const parsedProfile =
            JSON.parse(savedProfile);

          const profileEmail =
            parsedProfile.email
              ?.trim()
              .toLowerCase();

          if (
            !profileEmail ||
            profileEmail === email
          ) {
            setProfile(parsedProfile);
          }
        } catch {
          await AsyncStorage.removeItem(
            profileKey
          );
        }
      } else {
        /*
        ======================================
        OLD PROFILE MIGRATION
        ======================================
        */

        const oldProfile =
          await AsyncStorage.getItem(
            "careerAI_profile"
          );

        if (oldProfile) {
          try {
            const parsedProfile =
              JSON.parse(oldProfile);

            const oldEmail =
              parsedProfile.email
                ?.trim()
                .toLowerCase();

            if (
              oldEmail &&
              oldEmail === email
            ) {
              const migratedProfile = {
                ...parsedProfile,
                email,
              };

              setProfile(
                migratedProfile
              );

              await AsyncStorage.setItem(
                profileKey,
                JSON.stringify(
                  migratedProfile
                )
              );
            }
          } catch {
            // Ignore invalid old profile.
          }
        }
      }

      /*
      ==========================================
      LOAD INTERVIEW
      ==========================================
      */

      const savedInterview =
        await AsyncStorage.getItem(
          interviewKey
        );

      if (savedInterview) {
        try {
          const interviewData =
            JSON.parse(savedInterview);

          const interviewEmail =
            interviewData.email
              ?.trim()
              .toLowerCase();

          /*
            Do not load another user's
            interview data.
          */
          if (
            interviewEmail &&
            interviewEmail !== email
          ) {
            return;
          }

          if (
            interviewData.answers &&
            typeof interviewData.answers ===
              "object" &&
            !Array.isArray(
              interviewData.answers
            )
          ) {
            setAnswers(
              interviewData.answers
            );
          }

          /*
            Completed interviews show the
            completed screen.
          */
          if (
            interviewData.completedAt
          ) {
            setFinished(true);
          }
        } catch {
          await AsyncStorage.removeItem(
            interviewKey
          );
        }
      } else {
        /*
        ======================================
        OLD INTERVIEW MIGRATION
        ======================================
        */

        const oldInterview =
          await AsyncStorage.getItem(
            "careerAI_interview"
          );

        if (oldInterview) {
          try {
            const interviewData =
              JSON.parse(oldInterview);

            const oldEmail =
              interviewData.email
                ?.trim()
                .toLowerCase();

            if (
              oldEmail &&
              oldEmail === email
            ) {
              const migratedInterview = {
                ...interviewData,
                email,
              };

              setAnswers(
                migratedInterview.answers ||
                  {}
              );

              if (
                migratedInterview.completedAt
              ) {
                setFinished(true);
              }

              await AsyncStorage.setItem(
                interviewKey,
                JSON.stringify(
                  migratedInterview
                )
              );
            }
          } catch {
            // Ignore invalid old interview data.
          }
        }
      }
    } catch (error) {
      console.log(
        "Error loading interview:",
        error
      );
    }
  }

  /*
  ==========================================
  UPDATE ANSWER
  ==========================================
  */

  function updateAnswer(value) {
    setAnswers(
      (previousAnswers) => ({
        ...previousAnswers,
        [currentQuestion]: value,
      })
    );
  }

  /*
  ==========================================
  SAVE INTERVIEW
  ==========================================
  */

  async function saveInterview(
    finalAnswers
  ) {
    const interviewData = {
      email,
      answers: finalAnswers,
      completedAt:
        new Date().toISOString(),
    };

    try {
      /*
        Save specifically for this account.
      */
      await AsyncStorage.setItem(
        interviewKey,
        JSON.stringify(
          interviewData
        )
      );

      /*
        Compatibility with older
        Dashboard code.
      */
      await AsyncStorage.setItem(
        "careerAI_interview",
        JSON.stringify(
          interviewData
        )
      );
    } catch (error) {
      console.log(
        "Error saving interview:",
        error
      );
    }
  }

  /*
  ==========================================
  NEXT QUESTION
  ==========================================
  */

  async function nextQuestion() {
    const currentAnswer =
      answers[currentQuestion] || "";

    if (!currentAnswer.trim()) {
      Alert.alert(
        "Answer required",
        "Please enter an answer before continuing."
      );

      return;
    }

    if (
      currentQuestion <
      questions.length - 1
    ) {
      setCurrentQuestion(
        (previousQuestion) =>
          previousQuestion + 1
      );

      return;
    }

    /*
      Make sure the final answer is included.
    */
    const finalAnswers = {
      ...answers,
      [currentQuestion]:
        currentAnswer,
    };

    setAnswers(finalAnswers);

    await saveInterview(
      finalAnswers
    );

    setFinished(true);
    setStarted(false);
  }

  /*
  ==========================================
  PREVIOUS QUESTION
  ==========================================
  */

  function previousQuestion() {
    if (currentQuestion > 0) {
      setCurrentQuestion(
        (previousQuestion) =>
          previousQuestion - 1
      );
    }
  }

  /*
  ==========================================
  RESTART INTERVIEW
  ==========================================
  */

  async function restartInterview() {
    try {
      /*
        Delete only this user's
        interview data.
      */
      await AsyncStorage.removeItem(
        interviewKey
      );
    } catch (error) {
      console.log(
        "Error restarting interview:",
        error
      );
    }

    setCurrentQuestion(0);
    setAnswers({});
    setFinished(false);
    setStarted(false);
  }

  /*
  ==========================================
  COMPLETED SCREEN
  ==========================================
  */

  if (finished) {
    return (
      <ScrollView
        style={styles.page}
        contentContainerStyle={
          styles.completeContainer
        }
      >
        <View style={styles.completeCard}>
          <View
            style={
              styles.completeIcon
            }
          >
            <Text
              style={
                styles.completeIconText
              }
            >
              
            </Text>
          </View>

          <View
            style={styles.badge}
          >
            <Text
              style={styles.badgeText}
            >
              Interview Complete
            </Text>
          </View>

          <Text
            style={styles.completeTitle}
          >
            Great work!
          </Text>

          <Text
            style={styles.completeDescription}
          >
            You completed your Career Next Step
            interview practice session.
          </Text>

          <View
            style={styles.statsContainer}
          >
            <View
              style={styles.statBox}
            >
              <Text
                style={styles.statNumber}
              >
                {questions.length}
              </Text>

              <Text
                style={styles.statLabel}
              >
                Questions answered
              </Text>
            </View>

            <View
              style={styles.statBox}
            >
              <Text
                style={styles.statNumber}
              >
                100%
              </Text>

              <Text
                style={styles.statLabel}
              >
                Session completed
              </Text>
            </View>
          </View>

          <Text
            style={styles.interviewNote}
          >
            Review your answers and practise
            saying them naturally rather than
            memorising them word for word.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={
              restartInterview
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Practise Again
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  /*
  ==========================================
  START SCREEN
  ==========================================
  */

  if (!started) {
    const career =
      profile.targetCareer ||
      "your target career";

    return (
      <ScrollView
        style={styles.page}
        contentContainerStyle={
          styles.container
        }
      >
        <View style={styles.pageHeading}>
          <View
            style={styles.badge}
          >
            <Text
              style={styles.badgeText}
            >
              Interview Preparation
            </Text>
          </View>

          <Text
            style={styles.pageTitle}
          >
            Interview Practice
          </Text>

          <Text
            style={styles.pageDescription}
          >
            Prepare for interviews and build
            confidence before speaking to
            employers.
          </Text>
        </View>

        <View
          style={styles.startCard}
        >
          <View
            style={styles.startIcon}
          >
            <Text
              style={styles.startIconText}
            >
              
            </Text>
          </View>

          <Text
            style={styles.startTitle}
          >
            Practise for your next interview
          </Text>

          <Text
            style={styles.startDescription}
          >
            Career Next Step will ask you{" "}
            {questions.length} interview questions
            covering introduction, technical
            skills, projects, teamwork and career
            goals.
          </Text>

          <View
            style={
              styles.informationContainer
            }
          >
            <View
              style={styles.infoRow}
            >
              <Text
                style={styles.infoLabel}
              >
                Target Career
              </Text>

              <Text
                style={styles.infoValue}
              >
                {career}
              </Text>
            </View>

            <View
              style={styles.infoRow}
            >
              <Text
                style={styles.infoLabel}
              >
                Questions
              </Text>

              <Text
                style={styles.infoValue}
              >
                {questions.length}
              </Text>
            </View>

            <View
              style={styles.infoRow}
            >
              <Text
                style={styles.infoLabel}
              >
                Focus
              </Text>

              <Text
                style={styles.infoValue}
              >
                Graduate Interview
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              setStarted(true)
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Start Interview
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  /*
  ==========================================
  CURRENT QUESTION
  ==========================================
  */

  const question =
    questions[currentQuestion];

  const progress =
    ((currentQuestion + 1) /
      questions.length) *
    100;

  const currentAnswer =
    answers[currentQuestion] || "";

  /*
  ==========================================
  INTERVIEW SCREEN
  ==========================================
  */

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        style={styles.page}
        contentContainerStyle={
          styles.container
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pageHeading}>
          <View
            style={styles.badge}
          >
            <Text
              style={styles.badgeText}
            >
              Interview Practice
            </Text>
          </View>

          <Text
            style={styles.pageTitle}
          >
            Practice Interview
          </Text>

          <Text
            style={styles.pageDescription}
          >
            Question{" "}
            {currentQuestion + 1} of{" "}
            {questions.length}
          </Text>
        </View>

        <View
          style={styles.interviewCard}
        >
          {/* Progress */}
          <View
            style={styles.progressBackground}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width:
                    `${progress}%`,
                },
              ]}
            />
          </View>

          {/* Question header */}
          <View
            style={
              styles.questionHeader
            }
          >
            <View
              style={styles.categoryBadge}
            >
              <Text
                style={
                  styles.categoryText
                }
              >
                {question.category}
              </Text>
            </View>

            <Text
              style={styles.questionNumber}
            >
              {currentQuestion + 1}/
              {questions.length}
            </Text>
          </View>

          {/* Question */}
          <Text
            style={styles.questionTitle}
          >
            {question.question}
          </Text>

          {/* Answer */}
          <TextInput
            value={currentAnswer}
            onChangeText={
              updateAnswer
            }
            placeholder="Type your answer here..."
            placeholderTextColor="#8a94a6"
            multiline
            textAlignVertical="top"
            style={
              styles.answerInput
            }
          />

          {/* Tip */}
          <View
            style={styles.tipBox}
          >
            <Text
              style={styles.tipTitle}
            >
              💡 Interview Tip
            </Text>

            <Text
              style={styles.tipText}
            >
              {question.tip}
            </Text>
          </View>

          {/* Navigation */}
          <View
            style={
              styles.navigationContainer
            }
          >
            <Pressable
              style={[
                styles.secondaryButton,
                currentQuestion === 0 &&
                  styles.disabledButton,
              ]}
              onPress={
                previousQuestion
              }
              disabled={
                currentQuestion === 0
              }
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                ← Previous
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.primaryButton
              }
              onPress={
                nextQuestion
              }
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {currentQuestion ===
                questions.length - 1
                  ? "Finish Interview"
                  : "Next Question →"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/*
==========================================
STYLES
==========================================
*/

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },

  keyboardContainer: {
    flex: 1,
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  completeContainer: {
    padding: 20,
    paddingBottom: 40,
    justifyContent: "center",
    flexGrow: 1,
  },

  /*
  ========================================
  HEADINGS
  ========================================
  */

  pageHeading: {
    marginBottom: 20,
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#e8eefc",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
  },

  badgeText: {
    color: "#3156a3",
    fontSize: 12,
    fontWeight: "700",
  },

  pageTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 8,
  },

  pageDescription: {
    color: "#687386",
    fontSize: 15,
    lineHeight: 22,
  },

  /*
  ========================================
  START CARD
  ========================================
  */

  startCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e2e7f0",
    alignItems: "center",
  },

  startIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#eef3ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  startIconText: {
    fontSize: 32,
  },

  startTitle: {
    color: "#172033",
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },

  startDescription: {
    color: "#687386",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginBottom: 24,
  },

  informationContainer: {
    width: "100%",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e9f0",
    marginBottom: 24,
  },

  infoRow: {
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#edf0f5",
  },

  infoLabel: {
    color: "#687386",
    fontSize: 14,
    fontWeight: "600",
  },

  infoValue: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "700",
    maxWidth: "55%",
    textAlign: "right",
  },

  /*
  ========================================
  INTERVIEW CARD
  ========================================
  */

  interviewCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e7f0",
  },

  progressBackground: {
    height: 8,
    backgroundColor: "#e8ecf3",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 22,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#3156a3",
    borderRadius: 10,
  },

  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  categoryBadge: {
    backgroundColor: "#eef3ff",
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  categoryText: {
    color: "#3156a3",
    fontSize: 12,
    fontWeight: "700",
  },

  questionNumber: {
    color: "#687386",
    fontSize: 13,
    fontWeight: "700",
  },

  questionTitle: {
    color: "#172033",
    fontSize: 21,
    lineHeight: 29,
    fontWeight: "800",
    marginBottom: 18,
  },

  answerInput: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: "#d9dfe9",
    borderRadius: 14,
    padding: 15,
    color: "#172033",
    backgroundColor: "#fbfcfe",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },

  /*
  ========================================
  TIP
  ========================================
  */

  tipBox: {
    backgroundColor: "#fff8e8",
    borderWidth: 1,
    borderColor: "#f1dfaa",
    borderRadius: 14,
    padding: 15,
    marginBottom: 22,
  },

  tipTitle: {
    color: "#795b16",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 7,
  },

  tipText: {
    color: "#6f613d",
    fontSize: 14,
    lineHeight: 21,
  },

  /*
  ========================================
  BUTTONS
  ========================================
  */

  navigationContainer: {
    flexDirection: "row",
    gap: 10,
  },

  primaryButton: {
    flex: 1,
    backgroundColor: "#3156a3",
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },

  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd2df",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  secondaryButtonText: {
    color: "#344054",
    fontSize: 14,
    fontWeight: "700",
  },

  disabledButton: {
    opacity: 0.4,
  },

  /*
  ========================================
  COMPLETED SCREEN
  ========================================
  */

  completeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e2e7f0",
    alignItems: "center",
  },

  completeIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#e8f7ed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  completeIconText: {
    color: "#2d8a4a",
    fontSize: 40,
    fontWeight: "800",
  },

  completeTitle: {
    color: "#172033",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 10,
  },

  completeDescription: {
    color: "#687386",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 22,
  },

  statsContainer: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },

  statBox: {
    flex: 1,
    backgroundColor: "#f6f8fc",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },

  statNumber: {
    color: "#3156a3",
    fontSize: 25,
    fontWeight: "800",
    marginBottom: 5,
  },

  statLabel: {
    color: "#687386",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },

  interviewNote: {
    color: "#687386",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 22,
  },
});