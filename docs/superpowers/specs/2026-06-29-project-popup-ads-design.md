# Project Pop-Ups as 90s Internet Ads — Design

**Date:** 2026-06-29
**Scope:** `react95-poc/src/App.jsx` (React95 proof-of-concept)
**Builds on:** `2026-06-29-projects-folder-windows-design.md`

## Goal

Restyle the three spawning project pop-up windows (Sapling, Super Artificial Bros.,
Stalk Market) so each looks like a garish late-90s internet pop-up ad — fake browser
chrome, a loud display headline, a rotated starburst seal, a blinking status bar, and a
"Click HERE »" call-to-action — **while staying genuinely informative**: each ad still
carries the project's real description, tech, and GitHub link.

Each project is its own *genre* of period ad, with a project-specific gimmick widget:

- **Sapling** — "miracle study" infomercial; gimmick = a live **knowledge-graph** (nodes + edges).
- **Super Artificial Bros.** — "free game portal" listing; gimmick = an **AI-relationship heart meter** + a spinning **levels-generated counter**, plus an arcade HUD over the screenshot.
- **Stalk Market** — "get-rich-quick" stock spam; gimmick = a rising **portfolio chart** + an **ML risk-engine gauge**, plus a scrolling ticker.

Approved visual reference: `.superpowers/brainstorm/session1/content/ads-v2.html`.

## Non-Goals

- No change to Welcome / About / Projects-folder / Bank windows.
- No change to the spawn logic, window manager, dragging, focus/z-order, taskbar, or close
  behavior — those are reused as-is.
- No new image assets; existing thumbnails (`/thumb-sapling.png`, `/thumb-mario.png`,
  `/thumb-stalk-market.png`) are reused as the ad "product shots."

## Approach

The project windows stay **first-class apps in the existing window manager**. We do **not**
replace the window chrome or rewire dragging. We only:

1. **Restyle the titlebar** of project windows per-project (color gradient + junk title),
   keeping the real close button (project windows are already close-only via `isProject`).
2. **Replace the window body** (`ProjectCard`) with a new **`ProjectAd`** component that
   renders the fake address bar, the ad content, the project gimmick widget, the real-info
   panel, the CTA, and the fake status bar.

This preserves drag, focus/z-index, minimize-skip (project windows have no min/max), taskbar
buttons, resize grip, and random non-overlapping spawn — all unchanged.

## Components & Data

### `PROJECTS[].ad` (new data block)

Each project entry gains an `ad` object so the markup stays data-driven:

```
ad: {
  genre:      "sapling" | "mario" | "stalk",   // selects widget + theme
  junkUrl:    "http://sapling.study/grow-your-brain.html",
  windowTitle:"Sapling™ Learning Assistant",   // shown in the real titlebar
  hook:       "Turn Your Notes Into a Genius!", // big display headline (may include <br>)
  sub:        "~ watch your knowledge literally grow 🌱 ~",
  bullets:    ["Documents → a personal AI tutor",
               "Dynamic neural knowledge graph",
               "Real-time knowledge visualization"],  // 3 checklist specs
  sealText:   "GROWS WITH YOU!",
  ctaLabel:   "🌱 CLICK to PLANT your knowledge! »",
  ctaSub:     "free & open-source · grows in real time",
  statusText: "Graphing your brain…",
  legal:      "*Side effects may include understanding. Sapling is a real project.",
  theme: {
    header:   "linear-gradient(90deg,#1f7a33,#3fb950)",
    body:     "linear-gradient(180deg,#eaffea,#bff0c4)",
    hookColor:"#11772a",
    sealBg:   "#16a34a",
    cta:      "linear-gradient(180deg,#42c75c,#1f7a33)",
  },
}
```

The existing `desc`, `lang`, `langColor`, `url`, `img`, `name` fields are unchanged and feed
the real-info panel, the language line, the GitHub CTA target, and the product shot.

### `ProjectAd` (new component, replaces `ProjectCard` for these windows)

Layout, top to bottom, inside `WindowContent`:

1. **Address bar** — lock/emoji + read-only `junkUrl` field + "Go" button.
2. **Ticker** (Stalk only) — a marquee strip above the body content.
3. **Hook** headline + **sub** line.
4. **Product shot** — the real thumbnail in a beveled `well`-style frame; genre-specific
   **HUD** overlay for Mario (`★ × ∞`, coins) and Stalk (`PORTFOLIO ▲ +999%`, `$5,000`).
