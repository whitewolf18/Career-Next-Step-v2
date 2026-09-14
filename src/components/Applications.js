import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Applications({ user }) {
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] =
    useState(null);
  const [loading, setLoading] = useState(true);

  const email =
    user?.email?.trim().toLowerCase() || "guest";

  const applicationKey =
    `careerAI_applications_${email}`;

  /*
   * ============================
   * NORMALIZE APPLICATION
   * ============================
   */

  function normalizeApplication(application) {
    return {
      ...application,

      id:
        application.id ||
        `${application.jobId || "job"}-${application.appliedAt || Date.now()}`,

      jobId: application.jobId || "",

      title:
        application.title ||
        application.jobTitle ||
        "Job Position",

      jobTitle:
        application.jobTitle ||
        application.title ||
        "Job Position",

      company:
        application.company ||
        application.companyName ||
        "Company",

      companyName:
        application.companyName ||
        application.company ||
        "Company",

      location:
        application.location ||
        "Location not specified",

      type:
        application.type ||
        "Full-time",

      salary:
        application.salary ||
        "Salary not specified",

      email:
        application.email ||
        application.seekerEmail ||
        email,

      seekerEmail:
        application.seekerEmail ||
        application.email ||
        email,

      seekerName:
        application.seekerName ||
        user?.name ||
        "Job Seeker",

      status:
        application.status ||
        "Applied",

      matchScore:
        application.matchScore !== undefined &&
        application.matchScore !== null
          ? Number(application.matchScore)
          : null,

      appliedAt:
        application.appliedAt ||
        application.createdAt ||
        null,

      statusUpdatedAt:
        application.statusUpdatedAt ||
        null,

      businessEmail:
        application.businessEmail ||
        "",

      description:
        application.description ||
        "",

      requirements:
        application.requirements ||
        "",

      skills:
        Array.isArray(application.skills)
          ? application.skills
          : typeof application.skills === "string"
          ? application.skills
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean)
          : [],

      seekerSkills:
        Array.isArray(application.seekerSkills)
          ? application.seekerSkills
          : typeof application.seekerSkills === "string"
          ? application.seekerSkills
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean)
          : [],
    };
  }

  /*
   * ============================
   * LOAD APPLICATIONS
   * ============================
   */

  useEffect(() => {
    loadApplications();
  }, [email]);

  async function loadApplications() {
    setLoading(true);

    let personalApplications = [];
    let globalApplications = [];

    /*
     * ============================
     * PERSONAL STORAGE
     * ============================
     */

    try {
      const saved =
        await AsyncStorage.getItem(
          applicationKey
        );

      if (saved) {
        const parsedApplications =
          JSON.parse(saved);

        if (
          Array.isArray(parsedApplications)
        ) {
          personalApplications =
            parsedApplications
              .filter((application) => {
                const applicationEmail = (
                  application.seekerEmail ||
                  application.email ||
                  ""
                )
                  .trim()
                  .toLowerCase();

                return (
                  applicationEmail === email
                );
              })
              .map(normalizeApplication);
        }
      }
    } catch (error) {
      try {
        await AsyncStorage.removeItem(
          applicationKey
        );
      } catch {}
    }

    /*
     * ============================
     * GLOBAL STORAGE
     * ============================
     */

    try {
      const globalSaved =
        await AsyncStorage.getItem(
          "careerAI_applications"
        );

      if (globalSaved) {
        const parsedGlobal =
          JSON.parse(globalSaved);

        if (
          Array.isArray(parsedGlobal)
        ) {
          globalApplications =
            parsedGlobal
              .filter((application) => {
                const applicationEmail = (
                  application.seekerEmail ||
                  application.email ||
                  ""
                )
                  .trim()
                  .toLowerCase();

                return (
                  applicationEmail === email
                );
              })
              .map(normalizeApplication);
        }
      }
    } catch {
      globalApplications = [];
    }

    /*
     * ============================
     * MERGE DATA
     * ============================
     */

    const merged = new Map();

    personalApplications.forEach(
      (application) => {
        merged.set(
          application.id,
          application
        );
      }
    );

    globalApplications.forEach(
      (application) => {
        merged.set(
          application.id,
          {
            ...(merged.get(
              application.id
            ) || {}),
            ...application,
          }
        );
      }
    );

    const finalApplications =
      Array.from(merged.values()).sort(
        (a, b) => {
          const dateA = a.appliedAt
            ? new Date(
                a.appliedAt
              ).getTime()
            : 0;

          const dateB = b.appliedAt
            ? new Date(
                b.appliedAt
              ).getTime()
            : 0;

          return dateB - dateA;
        }
      );

    /*
     * ============================
     * SYNC PERSONAL STORAGE
     * ============================
     */

    if (finalApplications.length > 0) {
      try {
        await AsyncStorage.setItem(
          applicationKey,
          JSON.stringify(
            finalApplications
          )
        );
      } catch {}
    }

    setApplications(
      finalApplications
    );

    setLoading(false);
  }

  /*
   * ============================
   * WITHDRAW APPLICATION
   * ============================
   */

  function withdrawApplication(
    application
  ) {
    if (!application) {
      return;
    }

    if (
      application.status ===
        "Interview" ||
      application.status ===
        "Interview Scheduled" ||
      application.status === "Hired"
    ) {
      Alert.alert(
        "Cannot Withdraw",
        `This application can no longer be withdrawn because it has progressed to ${application.status}.`
      );

      return;
    }

    const jobTitle =
      application.title ||
      application.jobTitle ||
      "this position";

    Alert.alert(
      "Withdraw Application",
      `Are you sure you want to withdraw your application for ${jobTitle}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            try {
              const applicationId =
                application.id;

              /*
               * Update personal applications
               */

              const updatedApplications =
                applications.filter(
                  (item) =>
                    item.id !==
                    applicationId
                );

              await AsyncStorage.setItem(
                applicationKey,
                JSON.stringify(
                  updatedApplications
                )
              );

              setApplications(
                updatedApplications
              );

              /*
               * Close modal
               */

              if (
                selectedApplication?.id ===
                applicationId
              ) {
                setSelectedApplication(
                  null
                );
              }

              /*
               * Update global applications
               */

              try {
                const globalSaved =
                  await AsyncStorage.getItem(
                    "careerAI_applications"
                  );

                if (globalSaved) {
                  const allApplications =
                    JSON.parse(
                      globalSaved
                    );

                  if (
                    Array.isArray(
                      allApplications
                    )
                  ) {
                    const updatedGlobal =
                      allApplications.filter(
                        (item) =>
                          item.id !==
                          applicationId
                      );

                    await AsyncStorage.setItem(
                      "careerAI_applications",
                      JSON.stringify(
                        updatedGlobal
                      )
                    );
                  }
                }
              } catch {}

              Alert.alert(
                "Application Withdrawn",
                "Your application has been withdrawn successfully."
              );
            } catch {
              Alert.alert(
                "Error",
                "Unable to withdraw application."
              );
            }
          },
        },
      ]
    );
  }

  /*
   * ============================
   * DATE FORMATTER
   * ============================
   */

  function formatDate(date) {
    if (!date) {
      return "Unknown";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "Unknown";
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

  /*
   * ============================
   * DATE + TIME
   * ============================
   */

  function formatDateTime(date) {
    if (!date) {
      return "Unknown";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "Unknown";
    }

    return parsedDate.toLocaleString(
      "en-ZA",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  /*
   * ============================
   * STATUS
   * ============================
   */

  function getStatusClass(status) {
    switch (status) {
      case "Shortlisted":
        return "shortlisted";

      case "Interview":
      case "Interview Scheduled":
        return "interview";

      case "Hired":
        return "hired";

      case "Rejected":
        return "rejected";

      case "Applied":
      default:
        return "applied";
    }
  }

  function getStatusIcon(status) {
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

      case "Applied":
      default:
        return "✓";
    }
  }

  /*
   * ============================
   * COUNTS
   * ============================
   */

  const submittedCount =
    useMemo(() => {
      return applications.filter(
        (application) =>
          application.status ===
          "Applied"
      ).length;
    }, [applications]);

  const shortlistedCount =
    useMemo(() => {
      return applications.filter(
        (application) =>
          application.status ===
          "Shortlisted"
      ).length;
    }, [applications]);

  const interviewCount =
    useMemo(() => {
      return applications.filter(
        (application) =>
          application.status ===
            "Interview" ||
          application.status ===
            "Interview Scheduled"
      ).length;
    }, [applications]);

  const hiredCount =
    useMemo(() => {
      return applications.filter(
        (application) =>
          application.status ===
          "Hired"
      ).length;
    }, [applications]);

  /*
   * ============================
   * MATCH SCORE
   * ============================
   */

  function getMatchLabel(score) {
    if (
      score === null ||
      Number.isNaN(score)
    ) {
      return {
        text: "Not available",
        style: styles.matchUnknown,
      };
    }

    if (score < 60) {
      return {
        text: `${score}%`,
        style: styles.matchLow,
      };
    }

    if (score < 80) {
      return {
        text: `${score}%`,
        style: styles.matchMedium,
      };
    }

    return {
      text: `${score}%`,
      style: styles.matchGood,
    };
  }

  /*
   * ============================
   * LOADING
   * ============================
   */

  if (loading) {
    return (
      <View style={styles.page}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
          />

          <Text style={styles.loadingText}>
            Loading your applications...
          </Text>
        </View>
      </View>
    );
  }

  /*
   * ============================
   * PAGE
   * ============================
   */

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* PAGE HEADER */}

        <View style={styles.pageHeading}>
          <Text style={styles.badge}>
            Job Applications
          </Text>

          <Text style={styles.pageTitle}>
            My Applications
          </Text>

          <Text
            style={
              styles.pageDescription
            }
          >
            Track the jobs you have applied
            for and monitor your application
            progress.
          </Text>
        </View>

        {/* SUMMARY */}

        <View style={styles.summaryGrid}>
          <SummaryCard
            number={
              applications.length
            }
            label="Total Applications"
          />

          <SummaryCard
            number={submittedCount}
            label="Applications Submitted"
          />

          <SummaryCard
            number={shortlistedCount}
            label="Shortlisted"
          />

          <SummaryCard
            number={interviewCount}
            label="Interviews"
          />

          <SummaryCard
            number={hiredCount}
            label="Hired"
          />
        </View>

        {/* EMPTY STATE */}

        {applications.length === 0 ? (
          <View
            style={
              styles.emptyContainer
            }
          >
            <Text
              style={
                styles.emptyIcon
              }
            >
              📋
            </Text>

            <Text style={styles.emptyTitle}>
              No applications yet
            </Text>

            <Text
              style={
                styles.emptyDescription
              }
            >
              When you apply for jobs, they
              will appear here so you can
              track your progress.
            </Text>
          </View>
        ) : (
          /* APPLICATION LIST */

          <View style={styles.list}>
            {applications.map(
              (
                application,
                index
              ) => {
                const title =
                  application.title ||
                  application.jobTitle ||
                  "Job Position";

                const company =
                  application.company ||
                  application.companyName ||
                  "Company";

                const location =
                  application.location ||
                  "Location not specified";

                const status =
                  application.status ||
                  "Applied";

                const statusClass =
                  getStatusClass(
                    status
                  );

                const canWithdraw =
                  status !==
                    "Interview" &&
                  status !==
                    "Interview Scheduled" &&
                  status !== "Hired";

                const match =
                  getMatchLabel(
                    application.matchScore
                  );

                return (
                  <View
                    style={[
                      styles.applicationCard,
                      statusStyles[
                        statusClass
                      ],
                    ]}
                    key={
                      application.id ||
                      `${application.jobId}-${application.appliedAt}-${index}`
                    }
                  >
                    {/* COMPANY ICON */}

                    <View
                      style={
                        styles.companyIcon
                      }
                    >
                      <Text
                        style={
                          styles.companyIconText
                        }
                      >
                        {company
                          ?.charAt(0)
                          ?.toUpperCase() ||
                          "C"}
                      </Text>
                    </View>

                    {/* INFO */}

                    <View
                      style={
                        styles.applicationInfo
                      }
                    >
                      <Text
                        style={
                          styles.applicationTitle
                        }
                      >
                        {title}
                      </Text>

                      <Text
                        style={
                          styles.applicationCompany
                        }
                      >
                        {company} •{" "}
                        {location}
                      </Text>

                      <Text
                        style={
                          styles.applicationDate
                        }
                      >
                        Applied on{" "}
                        {formatDate(
                          application.appliedAt
                        )}
                      </Text>

                      <View
                        style={
                          styles.metaRow
                        }
                      >
                        {application.type && (
                          <View
                            style={
                              styles.metaTag
                            }
                          >
                            <Text
                              style={
                                styles.metaText
                              }
                            >
                              💼{" "}
                              {
                                application.type
                              }
                            </Text>
                          </View>
                        )}

                        {application.salary &&
                          application.salary !==
                            "Salary not specified" && (
                            <View
                              style={
                                styles.metaTag
                              }
                            >
                              <Text
                                style={
                                  styles.metaText
                                }
                              >
                                💰{" "}
                                {
                                  application.salary
                                }
                              </Text>
                            </View>
                          )}

                        {application.matchScore !==
                          null && (
                          <View
                            style={
                              styles.metaTag
                            }
                          >
                            <Text
                              style={
                                styles.metaText
                              }
                            >
                              🤖 AI Match{" "}
                            </Text>

                            <Text
                              style={[
                                styles.matchText,
                                match.style,
                              ]}
                            >
                              {
                                match.text
                              }
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* STATUS */}

                    <View
                      style={
                        styles.statusContainer
                      }
                    >
                      <View
                        style={[
                          styles.statusBadge,
                          statusBadgeStyles[
                            statusClass
                          ],
                        ]}
                      >
                        <Text
                          style={
                            styles.statusBadgeText
                          }
                        >
                          {getStatusIcon(
                            status
                          )}{" "}
                          {status}
                        </Text>
                      </View>

                      {application.statusUpdatedAt && (
                        <Text
                          style={
                            styles.updatedText
                          }
                        >
                          Updated{" "}
                          {formatDate(
                            application.statusUpdatedAt
                          )}
                        </Text>
                      )}
                    </View>

                    {/* ACTIONS */}

                    <View
                      style={
                        styles.actions
                      }
                    >
                      <Pressable
                        style={
                          styles.viewButton
                        }
                        onPress={() =>
                          setSelectedApplication(
                            application
                          )
                        }
                      >
                        <Text
                          style={
                            styles.viewButtonText
                          }
                        >
                          View
                        </Text>
                      </Pressable>

                      {canWithdraw && (
                        <Pressable
                          style={
                            styles.withdrawButton
                          }
                          onPress={() =>
                            withdrawApplication(
                              application
                            )
                          }
                        >
                          <Text
                            style={
                              styles.withdrawButtonText
                            }
                          >
                            Withdraw
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              }
            )}
          </View>
        )}
      </ScrollView>

      {/* ============================
          APPLICATION DETAILS MODAL
          ============================ */}

      <Modal
        visible={
          selectedApplication !== null
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSelectedApplication(
            null
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={styles.modalContainer}
          >
            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.modalContent
              }
            >
              {/* HEADER */}

              <View
                style={
                  styles.modalHeader
                }
              >
                <View
                  style={
                    styles.modalHeaderText
                  }
                >
                  <Text
                    style={styles.badge}
                  >
                    Application Details
                  </Text>

                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    {
                      selectedApplication?.title
                    }
                  </Text>

                  <Text
                    style={
                      styles.modalCompany
                    }
                  >
                    {
                      selectedApplication?.company
                    }{" "}
                    •{" "}
                    {
                      selectedApplication?.location
                    }
                  </Text>
                </View>

                <Pressable
                  style={
                    styles.closeButton
                  }
                  onPress={() =>
                    setSelectedApplication(
                      null
                    )
                  }
                >
                  <Text
                    style={
                      styles.closeButtonText
                    }
                  >
                    ×
                  </Text>
                </Pressable>
              </View>

              {/* STATUS */}

              {selectedApplication && (
                <View
                  style={
                    styles.detailStatus
                  }
                >
                  <View
                    style={[
                      styles.statusBadge,
                      statusBadgeStyles[
                        getStatusClass(
                          selectedApplication.status
                        )
                      ],
                    ]}
                  >
                    <Text
                      style={
                        styles.statusBadgeText
                      }
                    >
                      {getStatusIcon(
                        selectedApplication.status
                      )}{" "}
                      {
                        selectedApplication.status
                      }
                    </Text>
                  </View>

                  {selectedApplication.statusUpdatedAt && (
                    <Text
                      style={
                        styles.detailStatusText
                      }
                    >
                      Status updated on{" "}
                      {formatDateTime(
                        selectedApplication.statusUpdatedAt
                      )}
                    </Text>
                  )}
                </View>
              )}

              {/* DETAILS */}

              <View
                style={
                  styles.detailsGrid
                }
              >
                <DetailItem
                  label="Company"
                  value={
                    selectedApplication?.company
                  }
                />

                <DetailItem
                  label="Location"
                  value={
                    selectedApplication?.location
                  }
                />

                <DetailItem
                  label="Employment Type"
                  value={
                    selectedApplication?.type ||
                    "Not specified"
                  }
                />

                <DetailItem
                  label="Salary"
                  value={
                    selectedApplication?.salary ||
                    "Not specified"
                  }
                />

                <DetailItem
                  label="Applied"
                  value={formatDateTime(
                    selectedApplication?.appliedAt
                  )}
                />

                <DetailItem
                  label="AI Match"
                  value={
                    selectedApplication
                      ? getMatchLabel(
                          selectedApplication.matchScore
                        ).text
                      : "Not available"
                  }
                />
              </View>

              {/* DESCRIPTION */}

              {selectedApplication
                ?.description && (
                <DetailSection
                  title="Job Description"
                  text={
                    selectedApplication.description
                  }
                />
              )}

              {/* REQUIREMENTS */}

              {selectedApplication
                ?.requirements && (
                <DetailSection
                  title="Requirements"
                  text={
                    selectedApplication.requirements
                  }
                />
              )}

              {/* SKILLS */}

              {selectedApplication
                ?.seekerSkills
                ?.length > 0 && (
                <View
                  style={
                    styles.detailSection
                  }
                >
                  <Text
                    style={
                      styles.detailSectionTitle
                    }
                  >
                    Your Skills
                  </Text>

                  <View
                    style={
                      styles.skillsContainer
                    }
                  >
                    {selectedApplication.seekerSkills.map(
                      (
                        skill,
                        index
                      ) => (
                        <View
                          style={
                            styles.skillTag
                          }
                          key={`${skill}-${index}`}
                        >
                          <Text
                            style={
                              styles.skillTagText
                            }
                          >
                            {skill}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                </View>
              )}

              {/* ACTIONS */}

              <View
                style={
                  styles.modalActions
                }
              >
                <Pressable
                  style={
                    styles.secondaryButton
                  }
                  onPress={() =>
                    setSelectedApplication(
                      null
                    )
                  }
                >
                  <Text
                    style={
                      styles.secondaryButtonText
                    }
                  >
                    Close
                  </Text>
                </Pressable>

                {selectedApplication &&
                  selectedApplication.status !==
                    "Interview" &&
                  selectedApplication.status !==
                    "Interview Scheduled" &&
                  selectedApplication.status !==
                    "Hired" && (
                    <Pressable
                      style={
                        styles.withdrawButtonLarge
                      }
                      onPress={() =>
                        withdrawApplication(
                          selectedApplication
                        )
                      }
                    >
                      <Text
                        style={
                          styles.withdrawButtonText
                        }
                      >
                        Withdraw Application
                      </Text>
                    </Pressable>
                  )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/*
 * ============================
 * SUMMARY CARD
 * ============================
 */

function SummaryCard({
  number,
  label,
}) {
  return (
    <View
      style={
        styles.summaryCard
      }
    >
      <Text
        style={
          styles.summaryNumber
        }
      >
        {number}
      </Text>

      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

/*
 * ============================
 * DETAIL ITEM
 * ============================
 */

function DetailItem({
  label,
  value,
}) {
  return (
    <View
      style={
        styles.detailItem
      }
    >
      <Text
        style={
          styles.detailItemLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.detailItemValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

/*
 * ============================
 * DETAIL SECTION
 * ============================
 */

function DetailSection({
  title,
  text,
}) {
  return (
    <View
      style={
        styles.detailSection
      }
    >
      <Text
        style={
          styles.detailSectionTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.detailSectionText
        }
      >
        {text}
      </Text>
    </View>
  );
}

/*
 * ============================
 * STYLES
 * ============================
 */

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f7f9fc",
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  pageHeading: {
    marginBottom: 22,
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#e9f1ff",
    color: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
    marginBottom: 10,
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
    color: "#64748b",
  },

  /*
   * SUMMARY
   */

  summaryGrid: {
    gap: 12,
    marginBottom: 22,
  },

  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },

  summaryNumber: {
    fontSize: 27,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 5,
  },

  summaryLabel: {
    fontSize: 13,
    color: "#64748b",
  },

  /*
   * EMPTY
   */

  emptyContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },

  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 8,
  },

  emptyDescription: {
    textAlign: "center",
    color: "#64748b",
    lineHeight: 21,
    fontSize: 14,
  },

  /*
   * LIST
   */

  list: {
    gap: 14,
  },

  applicationCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },

  applied: {
    borderLeftWidth: 4,
    borderLeftColor: "#2563eb",
  },

  shortlisted: {
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },

  interview: {
    borderLeftWidth: 4,
    borderLeftColor: "#7c3aed",
  },

  hired: {
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
  },

  rejected: {
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
  },

  companyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  companyIconText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2563eb",
  },

  applicationInfo: {
    marginBottom: 14,
  },

  applicationTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 5,
  },

  applicationCompany: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 7,
  },

  applicationDate: {
    fontSize: 12,
    color: "#94a3b8",
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 11,
  },

  metaTag: {
    backgroundColor: "#f3f5f8",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  metaText: {
    fontSize: 11,
    color: "#475569",
  },

  matchText: {
    fontSize: 11,
    fontWeight: "800",
  },

  matchGood: {
    color: "#16a34a",
  },

  matchMedium: {
    color: "#d97706",
  },

  matchLow: {
    color: "#dc2626",
  },

  matchUnknown: {
    color: "#64748b",
  },

  /*
   * STATUS
   */

  statusContainer: {
    alignItems: "flex-start",
    marginBottom: 14,
  },

  statusBadge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },

  statusBadgeApplied: {
    backgroundColor: "#e9f1ff",
  },

  statusBadgeShortlisted: {
    backgroundColor: "#fff5d9",
  },

  statusBadgeInterview: {
    backgroundColor: "#f0e9ff",
  },

  statusBadgeHired: {
    backgroundColor: "#e7f8ed",
  },

  statusBadgeRejected: {
    backgroundColor: "#feecec",
  },

  updatedText: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 5,
  },

  /*
   * ACTIONS
   */

  actions: {
    flexDirection: "row",
    gap: 10,
  },

  viewButton: {
    flex: 1,
    backgroundColor: "#172033",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },

  viewButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },

  withdrawButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#dc2626",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },

  withdrawButtonText: {
    color: "#dc2626",
    fontWeight: "700",
    fontSize: 13,
  },

  /*
   * LOADING
   */

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  loadingText: {
    marginTop: 14,
    color: "#64748b",
    fontSize: 15,
  },

  /*
   * MODAL
   */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
  },

  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  modalHeaderText: {
    flex: 1,
    paddingRight: 10,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 5,
  },

  modalCompany: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f3f6",
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    fontSize: 27,
    color: "#475569",
    lineHeight: 30,
  },

  /*
   * DETAIL STATUS
   */

  detailStatus: {
    marginBottom: 20,
  },

  detailStatusText: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 7,
  },

  /*
   * DETAILS GRID
   */

  detailsGrid: {
    gap: 10,
    marginBottom: 20,
  },

  detailItem: {
    backgroundColor: "#f7f9fc",
    borderRadius: 12,
    padding: 14,
  },

  detailItemLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 5,
  },

  detailItemValue: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "700",
  },

  /*
   * DETAIL SECTIONS
   */

  detailSection: {
    marginBottom: 20,
  },

  detailSectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 8,
  },

  detailSectionText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 22,
  },

  /*
   * SKILLS
   */

  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  skillTag: {
    backgroundColor: "#e9f1ff",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  skillTagText: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "700",
  },

  /*
   * MODAL ACTIONS
   */

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 5,
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: "#eef1f5",
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#172033",
    fontWeight: "700",
  },

  withdrawButtonLarge: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#dc2626",
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
  },
});

/*
 * STATUS BORDER STYLES
 */

const statusStyles = {
  applied: styles.applied,
  shortlisted: styles.shortlisted,
  interview: styles.interview,
  hired: styles.hired,
  rejected: styles.rejected,
};

/*
 * STATUS BADGE STYLES
 */

const statusBadgeStyles = {
  applied: styles.statusBadgeApplied,
  shortlisted:
    styles.statusBadgeShortlisted,
  interview:
    styles.statusBadgeInterview,
  hired: styles.statusBadgeHired,
  rejected:
    styles.statusBadgeRejected,
};