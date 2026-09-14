import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getSupabase,
  supabaseErrorMessage,
} from "../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationBell from "./NotificationBell";

import Candidates from "./Candidates";
import CandidateProfile from "../components/CandidateProfile";
import { BusinessAnalyticsSection } from "./AnalyticsCharts";

/*
 * Single source of truth for business navigation — reused by the desktop
 * sidebar and the mobile horizontal pill nav, so they can never drift.
 */
const NAV_ITEMS = [
  { id: "dashboard", icon: "▦", label: "Dashboard" },
  { id: "profile", icon: "◉", label: "Company Profile" },
  { id: "post-job", icon: "+", label: "Post a Job" },
  { id: "jobs", icon: "▤", label: "My Jobs" },
  { id: "candidates", icon: "♙", label: "Candidates" },
  {
    id: "applications",
    icon: "▣",
    label: "Applications",
    hasNotification: true,
  },
  { id: "analytics", icon: "📈", label: "Analytics" },
];

// Below this width the 245px sidebar would crush the content area.
const MOBILE_BREAKPOINT = 820;

function BusinessDashboard({ user, onLogout }) {
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const insets = useSafeAreaInsets();

  const email =
    user?.email?.trim().toLowerCase() || "";

  const profileKey =
    `careerAI_business_profile_${email}`;

  const jobsKey =
    `careerAI_jobs_${email}`;

  const [page, setPage] =
    useState("dashboard");

  const [selectedCandidate, setSelectedCandidate] =
    useState(null);

  const [businessProfile, setBusinessProfile] =
    useState({
      companyName: user?.name || "",
      email,
      industry: "Technology",
      location: "Cape Town",
      description:
        "Connect talented graduates with meaningful career opportunities.",
    });

  const [jobs, setJobs] =
    useState([]);

  const [applications, setApplications] =
    useState([]);

  const [jobForm, setJobForm] =
    useState({
      title: "",
      location: "Cape Town",
      type: "Full-time",
      salary: "",
      description: "",
      requirements: "",
      skills: "",
    });

  const [profileForm, setProfileForm] =
    useState(businessProfile);

  const [loading, setLoading] =
    useState(true);

  /*
   * =========================================================
   * LOAD BUSINESS DATA
   * =========================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);

      await loadBusinessProfile();

      if (!mounted) return;

      await loadJobs();

      if (!mounted) return;

      await loadApplications();

      if (!mounted) return;

      setLoading(false);
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [email]);

  /*
   * =========================================================
   * BUSINESS PROFILE
   * =========================================================
   */

  async function loadBusinessProfile() {
    try {
      const saved =
        await AsyncStorage.getItem(
          profileKey
        );

      if (saved) {
        const savedProfile =
          JSON.parse(saved);

        setBusinessProfile(
          savedProfile
        );

        setProfileForm(
          savedProfile
        );

        return;
      }

      const defaultProfile = {
        companyName:
          user?.name || "",
        email,
        industry: "Technology",
        location: "Cape Town",
        description:
          "Connect talented graduates with meaningful career opportunities.",
      };

      setBusinessProfile(
        defaultProfile
      );

      setProfileForm(
        defaultProfile
      );
    } catch (error) {
      console.log(
        "Could not load business profile.",
        error
      );
    }
  }

  function updateProfileForm(
    field,
    value
  ) {
    setProfileForm(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  }

  async function saveProfile() {
    const updatedProfile = {
      ...profileForm,
      email,
    };

    try {
      await AsyncStorage.setItem(
        profileKey,
        JSON.stringify(
          updatedProfile
        )
      );

      setBusinessProfile(
        updatedProfile
      );

      /*
       * Update all existing jobs belonging
       * to this business.
       */

      const savedAllJobs =
        await AsyncStorage.getItem(
          "careerAI_jobs"
        );

      const allJobs =
        savedAllJobs
          ? JSON.parse(savedAllJobs)
          : [];

      const updatedAllJobs =
        Array.isArray(allJobs)
          ? allJobs.map((job) => {
              if (
                job.businessEmail
                  ?.trim()
                  .toLowerCase() !==
                email
              ) {
                return job;
              }

              return {
                ...job,
                companyName:
                  updatedProfile.companyName ||
                  "Your Company",
                company:
                  updatedProfile.companyName ||
                  "Your Company",
                industry:
                  updatedProfile.industry ||
                  "",
                companyLocation:
                  updatedProfile.location ||
                  "Cape Town",
              };
            })
          : [];

      await AsyncStorage.setItem(
        "careerAI_jobs",
        JSON.stringify(
          updatedAllJobs
        )
      );

      const updatedBusinessJobs =
        updatedAllJobs.filter(
          (job) =>
            job.businessEmail
              ?.trim()
              .toLowerCase() ===
            email
        );

      setJobs(
        updatedBusinessJobs
      );

      await AsyncStorage.setItem(
        jobsKey,
        JSON.stringify(
          updatedBusinessJobs
        )
      );

      Alert.alert(
        "Profile Saved",
        "Company profile saved successfully."
      );
    } catch (error) {
      console.log(
        "Could not save business profile.",
        error
      );

      Alert.alert(
        "Error",
        "Could not save the company profile."
      );
    }
  }

  /*
   * =========================================================
   * JOBS
   * =========================================================
   */

  async function loadJobs() {
    try {
      /*
       * Prefer the global job list because
       * Admin and Job Seekers use it too.
       */

      const savedAllJobs =
        await AsyncStorage.getItem(
          "careerAI_jobs"
        );

      const allJobs =
        savedAllJobs
          ? JSON.parse(savedAllJobs)
          : [];

      if (Array.isArray(allJobs)) {
        const businessJobs =
          allJobs.filter(
            (job) =>
              job.businessEmail
                ?.trim()
                .toLowerCase() ===
              email
          );

        setJobs(
          businessJobs
        );

        await AsyncStorage.setItem(
          jobsKey,
          JSON.stringify(
            businessJobs
          )
        );

        return;
      }

      /*
       * Fallback to business-specific jobs.
       */

      const savedJobs =
        await AsyncStorage.getItem(
          jobsKey
        );

      const parsedJobs =
        savedJobs
          ? JSON.parse(savedJobs)
          : [];

      if (Array.isArray(parsedJobs)) {
        setJobs(parsedJobs);
      }
    } catch (error) {
      console.log(
        "Could not load jobs.",
        error
      );

      setJobs([]);
    }
  }

  function updateJobForm(
    field,
    value
  ) {
    setJobForm(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  }

  async function postJob() {
    if (!jobForm.title.trim()) {
      Alert.alert(
        "Job Title Required",
        "Please enter a job title."
      );

      return;
    }

    if (
      !jobForm.description.trim()
    ) {
      Alert.alert(
        "Description Required",
        "Please enter a job description."
      );

      return;
    }

    if (!email) {
      Alert.alert(
        "Login Required",
        "You must be logged in as a business to post a job."
      );

      return;
    }

    const skills =
      jobForm.skills
        .split(",")
        .map(
          (skill) =>
            skill.trim()
        )
        .filter(Boolean);

    const companyName =
      businessProfile.companyName ||
      businessProfile.name ||
      user?.name ||
      "Your Company";

    const newJob = {
      id:
        `job-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      businessEmail:
        email,

      companyName,

      company:
        companyName,

      industry:
        businessProfile.industry ||
        "Technology",

      companyLocation:
        businessProfile.location ||
        "Cape Town",

      title:
        jobForm.title.trim(),

      location:
        jobForm.location.trim() ||
        businessProfile.location ||
        "Cape Town",

      type:
        jobForm.type,

      description:
        jobForm.description.trim(),

      requirements:
        jobForm.requirements.trim(),

      skills,

      salary:
        jobForm.salary.trim() ||
        "Salary not specified",

      createdAt:
        new Date().toISOString(),

      applications: [],

      status:
        "Active",

      isBusinessJob:
        true,
    };

    const updatedJobs = [
      ...jobs,
      newJob,
    ];

    setJobs(
      updatedJobs
    );

    try {
      await AsyncStorage.setItem(
        jobsKey,
        JSON.stringify(
          updatedJobs
        )
      );

      /*
       * Update global jobs.
       */

      const savedAllJobs =
        await AsyncStorage.getItem(
          "careerAI_jobs"
        );

      const allJobs =
        savedAllJobs
          ? JSON.parse(savedAllJobs)
          : [];

      const safeAllJobs =
        Array.isArray(allJobs)
          ? allJobs
          : [];

      const existingJob =
        safeAllJobs.some(
          (job) =>
            String(job.id) ===
            String(newJob.id)
        );

      if (!existingJob) {
        await AsyncStorage.setItem(
          "careerAI_jobs",
          JSON.stringify([
            ...safeAllJobs,
            newJob,
          ])
        );
      }

      /*
        Persist to Supabase. The DB trigger forces the
        listing to 'pending' — it stays invisible to
        students until an admin approves it (brief 2.5).
      */
      const supabase =
        getSupabase();

      if (supabase) {
        const {
          data: sessionData,
        } =
          await supabase.auth.getUser();

        const authUser =
          sessionData?.user;

        if (authUser) {
          const { error } =
            await supabase
              .from(
                "opportunities"
              )
              .insert({
                business_id:
                  authUser.id,

                title:
                  newJob.title,

                company:
                  newJob.companyName,

                industry:
                  newJob.industry,

                location:
                  newJob.location,

                employment_type:
                  newJob.type,

                salary:
                  newJob.salary,

                description:
                  newJob.description,

                requirements:
                  newJob.requirements,

                skills:
                  newJob.skills,
              });

          if (error) {
            Alert.alert(
              "Backend Warning",
              supabaseErrorMessage(
                error
              )
            );
          } else {
            Alert.alert(
              "Pending Review",
              "Job submitted! It will go live once an administrator approves it."
            );

            setPage("jobs");

            return;
          }
        }
      }

      setJobForm({
        title: "",
        location:
          businessProfile.location ||
          "Cape Town",
        type: "Full-time",
        salary: "",
        description: "",
        requirements: "",
        skills: "",
      });

      Alert.alert(
        "Job Posted",
        "Job posted successfully!"
      );

      setPage("jobs");
    } catch (error) {
      console.log(
        "Could not post job.",
        error
      );

      Alert.alert(
        "Error",
        "Could not post the job."
      );
    }
  }

  /*
   * Delete a job from both the business
   * account and global job database.
   */

  function deleteJob(jobId) {
    Alert.alert(
      "Delete Job",
      "Are you sure you want to delete this job?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedJobs =
              jobs.filter(
                (job) =>
                  String(job.id) !==
                  String(jobId)
              );

            setJobs(
              updatedJobs
            );

            try {
              await AsyncStorage.setItem(
                jobsKey,
                JSON.stringify(
                  updatedJobs
                )
              );

              /*
               * Update global jobs.
               */

              const savedAllJobs =
                await AsyncStorage.getItem(
                  "careerAI_jobs"
                );

              const allJobs =
                savedAllJobs
                  ? JSON.parse(
                      savedAllJobs
                    )
                  : [];

              const updatedAllJobs =
                Array.isArray(allJobs)
                  ? allJobs.filter(
                      (job) =>
                        String(
                          job.id
                        ) !==
                        String(
                          jobId
                        )
                    )
                  : [];

              await AsyncStorage.setItem(
                "careerAI_jobs",
                JSON.stringify(
                  updatedAllJobs
                )
              );

              /*
               * Remove applications
               * for the deleted job.
               */

              const savedApplications =
                await AsyncStorage.getItem(
                  "careerAI_applications"
                );

              const allApplications =
                savedApplications
                  ? JSON.parse(
                      savedApplications
                    )
                  : [];

              const updatedApplications =
                Array.isArray(
                  allApplications
                )
                  ? allApplications.filter(
                      (application) =>
                        String(
                          application.jobId
                        ) !==
                        String(
                          jobId
                        )
                    )
                  : [];

              await AsyncStorage.setItem(
                "careerAI_applications",
                JSON.stringify(
                  updatedApplications
                )
              );

              await loadApplications();

              Alert.alert(
                "Job Deleted",
                "Job deleted successfully."
              );
            } catch (error) {
              console.log(
                "Could not delete job.",
                error
              );

              Alert.alert(
                "Error",
                "Could not delete the job."
              );
            }
          },
        },
      ]
    );
  }

  /*
   * Activate/deactivate a job.
   */

  async function toggleJobStatus(
    jobId
  ) {
    const updatedJobs =
      jobs.map(
        (job) => {
          if (
            String(job.id) !==
            String(jobId)
          ) {
            return job;
          }

          return {
            ...job,
            status:
              job.status ===
              "Inactive"
                ? "Active"
                : "Inactive",
          };
        }
      );

    setJobs(
      updatedJobs
    );

    try {
      await AsyncStorage.setItem(
        jobsKey,
        JSON.stringify(
          updatedJobs
        )
      );

      const savedAllJobs =
        await AsyncStorage.getItem(
          "careerAI_jobs"
        );

      const allJobs =
        savedAllJobs
          ? JSON.parse(savedAllJobs)
          : [];

      const updatedAllJobs =
        Array.isArray(allJobs)
          ? allJobs.map(
              (job) => {
                if (
                  String(job.id) !==
                  String(jobId)
                ) {
                  return job;
                }

                const currentJob =
                  updatedJobs.find(
                    (item) =>
                      String(
                        item.id
                      ) ===
                      String(jobId)
                  );

                return {
                  ...job,
                  status:
                    currentJob?.status ||
                    job.status,
                };
              }
            )
          : [];

      await AsyncStorage.setItem(
        "careerAI_jobs",
        JSON.stringify(
          updatedAllJobs
        )
      );
    } catch (error) {
      console.log(
        "Could not update job status.",
        error
      );
    }
  }

  /*
   * =========================================================
   * APPLICATIONS
   * =========================================================
   */

  async function loadApplications() {
    try {
      const saved =
        await AsyncStorage.getItem(
          "careerAI_applications"
        );

      const allApplications =
        saved
          ? JSON.parse(saved)
          : [];

      const businessApplications =
        Array.isArray(
          allApplications
        )
          ? allApplications.filter(
              (application) =>
                application.businessEmail
                  ?.trim()
                  .toLowerCase() ===
                email
            )
          : [];

      setApplications(
        businessApplications
      );
    } catch (error) {
      console.log(
        "Could not load applications.",
        error
      );

      setApplications([]);
    }
  }

  /*
   * Update application status globally.
   */

  async function updateApplicationStatus(
    applicationId,
    newStatus
  ) {
    try {
      const saved =
        await AsyncStorage.getItem(
          "careerAI_applications"
        );

      const allApplications =
        saved
          ? JSON.parse(saved)
          : [];

      const application =
        allApplications.find(
          (item) =>
            item.id ===
            applicationId
        );

      if (!application) {
        Alert.alert(
          "Application Not Found",
          "Application could not be found."
        );

        return false;
      }

      /*
       * Security check:
       * business can only update
       * its own applications.
       */

      if (
        application.businessEmail
          ?.trim()
          .toLowerCase() !==
        email
      ) {
        Alert.alert(
          "Access Denied",
          "You can only manage applications for your own jobs."
        );

        return false;
      }

      const statusUpdatedAt =
        new Date().toISOString();

      const updatedApplications =
        allApplications.map(
          (item) => {
            if (
              item.id ===
              applicationId
            ) {
              return {
                ...item,
                status:
                  newStatus,
                statusUpdatedAt,
              };
            }

            return item;
          }
        );

      await AsyncStorage.setItem(
        "careerAI_applications",
        JSON.stringify(
          updatedApplications
        )
      );

      /*
       * Update local business list.
       */

      const businessApplications =
        updatedApplications.filter(
          (item) =>
            item.businessEmail
              ?.trim()
              .toLowerCase() ===
            email
        );

      setApplications(
        businessApplications
      );

      /*
       * Update candidate's personal
       * application storage too.
       */

      const updatedApplication =
        updatedApplications.find(
          (item) =>
            item.id ===
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

        try {
          const savedSeeker =
            await AsyncStorage.getItem(
              seekerKey
            );

          const seekerApplications =
            savedSeeker
              ? JSON.parse(
                  savedSeeker
                )
              : [];

          const updatedSeekerApplications =
            Array.isArray(
              seekerApplications
            )
              ? seekerApplications.map(
                  (item) => {
                    if (
                      item.id ===
                      applicationId
                    ) {
                      return {
                        ...item,
                        status:
                          newStatus,
                        statusUpdatedAt,
                      };
                    }

                    return item;
                  }
                )
              : [];

          await AsyncStorage.setItem(
            seekerKey,
            JSON.stringify(
              updatedSeekerApplications
            )
          );
        } catch (error) {
          console.log(
            "Could not update Job Seeker application.",
            error
          );
        }
      }

      return true;
    } catch (error) {
      console.log(
        "Could not update application.",
        error
      );

      Alert.alert(
        "Error",
        "Could not update the application."
      );

      return false;
    }
  }

  /*
   * =========================================================
   * CANDIDATE PROFILE
   * =========================================================
   */

  async function handleCandidateStatusChange(
    applicationId,
    newStatus
  ) {
    const updated =
      await updateApplicationStatus(
        applicationId,
        newStatus
      );

    if (!updated) {
      return;
    }

    setSelectedCandidate(
      (previous) => {
        if (!previous) {
          return null;
        }

        return {
          ...previous,
          status:
            newStatus,
        };
      }
    );
  }

  function handleViewCandidate(
    candidate
  ) {
    setSelectedCandidate(
      candidate
    );
  }

  /*
   * =========================================================
   * CALCULATED DATA
   * =========================================================
   */

  const activeJobs =
    useMemo(
      () =>
        jobs.filter(
          (job) =>
            job.status !==
            "Inactive"
        ),
      [jobs]
    );

  const newApplications =
    useMemo(
      () =>
        applications.filter(
          (application) =>
            (
              application.status ||
              "Applied"
            ) ===
            "Applied"
        ),
      [applications]
    );

  const shortlisted =
    useMemo(
      () =>
        applications.filter(
          (application) =>
            application.status ===
            "Shortlisted"
        ).length,
      [applications]
    );

  const interviews =
    useMemo(
      () =>
        applications.filter(
          (application) =>
            application.status ===
            "Interview"
        ).length,
      [applications]
    );

  const hired =
    useMemo(
      () =>
        applications.filter(
          (application) =>
            application.status ===
            "Hired"
        ).length,
      [applications]
    );

  /*
   * =========================================================
   * SIDEBAR
   * =========================================================
   */

  function renderSidebar() {
    const companyName =
      businessProfile.companyName ||
      user?.name ||
      "Business";

    return (
      <View style={styles.sidebar}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>
              AI
            </Text>
          </View>

          <View>
            <Text style={styles.logoTitle}>
              Career Next Step
            </Text>

            <Text style={styles.logoSubtitle}>
              Business
            </Text>
          </View>
        </View>

        <View style={styles.accountBox}>
          <View style={styles.accountAvatar}>
            <Text style={styles.accountAvatarText}>
              {companyName
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.accountInfo}>
            <Text
              style={styles.accountName}
              numberOfLines={1}
            >
              {companyName}
            </Text>

            <Text style={styles.accountRole}>
              Employer Account
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.navigation}
          showsVerticalScrollIndicator={false}
        >
          <NavButton
            icon="▦"
            label="Dashboard"
            active={
              page === "dashboard"
            }
            onPress={() =>
              setPage("dashboard")
            }
          />

          <NavButton
            icon="◉"
            label="Company Profile"
            active={
              page === "profile"
            }
            onPress={() =>
              setPage("profile")
            }
          />

          <NavButton
            icon="+"
            label="Post a Job"
            active={
              page === "post-job"
            }
            onPress={() =>
              setPage("post-job")
            }
          />

          <NavButton
            icon="▤"
            label="My Jobs"
            active={
              page === "jobs"
            }
            onPress={() =>
              setPage("jobs")
            }
          />

          <NavButton
            icon="♙"
            label="Candidates"
            active={
              page === "candidates"
            }
            onPress={() =>
              setPage("candidates")
            }
          />

          <NavButton
            icon="▣"
            label="Applications"
            active={
              page === "applications"
            }
            notification={
              newApplications.length
            }
            onPress={() =>
              setPage("applications")
            }
          />

          <NavButton
            icon="📈"
            label="Analytics"
            active={
              page === "analytics"
            }
            onPress={() =>
              setPage("analytics")
            }
          />
        </ScrollView>

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed &&
              styles.buttonPressed,
          ]}
          onPress={onLogout}
        >
          <Text style={styles.logoutIcon}>
            ↪
          </Text>

          <Text style={styles.logoutText}>
            Logout
          </Text>
        </Pressable>
      </View>
    );
  }

  /*
   * =========================================================
   * DASHBOARD
   * =========================================================
   */

  function renderDashboard() {
    return (
      <ScrollView
        style={styles.main}
        contentContainerStyle={
          styles.pageContent
        }
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            marginBottom: 4,
          }}
        >
          <NotificationBell />
        </View>

        <PageHeader
          title="Business Dashboard"
          description="Manage your company and find talented graduates."
          buttonText="+ Post a Job"
          onButtonPress={() =>
            setPage("post-job")
          }
        />

        <View style={styles.statsGrid}>
          <StatCard
            label="Active Jobs"
            value={activeJobs.length}
            description="Currently posted"
          />

          <StatCard
            label="Applications"
            value={applications.length}
            description="Total received"
          />

          <StatCard
            label="New Applications"
            value={
              newApplications.length
            }
            description="Need your attention"
          />

          <StatCard
            label="Hired"
            value={hired}
            description="Successful placements"
          />
        </View>

        <View style={styles.dashboardGrid}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>
                  Recent Applications
                </Text>

                <Text style={styles.cardDescription}>
                  Candidates who recently
                  applied to your jobs.
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setPage(
                    "applications"
                  )
                }
              >
                <Text style={styles.textButton}>
                  View All
                </Text>
              </Pressable>
            </View>

            {applications.length ===
            0 ? (
              <EmptyCard
                icon="▣"
                title="No applications yet"
                description="Applications from graduates will appear here."
              />
            ) : (
              <View>
                {applications
                  .slice(0, 5)
                  .map(
                    (
                      application
                    ) => (
                      <View
                        style={
                          styles.applicationRow
                        }
                        key={
                          application.id
                        }
                      >
                        <View
                          style={
                            styles.candidateAvatar
                          }
                        >
                          <Text
                            style={
                              styles.candidateAvatarText
                            }
                          >
                            {(
                              application.seekerName ||
                              "J"
                            )
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.applicationRowInfo
                          }
                        >
                          <Text
                            style={
                              styles.applicationName
                            }
                          >
                            {application.seekerName ||
                              "Job Seeker"}
                          </Text>

                          <Text
                            style={
                              styles.applicationJob
                            }
                            numberOfLines={
                              1
                            }
                          >
                            {
                              application.jobTitle
                            }
                          </Text>
                        </View>

                        <View
                          style={
                            styles.matchBadge
                          }
                        >
                          <Text
                            style={
                              styles.matchBadgeText
                            }
                          >
                            {
                              application.matchScore ??
                              0
                            }%
                          </Text>

                          <Text
                            style={
                              styles.matchBadgeLabel
                            }
                          >
                            Match
                          </Text>
                        </View>
                      </View>
                    )
                  )}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>
                  Quick Actions
                </Text>

                <Text style={styles.cardDescription}>
                  Manage your recruitment.
                </Text>
              </View>
            </View>

            <View style={styles.quickActions}>
              <QuickAction
                title="+ Post a Job"
                description="Find new graduates"
                onPress={() =>
                  setPage(
                    "post-job"
                  )
                }
              />

              <QuickAction
                title="View Applications"
                description="Review candidates"
                onPress={() =>
                  setPage(
                    "applications"
                  )
                }
              />

              <QuickAction
                title="View Candidates"
                description="Explore candidate profiles"
                onPress={() =>
                  setPage(
                    "candidates"
                  )
                }
              />

              <QuickAction
                title="Company Profile"
                description="Update your details"
                onPress={() =>
                  setPage(
                    "profile"
                  )
                }
              />
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  /*
   * =========================================================
   * COMPANY PROFILE
   * =========================================================
   */

  function renderProfile() {
    return (
      <ScrollView
        style={styles.main}
        contentContainerStyle={
          styles.pageContent
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="Company Profile"
          description="Manage your company information."
        />

        <View style={styles.profileLayout}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Company Information
            </Text>

            <View style={styles.formGrid}>
              <FormField
                label="Company Name"
                value={
                  profileForm.companyName ||
                  ""
                }
                onChangeText={(value) =>
                  updateProfileForm(
                    "companyName",
                    value
                  )
                }
                placeholder="Company name"
              />

              <FormField
                label="Email"
                value={email}
                editable={false}
                placeholder="Email"
              />

              <FormField
                label="Industry"
                value={
                  profileForm.industry ||
                  ""
                }
                onChangeText={(value) =>
                  updateProfileForm(
                    "industry",
                    value
                  )
                }
                placeholder="Technology"
              />

              <FormField
                label="Location"
                value={
                  profileForm.location ||
                  ""
                }
                onChangeText={(value) =>
                  updateProfileForm(
                    "location",
                    value
                  )
                }
                placeholder="Cape Town"
              />
            </View>

            <FormField
              label="Company Description"
              value={
                profileForm.description ||
                ""
              }
              onChangeText={(value) =>
                updateProfileForm(
                  "description",
                  value
                )
              }
              placeholder="Tell graduates about your company..."
              multiline
              numberOfLines={6}
            />

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed &&
                  styles.buttonPressed,
              ]}
              onPress={
                saveProfile
              }
            >
              <Text style={styles.primaryButtonText}>
                Save Profile
              </Text>
            </Pressable>
          </View>

          <View style={styles.previewCard}>
            <View
              style={
                styles.companyAvatar
              }
            >
              <Text
                style={
                  styles.companyAvatarText
                }
              >
                {(
                  profileForm.companyName ||
                  "C"
                )
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <Text style={styles.previewTitle}>
              {profileForm.companyName ||
                "Your Company"}
            </Text>

            <Text style={styles.previewIndustry}>
              {profileForm.industry ||
                "Technology"}
            </Text>

            <Text style={styles.previewLocation}>
              📍{" "}
              {profileForm.location ||
                "Cape Town"}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.previewDescription}>
              {profileForm.description ||
                "Your company description will appear here."}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  /*
   * =========================================================
   * POST JOB
   * =========================================================
   */

  function renderPostJob() {
    return (
      <ScrollView
        style={styles.main}
        contentContainerStyle={
          styles.pageContent
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="Post a Job"
          description="Create an opportunity for graduates on Career Next Step."
        />

        <View style={styles.card}>
          <View style={styles.formGrid}>
            <FormField
              label="Job Title *"
              value={
                jobForm.title
              }
              onChangeText={(value) =>
                updateJobForm(
                  "title",
                  value
                )
              }
              placeholder="Junior Software Developer"
            />

            <FormField
              label="Location"
              value={
                jobForm.location
              }
              onChangeText={(value) =>
                updateJobForm(
                  "location",
                  value
                )
              }
              placeholder="Cape Town"
            />

            <SelectField
              label="Employment Type"
              value={
                jobForm.type
              }
              options={[
                "Full-time",
                "Part-time",
                "Internship",
                "Contract",
              ]}
              onChange={(value) =>
                updateJobForm(
                  "type",
                  value
                )
              }
            />

            <FormField
              label="Salary"
              value={
                jobForm.salary
              }
              onChangeText={(value) =>
                updateJobForm(
                  "salary",
                  value
                )
              }
              placeholder="R15,000 - R20,000"
            />
          </View>

          <FormField
            label="Job Description *"
            value={
              jobForm.description
            }
            onChangeText={(value) =>
              updateJobForm(
                "description",
                value
              )
            }
            placeholder="Describe the position..."
            multiline
            numberOfLines={6}
          />

          <FormField
            label="Requirements"
            value={
              jobForm.requirements
            }
            onChangeText={(value) =>
              updateJobForm(
                "requirements",
                value
              )
            }
            placeholder="List the requirements..."
            multiline
            numberOfLines={5}
          />

          <FormField
            label="Required Skills"
            value={
              jobForm.skills
            }
            onChangeText={(value) =>
              updateJobForm(
                "skills",
                value
              )
            }
            placeholder="JavaScript, React, Git, HTML"
            helperText="Separate skills with commas."
          />

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed &&
                styles.buttonPressed,
            ]}
            onPress={
              postJob
            }
          >
            <Text style={styles.primaryButtonText}>
              Publish Job
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  /*
   * =========================================================
   * MY JOBS
   * =========================================================
   */

  function renderJobs() {
    return (
      <ScrollView
        style={styles.main}
        contentContainerStyle={
          styles.pageContent
        }
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="My Jobs"
          description="Manage the jobs posted by your company."
          buttonText="+ Post a Job"
          onButtonPress={() =>
            setPage("post-job")
          }
        />

        {jobs.length === 0 ? (
          <EmptyCard
            icon="▤"
            title="You have not posted any jobs"
            description="Create your first job opportunity to start receiving applications."
            buttonText="Post Your First Job"
            onButtonPress={() =>
              setPage(
                "post-job"
              )
            }
          />
        ) : (
          <View>
            {jobs.map((job) => {
              const jobApplications =
                applications.filter(
                  (application) =>
                    String(
                      application.jobId
                    ) ===
                    String(job.id)
                );

              return (
                <View
                  style={
                    styles.card
                  }
                  key={
                    job.id
                  }
                >
                  <View
                    style={
                      styles.jobHeader
                    }
                  >
                    <View
                      style={
                        styles.jobHeaderInfo
                      }
                    >
                      <Text
                        style={
                          styles.jobTitle
                        }
                      >
                        {
                          job.title
                        }
                      </Text>

                      <Text
                        style={
                          styles.jobSubtitle
                        }
                      >
                        {
                          job.location
                        }
                        {" • "}
                        {
                          job.type
                        }
                      </Text>
                    </View>

                    <StatusBadge
                      status={
                        job.status ||
                        "Active"
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.jobDescription
                    }
                  >
                    {
                      job.description
                    }
                  </Text>

                  <View
                    style={
                      styles.jobMeta
                    }
                  >
                    <MetaItem
                      icon="💰"
                      text={
                        job.salary
                      }
                    />

                    <MetaItem
                      icon="👥"
                      text={`${jobApplications.length} Applications`}
                    />

                    <MetaItem
                      icon="🏷️"
                      text={
                        Array.isArray(
                          job.skills
                        )
                          ? job.skills.join(
                              ", "
                            )
                          : ""
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.jobActions
                    }
                  >
                    <Pressable
                      style={
                        styles.secondaryButton
                      }
                      onPress={() =>
                        setPage(
                          "applications"
                        )
                      }
                    >
                      <Text
                        style={
                          styles.secondaryButtonText
                        }
                      >
                        View Applications
                      </Text>
                    </Pressable>

                    <Pressable
                      style={
                        styles.secondaryButton
                      }
                      onPress={() =>
                        toggleJobStatus(
                          job.id
                        )
                      }
                    >
                      <Text
                        style={
                          styles.secondaryButtonText
                        }
                      >
                        {job.status ===
                        "Inactive"
                          ? "Activate Job"
                          : "Deactivate Job"}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={
                        styles.dangerButton
                      }
                      onPress={() =>
                        deleteJob(
                          job.id
                        )
                      }
                    >
                      <Text
                        style={
                          styles.dangerButtonText
                        }
                      >
                        Delete Job
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  }

  /*
   * =========================================================
   * APPLICATIONS
   * =========================================================
   */

  function renderApplications() {
    return (
      <ScrollView
        style={styles.main}
        contentContainerStyle={
          styles.pageContent
        }
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="Applications"
          description="Review graduates who applied for your jobs."
        />

        {applications.length ===
        0 ? (
          <EmptyCard
            icon="▣"
            title="No applications yet"
            description="When graduates apply to your jobs, their applications will appear here."
          />
        ) : (
          <View>
            {applications.map(
              (application) => (
                <View
                  style={
                    styles.applicationCard
                  }
                  key={
                    application.id
                  }
                >
                  <View
                    style={
                      styles.candidateTop
                    }
                  >
                    <View
                      style={
                        styles.largeCandidateAvatar
                      }
                    >
                      <Text
                        style={
                          styles.largeCandidateAvatarText
                        }
                      >
                        {(
                          application.seekerName ||
                          "J"
                        )
                          .charAt(
                            0
                          )
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.candidateInfo
                      }
                    >
                      <Text
                        style={
                          styles.candidateName
                        }
                      >
                        {application.seekerName ||
                          "Job Seeker"}
                      </Text>

                      <Text
                        style={
                          styles.candidateEmail
                        }
                        numberOfLines={
                          1
                        }
                      >
                        {
                          application.seekerEmail
                        }
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.matchBox
                    }
                  >
                    <Text
                      style={
                        styles.matchScore
                      }
                    >
                      {
                        application.matchScore ??
                        0
                      }%
                    </Text>

                    <Text
                      style={
                        styles.matchLabel
                      }
                    >
                      AI Job Match
                    </Text>
                  </View>

                  <View
                    style={
                      styles.applicationInfo
                    }
                  >
                    <InfoBlock
                      label="Applied For"
                      value={
                        application.jobTitle ||
                        "Job"
                      }
                    />

                    <InfoBlock
                      label="Location"
                      value={
                        application.location ||
                        "Not specified"
                      }
                    />

                    <InfoBlock
                      label="Applied"
                      value={
                        application.appliedAt
                          ? new Date(
                              application.appliedAt
                            ).toLocaleDateString(
                              "en-ZA"
                            )
                          : "Recently"
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.label
                    }
                  >
                    Candidate Skills
                  </Text>

                  <View
                    style={
                      styles.skillsContainer
                    }
                  >
                    {Array.isArray(
                      application.seekerSkills
                    ) &&
                    application
                      .seekerSkills
                      .length >
                      0 ? (
                      application.seekerSkills.map(
                        (
                          skill,
                          index
                        ) => (
                          <View
                            style={
                              styles.skillTag
                            }
                            key={`${application.id}-skill-${index}`}
                          >
                            <Text
                              style={
                                styles.skillTagText
                              }
                            >
                              {
                                skill
                              }
                            </Text>
                          </View>
                        )
                      )
                    ) : (
                      <Text
                        style={
                          styles.noSkills
                        }
                      >
                        No skills listed
                      </Text>
                    )}
                  </View>

                  <View
                    style={
                      styles.applicationFooter
                    }
                  >
                    <SelectField
                      label="Status"
                      value={
                        application.status ||
                        "Applied"
                      }
                      options={[
                        "Applied",
                        "Shortlisted",
                        "Interview",
                        "Rejected",
                        "Hired",
                      ]}
                      onChange={(
                        value
                      ) =>
                        updateApplicationStatus(
                          application.id,
                          value
                        )
                      }
                    />

                    <Pressable
                      style={
                        styles.secondaryButton
                      }
                      onPress={() =>
                        handleViewCandidate(
                          application
                        )
                      }
                    >
                      <Text
                        style={
                          styles.secondaryButtonText
                        }
                      >
                        View Candidate
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )
            )}
          </View>
        )}
      </ScrollView>
    );
  }

  /*
   * =========================================================
   * CANDIDATES
   * =========================================================
   */

  function renderCandidates() {
    return (
      <View style={styles.main}>
        <Candidates
          user={user}
          onViewCandidate={
            handleViewCandidate
          }
        />
      </View>
    );
  }

  /*
   * =========================================================
   * PAGE ROUTING
   * =========================================================
   */

  function renderCurrentPage() {
    if (
      page ===
      "dashboard"
    ) {
      return renderDashboard();
    }

    if (
      page ===
      "profile"
    ) {
      return renderProfile();
    }

    if (
      page ===
      "post-job"
    ) {
      return renderPostJob();
    }

    if (
      page ===
      "jobs"
    ) {
      return renderJobs();
    }

    if (
      page ===
      "applications"
    ) {
      return renderApplications();
    }

    if (
      page ===
      "candidates"
    ) {
      return renderCandidates();
    }

    if (
      page ===
      "analytics"
    ) {
      return (
        <BusinessAnalyticsSection />
      );
    }

    return renderDashboard();
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading business dashboard...
        </Text>
      </View>
    );
  }

  /*
   * =========================================================
   * MAIN RENDER
   * =========================================================
   */

  return (
    <View
      style={[styles.app, isMobile && styles.appMobile]}
    >
      {/* DESKTOP: fixed sidebar (unchanged) */}
      {!isMobile && renderSidebar()}

      {/* MOBILE: compact header — logo + account chip + logout */}
      {isMobile && (
        <View
          style={[
            styles.mobileHeader,
            {
              paddingTop:
                Math.max(insets.top, 12) + 6,
            },
          ]}
        >
          <View style={styles.mobileHeaderBrand}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoIconText}>
                AI
              </Text>
            </View>

            <View>
              <Text style={styles.logoTitle}>
                Career Next Step
              </Text>

              <Text style={styles.logoSubtitle}>
                Business
              </Text>
            </View>
          </View>

          <View style={styles.mobileHeaderActions}>
            <View style={styles.mobileAvatar}>
              <Text style={styles.mobileAvatarText}>
                {(
                  businessProfile.companyName ||
                  user?.name ||
                  "B"
                )
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.mobileLogout,
                pressed && styles.buttonPressed,
              ]}
              onPress={onLogout}
            >
              <Text style={styles.logoutIcon}>
                ↪
              </Text>

              <Text style={styles.logoutText}>
                Logout
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.mainContainer}>
        {/* MOBILE: horizontal scrolling pill nav */}
        {isMobile && (
          <View style={styles.mobileNavWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.mobileNavContent
              }
            >
              {NAV_ITEMS.map((item) => {
                const active = page === item.id;

                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.mobileNavPill,
                      active &&
                        styles.mobileNavPillActive,
                    ]}
                    onPress={() =>
                      setPage(item.id)
                    }
                  >
                    <Text
                      style={[
                        styles.mobileNavIcon,
                        active &&
                          styles.mobileNavIconActive,
                      ]}
                    >
                      {item.icon}
                    </Text>

                    <Text
                      style={[
                        styles.mobileNavText,
                        active &&
                          styles.mobileNavTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>

                    {item.hasNotification &&
                      newApplications.length >
                        0 && (
                        <View
                          style={
                            styles.mobileNavBadge
                          }
                        >
                          <Text
                            style={
                              styles.mobileNavBadgeText
                            }
                          >
                            {
                              newApplications.length
                            }
                          </Text>
                        </View>
                      )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {renderCurrentPage()}
      </View>

      {selectedCandidate && (
        <View
          style={
            styles.candidateProfileContainer
          }
        >
          <CandidateProfile
            candidate={
              selectedCandidate
            }
            onClose={() =>
              setSelectedCandidate(
                null
              )
            }
            onStatusChange={
              handleCandidateStatusChange
            }
          />
        </View>
      )}
    </View>
  );
}

/*
 * =========================================================
 * SMALL REUSABLE COMPONENTS
 * =========================================================
 */

function NavButton({
  icon,
  label,
  active,
  notification,
  onPress,
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.navButton,
        active &&
          styles.navButtonActive,
        pressed &&
          styles.buttonPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.navIcon,
          active &&
            styles.navIconActive,
        ]}
      >
        {icon}
      </Text>

      <Text
        style={[
          styles.navText,
          active &&
            styles.navTextActive,
        ]}
      >
        {label}
      </Text>

      {notification > 0 && (
        <View
          style={
            styles.notification
          }
        >
          <Text
            style={
              styles.notificationText
            }
          >
            {notification}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function PageHeader({
  title,
  description,
  buttonText,
  onButtonPress,
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderText}>
        <Text style={styles.pageTitle}>
          {title}
        </Text>

        <Text style={styles.pageDescription}>
          {description}
        </Text>
      </View>

      {buttonText && (
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed &&
              styles.buttonPressed,
          ]}
          onPress={
            onButtonPress
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            {buttonText}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function StatCard({
  label,
  value,
  description,
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>
        {label}
      </Text>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statDescription}>
        {description}
      </Text>
    </View>
  );
}

function QuickAction({
  title,
  description,
  onPress,
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.quickAction,
        pressed &&
          styles.buttonPressed,
      ]}
      onPress={onPress}
    >
      <Text style={styles.quickActionTitle}>
        {title}
      </Text>

      <Text
        style={
          styles.quickActionDescription
        }
      >
        {description}
      </Text>
    </Pressable>
  );
}

function EmptyCard({
  icon,
  title,
  description,
  buttonText,
  onButtonPress,
}) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyIcon}>
        {icon}
      </Text>

      <Text style={styles.emptyTitle}>
        {title}
      </Text>

      <Text style={styles.emptyDescription}>
        {description}
      </Text>

      {buttonText && (
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed &&
              styles.buttonPressed,
          ]}
          onPress={
            onButtonPress
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            {buttonText}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  helperText,
}) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>
        {label}
      </Text>

      <TextInput
        style={[
          styles.input,
          multiline &&
            styles.textarea,
          !editable &&
            styles.disabledInput,
        ]}
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor="#94A3B8"
        editable={editable}
        multiline={multiline}
        numberOfLines={
          numberOfLines
        }
        textAlignVertical={
          multiline
            ? "top"
            : "center"
        }
      />

      {helperText && (
        <Text
          style={
            styles.helperText
          }
        >
          {helperText}
        </Text>
      )}
    </View>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}) {
  const [open, setOpen] =
    useState(false);

  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>
        {label}
      </Text>

      <Pressable
        style={styles.select}
        onPress={() =>
          setOpen(!open)
        }
      >
        <Text
          style={
            styles.selectText
          }
        >
          {value}
        </Text>

        <Text
          style={
            styles.selectArrow
          }
        >
          {open ? "▲" : "▼"}
        </Text>
      </Pressable>

      {open && (
        <View
          style={
            styles.selectOptions
          }
        >
          {options.map(
            (option) => (
              <Pressable
                key={option}
                style={[
                  styles.selectOption,
                  option ===
                    value &&
                    styles.selectedOption,
                ]}
                onPress={() => {
                  onChange(
                    option
                  );
                  setOpen(
                    false
                  );
                }}
              >
                <Text
                  style={[
                    styles.selectOptionText,
                    option ===
                      value &&
                      styles.selectedOptionText,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            )
          )}
        </View>
      )}
    </View>
  );
}

function StatusBadge({
  status,
}) {
  const inactive =
    status ===
    "Inactive";

  return (
    <View
      style={[
        styles.statusBadge,
        inactive &&
          styles.inactiveBadge,
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          inactive &&
            styles.inactiveBadgeText,
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

function MetaItem({
  icon,
  text,
}) {
  return (
    <View
      style={
        styles.metaItem
      }
    >
      <Text
        style={
          styles.metaIcon
        }
      >
        {icon}
      </Text>

      <Text
        style={
          styles.metaText
        }
      >
        {text}
      </Text>
    </View>
  );
}

function InfoBlock({
  label,
  value,
}) {
  return (
    <View
      style={
        styles.infoBlock
      }
    >
      <Text
        style={
          styles.infoLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.infoValue
        }
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles = StyleSheet.create({
  app: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F7F9FC",
  },

  /* Mobile: stack header + pill nav above the content instead of a sidebar */
  appMobile: {
    flexDirection: "column",
  },

  mobileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#172033",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },

  mobileHeaderBrand: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },

  mobileHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  mobileAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  mobileAvatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  mobileLogout: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  mobileNavWrap: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  mobileNavContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  mobileNavPill: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 6,
    backgroundColor: "#F1F5F9",
  },

  mobileNavPillActive: {
    backgroundColor: "#2563EB",
  },

  mobileNavIcon: {
    fontSize: 13,
    color: "#64748B",
    marginRight: 5,
  },

  mobileNavIconActive: {
    color: "#FFFFFF",
  },

  mobileNavText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },

  mobileNavTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  mobileNavBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginLeft: 5,
  },

  mobileNavBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  sidebar: {
    width: 245,
    backgroundColor: "#172033",
    paddingTop: 22,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    marginBottom: 24,
  },

  logoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  logoIconText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  logoTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  logoSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },

  accountBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#202B42",
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },

  accountAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  accountAvatarText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  accountInfo: {
    flex: 1,
  },

  accountName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  accountRole: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 3,
  },

  navigation: {
    flex: 1,
  },

  navButton: {
    minHeight: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 5,
  },

  navButtonActive: {
    backgroundColor: "#2563EB",
  },

  navIcon: {
    width: 28,
    color: "#94A3B8",
    fontSize: 18,
    textAlign: "center",
  },

  navIconActive: {
    color: "#FFFFFF",
  },

  navText: {
    flex: 1,
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },

  navTextActive: {
    color: "#FFFFFF",
  },

  notification: {
    minWidth: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  notificationText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  logoutButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
  },

  logoutIcon: {
    width: 28,
    color: "#94A3B8",
    fontSize: 20,
    textAlign: "center",
  },

  logoutText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },

  mainContainer: {
    flex: 1,
  },

  main: {
    flex: 1,
  },

  pageContent: {
    padding: 16,
    paddingBottom: 45,
  },

  pageHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
    gap: 15,
  },

  pageHeaderText: {
    flex: 1,
    minWidth: 200,
  },

  pageTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#172033",
    marginBottom: 5,
  },

  pageDescription: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
  },

  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    paddingHorizontal: 17,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  secondaryButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  dangerButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  dangerButtonText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
  },

  buttonPressed: {
    opacity: 0.7,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  /*
   * Stats
   */

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },

  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },

  statLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },

  statValue: {
    color: "#172033",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 7,
  },

  statDescription: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 3,
  },

  /*
   * Cards
   */

  dashboardGrid: {
    gap: 15,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginBottom: 15,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 17,
  },

  cardHeaderText: {
    flex: 1,
  },

  cardTitle: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 5,
  },

  cardDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
  },

  textButton: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 10,
  },

  /*
   * Applications
   */

  applicationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  candidateAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E8F0FF",
    alignItems: "center",
    justifyContent: "center",
  },

  candidateAvatarText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "800",
  },

  applicationRowInfo: {
    flex: 1,
    marginLeft: 11,
  },

  applicationName: {
    color: "#172033",
    fontSize: 13,
    fontWeight: "800",
  },

  applicationJob: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
  },

  matchBadge: {
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    alignItems: "center",
  },

  matchBadgeText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "900",
  },

  matchBadgeLabel: {
    color: "#64748B",
    fontSize: 9,
    marginTop: 1,
  },

  /*
   * Quick actions
   */

  quickActions: {
    gap: 10,
  },

  quickAction: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    padding: 14,
  },

  quickActionTitle: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "800",
  },

  quickActionDescription: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },

  /*
   * Empty
   */

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  emptyIcon: {
    fontSize: 34,
    color: "#94A3B8",
    marginBottom: 10,
  },

  emptyTitle: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 7,
  },

  emptyDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 400,
    marginBottom: 15,
  },

  /*
   * Forms
   */

  formGrid: {
    gap: 14,
  },

  formGroup: {
    marginBottom: 16,
    position: "relative",
  },

  formLabel: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    color: "#172033",
    fontSize: 14,
  },

  textarea: {
    minHeight: 125,
    paddingTop: 13,
  },

  disabledInput: {
    backgroundColor: "#F1F5F9",
    color: "#64748B",
  },

  helperText: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 5,
  },

  select: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectText: {
    color: "#172033",
    fontSize: 14,
  },

  selectArrow: {
    color: "#64748B",
    fontSize: 11,
  },

  selectOptions: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 11,
    marginTop: 5,
    overflow: "hidden",
    zIndex: 100,
  },

  selectOption: {
    paddingHorizontal: 13,
    paddingVertical: 13,
  },

  selectedOption: {
    backgroundColor: "#EFF6FF",
  },

  selectOptionText: {
    color: "#334155",
    fontSize: 13,
  },

  selectedOptionText: {
    color: "#2563EB",
    fontWeight: "800",
  },

  /*
   * Profile
   */

  profileLayout: {
    gap: 15,
  },

  previewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 22,
    alignItems: "center",
    marginBottom: 15,
  },

  companyAvatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#E8F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  companyAvatarText: {
    color: "#2563EB",
    fontSize: 30,
    fontWeight: "900",
  },

  previewTitle: {
    color: "#172033",
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },

  previewIndustry: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5,
  },

  previewLocation: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 7,
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    width: "100%",
    marginVertical: 18,
  },

  previewDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },

  /*
   * Jobs
   */

  jobHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },

  jobHeaderInfo: {
    flex: 1,
  },

  jobTitle: {
    color: "#172033",
    fontSize: 19,
    fontWeight: "900",
  },

  jobSubtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 5,
  },

  statusBadge: {
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusBadgeText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "800",
  },

  inactiveBadge: {
    backgroundColor: "#F1F5F9",
  },

  inactiveBadgeText: {
    color: "#64748B",
  },

  jobDescription: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 14,
  },

  jobMeta: {
    gap: 8,
    marginBottom: 15,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  metaIcon: {
    width: 25,
    fontSize: 14,
  },

  metaText: {
    flex: 1,
    color: "#64748B",
    fontSize: 12,
  },

  jobActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  /*
   * Applications page
   */

  applicationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginBottom: 15,
  },

  candidateTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  largeCandidateAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E8F0FF",
    alignItems: "center",
    justifyContent: "center",
  },

  largeCandidateAvatarText: {
    color: "#2563EB",
    fontSize: 22,
    fontWeight: "900",
  },

  candidateInfo: {
    flex: 1,
    marginLeft: 12,
  },

  candidateName: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "900",
  },

  candidateEmail: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },

  matchBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 13,
    alignItems: "center",
    marginBottom: 17,
  },

  matchScore: {
    color: "#2563EB",
    fontSize: 26,
    fontWeight: "900",
  },

  matchLabel: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },

  applicationInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },

  infoBlock: {
    flex: 1,
    minWidth: 100,
  },

  infoLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
  },

  infoValue: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },

  label: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },

  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 17,
  },

  skillTag: {
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  skillTagText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
  },

  noSkills: {
    color: "#94A3B8",
    fontSize: 12,
  },

  applicationFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: 10,
  },

  /*
   * Candidate profile
   */

  candidateProfileContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#F7F9FC",
  },

  /*
   * Loading
   */

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F9FC",
  },

  loadingText: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 12,
  },
});

export default BusinessDashboard;