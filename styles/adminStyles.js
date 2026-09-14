import { StyleSheet } from "react-native";

const adminStyles = StyleSheet.create({
  /*
    ============================
    MAIN ADMIN LAYOUT
    ============================
  */

  adminLayout: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },

  adminMain: {
    flex: 1,
    minWidth: 0,
  },

  adminContent: {
    width: "100%",
    padding: 20,
    paddingBottom: 40,
  },

  /*
    ============================
    SIDEBAR / MOBILE NAV
    ============================
  */

  adminSidebar: {
    width: "100%",
    backgroundColor: "#111827",
    paddingTop: 50,
  },

  adminLogo: {
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  adminLogoMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  adminLogoMarkText: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
  },

  adminLogoTextContainer: {
    flex: 1,
  },

  adminLogoTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },

  adminLogoSubtitle: {
    color: "#9ca3af",
    fontSize: 11,
    marginTop: 3,
  },

  /*
    ============================
    ADMIN NAVIGATION
    ============================
  */

  adminNav: {
    padding: 14,
    gap: 6,
  },

  adminNavItem: {
    width: "100%",
    minHeight: 48,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  adminNavItemActive: {
    backgroundColor: "#ffffff",
  },

  adminNavIcon: {
    width: 28,
    textAlign: "center",
    color: "#cbd5e1",
    fontSize: 18,
    marginRight: 8,
  },

  adminNavIconActive: {
    color: "#111827",
  },

  adminNavText: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "600",
  },

  adminNavTextActive: {
    color: "#111827",
    fontWeight: "700",
  },

  /*
    ============================
    SIDEBAR USER
    ============================
  */

  adminSidebarBottom: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  adminUserMini: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  adminAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  adminAvatarText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },

  adminUserInfo: {
    flex: 1,
  },

  adminUserName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },

  adminUserEmail: {
    color: "#9ca3af",
    fontSize: 11,
    marginTop: 3,
  },

  adminLogoutButton: {
    width: "100%",
    minHeight: 45,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  adminLogoutIcon: {
    color: "#cbd5e1",
    fontSize: 17,
    marginRight: 8,
  },

  adminLogoutText: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "600",
  },

  /*
    ============================
    PAGE HEADER
    ============================
  */

  adminPageHeader: {
    marginBottom: 22,
  },

  adminPageHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  adminPageHeaderText: {
    flex: 1,
  },

  adminPageTitle: {
    color: "#111827",
    fontSize: 27,
    fontWeight: "900",
  },

  adminPageDescription: {
    marginTop: 7,
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 20,
  },

  /*
    ============================
    BUTTONS
    ============================
  */

  adminRefreshButton: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  adminRefreshText: {
    color: "#172033",
    fontSize: 13,
    fontWeight: "700",
  },

  adminCountBadge: {
    backgroundColor: "#111827",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 8,
  },

  adminCountBadgeText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },

  /*
    ============================
    WELCOME CARD
    ============================
  */

  adminWelcome: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
  },

  adminSmallLabel: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  adminWelcomeTitle: {
    color: "#111827",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 5,
    marginBottom: 3,
  },

  adminWelcomeText: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 19,
  },

  adminStatus: {
    alignSelf: "flex-start",
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  adminStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16a34a",
    marginRight: 8,
  },

  adminStatusText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "700",
  },

  /*
    ============================
    STATISTICS
    ============================
  */

  adminStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },

  adminStatCard: {
    flexGrow: 1,
    flexBasis: "46%",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 145,
  },

  adminStatIcon: {
    width: 43,
    height: 43,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  adminStatIconText: {
    fontSize: 19,
  },

  adminStatInfo: {
    flex: 1,
  },

  adminStatLabel: {
    color: "#6b7280",
    fontSize: 11,
    marginBottom: 4,
  },

  adminStatValue: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
  },

  /*
    ============================
    SECTIONS
    ============================
  */

  adminSection: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
  },

  adminSectionHeader: {
    marginBottom: 18,
  },

  adminSectionTitle: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "800",
  },

  adminSectionDescription: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  /*
    ============================
    ADMIN ACTIONS
    ============================
  */

  adminActionGrid: {
    gap: 12,
  },

  adminActionCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 11,
    padding: 18,
  },

  adminActionIcon: {
    fontSize: 25,
    marginBottom: 12,
  },

  adminActionTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 5,
  },

  adminActionDescription: {
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 18,
  },

  /*
    ============================
    OVERVIEW
    ============================
  */

  adminOverviewList: {
    width: "100%",
  },

  adminOverviewRow: {
    minHeight: 48,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f1f3",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  adminOverviewLabel: {
    color: "#6b7280",
    fontSize: 13,
    flex: 1,
  },

  adminOverviewValue: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
  },

  /*
    ============================
    TOOLBAR
    ============================
  */

  adminToolbar: {
    marginBottom: 18,
    gap: 12,
  },

  adminSearch: {
    width: "100%",
    minHeight: 48,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },

  adminSearchIcon: {
    color: "#6b7280",
    fontSize: 19,
    marginRight: 5,
  },

  adminSearchInput: {
    flex: 1,
    color: "#111827",
    fontSize: 13,
    paddingVertical: 10,
  },

  adminSelect: {
    width: "100%",
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    borderRadius: 9,
    paddingHorizontal: 13,
    color: "#172033",
    justifyContent: "center",
  },

  /*
    ============================
    TABLE
    ============================
  */

  adminTableWrapper: {
    width: "100%",
  },

  adminTable: {
    width: "100%",
  },

  adminTableHeader: {
    backgroundColor: "#f9fafb",
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  adminTableHeaderText: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  adminTableRow: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f1f3",
    flexDirection: "row",
    alignItems: "center",
  },

  adminTableCell: {
    color: "#4b5563",
    fontSize: 13,
    flex: 1,
  },

  adminTableUser: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1.5,
  },

  adminTableUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  adminTableUserAvatarText: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "800",
  },

  adminTableUserInfo: {
    flex: 1,
  },

  adminTableUserName: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
  },

  adminTableUserEmail: {
    color: "#6b7280",
    fontSize: 11,
    marginTop: 3,
  },

  /*
    ============================
    TYPE BADGES
    ============================
  */

  adminTypeBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "#f3f4f6",
  },

  adminTypeBadgeText: {
    color: "#374151",
    fontSize: 10,
    fontWeight: "800",
  },

  adminBusinessBadge: {
    backgroundColor: "#eef2ff",
  },

  adminBusinessBadgeText: {
    color: "#4338ca",
  },

  adminAdminBadge: {
    backgroundColor: "#f3f4f6",
  },

  adminAdminBadgeText: {
    color: "#111827",
  },

  adminSeekerBadge: {
    backgroundColor: "#ecfdf5",
  },

  adminSeekerBadgeText: {
    color: "#047857",
  },

  adminPendingBadge: {
    backgroundColor: "#fffbeb",
  },

  adminPendingBadgeText: {
    color: "#92400e",
  },

  adminShortlistedBadge: {
    backgroundColor: "#ecfdf5",
  },

  adminShortlistedBadgeText: {
    color: "#047857",
  },

  adminRejectedBadge: {
    backgroundColor: "#fef2f2",
  },

  adminRejectedBadgeText: {
    color: "#b91c1c",
  },

  /*
    ============================
    DELETE
    ============================
  */

  adminDeleteButton: {
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#ffffff",
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  adminDeleteText: {
    color: "#b91c1c",
    fontSize: 11,
    fontWeight: "700",
  },

  /*
    ============================
    JOB GRID
    ============================
  */

  adminJobGrid: {
    gap: 14,
  },

  adminJobCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 13,
    padding: 18,
  },

  adminJobCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  adminJobIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },

  adminJobIconText: {
    fontSize: 20,
  },

  adminActiveBadge: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },

  adminActiveBadgeText: {
    color: "#047857",
    fontSize: 10,
    fontWeight: "800",
  },

  adminJobTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "800",
  },

  adminJobCompany: {
    color: "#4b5563",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 5,
    marginBottom: 13,
  },

  adminJobMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  adminJobMetaItem: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f0f1f3",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },

  adminJobMetaText: {
    color: "#6b7280",
    fontSize: 10,
  },

  adminJobDescription: {
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 15,
    marginBottom: 15,
  },

  adminJobFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f0f1f3",
    paddingTop: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  adminJobFooterText: {
    color: "#111827",
    fontSize: 11,
    fontWeight: "700",
  },

  /*
    ============================
    EMPTY STATE
    ============================
  */

  adminEmpty: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  adminEmptyIcon: {
    width: 55,
    height: 55,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  adminEmptyIconText: {
    fontSize: 24,
  },

  adminEmptyTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  adminEmptyText: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    textAlign: "center",
  },
});

export default adminStyles;