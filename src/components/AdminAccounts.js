import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

function AdminAccounts({ user }) {
  const [accounts, setAccounts] = useState([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // =====================================
  // LOAD ADMIN ACCOUNTS
  // =====================================

  async function loadAccounts() {
    try {
      const saved = await AsyncStorage.getItem(
        "careerAI_accounts"
      );

      const parsed = saved
        ? JSON.parse(saved)
        : [];

      setAccounts(
        Array.isArray(parsed)
          ? parsed.filter(
              (account) =>
                account.role === "admin"
            )
          : []
      );
    } catch (error) {
      console.log(
        "Error loading admin accounts:",
        error
      );

      setAccounts([]);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  // =====================================
  // ONLY MAIN ADMIN CAN ACCESS
  // =====================================

  if (
    user?.role !== "admin" ||
    user?.adminLevel !== "main"
  ) {
    return (
      <View style={styles.adminPage}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            Access Restricted
          </Text>

          <Text style={styles.emptyText}>
            Only the Main Administrator can
            manage admin accounts.
          </Text>
        </View>
      </View>
    );
  }

  // =====================================
  // CREATE ADMIN
  // =====================================

  async function createAdmin() {
    setError("");
    setMessage("");

    const cleanName = name.trim();
    const cleanEmail = email
      .trim()
      .toLowerCase();

    if (
      !cleanName ||
      !cleanEmail ||
      !password
    ) {
      setError(
        "Please complete all fields."
      );

      return;
    }

    if (password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );

      return;
    }

    let allAccounts = [];

    try {
      const saved =
        await AsyncStorage.getItem(
          "careerAI_accounts"
        );

      allAccounts = saved
        ? JSON.parse(saved)
        : [];

      if (!Array.isArray(allAccounts)) {
        allAccounts = [];
      }
    } catch (error) {
      console.log(
        "Error reading accounts:",
        error
      );

      allAccounts = [];
    }

    const exists = allAccounts.some(
      (account) =>
        account.email
          ?.trim()
          .toLowerCase() === cleanEmail
    );

    if (exists) {
      setError(
        "An account with this email already exists."
      );

      return;
    }

    const newAdmin = {
      name: cleanName,
      email: cleanEmail,
      password: password,
      role: "admin",
      adminLevel: "admin",
    };

    allAccounts.push(newAdmin);

    try {
      await AsyncStorage.setItem(
        "careerAI_accounts",
        JSON.stringify(allAccounts)
      );

      setName("");
      setEmail("");
      setPassword("");

      setMessage(
        "Admin account created successfully."
      );

      await loadAccounts();
    } catch (error) {
      console.log(
        "Error saving admin:",
        error
      );

      setError(
        "Could not save the admin account."
      );
    }
  }

  // =====================================
  // DELETE ADMIN
  // =====================================

  function deleteAdmin(adminEmail) {
    if (
      adminEmail ===
      "admin@careerai.com"
    ) {
      Alert.alert(
        "Cannot Delete",
        "The Main Administrator cannot be deleted."
      );

      return;
    }

    Alert.alert(
      "Delete Admin",
      "Delete this admin account?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            let allAccounts = [];

            try {
              const saved =
                await AsyncStorage.getItem(
                  "careerAI_accounts"
                );

              allAccounts = saved
                ? JSON.parse(saved)
                : [];
            } catch (error) {
              console.log(
                "Error reading accounts:",
                error
              );

              allAccounts = [];
            }

            const updated =
              allAccounts.filter(
                (account) =>
                  account.email !==
                  adminEmail
              );

            try {
              await AsyncStorage.setItem(
                "careerAI_accounts",
                JSON.stringify(updated)
              );

              await loadAccounts();

              setMessage(
                "Admin account deleted."
              );
            } catch (error) {
              console.log(
                "Error deleting admin:",
                error
              );

              setError(
                "Could not delete the admin account."
              );
            }
          },
        },
      ]
    );
  }

  // =====================================
  // UI
  // =====================================

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        style={styles.adminPage}
        contentContainerStyle={
          styles.pageContent
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}

        <View
          style={styles.sectionHeader}
        >
          <View
            style={styles.headerText}
          >
            <Text
              style={styles.eyebrow}
            >
              MAIN ADMIN
            </Text>

            <Text
              style={styles.pageTitle}
            >
              Admin Accounts
            </Text>

            <Text
              style={styles.pageDescription}
            >
              Create and manage Career
              Next Step administrators.
            </Text>
          </View>

          <View
            style={styles.countBadge}
          >
            <Text
              style={styles.countText}
            >
              {accounts.length} admins
            </Text>
          </View>
        </View>

        {/* ERROR */}

        {error ? (
          <View
            style={styles.errorMessage}
          >
            <Text
              style={styles.errorText}
            >
              {error}
            </Text>
          </View>
        ) : null}

        {/* SUCCESS */}

        {message ? (
          <View
            style={styles.successMessage}
          >
            <Text
              style={styles.successText}
            >
              {message}
            </Text>
          </View>
        ) : null}

        {/* TWO SECTIONS */}

        <View style={styles.adminGrid}>

          {/* CREATE ADMIN */}

          <View
            style={styles.section}
          >
            <Text
              style={styles.sectionTitle}
            >
              Create Admin Account
            </Text>

            <Text
              style={styles.formDescription}
            >
              Only the Main Administrator
              can create additional
              administrators.
            </Text>

            <View
              style={styles.createForm}
            >
              {/* NAME */}

              <Text
                style={styles.label}
              >
                Admin name
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#8a94a6"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              {/* EMAIL */}

              <Text
                style={styles.label}
              >
                Email address
              </Text>

              <TextInput
                style={styles.input}
                placeholder="admin@example.com"
                placeholderTextColor="#8a94a6"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* PASSWORD */}

              <Text
                style={styles.label}
              >
                Password
              </Text>

              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor="#8a94a6"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              {/* CREATE BUTTON */}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed &&
                    styles.buttonPressed,
                ]}
                onPress={createAdmin}
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Create Admin
                </Text>
              </Pressable>
            </View>
          </View>

          {/* EXISTING ADMINS */}

          <View
            style={styles.section}
          >
            <Text
              style={styles.sectionTitle}
            >
              Existing Admins
            </Text>

            <Text
              style={styles.formDescription}
            >
              Administrators who can access
              the Admin Dashboard.
            </Text>

            <View
              style={styles.adminList}
            >
              {accounts.length === 0 ? (
                <View
                  style={styles.noAdmins}
                >
                  <Text
                    style={styles.noAdminsText}
                  >
                    No admin accounts found.
                  </Text>
                </View>
              ) : (
                accounts.map((account) => (
                  <View
                    style={styles.adminCard}
                    key={account.email}
                  >
                    {/* AVATAR */}

                    <View
                      style={styles.avatar}
                    >
                      <Text
                        style={
                          styles.avatarText
                        }
                      >
                        {(
                          account.name ||
                          "A"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>

                    {/* INFORMATION */}

                    <View
                      style={styles.adminInfo}
                    >
                      <Text
                        style={
                          styles.adminName
                        }
                      >
                        {account.name}
                      </Text>

                      <Text
                        style={
                          styles.adminEmail
                        }
                      >
                        {account.email}
                      </Text>

                      <Text
                        style={
                          styles.adminLevel
                        }
                      >
                        {account.adminLevel ===
                        "main"
                          ? "Main Administrator"
                          : "Administrator"}
                      </Text>
                    </View>

                    {/* DELETE */}

                    {account.adminLevel !==
                    "main" ? (
                      <Pressable
                        style={({ pressed }) => [
                          styles.deleteButton,
                          pressed &&
                            styles.buttonPressed,
                        ]}
                        onPress={() =>
                          deleteAdmin(
                            account.email
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
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },

  adminPage: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },

  pageContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // =====================================
  // HEADER
  // =====================================

  sectionHeader: {
    marginBottom: 20,
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: 1,
    marginBottom: 6,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 6,
  },

  pageDescription: {
    fontSize: 14,
    color: "#687386",
    lineHeight: 21,
  },

  countBadge: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e8eefc",
  },

  countText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
  },

  // =====================================
  // MESSAGES
  // =====================================

  errorMessage: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 13,
    marginBottom: 15,
  },

  errorText: {
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: "600",
  },

  successMessage: {
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 10,
    padding: 13,
    marginBottom: 15,
  },

  successText: {
    color: "#15803d",
    fontSize: 14,
    fontWeight: "600",
  },

  // =====================================
  // GRID
  // =====================================

  adminGrid: {
    gap: 18,
  },

  // =====================================
  // SECTION
  // =====================================

  section: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e4e8ef",
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 7,
  },

  formDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#687386",
    marginBottom: 20,
  },

  // =====================================
  // FORM
  // =====================================

  createForm: {
    width: "100%",
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#344054",
    marginBottom: 7,
    marginTop: 4,
  },

  input: {
    width: "100%",
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#d5dae3",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    paddingHorizontal: 13,
    fontSize: 15,
    color: "#172033",
    marginBottom: 14,
  },

  primaryButton: {
    minHeight: 48,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginTop: 5,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  buttonPressed: {
    opacity: 0.7,
  },

  // =====================================
  // ADMIN LIST
  // =====================================

  adminList: {
    gap: 12,
  },

  adminCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e4e8ef",
    borderRadius: 12,
    padding: 13,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },

  adminInfo: {
    flex: 1,
    minWidth: 0,
  },

  adminName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 3,
  },

  adminEmail: {
    fontSize: 12,
    color: "#687386",
    marginBottom: 4,
  },

  adminLevel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
  },

  deleteButton: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    marginLeft: 8,
  },

  deleteButtonText: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "800",
  },

  // =====================================
  // EMPTY
  // =====================================

  noAdmins: {
    padding: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
  },

  noAdminsText: {
    color: "#687386",
    fontSize: 14,
  },

  // =====================================
  // ACCESS RESTRICTED
  // =====================================

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 25,
    borderWidth: 1,
    borderColor: "#e4e8ef",
    margin: 20,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 10,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#687386",
  },
});

export default AdminAccounts;