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
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

import CV from "./CV";
import Jobs from "./Jobs";
import Applications from "./Applications";
import Assessment from "./Assessment";
import Results from "./Results";
import Roadmap from "./Roadmap";
import Interview from "./Interview";
import Network from "./Network";
import Feed from "./Feed";
import Messages from "./Messages";
import { StudentAnalyticsSection } from "./AnalyticsCharts";
import Events from "./Events";
import NotificationBell from "./NotificationBell";
import BrandMark from "./BrandMark";
import TabBar from "./TabBar";
import Tutorial from "./Tutorial";
import { Brand } from "../theme/brand";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getSupabase,
  supabaseErrorMessage,
} from "../lib/supabase";

export default function Dashboard({
  user,
  onLogout,
}) {
  const [activePage, setActivePage] =
    useState("Dashboard");
  const insets = useSafeAreaInsets();

  const email =
    user?.email?.trim().toLowerCase() ||
    "guest";

  const profileKey =
    `careerAI_profile_${email}`;

  const cvKey =
    `careerAI_cv_${email}`;

  const applicationKey =
    `careerAI_applications_${email}`;

  const assessmentKey =
    `careerAI_assessment_${email}`;

  const roadmapKey =
    `careerAI_roadmap_progress_${email}`;

  const interviewKey =
    `careerAI_interview_${email}`;

  const [profile, setProfile] =
    useState({
      name: user?.name || "",
      email: user?.email || "",
      location: "",
      targetCareer: "",
      skills: [],
    });

  const [newSkill, setNewSkill] =
    useState("");

  const [dashboardCategory, setDashboardCategory] =
    useState("All");

  // INTERACTIVE TUTORIAL (brief 2.6) — AI-narrated first-login
  // walkthrough. Shows once per account, then never again.
  const [showTutorial, setShowTutorial] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function checkTutorial() {
      if (!email || email === "guest") return;

      try {
        const done = await AsyncStorage.getItem(
          `careerAI_tutorial_done_${email}`
        );

        if (active && !done) {
          setShowTutorial(true);
        }
      } catch {
        // Flag unreadable — never block the app for this.
      }
    }

    checkTutorial();

    return () => {
      active = false;
    };
  }, [email]);

  const [saved, setSaved] =
    useState(false);

  const [dashboardData, setDashboardData] =
    useState({
      readinessScore: 0,
      jobCount: 4,
      applicationCount: 0,
      skillCount: 0,
      cvUploaded: false,
      assessmentCompleted: false,
      roadmapProgress: 0,
      interviewCompleted: false,
    });

  const menuItems = [
    { name: "Dashboard", id: "Dashboard", icon: "H" },
    { name: "My Profile", id: "My Profile", icon: "P" },
    { name: "My CV", id: "My CV", icon: "CV" },
    { name: "Recommended Jobs", id: "Recommended Jobs", icon: "J" },
    { name: "Applications", id: "Applications", icon: "A" },
    { name: "AI Assessment", id: "AI Assessment", icon: "AI" },
    { name: "Results", id: "Results", icon: "R" },
    { name: "Career Roadmap", id: "Career Roadmap", icon: "↑" },
    { name: "Interview Practice", id: "Interview Practice", icon: "I" },
    { name: "Network", id: "Network", icon: "N" },
    { name: "Feed", id: "Feed", icon: "F" },
    { name: "Messages", id: "Messages", icon: "M" },
    { name: "Events", id: "Events", icon: "E" },
    { name: "Analytics", id: "Analytics", icon: "G" },
  ];

  const careers = [
    "Junior Software Developer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Data Analyst",
    "UI/UX Designer",
    "Cybersecurity Analyst",
    "Game Developer",
  ];

  useEffect(() => {
    loadProfile();
  }, [email]);

  useEffect(() => {
    loadDashboardData();
  }, [activePage, profile, email]);

  // Get the signed-in user's profile row from Supabase.
  async function fetchSupabaseProfile() {
    const supabase = getSupabase();

    if (!supabase) {
      return null;
    }

    const { data: sessionData } =
      await supabase.auth.getUser();

    const authUser = sessionData?.user;

    if (!authUser) {
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      console.error(
        "Could not load the backend profile:",
        error
      );

      return null;
    }

    return data;
  }

  // Map a DB profile row -> the profile shape the UI expects.
  function mapProfileRow(row) {
    return {
      name:
        row.full_name ||
        user?.name ||
        "",

      email:
        row.email ||
        user?.email ||
        "",

      location:
        row.location || "",

      targetCareer:
        (Array.isArray(
          row.career_interests
        ) &&
          row.career_interests[0]) ||
        "",

      skills: Array.isArray(
        row.skills
      )
        ? row.skills
        : [],
    };
  }

  async function loadProfile() {
    // Supabase first — the backend is the source of truth.
    const backendProfile =
      await fetchSupabaseProfile();

    if (backendProfile) {
      const mapped =
        mapProfileRow(
          backendProfile
        );

      setProfile(mapped);

      // Mirror to AsyncStorage (offline cache).
      try {
        await AsyncStorage.setItem(
          profileKey,
          JSON.stringify(mapped)
        );
      } catch {}

      return;
    }

    // AsyncStorage fallback (offline / not configured).
    try {
      const savedProfile =
        await AsyncStorage.getItem(
          profileKey
        );

      if (savedProfile) {
        try {
          const parsedProfile =
            JSON.parse(savedProfile);

          setProfile({
            name:
              parsedProfile.name ||
              user?.name ||
              "",

            email:
              parsedProfile.email ||
              user?.email ||
              "",

            location:
              parsedProfile.location ||
              "",

            targetCareer:
              parsedProfile.targetCareer ||
              "",

            skills:
              Array.isArray(
                parsedProfile.skills
              )
                ? parsedProfile.skills
                : [],
          });

          return;
        } catch {
          await AsyncStorage.removeItem(
            profileKey
          );
        }
      }

      const oldProfile =
        await AsyncStorage.getItem(
          "careerAI_profile"
        );

      if (oldProfile) {
        try {
          const parsedProfile =
            JSON.parse(oldProfile);

          if (
            !parsedProfile.email ||
            parsedProfile.email
              .toLowerCase() === email
          ) {
            const migratedProfile = {
              name:
                parsedProfile.name ||
                user?.name ||
                "",

              email:
                parsedProfile.email ||
                user?.email ||
                "",

              location:
                parsedProfile.location ||
                "",

              targetCareer:
                parsedProfile.targetCareer ||
                "",

              skills:
                Array.isArray(
                  parsedProfile.skills
                )
                  ? parsedProfile.skills
                  : [],
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
          await AsyncStorage.removeItem(
            "careerAI_profile"
          );
        }
      }
    } catch (error) {
      console.error(
        "Could not load profile:",
        error
      );
    }
  }

  async function loadDashboardData() {
    let readinessScore = 0;
    const jobCount = 4;
    let applicationCount = 0;

    const skillCount =
      profile.skills?.length || 0;

    let cvUploaded = false;
    let assessmentCompleted = false;
    let roadmapProgress = 0;
    let interviewCompleted = false;

    /*
     * ============================
     * CV
     * ============================
     */

    try {
      const savedCV =
        await AsyncStorage.getItem(
          cvKey
        );

      if (savedCV) {
        try {
          const cv =
            JSON.parse(savedCV);

          if (cv?.name) {
            cvUploaded = true;
          }
        } catch {
          await AsyncStorage.removeItem(
            cvKey
          );
        }
      } else {
        const oldCV =
          await AsyncStorage.getItem(
            "careerAI_cv"
          );

        if (oldCV) {
          try {
            const cv =
              JSON.parse(oldCV);

            if (
              cv?.name &&
              (
                !cv.email ||
                cv.email.toLowerCase() ===
                  email
              )
            ) {
              cvUploaded = true;

              await AsyncStorage.setItem(
                cvKey,
                JSON.stringify(cv)
              );
            }
          } catch {
            // Ignore old storage errors.
          }
        }
      }
    } catch (error) {
      console.error(
        "Could not load CV status:",
        error
      );
    }

    /*
     * ============================
     * ASSESSMENT
     * ============================
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

          if (
            !assessment.email ||
            assessment.email.toLowerCase() ===
              email
          ) {
            assessmentCompleted =
              true;

            readinessScore =
              Number(
                assessment.score
              ) || 0;
          }
        } catch {
          await AsyncStorage.removeItem(
            assessmentKey
          );
        }
      } else {
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

            if (
              assessment.email?.toLowerCase() ===
              email
            ) {
              assessmentCompleted =
                true;

              readinessScore =
                Number(
                  assessment.score
                ) || 0;

              await AsyncStorage.setItem(
                assessmentKey,
                JSON.stringify(
                  assessment
                )
              );
            }
          } catch {
            // Ignore old storage errors.
          }
        }
      }
    } catch (error) {
      console.error(
        "Could not load assessment:",
        error
      );
    }

    /*
     * ============================
     * APPLICATIONS
     * ============================
     */

    try {
      const savedApplications =
        await AsyncStorage.getItem(
          applicationKey
        );

      if (savedApplications) {
        try {
          const applications =
            JSON.parse(
              savedApplications
            );

          if (
            Array.isArray(
              applications
            )
          ) {
            applicationCount =
              applications.length;
          }
        } catch {
          await AsyncStorage.removeItem(
            applicationKey
          );
        }
      } else {
        const oldApplications =
          await AsyncStorage.getItem(
            "careerAI_applications"
          );

        if (oldApplications) {
          try {
            const allApplications =
              JSON.parse(
                oldApplications
              );

            if (
              Array.isArray(
                allApplications
              )
            ) {
              const userApplications =
                allApplications.filter(
                  (application) =>
                    (
                      application.email ||
                      application.seekerEmail ||
                      ""
                    )
                      .toLowerCase() ===
                    email
                );

              applicationCount =
                userApplications.length;

              if (
                userApplications.length >
                0
              ) {
                await AsyncStorage.setItem(
                  applicationKey,
                  JSON.stringify(
                    userApplications
                  )
                );
              }
            }
          } catch {
            // Ignore old storage errors.
          }
        }
      }
    } catch (error) {
      console.error(
        "Could not load applications:",
        error
      );
    }

    /*
     * ============================
     * ROADMAP
     * ============================
     */

    try {
      const savedRoadmap =
        await AsyncStorage.getItem(
          roadmapKey
        );

      if (savedRoadmap) {
        try {
          const completedTasks =
            JSON.parse(
              savedRoadmap
            );

          if (
            Array.isArray(
              completedTasks
            )
          ) {
            const totalTasks = 16;

            roadmapProgress =
              Math.round(
                (completedTasks.length /
                  totalTasks) *
                  100
              );

            roadmapProgress =
              Math.min(
                roadmapProgress,
                100
              );
          }
        } catch {
          await AsyncStorage.removeItem(
            roadmapKey
          );
        }
      } else {
        const oldRoadmap =
          await AsyncStorage.getItem(
            "careerAI_roadmap_progress"
          );

        if (oldRoadmap) {
          try {
            const completedTasks =
              JSON.parse(
                oldRoadmap
              );

            if (
              Array.isArray(
                completedTasks
              )
            ) {
              roadmapProgress =
                Math.min(
                  Math.round(
                    (completedTasks.length /
                      16) *
                      100
                  ),
                  100
                );

              await AsyncStorage.setItem(
                roadmapKey,
                JSON.stringify(
                  completedTasks
                )
              );
            }
          } catch {
            // Ignore old storage errors.
          }
        }
      }
    } catch (error) {
      console.error(
        "Could not load roadmap:",
        error
      );
    }

    /*
     * ============================
     * INTERVIEW
     * ============================
     */

    try {
      const savedInterview =
        await AsyncStorage.getItem(
          interviewKey
        );

      if (savedInterview) {
        try {
          const interview =
            JSON.parse(
              savedInterview
            );

          if (
            !interview.email ||
            interview.email.toLowerCase() ===
              email
          ) {
            interviewCompleted =
              Boolean(
                interview.completedAt
              );
          }
        } catch {
          await AsyncStorage.removeItem(
            interviewKey
          );
        }
      } else {
        const oldInterview =
          await AsyncStorage.getItem(
            "careerAI_interview"
          );

        if (oldInterview) {
          try {
            const interview =
              JSON.parse(
                oldInterview
              );

            if (
              interview.email?.toLowerCase() ===
              email
            ) {
              interviewCompleted =
                Boolean(
                  interview.completedAt
                );

              await AsyncStorage.setItem(
                interviewKey,
                JSON.stringify(
                  interview
                )
              );
            }
          } catch {
            // Ignore old storage errors.
          }
        }
      }
    } catch (error) {
      console.error(
        "Could not load interview:",
        error
      );
    }

    /*
     * ============================
     * BASIC READINESS SCORE
     * ============================
     */

    if (!assessmentCompleted) {
      let score = 0;

      if (profile.name?.trim()) {
        score += 10;
      }

      if (profile.email?.trim()) {
        score += 10;
      }

      if (profile.location?.trim()) {
        score += 10;
      }

      if (profile.targetCareer) {
        score += 20;
      }

      if (skillCount >= 1) {
        score += 10;
      }

      if (skillCount >= 3) {
        score += 10;
      }

      if (skillCount >= 5) {
        score += 10;
      }

      if (cvUploaded) {
        score += 10;
      }

      if (interviewCompleted) {
        score += 10;
      }

      readinessScore =
        Math.min(score, 99);
    }

    setDashboardData({
      readinessScore,
      jobCount,
      applicationCount,
      skillCount,
      cvUploaded,
      assessmentCompleted,
      roadmapProgress,
      interviewCompleted,
    });
  }

  function updateProfile(
    field,
    value
  ) {
    setProfile(
      (current) => ({
        ...current,
        [field]: value,
      })
    );

    setSaved(false);
  }

  function addSkill() {
    const skill =
      newSkill.trim();

    if (!skill) {
      return;
    }

    const alreadyExists =
      profile.skills.some(
        (item) =>
          item.toLowerCase() ===
          skill.toLowerCase()
      );

    if (alreadyExists) {
      setNewSkill("");
      return;
    }

    setProfile(
      (current) => ({
        ...current,
        skills: [
          ...current.skills,
          skill,
        ],
      })
    );

    setNewSkill("");
    setSaved(false);
  }

  function removeSkill(
    skillToRemove
  ) {
    setProfile(
      (current) => ({
        ...current,
        skills:
          current.skills.filter(
            (skill) =>
              skill !==
              skillToRemove
          ),
      })
    );

    setSaved(false);
  }

  async function saveProfile() {
    const cleanedProfile = {
      ...profile,

      name:
        profile.name.trim(),

      /*
       * Email always comes from
       * the logged-in account.
       */
      email:
        user?.email ||
        profile.email,

      location:
        profile.location.trim(),

      targetCareer:
        profile.targetCareer,

      skills:
        profile.skills,
    };

    // Save to Supabase first — backend is the source of truth.
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
        const {
          error,
        } =
          await supabase
            .from(
              "profiles"
            )
            .update({
              full_name:
                cleanedProfile.name,

              location:
                cleanedProfile.location,

              skills:
                cleanedProfile.skills,

              career_interests:
                cleanedProfile.targetCareer
                  ? [
                      cleanedProfile.targetCareer,
                    ]
                  : [],

              onboarding_completed:
                true,
            })
            .eq(
              "id",
              authUser.id
            );

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

    // Mirror to AsyncStorage (offline cache / fallback).
    try {
      await AsyncStorage.setItem(
        profileKey,
        JSON.stringify(
          cleanedProfile
        )
      );

      /*
       * Update active session name.
       */
      const updatedUser = {
        ...user,
        name:
          cleanedProfile.name,
        email:
          user?.email,
      };

      await AsyncStorage.setItem(
        "careerAI_user",
        JSON.stringify(
          updatedUser
        )
      );

      /*
       * Keep old storage for
       * compatibility.
       */
      await AsyncStorage.setItem(
        "careerAI_profile",
        JSON.stringify(
          cleanedProfile
        )
      );

      setProfile(
        cleanedProfile
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error(
        "Could not save profile:",
        error
      );

      Alert.alert(
        "Error",
        "Could not save your profile."
      );
    }
  }

  function chooseCareer() {
    Alert.alert(
      "Target Career",
      "Choose your target career",
      [
        ...careers.map(
          (career) => ({
            text: career,
            onPress: () =>
              updateProfile(
                "targetCareer",
                career
              ),
          })
        ),
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  }

  function calculateCompletion() {
    let completed = 0;

    if (profile.name.trim()) {
      completed++;
    }

    if (profile.email.trim()) {
      completed++;
    }

    if (profile.location.trim()) {
      completed++;
    }

    if (profile.targetCareer) {
      completed++;
    }

    if (profile.skills.length > 0) {
      completed++;
    }

    return completed * 20;
  }

  function renderDashboard() {
    const { readinessScore, assessmentCompleted } =
      dashboardData;

    const firstName = profile.name
      ? profile.name.split(" ")[0]
      : "there";

    const ue = StyleSheet.create({
      pad: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
      greetRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
      greet: { fontSize: 24, fontWeight: "800", color: Brand.ink },
      greetSub: { color: Brand.inkSecondary, fontSize: 13, marginTop: 2 },
      avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Brand.primarySoft, alignItems: "center", justifyContent: "center", marginLeft: 12 },
      avatarText: { color: Brand.primary, fontSize: 18, fontWeight: "800" },
      search: { flexDirection: "row", alignItems: "center", backgroundColor: Brand.surface, borderRadius: 14, borderWidth: 1, borderColor: Brand.line, paddingHorizontal: 14, height: 50, marginBottom: 14 },
      searchIcon: { fontSize: 15, color: Brand.inkSecondary },
      searchText: { flex: 1, color: Brand.muted, fontSize: 15, marginLeft: 10 },
      pillsRow: { flexDirection: "row", paddingRight: 16 },
      pill: { paddingHorizontal: 16, height: 36, borderRadius: 18, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.line, alignItems: "center", justifyContent: "center", marginRight: 8 },
      pillActive: { backgroundColor: Brand.primary, borderColor: Brand.primary },
      pillText: { color: Brand.inkSecondary, fontSize: 13, fontWeight: "600" },
      pillTextActive: { color: "#FFFFFF" },
      sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, marginTop: 4 },
      sectionTitle: { fontSize: 18, fontWeight: "800", color: Brand.ink },
      seeAll: { color: Brand.primary, fontSize: 13, fontWeight: "700" },
      readyCard: { backgroundColor: Brand.primary, borderRadius: 16, padding: 16, marginBottom: 20 },
      readyTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
      readySub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4 },
      readyBarBg: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden", marginTop: 12 },
      readyBarFill: { height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" },
      readyBtn: { marginTop: 14, backgroundColor: "#FFFFFF", borderRadius: 12, height: 40, alignItems: "center", justifyContent: "center" },
      readyBtnText: { color: Brand.primary, fontWeight: "800", fontSize: 13 },
      jobCard: { backgroundColor: Brand.surface, borderRadius: 16, borderWidth: 1, borderColor: Brand.line, padding: 14, marginBottom: 12 },
      jobTop: { flexDirection: "row", alignItems: "center" },
      jobLogo: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
      jobLogoText: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
      jobTitle: { fontSize: 15, fontWeight: "700", color: Brand.ink },
      jobCompany: { fontSize: 12, color: Brand.inkSecondary, marginTop: 2 },
      jobMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: 10 },
      tag: { paddingHorizontal: 10, height: 24, borderRadius: 12, backgroundColor: Brand.calmBg, alignItems: "center", justifyContent: "center", marginRight: 6, marginBottom: 4 },
      tagText: { color: Brand.inkSecondary, fontSize: 11, fontWeight: "600" },
      matchWrap: { marginTop: 12 },
      matchLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
      matchLabel: { fontSize: 11, fontWeight: "700", color: Brand.primary, letterSpacing: 0.4 },
      matchPct: { fontSize: 11, fontWeight: "700", color: Brand.inkSecondary },
      barBg: { height: 6, borderRadius: 3, backgroundColor: Brand.disabled, overflow: "hidden" },
      barFill: { height: 6, borderRadius: 3, backgroundColor: Brand.primary },
      tilesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
      tile: { width: "23%", backgroundColor: Brand.surface, borderRadius: 14, borderWidth: 1, borderColor: Brand.line, paddingVertical: 14, alignItems: "center" },
      tileIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Brand.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 8 },
      tileIconText: { color: Brand.primary, fontWeight: "800", fontSize: 13 },
      tileLabel: { color: Brand.inkSecondary, fontSize: 11, fontWeight: "600", textAlign: "center" },
      emptyCard: { backgroundColor: Brand.surface, borderRadius: 16, borderWidth: 1, borderColor: Brand.line, padding: 16 },
      emptyText: { color: Brand.inkSecondary, fontSize: 13 },
    });

    const categories = ["All", "Tech", "Data", "Design", "Business", "Remote"];

    const recommendedJobs = [
      { id: 1, title: "Junior Frontend Developer", company: "Brightstack Labs", location: "Cape Town · Hybrid", salary: "R18k–R22k/mo", type: "Full-time", tags: ["Tech"], match: 92, accent: Brand.grad },
      { id: 2, title: "Data Analyst (Graduate)", company: "Northfield Analytics", location: "Remote", salary: "R20k–R25k/mo", type: "Full-time", tags: ["Data", "Remote"], match: 87, accent: Brand.data },
      { id: 3, title: "UI/UX Design Intern", company: "PixelForge Studio", location: "Johannesburg · On-site", salary: "R9k–R12k/mo", type: "Internship", tags: ["Design"], match: 81, accent: Brand.creative },
      { id: 4, title: "Business Development Associate", company: "Harbour & Co", location: "Durban · On-site", salary: "R15k–R18k/mo", type: "Full-time", tags: ["Business"], match: 76, accent: Brand.business },
    ];

    const filteredJobs = recommendedJobs.filter(
      (job) =>
        dashboardCategory === "All" ||
        job.tags.indexOf(dashboardCategory) !== -1
    );

    return (
      <View>
        <View style={ue.pad}>
          <View style={ue.greetRow}>
            <View style={{ flex: 1 }}>
              <Text style={ue.greet}>Hi {firstName}</Text>
              <Text style={ue.greetSub}>Let's find your next step.</Text>
            </View>
            <NotificationBell />
            <View style={ue.avatar}>
              <Text style={ue.avatarText}>
                {profile.name ? profile.name.charAt(0).toUpperCase() : "?"}
              </Text>
            </View>
          </View>

          <Pressable style={ue.search}>
            <Text style={ue.searchIcon}>🔍</Text>
            <Text style={ue.searchText}>Search jobs, skills, companies…</Text>
          </Pressable>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={ue.pillsRow}
            keyboardShouldPersistTaps="handled"
          >
            {categories.map((cat) => (
              <Pressable
                key={cat}
                style={[ue.pill, dashboardCategory === cat && ue.pillActive]}
                onPress={() => setDashboardCategory(cat)}
              >
                <Text
                  style={[
                    ue.pillText,
                    dashboardCategory === cat && ue.pillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <View style={ue.readyCard}>
            <Text style={ue.readyTitle}>
              Job readiness: {readinessScore}%
            </Text>
            <Text style={ue.readySub}>
              {assessmentCompleted
                ? "Based on your latest AI assessment."
                : "Complete your profile and AI assessment to unlock your score."}
            </Text>
            <View style={ue.readyBarBg}>
              <View
                style={[
                  ue.readyBarFill,
                  { width: `${Math.min(readinessScore, 100)}%` },
                ]}
              />
            </View>
            <Pressable
              style={ue.readyBtn}
              onPress={() =>
                setActivePage(
                  assessmentCompleted ? "Results" : "AI Assessment"
                )
              }
            >
              <Text style={ue.readyBtnText}>
                {assessmentCompleted ? "View results" : "Take the assessment"}
              </Text>
            </Pressable>
          </View>

          <View style={ue.sectionRow}>
            <Text style={ue.sectionTitle}>Recommended for you</Text>
            <Pressable onPress={() => setActivePage("Recommended Jobs")}>
              <Text style={ue.seeAll}>See all</Text>
            </Pressable>
          </View>

          {filteredJobs.length === 0 && (
            <View style={ue.emptyCard}>
              <Text style={ue.emptyText}>
                No jobs in this category yet — try another filter.
              </Text>
            </View>
          )}

          {filteredJobs.map((job) => (
            <Pressable
              key={job.id}
              style={ue.jobCard}
              onPress={() => setActivePage("Recommended Jobs")}
            >
              <View style={ue.jobTop}>
                <View style={[ue.jobLogo, { backgroundColor: job.accent }]}>
                  <Text style={ue.jobLogoText}>
                    {job.company.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ue.jobTitle}>{job.title}</Text>
                  <Text style={ue.jobCompany}>
                    {job.company} · {job.location}
                  </Text>
                </View>
              </View>
              <View style={ue.jobMeta}>
                <View style={ue.tag}>
                  <Text style={ue.tagText}>{job.type}</Text>
                </View>
                <View style={ue.tag}>
                  <Text style={ue.tagText}>{job.salary}</Text>
                </View>
              </View>
              <View style={ue.matchWrap}>
                <View style={ue.matchLabelRow}>
                  <Text style={ue.matchLabel}>AI MATCH</Text>
                  <Text style={ue.matchPct}>{job.match}%</Text>
                </View>
                <View style={ue.barBg}>
                  <View style={[ue.barFill, { width: `${job.match}%` }]} />
                </View>
              </View>
            </Pressable>
          ))}

          <View style={ue.sectionRow}>
            <Text style={ue.sectionTitle}>Quick actions</Text>
          </View>

          <View style={ue.tilesRow}>
            {[
              { label: "My CV", icon: "CV", page: "My CV" },
              { label: "Applications", icon: "A", page: "Applications" },
              { label: "Roadmap", icon: "↑", page: "Career Roadmap" },
              { label: "Interview", icon: "I", page: "Interview Practice" },
            ].map((t) => (
              <Pressable
                key={t.page}
                style={ue.tile}
                onPress={() => setActivePage(t.page)}
              >
                <View style={ue.tileIcon}>
                  <Text style={ue.tileIconText}>{t.icon}</Text>
                </View>
                <Text style={ue.tileLabel}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  }


  function renderProfile() {
    const completion =
      calculateCompletion();

    return (
      <View>
        <View style={styles.pageHeading}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              Career Profile
            </Text>
          </View>

          <Text style={styles.pageTitle}>
            My Profile
          </Text>

          <Text style={styles.pageSubtitle}>
            Tell Career Next Step about
            yourself so we can provide better
            career recommendations.
          </Text>
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.cardTitle}>
            Personal Information
          </Text>

          <Text style={styles.cardDescription}>
            Keep your information up to date.
          </Text>

          <Text style={styles.label}>
            Full name
          </Text>

          <TextInput
            style={styles.input}
            value={profile.name}
            onChangeText={(value) =>
              updateProfile(
                "name",
                value
              )
            }
            placeholder="Your full name"
            placeholderTextColor="#8a94a6"
          />

          <Text style={styles.label}>
            Email address
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.readonlyInput,
            ]}
            value={profile.email}
            editable={false}
            placeholderTextColor="#8a94a6"
          />

          <Text style={styles.label}>
            Location
          </Text>

          <TextInput
            style={styles.input}
            value={profile.location}
            onChangeText={(value) =>
              updateProfile(
                "location",
                value
              )
            }
            placeholder="e.g. Cape Town"
            placeholderTextColor="#8a94a6"
          />

          <Text style={styles.label}>
            Target career
          </Text>

          <Pressable
            style={styles.selectButton}
            onPress={chooseCareer}
          >
            <Text
              style={[
                styles.selectText,
                !profile.targetCareer &&
                  styles.selectPlaceholder,
              ]}
            >
              {profile.targetCareer ||
                "Select a career"}
            </Text>

            <Text style={styles.arrow}>
              ▼
            </Text>
          </Pressable>

          <View style={styles.divider} />

          <Text style={styles.skillsTitle}>
            Your Skills
          </Text>

          <Text style={styles.skillsDescription}>
            Add skills that you currently
            have. Career Next Step will use
            these when analysing your job
            readiness.
          </Text>

          <View style={styles.skillInputRow}>
            <TextInput
              style={[
                styles.input,
                styles.skillInput,
              ]}
              value={newSkill}
              onChangeText={setNewSkill}
              placeholder="e.g. JavaScript"
              placeholderTextColor="#8a94a6"
              onSubmitEditing={addSkill}
              returnKeyType="done"
            />

            <Pressable
              style={styles.addSkillButton}
              onPress={addSkill}
            >
              <Text
                style={
                  styles.addSkillButtonText
                }
              >
                + Add
              </Text>
            </Pressable>
          </View>

          <View style={styles.skillsList}>
            {profile.skills.length === 0 ? (
              <Text style={styles.noSkills}>
                No skills added yet.
              </Text>
            ) : (
              profile.skills.map(
                (skill) => (
                  <View
                    style={styles.skillTag}
                    key={skill}
                  >
                    <Text
                      style={
                        styles.skillTagText
                      }
                    >
                      {skill}
                    </Text>

                    <Pressable
                      onPress={() =>
                        removeSkill(
                          skill
                        )
                      }
                    >
                      <Text
                        style={
                          styles.removeSkill
                        }
                      >
                        ×
                      </Text>
                    </Pressable>
                  </View>
                )
              )
            )}
          </View>

          <View style={styles.profileActions}>
            {saved && (
              <Text style={styles.savedMessage}>
                 Profile saved
              </Text>
            )}

            <Pressable
              style={styles.primaryButton}
              onPress={saveProfile}
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Save Profile
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.profileSideCard}>
          <View style={styles.largeAvatar}>
            <Text style={styles.largeAvatarText}>
              {profile.name
                ? profile.name
                    .charAt(0)
                    .toUpperCase()
                : "?"}
            </Text>
          </View>

          <Text style={styles.profileName}>
            {profile.name ||
              "Your Name"}
          </Text>

          <Text style={styles.profileEmail}>
            {profile.email ||
              "you@example.com"}
          </Text>

          <View style={styles.completionRow}>
            <Text style={styles.completionLabel}>
              Profile completion
            </Text>

            <Text style={styles.completionValue}>
              {completion}%
            </Text>
          </View>

          <View style={styles.completionBackground}>
            <View
              style={[
                styles.completionBar,
                {
                  width: `${completion}%`,
                },
              ]}
            />
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>
              💡 Career Next Step Tip
            </Text>

            <Text style={styles.tipText}>
              Complete your profile and add
              your skills so Career Next Step
              can provide more accurate job
              matches.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  function renderPlaceholder() {
    const currentItem =
      menuItems.find(
        (item) =>
          item.name === activePage
      );

    return (
      <View style={styles.placeholderSection}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            Career Next Step
          </Text>
        </View>

        <Text style={styles.pageTitle}>
          {activePage}
        </Text>

        <Text style={styles.pageSubtitle}>
          This section is ready.
        </Text>

        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderIcon}>
            {currentItem?.icon}
          </Text>

          <Text style={styles.cardTitle}>
            {activePage}
          </Text>

          <Text style={styles.placeholderText}>
            Your{" "}
            {activePage.toLowerCase()}{" "}
            tools will appear here.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              setActivePage(
                "Dashboard"
              )
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Back to Dashboard
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderCurrentPage() {
    if (activePage === "Dashboard") {
      return renderDashboard();
    }

    if (activePage === "My Profile") {
      return renderProfile();
    }

    if (activePage === "My CV") {
      return <CV user={user} />;
    }

    if (
      activePage ===
      "Recommended Jobs"
    ) {
      return <Jobs user={user} />;
    }

    if (activePage === "Applications") {
      return (
        <Applications user={user} />
      );
    }

    if (
      activePage ===
      "AI Assessment"
    ) {
      return (
        <Assessment user={user} />
      );
    }

    if (activePage === "Results") {
      return <Results user={user} />;
    }

    if (
      activePage ===
      "Career Roadmap"
    ) {
      return <Roadmap user={user} />;
    }

    if (
      activePage ===
      "Interview Practice"
    ) {
      return (
        <Interview user={user} />
      );
    }

    if (activePage === "Network") {
      return <Network />;
    }

    if (activePage === "Feed") {
      return <Feed />;
    }

    if (activePage === "Messages") {
      return <Messages />;
    }

    if (activePage === "Events") {
      return <Events isAdmin={false} />;
    }

    if (activePage === "Analytics") {
      return <StudentAnalyticsSection />;
    }

    return renderPlaceholder();
  }

  return (
    <View style={styles.app}>
      {/* TOP HEADER */}

      <View style={[styles.topbar, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <View style={styles.topbarRow}>
          <View style={styles.logoArea}>
            <BrandMark size={38} />

            <View>
              <Text style={styles.logoName} numberOfLines={1}>
                Career Next Step
              </Text>

              <Text style={styles.logoTagline} numberOfLines={1}>
                From graduate to hire
              </Text>
            </View>
          </View>

          <View style={styles.userArea}>
            <Pressable style={styles.userChip}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile.name
                    ? profile.name
                        .charAt(0)
                        .toUpperCase()
                    : "?"}
                </Text>
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {profile.name ||
                    "Job Seeker"}
                </Text>

                <Text style={styles.userEmail} numberOfLines={1}>
                  {profile.email ||
                    "No email"}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>

      {/* MOBILE NAVIGATION */}

      <View style={styles.navWrap}>
        <View style={styles.navContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.navContent
            }
          >
            {menuItems.map(
              (item) => {
                const isActive =
                  activePage === item.name;

                return (
                  <Pressable
                    key={item.name}
                    onPress={() =>
                      setActivePage(
                        item.name
                      )
                    }
                  >
                    {isActive ? (
                      <LinearGradient
                        colors={Brand.gradientPurpleBright}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.navButtonActive}
                      >
                        <Text style={styles.navIconActive}>
                          {item.icon}
                        </Text>

                        <Text style={styles.navTextActive}>
                          {item.name}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.navButton}>
                        <Text style={styles.navIcon}>
                          {item.icon}
                        </Text>

                        <Text style={styles.navText}>
                          {item.name}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              }
            )}

            <Pressable
              style={styles.logoutButton}
              onPress={onLogout}
            >
              <Text style={styles.logoutIcon}>
                ⇥
              </Text>

              <Text style={styles.logoutText}>
                Logout
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>

      {/* PAGE */}

      <ScrollView
        style={styles.mainArea}
        contentContainerStyle={[
          styles.mainContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 86 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {renderCurrentPage()}
      </ScrollView>

      {/* FIRST-LOGIN TUTORIAL (brief 2.6) */}

      {showTutorial && (
        <Tutorial
          user={profile}
          onFinish={() => setShowTutorial(false)}
        />
      )}

      {/* Bottom tab bar — Meetup-style anchors */}
      <TabBar currentPage={activePage} onSelectPage={setActivePage} />
    </View>
  );
}

function DashboardCard({
  label,
  value,
  description,
  progress,
  buttonText,
  onPress,
  featured,
  icon = "•",
}) {
  if (featured) {
    return (
      <LinearGradient
        colors={Brand.gradientPurpleBright}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featuredDashboardCard}
      >
        <View style={styles.featuredGlow} />

        <View style={styles.dashboardLabelRow}>
          <Text style={styles.dashboardLabelWhite}>
            {label}
          </Text>

          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>AI</Text>
          </View>
        </View>

        <Text style={styles.dashboardValueWhite}>
          {value}
        </Text>

        {progress !== undefined && (
          <View style={styles.progressBackgroundWhite}>
            <View
              style={[
                styles.progressBarWhite,
                { width: `${progress}%` },
              ]}
            />
          </View>
        )}

        <Text style={styles.dashboardDescriptionWhite}>
          {description}
        </Text>

        <Pressable
          style={styles.cardButtonGhost}
          onPress={onPress}
        >
          <Text style={styles.cardButtonGhostText}>
            {buttonText} → 
          </Text>
        </Pressable>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.dashboardCard}>
      <View style={styles.dashboardLabelRow}>
        <View style={styles.dashboardIcon}>
          <Text style={styles.dashboardIconText}>{icon}</Text>
        </View>

        <Text style={styles.dashboardLabel}>
          {label}
        </Text>
      </View>

      <Text style={styles.dashboardValue}>
        {value}
      </Text>

      {progress !== undefined && (
        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressBar,
              { width: `${progress}%` },
            ]}
          />
        </View>
      )}

      <Text style={styles.dashboardDescription}>
        {description}
      </Text>

      <Pressable
        style={styles.cardButton}
        onPress={onPress}
      >
        <Text style={styles.cardButtonText}>
          {buttonText} → 
        </Text>
      </Pressable>
    </View>
  );
}

function Recommendation({
  number,
  title,
  description,
  onPress,
  done = false,
}) {
  return (
    <Pressable
      style={styles.recommendation}
      onPress={onPress}
    >
      {done ? (
        <View style={styles.recommendationCheck}>
          <Text style={styles.recommendationCheckText}>
            ✓
          </Text>
        </View>
      ) : (
        <View style={styles.recommendationNumber}>
          <Text
            style={[
              styles.recommendationNumberText,
              { fontSize: 10 },
            ]}
          >
            {number}
          </Text>
        </View>
      )}

      <View style={styles.recommendationContent}>
        <Text
          style={[
            styles.recommendationTitle,
            done && styles.recommendationTitleDone,
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.recommendationDescription,
            done && styles.recommendationTextDone,
          ]}
        >
          {description}
        </Text>
      </View>

      {!done && (
        <Text style={styles.recommendationArrow}>
          →
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: Brand.bg,
  },

  topbar: {
    backgroundColor: Brand.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Brand.line,
    ...Brand.shadow.subtle,
  },

  topbarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

    logoArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },

  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Brand.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  logoText: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "900",
  },

  logoName: {
    color: Brand.ink,
    fontSize: 16,
    fontWeight: "900",
  },

  logoTagline: {
    color: Brand.muted,
    fontSize: 10,
    marginTop: 2,
  },

  userArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  userChip: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    maxWidth: 128,
    paddingLeft: 2,
    paddingRight: 9,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: Brand.bg,
  },

  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Brand.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  avatarText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },

  userInfo: {
    flexShrink: 1,
  },

  userName: {
    color: Brand.ink,
    fontSize: 10,
    fontWeight: "800",
  },

  userEmail: {
    color: Brand.muted,
    fontSize: 9,
    marginTop: 1,
  },

  navWrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: Brand.bg,
  },

  navContainer: {
    backgroundColor: Brand.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.line,
    ...Brand.shadow.subtle,
    overflow: "hidden",
  },

  navContent: {
    paddingHorizontal: 6,
    paddingVertical: 7,
  },

  navButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 38,
    paddingHorizontal: 11,
    borderRadius: 999,
    marginRight: 5,
  },

  navButtonActive: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 999,
    marginRight: 5,
    ...Brand.shadow.subtle,
  },

  navIcon: {
    fontSize: 10,
    fontWeight: "900",
    color: Brand.primaryDark,
    width: 24,
    height: 22,
    borderRadius: 8,
    textAlign: "center",
    lineHeight: 22,
    backgroundColor: Brand.primaryMist,
    marginRight: 6,
    overflow: "hidden",
  },

  navIconActive: {
    fontSize: 10,
    fontWeight: "900",
    color: "#ffffff",
    width: 24,
    height: 22,
    borderRadius: 8,
    textAlign: "center",
    lineHeight: 22,
    backgroundColor: "rgba(255,255,255,0.24)",
    marginRight: 6,
    overflow: "hidden",
  },

  navText: {
    color: Brand.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  navTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 38,
    paddingHorizontal: 13,
    marginLeft: 5,
    borderRadius: 999,
    backgroundColor: Brand.dangerSoft,
  },

  logoutIcon: {
    color: Brand.danger,
    fontSize: 16,
    marginRight: 5,
  },

  logoutText: {
    color: Brand.danger,
    fontSize: 11,
    fontWeight: "800",
  },

  mainArea: {
    flex: 1,
  },

  mainContent: {
    padding: 16,
    paddingBottom: 84,
  },

  pageHeading: {
    marginBottom: 20,
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: Brand.primaryMist,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginBottom: 10,
  },

  badgeText: {
    color: Brand.primaryDark,
    fontSize: 10,
    fontWeight: "800",
  },

  pageTitle: {
    color: Brand.ink,
    fontSize: 28,
    fontWeight: "900",
  },

  pageSubtitle: {
    color: Brand.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },

  dashboardGrid: {
    gap: 14,
  },

  dashboardCard: {
    backgroundColor: Brand.surfaceRaised,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Brand.line,
    ...Brand.shadow.card,
  },

  featuredDashboardCard: {
    backgroundColor: Brand.primary,
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
    ...Brand.shadow.lift,
  },

  featuredGlow: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 251, 244, 0.12)",
  },

  dashboardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  dashboardIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: Brand.primaryMist,
    alignItems: "center",
    justifyContent: "center",
  },

  dashboardIconText: {
    color: Brand.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },

  dashboardLabel: {
    color: Brand.muted,
    fontSize: 12,
    fontWeight: "700",
  },

  dashboardLabelWhite: {
    color: "rgba(255, 251, 244, 0.92)",
    fontSize: 12,
    fontWeight: "700",
  },

  featuredBadge: {
    backgroundColor: Brand.surface,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },

  featuredBadgeText: {
    color: Brand.ink,
    fontSize: 10,
    fontWeight: "900",
  },

  dashboardValue: {
    color: Brand.ink,
    fontSize: 31,
    fontWeight: "900",
    marginTop: 8,
  },

  dashboardValueWhite: {
    color: Brand.surface,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
  },

  dashboardDescription: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
  },

  dashboardDescriptionWhite: {
    color: "rgba(255, 251, 244, 0.85)",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
  },

  progressBackground: {
    height: 8,
    width: "100%",
    backgroundColor: Brand.bgDeep,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 12,
  },

  progressBar: {
    height: "100%",
    backgroundColor: Brand.primary,
    borderRadius: 10,
  },

  progressBackgroundWhite: {
    height: 8,
    width: "100%",
    backgroundColor: "rgba(255, 251, 244, 0.18)",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 12,
  },

  progressBarWhite: {
    height: "100%",
    backgroundColor: Brand.primary,
    borderRadius: 10,
  },

  cardButton: {
    backgroundColor: Brand.primary,
    borderRadius: 999,
    minHeight: 43,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    paddingHorizontal: 15,
    ...Brand.shadow.subtle,
  },

  cardButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },

  cardButtonGhost: {
    backgroundColor: Brand.surface,
    borderRadius: 999,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    paddingHorizontal: 15,
  },

  cardButtonGhostText: {
    color: Brand.primaryDark,
    fontSize: 12,
    fontWeight: "900",
  },

  dashboardSection: {
    backgroundColor: Brand.surface,
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Brand.line,
    ...Brand.shadow.subtle,
  },

  sectionTitle: {
    color: Brand.ink,
    fontSize: 19,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: Brand.muted,
    fontSize: 12,
    marginTop: 5,
    marginBottom: 15,
  },

  recommendation: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: Brand.line,
  },

  recommendationNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.primaryMist,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  recommendationNumberText: {
    color: Brand.primaryDark,
    fontSize: 10,
    fontWeight: "900",
  },

  recommendationCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  recommendationCheckText: {
    color: Brand.success,
    fontSize: 16,
    fontWeight: "900",
  },

  recommendationContent: {
    flex: 1,
  },

  recommendationTitle: {
    color: Brand.ink,
    fontSize: 13,
    fontWeight: "800",
  },

  recommendationTitleDone: {
    color: Brand.muted,
  },

  recommendationDescription: {
    color: Brand.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },

  recommendationTextDone: {
    color: Brand.muted,
  },

  recommendationArrow: {
    color: Brand.primaryDark,
    fontSize: 21,
    marginLeft: 8,
  },

  profileCard: {
    backgroundColor: Brand.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Brand.line,
  },

  cardTitle: {
    color: Brand.ink,
    fontSize: 18,
    fontWeight: "900",
  },

  cardDescription: {
    color: Brand.muted,
    fontSize: 12,
    marginTop: 5,
    marginBottom: 18,
  },

  label: {
    color: "#39445a",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 7,
  },

  input: {
    minHeight: 47,
    borderWidth: 1,
    borderColor: "#d8dee8",
    borderRadius: 10,
    paddingHorizontal: 12,
    color: Brand.ink,
    fontSize: 13,
    marginBottom: 14,
    backgroundColor: Brand.surface,
  },

  readonlyInput: {
    backgroundColor: "#f2f4f7",
    color: Brand.muted,
  },

  selectButton: {
    minHeight: 47,
    borderWidth: 1,
    borderColor: "#d8dee8",
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  selectText: {
    color: Brand.ink,
    fontSize: 13,
    flex: 1,
  },

  selectPlaceholder: {
    color: "#8a94a6",
  },

  arrow: {
    color: Brand.muted,
    fontSize: 10,
  },

  divider: {
    height: 1,
    backgroundColor: "#edf0f4",
    marginVertical: 8,
  },

  skillsTitle: {
    color: Brand.ink,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
  },

  skillsDescription: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 13,
  },

  skillInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  skillInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },

  addSkillButton: {
    minHeight: 47,
    paddingHorizontal: 13,
    borderRadius: 10,
    backgroundColor: Brand.primaryMist,
    alignItems: "center",
    justifyContent: "center",
  },

  addSkillButtonText: {
    color: Brand.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },

  skillsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 13,
  },

  skillTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Brand.primaryMist,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginRight: 6,
    marginBottom: 6,
  },

  skillTagText: {
    color: "#39445a",
    fontSize: 11,
    fontWeight: "700",
  },

  removeSkill: {
    color: "#b42318",
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 7,
  },

  noSkills: {
    color: "#8a94a6",
    fontSize: 12,
  },

  profileActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },

  savedMessage: {
    color: "#217a43",
    fontSize: 11,
    fontWeight: "800",
    marginRight: 10,
  },

  primaryButton: {
    backgroundColor: Brand.primary,
    minHeight: 46,
    borderRadius: 10,
    paddingHorizontal: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },

  profileSideCard: {
    backgroundColor: Brand.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Brand.line,
  },

  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Brand.primaryMist,
    alignItems: "center",
    justifyContent: "center",
  },

  largeAvatarText: {
    color: Brand.primaryDark,
    fontSize: 31,
    fontWeight: "900",
  },

  profileName: {
    color: Brand.ink,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 12,
  },

  profileEmail: {
    color: Brand.muted,
    fontSize: 12,
    marginTop: 4,
  },

  completionRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
  },

  completionLabel: {
    color: Brand.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  completionValue: {
    color: Brand.ink,
    fontSize: 11,
    fontWeight: "900",
  },

  completionBackground: {
    width: "100%",
    height: 8,
    backgroundColor: Brand.bgDeep,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 8,
  },

  completionBar: {
    height: "100%",
    backgroundColor: Brand.primary,
    borderRadius: 10,
  },

  tipCard: {
    width: "100%",
    backgroundColor: Brand.bg,
    borderRadius: 11,
    padding: 13,
    marginTop: 20,
  },

  tipTitle: {
    color: Brand.ink,
    fontSize: 12,
    fontWeight: "800",
  },

  tipText: {
    color: Brand.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  placeholderSection: {
    alignItems: "stretch",
  },

  placeholderCard: {
    backgroundColor: Brand.surface,
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: Brand.line,
  },

  placeholderIcon: {
    fontSize: 45,
    marginBottom: 10,
  },

  placeholderText: {
    color: Brand.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 6,
  },
});