5. **Gimmick widget** — `<KnowledgeGraph>` / `<RelationshipMeter>` / `<RiskGauge>` by genre.
6. **Real-info panel** — cream box: bold project name, real `desc`, a checklist of 3 spec
   bullets (sourced from a new `ad.bullets: string[]`), and `BUILT WITH: ▶ {lang}`.
7. **CTA** — anchor to the real `url` (`target="_blank"`), styled as the big ad button, with
   `ctaSub` beneath.
8. **Legal** — tiny disclaimer line.
9. **Status bar** — blinking `statusText` + "🌐 Internet" at the window's bottom edge.

### Gimmick widgets (three small components)

- **`KnowledgeGraph`** — absolutely-positioned dots (round = concepts, square = documents)
  with an SVG `<line>` layer connecting them; glow via `box-shadow`. Static positions.
- **`RelationshipMeter`** — a heart row (`❤ ❤ ❤ ❤ ♡`) + a monospaced
  `LEVELS GENERATED: 9,999,999` counter chip.
- **`RiskGauge`** — an inline SVG `<polyline>` up-trend chart beside a labeled bar
  (`RISK: LOW`, ~25% fill).

These are presentational and self-contained; no shared state, no props beyond theme colors
where needed.

### Titlebar restyle

`Win95Window` already renders `GradientHeader` with the app icon + `app.title` + controls.
For project windows we drive the gradient from `ad.theme.header` and the text from
`ad.windowTitle`. Implementation: pass an optional `headerBackground` + `titleOverride` into
`Win95Window` (or read `APPS[id].ad`-derived values inside it). Project windows remain
close-only (existing `isProject` branch hides min/max). The mockup's fake "✕" maps to the
real close button — no extra close affordance is added.

## Styling Notes / Gotchas

- **Global font override:** `GlobalStyles` sets `font-family: 'W95FA' !important` on
  `body, button, p, a, …`. The ad display fonts (Impact, "Comic Sans MS", Georgia,
  "Times New Roman", "Courier New") must override this. Scope the ad styles with an equally-
  or-more-specific selector and `!important` on the ad-specific font rules (e.g. a styled
  `AdRoot` wrapper whose descendant rules set the display fonts with `!important`). All ad
  styling lives in styled-components scoped to the ad subtree so it cannot leak to other
  windows.
- **Window size:** bump the three project apps from `300×360` to **`330×500`** in `APPS`
  (`width`/`height`) so the ad content fits without scrolling. Project windows keep
  `overflow: hidden` (no scrollbar) per the existing `isProject` rule; content is authored to
  fit at the default size. The spawn helpers (`randomPosition`/`spawnPosition`) already read
  `APPS[pid].width/height`, so larger windows still spawn fully on-screen.
- **Body padding:** project windows already render flush (`BODY_PAD[id] = 0`); the ad supplies
  its own internal padding.
- **Animations:** `blink` (status text) and `marquee` (Stalk ticker) as styled-components
  `keyframes`. Respect no external libs.

## Data Flow

`openWin("projects")` → spawns each project window (unchanged) → `Win95Window` renders the
themed titlebar + `BODIES[id]` → `BODIES[id]` is now `<ProjectAd project={...} />` →
`ProjectAd` reads `project.ad` + real fields and renders the full ad. CTA click opens
`project.url` in a new tab (unchanged behavior, restyled trigger).

## Edge Cases

- **Thumbnail fails to load:** the beveled frame has a dark background, so a missing image
  degrades to a black product-shot panel; HUD text remains legible. No fallback image needed.
- **Long hook / title:** hooks are authored short and may contain explicit `<br>`; the
  titlebar already ellipsis-truncates overflow.
- **Small viewport:** existing spawn clamps keep the (now larger) window on-screen; if the
  viewport is smaller than the window, it falls back to the top-left margin as today.
- **Reduced motion:** wrap `blink`/`marquee` in `@media (prefers-reduced-motion: reduce)` to
  hold them static. (Low-cost robustness; included.)

## Out of Scope (deferred)

- Clicking project folders inside the Projects window (still a no-op, per prior spec).
- Sound effects on project-window open.
- Any ad treatment for non-project windows.
- Porting this aesthetic back to the vanilla (non-React) site.

## Testing / Verification

Manual, in the running Vite app (`npm run dev`, http://localhost:5173):

1. Open Projects → three ad popups spawn, each with its genre styling and gimmick widget.
2. Each window drags, focuses (z-order), shows a taskbar button, and closes via the titlebar ✕.
3. Real description, language, and GitHub link are present and the CTA opens the correct repo.
4. Display fonts render (not W95FA) inside the ads; W95FA still applies to other windows.
5. Content fits the default `330×500` window with no scrollbar.
