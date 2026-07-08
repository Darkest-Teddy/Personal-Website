// Guestbook data access + submit pipeline (safety checks, sanitize, insert).

import { supabase, TABLE, isConfigured } from "./supabaseClient.js";
import { sanitizeHtml, htmlToText, isEmptyMessage } from "./sanitize.js";
import { containsProfanity } from "./blocklist.js";

export { isConfigured };

const MAX = { name: 40, location: 60, website: 80, text: 500 };
const RATE_KEY = "jh-guestbook-last-post";
const RATE_MS = 30 * 1000;

// Optional website: must resolve to a real http(s) domain. Returns the cleaned
// display value (as typed) on success, or null if it isn't a plausible address.
function validateWebsite(raw) {
  const s = (raw || "").trim();
  if (!s) return { ok: true, value: "" };
  if (/^\s*(javascript|data|vbscript|file|mailto):/i.test(s)) return { ok: false };
  const withScheme = /^https?:\/\//i.test(s) ? s : "https://" + s;
  let u;
  try { u = new URL(withScheme); } catch (e) { return { ok: false }; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false };
  // Hostname must be a dotted domain with a real TLD (e.g. example.com).
  // new URL() punycodes unicode hosts, so this also accepts internationalized domains.
  if (!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(u.hostname)) return { ok: false };
  return { ok: true, value: s };
}

// Optional location: must read like a place name - letters (any language) plus
// common punctuation. Rejects embedded URLs, markup, and pure-symbol gibberish.
function validateLocation(raw) {
  const s = (raw || "").trim();
  if (!s) return { ok: true, value: "" };
  if (/[<>]/.test(s) || /https?:\/\//i.test(s) || /www\./i.test(s)) return { ok: false };
  if (!/^[\p{L}\p{M}0-9 ,.'’\-()/]+$/u.test(s)) return { ok: false };
  if (!/\p{L}/u.test(s)) return { ok: false }; // require at least one letter
  return { ok: true, value: s };
}

export async function fetchEntries() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, created_at, name, location, website, html")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Result: { ok: true, entry } | { ok: false, reason, message }
export async function submitEntry({ name, location, website, html, honeypot }) {
  if (!supabase) {
    return { ok: false, reason: "unavailable", message: "Couldn't reach the guestbook. Please try again later." };
  }

  // Honeypot: real users never fill this hidden field. Pretend success, insert nothing.
  if (honeypot) return { ok: true, entry: null };

  // Rate limit (client-side; DB caps still apply server-side).
  try {
    const last = Number(localStorage.getItem(RATE_KEY) || 0);
    if (last && Date.now() - last < RATE_MS) {
      const secs = Math.ceil((RATE_MS - (Date.now() - last)) / 1000);
      return { ok: false, reason: "rate", message: `Slow down a moment. You can sign again in ${secs}s.` };
    }
  } catch (e) { /* localStorage unavailable - ignore */ }

  const cleanName = (name || "").trim().slice(0, MAX.name) || "Anonymous";

  const locRes = validateLocation(location);
  if (!locRes.ok) {
    return { ok: false, reason: "location", message: 'That location doesn\'t look right - try something like "City, Country" (or leave it blank).' };
  }
  const cleanLoc = locRes.value.slice(0, MAX.location);

  const webRes = validateWebsite(website);
  if (!webRes.ok) {
    return { ok: false, reason: "website", message: 'That website doesn\'t look like a valid address - try something like "yoursite.com" (or leave it blank).' };
  }
  const cleanWeb = webRes.value.slice(0, MAX.website);

  const cleanHtml = sanitizeHtml(html);

  if (isEmptyMessage(cleanHtml)) {
    return { ok: false, reason: "empty", message: "Please write a message before signing." };
  }
  if (htmlToText(cleanHtml).length > MAX.text) {
    return { ok: false, reason: "toolong", message: `Message is too long (max ${MAX.text} characters).` };
  }
  if (containsProfanity(`${cleanName} ${cleanLoc} ${htmlToText(cleanHtml)}`)) {
    return { ok: false, reason: "profanity", message: "Please keep it friendly - your message contains language that isn't allowed." };
  }

  const row = {
    name: cleanName,
    location: cleanLoc || null,
    website: cleanWeb || null,
    html: cleanHtml,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select("id, created_at, name, location, website, html")
    .single();

  if (error) {
    return { ok: false, reason: "error", message: "Couldn't sign the guestbook - please try again." };
  }

  try { localStorage.setItem(RATE_KEY, String(Date.now())); } catch (e) { /* ignore */ }
  return { ok: true, entry: data };
}
