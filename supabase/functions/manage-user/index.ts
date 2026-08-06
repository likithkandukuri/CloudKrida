import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Admin client (service role — bypasses RLS, can create/delete auth users)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Caller client — used to verify the requesting user's identity
    const supabaseCaller = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    // Verify the caller is authenticated
    const { data: { user }, error: userErr } = await supabaseCaller.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const body = await req.json()
    const { action } = body

    // ── Change my own username (any authenticated user) ─────────────────────────
    if (action === 'update-username') {
      const { newUsername } = body
      const cleaned = (newUsername ?? '').trim().toLowerCase()

      if (!/^[a-z0-9_]{3,20}$/.test(cleaned)) {
        return new Response(JSON.stringify({ error: 'Username must be 3-20 characters: letters, numbers, and underscores only.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (cleaned === 'superadmin') {
        return new Response(JSON.stringify({ error: 'That username is reserved.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: existing } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('username', cleaned)
        .neq('id', user.id)
        .maybeSingle()

      if (existing) {
        return new Response(JSON.stringify({ error: 'Username already taken.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const newEmail = `${cleaned}@chess-arena.app`
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email: newEmail,
        email_confirm: true,
      })
      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .update({ username: cleaned })
        .eq('id', user.id)

      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ ok: true, username: cleaned }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Change my own password (any authenticated user) ─────────────────────────
    if (action === 'update-password') {
      const { currentPassword, newPassword } = body

      if (!currentPassword || !newPassword) {
        return new Response(JSON.stringify({ error: 'Current and new password are required.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (newPassword.length < 6) {
        return new Response(JSON.stringify({ error: 'New password must be at least 6 characters.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Re-verify the caller actually knows their current password before changing it
      const supabaseVerify = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      )
      const { error: verifyError } = await supabaseVerify.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (verifyError) {
        return new Response(JSON.stringify({ error: 'Current password is incorrect.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: newPassword,
      })
      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Everything below this point is superadmin-only ───────────────────────────
    if (profile?.role !== 'superadmin') {
      return new Response(JSON.stringify({ error: 'Forbidden — superadmin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Create user ────────────────────────────────────────────────────────────
    if (action === 'create') {
      const { username, password, role = 'guest' } = body

      if (!username || !password) {
        return new Response(JSON.stringify({ error: 'Username and password are required.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (password.length < 6) {
        return new Response(JSON.stringify({ error: 'Password must be at least 6 characters.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check username uniqueness
      const { data: existing } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('username', username.trim())
        .maybeSingle()

      if (existing) {
        return new Response(JSON.stringify({ error: 'Username already exists.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Create Supabase Auth user (email = username@chess-arena.app)
      const email = `${username.trim().toLowerCase()}@chess-arena.app`
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,   // skip email confirmation flow
      })

      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Create profile row
      const { error: profileError } = await supabaseAdmin.from('user_profiles').insert({
        id:       authData.user.id,
        username: username.trim(),
        role,
        status:   'active',
      })

      if (profileError) {
        // Cleanup the auth user if profile insert fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Delete user ────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const { userId } = body
      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId is required.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Prevent superadmin from deleting themselves
      if (userId === user.id) {
        return new Response(JSON.stringify({ error: 'Cannot delete your own account.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Deleting from auth.users cascades to user_profiles
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message ?? 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
