import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

function Candidates({ user, onViewCandidate }) {
  const email =
    user?.email?.trim().toLowerCase() || "";

  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobFilter, setJobFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const STATUS_OPTIONS = [
    "All",
    "Applied",
    "Shortlisted",
    "Interview",
    "Interview Scheduled",
    "Rejected",
    "Hired",
  ];

  useEffect(() => {
    loadApplications();
  }, [email]);

  async function loadApplications() {
    setLoading(true);

    try {
      const saved = await AsyncStorage.getItem(
        "careerAI_applications"
      );

      if (!saved) {
        setApplications([]);
        setLoading(false);
        return;
      }

      const allApplications = JSON.parse(saved);

      if (!Array.isArray(allApplications)) {
        setApplications([]);
        setLoading(false);
        return;
      }

      const businessApplications = allApplications
        .filter((application) => {
          const businessEmail = (
            application.businessEmail || ""
          )
            .trim()
            .toLowerCase();

          return businessEmail === email;
        })
        .map(normalizeApplication);

      businessApplications.sort((a, b) => {
        const dateA = a.appliedAt
          ? new Date(a.appliedAt).getTime()
          : 0;

        const dateB = b.appliedAt
          ? new Date(b.appliedAt).getTime()
          : 0;

        return dateB - dateA;
      });

      setApplications(businessApplications);
    } catch (error) {
      console.error(
        "Could not load candidates:",
        error
      );

      setApplications([]);
    }

    setLoading(false);
  }

  function normalizeApplication(application) {
    return {
      ...application,

      id:
        application.id ||
        `${application.jobId || "job"}-${
          application.seekerEmail || "candidate"
        }`,

      jobId: application.jobId || "",

      jobTitle:
        application.jobTitle ||
        application.title ||
        "Position",

      title:
        application.title ||
        application.jobTitle ||
        "Position",

      company:
        application.company ||
        application.companyName ||
        "Company",

      companyName:
        application.companyName ||
        application.company ||
        "Company",

      businessEmail:
        application.businessEmail || "",

      seekerName:
        application.seekerName ||
        "Job Seeker",

      seekerEmail:
        application.seekerEmail ||
        application.email ||
        "",

      seekerSkills: Array.isArray(
        application.seekerSkills
      )
        ? application.seekerSkills
        : typeof application.seekerSkills ===
          "string"
        ? application.seekerSkills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)
        : [],

      location:
        application.location ||
        "Not provided",

      type:
        application.type ||
        "Not specified",

      salary:
        application.salary ||
        "Not specified",

      matchScore:
        application.matchScore !== undefined &&
        application.matchScore !== null
          ? Number(application.matchScore)
          : null,

      status:
        application.status ||
        "Applied",

      appliedAt:
        application.appliedAt ||
        application.createdAt ||
        null,

      statusUpdatedAt:
        application.statusUpdatedAt ||
        null,
    };
  }

  const jobs = useMemo(() => {
    const uniqueJobs = [];

    applications.forEach((application) => {
      const jobTitle =
        application.jobTitle ||
        application.title;

      if (
        jobTitle &&
        !uniqueJobs.includes(jobTitle)
      ) {
        uniqueJobs.push(jobTitle);
      }
    });

    return uniqueJobs.sort();
  }, [applications]);

  const filteredCandidates = useMemo(() => {
    const searchText =
      search.toLowerCase().trim();

    return applications.filter(
      (application) => {
        const candidateName = (
          application.seekerName || ""
        ).toLowerCase();

        const candidateEmail = (
          application.seekerEmail || ""
        ).toLowerCase();

        const jobTitle = (
          application.jobTitle ||
          application.title ||
          ""
        ).toLowerCase();

        const matchesSearch =
          !searchText ||
          candidateName.includes(searchText) ||
          candidateEmail.includes(searchText) ||
          jobTitle.includes(searchText);

        const status =
          application.status || "Applied";

        const matchesStatus =
          statusFilter === "All" ||
          status === statusFilter;

        const matchesJob =
          jobFilter === "All" ||
          (application.jobTitle ||
            application.title) ===
            jobFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesJob
        );
      }
    );
  }, [
    applications,
    search,
    statusFilter,
    jobFilter,
  ]);

  async function updateApplicationStatus(
    applicationId,
    newStatus
  ) {
    try {
      const saved =
        await AsyncStorage.getItem(
          "careerAI_applications"
        );

      const allApplications = saved
        ? JSON.parse(saved)
        : [];

      if (!Array.isArray(allApplications)) {
        return;
      }

      const now =
        new Date().toISOString();

      const updatedApplications =
        allApplications.map(
          (application) => {
            if (
              application.id !==
              applicationId
            ) {
              return application;
            }

            return {
              ...application,
              status: newStatus,
              statusUpdatedAt: now,
            };
          }
        );

      await AsyncStorage.setItem(
        "careerAI_applications",
        JSON.stringify(
          updatedApplications
        )
      );

      const updatedApplication =
        updatedApplications.find(
          (application) =>
            application.id ===
            applicationId
        );

      if (
        updatedApplication?.seekerEmail
      ) {
        const seekerEmail =
          updatedApplication.seekerEmail
            .trim()
            .toLowerCase();

        const seekerKey =
          `careerAI_applications_${seekerEmail}`;

        const seekerSaved =
          await AsyncStorage.getItem(
            seekerKey
          );

        if (seekerSaved) {
          try {
            const seekerApplications =
              JSON.parse(seekerSaved);

            if (
              Array.isArray(
                seekerApplications
              )
            ) {
              const updatedSeekerApplications =
                seekerApplications.map(
                  (application) => {
                    if (
                      application.id !==
                      applicationId
                    ) {
                      return application;
                    }

                    return {
                      ...application,
                      status: newStatus,
                      statusUpdatedAt: now,
                    };
                  }
                );

              await AsyncStorage.setItem(
                seekerKey,
                JSON.stringify(
                  updatedSeekerApplications
                )
              );
            }
          } catch {
            // Ignore personal storage errors.
          }
        }
      }

      await loadApplications();
    } catch (error) {
      console.error(
        "Could not update candidate status:",
        error
      );

      Alert.alert(
        "Error",
        "Could not update the candidate status."
      );
    }
  }

  function chooseStatus(currentStatus) {
    Alert.alert(
      "Candidate Status",
      "Choose a new status",
      STATUS_OPTIONS
        .filter((status) => status !== "All")
        .map((status) => ({
          text: status,
          onPress: () =>
            updateApplicationStatus(
              currentStatus.id,
              status
            ),
        }))
    );
  }

  function chooseJob() {
    const options = [
      {
        text: "All Jobs",
        onPress: () => setJobFilter("All"),
      },
      ...jobs.map((job) => ({
        text: job,
        onPress: () => setJobFilter(job),
      })),
      {
        text: "Cancel",
        style: "cancel",
      },
    ];

    Alert.alert(
      "Filter by Job",
      "Choose a job",
      options
    );
  }

  function chooseStatusFilter() {
    const options = STATUS_OPTIONS.map(
      (status) => ({
        text:
          status === "All"
            ? "All Statuses"
            : status,
        onPress: () =>
          setStatusFilter(status),
      })
    );

    Alert.alert(
      "Filter by Status",
      "Choose a status",
      [
        ...options,
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  }

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

  function getStatusStyle(status) {
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

  function getMatchStyle(score) {
    if (score !== null && score >= 85) {
      return styles.matchHigh;
    }

    if (score !== null && score >= 70) {
      return styles.matchMedium;
    }

    return styles.matchLow;
  }

  function formatDate(date) {
    if (!date) {
      return "Recently";
    }

    const parsedDate = new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "Recently";
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

  const newApplications =
    applications.filter(
      (application) =>
        !application.status ||
        application.status === "Applied"
    ).length;

  const shortlisted =
    applications.filter(
      (application) =>
        application.status ===
        "Shortlisted"
    ).length;

  const interviews =
    applications.filter(
      (application) =>
        application.status ===
          "Interview" ||
        application.status ===
          "Interview Scheduled"
    ).length;

  const hired =
    applications.filter(
      (application) =>
        application.status === "Hired"
    ).length;

  if (loading) {
    return (
      <View style={styles.page}>
        <ActivityIndicator
          size="large"
          style={styles.loading}
        />

        <Text style={styles.loadingTitle}>
          Candidates
        </Text>

        <Text style={styles.loadingText}>
          Loading candidates...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={
        styles.pageContent
      }
      keyboardShouldPersistTaps="handled"
    >
      {/* HEADER */}

      <View style={styles.heading}>
        <View style={styles.headingText}>
          <Text style={styles.title}>
            Candidates
          </Text>

          <Text style={styles.subtitle}>
            Review graduates who have applied
            for your company's jobs.
          </Text>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalNumber}>
            {applications.length}
          </Text>

          <Text style={styles.totalLabel}>
            Total Candidates
          </Text>
        </View>
      </View>

      {/* STATISTICS */}

      <View style={styles.statGrid}>
        <StatCard
          label="Total Candidates"
          value={applications.length}
        />

        <StatCard
          label="New Applications"
          value={newApplications}
        />

        <StatCard
          label="Shortlisted"
          value={shortlisted}
        />

        <StatCard
          label="Interviews"
          value={interviews}
        />

        <StatCard
          label="Hired"
          value={hired}
        />
      </View>

      {/* FILTERS */}

      <View style={styles.card}>
        <Text style={styles.filterTitle}>
          Search & Filter Candidates
        </Text>

        <Text style={styles.label}>
          Search Candidates
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Search by name, email or job..."
          placeholderTextColor="#8b95a7"
          value={search}
          onChangeText={setSearch}
        />

        <Text style={styles.label}>
          Status
        </Text>

        <Pressable
          style={styles.selectButton}
          onPress={chooseStatusFilter}
        >
          <Text style={styles.selectText}>
            {statusFilter === "All"
              ? "All Statuses"
              : statusFilter}
          </Text>

          <Text style={styles.arrow}>
            ▼
          </Text>
        </Pressable>

        <Text style={styles.label}>
          Job
        </Text>

        <Pressable
          style={styles.selectButton}
          onPress={chooseJob}
        >
          <Text style={styles.selectText}>
            {jobFilter === "All"
              ? "All Jobs"
              : jobFilter}
          </Text>

          <Text style={styles.arrow}>
            ▼
          </Text>
        </Pressable>
      </View>

      {/* RESULTS COUNT */}

      {applications.length > 0 && (
        <Text style={styles.resultsText}>
          Showing{" "}
          <Text style={styles.bold}>
            {filteredCandidates.length}
          </Text>{" "}
          of{" "}
          <Text style={styles.bold}>
            {applications.length}
          </Text>{" "}
          candidates
        </Text>
      )}

      {/* EMPTY STATE */}

      {filteredCandidates.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>
            ♙
          </Text>

          <Text style={styles.emptyTitle}>
            No candidates found
          </Text>

          <Text style={styles.emptyText}>
            {applications.length === 0
              ? "Candidates will appear here when graduates apply for your jobs."
              : "Try changing your search or filters."}
          </Text>
        </View>
      ) : (
        <View style={styles.candidatesList}>
          {filteredCandidates.map(
            (candidate) => {
              const score =
                candidate.matchScore !==
                  null &&
                !Number.isNaN(
                  candidate.matchScore
                )
                  ? candidate.matchScore
                  : null;

              const status =
                candidate.status ||
                "Applied";

              return (
                <View
                  style={styles.candidateCard}
                  key={candidate.id}
                >
                  {/* CANDIDATE HEADER */}

                  <View style={styles.candidateMain}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getInitials(
                          candidate.seekerName
                        )}
                      </Text>
                    </View>

                    <View style={styles.candidateInformation}>
                      <View style={styles.nameRow}>
                        <Text style={styles.candidateName}>
                          {candidate.seekerName ||
                            "Job Seeker"}
                        </Text>

                        <View
                          style={[
                            styles.statusBadge,
                            getStatusStyle(status),
                          ]}
                        >
                          <Text
                            style={
                              styles.statusText
                            }
                          >
                            {status}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.email}>
                        {candidate.seekerEmail ||
                          "Email not available"}
                      </Text>

                      <Text style={styles.job}>
                        Applied for:{" "}
                        <Text style={styles.bold}>
                          {candidate.jobTitle ||
                            candidate.title ||
                            "Position"}
                        </Text>
                      </Text>
                    </View>

                    {/* AI MATCH */}

                    <View
                      style={[
                        styles.matchBox,
                        getMatchStyle(score),
                      ]}
                    >
                      <Text style={styles.matchNumber}>
                        {score !== null
                          ? `${score}%`
                          : "N/A"}
                      </Text>

                      <Text style={styles.matchLabel}>
                        AI Match
                      </Text>
                    </View>
                  </View>

                  {/* DETAILS */}

                  <View style={styles.details}>
                    <Detail
                      label="Location"
                      value={
                        candidate.location ||
                        "Not provided"
                      }
                    />

                    <Detail
                      label="Applied"
                      value={formatDate(
                        candidate.appliedAt
                      )}
                    />

                    <Detail
                      label="Employment Type"
                      value={
                        candidate.type ||
                        "Not specified"
                      }
                    />

                    <Detail
                      label="Salary"
                      value={
                        candidate.salary ||
                        "Not specified"
                      }
                    />
                  </View>

                  {/* SKILLS */}

                  <View style={styles.skillsSection}>
                    <Text style={styles.sectionLabel}>
                      Candidate Skills
                    </Text>

                    <View style={styles.skills}>
                      {candidate.seekerSkills?.length >
                      0 ? (
                        candidate.seekerSkills.map(
                          (skill, index) => (
                            <View
                              style={styles.skillTag}
                              key={`${candidate.id}-skill-${index}`}
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
                        )
                      ) : (
                        <Text style={styles.noSkills}>
                          No skills listed
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* ACTIONS */}

                  <View style={styles.actions}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => {
                        if (
                          onViewCandidate
                        ) {
                          onViewCandidate(
                            candidate
                          );
                        }
                      }}
                    >
                      <Text
                        style={
                          styles.secondaryButtonText
                        }
                      >
                        View Candidate
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.statusButton}
                      onPress={() =>
                        chooseStatus(candidate)
                      }
                    >
                      <Text
                        style={styles.statusButtonText}
                      >
                        {status}
                      </Text>

                      <Text
                        style={styles.statusArrow}
                      >
                        ▼
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            }
          )}
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>
        {label}
      </Text>

      <Text style={styles.statValue}>
        {value}
      </Text>
    </View>
  );
}

function Detail({ label, value }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value}
      </Text>
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

  loading: {
    marginTop: 100,
  },

  loadingTitle: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "800",
    color: "#172033",
  },

  loadingText: {
    marginTop: 8,
    textAlign: "center",
    color: "#687386",
    fontSize: 15,
  },

  heading: {
    marginBottom: 20,
  },

  headingText: {
    flex: 1,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#172033",
  },

  subtitle: {
    marginTop: 6,
    color: "#687386",
    fontSize: 14,
    lineHeight: 21,
  },

  totalCard: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#e4e8ef",
  },

  totalNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#172033",
  },

  totalLabel: {
    marginTop: 2,
    fontSize: 12,
    color: "#687386",
  },

  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e4e8ef",
  },

  statLabel: {
    color: "#687386",
    fontSize: 12,
    lineHeight: 17,
  },

  statValue: {
    marginTop: 8,
    color: "#172033",
    fontSize: 26,
    fontWeight: "800",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e4e8ef",
  },

  filterTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#39445a",
    marginBottom: 7,
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#d8dee8",
    borderRadius: 10,
    paddingHorizontal: 13,
    color: "#172033",
    backgroundColor: "#ffffff",
    marginBottom: 14,
    fontSize: 14,
  },

  selectButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#d8dee8",
    borderRadius: 10,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    backgroundColor: "#ffffff",
  },

  selectText: {
    color: "#172033",
    fontSize: 14,
    flex: 1,
  },

  arrow: {
    color: "#687386",
    fontSize: 11,
    marginLeft: 10,
  },

  resultsText: {
    marginBottom: 14,
    color: "#687386",
    fontSize: 13,
  },

  bold: {
    fontWeight: "800",
    color: "#172033",
  },

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e4e8ef",
  },

  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#172033",
  },

  emptyText: {
    marginTop: 8,
    color: "#687386",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },

  candidatesList: {
    gap: 14,
  },

  candidateCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e4e8ef",
  },

  candidateMain: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e9edf5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#34405a",
  },

  candidateInformation: {
    flex: 1,
    minWidth: 180,
  },

  nameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },

  candidateName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#172033",
    marginRight: 7,
    marginBottom: 4,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 4,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#172033",
  },

  statusApplied: {
    backgroundColor: "#edf1f7",
  },

  statusShortlisted: {
    backgroundColor: "#e4f1ff",
  },

  statusInterview: {
    backgroundColor: "#fff1d9",
  },

  statusHired: {
    backgroundColor: "#def5e7",
  },

  statusRejected: {
    backgroundColor: "#ffe3e3",
  },

  email: {
    color: "#687386",
    fontSize: 12,
    marginTop: 2,
  },

  job: {
    color: "#687386",
    fontSize: 12,
    marginTop: 7,
    lineHeight: 18,
  },

  matchBox: {
    minWidth: 68,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: "center",
    marginLeft: 8,
    marginTop: 2,
  },

  matchHigh: {
    backgroundColor: "#def5e7",
  },

  matchMedium: {
    backgroundColor: "#fff1d9",
  },

  matchLow: {
    backgroundColor: "#ffe3e3",
  },

  matchNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: "#172033",
  },

  matchLabel: {
    marginTop: 2,
    fontSize: 9,
    color: "#687386",
    fontWeight: "700",
  },

  details: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#edf0f4",
  },

  detail: {
    width: "50%",
    marginBottom: 13,
    paddingRight: 8,
  },

  detailLabel: {
    color: "#8a94a6",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
  },

  detailValue: {
    color: "#172033",
    fontSize: 12,
    fontWeight: "700",
  },

  skillsSection: {
    paddingTop: 4,
  },

  sectionLabel: {
    color: "#687386",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 8,
  },

  skills: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  skillTag: {
    backgroundColor: "#f0f3f8",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },

  skillText: {
    fontSize: 11,
    color: "#39445a",
    fontWeight: "600",
  },

  noSkills: {
    color: "#8a94a6",
    fontSize: 12,
  },

  actions: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#edf0f4",
  },

  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#d8dee8",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  secondaryButtonText: {
    color: "#172033",
    fontSize: 12,
    fontWeight: "800",
  },

  statusButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#172033",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  statusButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },

  statusArrow: {
    color: "#ffffff",
    fontSize: 9,
    marginLeft: 7,
  },
});

export default Candidates;