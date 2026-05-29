# Arena — Supabase Setup Guide

Follow these steps **once** to connect the app to your live database.
Everything after setup is automatic — changes sync across all devices in real time.

---

## Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (free account is enough).
2. Click **New project**.
3. Choose a name (e.g. `arena-chess`), a strong database password, and a region near you.
4. Wait ~2 minutes for the project to provision.

---

## Step 2 — Copy Your Credentials

1. In your Supabase project → **Settings** → **API**.
2. Copy:
   - **Project URL** — looks like `https://abcxyz123.supabase.co`
   - **Anon / public key** — the long `eyJ…` key under "Project API keys"
3. Open `.env.local` in this project and fill in the values:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

**Never commit `.env.local` to git** — it's already in `.gitignore`.

---

## Step 3 — Run the Database Schema

1. In Supabase → **SQL Editor** → click **New query**.
2. Open `supabase/migrations/001_schema.sql` from this project.
3. Copy the entire file contents and paste into the editor.
4. Click **Run**.

You should see "Success" with no errors. This creates all tables, security policies, and enables real-time.

---

## Step 4 — Create Storage Buckets

1. In Supabase → **Storage** → **New bucket**.
2. Create **two** buckets:

   | Bucket name     | Public? |
   |-----------------|---------|
   | `gallery`       | ✅ Yes  |
   | `score-records` | ✅ Yes  |

   (Make them public so photo URLs work without authentication.)

---

## Step 5 — Create the Super Admin Account

The Super Admin is a real Supabase Auth user. Create it manually:

### 5a. Create the auth user

1. In Supabase → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter:
   - **Email:** `superadmin@chess-arena.app`
   - **Password:** *(choose anything secure — this is your Super Admin login password)*
3. Click **Create user**.
4. Copy the **UUID** shown in the users table (looks like `a1b2c3d4-…`).

### 5b. Insert the profile row

1. Back in **SQL Editor** → **New query**.
2. Run this SQL, replacing `<PASTE_UUID_HERE>` with the UUID you just copied:

```sql
INSERT INTO user_profiles (id, username, role, status)
VALUES ('<PASTE_UUID_HERE>', 'superadmin', 'superadmin', 'active');
```

Your Super Admin username for the app login will be **`superadmin`** and the password is whatever you set above.

---

## Step 6 — Install the Supabase CLI

The CLI is needed to deploy the Edge Function that manages user accounts.

```bash
npm install -g supabase
```

Verify: `supabase --version`

---

## Step 7 — Deploy the Edge Function

```bash
# Log in to Supabase
supabase login

# Link this project (use the Project Reference ID from Settings → General)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the user-management function
supabase functions deploy manage-user
```

The Edge Function uses your service role key automatically — you don't need to set it manually.

---

## Step 8 — Start the App

```bash
npm run dev
```

Go to `http://localhost:5173` and sign in with username `superadmin` and the password you chose.

---

## Verification Checklist

Test that everything works end-to-end:

1. ✅ **Sign in** as Super Admin — you should see the full dashboard with all cards.
2. ✅ **Create a tournament** — it should appear immediately.
3. ✅ **Open another browser tab** (or a different device on the same network) — the tournament should appear there too without refreshing.
4. ✅ **Add a user** via User Management — the new user should be able to log in.
5. ✅ **Upload a gallery photo** — it should appear in the gallery tab and persist after a page refresh.
6. ✅ **Delete the tournament** — it should disappear on all open tabs.
7. ✅ **Refresh the page** — all data should still be there (loaded from the database, not localStorage).

---

## Adding More Users

1. Sign in as Super Admin.
2. Chess → User Management → Add New User.
3. Enter username, password, and role (Guest or Admin).
4. The user can now sign in on any device.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Supabase not configured" error | Check `.env.local` has the correct URL and Anon Key, then restart `npm run dev` |
| Login fails for superadmin | Make sure you ran Step 5b — the `user_profiles` row must exist |
| Gallery upload fails | Confirm both Storage buckets (`gallery`, `score-records`) are created and set to **Public** |
| User creation fails from User Management panel | Make sure the Edge Function was deployed (Step 7) |
| Real-time not working | Check that the SQL schema ran successfully — the `ALTER PUBLICATION` lines at the bottom enable real-time |
| `edge function error: 403 Forbidden` | The calling user's profile doesn't have `role = 'superadmin'` — re-check Step 5b |

---

## Architecture Notes

| Feature | How it works |
|---------|-------------|
| Auth sessions | Supabase Auth (JWT tokens, auto-refresh) — stored in localStorage as a session token only |
| Tournament data | PostgreSQL via Supabase — `tournaments`, `players`, `matches` tables |
| Real-time sync | Supabase Realtime (WebSocket subscriptions on each table) |
| Photos | Supabase Storage — `gallery` and `score-records` buckets |
| User management | Edge Function `manage-user` — uses service role to create/delete auth users securely |
| Permissions | Row Level Security (RLS) enforced at the database level |
| Theme preference | localStorage only (dark/light — this is a UI preference, not data) |
