import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-gifted-charts";
import { ensureSupabaseSession } from "../lib/social";

/**
 * ANALYTICS CHART SECTIONS (brief 2.7)
 * =========================================================
 * Three role-specific, self-contained chart dashboards fed
 * by LIVE Supabase queries:
 *   - <AdminAnalyticsSection />    (admin Statistics page)
 *   - <BusinessAnalyticsSection /> (business dashboard)
 *   - <StudentAnalyticsSection />  (student dashboard)
 *
 * Charts (react-native-gifted-charts, pure JS — works on Expo):
 *   line charts  = activity over the last 14 days
 *   bar charts   = pipelines / comparisons
 *   donut charts = distributions by category
 */

const BLUE = "#208AEF";
const PALETTE = [
  "#208AEF",
  "#34C759",
  "#FF9500",
  "#AF52DE",
  "#FF3B30",
  "#5AC8FA",
];

/* ---------------------------------------------------------
 * Chart primitives
 * ------------------------------------------------------- */

function ChartCard({ title, description, children }) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      {description ? (
        <Text style={styles.chartDescription}>{description}</Text>
      ) : null}
      {children}
    </View>
  );
}

function EmptyChart({ label }) {
  return (
    <View style={styles.emptyChart}>
            <Text style={styles.emptyChartIcon}> —</Text>
      <Text style={styles.emptyChartText}>
        {label || "No data yet — charts fill as the platform is used."}
      </Text>
    </View>
  );
}

function Legend({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: item.color }]}
          />
          <Text style={styles.legendLabel}>{item.label}</Text>
          <Text style={styles.legendValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

/* ---------------------------------------------------------
 * Data helpers
 * ------------------------------------------------------- */

function dayLabel(date) {
  return `${date.getDate()} ${date.toLocaleString("en", {
    month: "short",
  })}`;
}

/** Zero-filled [{ label, value }] buckets for the last n days. */
function bucketByDay(rows, dateField, n = 14) {
  const buckets = [];
  const counts = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    counts.set(key, 0);
    buckets.push({ key, label: dayLabel(d), value: 0 });
  }

  (rows || []).forEach((row) => {
    const raw = row?.[dateField];
    if (!raw) return;
    const key = String(raw).slice(0, 10);
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  });

  buckets.forEach((b) => {
    b.value = counts.get(b.key) || 0;
  });
  return buckets;
}

function toLineData(buckets) {
  return buckets.map((b) => ({ value: b.value, label: b.label }));
}

/** [{ label, value, color }] with zero entries dropped + palette colors. */
function toCategoryData(pairs) {
  return (pairs || [])
    .filter((p) => (p.value || 0) > 0)
    .map((p, i) => ({ ...p, color: PALETTE[i % PALETTE.length] }));
}

function sumValues(items) {
  return (items || []).reduce((total, item) => total + (item.value || 0), 0);
}

/* ---------------------------------------------------------
 * Section shell (loading / offline / error handling)
 * ------------------------------------------------------- */

