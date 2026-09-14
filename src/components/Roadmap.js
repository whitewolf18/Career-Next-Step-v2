import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Roadmap({ user }) {
  /*
    ============================
    ACCOUNT STORAGE
    ============================
  */

  const email =
    user?.email?.trim().toLowerCase() ||
    "guest";

  const profileKey =
    `careerAI_profile_${email}`;

  const assessmentKey =
    `careerAI_assessment_${email}`;

  const progressKey =
    `careerAI_roadmap_progress_${email}`;

  const [profile, setProfile] = useState({});
  const [assessment, setAssessment] = useState(null);
  const [completed, setCompleted] = useState([]);

  /*
    ============================
    LOAD USER DATA
    ============================
  */

  useEffect(() => {
    loadUserRoadmapData();
  }, [email]);

  async function loadUserRoadmapData() {
    /*
      Reset everything first.
    */

    setProfile({});
    setAssessment(null);
    setCompleted([]);

    /*
      ============================
      LOAD PROFILE
      ============================
    */

    try {
      const savedProfile =
        await AsyncStorage.getItem(profileKey);

      if (savedProfile) {
        try {
          const parsedProfile =
            JSON.parse(savedProfile);

          const profileEmail =
            parsedProfile.email
              ?.trim()
              .toLowerCase();

          /*
            Only use the profile if it
            belongs to the current account.
          */

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
          ============================
          OLD PROFILE MIGRATION
          ============================
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

            /*
              Only migrate a profile that
              belongs to this user.
            */

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
            // Ignore invalid old profile data.
          }
        }
      }
    } catch (error) {
      console.log(
        "Error loading profile:",
        error
      );
    }

    /*
      ============================
      LOAD ASSESSMENT
      ============================
    */

    try {
      const savedAssessment =
        await AsyncStorage.getItem(
          assessmentKey
        );

      if (savedAssessment) {
        try {
          const data =
            JSON.parse(savedAssessment);

          const assessmentEmail =
            data.email
              ?.trim()
              .toLowerCase();

          /*
            Only use the assessment if
            it belongs to this account.
          */

          if (
            !assessmentEmail ||
            assessmentEmail === email
          ) {
            setAssessment(data);
          }
        } catch {
          await AsyncStorage.removeItem(
            assessmentKey
          );
        }
      } else {
        /*
          ============================
          OLD ASSESSMENT MIGRATION
          ============================
        */

        const oldAssessment =
          await AsyncStorage.getItem(
            "careerAI_assessment"
          );

        if (oldAssessment) {
          try {
            const data =
              JSON.parse(oldAssessment);

            const oldEmail =
              data.email
                ?.trim()
                .toLowerCase();

            /*
              Only migrate if this old
              assessment belongs to the user.
            */

            if (
              oldEmail &&
              oldEmail === email
            ) {
              const migratedAssessment = {
                ...data,
                email,
              };

              setAssessment(
                migratedAssessment
              );

              await AsyncStorage.setItem(
                assessmentKey,
                JSON.stringify(
                  migratedAssessment
                )
              );
            }
          } catch {
            // Ignore invalid old assessment data.
          }
        }
      }
    } catch (error) {
      console.log(
        "Error loading assessment:",
        error
      );
    }

    /*
      ============================
      LOAD ROADMAP PROGRESS
      ============================
    */

    try {
      const savedProgress =
        await AsyncStorage.getItem(
          progressKey
        );

      if (savedProgress) {
        try {
          const parsedProgress =
            JSON.parse(savedProgress);

          if (
            Array.isArray(
              parsedProgress
            )
          ) {
            setCompleted(
              parsedProgress
            );
          } else {
            setCompleted([]);
          }
        } catch {
          await AsyncStorage.removeItem(
            progressKey
          );

          setCompleted([]);
        }
      } else {
        /*
          ============================
          OLD ROADMAP MIGRATION
          ============================
        */

        const oldProgress =
          await AsyncStorage.getItem(
            "careerAI_roadmap_progress"
          );

        /*
          Old roadmap progress does not
          contain an email.

          Therefore we do NOT automatically
          give it to another account.
        */

        if (oldProgress) {
          try {
            const parsedProgress =
              JSON.parse(oldProgress);

            /*
              Only migrate empty progress.
            */

            if (
              Array.isArray(
                parsedProgress
              ) &&
              parsedProgress.length === 0
            ) {
              setCompleted([]);

              await AsyncStorage.setItem(
                progressKey,
                JSON.stringify([])
              );
            }
          } catch {
            setCompleted([]);
          }
        }
      }
    } catch (error) {
      console.log(
        "Error loading roadmap progress:",
        error
      );
    }
  }

  /*
    ============================
    TOGGLE TASK
    ============================
  */

  async function toggleTask(id) {
    let updated;

    if (
      completed.includes(id)
    ) {
      updated =
        completed.filter(
          (item) =>
            item !== id
        );
    } else {
      updated = [
        ...completed,
        id,
      ];
    }

    setCompleted(updated);

    /*
      Save ONLY for current user.
    */

    try {
      await AsyncStorage.setItem(
        progressKey,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.log(
        "Error saving roadmap progress:",
        error
      );
    }
  }

  /*
    ============================
    CAREER
    ============================
  */

  const career =
    assessment?.career ||
    profile?.targetCareer ||
    "Junior Software Developer";

  /*
    ============================
    ROADMAP
    ============================
  */

  const roadmap = [
    {
      week: "Week 1",
      title:
        "Strengthen Your Foundations",
      description:
        "Improve the core technical skills required for your target career.",
      tasks: [
        "Review programming fundamentals",
        "Practise HTML and CSS",
        "Practise JavaScript basics",
        "Learn Git and GitHub fundamentals",
      ],
    },
    {
      week: "Week 2",
      title:
        "Build a Real Project",
      description:
        "Create a practical project that demonstrates your skills to employers.",
      tasks: [
        "Choose a project idea",
        "Create the project structure",
        "Build the main features",
        "Upload the project to GitHub",
      ],
    },
    {
      week: "Week 3",
      title:
        "Improve Your CV & Portfolio",
      description:
        "Turn your projects and skills into a stronger professional profile.",
      tasks: [
        "Update your CV",
        "Add your best project",
        "Improve your GitHub profile",
        "Add your technical skills",
      ],
    },
    {
      week: "Week 4",
      title:
        "Prepare for Interviews",
      description:
        "Practise answering common technical and behavioural interview questions.",
      tasks: [
        "Practise technical questions",
        "Practise behavioural questions",
        "Prepare your introduction",
        "Complete a mock interview",
      ],
    },
  ];

  /*
    ============================
    PROGRESS
    ============================
  */

  const totalTasks =
    roadmap.reduce(
      (total, week) =>
        total + week.tasks.length,
      0
    );

  /*
    Only count task IDs that actually
    exist in the current roadmap.
  */

  const validTaskIds =
    new Set(
      roadmap.flatMap(
        (week) =>
          week.tasks.map(
            (_, index) =>
              `${week.week}-${index}`
          )
      )
    );

  const completedTasks =
    completed.filter(
      (taskId) =>
        validTaskIds.has(taskId)
    ).length;

  const progress =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedTasks /
            totalTasks) *
            100
        );

  /*
    ============================
    READINESS SCORE
    ============================
  */

  const readinessScore =
    Math.min(
      Math.max(
        Number(
          assessment?.score
        ) || 0,
        0
      ),
      99
    );

  /*
    ============================
    PAGE
    ============================
  */

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={
        styles.container
      }
      showsVerticalScrollIndicator={false}
    >
      {/* PAGE HEADING */}

      <View style={styles.pageHeading}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            Career Development
          </Text>
        </View>

        <Text style={styles.pageTitle}>
          Career Roadmap
        </Text>

        <Text style={styles.pageDescription}>
          Your personalised plan to become
          more employable as a{" "}
          <Text style={styles.bold}>
            {career}
          </Text>
          .
        </Text>
      </View>

      {/* OVERVIEW */}

      <View style={styles.overview}>
        {/* READINESS */}

        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>
              {readinessScore}%
            </Text>

            <Text style={styles.scoreLabel}>
              Readiness
            </Text>
          </View>

          <View style={styles.scoreInfo}>
            <Text style={styles.targetLabel}>
              Target Career
            </Text>

            <Text style={styles.careerTitle}>
              {career}
            </Text>

            <Text style={styles.scoreDescription}>
              Follow the roadmap step by
              step to improve your
              employability.
            </Text>
          </View>
        </View>

        {/* PROGRESS */}

        <View style={styles.progressCard}>
          <View
            style={
              styles.progressHeading
            }
          >
            <Text
              style={
                styles.progressHeadingText
              }
            >
              Your Progress
            </Text>

            <Text
              style={
                styles.progressPercentage
              }
            >
              {progress}%
            </Text>
          </View>

          <View
            style={styles.progressTrack}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                },
              ]}
            />
          </View>

          <Text
            style={styles.progressText}
          >
            {completedTasks} of{" "}
            {totalTasks} tasks completed
          </Text>
        </View>
      </View>

      {/* ROADMAP WEEKS */}

      <View style={styles.roadmapList}>
        {roadmap.map((week) => (
          <View
            style={styles.weekCard}
            key={week.week}
          >
            {/* WEEK HEADER */}

            <View
              style={styles.weekHeader}
            >
              <View
                style={styles.weekNumber}
              >
                <Text
                  style={
                    styles.weekNumberText
                  }
                >
                  {week.week.replace(
                    "Week ",
                    ""
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.weekHeaderContent
                }
              >
                <Text
                  style={styles.weekLabel}
                >
                  {week.week}
                </Text>

                <Text
                  style={styles.weekTitle}
                >
                  {week.title}
                </Text>

                <Text
                  style={
                    styles.weekDescription
                  }
                >
                  {week.description}
                </Text>
              </View>
            </View>

            {/* TASKS */}

            <View
              style={styles.tasks}
            >
              {week.tasks.map(
                (task, index) => {
                  const taskId =
                    `${week.week}-${index}`;

                  const isComplete =
                    completed.includes(
                      taskId
                    );

                  return (
                    <Pressable
                      key={taskId}
                      style={[
                        styles.task,
                        isComplete &&
                          styles.taskComplete,
                      ]}
                      onPress={() =>
                        toggleTask(
                          taskId
                        )
                      }
                    >
                      <View
                        style={[
                          styles.checkbox,
                          isComplete &&
                            styles.checkboxComplete,
                        ]}
                      >
                        {isComplete && (
                          <Text
                            style={
                              styles.checkmark
                            }
                          >
                                                        
                          </Text>
                        )}
                      </View>

                      <Text
                        style={[
                          styles.taskText,
                          isComplete &&
                            styles.taskTextComplete,
                        ]}
                      >
                        {task}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>
          </View>
        ))}
      </View>

      {/* TIP */}

      <View style={styles.tip}>
        <View style={styles.tipIcon}>
          <Text style={styles.tipEmoji}>
            💡
          </Text>
        </View>

        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>
            Career Next Step Tip
          </Text>

          <Text style={styles.tipText}>
            Employers value practical
            experience. Completing
            projects and being able to
            explain how you built them
            can make a major difference
            in an interview.
          </Text>
        </View>
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

/*
  ============================
  STYLES
  ============================
*/

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f7f9fc",
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  pageHeading: {
    marginBottom: 22,
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#e8f1ff",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 12,
  },

  badgeText: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "700",
  },

  pageTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 8,
  },

  pageDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: "#667085",
  },

  bold: {
    fontWeight: "800",
    color: "#172033",
  },

  /*
    ============================
    OVERVIEW
    ============================
  */

  overview: {
    gap: 14,
    marginBottom: 22,
  },

  scoreCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e6eaf0",
  },

  scoreCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 7,
    borderColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  scoreNumber: {
    fontSize: 21,
    fontWeight: "800",
    color: "#172033",
  },

  scoreLabel: {
    fontSize: 11,
    color: "#667085",
    marginTop: 2,
  },

  scoreInfo: {
    flex: 1,
  },

  targetLabel: {
    fontSize: 12,
    color: "#667085",
    fontWeight: "600",
    marginBottom: 4,
  },

  careerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 6,
  },

  scoreDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
  },

  /*
    ============================
    PROGRESS
    ============================
  */

  progressCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e6eaf0",
  },

  progressHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  progressHeadingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#172033",
  },

  progressPercentage: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2563eb",
  },

  progressTrack: {
    height: 10,
    backgroundColor: "#e8edf4",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#2563eb",
    borderRadius: 10,
  },

  progressText: {
    fontSize: 12,
    color: "#667085",
    marginTop: 9,
  },

  /*
    ============================
    ROADMAP
    ============================
  */

  roadmapList: {
    gap: 16,
  },

  weekCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e6eaf0",
  },

  weekHeader: {
    flexDirection: "row",
    marginBottom: 18,
  },

  weekNumber: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  weekNumberText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },

  weekHeaderContent: {
    flex: 1,
  },

  weekLabel: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 3,
  },

  weekTitle: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 5,
  },

  weekDescription: {
    color: "#667085",
    fontSize: 13,
    lineHeight: 19,
  },

  tasks: {
    gap: 10,
  },

  task: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#edf0f4",
  },

  taskComplete: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  checkboxComplete: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },

  checkmark: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  taskText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#344054",
  },

  taskTextComplete: {
    color: "#166534",
    textDecorationLine: "line-through",
  },

  /*
    ============================
    TIP
    ============================
  */

  tip: {
    marginTop: 18,
    backgroundColor: "#fff7ed",
    borderRadius: 18,
    padding: 17,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },

  tipIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  tipEmoji: {
    fontSize: 20,
  },

  tipContent: {
    flex: 1,
  },

  tipTitle: {
    color: "#9a3412",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 5,
  },

  tipText: {
    color: "#7c2d12",
    fontSize: 13,
    lineHeight: 20,
  },

  bottomSpace: {
    height: 30,
  },
});