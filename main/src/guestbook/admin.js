// Admin moderation for the guestbook - thin wrappers over the Supabase client.
//
// Deletion is gated by Supabase Auth: a signed-in admin's JWT carries a UID that
// the DB's "guestbook admin delete" RLS policy checks (see schema.sql). The UI
// only shows Delete buttons as a convenience; the database is the real gate, so a
// signed-out visitor's delete is rejected server-side regardless of the client.

import { supabase, TABLE, isConfigured } from "./supabaseClient.js";

export { isConfigured };

// Current session (or null). Safe to call when Supabase isn't configured.
export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

// Subscribe to auth changes. Returns an unsubscribe function.
export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data?.subscription?.unsubscribe();
}

// Result: { ok: true } | { ok: false, message }
export async function signIn(email, password) {
  if (!supabase) return { ok: false, message: "Couldn't reach the guestbook. Please try again later." };
  const { error } = await supabase.auth.signInWithPassword({
    email: (email || "").trim(),
    password: password || "",
  });
  if (error) return { ok: false, message: "Login failed - check your email and password." };
  return { ok: true };
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

// Result: { ok: true } | { ok: false, message }
// Only succeeds for the admin UID - enforced by RLS, not by this function.
export async function deleteEntry(id) {
  if (!supabase) return { ok: false, message: "Couldn't reach the guestbook. Please try again later." };
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return { ok: false, message: "Couldn't delete that entry - please try again." };
  return { ok: true };
}
