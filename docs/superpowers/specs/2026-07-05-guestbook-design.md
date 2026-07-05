# Guestbook App — Design Spec

**Date:** 2026-07-05
**Status:** Approved (design), pending implementation plan

## Summary

Add a Windows 95-styled **Guestbook** app to the personal website where visitors can
sign with a name, optional location and website, and a rich-text message with animated
GIF emotes. Entries are stored in Supabase so every visitor sees everyone else's
messages. The visual design matches the provided mockup (`Guestbook.dc.html` + the
reference screenshot) exactly, adapted to the site's real window system.

## Goals

- A new windowed app that looks **exactly** like the mockup screenshot (menu bar,
  welcome heading, sign form, formatting toolbar, paginated entries, status bar).
- Shared persistence via Supabase (all visitors read/write the same list).
- Rich formatting (bold, italic, size, color, links, emoji) that is **safe** against XSS.
- All 187 unique animated GIF emotes available in the emoji picker.
- Graceful behavior before Supabase keys are configured (offline state).

## Non-goals

- No admin/moderation UI in-app (moderation happens via the Supabase dashboard).
- No user accounts / auth (anonymous signing, like a classic guestbook).
- No study-guide or unrelated features.

## Source material

Unzipped from `main/Windows 95 Guestbook App.zip` into `main/_guestbook_unzip/`:
- `Guestbook.dc.html` — complete working mockup (contenteditable editor, popovers,
  pagination, seed data, localStorage). This is the layout + behavior source of truth.
- `emoji-set.js` — the curated 20-emoji subset (superseded: we use all 187).
- `assets/emojis/` (20 curated) and `uploads/` (187 unique GIFs + 187 hashed dupes).
- `assets/shared/guestbook-cropped.png` (16px titlebar icon), `guestbook.png`,
  `icon-ie.png`, `chimes.mp3`, `W95FA.otf`, cursors.

## Architecture

### Window integration (`main/src/App.jsx`)
- Register app `guestbook` in the `APPS` map: `title: "Guestbook"`, titlebar icon
  `/assets/guestbook/guestbook-cropped.png`, desktop/Start icon
  `/assets/shared/guestbook.png`, `width: 600`, `height: 800`, `pixel: true`.
- Add `guestbook: <GuestbookBody />` to the `BODIES` map.
- Add a desktop icon and a Start-menu entry (follow existing patterns).
- Add `guestbook` to the internal-overflow set in `Win95Window`'s `WindowContent`
  (overflow hidden) and give it `BODY_PAD: 0` — the body manages its own flex column
  (menu bar / scroll area / status bar), matching the mockup.

### Body component (`<GuestbookBody />`)
Direct React port of `Guestbook.dc.html`, using the same inline Win95 styles:
- **Menu bar**: File / Edit / View / Help (visual only, hover highlight — no dropdowns,
  consistent with the mockup being non-functional there).
