/**
 * DELETE-USER — full account removal for administrators.
 *
 * The admin UI can delete a profile row via RLS, but the auth.users row
 * (the actual login) can only be removed with the service-role key. This
 * function verifies the CALLER is an authenticated admin, then deletes the
 * auth user — which cascades to profiles and every child row (connections,
 * posts, applications, messages, notifications, ...).
 *
 * Deploy:
 *   supabase functions deploy delete-user
 *
 * Invoke (from the app, as a signed-in admin):
 *   supabase.functions.invoke("delete-user", { body: { user_id: "<uuid>" } })
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    // Service client: bypasses RLS, but only AFTER we prove the caller is an admin.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Authenticate the caller via their JWT.
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Authorize: the caller's profile must be an active admin.
    const { data: callerProfile, error: profileError } = await admin
      .from('profiles')
      .select('role, status')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Caller profile not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (callerProfile.role !== 'admin' || callerProfile.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Only active administrators may delete users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Validate the target.
    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (user_id === userData.user.id) {
      return new Response(JSON.stringify({ error: 'You cannot delete your own account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: targetProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .maybeSingle();

    if (targetProfile?.role === 'admin') {
      return new Response(JSON.stringify({ error: 'Administrators cannot be deleted here' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Delete the auth user — cascades to profiles + all child tables.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user_id);
    if (deleteError) {
      throw deleteError;
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
