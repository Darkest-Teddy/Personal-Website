// Supabase client for the guestbook. Returns null when env vars are absent, so the
// app can render a graceful "offline" state instead of crashing before setup.
//
// The anon key is safe to ship to the browser - write access is constrained by
// Row-Level Security policies (see schema.sql), not by hiding the key.

import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(URL && ANON);

export const supabase = isConfigured ? createClient(URL, ANON) : null;

export const TABLE = "guestbook_entries";