function AnalyticsShell({ loading, offline, error, children }) {
  if (loading) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Building your charts…</Text>
        <Text style={styles.emptyChartText}>
          Fetching live data from the database.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.analyticsSection}>
      {offline ? (
        <View style={styles.offlineNote}>
          <Text style={styles.offlineNoteText}>
            ⚡ Charts show live database data — sign in with a backend account
            to populate them.
          </Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.offlineNote}>
          <Text style={styles.offlineNoteText}>
            Charts could not load: {error}
          </Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

/* ---------------------------------------------------------
 * ADMIN analytics (platform-wide)
 * ------------------------------------------------------- */

export function AdminAnalyticsSection() {
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      const session = await ensureSupabaseSession();

      if (!session) {
        if (alive) {
          setOffline(true);
          setLoading(false);
        }
        return;
      }

      const { supabase } = session;

      try {
        const [profilesRes, oppsRes, appsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, role, status, created_at"),
          supabase
            .from("opportunities")
            .select("id, status, created_at"),
          supabase
            .from("applications")
            .select("id, status, created_at, match_score"),
        ]);

        if (profilesRes.error) throw profilesRes.error;
        if (oppsRes.error) throw oppsRes.error;
        if (appsRes.error) throw appsRes.error;

        if (alive) {
          setData({
            profiles: profilesRes.data || [],
            opportunities: oppsRes.data || [],
            applications: appsRes.data || [],
          });
          setLoading(false);
        }
      } catch (err) {
        if (alive) {
          setError(err?.message || "unknown error");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const charts = useMemo(() => {
    if (!data) return null;

    const signups = bucketByDay(data.profiles, "created_at", 14);
    const appsPerDay = bucketByDay(data.applications, "created_at", 14);

    const rolePairs = toCategoryData([
      { label: "Students", value: data.profiles.filter((p) => p.role === "student").length },
      { label: "Alumni", value: data.profiles.filter((p) => p.role === "alumni").length },
      { label: "Businesses", value: data.profiles.filter((p) => p.role === "business").length },
      { label: "Admins", value: data.profiles.filter((p) => p.role === "admin").length },
    ]);

    const oppPairs = toCategoryData([
      { label: "Pending", value: data.opportunities.filter((o) => o.status === "pending").length },
      { label: "Approved", value: data.opportunities.filter((o) => o.status === "approved").length },
      { label: "Rejected", value: data.opportunities.filter((o) => o.status === "rejected").length },
      { label: "Closed", value: data.opportunities.filter((o) => o.status === "closed").length },
    ]);

    const pipeline = ["applied", "shortlisted", "interview", "hired", "rejected"].map(
      (status, i) => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value: data.applications.filter((a) => a.status === status).length,
        frontColor: PALETTE[i % PALETTE.length],
      })
    );

    const activeStudents = data.profiles.filter(
      (p) => p.status === "active" && (p.role === "student" || p.role === "alumni")
    ).length;

    const scores = data.applications
      .map((a) => a.match_score || 0)
      .filter((s) => s > 0);
    const avgMatch = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    return {
      totalUsers: data.profiles.length,
      totalJobs: data.opportunities.length,
      totalApps: data.applications.length,
      activeStudents,
      avgMatch,
      signups,
      appsPerDay,
      rolePairs,
      oppPairs,
      pipeline,
    };
  }, [data]);

  return (
    <AnalyticsShell
      loading={loading}
      offline={offline}
      error={error}
    >
      {charts ? <AdminCharts charts={charts} /> : null}
    </AnalyticsShell>
  );
}

