import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getSupabase,
  supabaseErrorMessage,
} from "../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandMark from "./BrandMark";
import { Brand, BrandShadow } from "../theme/brand";

const MAIN_ADMIN_EMAIL = "admin@careerai.com";
const MAIN_ADMIN_PASSWORD = "CareerAIAdmin123";

export default function Login({
  onLogin,
  onRegister,
  onBack,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loginMode, setLoginMode] = useState("normal");
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  async function getAccounts() {
    let accounts = [];

    try {
      const savedAccounts = await AsyncStorage.getItem(
        "careerAI_accounts"
      );

      if (savedAccounts) {
        const parsedAccounts = JSON.parse(savedAccounts);

        if (Array.isArray(parsedAccounts)) {
          accounts = parsedAccounts;
        }
      }
    } catch {
      accounts = [];
    }

    return accounts;
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail || !password) {
        setError(
          "Please enter your email and password."
        );
        setLoading(false);
        return;
      }

      /*
        ============================
        SUPABASE LOGIN
        ============================
      */

      const sb = getSupabase();

      if (sb) {
        const { data: authData, error: authError } =
          await sb.auth.signInWithPassword({
            email: cleanEmail,
            password: password,
          });

        if (authError) {
          setError(supabaseErrorMessage(authError));
          setLoading(false);
          return;
        }

        // Persist the Supabase session so realtime + RLS stay
        // authenticated after an app restart (the client itself
        // runs with persistSession disabled on React Native).
        try {
          await AsyncStorage.setItem(
            "careerAI_supabase_session",
            JSON.stringify({
              access_token:
                authData.session?.access_token,
              refresh_token:
                authData.session?.refresh_token,
              saved_at: new Date().toISOString(),
            })
          );
        } catch {
          // Session caching is best-effort.
        }

        const userId = authData.user?.id;
        let supabaseRole = "student";
        let displayName = "";
        let profileStatus = "active";

        try {
          const { data: profile } = await sb
            .from("profiles")
            .select("role, full_name, status")
            .eq("id", userId)
            .single();

          if (profile) {
            supabaseRole = profile.role || "student";
            displayName = profile.full_name || "";
            profileStatus = profile.status || "active";
          }
        } catch {
          // Profile lookup is best-effort.
        }

        if (profileStatus === "suspended") {
          setError(
            "This account has been suspended. Please contact an administrator."
          );

          await sb.auth.signOut();

          setLoading(false);
          return;
        }

        const sessionUser = {
          id: userId,
          name: displayName,
          email: cleanEmail,
          role: supabaseRole,
          adminLevel:
            supabaseRole === "admin" ? "admin" : undefined,
        };

        await AsyncStorage.setItem(
          "careerAI_user",
          JSON.stringify(sessionUser)
        );

        setLoading(false);

        onLogin(sessionUser);

        return;
      }

      /*
        ============================
        ADMIN LOGIN
        ============================
      */

      if (loginMode === "admin") {
        /*
          MAIN ADMIN
        */

        if (
          cleanEmail === MAIN_ADMIN_EMAIL &&
          password === MAIN_ADMIN_PASSWORD
        ) {
          let accounts = await getAccounts();

          const existingMainAdmin = accounts.find(
            (account) =>
              account.email
                ?.trim()
                .toLowerCase() ===
              MAIN_ADMIN_EMAIL
          );

          if (!existingMainAdmin) {
            accounts.push({
              name: "Main Administrator",
              email: MAIN_ADMIN_EMAIL,
              password: MAIN_ADMIN_PASSWORD,
              role: "admin",
              adminLevel: "main",
            });
          } else {
            existingMainAdmin.name =
              "Main Administrator";

            existingMainAdmin.email =
              MAIN_ADMIN_EMAIL;

            existingMainAdmin.password =
              MAIN_ADMIN_PASSWORD;

            existingMainAdmin.role = "admin";

            existingMainAdmin.adminLevel = "main";
          }

          await AsyncStorage.setItem(
            "careerAI_accounts",
            JSON.stringify(accounts)
          );

          const sessionUser = {
            name: "Main Administrator",
            email: MAIN_ADMIN_EMAIL,
            role: "admin",
            adminLevel: "main",
          };

          await AsyncStorage.setItem(
            "careerAI_user",
            JSON.stringify(sessionUser)
          );

          setLoading(false);

          onLogin(sessionUser);

          return;
        }

        /*
          ============================
          OTHER ADMIN ACCOUNTS
          ============================
        */

        const accounts = await getAccounts();

        const adminAccount = accounts.find(
          (account) =>
            account.email
              ?.trim()
              .toLowerCase() === cleanEmail &&
            account.role === "admin"
        );

        if (!adminAccount) {
          setError("Admin account not found.");
          setLoading(false);
          return;
        }

        if (adminAccount.password !== password) {
          setError(
            "Incorrect admin email or password."
          );
          setLoading(false);
          return;
        }

        const sessionUser = {
          name:
            adminAccount.name ||
            "Administrator",
          email: cleanEmail,
          role: "admin",
          adminLevel:
            adminAccount.adminLevel ||
            "admin",
        };

        await AsyncStorage.setItem(
          "careerAI_user",
          JSON.stringify(sessionUser)
        );

        setLoading(false);

        onLogin(sessionUser);

        return;
      }

      /*
        ============================
        GET ALL ACCOUNTS
        ============================
      */

      let accounts = await getAccounts();

      /*
        ============================
        MIGRATE OLD ACCOUNT
        ============================
      */

      const oldAccount =
        await AsyncStorage.getItem(
          "careerAI_account"
        );

      if (oldAccount) {
        try {
          const parsedOldAccount =
            JSON.parse(oldAccount);

          if (parsedOldAccount?.email) {
            const oldEmail =
              parsedOldAccount.email
                .trim()
                .toLowerCase();

            const alreadyExists =
              accounts.some(
                (account) =>
                  account.email
                    ?.trim()
                    .toLowerCase() === oldEmail
              );

            if (!alreadyExists) {
              accounts.push(
                parsedOldAccount
              );
            }
          }

          await AsyncStorage.setItem(
            "careerAI_accounts",
            JSON.stringify(accounts)
          );

          await AsyncStorage.removeItem(
            "careerAI_account"
          );
        } catch {
          await AsyncStorage.removeItem(
            "careerAI_account"
          );
        }
      }

      /*
        ============================
        FIND ACCOUNT
        ============================
      */

      const account = accounts.find(
        (item) =>
          item.email
            ?.trim()
            .toLowerCase() === cleanEmail
      );

      if (!account) {
        setError(
          "No account was found with that email. Please create an account first."
        );

        setLoading(false);
        return;
      }

      /*
        ============================
        ADMIN ACCOUNTS
        ============================
      */

      if (account.role === "admin") {
        setError(
          "This is an Admin account. Please use Admin Login."
        );

        setLoading(false);
        return;
      }

      /*
        ============================
        CHECK PASSWORD
        ============================
      */

      if (account.password !== password) {
        setError(
          "Incorrect email or password."
        );

        setLoading(false);
        return;
      }

      /*
        ============================
        ACCOUNT ROLE
        ============================
      */

      const role =
        account.role || "job-seeker";

      /*
        ============================
        CREATE SESSION
        ============================
      */

      const sessionUser = {
        name: account.name || "",
        email: cleanEmail,
        role,
      };

      await AsyncStorage.setItem(
        "careerAI_user",
        JSON.stringify(sessionUser)
      );

      /*
        ============================
        JOB SEEKER PROFILE
        ============================
      */

      if (role === "job-seeker") {
        const profileKey =
          `careerAI_profile_${cleanEmail}`;

        const savedProfile =
          await AsyncStorage.getItem(
            profileKey
          );

        if (!savedProfile) {
          const oldProfile =
            await AsyncStorage.getItem(
              "careerAI_profile"
            );

          if (oldProfile) {
            try {
              const parsedProfile =
                JSON.parse(oldProfile);

              const oldProfileEmail =
                parsedProfile.email
                  ?.trim()
                  .toLowerCase();

              if (
                oldProfileEmail &&
                oldProfileEmail === cleanEmail
              ) {
                const migratedProfile = {
                  name:
                    parsedProfile.name ||
                    account.name ||
                    "",

                  email: cleanEmail,

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

                await AsyncStorage.setItem(
                  profileKey,
                  JSON.stringify(
                    migratedProfile
                  )
                );
              }
            } catch {
              // Ignore invalid old profile data.
            }
          }

          const checkProfile =
            await AsyncStorage.getItem(
              profileKey
            );

          if (!checkProfile) {
            const initialProfile = {
              name:
                account.name || "",

              email: cleanEmail,

              location: "",

              targetCareer: "",

              skills: [],
            };

            await AsyncStorage.setItem(
              profileKey,
              JSON.stringify(initialProfile)
            );
          }
        }
      }

      /*
        ============================
        BUSINESS PROFILE
        ============================
      */

      if (role === "business") {
        const businessProfileKey =
          `careerAI_business_profile_${cleanEmail}`;

        const savedBusinessProfile =
          await AsyncStorage.getItem(
            businessProfileKey
          );

        if (!savedBusinessProfile) {
          const initialBusinessProfile = {
            name:
              account.name || "",

            email: cleanEmail,

            companyName: "",

            industry: "",

            location: "",

            description: "",

            website: "",
          };

          await AsyncStorage.setItem(
            businessProfileKey,
            JSON.stringify(
              initialBusinessProfile
            )
          );
        }
      }

      /*
        ============================
        ENTER APPLICATION
        ============================
      */

      setLoading(false);

      onLogin(sessionUser);
    } catch (err) {
      console.log("Login error:", err);

      setError(
        "Something went wrong while logging in. Please try again."
      );

      setLoading(false);
    }
  }

  function switchToAdmin() {
    setError("");
    setEmail("");
    setPassword("");
    setLoginMode("admin");
  }

  function switchToNormal() {
    setError("");
    setEmail("");
    setPassword("");
    setLoginMode("normal");
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingBottom: Math.max(insets.bottom, 24) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.authCard}>

          {/* HERO BAND */}
          <LinearGradient
            colors={Brand.gradientPurple}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.authHero}
          >
            <View style={styles.authHeroTop}>
              <BrandMark size={42} />

              <View style={styles.authHeroBrand}>
                <Text style={styles.authHeroTitle}>
                  Career Next Step
                </Text>
                <Text style={styles.authHeroSubtitle}>
                  From graduate to hire
                </Text>
              </View>
            </View>

            <Text style={styles.authHeroHeading}>
              {loginMode === "admin"
                ? "Admin Login"
                : "Welcome back"}
            </Text>

            <Text style={styles.authHeroText}>
              {loginMode === "admin"
                ? "Sign in to manage the Career Next Step platform."
                : "Login to continue your career journey."}
            </Text>
          </LinearGradient>

          {/* BACK */}
          <Pressable
            style={styles.backButton}
            onPress={onBack}
          >
            <Text style={styles.backButtonText}>
              ← Back
            </Text>
          </Pressable>

          {/* ERROR */}
          {error ? (
            <View style={styles.errorMessage}>
              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* EMAIL */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Email address
            </Text>

            <TextInput
              style={styles.input}
              placeholder={
                loginMode === "admin"
                  ? "admin@careerai.com"
                  : "you@example.com"
              }
              placeholderTextColor={Brand.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* PASSWORD */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Password
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={Brand.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* LOGIN BUTTON */}
          <LinearGradient
            colors={Brand.gradientPurpleBright}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.primaryButton,
              loading && styles.disabledButton,
            ]}
          >
            <Pressable
              style={styles.primaryButtonPress}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading
                  ? "Logging in..."
                  : loginMode === "admin"
                  ? "Admin Login"
                  : "Login"}
              </Text>

              <Text style={styles.primaryButtonArrow}>→</Text>
            </Pressable>
          </LinearGradient>

          {/* NORMAL LOGIN FOOTER */}
          {loginMode === "normal" ? (
            <>
              <View style={styles.authFooter}>
                <Text style={styles.footerText}>
                  Don't have an account?
                </Text>

                <Pressable
                  onPress={onRegister}
                  disabled={loading}
                >
                  <Text style={styles.createAccountText}>
                    Create one
                  </Text>
                </Pressable>
              </View>

              <Pressable
                style={styles.adminLoginLink}
                onPress={switchToAdmin}
                disabled={loading}
              >
                <Text style={styles.adminLoginText}>
                  Admin login
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={styles.adminLoginLink}
              onPress={switchToNormal}
              disabled={loading}
            >
              <Text style={styles.adminLoginText}>
                ← Back to normal login
              </Text>
            </Pressable>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Brand.bg,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },

  authCard: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    backgroundColor: Brand.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Brand.line,
    ...BrandShadow,
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 18,
    paddingVertical: 5,
  },

  backButtonText: {
    color: Brand.primary,
    fontSize: 15,
    fontWeight: "700",
  },

  authHero: {
    borderRadius: 20,
    overflow: "hidden",
    padding: 22,
    marginBottom: 16,
  },

  authHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },

  authHeroBrand: {
    flex: 1,
  },

  authHeroTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Brand.surface,
  },

  authHeroSubtitle: {
    fontSize: 12,
    color: "rgba(255, 251, 244, 0.85)",
    marginTop: 2,
  },

  authHeroHeading: {
    fontSize: 24,
    fontWeight: "900",
    color: Brand.surface,
    marginTop: 6,
  },

  authHeroText: {
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255, 251, 244, 0.85)",
    marginTop: 7,
  },

  errorMessage: {
    backgroundColor: Brand.dangerSoft,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 13,
    marginBottom: 18,
  },

  errorText: {
    color: Brand.danger,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },

  inputGroup: {
    marginBottom: 18,
  },

  label: {
    color: Brand.ink,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  input: {
    width: "100%",
    minHeight: 52,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    backgroundColor: Brand.surfaceRaised,
    paddingHorizontal: 15,
    color: Brand.ink,
    fontSize: 15,
    ...Brand.shadow.subtle,
  },

  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 5,
    ...Brand.shadow.card,
  },

  disabledButton: {
    opacity: 0.6,
  },

  primaryButtonPress: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  primaryButtonText: {
    color: Brand.surface,
    fontSize: 15,
    fontWeight: "800",
  },

  primaryButtonArrow: {
    color: Brand.surface,
    fontSize: 17,
    fontWeight: "800",
  },

  authFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 22,
  },

  footerText: {
    color: Brand.muted,
    fontSize: 13,
    marginRight: 5,
  },

  createAccountText: {
    color: Brand.primary,
    fontSize: 13,
    fontWeight: "800",
  },

  adminLoginLink: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingVertical: 10,
  },

  adminLoginText: {
    color: Brand.muted,
    fontSize: 13,
    fontWeight: "700",
  },
});