- **Scrollable content area**:
  - Welcome heading "Welcome to my guestbook!!" (24px bold, capitalized).
  - **Sign form**: Name (`maxLength 40`, placeholder "Anonymous"), a flex row with
    "Where ya from (optional)" (`maxLength 60`, "City, Country") and "Your website
    (optional)" (`maxLength 80`, "yoursite.com"), then Message (required).
  - **Toolbar** (`#gb-tools`): Bold, Italic, size popover (Small/Normal/Large/Huge),
    color popover (16 swatches), link button (prompt), emoji popover (all 187, scrollable
    8-col grid). Uses `document.execCommand` on a `contenteditable` editor, ported from
    the mockup's helpers (`hold`/`restore`/`doBold`/`doItalic`/`pickSize`/`pickColor`/
    `insertEmoji`/`insertLinkBtn`). Click-outside closes popovers.
  - **Editor**: `contenteditable` div, placeholder "Say something nice...".
  - **Sign it!** button (disabled until there's text), "Thanks for signing!" confirmation
    with chime sound; helper line beneath.
  - Divider, then **results**: "Page X of Y (N messages)" + pagination controls
    (`[1] 2 3 … ◂ ▸`, 5 per page), each entry a raised white card: bold navy name,
    right-aligned timestamp, optional 📍location (links to OpenStreetMap search) and
    Website link, then sanitized HTML body.
- **Status bar**: left panel "N messages signed", right panel IE icon + "jacklhe.com".

### Storage — Supabase
- New module `main/src/guestbook/supabaseClient.js`: creates the client from
  `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Exports the client
  or `null` when env vars are absent (offline mode).
- Add dependency `@supabase/supabase-js`.
- Table `guestbook_entries`:
  | column | type | notes |
  |---|---|---|
  | `id` | `bigint` identity PK | |
  | `created_at` | `timestamptz` default `now()` | |
  | `name` | `text` not null | ≤ 40 chars |
  | `location` | `text` | ≤ 60 chars, nullable |
  | `website` | `text` | ≤ 80 chars, nullable |
  | `html` | `text` not null | sanitized rich HTML, ≤ ~4000 chars |
  | `is_hidden` | `boolean` default `false` | soft-delete for moderation |
- **RLS policies**:
  - `SELECT`: allowed to `anon` where `is_hidden = false`.
  - `INSERT`: allowed to `anon` with a `WITH CHECK` enforcing length caps
    (`char_length(name) <= 40`, `location` ≤ 60, `website` ≤ 80, `html` ≤ 4000)
    and `is_hidden = false`.
  - No `UPDATE` / `DELETE` for `anon`.
- SQL lives in `main/src/guestbook/schema.sql` (table + RLS + seed inserts).
- **Data flow**: on mount, `SELECT * ... where is_hidden=false order by created_at desc`.
  On submit: run safety checks → sanitize → `INSERT` → prepend returned row to state,
  reset form, play chime. On any Supabase error, show a Win95 error dialog.

### Seed data
The 14 mockup entries (me/"Sulfur", Graveyard Stuffer, 12th, Covadonga3, ikmalsaid,
Anonymous, ghostwitch, arcane, CrudeOilisbad, luxy, Anon, Neo, dagamerfiles, sleepyfox)
are inserted via `schema.sql` with their original timestamps and (sanitized) HTML.
Emote references in seed HTML point to `/assets/guestbook/emojis/<file>.gif`.

## Safety (critical — public write + rich HTML)

1. **HTML sanitization** — a small allowlist sanitizer (`main/src/guestbook/sanitize.js`)
   applied on **submit** (before insert) and again on **render** (defense in depth):
   - Allowed tags: `b`, `strong`, `i`, `em`, `br`, `font` (attr `color` only),
     `span` (style: only `color` and `font-size`), `a` (attr `href`, only `http(s):`
     URLs; force `target=_blank rel="noreferrer noopener"`), `img`.
   - `img` `src` **must** start with `/assets/guestbook/emojis/` and match a known
     emote filename; any other `img` is dropped. No remote images.
   - Everything else (scripts, event handlers, styles, other tags/attrs) is stripped.
   - Implemented by parsing into a detached DOM and rebuilding an allowlisted tree
     (not regex).
2. **Profanity filter** — blocklist of swears + slurs checked against the plain text of
   name + location + message. Match → reject the submission with a Win95 error dialog,
   no insert. Blocklist in `main/src/guestbook/blocklist.js`.
3. **Anti-spam**:
   - Hidden honeypot input; if filled (bot), silently drop the submit (no insert).
   - Client-side rate limit: one successful post per ~30s (timestamp in `localStorage`).
   - Length caps enforced client-side (maxLength attrs + text length ≤ 500) and again
     DB-side via the RLS `WITH CHECK`.
4. Entries auto-publish (`is_hidden=false`); abuse is removed via the dashboard.

## Emojis — "all the gif emotes"
- Copy the 187 unique (non-hashed) GIFs from `_guestbook_unzip/uploads/` to
  `main/public/assets/guestbook/emojis/`.
- Build the emoji list at module load from a generated manifest
  (`main/src/guestbook/emojis.js` — an array of `{ name, file }`), so the picker and the
  sanitizer allowlist share one source of truth.
- Picker: scrollable fixed-height 8-column grid; clicking inserts
  `<img src="/assets/guestbook/emojis/<file>">` at the caret.

## Offline / unconfigured state
When `supabaseClient` is `null` (no env keys), the form is disabled and the entry area
shows a Win95 message like "Guestbook is offline — check back soon." No crash. Once
`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set and the site rebuilt, it works.

## Assets to add
- `main/public/assets/guestbook/emojis/*.gif` (187 files).
- `main/public/assets/guestbook/guestbook-cropped.png` (16px titlebar icon).
- Reuse existing: `public/assets/shared/guestbook.png`, `icon-ie.png`, `chimes.mp3`,
  the `W95FA` font (already loaded), cursors (already present).

## Files changed / added
- `main/src/App.jsx` — APPS entry, BODIES entry, desktop + Start icons, `<GuestbookBody/>`
  (may live in its own file `main/src/guestbook/GuestbookBody.jsx` and be imported, to
  keep `App.jsx` manageable — it is already 2300+ lines).
- `main/src/guestbook/` — `GuestbookBody.jsx`, `supabaseClient.js`, `emojis.js`,
  `sanitize.js`, `blocklist.js`, `schema.sql`.
- `main/package.json` — add `@supabase/supabase-js`.
- `main/.env.example` — document `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- `main/public/assets/guestbook/` — emote GIFs + titlebar icon.

## Testing / verification
- Unit: `sanitize.js` (drops scripts, foreign img src, event handlers; keeps allowed
  formatting + emote imgs) and `blocklist.js` (matches obfuscated variants reasonably,
  no false positives on innocuous substrings where avoidable).
- Manual: open app, verify pixel-match to mockup (menu bar, form, toolbar popovers,
  187-emote picker, pagination, status bar); submit an entry with formatting + emote;
  confirm it persists and reappears on reload (against a real Supabase project);
  confirm offline state with no keys; confirm profanity rejection dialog.

## Open items / follow-ups (not in this PR)
- Populate real Supabase keys and run `schema.sql` in the project.
- Optional: server-side rate limiting (Supabase edge function) if client limit proves
  insufficient.
