// Visitor counter data access. Reuses the guestbook's Supabase client.
//
// Visits/unique come from two SECURITY DEFINER rpc functions (see schema.sql). Unique
// is keyed by the visitor's hashed IP, derived server-side from request headers, so the
// browser never sends an identity and the raw visitor table stays private. The
// localStorage id below is used ONLY as the Realtime presence key for the live
// "On-site" count (so multiple tabs of one browser count as one viewer).

import { supabase, isConfigured } from "../guestbook/supabaseClient.js";

export { isConfigured };

const VID_KEY = "jh-visitor-id";
const SESSION_KEY = "jh-visit-counted";

// Persistent per-browser id (defines a "unique visitor").
function visitorId() {
  try {
    let id = localStorage.getItem(VID_KEY);
    if (!id) {
      id = (crypto?.randomUUID && crypto.randomUUID()) ||
        "v-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VID_KEY, id);
    }
    return id;
  } catch (e) {
    // localStorage blocked: fall back to an ephemeral id (counts as a fresh visitor).
    return "v-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

// Count one visit per browser session (a refresh or HMR reload does not re-count,
// which also makes it immune to React StrictMode's double-invoke). Unique is keyed
// server-side by hashed IP (see schema.sql); no id is sent.
export async function recordVisit() {
  if (!supabase) return;
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch (e) { /* sessionStorage blocked - count anyway */ }
  try { await supabase.rpc("record_visit"); } catch (e) { /* ignore */ }
}

// { visits, unique } | null
export async function getStats() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("get_visit_stats");
    const row = data && data[0];
    if (error || !row) return null;
    return { visits: Number(row.total_visits), unique: Number(row.unique_visitors) };
  } catch (e) {
    return null;
  }
}

// Live on-site count via Realtime presence. Calls onCount(n) on every change.
// Returns an unsubscribe function.
export function trackPresence(onCount) {
  if (!supabase) return () => {};
  const id = visitorId();
  const channel = supabase.channel("online-users", { config: { presence: { key: id } } });
  const emit = () => {
    try { onCount(Object.keys(channel.presenceState()).length || 1); } catch (e) { /* ignore */ }
  };
  channel
    .on("presence", { event: "sync" }, emit)
    .on("presence", { event: "join" }, emit)
    .on("presence", { event: "leave" }, emit)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") channel.track({ at: Date.now() });
    });
  return () => { try { supabase.removeChannel(channel); } catch (e) { /* ignore */ } };
}
