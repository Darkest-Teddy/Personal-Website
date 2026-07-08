# Guestbook Admin Moderation — Design

**Date:** 2026-07-08
**Status:** Approved (design)

## Goal

Let the site owner delete guestbook entries from within the app, gated by a
Supabase Auth login. No entry deletion is possible for anonymous visitors —
enforced by the database, not just the UI.

## Decisions

- **Actions:** Delete only (permanent). No in-app hide/unhide toggle — hiding
  stays a Supabase-dashboard action via the existing `is_hidden` column.
- **Entry point:** `?admin` URL param reveals the login dialog.
- **Auth:** Email + password (single admin user), session persisted by
  `@supabase/supabase-js` in localStorage.

## Architecture

Three layers, with the **database as the real enforcement boundary**:

1. **Supabase (manual setup, once):**
   - Create one auth user (email + password).
   - Disable public sign-ups (Auth settings) so no one else can obtain an
     `authenticated` identity.
   - Note the user's UID for the RLS policy.

2. **Database — `src/guestbook/schema.sql`:** add a DELETE policy scoped to the
   admin UID. Anonymous users remain unable to update or delete.
   ```sql
   create policy "admin delete" on public.guestbook_entries
     for delete using (auth.uid() = 'YOUR-ADMIN-UID');
   ```

3. **Client:**
   - **New module `src/guestbook/admin.js`** — thin wrappers over the existing
     `supabase` client: `getSession()`, `onAuthChange(cb)`, `signIn(email, pw)`,
     `signOut()`, `deleteEntry(id)`. Isolates auth/delete concerns and keeps
     `GuestbookBody.jsx` from growing further. Returns `{ ok, message }`-shaped
     results consistent with `api.js`.
   - **`GuestbookBody.jsx`** consumes it:
     - On mount, read `?admin` from `window.location.search`.
     - Track `session` via `getSession()` + `onAuthChange()`.
     - If `?admin` present and no session → render a Win95 **login dialog**
       (email + password, inline error line), reusing the existing modal styling.
     - When a session exists → render a slim **admin bar**
       ("Signed in as admin · Log out") and a small **Delete** button on each
       entry card.
     - Delete → **confirm dialog** ("Delete this entry permanently? This can't be
       undone.") → `deleteEntry(id)` → remove from local `entries` state.

## Data flow

- Login: dialog → `signIn` → `supabase.auth.signInWithPassword` → session stored
  → `onAuthChange` updates component state → admin UI appears.
- Delete: card button → confirm → `deleteEntry` →
  `supabase.from(TABLE).delete().eq('id', id)` (JWT attached automatically) → RLS
  checks `auth.uid()` → row removed → local state filtered.
- Logout: admin bar → `signOut` → session cleared → admin UI disappears.

## Security model

| Concern | Mitigation |
|---|---|
| Anonymous visitor deletes | RLS DELETE policy requires admin UID → rejected |
| Someone signs up for rights | Public sign-ups disabled + UID-scoped policy |
| Forged/replayed client calls | DB enforces; buttons are UI-only convenience |
| Public anon key exposure | anon key never grants delete; delete needs auth JWT |

## Error handling

- Login failure → inline message in the login dialog (no navigation).
- Delete failure → reuse the existing Win95 error dialog (`error` state).
- Supabase not configured (`isConfigured` false) → admin path is inert, same as
  the existing offline behavior.

## Out of scope (YAGNI)

- Hide/unhide toggle in-app (dashboard handles it).
- Roles / multiple admins.
- Password reset / account management UI.
- Editing entry content.

## Files touched

- `src/guestbook/schema.sql` — add DELETE policy + admin-setup comment.
- `src/guestbook/admin.js` — new auth/delete module.
- `src/guestbook/GuestbookBody.jsx` — `?admin` detection, login dialog, admin
  bar, per-entry delete + confirm.

## Testing / verification

- Build passes (`npm run build`).
- Headless-browser check: `?admin` shows login; bad creds show error; (with a
  test session) delete button appears and removes a row; without session no
  admin UI renders.
