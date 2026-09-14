import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const questions = [
  {
    question: "How confident are you with programming?",
    options: [
      "Beginner",
      "Basic",
      "Intermediate",
      "Advanced",
    ],
    points: [10, 15, 20, 25],
  },
  {
    question:
      "How comfortable are you with Git and version control?",
    options: [
      "I have never used it",
      "I know the basics",
      "I use it regularly",
      "I am very confident",
    ],
    points: [5, 10, 15, 20],
  },
  {
    question:
      "How much practical project experience do you have?",
    options: [
      "None",
      "Small school projects",
      "Several projects",
      "Real-world projects",
    ],
    points: [5, 10, 15, 20],
  },
  {
    question:
      "How confident are you in technical interviews?",
    options: [
      "Not confident",
      "Slightly confident",
      "Confident",
      "Very confident",
    ],
    points: [5, 10, 15, 20],
  },
  {
    question:
      "How strong are your communication skills?",
    options: [
      "Needs improvement",
      "Basic",
      "Good",
      "Excellent",
    ],
    points: [5, 10, 15, 20],
  },
];

export default function Assessment({ user }) {
  /*
    Each account gets its own assessment.

    Example:
    careerAI_assessment_yaseen@example.com
  */

  const email =
    user?.email?.trim().toLowerCase() || "guest";

  const assessmentKey =
    `careerAI_assessment_${email}`;

  const [career, setCareer] = useState("");

  const [currentQuestion, setCurrentQuestion] =
    useState(0);

  const [answers, setAnswers] = useState([]);

  const [finished, setFinished] = useState(false);

  const [score, setScore] = useState(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreviousAssessment();
  }, [email]);

  /*
    ============================
    LOAD SAVED ASSESSMENT
    ============================
  */

  async function loadPreviousAssessment() {
    /*
      Always reset the state first.
      This prevents Account A's assessment
      from appearing for Account B.
    */

    setCareer("");
    setCurrentQuestion(0);
    setAnswers([]);
    setFinished(false);
    setScore(0);
    setLoading(true);

    try {
      const saved =
        await AsyncStorage.getItem(
          assessmentKey
        );

      if (!saved) {
        /*
          Try the old global storage only
          for migration purposes.
        */

        await migrateOldAssessment();
        setLoading(false);
        return;
      }

      try {
        const assessment =
          JSON.parse(saved);

        /*
          Extra account protection.
        */

        if (
          assessment.email &&
          assessment.email
            .trim()
            .toLowerCase() !== email
        ) {
          setLoading(false);
          return;
        }

        setCareer(
          assessment.career || ""
        );

        setScore(
          Number(assessment.score) || 0
        );

        /*
          Restore saved answers if they exist.
        */

        if (
          Array.isArray(
            assessment.answers
          )
        ) {
          setAnswers(
            assessment.answers
          );
        }

        /*
          If completed, show the result.
        */

        if (assessment.completedAt) {
          setFinished(true);
        }
      } catch {
        await AsyncStorage.removeItem(
          assessmentKey
        );
      }
    } catch (error) {
      console.log(
        "Error loading assessment:",
        error
      );
    }

    setLoading(false);
  }

  /*
    ============================
    MIGRATE OLD ASSESSMENT
    ============================
  */

  async function migrateOldAssessment() {
    try {
      const oldSaved =
        await AsyncStorage.getItem(
          "careerAI_assessment"
        );

      if (!oldSaved) {
        return;
      }

      try {
        const oldAssessment =
          JSON.parse(oldSaved);

        const oldEmail =
          oldAssessment.email
            ?.trim()
            .toLowerCase();

        /*
          Only migrate the assessment if
          it belongs to this user.
        */

        if (
          oldEmail &&
          oldEmail !== email
        ) {
          return;
        }

        const migratedAssessment = {
          ...oldAssessment,
          email,
        };

        await AsyncStorage.setItem(
          assessmentKey,
          JSON.stringify(
            migratedAssessment
          )
        );

        setCareer(
          migratedAssessment.career ||
            ""
        );

        setScore(
          Number(
            migratedAssessment.score
          ) || 0
        );

        if (
          Array.isArray(
            migratedAssessment.answers
          )
        ) {
          setAnswers(
            migratedAssessment.answers
          );
        }

        if (
          migratedAssessment.completedAt
        ) {
          setFinished(true);
        }
      } catch {
        // Ignore invalid old data.
      }
    } catch (error) {
      console.log(
        "Error migrating assessment:",
        error
      );
    }
  }

  /*
    ============================
    SELECT ANSWER
    ============================
  */

  function selectAnswer(index) {
    const updatedAnswers = [
      ...answers,
    ];

    updatedAnswers[
      currentQuestion
    ] = index;

    setAnswers(
      updatedAnswers
    );
  }

  /*
    ============================
    NEXT QUESTION
    ============================
  */

  function nextQuestion() {
    if (
      answers[currentQuestion] ===
      undefined
    ) {
      Alert.alert(
        "Answer Required",
        "Please select an answer first."
      );

      return;
    }

    if (
      currentQuestion <
      questions.length - 1
    ) {
      setCurrentQuestion(
        currentQuestion + 1
      );
    } else {
      calculateScore();
    }
  }

  /*
    ============================
    PREVIOUS QUESTION
    ============================
  */

  function previousQuestion() {
    if (currentQuestion > 0) {
      setCurrentQuestion(
        currentQuestion - 1
      );
    }
  }

  /*
    ============================
    CALCULATE SCORE
    ============================
  */

  async function calculateScore() {
    let total = 0;

    answers.forEach(
      (answer, index) => {
        if (
          answer !== undefined &&
          questions[index]
        ) {
          total +=
            questions[index]
              .points[answer] || 0;
        }
      }
    );

    /*
      Maximum score:
      25 + 20 + 20 + 20 + 20 = 105
    */

    const finalScore =
      Math.min(
        Math.round(
          (total / 105) * 100
        ),
        99
      );

    const assessmentData = {
      email,
      career,
      score: finalScore,
      answers,
      completedAt:
        new Date().toISOString(),
    };

    setScore(
      finalScore
    );

    setFinished(true);

    /*
      Save to this user's private
      assessment storage.
    */

    try {
      await AsyncStorage.setItem(
        assessmentKey,
        JSON.stringify(
          assessmentData
        )
      );

      /*
        Keep old global storage updated
        temporarily for compatibility with
        older dashboard code.
      */

      await AsyncStorage.setItem(
        "careerAI_assessment",
        JSON.stringify(
          assessmentData
        )
      );
    } catch (error) {
      console.log(
        "Error saving assessment:",
        error
      );

      Alert.alert(
        "Save Error",
        "Your assessment was completed, but there was a problem saving it."
      );
    }
  }

  /*
    ============================
    RESTART ASSESSMENT
    ============================
  */

  async function restartAssessment() {
    /*
      Remove ONLY this user's assessment.
    */

    try {
      await AsyncStorage.removeItem(
        assessmentKey
      );
    } catch (error) {
      console.log(
        "Error removing assessment:",
        error
      );
    }

    setCurrentQuestion(0);
    setAnswers([]);
    setFinished(false);
    setScore(0);
    setCareer("");
  }

  /*
    ============================
    LOADING
    ============================
  */

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Loading your assessment...
        </Text>
      </View>
    );
  }

  /*
    ============================
    COMPLETED RESULT
    ============================
  */

  if (finished) {
    return (
      <ScrollView
        style={styles.page}
        contentContainerStyle={
          styles.pageContent
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.resultCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              Assessment Complete
            </Text>
          </View>

          <Text style={styles.resultTitle}>
            Your Job Readiness Score
          </Text>

          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>
              {score}%
            </Text>

            <Text style={styles.scoreLabel}>
              Job Readiness
            </Text>
          </View>

          <Text style={styles.resultHeading}>
            {score >= 80
              ? "You look job-ready!"
              : score >= 60
              ? "You are on the right track."
              : "There is room to improve."}
          </Text>

          <Text style={styles.resultDescription}>
            Career Next Step analysed your
            answers for the{" "}
            <Text style={styles.bold}>
              {career}
            </Text>{" "}
            career path.
          </Text>

          <View style={styles.resultGrid}>
            <View style={styles.resultItem}>
              <Text style={styles.resultItemTitle}>
                Strengths
              </Text>

              <Text style={styles.resultItemText}>
                Your current knowledge
                and experience
              </Text>
            </View>

            <View style={styles.resultItem}>
              <Text style={styles.resultItemTitle}>
                Skill Gaps
              </Text>

              <Text style={styles.resultItemText}>
                Areas that could improve
                your score
              </Text>
            </View>

            <View style={styles.resultItem}>
              <Text style={styles.resultItemTitle}>
                Next Steps
              </Text>

              <Text style={styles.resultItemText}>
                Build projects and
                practise interviews
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed &&
                styles.buttonPressed,
            ]}
            onPress={
              restartAssessment
            }
          >
            <Text style={styles.primaryButtonText}>
              Retake Assessment
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  /*
    ============================
    CAREER SELECTION
    ============================
  */

  if (!career) {
    return (
      <ScrollView
        style={styles.page}
        contentContainerStyle={
          styles.pageContent
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeading}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              AI Career Assessment
            </Text>
          </View>

          <Text style={styles.pageTitle}>
            AI Assessment
          </Text>

          <Text style={styles.pageDescription}>
            Find out how ready you are
            for your target career.
          </Text>
        </View>

        <View style={styles.careerCard}>
          <Text style={styles.cardTitle}>
            Choose your target career
          </Text>

          <Text style={styles.cardDescription}>
            Select the career you want
            Career Next Step to assess
            you for.
          </Text>

          <View style={styles.careerOptions}>
            {[
              "Junior Software Developer",
              "Frontend Developer",
              "Backend Developer",
              "Full Stack Developer",
              "Data Analyst",
              "UI/UX Designer",
              "Cybersecurity Analyst",
              "Game Developer",
            ].map((item) => (
              <Pressable
                key={item}
                style={({ pressed }) => [
                  styles.careerOption,
                  pressed &&
                    styles.optionPressed,
                ]}
                onPress={() =>
                  setCareer(item)
                }
              >
                <Text style={styles.careerOptionText}>
                  {item}
                </Text>

                <Text style={styles.arrow}>
                  →
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  /*
    ============================
    QUESTIONS
    ============================
  */

  const question =
    questions[
      currentQuestion
    ];

  const progress =
    ((currentQuestion + 1) /
      questions.length) *
    100;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={
        styles.pageContent
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeading}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            AI Career Assessment
          </Text>
        </View>

        <Text style={styles.pageTitle}>
          Assess Your Skills
        </Text>

        <Text style={styles.pageDescription}>
          Target career:{" "}
          <Text style={styles.bold}>
            {career}
          </Text>
        </Text>
      </View>

      <View style={styles.assessmentCard}>
        {/* Progress bar */}

        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
              },
            ]}
          />
        </View>

        {/* Question number */}

        <Text style={styles.questionNumber}>
          Question {currentQuestion + 1} of{" "}
          {questions.length}
        </Text>

        {/* Question */}

        <Text style={styles.questionTitle}>
          {question.question}
        </Text>

        {/* Answers */}

        <View style={styles.answerOptions}>
          {question.options.map(
            (option, index) => {
              const selected =
                answers[
                  currentQuestion
                ] === index;

              return (
                <Pressable
                  type="button"
                  key={option}
                  style={({ pressed }) => [
                    styles.answerOption,
                    selected &&
                      styles.selectedAnswer,
                    pressed &&
                      styles.optionPressed,
                  ]}
                  onPress={() =>
                    selectAnswer(
                      index
                    )
                  }
                >
                  <View
                    style={[
                      styles.answerLetter,
                      selected &&
                        styles.selectedAnswerLetter,
                    ]}
                  >
                    <Text
                      style={[
                        styles.answerLetterText,
                        selected &&
                          styles.selectedAnswerLetterText,
                      ]}
                    >
                      {String.fromCharCode(
                        65 + index
                      )}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.answerText,
                      selected &&
                        styles.selectedAnswerText,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            }
          )}
        </View>

        {/* Navigation */}

        <View style={styles.navigation}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              currentQuestion === 0 &&
                styles.disabledButton,
              pressed &&
                currentQuestion !== 0 &&
                styles.buttonPressed,
            ]}
            onPress={
              previousQuestion
            }
            disabled={
              currentQuestion === 0
            }
          >
            <Text
              style={[
                styles.secondaryButtonText,
                currentQuestion === 0 &&
                  styles.disabledButtonText,
              ]}
            >
              ← Previous
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed &&
                styles.buttonPressed,
            ]}
            onPress={
              nextQuestion
            }
          >
            <Text style={styles.primaryButtonText}>
              {currentQuestion ===
              questions.length - 1
                ? "Finish Assessment"
                : "Next Question →"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  pageContent: {
    padding: 20,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F9FC",
    padding: 30,
  },

  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: "#64748B",
  },

  pageHeading: {
    marginBottom: 20,
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F0FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 12,
  },

  badgeText: {
    color: "#2563EB",
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
    fontSize: 16,
    lineHeight: 24,
    color: "#64748B",
  },

  bold: {
    fontWeight: "700",
    color: "#172033",
  },

  careerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  cardTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 8,
  },

  cardDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: "#64748B",
    marginBottom: 20,
  },

  careerOptions: {
    gap: 12,
  },

  careerOption: {
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  careerOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#172033",
  },

  arrow: {
    fontSize: 20,
    color: "#2563EB",
    marginLeft: 10,
  },

  assessmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  progressBackground: {
    height: 9,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 18,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 10,
  },

  questionNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 12,
  },

  questionTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 20,
  },

  answerOptions: {
    gap: 12,
  },

  answerOption: {
    minHeight: 62,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  selectedAnswer: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },

  answerLetter: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  selectedAnswerLetter: {
    backgroundColor: "#2563EB",
  },

  answerLetterText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
  },

  selectedAnswerLetterText: {
    color: "#FFFFFF",
  },

  answerText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: "#334155",
    fontWeight: "500",
  },

  selectedAnswerText: {
    color: "#1D4ED8",
    fontWeight: "700",
  },

  navigation: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },

  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },

  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  secondaryButtonText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  disabledButton: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },

  disabledButtonText: {
    color: "#94A3B8",
  },

  buttonPressed: {
    opacity: 0.75,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  optionPressed: {
    opacity: 0.75,
  },

  /*
    ============================
    RESULT SCREEN
    ============================
  */

  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  resultTitle: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "800",
    color: "#172033",
    textAlign: "center",
    marginBottom: 20,
  },

  scoreCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#EFF6FF",
    borderWidth: 10,
    borderColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  scoreNumber: {
    fontSize: 42,
    fontWeight: "900",
    color: "#2563EB",
  },

  scoreLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 3,
  },

  resultHeading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#172033",
    textAlign: "center",
    marginBottom: 10,
  },

  resultDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 22,
  },

  resultGrid: {
    width: "100%",
    gap: 12,
    marginBottom: 22,
  },

  resultItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  resultItemTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 5,
  },

  resultItemText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
  },
});