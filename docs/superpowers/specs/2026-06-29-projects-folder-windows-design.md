# Projects Section as Spawning Project Windows — Design

**Date:** 2026-06-29
**Scope:** `react95-poc/src/App.jsx` (React95 proof-of-concept)

## Goal

Rework the Projects window so that:

1. The Projects window body shows **three folders** (Sapling, Super Artificial Bros., Stalk Market) laid out like desktop icons.
2. **Opening the Projects window** also spawns a separate pop-up window for each project that isn't already open, at a **random but fully on-screen** position.
3. Each project pop-up window contains the **existing project card** (full card, including its inner gradient name-bar) as its body.
4. Clicking a folder inside the Projects window does **nothing yet** (placeholder for later).

## Approach

Project windows are **first-class apps** in the existing window manager — added to the same `APPS`, `wins`, and `BODIES` structures used by Welcome/About/Projects/Bank. This gives dragging, resizing (corner grip), focus/z-index, minimize/maximize/close, and taskbar buttons for free, with no special-casing.

## Components & Data

- **`APPS`** gains three entries: `sapling`, `mario`, `stalk`, each `{ title, icon: "/projects.png", width: 300, height: 360 }`. `title` = project name.
- **`wins`** initial state gains three `open: false` entries for those ids.
- **`ProjectCard`** — new component extracted from the current card markup (gradient name-bar + colored dot, thumbnail-in-well, description, language tag, "View »" button). Reused for each project window body.
- **`BODIES`** maps `sapling`/`mario`/`stalk` to `<ProjectCard project={...} />`.
- **`ProjectsBody`** is rewritten: instead of the 3-column card grid, it renders three folder icons (folder image `/projects.png` + name label), styled like the existing desktop icons. Click handlers are **no-ops** for now.
- **`PROJECT_IDS = ["sapling", "mario", "stalk"]`** — the spawn list.

## Spawn Logic

In `openWin(id)`, when `id === "projects"`:

1. Open the Projects window as normal.
2. For each id in `PROJECT_IDS`, if `wins[id].open` is **false**, open it at a freshly computed random position. Already-open windows (including minimized ones, which count as open) are left untouched.

Because positions are computed per spawn, a project window that was closed reappears at a new random spot next time Projects is opened.

## Random Position Helper

`randomPosition(width, height)` returns `{ x, y }` such that the whole window stays in frame and clear of the taskbar:

- `maxX = max(8, window.innerWidth  - width  - 8)`
- `maxY = max(8, window.innerHeight - TASKBAR_H - height - 8)`
- `x = 8 + random() * (maxX - 8)`, `y = 8 + random() * (maxY - 8)`

Clamps keep `x`/`y` non-negative on small viewports. `Math.random()` runs in the browser (not a workflow), so it is available.

## Taskbar & Desktop

- Each open project window automatically appears as its own taskbar button (icon + title), via the existing open-windows mapping.
- The desktop "Projects" icon and Start-menu "Projects" entry are unchanged — they already call `openWin("projects")`, which now also triggers the spawns.

## Edge Cases

- **Minimized project window** counts as open → not respawned.
- **Maximize / resize / close** behave like any other window (inherited from the manager).
- **Small viewport**: clamp guarantees a valid on-screen position even if the window is larger than the available area (falls back to top-left margin).

## Out of Scope (explicitly deferred)

- Any behavior when clicking the folder icons inside the Projects window.
- New project content, icons, or assets beyond what already exists.
