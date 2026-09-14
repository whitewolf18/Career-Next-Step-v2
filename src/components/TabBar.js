import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Circle, G, Line } from "react-native-svg";
import { Brand } from "../theme/brand";

export default function TabBar({ currentPage, onSelectPage }) {
  const tabs = [
    { id: "Dashboard", label: "Home", icon: "home" },
    { id: "Recommended Jobs", label: "Jobs", icon: "briefcase" },
    { id: "Applications", label: "Apps", icon: "paper" },
    { id: "Messages", label: "Chat", icon: "chat" },
    { id: "My Profile", label: "Profile", icon: "user" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {tabs.map((tab) => {
          const isActive = currentPage === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onSelectPage(tab.id)}
              android_ripple={{ color: Brand.primarySoft }}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Icon type={tab.icon} active={isActive} />
              </Svg>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Icon({ type, active }) {
  const color = active ? Brand.primary : Brand.muted;

  if (type === "home") {
    return (
      <G fill={color}>
        <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </G>
    );
  }
  if (type === "briefcase") {
    return (
      <G fill={color}>
        <Path d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a1 1 0 00-1 1v10a2 2 0 002 2h16a2 2 0 002-2V8a1 1 0 00-1-1zm-1 4H5V5h14v6z" />
      </G>
    );
  }
  if (type === "paper") {
    return (
      <G fill={color}>
        <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <Path d="M14 2v6h6" stroke={color} strokeWidth={2} />
        <Path d="M16 13H8m8 4H8m2 0h2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </G>
    );
  }
  if (type === "chat") {
    return (
      <G fill={color}>
        <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
      </G>
    );
  }
  if (type === "user") {
    return (
      <G fill={color}>
        <Circle cx="12" cy="8" r="4" />
        <Path
          d="M20 21a8 8 0 11-16 0"
          stroke={color}
          strokeWidth={2}
          fill="none"
        />
      </G>
    );
  }

  // Fallback: generic dot
  return (
    <G fill={color}>
      <Circle cx="12" cy="12" r="8" />
    </G>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Brand.surface,
    borderTopWidth: 1,
    borderTopColor: Brand.line,
    elevation: 8,
    zIndex: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingBottom: 26,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 6,
    minHeight: 48,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Brand.primary,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: Brand.muted,
    marginTop: 4,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  labelActive: {
    color: Brand.primary,
  },
});
