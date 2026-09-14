import React, { useState } from "react";
import {
  Alert,
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
  isRichfieldEmail,
  supabaseErrorMessage,
} from "../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandMark from "./BrandMark";
import { Brand, BrandShadow } from "../theme/brand";

export default function Register({
  onRegister,
  onLogin,
  onBack,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [accountType, setAccountType] =
    useState("job-seeker");

  // Alumni verification fields (brief 2.1 — alternate identity verification).
  const [programme, setProgramme] = useState("");
  const [graduationYear, setGraduationYear] =
    useState("");
  const [alumniNumber, setAlumniNumber] =
    useState("");

  // POPIA consent (brief 2.8 — mandatory data protection consent)
  const [popiaConsent, setPopiaConsent] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  async function handleSubmit() {
    setError("");
    setLoading(true);

    try {
      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();

      /*
        ============================
        VALIDATION
        ============================
      */

      if (
        !cleanName ||
        !cleanEmail ||
        !password ||
        !confirmPassword
      ) {
        setError("Please complete all fields.");
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError(
          "Password must contain at least 6 characters."
        );
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }

      if (
        accountType === "alumni" &&
        (!programme.trim() || !graduationYear.trim())
      ) {
        setError(
          "Alumni must provide their study programme and graduation year for identity verification."
        );
        setLoading(false);
        return;
      }

      // POPIA consent is mandatory (brief 2.8)
      if (!popiaConsent) {
        setError(
          "You must consent to the Privacy Policy and POPIA data processing to create an account."
        );
        setLoading(false);
        return;
      }

      /*
        ============================
        SUPABASE REGISTRATION
        ============================
      */

      const sb = getSupabase();

      if (sb) {
        // Map the app's account types to the backend role names.
        const finalRole =
          accountType === "business"
            ? "business"
            : accountType === "alumni"
            ? "alumni"
            : "student";

        // Students register with institutional emails; alumni prove identity
        // through the verification pipeline instead (brief 2.1).
        if (finalRole === "student") {
          if (!isRichfieldEmail(cleanEmail)) {
            setError(
              "Students must register with a Richfield/AAA institutional " +
                "email (@my.richfield.ac.za, @richfield.ac.za, " +
                "@my.aaa.ac.za or @aaa.ac.za)."
            );

            setLoading(false);
            return;
          }
        }

        const { data, error } = await sb.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              role: finalRole,
              full_name: cleanName,
              popia_consent: popiaConsent,
              programme:
                accountType === "alumni"
                  ? programme.trim()
                  : undefined,
              graduation_year:
                accountType === "alumni" &&
                graduationYear.trim()
                  ? parseInt(graduationYear, 10)
                  : undefined,
            },
          },
        });

        if (error) {
          setError(supabaseErrorMessage(error));
          setLoading(false);
          return;
        }

        if (!data.session) {
          setError(
            "Account created! Please check your email to confirm your " +
              "address, then log in."
          );

          setLoading(false);
          return;
        }

        const sessionUser = {
          id: data.user?.id,
          name: cleanName,
          email: cleanEmail,
          role: finalRole,
          provider: "supabase",
          pendingApproval: finalRole === "business",
        };

        await AsyncStorage.setItem(
          "careerAI_user",
          JSON.stringify(sessionUser)
        );

        setLoading(false);

        if (finalRole === "business") {
          Alert.alert(
            "Registration received",
            "Your business account must be approved by an administrator " +
              "before you can post opportunities."
          );
        }

        if (finalRole === "alumni") {
          // Submit the alumni identity-verification request (reviewed by an
          // admin — approves profiles.is_verified on the backend).
          try {
            await sb
              .from("alumni_verifications")
              .insert({
                user_id: data.user?.id,
                programme: programme.trim(),
                graduation_year:
                  graduationYear.trim()
                    ? parseInt(graduationYear, 10)
                    : null,
                alumni_number:
                  alumniNumber.trim() || null,
                status: "pending",
              });
          } catch (verifyError) {
            console.log(
              "Alumni verification request failed:",
              verifyError
            );
          }

          Alert.alert(
            "Verification submitted",
            "Your alumni verification request has been sent. An administrator " +
              "will review it — you'll get a notification once you're verified."
          );
        }

        onRegister(sessionUser);

        return;
      }

      /*
        ============================
        GET EXISTING ACCOUNTS
        ============================
      */

      let accounts = [];

      const savedAccounts =
        await AsyncStorage.getItem(
          "careerAI_accounts"
        );

      if (savedAccounts) {
        try {
          const parsedAccounts =
            JSON.parse(savedAccounts);

          if (Array.isArray(parsedAccounts)) {
            accounts = parsedAccounts;
          }
        } catch {
          accounts = [];
        }
      }

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

          if (
            parsedOldAccount?.email &&
            !accounts.some(
              (account) =>
                account.email
                  ?.trim()
                  .toLowerCase() ===
                parsedOldAccount.email
                  .trim()
                  .toLowerCase()
            )
          ) {
            accounts.push(parsedOldAccount);
          }

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
        CHECK EXISTING EMAIL
        ============================
      */

      const existingAccount =
        accounts.find(
          (account) =>
            account.email
              ?.trim()
              .toLowerCase() === cleanEmail
        );

      if (existingAccount) {
        setError(
          "An account with this email already exists. Please login instead."
        );

        setLoading(false);
        return;
      }

      /*
        ============================
        CREATE ACCOUNT
        ============================
      */

      const account = {
        name: cleanName,
        email: cleanEmail,
        password: password,
        role: accountType,
      };

      accounts.push(account);

      /*
        ============================
        SAVE ACCOUNTS
        ============================
      */

      await AsyncStorage.setItem(
        "careerAI_accounts",
        JSON.stringify(accounts)
      );

      /*
        ============================
        CREATE SESSION
        ============================
      */

      const sessionUser = {
        name: account.name,
        email: account.email,
        role: account.role,
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

      if (accountType === "job-seeker") {
        const profileKey =
          `careerAI_profile_${cleanEmail}`;

        const initialProfile = {
          name: cleanName,
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

      /*
        ============================
        BUSINESS PROFILE
        ============================
      */

      if (accountType === "business") {
        const businessProfileKey =
          `careerAI_business_profile_${cleanEmail}`;

        const initialBusinessProfile = {
          name: cleanName,
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

      /*
        ============================
        ENTER APPLICATION
        ============================
      */

      setLoading(false);

      onRegister(sessionUser);
    } catch (err) {
      console.log("Registration error:", err);

      setError(
        "Something went wrong while creating your account. Please try again."
      );

      setLoading(false);
    }
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
              Create your account
            </Text>

            <Text style={styles.authHeroText}>
              Tell us who you are — we'll take
              the next step with you.
            </Text>
          </LinearGradient>

          {/* BACK */}
          <Pressable
            style={styles.backButton}
            onPress={onBack}
            disabled={loading}
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

                    {/* ACCOUNT TYPE */}
          <Text style={styles.label}>
            Account type
          </Text>

          <View style={styles.accountTypeOptions}>

            {/* JOB SEEKER */}
            <Pressable
              style={[
                styles.accountTypeCard,
                accountType === "job-seeker" &&
                  styles.accountTypeCardSelected,
              ]}
              onPress={() => {
                setAccountType("job-seeker");
                setError("");
              }}
              disabled={loading}
            >
                            <Text style={styles.accountTypeIcon}>
                J
              </Text>

              <Text
                style={[
                  styles.accountTypeTitle,
                  accountType === "job-seeker" &&
                    styles.selectedText,
                ]}
              >
                Job Seeker
              </Text>

              <Text style={styles.accountTypeDescription}>
                Find jobs, improve your CV
                and prepare for interviews.
              </Text>

              {accountType === "job-seeker" && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>
                    Selected
                  </Text>
                </View>
              )}
            </Pressable>

            {/* BUSINESS */}
            <Pressable
              style={[
                styles.accountTypeCard,
                accountType === "business" &&
                  styles.accountTypeCardSelected,
              ]}
              onPress={() => {
                setAccountType("business");
                setError("");
              }}
              disabled={loading}
            >
                            <Text style={styles.accountTypeIcon}>
                B
              </Text>

              <Text
                style={[
                  styles.accountTypeTitle,
                  accountType === "business" &&
                    styles.selectedText,
                ]}
              >
                Business
              </Text>

              <Text style={styles.accountTypeDescription}>
                Post jobs and find talented
                graduates.
              </Text>

              {accountType === "business" && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>
                    Selected
                  </Text>
                </View>
              )}
            </Pressable>

            {/* ALUMNI */}
            <Pressable
              style={[
                styles.accountTypeCard,
                accountType === "alumni" &&
                  styles.accountTypeCardSelected,
              ]}
              onPress={() => {
                setAccountType("alumni");
                setError("");
              }}
              disabled={loading}
            >
                            <Text style={styles.accountTypeIcon}>
                A
              </Text>

              <Text
                style={[
                  styles.accountTypeTitle,
                  accountType === "alumni" &&
                    styles.selectedText,
                ]}
              >
                Alumni
              </Text>

              <Text style={styles.accountTypeDescription}>
                Graduated? Join as an alum,
                mentor and give back.
              </Text>

              {accountType === "alumni" && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>
                    Selected
                  </Text>
                </View>
              )}
            </Pressable>

          </View>

          {/* ALUMNI VERIFICATION FIELDS */}
          {accountType === "alumni" && (
            <View
              style={styles.inputGroup}
            >
              <Text style={styles.label}>
                Study programme
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. BCom Information Systems"
                placeholderTextColor={Brand.muted}
                value={programme}
                onChangeText={setProgramme}
                editable={!loading}
              />

              <Text style={styles.label}>
                Graduation year
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. 2023"
                placeholderTextColor={Brand.muted}
                value={graduationYear}
                onChangeText={setGraduationYear}
                keyboardType="number-pad"
                editable={!loading}
              />

              <Text style={styles.label}>
                Student / alumni number
                (optional)
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. 402123456"
                placeholderTextColor={Brand.muted}
                value={alumniNumber}
                onChangeText={setAlumniNumber}
                editable={!loading}
              />

              <Text
                style={styles.fieldHint}
              >
                🔒 An administrator verifies
                alumni identities before the
                verified badge is shown.
              </Text>
            </View>
          )}

          {/* NAME */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Full name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor={Brand.muted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          {/* EMAIL */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Email address
            </Text>

            <TextInput
              style={styles.input}
              placeholder="you@example.com"
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
              placeholder="At least 6 characters"
              placeholderTextColor={Brand.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* CONFIRM PASSWORD */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Confirm password
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your password again"
              placeholderTextColor={Brand.muted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* POPIA CONSENT (brief 2.8) */}
          <Pressable
            style={styles.consentRow}
            onPress={() => setPopiaConsent(!popiaConsent)}
          >
            <View style={[styles.checkbox, popiaConsent && styles.checkboxChecked]}>
              {popiaConsent && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
            <Text style={styles.consentText}>
              I consent to the collection and processing of my personal data in accordance with the{" "}
              <Text style={styles.consentLink}>Privacy Policy</Text> and POPIA.
            </Text>
          </Pressable>

          {/* CREATE ACCOUNT */}
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
                  ? "Creating Account..."
                  : `Create ${
                      accountType === "business"
                        ? "Business"
                        : "Job Seeker"
                    } Account`}
              </Text>

              <Text style={styles.primaryButtonArrow}>→</Text>
            </Pressable>
          </LinearGradient>

          {/* LOGIN */}
          <View style={styles.authFooter}>
            <Text style={styles.footerText}>
              Already have an account?
            </Text>

            <Pressable
              onPress={onLogin}
              disabled={loading}
            >
              <Text style={styles.loginText}>
                Login
              </Text>
            </Pressable>
          </View>

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
    paddingVertical: 5,
    marginBottom: 18,
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

  label: {
    color: Brand.ink,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  accountTypeOptions: {
    gap: 12,
    marginBottom: 22,
  },

  accountTypeCard: {
    width: "100%",
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 16,
    backgroundColor: Brand.surfaceRaised,
    padding: 18,
    ...Brand.shadow.subtle,
  },

  accountTypeCardSelected: {
    borderColor: Brand.primary,
    borderWidth: 2,
    backgroundColor: Brand.primaryMist,
  },

  accountTypeIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  accountTypeTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Brand.ink,
    marginBottom: 6,
  },

  selectedText: {
    color: Brand.primary,
  },

  accountTypeDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: Brand.muted,
  },

  selectedBadge: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: Brand.primarySoft,
  },

  selectedBadgeText: {
    color: Brand.primaryDark,
    fontSize: 11,
    fontWeight: "800",
  },

  inputGroup: {
    marginBottom: 17,
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
    marginBottom: 10,
    ...Brand.shadow.subtle,
  },

  fieldHint: {
    fontSize: 12,
    lineHeight: 18,
    color: Brand.muted,
    marginTop: 4,
  },

  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 5,
    paddingHorizontal: 15,
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
    textAlign: "center",
  },

  primaryButtonArrow: {
    color: Brand.surface,
    fontSize: 17,
    fontWeight: "800",
  },

  authFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 22,
  },

  footerText: {
    color: Brand.muted,
    fontSize: 13,
    marginRight: 5,
  },

  loginText: {
    color: Brand.primary,
    fontSize: 13,
    fontWeight: "800",
  },

  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
    marginTop: 5,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  checkboxTick: {
    color: Brand.surface,
    fontSize: 12,
    fontWeight: "800",
  },
  consentText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: Brand.muted,
  },
  consentLink: {
    color: Brand.primary,
    fontWeight: "700",
  },
});