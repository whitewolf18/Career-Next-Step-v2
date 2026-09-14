import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Results({ user }) {
  const [result, setResult] = useState(null);
  const [profile, setProfile] = useState(null);

  /*
  ==========================================
  ACCOUNT STORAGE
  ==========================================
  */

  const email =
    user?.email?.trim().toLowerCase() ||
    "guest";

  const assessmentKey =
    `careerAI_assessment_${email}`;

  const profileKey =
    `careerAI_profile_${email}`;

  /*
  ==========================================
  LOAD USER RESULTS
  ==========================================
  */

  useEffect(() => {
    loadUserResults();
  }, [email]);

  async function loadUserResults() {
    /*
      Reset when changing accounts.
    */
    setResult(null);
    setProfile(null);

    let assessmentLoaded = false;

    /*
    ========================================
    LOAD USER ASSESSMENT
    ========================================
    */

    try {
      const savedAssessment =
        await AsyncStorage.getItem(
          assessmentKey
        );

      if (savedAssessment) {
        try {
          const assessment =
            JSON.parse(
              savedAssessment
            );

          const assessmentEmail =
            assessment.email
              ?.trim()
              .toLowerCase();

          /*
            Only display this user's
            assessment.
          */
          if (
            !assessmentEmail ||
            assessmentEmail === email
          ) {
            setResult(
              assessment
            );

            assessmentLoaded = true;
          }
        } catch {
          await AsyncStorage.removeItem(
            assessmentKey
          );
        }
      }

      /*
      ======================================
      OLD ASSESSMENT MIGRATION
      ======================================
      */

      if (!assessmentLoaded) {
        const oldAssessment =
          await AsyncStorage.getItem(
            "careerAI_assessment"
          );

        if (oldAssessment) {
          try {
            const assessment =
              JSON.parse(
                oldAssessment
              );

            const oldEmail =
              assessment.email
                ?.trim()
                .toLowerCase();

            /*
              Only migrate if the old
              assessment belongs to this
              account.
            */
            if (
              oldEmail &&
              oldEmail === email
            ) {
              setResult(
                assessment
              );

              await AsyncStorage.setItem(
                assessmentKey,
                JSON.stringify(
                  assessment
                )
              );

              assessmentLoaded = true;
            }
          } catch {
            // Ignore invalid old assessment.
          }
        }
      }

      /*
      ========================================
      LOAD USER PROFILE
      ========================================
      */

      const savedProfile =
        await AsyncStorage.getItem(
          profileKey
        );

      if (savedProfile) {
        try {
          const parsedProfile =
            JSON.parse(
              savedProfile
            );

          const profileEmail =
            parsedProfile.email
              ?.trim()
              .toLowerCase();

          /*
            Only load a profile belonging
            to this account.
          */
          if (
            !profileEmail ||
            profileEmail === email
          ) {
            setProfile(
              parsedProfile
            );
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
              JSON.parse(
                oldProfile
              );

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
    } catch (error) {
      console.log(
        "Error loading results:",
        error
      );
    }
  }

  /*
  ==========================================
  EMPTY STATE
  ==========================================
  */

  if (!result) {
    return (
      <ScrollView
        style={styles.page}
        contentContainerStyle={
          styles.container
        }
      >
        <View
          style={styles.pageHeading}
        >
          <View
            style={styles.badge}
          >
            <Text
              style={styles.badgeText}
            >
              Career Results
            </Text>
          </View>

          <Text
            style={styles.pageTitle}
          >
            Your Results
          </Text>

          <Text
            style={
              styles.pageDescription
            }
          >
            Complete the AI Assessment
            to see your personalised
            career results.
          </Text>
        </View>

        <View
          style={styles.emptyCard}
        >
                                <Text style={styles.emptyIcon}>
              —
            </Text>

          <Text
            style={styles.emptyTitle}
          >
            No assessment results yet
          </Text>

          <Text
            style={
              styles.emptyDescription
            }
          >
            Complete your AI Career
            Assessment and your
            job-readiness score will
            appear here.
          </Text>
        </View>
      </ScrollView>
    );
  }

  /*
  ==========================================
  SCORE
  ==========================================
  */

  const score = Math.min(
    Math.max(
      Number(result.score) || 0,
      0
    ),
    99
  );

  /*
  ==========================================
  CAREER LEVEL
  ==========================================
  */

  let level =
    "Needs Improvement";

  let description =
    "You should focus on developing your technical skills and practical experience.";

  if (score >= 80) {
    level = "Job Ready";

    description =
      "You have a strong foundation and are showing good readiness for your target career.";
  } else if (score >= 60) {
    level = "Developing";

    description =
      "You have a good foundation, but there are some important areas you should strengthen.";
  }

  /*
  ==========================================
  PROFILE SKILLS
  ==========================================
  */

  const skills =
    Array.isArray(
      profile?.skills
    )
      ? profile.skills
      : [];

  /*
  ==========================================
  RECOMMENDATIONS
  ==========================================
  */

  const recommendations = [];

  if (skills.length < 4) {
    recommendations.push(
      "Add more technical and professional skills to your profile."
    );
  }

  if (score < 80) {
    recommendations.push(
      "Build practical projects to strengthen your portfolio."
    );
  }

  recommendations.push(
    "Practise technical interview questions."
  );

  recommendations.push(
    "Improve your CV using Career Next Step recommendations."
  );

  /*
  ==========================================
  PAGE
  ==========================================
  */

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={
        styles.container
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      {/* HEADER */}

      <View
        style={styles.pageHeading}
      >
        <View
          style={styles.badge}
        >
          <Text
            style={styles.badgeText}
          >
            AI Career Results
          </Text>
        </View>

        <Text
          style={styles.pageTitle}
        >
          Your Career Results
        </Text>

        <Text
          style={styles.pageDescription}
        >
          Your Career Next Step assessment
          for{" "}
          <Text
            style={
              styles.descriptionBold
            }
          >
            {result.career ||
              "your target career"}
          </Text>
          .
        </Text>
      </View>

      {/* TOP CARDS */}

      <View
        style={styles.topCard}
      >
        <View
          style={
            styles.scoreSection
          }
        >
          <View
            style={
              styles.scoreCircle
            }
          >
            <Text
              style={
                styles.scoreNumber
              }
            >
              {score}%
            </Text>

            <Text
              style={
                styles.scoreLabel
              }
            >
              Job Readiness
            </Text>
          </View>
        </View>

        <View
          style={
            styles.scoreInformation
          }
        >
          <Text
            style={styles.smallLabel}
          >
            Career Next Step Assessment
          </Text>

          <Text
            style={styles.levelTitle}
          >
            {level}
          </Text>

          <Text
            style={
              styles.levelDescription
            }
          >
            {description}
          </Text>
        </View>
      </View>

      {/* TARGET CAREER */}

      <View
        style={
          styles.careerCard
        }
      >
        <Text
          style={styles.careerLabel}
        >
          Target Career
        </Text>

        <Text
          style={styles.careerTitle}
        >
          {result.career ||
            "Not selected"}
        </Text>

        <View
          style={
            styles.careerScoreRow
          }
        >
          <Text
            style={
              styles.careerScoreLabel
            }
          >
            Assessment Score
          </Text>

          <Text
            style={
              styles.careerScore
            }
          >
            {score}%
          </Text>
        </View>

        <View
          style={
            styles.progressBackground
          }
        >
          <View
            style={[
              styles.progressFill,
              {
                width:
                  `${score}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* RESULT CARDS */}

      <View
        style={styles.resultCard}
      >
        <View
          style={[
            styles.resultIcon,
            styles.successIcon,
          ]}
        >
                                <Text style={styles.resultIconText}>
            ✓
          </Text>
        </View>

        <Text
          style={styles.resultTitle}
        >
          Strengths
        </Text>

        <Text
          style={
            styles.resultDescription
          }
        >
          Career Next Step identified
          areas where you are already
          building a strong foundation.
        </Text>

        <View
          style={styles.listContainer}
        >
          <View
            style={styles.listItem}
          >
            <Text
              style={
                styles.listBullet
              }
            >
              •
            </Text>

            <Text
              style={styles.listText}
            >
              Programming knowledge
            </Text>
          </View>

          <View
            style={styles.listItem}
          >
            <Text
              style={
                styles.listBullet
              }
            >
              •
            </Text>

            <Text
              style={styles.listText}
            >
              Career motivation
            </Text>
          </View>

          <View
            style={styles.listItem}
          >
            <Text
              style={
                styles.listBullet
              }
            >
              •
            </Text>

            <Text
              style={styles.listText}
            >
              Learning potential
            </Text>
          </View>
        </View>
      </View>

      <View
        style={styles.resultCard}
      >
        <View
          style={[
            styles.resultIcon,
            styles.warningIcon,
          ]}
        >
          <Text
            style={
              styles.resultIconText
            }
          >
            !
          </Text>
        </View>

        <Text
          style={styles.resultTitle}
        >
          Skill Gaps
        </Text>

        <Text
          style={
            styles.resultDescription
          }
        >
          These are areas you should
          focus on to improve your
          employability.
        </Text>

        <View
          style={styles.listContainer}
        >
          <View
            style={styles.listItem}
          >
            <Text
              style={
                styles.listBullet
              }
            >
              •
            </Text>

            <Text
              style={styles.listText}
            >
              Practical project experience
            </Text>
          </View>

          <View
            style={styles.listItem}
          >
            <Text
              style={
                styles.listBullet
              }
            >
              •
            </Text>

            <Text
              style={styles.listText}
            >
              Technical interview confidence
            </Text>
          </View>

          <View
            style={styles.listItem}
          >
            <Text
              style={
                styles.listBullet
              }
            >
              •
            </Text>

            <Text
              style={styles.listText}
            >
              Professional experience
            </Text>
          </View>
        </View>
      </View>

      <View
        style={styles.resultCard}
      >
        <View
          style={[
            styles.resultIcon,
            styles.actionIcon,
          ]}
        >
          <Text
            style={
              styles.resultIconText
            }
          >
            →
          </Text>
        </View>

        <Text
          style={styles.resultTitle}
        >
          Recommended Actions
        </Text>

        <Text
          style={
            styles.resultDescription
          }
        >
          Follow these steps to improve
          your job-readiness score.
        </Text>

        <View
          style={styles.listContainer}
        >
          {recommendations.map(
            (recommendation) => (
              <View
                style={
                  styles.listItem
                }
                key={recommendation}
              >
                <Text
                  style={
                    styles.listBullet
                  }
                >
                  •
                </Text>

                <Text
                  style={
                    styles.listText
                  }
                >
                  {recommendation}
                </Text>
              </View>
            )
          )}
        </View>
      </View>

      {/* SKILLS */}

      <View
        style={
          styles.skillsCard
        }
      >
        <View
          style={styles.badge}
        >
          <Text
            style={styles.badgeText}
          >
            Your Profile
          </Text>
        </View>

        <Text
          style={styles.skillsTitle}
        >
          Your Current Skills
        </Text>

        <Text
          style={
            styles.skillsDescription
          }
        >
          These skills are currently
          saved in your Career Next Step
          profile.
        </Text>

        {skills.length > 0 ? (
          <View
            style={
              styles.skillsContainer
            }
          >
            {skills.map(
              (skill, index) => (
                <View
                  style={
                    styles.skillBadge
                  }
                  key={`${skill}-${index}`}
                >
                  <Text
                    style={
                      styles.skillText
                    }
                  >
                    {skill}
                  </Text>
                </View>
              )
            )}
          </View>
        ) : (
          <View
            style={
              styles.noSkillsBox
            }
          >
            <Text
              style={
                styles.noSkillsText
              }
            >
              No skills have been added
              to your profile yet.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
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

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  /*
  ========================================
  HEADER
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
    marginBottom: 10,
  },

  badgeText: {
    color: "#3156a3",
    fontSize: 12,
    fontWeight: "700",
  },

  pageTitle: {
    color: "#172033",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },

  pageDescription: {
    color: "#687386",
    fontSize: 15,
    lineHeight: 22,
  },

  descriptionBold: {
    color: "#172033",
    fontWeight: "800",
  },

  /*
  ========================================
  EMPTY
  ========================================
  */

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e7f0",
    padding: 30,
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 15,
  },

  emptyTitle: {
    color: "#172033",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },

  emptyDescription: {
    color: "#687386",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  /*
  ========================================
  SCORE
  ========================================
  */

  topCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e7f0",
    padding: 20,
    marginBottom: 16,
  },

  scoreSection: {
    alignItems: "center",
    marginBottom: 18,
  },

  scoreCircle: {
    width: 145,
    height: 145,
    borderRadius: 73,
    borderWidth: 10,
    borderColor: "#3156a3",
    backgroundColor: "#f5f8ff",
    alignItems: "center",
    justifyContent: "center",
  },

  scoreNumber: {
    color: "#3156a3",
    fontSize: 32,
    fontWeight: "800",
  },

  scoreLabel: {
    color: "#687386",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },

  scoreInformation: {
    alignItems: "center",
  },

  smallLabel: {
    color: "#3156a3",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },

  levelTitle: {
    color: "#172033",
    fontSize: 23,
    fontWeight: "800",
    marginBottom: 8,
  },

  levelDescription: {
    color: "#687386",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  /*
  ========================================
  CAREER CARD
  ========================================
  */

  careerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e7f0",
    padding: 20,
    marginBottom: 16,
  },

  careerLabel: {
    color: "#687386",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },

  careerTitle: {
    color: "#172033",
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 18,
  },

  careerScoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  careerScoreLabel: {
    color: "#687386",
    fontSize: 13,
  },

  careerScore: {
    color: "#3156a3",
    fontSize: 14,
    fontWeight: "800",
  },

  progressBackground: {
    height: 9,
    backgroundColor: "#e7ebf2",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#3156a3",
    borderRadius: 10,
  },

  /*
  ========================================
  RESULT CARDS
  ========================================
  */

  resultCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e7f0",
    padding: 20,
    marginBottom: 16,
  },

  resultIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  successIcon: {
    backgroundColor: "#e8f7ed",
  },

  warningIcon: {
    backgroundColor: "#fff4df",
  },

  actionIcon: {
    backgroundColor: "#eef3ff",
  },

  resultIconText: {
    color: "#3156a3",
    fontSize: 22,
    fontWeight: "800",
  },

  resultTitle: {
    color: "#172033",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },

  resultDescription: {
    color: "#687386",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },

  listContainer: {
    gap: 10,
  },

  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  listBullet: {
    color: "#3156a3",
    fontSize: 18,
    lineHeight: 20,
    marginRight: 8,
  },

  listText: {
    flex: 1,
    color: "#344054",
    fontSize: 14,
    lineHeight: 20,
  },

  /*
  ========================================
  SKILLS
  ========================================
  */

  skillsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e7f0",
    padding: 20,
  },

  skillsTitle: {
    color: "#172033",
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 7,
  },

  skillsDescription: {
    color: "#687386",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },

  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  skillBadge: {
    backgroundColor: "#eef3ff",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  skillText: {
    color: "#3156a3",
    fontSize: 12,
    fontWeight: "700",
  },

  noSkillsBox: {
    backgroundColor: "#f5f7fb",
    borderRadius: 12,
    padding: 15,
  },

  noSkillsText: {
    color: "#687386",
    fontSize: 13,
    lineHeight: 20,
  },
});