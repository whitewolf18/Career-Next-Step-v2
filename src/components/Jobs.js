import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getSupabase,
  supabaseErrorMessage,
} from "../lib/supabase";

function Jobs({ user, onNavigate }) {
  const email =
    user?.email?.trim().toLowerCase() || "guest";

  const applicationKey =
    `careerAI_applications_${email}`;

  const profileKey =
    `careerAI_profile_${email}`;

  const defaultJobs = [
    {
      id: "default-1",
      title: "Junior Software Developer",
      company: "Tech Solutions",
      location: "Cape Town",
      type: "Full-time",
      description:
        "Join our development team and help build modern software applications.",
      requirements:
        "Basic programming knowledge and willingness to learn.",
      skills: ["HTML", "CSS", "JavaScript", "Git"],
      salary: "R12,000 - R18,000",
      businessEmail: "",
      isBusinessJob: false,
      status: "Active",
    },
    {
      id: "default-2",
      title: "Frontend Developer",
      company: "Digital Labs",
      location: "Cape Town",
      type: "Full-time",
      description:
        "Help create responsive and user-friendly web applications.",
      requirements:
        "Knowledge of HTML, CSS, JavaScript and React.",
      skills: ["HTML", "CSS", "JavaScript", "React"],
      salary: "R15,000 - R22,000",
      businessEmail: "",
      isBusinessJob: false,
      status: "Active",
    },
    {
      id: "default-3",
      title: "Junior Data Analyst",
      company: "DataWorks",
      location: "Johannesburg",
      type: "Full-time",
      description:
        "Analyse business data and create useful reports and insights.",
      requirements:
        "Basic Python, SQL and data analysis knowledge.",
      skills: [
        "Python",
        "SQL",
        "Excel",
        "Data Analysis",
      ],
      salary: "R14,000 - R20,000",
      businessEmail: "",
      isBusinessJob: false,
      status: "Active",
    },
    {
      id: "default-4",
      title: "Junior Game Developer",
      company: "Game Studio",
      location: "Cape Town",
      type: "Internship",
      description:
        "Work with our development team to create games using Unity.",
      requirements:
        "Basic C# and Unity knowledge.",
      skills: [
        "C#",
        "Unity",
        "Git",
        "Programming",
      ],
      salary: "R8,000 - R12,000",
      businessEmail: "",
      isBusinessJob: false,
      status: "Active",
    },
  ];

  const [businessJobs, setBusinessJobs] =
    useState([]);

  const [applications, setApplications] =
    useState([]);

  const [profile, setProfile] =
    useState({});

  const [selectedJob, setSelectedJob] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("All");

  const [filterVisible, setFilterVisible] =
    useState(false);

  /*
  ==========================================
  LOAD BUSINESS JOBS
  ==========================================
  */

  async function loadBusinessJobs() {
    /*
      Backend first — only ADMIN-APPROVED opportunities are
      visible to students (RLS hides pending ones automatically).
    */
    const supabase = getSupabase();

    let backendJobs = [];

    if (supabase) {
      const { data, error } =
        await supabase
          .from("opportunities")
          .select("*")
          .eq("status", "approved")
          .order("created_at", {
            ascending: false,
          });

      if (!error && Array.isArray(data)) {
        backendJobs = data.map(
          (job) => ({
            id: job.id,

            dbId: job.id,

            title:
              job.title ||
              "Untitled Position",

            company:
              job.company ||
              "Company",

            location:
              job.location ||
              "Location not specified",

            type:
              job.employment_type ||
              "Full-time",

            description:
              job.description ||
              "No description provided.",

            requirements:
              job.requirements ||
              "No requirements provided.",

            skills: Array.isArray(
              job.skills
            )
              ? job.skills
              : [],

            salary:
              job.salary ||
              "Salary not specified",

            businessEmail: "",

            createdAt:
              job.created_at ||
              "",

            status: "Active",

            isBusinessJob: true,
          })
        );
      }
    }

    try {
      const savedJobs =
        await AsyncStorage.getItem(
          "careerAI_jobs"
        );

      const parsedJobs =
        JSON.parse(savedJobs) || [];

      if (!Array.isArray(parsedJobs)) {
        setBusinessJobs([]);
        return;
      }

      const formattedBusinessJobs =
        parsedJobs
          .filter(
            (job) =>
              job.status !== "Inactive"
          )
          .map((job) => ({
            id: job.id,

            title:
              job.title ||
              "Untitled Position",

            company:
              job.companyName ||
              job.company ||
              "Company",

            location:
              job.location ||
              "Location not specified",

            type:
              job.type ||
              "Full-time",

            description:
              job.description ||
              "No description provided.",

            requirements:
              job.requirements ||
              "No requirements provided.",

            skills:
              Array.isArray(job.skills)
                ? job.skills
                : [],

            salary:
              job.salary ||
              "Salary not specified",

            businessEmail:
              job.businessEmail ||
              "",

            createdAt:
              job.createdAt ||
              "",

            status:
              job.status ||
              "Active",

            isBusinessJob: true,
          }));

      setBusinessJobs(
        [
          ...backendJobs,

          ...formattedBusinessJobs.filter(
            (job) =>
              !backendJobs.some(
                (backendJob) =>
                  String(
                    backendJob.id
                  ) ===
                  String(job.id)
              )
          ),
        ]
      );
    } catch (error) {
      console.log(
        "Could not load business jobs:",
        error
      );

      setBusinessJobs([]);
    }
  }

  /*
  ==========================================
  LOAD APPLICATIONS
  ==========================================
  */

  async function loadApplications() {
    try {
      const savedApplications =
        await AsyncStorage.getItem(
          applicationKey
        );

      const parsedApplications =
        JSON.parse(
          savedApplications
        ) || [];

      setApplications(
        Array.isArray(
          parsedApplications
        )
          ? parsedApplications
          : []
      );
    } catch {
      setApplications([]);
    }
  }

  /*
  ==========================================
  LOAD PROFILE
  ==========================================
  */

  async function loadProfile() {
    try {
      const savedProfile =
        await AsyncStorage.getItem(
          profileKey
        );

      const parsedProfile =
        JSON.parse(
          savedProfile
        ) || {};

      setProfile(parsedProfile);
    } catch {
      setProfile({});
    }
  }

  /*
  ==========================================
  INITIAL LOAD
  ==========================================
  */

  useEffect(() => {
    loadBusinessJobs();
    loadApplications();
    loadProfile();
  }, [
    applicationKey,
    profileKey,
  ]);

  /*
  ==========================================
  COMBINE JOBS
  ==========================================
  */

  const allJobs = useMemo(() => {
    return [
      ...businessJobs,
      ...defaultJobs,
    ];
  }, [businessJobs]);

  /*
  ==========================================
  CALCULATE MATCH SCORE
  ==========================================
  */

  function calculateMatchScore(job) {
    let score = 60;

    const targetCareer =
      profile?.targetCareer
        ?.toLowerCase()
        .trim() || "";

    const userSkills =
      Array.isArray(profile?.skills)
        ? profile.skills.map(
            (skill) =>
              String(skill)
                .toLowerCase()
                .trim()
          )
        : [];

    const jobTitle =
      String(job.title || "")
        .toLowerCase()
        .trim();

    const jobSkills =
      Array.isArray(job.skills)
        ? job.skills.map(
            (skill) =>
              String(skill)
                .toLowerCase()
                .trim()
          )
        : [];

    /*
      Career title match.
    */

    if (
      targetCareer &&
      (
        jobTitle.includes(
          targetCareer
        ) ||
        targetCareer.includes(
          jobTitle
        )
      )
    ) {
      score += 15;
    }

    /*
      Skill matching.
    */

    let matchedSkills = 0;

    jobSkills.forEach(
      (skill) => {
        if (
          userSkills.includes(
            skill
          ) ||
          userSkills.some(
            (userSkill) =>
              userSkill.includes(
                skill
              ) ||
              skill.includes(
                userSkill
              )
          )
        ) {
          matchedSkills++;
        }
      }
    );

    score += Math.min(
      matchedSkills * 6,
      24
    );

    return Math.min(
      score,
      99
    );
  }

  /*
  ==========================================
  CHECK APPLICATION
  ==========================================
  */

  function hasApplied(jobId) {
    return applications.some(
      (application) =>
        String(
          application.jobId
        ) ===
        String(jobId)
    );
  }

  /*
  ==========================================
  SAVE GLOBAL APPLICATION
  ==========================================
  */

  async function saveGlobalApplication(
    newApplication
  ) {
    try {
      const saved =
        await AsyncStorage.getItem(
          "careerAI_applications"
        );

      const globalApplications =
        JSON.parse(saved) || [];

      const existingIndex =
        globalApplications.findIndex(
          (application) =>
            application.id ===
            newApplication.id
        );

      let updatedApplications;

      if (
        existingIndex !== -1
      ) {
        updatedApplications =
          globalApplications.map(
            (
              application,
              index
            ) =>
              index ===
              existingIndex
                ? {
                    ...application,
                    ...newApplication,
                  }
                : application
          );
      } else {
        updatedApplications = [
          ...globalApplications,
          newApplication,
        ];
      }

      await AsyncStorage.setItem(
        "careerAI_applications",
        JSON.stringify(
          updatedApplications
        )
      );
    } catch (error) {
      console.log(
        "Could not save global application:",
        error
      );
    }
  }

  /*
  ==========================================
  APPLY FOR JOB
  ==========================================
  */

  async function handleApply(job) {
    if (!user?.email) {
      Alert.alert(
        "Login required",
        "Please log in before applying for a job."
      );

      return;
    }

    /*
      Only Job Seekers can apply.
    */

    if (
      user?.role &&
      user.role !== "job-seeker"
    ) {
      Alert.alert(
        "Not allowed",
        "Only Job Seeker accounts can apply for jobs."
      );

      return;
    }

    /*
      Prevent company from applying
      to its own job.
    */

    if (
      job.businessEmail &&
      job.businessEmail
        .trim()
        .toLowerCase() === email
    ) {
      Alert.alert(
        "Not allowed",
        "You cannot apply to your own company's job."
      );

      return;
    }

    /*
      Prevent duplicate application.
    */

    if (
      hasApplied(job.id)
    ) {
      Alert.alert(
        "Already applied",
        "You have already applied for this job."
      );

      return;
    }

    const matchScore =
      calculateMatchScore(job);

    const newApplication = {
      id: `${job.id}-${email}`,

      jobId:
        job.id,

      jobTitle:
        job.title,

      company:
        job.company,

      companyName:
        job.company,

      location:
        job.location,

      type:
        job.type,

      salary:
        job.salary,

      businessEmail:
        job.businessEmail ||
        "",

      seekerEmail:
        email,

      seekerName:
        profile?.name ||
        user?.name ||
        "Job Seeker",

      seekerSkills:
        Array.isArray(
          profile?.skills
        )
          ? profile.skills
          : [],

      matchScore,

      status:
        "Applied",

      appliedAt:
        new Date().toISOString(),
    };

    /*
      Save locally.
    */

    const updatedApplications = [
      ...applications,
      newApplication,
    ];

    setApplications(
      updatedApplications
    );

    try {
      await AsyncStorage.setItem(
        applicationKey,
        JSON.stringify(
          updatedApplications
        )
      );
    } catch (error) {
      console.log(
        "Could not save application:",
        error
      );
    }

    /*
      Persist to Supabase so the business and
      admin dashboards see the application.
      RLS enforces: active student/alumni,
      approved opportunity, no duplicates.
    */
    const supabase =
      getSupabase();

    if (supabase && job.dbId) {
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
              "applications"
            )
            .insert({
              opportunity_id:
                job.dbId,

              applicant_id:
                authUser.id,

              status: "applied",

              match_score:
                Math.round(
                  matchScore
                ),

              cover_note: null,
            });

        if (error) {
          Alert.alert(
            "Backend Warning",
            supabaseErrorMessage(
              error
            )
          );
        }
      }
    }

    /*
      Save globally for
      Business/Admin dashboards.
    */

    await saveGlobalApplication(
      newApplication
    );

    Alert.alert(
      "Application submitted",
      `Your application for ${job.title} has been submitted successfully.`
    );
  }

  /*
  ==========================================
  SEARCH + FILTER
  ==========================================
  */

  const filteredJobs =
    allJobs.filter(
      (job) => {
        const searchText =
          search
            .toLowerCase()
            .trim();

        const matchesSearch =
          !searchText ||
          String(
            job.title || ""
          )
            .toLowerCase()
            .includes(
              searchText
            ) ||
          String(
            job.company || ""
          )
            .toLowerCase()
            .includes(
              searchText
            ) ||
          String(
            job.location || ""
          )
            .toLowerCase()
            .includes(
              searchText
            ) ||
          (
            Array.isArray(
              job.skills
            )
              ? job.skills
              : []
          ).some(
            (skill) =>
              String(skill)
                .toLowerCase()
                .includes(
                  searchText
                )
          );

        const matchesFilter =
          filter === "All" ||
          job.type === filter;

        return (
          matchesSearch &&
          matchesFilter
        );
      }
    );

  /*
  ==========================================
  JOB FILTERS
  ==========================================
  */

  const jobFilters = [
    "All",
    "Full-time",
    "Part-time",
    "Internship",
    "Contract",
  ];

  /*
  ==========================================
  JOB CARD
  ==========================================
  */

  function renderJobCard(job) {
    const matchScore =
      calculateMatchScore(job);

    const applied =
      hasApplied(job.id);

    return (
      <View
        style={styles.jobCard}
        key={job.id}
      >
        <View
          style={
            styles.jobCardHeader
          }
        >
          <View
            style={
              styles.jobTitleContainer
            }
          >
            <Text
              style={styles.jobTitle}
            >
              {job.title}
            </Text>

            <Text
              style={
                styles.jobCompany
              }
            >
              {job.company}
            </Text>
          </View>

          <View
            style={styles.matchBadge}
          >
            <Text
              style={
                styles.matchText
              }
            >
              {matchScore}%
            </Text>

            <Text
              style={
                styles.matchLabel
              }
            >
              Match
            </Text>
          </View>
        </View>

        {job.isBusinessJob && (
          <View
            style={
              styles.businessBadge
            }
          >
            <Text
              style={
                styles.businessBadgeText
              }
            >
              Business Job
            </Text>
          </View>
        )}

        <View
          style={styles.jobDetails}
        >
          <Text
            style={styles.detailText}
          >
              {job.location}
          </Text>

          <Text
            style={styles.detailText}
          >
                        {job.type}
          </Text>

          <Text
            style={styles.detailText}
          >
            💰 {job.salary}
          </Text>
        </View>

        <Text
          style={
            styles.jobDescription
          }
        >
          {job.description}
        </Text>

        <View
          style={styles.skillsContainer}
        >
          {job.skills.map(
            (
              skill,
              index
            ) => (
              <View
                style={
                  styles.skillBadge
                }
                key={`${job.id}-skill-${index}`}
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

        <View
          style={
            styles.cardButtons
          }
        >
          <Pressable
            style={
              styles.secondaryButton
            }
            onPress={() =>
              setSelectedJob(job)
            }
          >
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              View Details
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.primaryButton,
              applied &&
                styles.appliedButton,
            ]}
            onPress={() =>
              handleApply(job)
            }
            disabled={applied}
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              {applied
                ? "Applied"
                : "Apply Now"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /*
  ==========================================
  RENDER
  ==========================================
  */

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* PAGE HEADER */}

        <View
          style={styles.pageHeader}
        >
          <Text
            style={styles.pageTitle}
          >
            Recommended Jobs
          </Text>

          <Text
            style={
              styles.pageDescription
            }
          >
            Find opportunities that match
            your skills and career goals.
          </Text>
        </View>

        {/* SEARCH */}

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search jobs, companies or skills..."
          placeholderTextColor="#8a94a6"
          style={styles.searchInput}
        />

        {/* FILTER */}

        <Pressable
          style={styles.filterButton}
          onPress={() =>
            setFilterVisible(true)
          }
        >
          <Text
            style={
              styles.filterButtonText
            }
          >
            Job Type: {filter}
          </Text>

          <Text
            style={styles.filterArrow}
          >
            ▼
          </Text>
        </Pressable>

        {/* JOB COUNT */}

        <Text
          style={styles.resultsText}
        >
          {filteredJobs.length}{" "}
          {filteredJobs.length === 1
            ? "job"
            : "jobs"}{" "}
          found
        </Text>

        {/* JOBS */}

        {filteredJobs.length ===
        0 ? (
          <View
            style={
              styles.emptyState
            }
          >
            <Text
              style={
                styles.emptyIcon
              }
            >
              🔎
            </Text>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No jobs found
            </Text>

            <Text
              style={
                styles.emptyDescription
              }
            >
              Try changing your search or
              filter.
            </Text>
          </View>
        ) : (
          <View>
            {filteredJobs.map(
              renderJobCard
            )}
          </View>
        )}
      </ScrollView>

      {/* FILTER MODAL */}

      <Modal
        visible={filterVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setFilterVisible(false)
        }
      >
                <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterVisible(false)}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 24,
              margin: 20,
              maxHeight: "80%",
            }}
          >
            <Text style={styles.modalTitle}>Filter Jobs</Text>

            {jobFilters.map(
              (jobFilter) => (
                <Pressable
                  key={jobFilter}
                  style={[
                    styles.filterOption,
                    filter === jobFilter && styles.activeFilterOption,
                  ]}
                  onPress={() => { setFilter(jobFilter); setFilterVisible(false); }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text
                      style={[
                        styles.filterOptionText,
                        filter === jobFilter && styles.activeFilterOptionText,
                      ]}
                    >
                      {jobFilter === "All" ? "All Job Types" : jobFilter}
                    </Text>
                    {filter === jobFilter && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </View>
                </Pressable>
              ))}

            <Pressable
              style={styles.closeModalButton}
              onPress={() => setFilterVisible(false)}
            >
              <Text style={styles.closeModalText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>






      {/* JOB DETAILS MODAL */}

      <Modal
        visible={
          selectedJob !== null
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSelectedJob(null)
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.jobModal
            }
          >
            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
            >
              {/* CLOSE */}

              <Pressable
                style={
                  styles.closeButton
                }
                onPress={() =>
                  setSelectedJob(
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

              {selectedJob && (
                <>
                  {/* HEADER */}

                  <View
                    style={
                      styles.modalJobHeader
                    }
                  >
                    <View
                      style={
                        styles.modalJobTitleContainer
                      }
                    >
                      <Text
                        style={
                          styles.modalJobTitle
                        }
                      >
                        {
                          selectedJob.title
                        }
                      </Text>

                      <Text
                        style={
                          styles.modalCompany
                        }
                      >
                        {
                          selectedJob.company
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.matchBadgeLarge
                      }
                    >
                      <Text
                        style={
                          styles.matchLargeText
                        }
                      >
                        {
                          calculateMatchScore(
                            selectedJob
                          )
                        }
                        %
                      </Text>

                      <Text
                        style={
                          styles.matchLargeLabel
                        }
                      >
                        Match
                      </Text>
                    </View>
                  </View>

                  {/* DETAILS */}

                  <View
                    style={
                      styles.modalDetails
                    }
                  >
                    <Text
                      style={
                        styles.modalDetailText
                      }
                    >
                                            {
                        selectedJob.location
                      }
                    </Text>

                    <Text
                      style={
                        styles.modalDetailText
                      }
                    >
                                            {selectedJob.type}
                    </Text>

                    <Text
                      style={
                        styles.modalDetailText
                      }
                    >
                      💰{" "}
                      {
                        selectedJob.salary
                      }
                    </Text>
                  </View>

                  {selectedJob.isBusinessJob && (
                    <View
                      style={
                        styles.businessBadge
                      }
                    >
                      <Text
                        style={
                          styles.businessBadgeText
                        }
                      >
                        Business Job
                      </Text>
                    </View>
                  )}

                  {/* DESCRIPTION */}

                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Job Description
                  </Text>

                  <Text
                    style={
                      styles.sectionText
                    }
                  >
                    {
                      selectedJob.description
                    }
                  </Text>

                  {/* REQUIREMENTS */}

                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Requirements
                  </Text>

                  <Text
                    style={
                      styles.sectionText
                    }
                  >
                    {
                      selectedJob.requirements
                    }
                  </Text>

                  {/* SKILLS */}

                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Required Skills
                  </Text>

                  <View
                    style={
                      styles.skillsContainer
                    }
                  >
                    {selectedJob.skills.map(
                      (
                        skill,
                        index
                      ) => (
                        <View
                          style={
                            styles.skillBadge
                          }
                          key={`modal-skill-${index}`}
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

                  {/* APPLY */}

                  <Pressable
                    style={[
                      styles.primaryButton,
                      styles.modalApplyButton,
                      hasApplied(
                        selectedJob.id
                      ) &&
                        styles.appliedButton,
                    ]}
                    onPress={async () => {
                      const alreadyApplied =
                        hasApplied(
                          selectedJob.id
                        );

                      await handleApply(
                        selectedJob
                      );

                      if (
                        !alreadyApplied
                      ) {
                        setSelectedJob(
                          null
                        );
                      }
                    }}
                    disabled={hasApplied(
                      selectedJob.id
                    )}
                  >
                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      {hasApplied(
                        selectedJob.id
                      )
                        ? "Already Applied"
                        : "Apply Now"}
                    </Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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

  pageHeader: {
    marginBottom: 20,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 7,
  },

  pageDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: "#687386",
  },

  /*
  ========================================
  SEARCH
  ========================================
  */

  searchInput: {
    height: 52,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d9deea",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#172033",
    marginBottom: 12,
  },

  /*
  ========================================
  FILTER
  ========================================
  */

  filterButton: {
    height: 52,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d9deea",
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  filterButtonText: {
    color: "#344054",
    fontSize: 14,
    fontWeight: "600",
  },

  filterArrow: {
    color: "#687386",
    fontSize: 12,
  },

  resultsText: {
    color: "#687386",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 12,
  },

  /*
  ========================================
  JOB CARD
  ========================================
  */

  jobCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e7f0",
    padding: 18,
    marginBottom: 16,
  },

  jobCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  jobTitleContainer: {
    flex: 1,
    paddingRight: 12,
  },

  jobTitle: {
    color: "#172033",
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 25,
    marginBottom: 5,
  },

  jobCompany: {
    color: "#3156a3",
    fontSize: 14,
    fontWeight: "700",
  },

  matchBadge: {
    backgroundColor: "#e8f7ed",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
    minWidth: 66,
  },

  matchText: {
    color: "#2d8a4a",
    fontSize: 15,
    fontWeight: "800",
  },

  matchLabel: {
    color: "#3f7950",
    fontSize: 9,
    fontWeight: "700",
  },

  /*
  ========================================
  BUSINESS BADGE
  ========================================
  */

  businessBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#eef4ff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },

  businessBadgeText: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "700",
  },

  /*
  ========================================
  JOB DETAILS
  ========================================
  */

  jobDetails: {
    marginBottom: 13,
  },

  detailText: {
    color: "#687386",
    fontSize: 13,
    marginBottom: 7,
  },

  jobDescription: {
    color: "#505b6d",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },

  /*
  ========================================
  SKILLS
  ========================================
  */

  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  skillBadge: {
    backgroundColor: "#f0f3f8",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  skillText: {
    color: "#4a5568",
    fontSize: 11,
    fontWeight: "600",
  },

  /*
  ========================================
  CARD BUTTONS
  ========================================
  */

  cardButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 11,
    backgroundColor: "#3156a3",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },

  appliedButton: {
    opacity: 0.55,
  },

  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#cbd2df",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  secondaryButtonText: {
    color: "#344054",
    fontSize: 13,
    fontWeight: "700",
  },

  /*
  ========================================
  EMPTY STATE
  ========================================
  */

  emptyState: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e7f0",
    padding: 35,
    alignItems: "center",
    marginTop: 10,
  },

  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },

  emptyTitle: {
    color: "#172033",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 7,
  },

  emptyDescription: {
    color: "#687386",
    fontSize: 14,
    textAlign: "center",
  },

  /*
  ========================================
  MODAL
  ========================================
  */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },

  /*
  ========================================
  FILTER MODAL
  ========================================
  */

  filterModal: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
  },

  modalTitle: {
    color: "#172033",
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 15,
  },

  filterOption: {
    minHeight: 50,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  activeFilterOption: {
    backgroundColor: "#eef3ff",
  },

  filterOptionText: {
    color: "#344054",
    fontSize: 14,
    fontWeight: "600",
  },

  activeFilterOptionText: {
    color: "#3156a3",
    fontWeight: "800",
  },

  checkMark: {
    color: "#3156a3",
    fontSize: 18,
    fontWeight: "800",
  },

  closeModalButton: {
    height: 48,
    borderRadius: 11,
    backgroundColor: "#f0f2f6",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  closeModalText: {
    color: "#344054",
    fontSize: 14,
    fontWeight: "700",
  },

  /*
  ========================================
  JOB DETAILS MODAL
  ========================================
  */

  jobModal: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    maxHeight: "88%",
    padding: 20,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f2f6",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    marginBottom: 10,
  },

  closeButtonText: {
    color: "#344054",
    fontSize: 28,
    lineHeight: 30,
  },

  modalJobHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  modalJobTitleContainer: {
    flex: 1,
    paddingRight: 12,
  },

  modalJobTitle: {
    color: "#172033",
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
    marginBottom: 5,
  },

  modalCompany: {
    color: "#3156a3",
    fontSize: 15,
    fontWeight: "700",
  },

  matchBadgeLarge: {
    backgroundColor: "#e8f7ed",
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: "center",
    minWidth: 70,
  },

  matchLargeText: {
    color: "#2d8a4a",
    fontSize: 17,
    fontWeight: "800",
  },

  matchLargeLabel: {
    color: "#3f7950",
    fontSize: 10,
    fontWeight: "700",
  },

  modalDetails: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e7eaf0",
    paddingVertical: 14,
    marginBottom: 18,
  },

  modalDetailText: {
    color: "#687386",
    fontSize: 14,
    marginBottom: 7,
  },

  sectionTitle: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 8,
  },

  sectionText: {
    color: "#505b6d",
    fontSize: 14,
    lineHeight: 22,
  },

  modalApplyButton: {
    marginTop: 24,
    marginBottom: 10,
    flex: 0,
  },
});

export default Jobs;