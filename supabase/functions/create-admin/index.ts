/**
 * ADMIN PROVISIONING — create a Richfield administrator account.
 *
 * Admin accounts must never be self-registerable (brief section 2.1 + 2.2).
 * This edge function is invoked with the SERVICE ROLE key only, from a trusted
 * terminal / dashboard, and marks the profile as an active verified admin.
 *
 * Deploy:
 *   supabase functions deploy create-admin
 *
 * Invoke (from a terminal, never from the app):
 *   curl -X POST https://<project-ref>.supabase.co/functions/v1/create-admin \
 *     -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "email": "admin@richfield.ac.za", "password": "A strong password", "full_name": "Richfield Admin" }'
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { email, password, full_name } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'email and password are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Creates the auth user; the handle_new_user() trigger creates the profile.
    const { data, error } = await supabase.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        full_name: full_name ?? '',
      },
    });

    if (error) {
      throw error;
    }

    const userId = data.user?.id as string | undefined;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Could not determine the new user id.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Elevate the automatically-created profile to an active verified admin.
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'admin',
        status: 'active',
        is_verified: true,
        full_name: full_name ?? '',
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: userId }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as { message?: string }).message ?? 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});