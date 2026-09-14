import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import AdminAccounts from "./AdminAccounts";
import NotificationBell from "./NotificationBell";

import { getSupabase, supabaseErrorMessage } from "../lib/supabase";
import { AdminAnalyticsSection } from "./AnalyticsCharts";
import Events from "./Events";

function AdminDashboard({ user, onLogout }) {
  const [page, setPage] = useState("dashboard");

  const [accounts, setAccounts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [usingSupabase, setUsingSupabase] = useState(false);

  // =====================================
  // LOAD DATA  (Supabase, AsyncStorage fallback)
  // =====================================

  // Map a DB profile row -> the account shape the UI expects.
  function mapProfileRow(row) {
    return {
      id: row.id,
      email: row.email,
      name: row.full_name || row.company_name || "",
      role:
        row.role === "student" || row.role === "alumni"
          ? "job-seeker"
          : row.role,
      dbRole: row.role,
      status: row.status,
      isVerified: row.is_verified,
      company: row.company_name || "",
      programme: row.programme || "",
      skills: row.skills || [],
    };
  }

  // Map a DB opportunity row -> the job shape the UI expects.
  function mapOpportunityRow(row, profileRows) {
    const owner = profileRows.find(
      (profile) => profile.id === row.business_id
    );

    return {
      id: row.id,
      title: row.title,
      companyName: row.company || owner?.company_name || "",
      company: row.company || owner?.company_name || "",
      location: row.location,
      salary: row.salary,
      // DB: 'pending' | 'approved' | 'rejected' | 'closed'
      // UI: 'Active' | 'Inactive' | 'Pending'
      status:
        row.status === "approved"
          ? "Active"
          : row.status === "pending"
          ? "Pending"
          : "Inactive",
      dbStatus: row.status,
      businessId: row.business_id,
    };
  }

  async function loadData() {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const [profilesResult, opportunitiesResult, applicationsResult] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("*")
              .order("created_at", { ascending: false }),
            supabase
              .from("opportunities")
              .select("*")
              .order("created_at", { ascending: false }),
            supabase
              .from("applications")
              .select(
                "*, opportunity:opportunities(title), applicant:profiles!applications_applicant_id_fkey(email, full_name, company_name)"
              )
              .order("created_at", { ascending: false }),
          ]);

        if (profilesResult.error) throw profilesResult.error;
        if (opportunitiesResult.error) throw opportunitiesResult.error;

        const profileRows = profilesResult.data || [];

        setAccounts(profileRows.map(mapProfileRow));

        setJobs(
          (opportunitiesResult.data || []).map((row) =>
            mapOpportunityRow(row, profileRows)
          )
        );

        if (applicationsResult.error) {
          // Foreign-key join may fail on older setups - degrade gracefully.
          const basic = await supabase
            .from("applications")
            .select("*")
            .order("created_at", { ascending: false });

          setApplications(
            (basic.data || []).map((row) => ({
              id: row.id,
              opportunityId: row.opportunity_id,
              jobTitle: "",
              matchScore: row.match_score,
              status:
                row.status?.charAt(0).toUpperCase() +
                row.status?.slice(1),
              coverNote: row.cover_note,
            }))
          );
        } else {
          setApplications(
            (applicationsResult.data || []).map((row) => ({
              id: row.id,
              opportunityId: row.opportunity_id,
              jobTitle: row.opportunity?.title || "",
              seekerEmail: row.applicant?.email || "",
              seekerName:
                row.applicant?.full_name ||
                row.applicant?.company_name ||
                "",
              matchScore: row.match_score,
              status:
                row.status?.charAt(0).toUpperCase() +
                row.status?.slice(1),
              coverNote: row.cover_note,
            }))
          );
        }

        setUsingSupabase(true);
        return;
      } catch (error) {
        console.log(
          "Supabase load failed, falling back to local data:",
          error?.message || error
        );
      }
    }

    // ---- AsyncStorage fallback (offline / not configured) ----
    try {
      const savedAccounts =
        await AsyncStorage.getItem(
          "careerAI_accounts"
        );

      const savedJobs =
        await AsyncStorage.getItem(
          "careerAI_jobs"
        );

      const savedApplications =
        await AsyncStorage.getItem(
          "careerAI_applications"
        );

      const parsedAccounts = savedAccounts
        ? JSON.parse(savedAccounts)
        : [];

      const parsedJobs = savedJobs
        ? JSON.parse(savedJobs)
        : [];

      const parsedApplications =
        savedApplications
          ? JSON.parse(savedApplications)
          : [];

      setAccounts(
        Array.isArray(parsedAccounts)
          ? parsedAccounts
          : []
      );

      setJobs(
        Array.isArray(parsedJobs)
          ? parsedJobs
          : []
      );

      setApplications(
        Array.isArray(parsedApplications)
          ? parsedApplications
          : []
      );

      setUsingSupabase(false);
    } catch (error) {
      console.log(
        "Error loading admin data:",
        error
      );

      setAccounts([]);
      setJobs([]);
      setApplications([]);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // =====================================
  // REFRESH
  // =====================================

  async function refreshData() {
    await loadData();
  }

  // =====================================
  // STATISTICS
  // =====================================

  const jobSeekers =
    accounts.filter(
      (account) =>
        account.role === "job-seeker"
    ).length;

  const businesses =
    accounts.filter(
      (account) =>
        account.role === "business"
    ).length;

  const admins =
    accounts.filter(
      (account) =>
        account.role === "admin"
    ).length;

  const activeJobs =
    jobs.filter(
      (job) =>
        job.status !== "Inactive"
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
        "Interview"
    ).length;

  const hired =
    applications.filter(
      (application) =>
        application.status ===
        "Hired"
    ).length;

  // Approval pipelines (guideline 2.2 — admin oversight)
  const pendingBusinesses =
    accounts.filter(
      (account) =>
        account.dbRole === "business" &&
        account.status === "pending"
    ).length;

  const pendingJobs =
    jobs.filter(
      (job) => job.dbStatus === "pending"
    ).length;

  // =====================================
  // USER ACTIONS  (Supabase — admin-only via RLS)
  // =====================================

  // Approve a pending business account (brief 2.1 business verification).
  async function approveUser(account) {
    const supabase = getSupabase();

    if (!supabase || !account.id) {
      Alert.alert(
        "Not Available",
        "Account approval requires the Supabase backend."
      );
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", account.id);

    if (error) {
      Alert.alert(
        "Error",
        supabaseErrorMessage(error)
      );
      return;
    }

    Alert.alert(
      "Approved",
      `${account.name || account.email} can now sign in.`
    );

    await refreshData();
  }

  // Suspend (deactivate) a user — safer than deletion.
  async function suspendUser(account) {
    if (account.email === user?.email) {
      Alert.alert(
        "Cannot Suspend",
        "You cannot suspend your own account."
      );

      return;
    }

    if (
      account.dbRole === "admin"
    ) {
      Alert.alert(
        "Cannot Suspend",
        "Administrators cannot be suspended here."
      );

      return;
    }

    const supabase = getSupabase();

    if (!supabase || !account.id) {
      Alert.alert(
        "Not Available",
        "Suspending users requires the Supabase backend."
      );
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ status: "suspended" })
      .eq("id", account.id);

    if (error) {
      Alert.alert(
        "Error",
        supabaseErrorMessage(error)
      );
      return;
    }

    await refreshData();
  }

  // Delete a user's profile row (admin-only via RLS). Keeps the auth record.
  function deleteUser(account) {
    if (account.email === user?.email) {
      Alert.alert(
        "Cannot Delete",
        "You cannot delete your own account."
      );

      return;
    }

    if (
      account.dbRole === "admin"
    ) {
      Alert.alert(
        "Cannot Delete",
        "Administrators cannot be deleted here."
      );

      return;
    }

    Alert.alert(
      "Delete User",
      "This removes the user's profile permanently. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const supabase = getSupabase();

            if (!supabase || !account.id) {
              Alert.alert(
                "Not Available",
                "Deleting users requires the Supabase backend."
              );
              return;
            }

            const { error } = await supabase
              .from("profiles")
              .delete()
              .eq("id", account.id);

            if (error) {
              Alert.alert(
                "Error",
                supabaseErrorMessage(error)
              );
              return;
            }

            await refreshData();
          },
        },
      ]
    );
  }

  // =====================================
  // JOB ACTIONS  (Supabase — approval gate + smart matching)
  // =====================================

  // Approve a pending job listing. DB trigger fires smart matching
  // notifications to aligned students automatically (brief 2.8).
  async function approveJob(job) {
    const supabase = getSupabase();

    if (!supabase || !job.id) {
      Alert.alert(
        "Not Available",
        "Job approval requires the Supabase backend."
      );
      return;
    }

    const { error } = await supabase
      .from("opportunities")
      .update({ status: "approved" })
      .eq("id", job.id);

    if (error) {
      Alert.alert(
        "Error",
        supabaseErrorMessage(error)
      );
      return;
    }

    Alert.alert(
      "Approved",
      "The listing is now visible and matching students have been notified."
    );

    await refreshData();
  }

  // Reject a pending job listing.
  async function rejectJob(job) {
    const supabase = getSupabase();

    if (!supabase || !job.id) {
      Alert.alert(
        "Not Available",
        "Job rejection requires the Supabase backend."
      );
      return;
    }

    const { error } = await supabase
      .from("opportunities")
      .update({ status: "rejected" })
      .eq("id", job.id);

    if (error) {
      Alert.alert(
        "Error",
        supabaseErrorMessage(error)
      );
      return;
    }

    await refreshData();
  }

  // Deactivate (close) an approved listing, or re-activate a closed one.
  async function toggleJobStatus(job) {
    const supabase = getSupabase();

    if (!supabase || !job.id) {
      Alert.alert(
        "Not Available",
        "Job status changes require the Supabase backend."
      );
      return;
    }

    const nextDbStatus =
      job.dbStatus === "approved"
        ? "closed"
        : "approved";

    const { error } = await supabase
      .from("opportunities")
      .update({ status: nextDbStatus })
      .eq("id", job.id);

    if (error) {
      Alert.alert(
        "Error",
        supabaseErrorMessage(error)
      );
      return;
    }

    await refreshData();
  }

  // =====================================
  // SIDEBAR / MOBILE NAVIGATION
  // =====================================

  function renderSidebar() {
    return (
      <View style={styles.navigation}>
        <View style={styles.sidebarLogo}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoText}>
              C
            </Text>
          </View>

          <View>
            <Text style={styles.logoTitle}>
              Career Next Step
            </Text>

            <Text style={styles.logoSubtitle}>
              Admin Panel
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.navScroll
          }
        >
          <Pressable
            style={[
              styles.navButton,
              page === "dashboard" &&
                styles.navButtonActive,
            ]}
            onPress={() =>
              setPage("dashboard")
            }
          >
                        <Text style={styles.navIcon}>
              D
            </Text>

            <Text
              style={[
                styles.navText,
                page === "dashboard" &&
                  styles.navTextActive,
              ]}
            >
              Dashboard
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.navButton,
              page === "users" &&
                styles.navButtonActive,
            ]}
            onPress={() =>
              setPage("users")
            }
          >
                        <Text style={styles.navIcon}>
              U
            </Text>

            <Text
              style={[
                styles.navText,
                page === "users" &&
                  styles.navTextActive,
              ]}
            >
              Users
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.navButton,
              page === "approvals" &&
                styles.navButtonActive,
            ]}
            onPress={() =>
              setPage("approvals")
            }
          >
            <Text style={styles.navIcon}>
              ✅
            </Text>

            <Text
              style={[
                styles.navText,
                page === "approvals" &&
                  styles.navTextActive,
              ]}
            >
              Approvals
            </Text>

            {pendingBusinesses +
              pendingJobs >
              0 && (
              <View
                style={styles.navBadge}
              >
                <Text
                  style={
                    styles.navBadgeText
                  }
                >
                  {pendingBusinesses +
                    pendingJobs}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={[
              styles.navButton,
              page === "jobs" &&
                styles.navButtonActive,
            ]}
            onPress={() =>
              setPage("jobs")
            }
          >
                        <Text style={styles.navIcon}>
              J
            </Text>

            <Text
              style={[
                styles.navText,
                page === "jobs" &&
                  styles.navTextActive,
              ]}
            >
              Jobs
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.navButton,
              page === "applications" &&
                styles.navButtonActive,
            ]}
            onPress={() =>
              setPage("applications")
            }
          >
                        <Text style={styles.navIcon}>
              A
            </Text>

            <Text
              style={[
                styles.navText,
                page === "applications" &&
                  styles.navTextActive,
              ]}
            >
              Applications
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.navButton,
              page === "statistics" &&
                styles.navButtonActive,
            ]}
            onPress={() =>
              setPage("statistics")
            }
          >
            <Text style={styles.navIcon}>
              📈
            </Text>

            <Text
              style={[
                styles.navText,
                page === "statistics" &&
                  styles.navTextActive,
              ]}
            >
              Statistics
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.navButton,
              page === "events" &&
                styles.navButtonActive,
            ]}
            onPress={() =>
              setPage("events")
            }
          >
                        <Text style={styles.navIcon}>
              E
            </Text>

            <Text
              style={[
                styles.navText,
                page === "events" &&
                  styles.navTextActive,
              ]}
            >
              Events
            </Text>
          </Pressable>

          {user?.role === "admin" &&
            user?.adminLevel ===
              "main" && (
              <Pressable
                style={[
                  styles.navButton,
                  page ===
                    "admin-accounts" &&
                    styles.navButtonActive,
                ]}
                onPress={() =>
                  setPage(
                    "admin-accounts"
                  )
                }
              >
                                <Text
                  style={styles.navIcon}
                >
                  A
                </Text>

                <Text
                  style={[
                    styles.navText,
                    page ===
                      "admin-accounts" &&
                      styles.navTextActive,
                  ]}
                >
                  Admin Accounts
                </Text>
              </Pressable>
            )}
        </ScrollView>

        <View style={styles.sidebarBottom}>
          <View
            style={styles.adminSidebarUser}
          >
            <View style={styles.avatar}>
              <Text
                style={styles.avatarText}
              >
                {(user?.name || "A")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <View
              style={styles.userInfo}
            >
              <Text
                style={styles.userName}
              >
                {user?.name ||
                  "Administrator"}
              </Text>

              <Text
                style={styles.userRole}
              >
                {user?.adminLevel ===
                "main"
                  ? "Main Administrator"
                  : "Administrator"}
              </Text>
            </View>

            <Pressable
              style={styles.logoutButton}
              onPress={onLogout}
            >
              <Text
                style={styles.logoutText}
              >
                ↪
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // =====================================
  // TOP BAR
  // =====================================

  function renderTopbar(title) {
    return (
      <View style={styles.topbar}>
        <View style={styles.topbarText}>
          <Text style={styles.topbarTitle}>
            {title}
          </Text>

          <Text
            style={styles.topbarDescription}
          >
            Manage the Career Next Step
            platform.
          </Text>
        </View>

        <View style={styles.topbarUser}>
          <NotificationBell />

          <View style={styles.smallAvatar}>
            <Text
              style={
                styles.smallAvatarText
              }
            >
              {(user?.name || "A")
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View>
            <Text
              style={styles.topbarName}
            >
              {user?.name ||
                "Administrator"}
            </Text>

            <Text
              style={styles.topbarRole}
            >
              {user?.adminLevel ===
              "main"
                ? "Main Admin"
                : "Admin"}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // =====================================
  // DASHBOARD
  // =====================================

  function renderDashboard() {
    return (
      <>
        {renderTopbar(
          "Admin Dashboard"
        )}

        <ScrollView
          style={styles.page}
          contentContainerStyle={
            styles.pageContent
          }
        >
          <View
            style={styles.welcomeCard}
          >
            <View
              style={styles.welcomeContent}
            >
              <Text
                style={styles.eyebrow}
              >
                PLATFORM OVERVIEW
              </Text>

              <Text
                style={styles.welcomeTitle}
              >
                Welcome back,{" "}
                {user?.name ||
                  "Administrator"}
              </Text>

              <Text
                style={
                  styles.welcomeDescription
                }
              >
                Monitor users, job listings
                and graduate applications
                from one place.
              </Text>
            </View>

                        <Text style={styles.welcomeIcon}>
              N
            </Text>
          </View>

          <View style={styles.statGrid}>
            {renderStatCard(
                            "U",
              "Total Users",
              accounts.length,
              "All registered accounts"
            )}

            {renderStatCard(
                            "J",
              "Job Seekers",
              jobSeekers,
              "Registered graduates"
            )}

            {renderStatCard(
                            "B",
              "Businesses",
              businesses,
              "Employer accounts"
            )}

            {renderStatCard(
                            "A",
              "Active Jobs",
              activeJobs,
              "Current job listings"
            )}
          </View>

          <View style={styles.section}>
            <View
              style={styles.sectionHeader}
            >
              <View>
                <Text
                  style={styles.sectionTitle}
                >
                  Platform Activity
                </Text>

                <Text
                  style={
                    styles.sectionDescription
                  }
                >
                  Current Career Next Step
                  recruitment activity.
                </Text>
              </View>
            </View>

            <View
              style={styles.activityGrid}
            >
              {renderActivityCard(
                "Applications",
                applications.length
              )}

              {renderActivityCard(
                "Shortlisted",
                shortlisted
              )}

              {renderActivityCard(
                "Interviews",
                interviews
              )}

              {renderActivityCard(
                "Hired",
                hired
              )}
            </View>
          </View>

          <View
            style={styles.quickActions}
          >
            {renderQuickAction(
                            "U",
              "Manage Users",
              "View registered accounts",
              "users"
            )}

            {renderQuickAction(
                            "J",
              "Manage Jobs",
              "Review job listings",
              "jobs"
            )}

            {renderQuickAction(
              "A",
              "Applications",
              "Monitor applications",
              "applications"
            )}

            {renderQuickAction(
              "📈",
              "Statistics",
              "View platform data",
              "statistics"
            )}

            {user?.adminLevel ===
              "main" &&
              renderQuickAction(
                                "A",
                "Admin Accounts",
                "Manage administrators",
                "admin-accounts"
              )}
          </View>
        </ScrollView>
      </>
    );
  }

  // =====================================
  // USERS
  // =====================================

  function renderUsers() {
    return (
      <>
        {renderTopbar("Users")}

        <ScrollView
          style={styles.page}
          contentContainerStyle={
            styles.pageContent
          }
        >
          <View
            style={styles.pageHeader}
          >
            <View>
              <Text
                style={styles.pageHeading}
              >
                Registered Users
              </Text>

              <Text
                style={
                  styles.pageHeaderDescription
                }
              >
                Manage Career Next Step
                accounts.
              </Text>
            </View>

            <View
              style={styles.countBadge}
            >
              <Text
                style={styles.countText}
              >
                {accounts.length} users
              </Text>
            </View>
          </View>

          {accounts.length === 0 ? (
            renderEmpty(
              "No users found."
            )
          ) : (
            <View>
              {accounts.map(
                (account) => (
                  <View
                    style={styles.userCard}
                    key={account.id || account.email}
                  >
                    <View
                      style={styles.userCardTop}
                    >
                      <View
                        style={styles.userCardAvatar}
                      >
                        <Text
                          style={
                            styles.userCardAvatarText
                          }
                        >
                          {(
                            account.name ||
                            "U"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.userCardInfo
                        }
                      >
                        <Text
                          style={
                            styles.userCardName
                          }
                        >
                          {account.name ||
                            "Unnamed User"}
                        </Text>

                        <Text
                          style={
                            styles.userCardEmail
                          }
                        >
                          {account.email}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.userCardBottom
                      }
                    >
                      <View
                        style={[
                          styles.roleBadge,
                          account.role ===
                            "job-seeker" &&
                            styles.roleJobSeeker,
                          account.role ===
                            "business" &&
                            styles.roleBusiness,
                          account.role ===
                            "admin" &&
                            styles.roleAdmin,
                        ]}
                      >
                        <Text
                          style={
                            styles.roleBadgeText
                          }
                        >
                          {account.role ===
                          "job-seeker"
                            ? account.dbRole ===
                              "alumni"
                              ? "Alumni"
                              : "Job Seeker"
                            : account.role ===
                              "business"
                            ? "Business"
                            : "Admin"}
                        </Text>
                      </View>

                      {account.dbRole ===
                        "business" &&
                        account.status ===
                          "pending" && (
                          <Pressable
                            style={
                              styles.approveButton
                            }
                            onPress={() =>
                              approveUser(
                                account
                              )
                            }
                          >
                            <Text
                              style={
                                styles.approveButtonText
                              }
                            >
                              Approve
                            </Text>
                          </Pressable>
                        )}

                      {account.email !==
                      user?.email ? (
                        <Pressable
                          style={
                            styles.deleteButton
                          }
                          onPress={() =>
                            deleteUser(
                              account
                            )
                          }
                        >
                          <Text
                            style={
                              styles.deleteButtonText
                            }
                          >
                            Delete
                          </Text>
                        </Pressable>
                      ) : (
                        <Text
                          style={
                            styles.youText
                          }
                        >
                          You
                        </Text>
                      )}
                    </View>
                  </View>
                )
              )}
            </View>
          )}
        </ScrollView>
      </>
    );
  }

  // =====================================
  // APPROVALS  (brief 2.2 — admin verification pipelines)
  // =====================================

  function renderApprovals() {
    const pendingAccountList =
      accounts.filter(
        (account) =>
          account.dbRole === "business" &&
          account.status === "pending"
      );

    const pendingJobList = jobs.filter(
      (job) => job.dbStatus === "pending"
    );

    return (
      <>
        {renderTopbar(
          "Approvals"
        )}

        <ScrollView
          style={styles.page}
          contentContainerStyle={
            styles.pageContent
          }
        >
          <View
            style={styles.pageHeader}
          >
            <View>
              <Text
                style={styles.pageHeading}
              >
                Pending Approvals
              </Text>

              <Text
                style={
                  styles.pageHeaderDescription
                }
              >
                Verify business accounts
                and review job listings
                before they go live.
              </Text>
            </View>
          </View>

          <Text
            style={styles.sectionTitle}
          >
                        Business Accounts
            ({" "}
            {pendingAccountList.length}{" "}
            pending )
          </Text>

          {pendingAccountList.length ===
          0
            ? renderEmpty(
                "No business accounts awaiting approval."
              )
            : pendingAccountList.map(
                (account) => (
                  <View
                    style={
                      styles.userCard
                    }
                    key={
                      account.id ||
                      account.email
                    }
                  >
                    <View
                      style={
                        styles.userCardTop
                      }
                    >
                      <View
                        style={
                          styles.userCardAvatar
                        }
                      >
                        <Text
                          style={
                            styles.userCardAvatarText
                          }
                        >
                          {(
                            account.company ||
                            account.name ||
                            "B"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.userCardInfo
                        }
                      >
                        <Text
                          style={
                            styles.userCardName
                          }
                        >
                          {account.company ||
                            account.name ||
                            "Unnamed Business"}
                        </Text>

                        <Text
                          style={
                            styles.userCardEmail
                          }
                        >
                          {
                            account.email
                          }
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.userCardBottom
                      }
                    >
                      <View
                        style={[
                          styles.roleBadge,
                          styles.roleBusiness,
                        ]}
                      >
                        <Text
                          style={
                            styles.roleBadgeText
                          }
                        >
                          Pending
                          Verification
                        </Text>
                      </View>

                      <Pressable
                        style={
                          styles.approveButton
                        }
                        onPress={() =>
                          approveUser(
                            account
                          )
                        }
                      >
                        <Text
                          style={
                            styles.approveButtonText
                          }
                        >
                          Approve
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )
              )}

          <Text
            style={styles.sectionTitle}
          >
            💼 Job Listings ({" "}
            {pendingJobList.length}{" "}
            pending )
          </Text>

          {pendingJobList.length ===
          0
            ? renderEmpty(
                "No job listings awaiting approval."
              )
            : pendingJobList.map(
                (job) => (
                  <View
                    style={
                      styles.jobCard
                    }
                    key={job.id}
                  >
                    <View
                      style={
                        styles.jobCardTop
                      }
                    >
                      <View
                        style={
                          styles.jobIcon
                        }
                      >
                        <Text
                          style={
                            styles.jobIconText
                          }
                        >
                                                    J
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.jobStatus,
                          styles.jobStatusInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.jobStatusText,
                            styles.jobStatusTextInactive,
                          ]}
                        >
                          Pending
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={
                        styles.jobTitle
                      }
                    >
                      {job.title}
                    </Text>

                    <Text
                      style={
                        styles.jobCompany
                      }
                    >
                      {job.companyName ||
                        job.company ||
                        "Company"}
                    </Text>

                    <View
                      style={
                        styles.jobActions
                      }
                    >
                      <Pressable
                        style={
                          styles.approveButton
                        }
                        onPress={() =>
                          approveJob(
                            job
                          )
                        }
                      >
                        <Text
                          style={
                            styles.approveButtonText
                          }
                        >
                          Approve
                        </Text>
                      </Pressable>

                      <Pressable
                        style={
                          styles.deleteButton
                        }
                        onPress={() =>
                          rejectJob(
                            job
                          )
                        }
                      >
                        <Text
                          style={
                            styles.deleteButtonText
                          }
                        >
                          Reject
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )
              )}
        </ScrollView>
      </>
    );
  }

  // =====================================
  // JOBS
  // =====================================

  function renderJobs() {
    return (
      <>
        {renderTopbar(
          "Job Listings"
        )}

        <ScrollView
          style={styles.page}
          contentContainerStyle={
            styles.pageContent
          }
        >
          <View
            style={styles.pageHeader}
          >
            <View>
              <Text
                style={styles.pageHeading}
              >
                All Job Listings
              </Text>

              <Text
                style={
                  styles.pageHeaderDescription
                }
              >
                Review and manage jobs
                posted on Career Next Step.
              </Text>
            </View>

            <View
              style={styles.countBadge}
            >
              <Text
                style={styles.countText}
              >
                {jobs.length} jobs
              </Text>
            </View>
          </View>

          {jobs.length === 0 ? (
            renderEmpty(
              "No job listings have been posted yet."
            )
          ) : (
            <View>
              {jobs.map((job) => (
                <View
                  style={styles.jobCard}
                  key={job.id}
                >
                  <View
                    style={
                      styles.jobCardTop
                    }
                  >
                    <View
                      style={
                        styles.jobIcon
                      }
                    >
                      <Text
                        style={
                          styles.jobIconText
                        }
                      >
                                                J
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.jobStatus,
                        job.status ===
                          "Inactive" &&
                          styles.jobStatusInactive,
                        job.status ===
                          "Pending" &&
                          styles.jobStatusInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.jobStatusText,
                          job.status ===
                            "Inactive" &&
                            styles.jobStatusTextInactive,
                          job.status ===
                            "Pending" &&
                            styles.jobStatusTextInactive,
                        ]}
                      >
                        {job.status ||
                          "Active"}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={styles.jobTitle}
                  >
                    {job.title}
                  </Text>

                  <Text
                    style={styles.jobCompany}
                  >
                    {job.companyName ||
                      job.company ||
                      "Company"}
                  </Text>

                  <Text
                    style={styles.jobMeta}
                  >
                                                    {job.location ||
                      "Location not specified"}
                  </Text>

                  <Text
                    style={styles.jobMeta}
                  >
                    💰{" "}
                    {job.salary ||
                      "Salary not specified"}
                  </Text>

                  <View
                    style={
                      styles.jobActions
                    }
                  >
                    {job.dbStatus ===
                      "pending" && (
                      <>
                        <Pressable
                          style={
                            styles.approveButton
                          }
                          onPress={() =>
                            approveJob(
                              job
                            )
                          }
                        >
                          <Text
                            style={
                              styles.approveButtonText
                            }
                          >
                            Approve
                          </Text>
                        </Pressable>

                        <Pressable
                          style={
                            styles.deleteButton
                          }
                          onPress={() =>
                            rejectJob(
                              job
                            )
                          }
                        >
                          <Text
                            style={
                              styles.deleteButtonText
                            }
                          >
                            Reject
                          </Text>
                        </Pressable>
                      </>
                    )}

                    {job.dbStatus !==
                      "pending" && (
                      <>
                        <Pressable
                          style={
                            styles.secondaryButton
                          }
                          onPress={() =>
                            toggleJobStatus(
                              job
                            )
                          }
                        >
                          <Text
                            style={
                              styles.secondaryButtonText
                            }
                          >
                            {job.dbStatus ===
                            "approved"
                              ? "Deactivate"
                              : "Activate"}
                          </Text>
                        </Pressable>

                        <Pressable
                          style={
                            styles.deleteButton
                          }
                          onPress={() =>
                            rejectJob(
                              job
                            )
                          }
                        >
                          <Text
                            style={
                              styles.deleteButtonText
                            }
                          >
                            Close
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </>
    );
  }

  // =====================================
  // APPLICATIONS
  // =====================================

  function renderApplications() {
    return (
      <>
        {renderTopbar(
          "Applications"
        )}

        <ScrollView
          style={styles.page}
          contentContainerStyle={
            styles.pageContent
          }
        >
          <View
            style={styles.pageHeader}
          >
            <View>
              <Text
                style={styles.pageHeading}
              >
                All Applications
              </Text>

              <Text
                style={
                  styles.pageHeaderDescription
                }
              >
                Monitor graduate applications
                across the platform.
              </Text>
            </View>

            <View
              style={styles.countBadge}
            >
              <Text
                style={styles.countText}
              >
                {applications.length}{" "}
                applications
              </Text>
            </View>
          </View>

          {applications.length ===
          0 ? (
            renderEmpty(
              "No applications found."
            )
          ) : (
            <View>
              {applications.map(
                (
                  application,
                  index
                ) => (
                  <View
                    style={
                      styles.applicationCard
                    }
                    key={
                      application.id ||
                      index
                    }
                  >
                    <View
                      style={
                        styles.applicationHeader
                      }
                    >
                      <View>
                        <Text
                          style={
                            styles.applicationCandidate
                          }
                        >
                          {application.seekerName ||
                            application.name ||
                            "Candidate"}
                        </Text>

                        <Text
                          style={
                            styles.applicationEmail
                          }
                        >
                          {application.seekerEmail ||
                            application.email ||
                            ""}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.matchBadge
                        }
                      >
                        <Text
                          style={
                            styles.matchText
                          }
                        >
                          {application.matchScore ??
                            0}
                          %
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.applicationDetails
                      }
                    >
                      <View
                        style={
                          styles.applicationDetail
                        }
                      >
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          JOB
                        </Text>

                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          {application.jobTitle ||
                            application.title ||
                            "Job"}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.applicationDetail
                        }
                      >
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          COMPANY
                        </Text>

                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          {application.company ||
                            "Company"}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.applicationFooter
                      }
                    >
                      <Text
                        style={
                          styles.statusLabel
                        }
                      >
                        Status
                      </Text>

                      <View
                        style={[
                          styles.applicationStatus,
                          getStatusStyle(
                            application.status
                          ),
                        ]}
                      >
                        <Text
                          style={
                            styles.applicationStatusText
                          }
                        >
                          {application.status ||
                            "Applied"}
                        </Text>
                      </View>
                    </View>
                  </View>
                )
              )}
            </View>
          )}
        </ScrollView>
      </>
    );
  }

  // =====================================
  // STATISTICS
  // =====================================

  function renderStatistics() {
    const applied =
      applications.filter(
        (application) =>
          !application.status ||
          application.status ===
            "Applied"
      ).length;

    const rejected =
      applications.filter(
        (application) =>
          application.status ===
          "Rejected"
      ).length;

    const averageMatch =
      applications.length > 0
        ? Math.round(
            applications.reduce(
              (
                total,
                application
              ) =>
                total +
                Number(
                  application.matchScore ||
                    0
                ),
              0
            ) /
              applications.length
          )
        : 0;

    return (
      <>
        {renderTopbar(
          "Platform Statistics"
        )}

        <ScrollView
          style={styles.page}
          contentContainerStyle={
            styles.pageContent
          }
        >
          <View
            style={styles.pageHeader}
          >
            <View>
              <Text
                style={styles.pageHeading}
              >
                Career Next Step
                Statistics
              </Text>

              <Text
                style={
                  styles.pageHeaderDescription
                }
              >
                Overview of platform
                performance.
              </Text>
            </View>
          </View>

          <View style={styles.statGrid}>
            {renderStatCard(
                            "U",
              "Total Accounts",
              accounts.length
            )}

            {renderStatCard(
                            "J",
              "Total Jobs",
              jobs.length
            )}

                        {renderStatCard(
              "A",
              "Applications",
              applications.length
            )}

            {renderStatCard(
                            "M",
              "Average Match",
              `${averageMatch}%`
            )}
          </View>

          <View style={styles.section}>
            <Text
              style={styles.sectionTitle}
            >
              Application Funnel
            </Text>

            <Text
              style={
                styles.sectionDescription
              }
            >
              Candidate progress through
              recruitment.
            </Text>

            <View
              style={styles.funnel}
            >
              {renderFunnelItem(
                "Applied",
                applied
              )}

              {renderFunnelItem(
                "Shortlisted",
                shortlisted
              )}

              {renderFunnelItem(
                "Interview",
                interviews
              )}

              {renderFunnelItem(
                "Hired",
                hired
              )}

              {renderFunnelItem(
                "Rejected",
                rejected
              )}
            </View>
          </View>

          <View
            style={styles.roleSummary}
          >
                        {renderRoleSummary(
              "J",
              jobSeekers,
              "Job Seekers"
            )}

                        {renderRoleSummary(
              "B",
              businesses,
              "Businesses"
            )}

                        {renderRoleSummary(
              "A",
              admins,
              "Administrators"
            )}
          </View>
        </ScrollView>
      </>
    );
  }

  // =====================================
  // HELPER FUNCTIONS
  // =====================================

  function renderStatCard(
    icon,
    label,
    value,
    description
  ) {
    return (
      <View style={styles.statCard}>
        <View style={styles.statIcon}>
          <Text
            style={styles.statIconText}
          >
            {icon}
          </Text>
        </View>

        <Text style={styles.statLabel}>
          {label}
        </Text>

        <Text style={styles.statValue}>
          {value}
        </Text>

        {description ? (
          <Text
            style={styles.statDescription}
          >
            {description}
          </Text>
        ) : null}
      </View>
    );
  }

  function renderActivityCard(
    label,
    value
  ) {
    return (
      <View
        style={styles.activityCard}
      >
        <Text
          style={styles.activityLabel}
        >
          {label}
        </Text>

        <Text
          style={styles.activityValue}
        >
          {value}
        </Text>
      </View>
    );
  }

  function renderQuickAction(
    icon,
    title,
    description,
    targetPage
  ) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.quickAction,
          pressed &&
            styles.pressed,
        ]}
        onPress={() =>
          setPage(targetPage)
        }
      >
        <Text style={styles.quickIcon}>
          {icon}
        </Text>

        <View
          style={styles.quickText}
        >
          <Text
            style={styles.quickTitle}
          >
            {title}
          </Text>

          <Text
            style={
              styles.quickDescription
            }
          >
            {description}
          </Text>
        </View>
      </Pressable>
    );
  }

  function renderFunnelItem(
    label,
    value
  ) {
    return (
      <View
        style={styles.funnelItem}
      >
        <Text
          style={styles.funnelLabel}
        >
          {label}
        </Text>

        <Text
          style={styles.funnelValue}
        >
          {value}
        </Text>
      </View>
    );
  }

  function renderRoleSummary(
    icon,
    value,
    label
  ) {
    return (
      <View
        style={styles.roleSummaryCard}
      >
        <Text
          style={styles.roleIcon}
        >
          {icon}
        </Text>

        <Text
          style={styles.roleValue}
        >
          {value}
        </Text>

        <Text
          style={styles.roleLabel}
        >
          {label}
        </Text>
      </View>
    );
  }

  function renderEmpty(text) {
    return (
      <View style={styles.emptyCard}>
        <Text
          style={styles.emptyText}
        >
          {text}
        </Text>
      </View>
    );
  }

  // =====================================
  // MAIN RENDER
  // =====================================

  return (
    <View style={styles.container}>
      {renderSidebar()}

      <View style={styles.main}>
        {page === "dashboard" &&
          renderDashboard()}

        {page === "approvals" &&
          renderApprovals()}

        {page === "users" &&
          renderUsers()}

        {page === "jobs" &&
          renderJobs()}

        {page === "applications" &&
          renderApplications()}

        {page === "statistics" && (
          <AdminAnalyticsSection />
        )}

        {page === "events" && (
          <Events isAdmin={true} />
        )}

        {page === "admin-accounts" &&
          user?.role === "admin" &&
          user?.adminLevel ===
            "main" && (
            <AdminAccounts
              user={user}
            />
          )}
      </View>
    </View>
  );
}

