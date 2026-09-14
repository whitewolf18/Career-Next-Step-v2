import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * SUPABASE CLIENT
 * =========================================================
 * Fill in the values in the root `.env` file:
 *
 *   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable anon key>
 *
 * NOTE: EXPO_PUBLIC_ variables are inlined by the Expo CLI and are always
 * visible inside the app bundle. That is intentional - the Supabase anon key
 * is a *publishable* key. Real security comes from Row Level Security (RLS)
 * policies defined in `supabase/migrations/0001_init.sql`.
 *
 * If Supabase is not configured yet (no `.env` / placeholder values), every
 * helper in this project falls back to the existing local-only mode that uses
 * AsyncStorage, so the app keeps working while you set things up.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as
  | string
  | undefined;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as
  | string
  | undefined;

/**
 * True only when a real Supabase project has been configured.
 * Placeholder values are treated as "not configured".
 */
export const isSupabaseConfigured: boolean = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.includes('supabase.co') &&
    !SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
    !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY')
);

let client: SupabaseClient | null = null;

/**
 * Lazily creates a single Supabase client. Returns null when the project
 * has not been configured yet (callers must handle null and stay local-only).
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!client) {
    client = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
      auth: {
        // The React Native runtime has no localStorage; the app persists its
        // own session object in AsyncStorage instead.
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return client;
}

/**
 * Institutional email domains the brief requires for student accounts.
 * Alumni may no longer hold an active student email (@...my.richfield.ac.za),
 * which is instead handled by the alumni identity-verification flow.
 */
export const RICHFIELD_STUDENT_DOMAINS: string[] = [
  '@my.richfield.ac.za',
  '@richfield.ac.za',
  '@my.aaa.ac.za',
  '@aaa.ac.za',
];

/**
 * Returns true if `email` ends with one of the Richfield/AAA student domains.
 */
export function isRichfieldEmail(email: string): boolean {
  const clean = email.trim().toLowerCase();
  return RICHFIELD_STUDENT_DOMAINS.some((domain) => clean.endsWith(domain));
}

/**
 * Maps Supabase auth errors to friendly, human-readable messages so the login
 * and register screens never show raw SDK errors to students.
 */
export function supabaseErrorMessage(error: unknown): string {
  if (!error) {
    return 'Something went wrong. Please try again.';
  }

  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);

  const clean = message.toLowerCase();

  if (clean.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }

  if (clean.includes('already registered') || clean.includes('already been registered')) {
    return 'An account with this email already exists. Please login instead.';
  }

  if (clean.includes('email not confirmed')) {
    return 'Please confirm your email address before logging in.';
  }

  if (clean.includes('database error') || clean.includes('row-level security')) {
    return 'Your email is not allowed for this account type, or the account could not be created.';
  }

  if (clean.includes('rate limit') || clean.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (clean.includes('password')) {
    return 'Your password must be at least 6 characters long.';
  }

  return message;
}