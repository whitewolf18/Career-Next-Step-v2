 import { useEffect, useState } from "react";

import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import useNotifications from "../lib/useNotifications";

/*
  NOTIFICATION BELL (brief 2.8 — real-time notifications)
  Self-contained: owns its own Supabase Realtime subscription
  through useNotifications, so it can be dropped into any
  dashboard topbar with <NotificationBell />. Rows inserted by
  database triggers (job matches, applications, connection
  requests, comments) arrive over the WebSocket instantly.
*/

const TYPE_ICONS = {
  opportunity_match: "",
  application: "",
  connection: "",
  comment: "",
  general: "",
};

function timeAgo(iso) {
  if (!iso) {
    return "";
  }

  const seconds = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(iso).getTime()) / 1000
    )
  );

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    ready,
    markRead,
    markAllRead,
  } = useNotifications();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    return () => setOpen(false);
  }, []);

  async function handleItemPress(item) {
    if (!item.read_at) {
      await markRead(item.id);
    }
  }

  async function handleMarkAll() {
    await markAllRead();
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [
          styles.bell,
          pressed && styles.bellPressed,
        ]}
        onPress={() => setOpen(true)}
      >
                <Text style={styles.bellIcon}>
          🔔
        </Text>

        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9
                ? "9+"
                : unreadCount}
            </Text>
          </View>
        )}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            style={styles.overlayBackdrop}
            onPress={() => setOpen(false)}
          />

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>
                Notifications
              </Text>

              <View
                style={styles.panelHeaderActions}
              >
                {unreadCount > 0 && (
                  <Pressable
                    style={styles.markAllButton}
                    onPress={handleMarkAll}
                  >
                    <Text
                      style={styles.markAllText}
                    >
                      Mark all read
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => setOpen(false)}
                >
                  <Text
                    style={styles.closeText}
                  >
                    ✕
                  </Text>
                </Pressable>
              </View>
            </View>

            <ScrollView
              style={styles.list}
              contentContainerStyle={
                styles.listContent
              }
            >
              {!ready ? (
                <Text style={styles.emptyText}>
                  Loading…
                </Text>
              ) : notifications.length === 0 ? (
                <Text style={styles.emptyText}>
                  No notifications yet.
                  Matches, applications and
                  connection requests will
                  appear here in real time.
                </Text>
              ) : (
                notifications.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.item,
                      !item.read_at &&
                        styles.itemUnread,
                    ]}
                    onPress={() =>
                      handleItemPress(item)
                    }
                  >
                    <Text
                      style={styles.itemIcon}
                    >
                      {TYPE_ICONS[
                        item.type
                      ] || TYPE_ICONS.general}
                    </Text>

                    <View style={styles.itemBody}>
                      <Text
                        style={[
                          styles.itemTitle,
                          !item.read_at &&
                            styles.itemTitleUnread,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title ||
                          "Notification"}
                      </Text>

                      {!!item.body && (
                        <Text
                          style={
                            styles.itemMessage
                          }
                          numberOfLines={2}
                        >
                          {item.body}
                        </Text>
                      )}

                      <Text
                        style={styles.itemTime}
                      >
                        {timeAgo(
                          item.created_at
                        )}
                      </Text>
                    </View>

                    {!item.read_at && (
                      <View style={styles.dot} />
                    )}
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },

  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  bellPressed: {
    backgroundColor: "#E2E8F0",
  },

  bellIcon: {
    fontSize: 20,
  },

  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 60,
  },

  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  panel: {
    width: "92%",
    maxWidth: 480,
    maxHeight: "70%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },

  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  panelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  panelHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#E0F2FE",
  },

  markAllText: {
    color: "#208AEF",
    fontSize: 12,
    fontWeight: "600",
  },

  closeText: {
    fontSize: 16,
    color: "#64748B",
  },

  list: {
    flexGrow: 0,
  },

  listContent: {
    paddingBottom: 8,
  },

  emptyText: {
    padding: 24,
    textAlign: "center",
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
  },

  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  itemUnread: {
    backgroundColor: "#F0F9FF",
  },

  itemIcon: {
    fontSize: 20,
    marginRight: 10,
    marginTop: 2,
  },

  itemBody: {
    flex: 1,
  },

  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },

  itemTitleUnread: {
    color: "#0F172A",
    fontWeight: "700",
  },

  itemMessage: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 17,
  },

  itemTime: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#208AEF",
    marginLeft: 8,
    marginTop: 6,
  },
});
