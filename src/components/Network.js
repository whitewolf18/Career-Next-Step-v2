import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCallback, useEffect, useState } from "react";

import { getSupabase } from "../lib/supabase";
import {
  displayName,
  ensureSupabaseSession,
  roleLabel,
} from "../lib/social";

/*
  NETWORK — CONNECTIONS (brief 2.4)
  =========================================================
  Self-contained connections screen:
    • Discover  — browse the community directory and send
                  connection requests (a DB trigger notifies
                  the recipient in real time).
    • Requests  — accept / decline incoming requests and
                  see the ones you sent.
    • Connected — your accepted connections.

  All reads/writes go through RLS-protected tables:
    profiles (the directory) + connections (the graph).
*/

  const TABS = [
  { key: "discover", label: "Discover", icon: "" },
  { key: "requests", label: "Requests", icon: "" },
  { key: "connected", label: "Connected", icon: "" },
];

export default function Network() {
  const [tab, setTab] = useState("discover");
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [me, setMe] = useState(null);
  const [directory, setDirectory] = useState([]);
  const [links, setLinks] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [reloadFlag, setReloadFlag] = useState(0);

  // ---- Data loading ------------------------------------

  const load = useCallback(async () => {
    setLoading(true);

    const session = await ensureSupabaseSession();
    if (!session) {
      setOffline(true);
      setMe(null);
      setDirectory([]);
      setLinks([]);
      setLoading(false);
      return;
    }

    setOffline(false);
    const { supabase, userId } = session;

    try {
      const [profileRes, peopleRes, linksRes] =
        await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, full_name, company_name, role, headline, programme, campus, avatar_url"
            )
            .eq("id", userId)
            .maybeSingle(),

          supabase
            .from("profiles")
            .select(
              "id, full_name, company_name, role, headline, programme, campus, avatar_url"
            )
            .neq("id", userId)
            .order("created_at", {
              ascending: false,
            })
            .limit(50),

          supabase
            .from("connections")
            .select(
              `id, requester_id, addressee_id, status, created_at,
               requester:profiles!connections_requester_id_fkey(id, full_name, company_name, role, headline, avatar_url),
               addressee:profiles!connections_addressee_id_fkey(id, full_name, company_name, role, headline, avatar_url)`
            )
            .or(
              `requester_id.eq.${userId},addressee_id.eq.${userId}`
            )
            .order("created_at", {
              ascending: false,
            }),
        ]);

      setMe(profileRes.data || null);
      setDirectory(peopleRes.data || []);
      setLinks(linksRes.data || []);
    } catch {
      // Keep existing state; the UI shows empty lists.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadFlag]);

  // ---- Live updates ------------------------------------
  // Unfiltered channel: Realtime enforces the connections
  // RLS policies against this subscriber's JWT, so only the
  // graph edges this user may see are ever delivered.
  useEffect(() => {
    let channel = null;
    let active = true;

    async function subscribe() {
      const session = await ensureSupabaseSession();
      if (!session || !active) return;

      channel = session.supabase
        .channel("network-connections")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "connections",
          },
          () => setReloadFlag((f) => f + 1)
        )
        .subscribe();
    }

    subscribe();

    return () => {
      active = false;
      if (channel) {
        const supabase = getSupabase();
        if (supabase) {
          supabase.removeChannel(channel);
        }
      }
    };
  }, []);

  // ---- Relationship status per person -------------------

  function linkFor(otherId) {
    return (
      links.find(
        (link) =>
          link.requester_id === otherId ||
          link.addressee_id === otherId
      ) || null
    );
  }

  function statusFor(otherId) {
    const link = linkFor(otherId);
    if (!link) return "none";
    if (link.status === "connected") {
      return "connected";
    }
    if (link.status === "pending") {
      return link.requester_id === otherId
        ? "incoming"
        : "outgoing";
    }
    return "declined";
  }

  const incoming = links.filter(
    (link) =>
      link.status === "pending" &&
      link.requester_id !== me?.id
  );

  const outgoing = links.filter(
    (link) =>
      link.status === "pending" &&
      link.requester_id === me?.id
  );

  const connected = links.filter(
    (link) => link.status === "connected"
  );

  // ---- Actions ------------------------------------------

  async function sendRequest(person) {
    const session = await ensureSupabaseSession();
    if (!session) return;

    setBusyId(person.id);

    const { supabase, userId } = session;
    const link = linkFor(person.id);

    try {
      if (
        link &&
        link.status === "declined" &&
        link.requester_id === userId
      ) {
        // Re-open an edge I previously sent.
        const { error } = await supabase
          .from("connections")
          .update({ status: "pending" })
          .eq("id", link.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("connections")
          .insert({
            requester_id: userId,
            addressee_id: person.id,
            status: "pending",
          });

        if (error) throw error;
      }

      setReloadFlag((f) => f + 1);
    } catch (error) {
      Alert.alert(
        "Could not send request",
        error?.message || "Please try again."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function respondToLink(link, status) {
    const session = await ensureSupabaseSession();
    if (!session) return;

    setBusyId(link.id);

    try {
      const { error } = await session.supabase
        .from("connections")
        .update({ status })
        .eq("id", link.id);

      if (error) throw error;

      setReloadFlag((f) => f + 1);
    } catch (error) {
      Alert.alert(
        "Could not update request",
        error?.message || "Please try again."
      );
    } finally {
      setBusyId(null);
    }
  }

  // ---- Render --------------------------------------------

  function renderAvatar(label) {
    return (
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(label || "U")
            .charAt(0)
            .toUpperCase()}
        </Text>
      </View>
    );
  }

  function actionButtonFor(person) {
    const status = statusFor(person.id);
    const busy = busyId === person.id;

    if (status === "connected") {
      return (
        <View style={styles.connectedPill}>
          <Text style={styles.connectedPillText}>
                        Connected
          </Text>
        </View>
      );
    }

    if (status === "incoming") {
      const link = linkFor(person.id);
      return (
        <View style={styles.buttonRow}>
          <Pressable
            style={styles.primaryButton}
            disabled={busy}
            onPress={() =>
              respondToLink(
                link,
                "connected"
              )
            }
          >
            <Text style={styles.primaryButtonText}>
              {busy ? "…" : "Accept"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            disabled={busy}
            onPress={() =>
              respondToLink(link, "declined")
            }
          >
            <Text style={styles.secondaryButtonText}>
              Decline
            </Text>
          </Pressable>
        </View>
      );
    }

    if (status === "outgoing") {
      return (
        <View style={styles.pendingPill}>
          <Text style={styles.pendingPillText}>
            ⏳ Request sent
          </Text>
        </View>
      );
    }

    return (
      <Pressable
        style={[
          styles.primaryButton,
          busy && styles.buttonDisabled,
        ]}
        disabled={busy}
        onPress={() => sendRequest(person)}
      >
        <Text style={styles.primaryButtonText}>
          {busy
            ? "Sending…"
            : "+ Connect"}
        </Text>
      </Pressable>
    );
  }

  function renderPerson(person) {
    const label =
      displayName(person);

    return (
      <View
        style={styles.card}
        key={person.id}
      >
        <View style={styles.cardTop}>
          {renderAvatar(label)}

          <View style={styles.cardInfo}>
            <Text
              style={styles.cardName}
              numberOfLines={1}
            >
              {label}
            </Text>

            <Text
              style={styles.cardRole}
            >
              {roleLabel(person.role)}
            </Text>

            <Text
              style={styles.cardSub}
              numberOfLines={2}
            >
              {person.headline ||
                person.programme ||
                "Career Next Step member"}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          {actionButtonFor(person)}
        </View>
      </View>
    );
  }

  function renderRequestRow(link, isIncoming) {
    const person = isIncoming
      ? link.requester
      : link.addressee;
    const label =
      displayName(person || {});
    const busy = busyId === link.id;

    return (
      <View
        style={styles.card}
        key={link.id}
      >
        <View style={styles.cardTop}>
          {renderAvatar(label)}

          <View style={styles.cardInfo}>
            <Text
              style={styles.cardName}
              numberOfLines={1}
            >
              {label}
            </Text>

            <Text
              style={styles.cardRole}
            >
              {roleLabel(person?.role)}
            </Text>
          </View>
        </View>

        {isIncoming ? (
          <View style={styles.buttonRow}>
            <Pressable
              style={styles.primaryButton}
              disabled={busy}
              onPress={() =>
                respondToLink(
                  link,
                  "connected"
                )
              }
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {busy
                  ? "…"
                  : "Accept"}
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.secondaryButton
              }
              disabled={busy}
              onPress={() =>
                respondToLink(
                  link,
                  "declined"
                )
              }
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                Decline
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.pendingPill}>
            <Text
              style={styles.pendingPillText}
            >
              ⏳ Waiting for a
              response
            </Text>
          </View>
        )}
      </View>
    );
  }

  // ---- Main render ----------------------------------------

  function renderList(items, emptyText, renderer) {
    if (items.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>
            🌱
          </Text>

          <Text style={styles.emptyText}>
            {emptyText}
          </Text>
        </View>
      );
    }

    return <View>{items.map(renderer)}</View>;
  }

  function renderBody() {
    if (loading) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Loading your network…
          </Text>
        </View>
      );
    }

    if (offline) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>
            📡
          </Text>

          <Text style={styles.emptyText}>
            Sign in to build your network.
          </Text>
        </View>
      );
    }

    if (tab === "discover") {
      return renderList(
        directory,
        "No other members yet — invite classmates to join!",
        renderPerson
      );
    }

    if (tab === "requests") {
      return (
        <>
          {incoming.length > 0 && (
            <Text style={styles.groupLabel}>
              Received ({incoming.length})
            </Text>
          )}

          {renderList(
            incoming,
            "No incoming requests.",
            (link) =>
              renderRequestRow(link, true)
          )}

          {outgoing.length > 0 && (
            <Text
              style={styles.groupLabel}
            >
              Sent ({outgoing.length})
            </Text>
          )}

          {outgoing.map((link) =>
            renderRequestRow(link, false)
          )}
        </>
      );
    }

    return renderList(
      connected,
      "No connections yet — head to Discover and send your first request.",
      (link) =>
        renderRequestRow(link, false)
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.content
      }
    >
      <Text style={styles.heading}>
        My Network
      </Text>

      <Text style={styles.subheading}>
        Connect with students, alumni and
        businesses across Richfield.
      </Text>

      <View style={styles.tabRow}>
        {TABS.map((item) => (
          <Pressable
            key={item.key}
            style={[
              styles.tab,
              tab === item.key &&
                styles.tabActive,
            ]}
            onPress={() => setTab(item.key)}
          >
            <Text
              style={[
                styles.tabText,
                tab === item.key &&
                  styles.tabTextActive,
              ]}
            >
              {item.icon} {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {renderBody()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F8FC",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F1B33",
  },
  subheading: {
    marginTop: 4,
    fontSize: 13,
    color: "#5B6B85",
    marginBottom: 14,
  },
  tabRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3E8F2",
    alignItems: "center",
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: "#208AEF",
    borderColor: "#208AEF",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5B6B85",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F1B33",
    marginTop: 6,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E9EDF5",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E1EEFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#208AEF",
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F1B33",
  },
  cardRole: {
    fontSize: 12,
    fontWeight: "600",
    color: "#208AEF",
    marginTop: 1,
  },
  cardSub: {
    fontSize: 12,
    color: "#5B6B85",
    marginTop: 2,
  },
  cardActions: {
    marginTop: 12,
  },
  buttonRow: {
    flexDirection: "row",
  },
  primaryButton: {
    backgroundColor: "#208AEF",
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#C9D4E5",
    alignItems: "center",
    flex: 1,
  },
  secondaryButtonText: {
    color: "#3A4761",
    fontSize: 13,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  connectedPill: {
    backgroundColor: "#E8F7EE",
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: "center",
  },
  connectedPillText: {
    color: "#1D8A47",
    fontSize: 13,
    fontWeight: "700",
  },
  pendingPill: {
    backgroundColor: "#FFF6E5",
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: "center",
  },
  pendingPillText: {
    color: "#B07A1A",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9EDF5",
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#5B6B85",
    textAlign: "center",
  },
});