function AdminCharts({ charts }) {
  const hasUsers = charts.totalUsers > 0;
  const hasJobs = charts.totalJobs > 0;
  const hasApps = charts.totalApps > 0;
  const lineData = toLineData(charts.signups);
  const appLineData = toLineData(charts.appsPerDay);

  return (
    <>
      <View style={styles.statRow}>
        <View style={[styles.statPill, { backgroundColor: "#EAF3FF" }]}>
          <Text style={styles.statPillValue}>{charts.totalUsers}</Text>
          <Text style={styles.statPillLabel}>Total users</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: "#E8F8EE" }]}>
          <Text style={styles.statPillValue}>{charts.activeStudents}</Text>
          <Text style={styles.statPillLabel}>Active students</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: "#FFF4E5" }]}>
          <Text style={styles.statPillValue}>{charts.totalJobs}</Text>
          <Text style={styles.statPillLabel}>Opportunities</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: "#F3EAFF" }]}>
          <Text style={styles.statPillValue}>{charts.avgMatch}%</Text>
          <Text style={styles.statPillLabel}>Avg match</Text>
        </View>
      </View>

      <ChartCard
        title="📈 New registrations — last 14 days"
        description="Accounts created per day across all roles."
      >
        {hasUsers ? (
          <LineChart
            data={lineData}
            areaChart
            curved
            isAnimated
            height={140}
            thickness={2.5}
            color={BLUE}
            startFillColor="rgba(32,138,239,0.35)"
            endFillColor="rgba(32,138,239,0.02)"
            startOpacity={0.9}
            endOpacity={0.1}
            spacing={28}
            initialSpacing={10}
            noOfSections={4}
            hideRules
            dataPointsColor={BLUE}
            dataPointsRadius={3}
            xAxisColor="#E5E7EB"
            yAxisColor="#E5E7EB"
            xAxisLabelTextStyle={styles.axisText}
            yAxisTextStyle={styles.axisText}
          />
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
        title="🥧 Community breakdown"
        description="Registered accounts by user type."
      >
        {hasUsers ? (
          <>
            <View style={styles.donutWrap}>
              <PieChart
                data={charts.rolePairs}
                donut
                radius={72}
                innerRadius={44}
                centerText={String(charts.totalUsers)}
                centerTextColor="#111827"
                focusOnPress={false}
              />
            </View>
            <Legend items={charts.rolePairs} />
          </>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
        title="🧾 Opportunity moderation pipeline"
        description="Listings by approval status (pending items await admin review)."
      >
        {hasJobs ? (
          <>
            <View style={styles.donutWrap}>
              <PieChart
                data={charts.oppPairs}
                donut
                radius={72}
                innerRadius={44}
                centerText={String(charts.totalJobs)}
                centerTextColor="#111827"
                focusOnPress={false}
              />
            </View>
            <Legend items={charts.oppPairs} />
          </>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
        title="🚀 Application pipeline"
        description="Every application grouped by its stage."
      >
        {hasApps ? (
          <BarChart
            data={charts.pipeline}
            isAnimated
            height={160}
            barWidth={30}
            spacing={16}
            roundedTop
            noOfSections={4}
            hideRules
            xAxisColor="#E5E7EB"
            yAxisColor="#E5E7EB"
            xAxisLabelTextStyle={styles.axisText}
            yAxisTextStyle={styles.axisText}
          />
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
                title="Applications per day"
        description="Graduate applications submitted over the last 14 days."
      >
        {hasApps ? (
          <LineChart
            data={appLineData}
            areaChart
            curved
            isAnimated
            height={140}
            thickness={2.5}
            color="#34C759"
            startFillColor="rgba(52,199,89,0.3)"
            endFillColor="rgba(52,199,89,0.02)"
            startOpacity={0.9}
            endOpacity={0.1}
            spacing={28}
            initialSpacing={10}
            noOfSections={4}
            hideRules
            dataPointsColor="#34C759"
            dataPointsRadius={3}
            xAxisColor="#E5E7EB"
            yAxisColor="#E5E7EB"
            xAxisLabelTextStyle={styles.axisText}
            yAxisTextStyle={styles.axisText}
          />
        ) : (
          <EmptyChart />
        )}
      </ChartCard>
    </>
  );
}

/* ---------------------------------------------------------
 * BUSINESS analytics (own hiring funnel)
 * ------------------------------------------------------- */

export function BusinessAnalyticsSection() {
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      const session = await ensureSupabaseSession();

      if (!session) {
        if (alive) {
          setOffline(true);
          setLoading(false);
        }
        return;
      }

      const { supabase, userId } = session;

      try {
        const jobsRes = await supabase
          .from("opportunities")
          .select("id, title, status, created_at")
          .eq("business_id", userId);

        if (jobsRes.error) throw jobsRes.error;

        const jobs = jobsRes.data || [];
        const jobIds = jobs.map((j) => j.id);

        let applications = [];
        if (jobIds.length > 0) {
          const appsRes = await supabase
            .from("applications")
            .select("id, status, created_at, opportunity_id, match_score")
            .in("opportunity_id", jobIds);

          if (appsRes.error) throw appsRes.error;
          applications = appsRes.data || [];
        }

        if (alive) {
          setData({ jobs, applications });
          setLoading(false);
        }
      } catch (err) {
        if (alive) {
          setError(err?.message || "unknown error");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const charts = useMemo(() => {
    if (!data) return null;

    const { jobs, applications } = data;

    // Applicants per job (top 6 by volume) — comparison bar chart.
    const perJob = jobs
      .map((job) => ({
        label: String(job.title || "Job").slice(0, 10),
        value: applications.filter((a) => a.opportunity_id === job.id).length,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((item, i) => ({
        ...item,
        frontColor: PALETTE[i % PALETTE.length],
      }));

    const statusPairs = toCategoryData(
      ["applied", "shortlisted", "interview", "hired", "rejected"].map((status) => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value: applications.filter((a) => a.status === status).length,
      }))
    );

    const jobStatusPairs = toCategoryData(
      ["pending", "approved", "rejected", "closed"].map((status) => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value: jobs.filter((j) => j.status === status).length,
      }))
    );

    const appsPerDay = bucketByDay(applications, "created_at", 14);

    return {
      totalJobs: jobs.length,
      totalApps: applications.length,
      perJob,
      statusPairs,
      jobStatusPairs,
      appsPerDay,
    };
  }, [data]);

  return (
    <AnalyticsShell
      loading={loading}
      offline={offline}
      error={error}
    >
      {charts ? <BusinessCharts charts={charts} /> : null}
    </AnalyticsShell>
  );
}

function BusinessCharts({ charts }) {
  const hasJobs = charts.totalJobs > 0;
  const hasApps = charts.totalApps > 0;
  const lineData = toLineData(charts.appsPerDay);

  return (
    <>
      <ChartCard
                title="Applicants per job"
        description="Which of your listings attract the most candidates."
      >
        {hasApps ? (
          <BarChart
            data={charts.perJob}
            isAnimated
            height={160}
            barWidth={26}
            spacing={14}
            roundedTop
            noOfSections={4}
            hideRules
            xAxisColor="#E5E7EB"
            yAxisColor="#E5E7EB"
            xAxisLabelTextStyle={styles.axisText}
            yAxisTextStyle={styles.axisText}
          />
        ) : (
          <EmptyChart label="No applications yet — they will chart here as graduates apply." />
        )}
      </ChartCard>

      <ChartCard
        title="🥧 Candidate pipeline"
        description="Your received applications by stage."
      >
        {hasApps ? (
          <>
            <View style={styles.donutWrap}>
              <PieChart
                data={charts.statusPairs}
                donut
                radius={72}
                innerRadius={44}
                centerText={String(charts.totalApps)}
                centerTextColor="#111827"
                focusOnPress={false}
              />
            </View>
            <Legend items={charts.statusPairs} />
          </>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
        title="📈 Applications — last 14 days"
        description="Daily application volume across your jobs."
      >
        {hasApps ? (
          <LineChart
            data={lineData}
            areaChart
            curved
            isAnimated
            height={140}
            thickness={2.5}
            color={BLUE}
            startFillColor="rgba(32,138,239,0.35)"
            endFillColor="rgba(32,138,239,0.02)"
            startOpacity={0.9}
            endOpacity={0.1}
            spacing={28}
            initialSpacing={10}
            noOfSections={4}
            hideRules
            dataPointsColor={BLUE}
            dataPointsRadius={3}
            xAxisColor="#E5E7EB"
            yAxisColor="#E5E7EB"
            xAxisLabelTextStyle={styles.axisText}
            yAxisTextStyle={styles.axisText}
          />
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
        title="🧾 My listing statuses"
        description="Moderation state of your own job posts."
      >
        {hasJobs ? (
          <>
            <View style={styles.donutWrap}>
              <PieChart
                data={charts.jobStatusPairs}
                donut
                radius={72}
                innerRadius={44}
                centerText={String(charts.totalJobs)}
                centerTextColor="#111827"
                focusOnPress={false}
              />
            </View>
            <Legend items={charts.jobStatusPairs} />
          </>
        ) : (
          <EmptyChart label="No jobs posted yet." />
        )}
      </ChartCard>
    </>
  );
}

/* ---------------------------------------------------------
 * STUDENT analytics (personal career dashboard)
 * ------------------------------------------------------- */

export function StudentAnalyticsSection() {
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      const session = await ensureSupabaseSession();

      if (!session) {
        if (alive) {
          setOffline(true);
          setLoading(false);
        }
        return;
      }

      const { supabase, userId } = session;

      try {
        const [appsRes, connRes, notifRes, profileRes, oppsRes] =
          await Promise.all([
            supabase
              .from("applications")
              .select("id, status, created_at, match_score")
              .eq("applicant_id", userId),
            supabase
              .from("connections")
              .select("id, requester_id, addressee_id, status, created_at")
              .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
            supabase
              .from("notifications")
              .select("id, type, created_at")
              .eq("user_id", userId),
            supabase
              .from("profiles")
              .select("id, skills")
              .eq("id", userId)
              .maybeSingle(),
            supabase
              .from("opportunities")
              .select("id, skills")
              .eq("status", "approved"),
          ]);

        if (appsRes.error) throw appsRes.error;
        if (connRes.error) throw connRes.error;
        if (notifRes.error) throw notifRes.error;
        if (profileRes.error) throw profileRes.error;
        if (oppsRes.error) throw oppsRes.error;

        if (alive) {
          setData({
            applications: appsRes.data || [],
            connections: connRes.data || [],
            notifications: notifRes.data || [],
            profile: profileRes.data || null,
            opportunities: oppsRes.data || [],
          });
          setLoading(false);
        }
      } catch (err) {
        if (alive) {
          setError(err?.message || "unknown error");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const charts = useMemo(() => {
    if (!data) return null;

    const { applications, connections, notifications, profile, opportunities } =
      data;

    const mySkills = Array.isArray(profile?.skills) ? profile.skills : [];

    const appsPerDay = bucketByDay(applications, "created_at", 14);
    const connPerDay = bucketByDay(connections, "created_at", 14);

    const pipeline = ["applied", "shortlisted", "interview", "hired", "rejected"].map(
      (status, i) => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value: applications.filter((a) => a.status === status).length,
        frontColor: PALETTE[i % PALETTE.length],
      })
    );

    const notifLabels = {
            opportunity_match: "Job match",
      application: "Application",
      connection: "Connection",
      comment: "💬 Comment",
      general: "🔔 Other",
    };
    const notifPairs = toCategoryData(
      Object.keys(notifLabels).map((type) => ({
        label: notifLabels[type],
        value: notifications.filter((n) => (n.type || "general") === type).length,
      }))
    );

    // Market demand: how often each skill appears across approved jobs.
    const demand = new Map();
    opportunities.forEach((opp) => {
      const skills = Array.isArray(opp?.skills) ? opp.skills : [];
      skills.forEach((skill) => {
        const key = String(skill || "").trim();
        if (!key) return;
        demand.set(key, (demand.get(key) || 0) + 1);
      });
    });

    const skillDemand = [...demand.entries()]
      .map(([label, value]) => ({
        label: label.length > 9 ? `${label.slice(0, 8)}…` : label,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((item, i) => ({
        ...item,
        frontColor: PALETTE[i % PALETTE.length],
      }));

    const demandedSkills = [...demand.keys()];
    const matchedSkills = mySkills.filter((skill) =>
      demandedSkills.includes(String(skill || "").trim())
    ).length;

    const scores = applications
      .map((a) => a.match_score || 0)
      .filter((s) => s > 0);
    const avgMatch = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    return {
      totalApps: applications.length,
      totalConnections: connections.filter((c) => c.status === "connected").length,
      avgMatch,
      matchedSkills,
      mySkillCount: mySkills.length,
      appsPerDay,
      connPerDay,
      pipeline,
      notifPairs,
      skillDemand,
    };
  }, [data]);

  return (
    <AnalyticsShell
      loading={loading}
      offline={offline}
      error={error}
    >
      {charts ? <StudentCharts charts={charts} /> : null}
    </AnalyticsShell>
  );
}

function StudentCharts({ charts }) {
  const hasApps = charts.totalApps > 0;
  const hasConnections = charts.connPerDay.some((b) => b.value > 0);
  const hasNotifs = charts.notifPairs.length > 0;
  const hasDemand = charts.skillDemand.length > 0;
  const appLineData = toLineData(charts.appsPerDay);
  const connLineData = toLineData(charts.connPerDay);

  return (
    <>
      <View style={styles.statRow}>
        <View style={[styles.statPill, { backgroundColor: "#EAF3FF" }]}>
          <Text style={styles.statPillValue}>{charts.totalApps}</Text>
          <Text style={styles.statPillLabel}>Applications sent</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: "#E8F8EE" }]}>
          <Text style={styles.statPillValue}>{charts.totalConnections}</Text>
          <Text style={styles.statPillLabel}>Connections</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: "#FFF4E5" }]}>
          <Text style={styles.statPillValue}>{charts.avgMatch}%</Text>
          <Text style={styles.statPillLabel}>Avg match score</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: "#F3E8FF" }]}>
          <Text style={styles.statPillValue}>
            {charts.matchedSkills}/{charts.mySkillCount}
          </Text>
          <Text style={styles.statPillLabel}>Skills in demand</Text>
        </View>
      </View>

      <ChartCard
        title="🚀 My application pipeline"
        description="Every job you applied to, grouped by its stage."
      >
        {hasApps ? (
          <BarChart
            data={charts.pipeline}
            isAnimated
            height={160}
            barWidth={30}
            spacing={16}
            roundedTop
            noOfSections={4}
            hideRules
            xAxisColor="#E5E7EB"
            yAxisColor="#E5E7EB"
            xAxisLabelTextStyle={styles.axisText}
            yAxisTextStyle={styles.axisText}
          />
        ) : (
          <EmptyChart label="No applications yet — apply to a job and watch this fill up." />
        )}
      </ChartCard>

      <ChartCard
        title="📈 My applications — last 14 days"
        description="How active you have been recently."
      >
        {hasApps ? (
          <LineChart
            data={appLineData}
            areaChart
            curved
            isAnimated
            height={140}
            thickness={2.5}
            color={BLUE}
            startFillColor="rgba(32,138,239,0.35)"
            endFillColor="rgba(32,138,239,0.02)"
            startOpacity={0.9}
            endOpacity={0.1}
            spacing={28}
            initialSpacing={10}
            noOfSections={4}
            hideRules
            dataPointsColor={BLUE}
            dataPointsRadius={3}
            xAxisColor="#E5E7EB"
            yAxisColor="#E5E7EB"
            xAxisLabelTextStyle={styles.axisText}
            yAxisTextStyle={styles.axisText}
          />
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
                title="Network growth — last 14 days"
        description="New connections you made."
      >
        {hasConnections ? (
          <LineChart
            data={connLineData}
            areaChart
            curved
            isAnimated
            height={140}
            thickness={2.5}
            color="#34C759"
            startFillColor="rgba(52,199,89,0.3)"
            endFillColor="rgba(52,199,89,0.02)"
            startOpacity={0.9}
            endOpacity={0.1}
            spacing={28}
            initialSpacing={10}
            noOfSections={4}
            hideRules
            dataPointsColor="#34C759"
            dataPointsRadius={3}
            xAxisColor="#E5E7EB"
            yAxisColor="#E5E7EB"
            xAxisLabelTextStyle={styles.axisText}
            yAxisTextStyle={styles.axisText}
          />
        ) : (
          <EmptyChart label="No connections yet — send a request from the Network tab." />
        )}
      </ChartCard>

      <ChartCard
                title="Activity received"
        description="Your notifications grouped by type."
      >
        {hasNotifs ? (
          <>
            <View style={styles.donutWrap}>
              <PieChart
                data={charts.notifPairs}
                donut
                radius={72}
                innerRadius={44}
                                centerText=""
                centerTextColor="#111827"
                focusOnPress={false}
              />
            </View>
            <Legend items={charts.notifPairs} />
          </>
        ) : (
          <EmptyChart label="No notifications yet." />
        )}
      </ChartCard>

      <ChartCard
        title="💼 Skills the market wants"
        description="Most requested skills across approved jobs — are yours on the list?"
      >
        {hasDemand ? (
          <BarChart
            data={charts.skillDemand}
            isAnimated
            height={160}
            barWidth={26}
            spacing={14}
            roundedTop
            noOfSections={4}
            hideRules
            xAxisColor="#E5E7EB"
            yAxisColor="#E5E7EB"
            xAxisLabelTextStyle={styles.axisText}
            yAxisTextStyle={styles.axisText}
          />
        ) : (
          <EmptyChart label="No approved jobs with skill tags yet." />
        )}
      </ChartCard>
    </>
  );
}

/* -------------------------------------------------------
 * STYLES
 * ------------------------------------------------------- */

const styles = StyleSheet.create({
  analyticsSection: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
    backgroundColor: "#F6F8FB",
  },

  /* Stat pills */
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  statPill: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  statPillValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  statPillLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },

  /* Chart cards */
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  chartTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  chartDescription: {
    marginTop: 2,
    marginBottom: 10,
    fontSize: 11,
    color: "#6B7280",
  },

  /* Empty chart placeholder */
  emptyChart: {
    height: 110,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },

  emptyChartIcon: {
    fontSize: 22,
    marginBottom: 4,
  },

  emptyChartText: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
  },

  /* Donut legend */
  legend: {
    marginTop: 10,
    gap: 6,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },

  legendLabel: {
    flex: 1,
    fontSize: 12,
    color: "#374151",
  },

  legendValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },

  donutWrap: {
    alignItems: "center",
  },

  axisText: {
    fontSize: 9,
    color: "#9CA3AF",
  },

  /* Offline banner */
  offlineNote: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  offlineNoteText: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
  },
});