// =====================================
// STATUS STYLE
// =====================================

function getStatusStyle(status) {
  switch (status) {
    case "Shortlisted":
      return styles.statusShortlisted;

    case "Interview":
      return styles.statusInterview;

    case "Hired":
      return styles.statusHired;

    case "Rejected":
      return styles.statusRejected;

    default:
      return styles.statusApplied;
  }
}

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },

  main: {
    flex: 1,
  },

  // =====================================
  // NAVIGATION
  // =====================================

  navigation: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e8ef",
  },

  sidebarLogo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },

  logoIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  logoText: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "900",
  },

  logoTitle: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "800",
  },

  logoSubtitle: {
    color: "#687386",
    fontSize: 11,
    marginTop: 2,
  },

  navScroll: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 9,
    marginRight: 7,
  },

  navButtonActive: {
    backgroundColor: "#eaf0ff",
  },

  navIcon: {
    fontSize: 16,
    marginRight: 6,
  },

  navText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#687386",
  },

  navTextActive: {
    color: "#2563eb",
  },

  sidebarBottom: {
    borderTopWidth: 1,
    borderTopColor: "#e4e8ef",
    padding: 12,
  },

  adminSidebarUser: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  avatarText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    color: "#172033",
    fontSize: 13,
    fontWeight: "800",
  },

  userRole: {
    color: "#687386",
    fontSize: 10,
    marginTop: 2,
  },

  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutText: {
    color: "#b91c1c",
    fontSize: 21,
    fontWeight: "800",
  },

  // =====================================
  // TOP BAR
  // =====================================

  topbar: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e8ef",
    flexDirection: "row",
    alignItems: "center",
  },

  topbarText: {
    flex: 1,
  },

  topbarTitle: {
    color: "#172033",
    fontSize: 22,
    fontWeight: "800",
  },

  topbarDescription: {
    color: "#687386",
    fontSize: 12,
    marginTop: 3,
  },

  topbarUser: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    gap: 10,
  },

  smallAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },

  smallAvatarText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },

  topbarName: {
    color: "#172033",
    fontSize: 11,
    fontWeight: "800",
  },

  topbarRole: {
    color: "#687386",
    fontSize: 9,
    marginTop: 2,
  },

  // =====================================
  // PAGE
  // =====================================

  page: {
    flex: 1,
  },

  pageContent: {
    padding: 18,
    paddingBottom: 40,
  },

  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  pageHeading: {
    color: "#172033",
    fontSize: 23,
    fontWeight: "800",
  },

  pageHeaderDescription: {
    color: "#687386",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 19,
    maxWidth: 280,
  },

  countBadge: {
    backgroundColor: "#eaf0ff",
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginLeft: 10,
  },

  countText: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "800",
  },

  // =====================================
  // WELCOME
  // =====================================

  welcomeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e4e8ef",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  welcomeContent: {
    flex: 1,
  },

  eyebrow: {
    color: "#2563eb",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 6,
  },

  welcomeTitle: {
    color: "#172033",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },

  welcomeDescription: {
    color: "#687386",
    fontSize: 13,
    lineHeight: 19,
  },

  welcomeIcon: {
    fontSize: 38,
    marginLeft: 10,
  },

  // =====================================
  // STATS
  // =====================================

  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },

  statCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e4e8ef",
    padding: 15,
    width: "48%",
    minWidth: 145,
    flexGrow: 1,
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#eef3ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  statIconText: {
    fontSize: 19,
  },

  statLabel: {
    color: "#687386",
    fontSize: 11,
    fontWeight: "700",
  },

  statValue: {
    color: "#172033",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 3,
  },

  statDescription: {
    color: "#8a94a6",
    fontSize: 10,
    marginTop: 2,
  },

  // =====================================
  // SECTIONS
  // =====================================

  section: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4e8ef",
    padding: 17,
    marginBottom: 18,
  },

  sectionHeader: {
    marginBottom: 15,
  },

  sectionTitle: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "800",
  },

  sectionDescription: {
    color: "#687386",
    fontSize: 12,
    marginTop: 4,
  },

  // =====================================
  // APPROVALS
  // =====================================

  approveButton: {
    backgroundColor: "#1e9e5a",
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginRight: 8,
  },

  approveButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },

  navBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 9,
    minWidth: 18,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: "center",
    marginLeft: 6,
  },

  navBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },

  // =====================================
  // ACTIVITY
  // =====================================

  activityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  activityCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 13,
    width: "47%",
    flexGrow: 1,
  },

  activityLabel: {
    color: "#687386",
    fontSize: 11,
    fontWeight: "700",
  },

  activityValue: {
    color: "#172033",
    fontSize: 23,
    fontWeight: "900",
    marginTop: 5,
  },

  // =====================================
  // QUICK ACTIONS
  // =====================================

  quickActions: {
    gap: 10,
  },

  quickAction: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e4e8ef",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  quickIcon: {
    fontSize: 23,
    marginRight: 13,
  },

  quickText: {
    flex: 1,
  },

  quickTitle: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "800",
  },

  quickDescription: {
    color: "#687386",
    fontSize: 11,
    marginTop: 3,
  },

  pressed: {
    opacity: 0.7,
  },

  // =====================================
  // USERS
  // =====================================

  userCard: {
    backgroundColor: "#ffffff",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#e4e8ef",
    padding: 14,
    marginBottom: 10,
  },

  userCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  userCardAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#eaf0ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  userCardAvatarText: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "800",
  },

  userCardInfo: {
    flex: 1,
  },

  userCardName: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "800",
  },

  userCardEmail: {
    color: "#687386",
    fontSize: 11,
    marginTop: 3,
  },

  userCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#edf0f4",
  },

  roleBadge: {
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#eef2f7",
  },

  roleJobSeeker: {
    backgroundColor: "#eaf0ff",
  },

  roleBusiness: {
    backgroundColor: "#ecfdf3",
  },

  roleAdmin: {
    backgroundColor: "#f3e8ff",
  },

  roleBadgeText: {
    color: "#344054",
    fontSize: 10,
    fontWeight: "800",
  },

  deleteButton: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  deleteButtonText: {
    color: "#b91c1c",
    fontSize: 11,
    fontWeight: "800",
  },

  youText: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "800",
  },

  // =====================================
  // JOBS
  // =====================================

  jobCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e4e8ef",
    padding: 16,
    marginBottom: 12,
  },

  jobCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  jobIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: "#eef3ff",
    alignItems: "center",
    justifyContent: "center",
  },

  jobIconText: {
    fontSize: 21,
  },

  jobStatus: {
    backgroundColor: "#dcfce7",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  jobStatusInactive: {
    backgroundColor: "#fee2e2",
  },

  jobStatusText: {
    color: "#15803d",
    fontSize: 10,
    fontWeight: "800",
  },

  jobStatusTextInactive: {
    color: "#b91c1c",
  },

  jobTitle: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "800",
  },

  jobCompany: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 12,
  },

  jobMeta: {
    color: "#687386",
    fontSize: 12,
    marginTop: 5,
  },

  jobActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 15,
    gap: 8,
  },

  secondaryButton: {
    backgroundColor: "#eef2f7",
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  secondaryButtonText: {
    color: "#344054",
    fontSize: 11,
    fontWeight: "800",
  },

  // =====================================
  // APPLICATIONS
  // =====================================

  applicationCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e4e8ef",
    padding: 15,
    marginBottom: 12,
  },

  applicationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  applicationCandidate: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "800",
  },

  applicationEmail: {
    color: "#687386",
    fontSize: 11,
    marginTop: 3,
  },

  matchBadge: {
    backgroundColor: "#eaf0ff",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  matchText: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "900",
  },

  applicationDetails: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#edf0f4",
  },

  applicationDetail: {
    marginBottom: 9,
  },

  detailLabel: {
    color: "#8a94a6",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  detailValue: {
    color: "#344054",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  applicationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 3,
  },

  statusLabel: {
    color: "#687386",
    fontSize: 11,
    fontWeight: "700",
  },

  applicationStatus: {
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  applicationStatusText: {
    color: "#344054",
    fontSize: 10,
    fontWeight: "800",
  },

  statusApplied: {
    backgroundColor: "#eef2f7",
  },

  statusShortlisted: {
    backgroundColor: "#eaf0ff",
  },

  statusInterview: {
    backgroundColor: "#fef3c7",
  },

  statusHired: {
    backgroundColor: "#dcfce7",
  },

  statusRejected: {
    backgroundColor: "#fee2e2",
  },

  // =====================================
  // STATISTICS
  // =====================================

  funnel: {
    gap: 10,
    marginTop: 15,
  },

  funnelItem: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  funnelLabel: {
    color: "#687386",
    fontSize: 12,
    fontWeight: "700",
  },

  funnelValue: {
    color: "#172033",
    fontSize: 20,
    fontWeight: "900",
  },

  roleSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },

  roleSummaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#e4e8ef",
    padding: 15,
    alignItems: "center",
    width: "31%",
    minWidth: 95,
    flexGrow: 1,
  },

  roleIcon: {
    fontSize: 22,
    marginBottom: 6,
  },

  roleValue: {
    color: "#172033",
    fontSize: 22,
    fontWeight: "900",
  },

  roleLabel: {
    color: "#687386",
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 3,
  },

  // =====================================
  // EMPTY
  // =====================================

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e4e8ef",
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyText: {
    color: "#687386",
    fontSize: 13,
    textAlign: "center",
  },
});

export default AdminDashboard;