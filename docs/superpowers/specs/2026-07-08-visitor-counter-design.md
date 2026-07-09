# Win95 Visitor Counter Widget - Design

**Date:** 2026-07-08
**Status:** Approved (design)

## Goal

A Windows 95-style desktop widget pinned to the bottom-right corner showing three
live visitor numbers, backed by real data in Supabase:

- **Visits** - total sessions
- **Uniq. Visitors** - distinct browsers
- **On-site** - people viewing the site right now (live)

## Decisions

- Data is real, via Supabase (project already wired).
- Widget is fixed and always-on (no drag, no close), bottom-right above the taskbar.
- Full Windows 95 chrome: raised beige panel, black text, sunken value fields.

## Backend (Supabase) - `src/counter/schema.sql` (committable, no secrets)

- Table `public.visitors`: `visitor_id uuid primary key`, `first_seen timestamptz`,
  `last_seen timestamptz`, `visit_count integer default 1`. RLS enabled, with **no
  anon select/insert/update policies** - the raw table is never exposed to the browser.
- `record_visit(p_visitor uuid)` - `SECURITY DEFINER` function. Inserts a new visitor
  row or, on conflict, increments `visit_count` and updates `last_seen`. `grant execute to anon`.
- `get_visit_stats()` - `SECURITY DEFINER` function returning
  `(total_visits bigint, unique_visitors bigint)` = `(sum(visit_count), count(*))`.
  `grant execute to anon`.
- Access is only through these two functions; visitor ids never leave the database.

The user runs this SQL once in the Supabase SQL editor (the anon key cannot create
tables/functions).

## Client

- `src/counter/visits.js` - reuses the existing Supabase client
  (`../guestbook/supabaseClient.js`).
  - `visitor_id`: persistent per-browser UUID in localStorage (`jh-visitor-id`),
    created with `crypto.randomUUID()`.
  - `recordVisit()` - calls `record_visit` rpc. Guarded by a sessionStorage flag so a
    visit is counted once per browser session (refreshes / Vite HMR do not inflate it).
  - `getStats()` - calls `get_visit_stats` rpc, returns `{ visits, unique }`.
  - `trackPresence(onCount)` - joins a Supabase Realtime presence channel
    `online-users` keyed by visitor_id; reports the live unique-member count via
    `presenceState()`. Returns an unsubscribe function.
  - All functions no-op safely when Supabase is not configured.
- `src/counter/VisitorCounter.jsx` - on mount: record the visit, fetch stats
  (and re-fetch every ~60s so Visits/Unique tick up while watched), subscribe to
  presence for On-site. Renders nothing if Supabase is not configured.

## Placement / behavior

- Rendered once on the desktop in `App.jsx` (not inside a window).
- `position: fixed`, bottom-right, above the 32px taskbar, low z-index so app windows
  float over it like a real desktop widget.
- On-site always shows at least 1 (the current viewer).

## Data flow

- Load: `VisitorCounter` mounts -> `recordVisit()` (once per session) -> `getStats()`
  -> render numbers. Presence channel subscribes -> On-site updates live on join/leave.
- Numbers refresh: `getStats()` on a ~60s interval; presence pushes On-site changes
  immediately.

## Error handling

- rpc errors / missing config: functions return null/no-op; the widget shows the last
  known value or dashes, never crashes.
- Realtime unavailable: On-site falls back to 1 (self) and simply does not update.

## Out of scope (YAGNI)

- Per-page view breakdown, geography, referrers, history/charts.
- Bot filtering beyond the per-session guard.
- Admin/reset UI (reset via Supabase dashboard if ever needed).

## Files

- `src/counter/schema.sql` (new, committable)
- `src/counter/visits.js` (new)
- `src/counter/VisitorCounter.jsx` (new)
- `src/App.jsx` (render the widget on the desktop)

## Verification

- `npm run build` passes.
- Headless-browser check: widget renders bottom-right with three rows; On-site shows 1
  with a single tab and 2 with two tabs (presence); Visits/Unique are numbers.
