// Profanity / slur filter for guestbook submissions.
//
// Checked against the plain text of name + location + message. A match rejects the
// submission (no insert) with a Win95 error dialog. Two tiers:
//   - SWEARS: matched on word boundaries after normalization (avoids the "Scunthorpe
//     problem" - innocent substrings inside real words).
//   - SLURS: matched anywhere in the normalized, separator-stripped text, since these
//     are commonly obfuscated and there is no legitimate use.
//
// Normalization folds common leetspeak so "sh1t"/"f_u_c_k" still get caught.

const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "$": "s", "@": "a", "!": "i" };

function normalize(text) {
  let s = String(text || "").toLowerCase();
  s = s.replace(/[013457$@!]/g, (c) => LEET[c] || c);
  return s;
}

// Collapse to letters only (for the aggressive slur pass).
function lettersOnly(text) {
  return normalize(text).replace(/[^a-z]/g, "");
}

// Common profanity - rejected on whole-word match.
const SWEARS = [
  "fuck", "shit", "bitch", "cunt", "asshole", "dickhead", "bastard",
  "motherfucker", "bullshit", "prick", "wanker", "bollocks", "twat",
  "cock", "pussy", "slut", "whore", "jerkoff", "jackoff",
];

// Slurs - rejected anywhere in the separator-stripped text. Intentionally kept as a
// blocklist so obvious hate speech can't sign the guestbook. (Roots chosen to also
// catch common variants without over-matching innocent words.)
const SLURS = [
  "nigger", "nigga", "faggot", "fag", "retard", "chink", "spic",
  "kike", "wetback", "tranny", "coon", "dyke", "gook", "paki", "beaner",
];

// Words that would false-positive against a naive "fag" substring, etc. We only apply
// the aggressive pass to roots >= 5 chars; short roots use word-boundary matching.
const SHORT_SLURS = SLURS.filter((w) => w.length < 5);
const LONG_SLURS = SLURS.filter((w) => w.length >= 5);

function hasWholeWord(normalizedSpaced, word) {
  const re = new RegExp(`\\b${word}\\b`, "i");
  return re.test(normalizedSpaced);
}

// Join runs of single letters ("f u c k" -> "fuck") to catch spelled-out evasion.
// Safe against the "push it to" -> "shit" false positive because we only merge tokens
// that are genuinely single characters, and still word-match afterwards.
function collapseSingles(spaced) {
  const out = [];
  let buf = "";
  for (const t of spaced.split(/\s+/)) {
    if (t.length === 1) buf += t;
    else { if (buf) { out.push(buf); buf = ""; } out.push(t); }
  }
  if (buf) out.push(buf);
  return out.join(" ");
}

// Returns true if the text contains blocked language.
export function containsProfanity(text) {
  const spaced = normalize(text).replace(/[_\-.*]+/g, " "); // treat separators as spaces
  const collapsed = collapseSingles(spaced);
  const stripped = lettersOnly(text);

  for (const w of SWEARS) {
    if (hasWholeWord(spaced, w) || hasWholeWord(collapsed, w)) return true;
  }
  for (const w of SHORT_SLURS) {
    if (hasWholeWord(spaced, w) || hasWholeWord(collapsed, w)) return true;
  }
  for (const w of LONG_SLURS) {
    if (stripped.includes(w)) return true;
  }
  return false;
}
