# Project Pop-Ups as 90s Internet Ads — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the three spawning project pop-up windows (Sapling, Super Artificial Bros., Stalk Market) into garish, project-branded late-90s internet ads while keeping them informative.

**Architecture:** Pure restyle inside the existing React95 window manager. Project windows keep dragging, focus/z-order, taskbar buttons, and close-only behavior. We add a per-project `ad` data block, replace the window body (`ProjectCard` → `ProjectAd`), theme the titlebar per project, and add three small gimmick widgets — all in `react95-poc/src/App.jsx` using styled-components.

**Tech Stack:** React 18, React95 v4, styled-components v5, Vite. No test runner — verification is `npm run build` (compile gate) + manual visual check at http://localhost:5173.

**Visual source of truth:** `.superpowers/brainstorm/session1/content/ads-v2.html` (user-approved).

**Spec:** `docs/superpowers/specs/2026-06-29-project-popup-ads-design.md`

---

## File Structure

Everything lives in one file, matching the POC's existing single-file structure:

- **Modify:** `react95-poc/src/App.jsx`
  - `PROJECTS[]` — add an `ad` block to each of the 3 entries (Task 1).
  - `APPS` — bump the 3 project window sizes (Task 2).
  - New styled-components for the ad chassis + `blink`/`marquee` keyframes (Task 3).
  - New widget components `KnowledgeGraph`, `RelationshipMeter`, `RiskGauge` (Task 4).
  - New `ProjectAd` component; rewire `BODIES` (Task 5).
  - `GradientHeader` + `Win95Window` — per-project titlebar gradient + title (Task 6).
  - Final manual verification (Task 7).

Do NOT create new files: the POC is intentionally single-file.

---

## Task 1: Add the `ad` data block to each project

**Files:**
- Modify: `react95-poc/src/App.jsx` (the `PROJECTS` array, ~lines 305-336)

- [ ] **Step 1: Add `ad` to each project entry**

Replace the three project objects in `PROJECTS` so each keeps its existing fields and gains an `ad` object. The existing `id, name, color, img, lang, langColor, desc, url` fields stay unchanged.

```jsx
const PROJECTS = [
  {
    id: "sapling",
    name: "Sapling",
    color: "#3fb950",
    img: "/thumb-sapling.png",
    lang: "Python",
    langColor: "#3572A5",
    desc: "AI study platform powered by a dynamic neural knowledge graph. Turns your documents into a personal AI tutor with real-time knowledge visualization.",
    url: "https://github.com/SaplingLearn/Sapling",
    ad: {
      genre: "sapling",
      junkUrl: "http://sapling.study/grow-your-brain.html",
      windowTitle: "Sapling™ Learning Assistant",
      hook: "Turn Your Notes\nInto a Genius!",
      sub: "~ watch your knowledge literally grow 🌱 ~",
      bullets: [
        "Documents → a personal AI tutor",
        "Dynamic neural knowledge graph",
        "Real-time knowledge visualization",
      ],
      sealText: "GROWS WITH YOU!",
      ctaLabel: "🌱 CLICK to PLANT your knowledge! »",
      ctaSub: "free & open-source · grows in real time",
      statusText: "Graphing your brain…",
      legal: "*Side effects may include understanding. Sapling is a real project.",
      theme: {
        header: "linear-gradient(90deg,#1f7a33,#3fb950)",
        body: "linear-gradient(180deg,#eaffea,#bff0c4)",
        hookColor: "#11772a",
        hookFont: "Impact, Arial, sans-serif",
        sealBg: "#16a34a",
        cta: "linear-gradient(180deg,#42c75c,#1f7a33)",
      },
    },
  },
  {
    id: "mario",
    name: "Super Artificial Bros.",
    color: "#e34c26",
    img: "/thumb-mario.png",
    lang: "JavaScript",
    langColor: "#f1e05a",
    desc: "Super Mario Bros. reimagined with procedurally generated levels powered by Gemini and an AI relationship system that adapts gameplay to how you play.",
    url: "https://github.com/Darkest-Teddy/DynamicMarioBros",
    ad: {
      genre: "mario",
      junkUrl: "http://super-artificial-bros.fun/press-start.swf",
      windowTitle: "⚠ FREE GAME — INFINITE LEVELS",
      hook: "🍄 INFINITE MARIO\n— PLAY FREE! 🍄",
      sub: "",
      bullets: [
        "Procedurally generated levels (Gemini)",
        "AI relationship system adapts to your play",
        "No two playthroughs alike",
      ],
      sealText: "GEMINI POWERED!",
      ctaLabel: "▶ PRESS START — PLAY NOW! »",
      ctaSub: "no download · the levels make themselves",
      statusText: "● GENERATING LEVEL…",
      legal: "*Real open-source project. Mushrooms not included. AI may grow attached.",
      theme: {
        header: "linear-gradient(90deg,#b5231a,#e34c26)",
        body: "linear-gradient(180deg,#5aa9ff 0 30%,#86c440 30%)",
        hookColor: "#ffffff",
        hookFont: "'Comic Sans MS', Impact, Arial, sans-serif",
        sealBg: "#e34c26",
        cta: "linear-gradient(180deg,#ffcf3f,#e09a00)",
      },
    },
  },
  {
    id: "stalk",
    name: "Stalk Market",
    color: "#9d4edd",
    img: "/thumb-stalk-market.png",
    lang: "Python",
    langColor: "#3572A5",
    desc: "An AI-powered investment learning game that simulates the stock market in a colorful, approachable way using hybrid pricing models and an ML risk engine.",
    url: "https://github.com/Darkest-Teddy/StalkMarket",
    ad: {
      genre: "stalk",
      junkUrl: "http://stalk-market.game/turn-5-into-5000",
      windowTitle: "💰 Stalk Market — Trading Floor",
      hook: "Turn $5 into\n$5,000!",
      sub: "…with fake money, while you actually learn 📈",
      bullets: [
        "Hybrid pricing models",
        "ML-driven risk engine",
        "Trade with zero real money",
      ],
      sealText: "RISK-FREE!*",
      ctaLabel: "💵 CLICK to PLAY the MARKET! »",
      ctaSub: "limited time · 100% simulated · no broker needed",
      statusText: "$ MARKET OPEN…",
      legal: "*Not financial advice. Returns simulated. Real open-source learning game.",
      theme: {
        header: "linear-gradient(90deg,#5a189a,#9d4edd)",
        body: "linear-gradient(180deg,#2a0a45,#5a189a)",
        hookColor: "#ffd83d",
        hookFont: "'Times New Roman', Georgia, serif",
        sealBg: "#ffce1f",
        cta: "linear-gradient(180deg,#bb6bff,#5a189a)",
      },
    },
  },
];
```

- [ ] **Step 2: Verify it compiles**

Run: `cd react95-poc && npm run build`
Expected: build succeeds (no syntax errors). Warnings unrelated to this change are fine.

- [ ] **Step 3: Commit**

```bash
git add react95-poc/src/App.jsx
git commit -m "feat(ads): add per-project ad data block to PROJECTS"
```

---

## Task 2: Bump project window sizes

**Files:**
- Modify: `react95-poc/src/App.jsx` (the `APPS` object, ~lines 297-300)

- [ ] **Step 1: Change width/height for the 3 project apps**

Replace the `sapling`, `mario`, `stalk` lines in `APPS` (leave `welcome`, `about`, `projects`, `bank` untouched):

```jsx
  sapling: { title: "Sapling", icon: "/projects.png", width: 330, height: 500, pixel: true },
  mario: { title: "Super Artificial Bros.", icon: "/projects.png", width: 330, height: 500, pixel: true },
  stalk: { title: "Stalk Market", icon: "/projects.png", width: 330, height: 500, pixel: true },
```

- [ ] **Step 2: Verify it compiles**

Run: `cd react95-poc && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add react95-poc/src/App.jsx
git commit -m "feat(ads): size project windows to 330x500 for ad layout"
```

---

## Task 3: Add the ad chassis styled-components + keyframes

**Files:**
- Modify: `react95-poc/src/App.jsx` — add a new section after the `ProjectCard`-related styled-components (after `LangTag`, ~line 234) and before the `/* ---- Taskbar ---- */` section. Import `keyframes` from styled-components.

- [ ] **Step 1: Add `keyframes` to the styled-components import**

Change the top import (line 2) from:

```jsx
import styled, { createGlobalStyle, ThemeProvider } from "styled-components";
```

to:

```jsx
import styled, { createGlobalStyle, ThemeProvider, keyframes } from "styled-components";
```

- [ ] **Step 2: Add the ad styled-components block**

Insert this block right after the `LangTag` definition (~line 234). Note the `!important` font rules — they are required to beat the global `font-family: 'W95FA' !important` rule in `GlobalStyles`.

```jsx
/* ==================================================================
   90s-ad styled-components (project pop-up bodies)
   Fonts use !important to override the global W95FA rule.
================================================================== */
const blink = keyframes`50% { opacity: 0; }`;
const marquee = keyframes`from { transform: translateX(100%); } to { transform: translateX(-100%); }`;

/* Wrapper: owns the per-project body background + base ad font. */
const AdRoot = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: Arial, Helvetica, sans-serif !important;
  color: #000;
  background: ${(p) => p.$body};
`;

const AdScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 9px 10px;
  position: relative;
`;

const AdAddr = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 5px;
  background: #c0c0c0;
  border-bottom: 1px solid #808080;
  flex-shrink: 0;
`;
const AdUrl = styled.span`
  flex: 1;
  background: #fff;
  border: 1px solid;
  border-color: #808080 #fff #fff #808080;
  font-family: "Courier New", monospace !important;
  font-size: 11px;
  padding: 2px 5px;
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const AdGo = styled.span`
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  background: #c0c0c0;
  border: 1px solid;
  border-color: #fff #000 #000 #fff;
`;

const AdTicker = styled.div`
  background: #000;
  color: #7cfc9a;
  font-family: "Courier New", monospace !important;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 0;
  overflow: hidden;
  white-space: nowrap;
  flex-shrink: 0;
  span { display: inline-block; animation: ${marquee} 9s linear infinite; }
  @media (prefers-reduced-motion: reduce) { span { animation: none; } }
`;

const AdHook = styled.h2`
  margin: 0;
  text-align: center;
  text-transform: uppercase;
  line-height: 1.02;
  white-space: pre-line;
  font-size: 23px;
  font-weight: 900;
  color: ${(p) => p.$color};
  font-family: ${(p) => p.$font} !important;
  text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.6);
`;
const AdSub = styled.p`
  margin: 3px 0 6px;
  text-align: center;
  font-style: italic;
  font-weight: 700;
  font-size: 12px;
  font-family: Georgia, serif !important;
`;

const AdShot = styled.div`
  position: relative;
  border: 2px solid;
  border-color: #808080 #fff #fff #808080;
  background: #000;
  img { display: block; width: 100%; aspect-ratio: 3 / 2; object-fit: cover; }
`;
const AdHud = styled.div`
  position: absolute;
  top: 3px;
  left: 4px;
  right: 4px;
  display: flex;
  justify-content: space-between;
  font-family: "Courier New", monospace !important;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  text-shadow: 1px 1px 0 #000;
  pointer-events: none;
`;

const AdInfo = styled.div`
  background: #fffef0;
  border: 1px solid #000;
  padding: 7px 9px;
  margin: 8px 0;
  font-size: 12px;
  line-height: 1.4;
  color: #111;
  b { display: block; margin-bottom: 3px; }
`;
const AdSpecs = styled.ul`
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  line-height: 1.5;
  li { padding-left: 16px; position: relative; }
  li:before { content: "\\2714"; position: absolute; left: 0; color: #0a8f2a; font-weight: 700; }
`;
const AdReq = styled.div`
  font-family: "Courier New", monospace !important;
  font-size: 11px;
  margin-top: 6px;
`;

const AdCta = styled.a`
  display: block;
  text-align: center;
  text-decoration: none;
  margin-top: 9px;
  font-size: 16px;
  font-weight: 900;
  padding: 8px;
  color: #fff;
  border: 2px solid;
  border-color: #fff #000 #000 #fff;
  cursor: pointer;
  background: ${(p) => p.$cta};
  small { display: block; font-size: 10px; font-weight: 400; opacity: 0.9; }
`;

const AdLegal = styled.div`
  font-size: 9px;
  color: #555;
  margin-top: 6px;
  line-height: 1.3;
`;

const AdStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  font-size: 11px;
  color: #000;
  border-top: 1px solid #808080;
  background: #c0c0c0;
  flex-shrink: 0;
  .net { margin-left: auto; }
  .bk { animation: ${blink} 1s steps(1) infinite; }
  @media (prefers-reduced-motion: reduce) { .bk { animation: none; } }
`;

const AdSeal = styled.div`
  position: absolute;
  width: 74px;
  height: 74px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  line-height: 0.95;
  padding: 6px;
  z-index: 3;
  clip-path: polygon(50% 0,61% 18%,82% 12%,77% 33%,98% 38%,82% 53%,97% 70%,75% 70%,77% 92%,57% 80%,50% 100%,43% 80%,23% 92%,25% 70%,3% 70%,18% 53%,2% 38%,23% 33%,18% 12%,39% 18%);
  transform: rotate(-12deg);
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.4);
  background: ${(p) => p.$bg};
  color: ${(p) => p.$fg || "#fff"};
  top: ${(p) => p.$top || "34px"};
  ${(p) => (p.$side === "left" ? "left: 6px; transform: rotate(11deg);" : "right: 6px;")}
`;

/* shared widget shell */
const AdWidget = styled.div`
  border: 1px solid #000;
  margin: 8px 0;
  padding: 6px 8px;
  font-size: 11px;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$fg};
  border-color: ${(p) => p.$border || "#000"};
  .wlabel { font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
`;
```

- [ ] **Step 3: Verify it compiles**

Run: `cd react95-poc && npm run build`
Expected: build succeeds (these are unused so far — Vite/JS allow unused consts).

- [ ] **Step 4: Commit**

```bash
git add react95-poc/src/App.jsx
git commit -m "feat(ads): add 90s-ad styled-components and keyframes"
```

---

## Task 4: Build the three gimmick widgets

**Files:**
- Modify: `react95-poc/src/App.jsx` — add three components right after the `AdWidget` styled-component from Task 3, still above the Taskbar section.

- [ ] **Step 1: Add the widget components**

```jsx
/* Sapling: a small static "live knowledge graph" — round = concepts, square = docs. */
function KnowledgeGraph() {
  const nodeStyle = (l, t, doc) => ({
    position: "absolute",
    left: l,
    top: t,
    width: doc ? 15 : 11,
    height: doc ? 15 : 11,
    borderRadius: doc ? 2 : "50%",
    background: doc ? "#ffd83d" : "#7CFC9A",
    boxShadow: `0 0 6px ${doc ? "#ffd83d" : "#7CFC9A"}`,
  });
  return (
    <AdWidget $bg="#0c3d1c" $fg="#bdf5c8" $border="#16a34a">
      <div className="wlabel">▶ live knowledge graph — building…</div>
      <div style={{ position: "relative", height: 64 }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {[
            [20, 14, 64, 40], [64, 40, 130, 18], [64, 40, 120, 56],
            [20, 14, 170, 30], [120, 56, 180, 50],
          ].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3fb950" strokeWidth="1.5" opacity="0.7" />
          ))}
        </svg>
        <span style={nodeStyle(12, 8, true)} />
        <span style={nodeStyle(60, 35, false)} />
        <span style={nodeStyle(126, 13, false)} />
        <span style={nodeStyle(116, 51, false)} />
        <span style={nodeStyle(172, 25, true)} />
      </div>
    </AdWidget>
  );
}

/* Mario: AI-relationship heart meter + spinning levels-generated counter. */
function RelationshipMeter() {
  return (
    <AdWidget $bg="#1a1230" $fg="#ffd83d" $border="#000">
      <div className="wlabel">🤖 your A.I. buddy likes how you play</div>
      <span style={{ color: "#ff4d6d", letterSpacing: 2, fontSize: 14 }}>❤ ❤ ❤ ❤ ♡</span>
      &nbsp;·&nbsp;
      <span style={{
        fontFamily: '"Courier New", monospace', fontWeight: 900, fontSize: 13,
        color: "#fff", background: "#000", padding: "2px 5px",
      }}>
        LEVELS GENERATED: 9,999,999
      </span>
    </AdWidget>
  );
}

/* Stalk: rising portfolio chart + ML risk-engine gauge. */
function RiskGauge() {
  return (
    <AdWidget $bg="#12041f" $fg="#fff" $border="#ffd83d"
      style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <svg viewBox="0 0 88 46" preserveAspectRatio="none"
        style={{ flex: "0 0 88px", height: 46, background: "#000", border: "1px solid #2a0a45" }}>
        <polyline points="2,42 18,36 34,38 50,22 66,26 86,4" fill="none" stroke="#7CFC9A" strokeWidth="2" />
      </svg>
      <div style={{ flex: 1 }}>
        <div className="wlabel">🧠 ML risk engine</div>
        <div>RISK: LOW</div>
        <div style={{ height: 9, background: "#2a0a45", border: "1px solid #000", marginTop: 3 }}>
          <div style={{ height: "100%", width: "25%", background: "linear-gradient(90deg,#7CFC9A,#ffd83d)" }} />
        </div>
      </div>
    </AdWidget>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd react95-poc && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add react95-poc/src/App.jsx
git commit -m "feat(ads): add KnowledgeGraph, RelationshipMeter, RiskGauge widgets"
```

---

## Task 5: Build `ProjectAd` and rewire `BODIES`

**Files:**
- Modify: `react95-poc/src/App.jsx` — replace the `ProjectCard` component (~lines 577-595) with `ProjectAd`, and update the `BODIES` map (~lines 624-632).

- [ ] **Step 1: Replace `ProjectCard` with `ProjectAd`**

Delete the entire `ProjectCard` function and its leading comment block (~lines 576-595) and replace with:

```jsx
/* A single project's body, rendered as a 90s pop-up ad. Reads project.ad for
   copy/theme and the real project fields for the informative panel + CTA. */
function ProjectAd({ project: p }) {
  const ad = p.ad;
  const t = ad.theme;
  const Widget =
    ad.genre === "sapling" ? KnowledgeGraph :
    ad.genre === "mario" ? RelationshipMeter : RiskGauge;

  return (
    <AdRoot $body={t.body}>
      <AdAddr>
        <span style={{ fontSize: 11 }}>🌐</span>
        <AdUrl>{ad.junkUrl}</AdUrl>
        <AdGo>Go</AdGo>
      </AdAddr>

      {ad.genre === "stalk" && (
        <AdTicker><span>▲ YOU +999%　▲ practice cash　▲ no real money　▲ learn to invest　▲ YOU +999%</span></AdTicker>
      )}

      <AdScroll>
        <AdSeal
          $bg={t.sealBg}
          $fg={ad.genre === "stalk" ? "#5a189a" : "#fff"}
          $side={ad.genre === "mario" ? "left" : "right"}
          $top={ad.genre === "stalk" ? "54px" : "34px"}
        >
          {ad.sealText}
        </AdSeal>

        <AdHook $color={t.hookColor} $font={t.hookFont}>{ad.hook}</AdHook>
        {ad.sub && <AdSub style={{ color: ad.genre === "stalk" ? "#7CFC9A" : t.hookColor }}>{ad.sub}</AdSub>}

        <AdShot>
          {ad.genre === "mario" && (
            <AdHud><span>★ × ∞</span><span>🪙 99</span></AdHud>
          )}
          {ad.genre === "stalk" && (
            <AdHud><span>PORTFOLIO ▲ +999%</span><span>$5,000</span></AdHud>
          )}
          <img src={p.img} alt={p.name} />
        </AdShot>

        <Widget />

        <AdInfo style={ad.genre === "stalk" ? { background: "#1c0530", borderColor: "#ffd83d", color: "#fff" } : undefined}>
          <b style={ad.genre === "stalk" ? { color: "#ffd83d" } : undefined}>{p.name}</b>
          {p.desc}
          <AdSpecs>
            {ad.bullets.map((b) => <li key={b}>{b}</li>)}
          </AdSpecs>
          <AdReq>BUILT WITH: ▶ {p.lang}</AdReq>
        </AdInfo>

        <AdCta $cta={t.cta} href={p.url} target="_blank" rel="noreferrer"
          style={ad.genre === "mario" ? { color: "#7a2d00", fontFamily: '"Comic Sans MS", Arial' } : undefined}>
          {ad.ctaLabel}
          <small>{ad.ctaSub}</small>
        </AdCta>

        <AdLegal>{ad.legal}</AdLegal>
      </AdScroll>

      <AdStatus>
        <span className="bk">{ad.statusText}</span>
        <span className="net">🌐 Internet</span>
      </AdStatus>
    </AdRoot>
  );
}
```

- [ ] **Step 2: Update `BODIES` to use `ProjectAd`**

In the `BODIES` object (~lines 624-632), change the three project entries from `ProjectCard` to `ProjectAd`:

```jsx
  sapling: <ProjectAd project={PROJECTS.find((p) => p.id === "sapling")} />,
  mario: <ProjectAd project={PROJECTS.find((p) => p.id === "mario")} />,
  stalk: <ProjectAd project={PROJECTS.find((p) => p.id === "stalk")} />,
```

Leave `welcome`, `about`, `projects`, `bank` unchanged.

- [ ] **Step 3: Remove the now-unused `Thumb` styled-component**

`Thumb` (~lines 216-221) was only used by the deleted `ProjectCard`. Delete its definition to avoid dead code. (`LangTag` is also now unused — delete it too, ~lines 223-234.)

- [ ] **Step 4: Verify it compiles**

Run: `cd react95-poc && npm run build`
Expected: build succeeds with no "ProjectCard is not defined" / "Thumb is not defined" errors.

- [ ] **Step 5: Commit**

```bash
git add react95-poc/src/App.jsx
git commit -m "feat(ads): replace ProjectCard with 90s-ad ProjectAd body"
```

---

## Task 6: Theme the project window titlebar per project

**Files:**
- Modify: `react95-poc/src/App.jsx` — `GradientHeader` (~lines 95-116), and `Win95Window` (~lines 392-491).

- [ ] **Step 1: Let `GradientHeader` accept an active-state background**

In `GradientHeader`, change the `background` rule so an optional `$activeBg` overrides the default navy gradient when the window is active:

```jsx
  background: ${(p) =>
    p.$active
      ? (p.$activeBg || "linear-gradient(90deg, #000080, #1084d0)")
      : "linear-gradient(90deg, #808080, #b5b5b5)"};
```

- [ ] **Step 2: Compute the per-project ad in `Win95Window`**

In `Win95Window`, just after the existing `const isProject = PROJECT_IDS.includes(id);` line (~line 394), add:

```jsx
  const projectAd = isProject ? PROJECTS.find((pp) => pp.id === id)?.ad : null;
```

- [ ] **Step 3: Pass the gradient + title into the header**

In `Win95Window`'s returned JSX, update the `<GradientHeader>` opening tag to pass `$activeBg`, and the `<TitleText>` to use the ad's window title when present:

```jsx
      <GradientHeader
        active={active}
        $active={active}
        $activeBg={projectAd?.theme.header}
        onMouseDown={onHeaderMouseDown}
        onDoubleClick={() => onMax(id)}
      >
        <TitleText>
          <img src={app.icon} alt="" />
          {projectAd ? projectAd.windowTitle : app.title}
        </TitleText>
```

(The taskbar button keeps using `APPS[id].title` — only the window's own titlebar shows the junk title.)

- [ ] **Step 4: Verify it compiles**

Run: `cd react95-poc && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add react95-poc/src/App.jsx
git commit -m "feat(ads): theme project window titlebars per project"
```

---

## Task 7: Manual verification in the running app

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `cd react95-poc && npm run dev`
Open http://localhost:5173.

- [ ] **Step 2: Walk the checklist (from the spec)**

Confirm each, fixing in the relevant task above if any fails:

1. Open **Projects** → three ad popups spawn at random non-overlapping spots, each with its genre styling (Sapling green / Mario fire+sky / Stalk purple+gold).
2. Each window: titlebar shows the junk title + project color gradient; **drag** works; clicking **focuses** (raises z-order); a **taskbar button** appears (with the real project title); the titlebar **✕ closes** it. No minimize/maximize buttons (project windows are close-only).
3. Each ad shows: fake address bar with junk URL, the hook headline, the real thumbnail product-shot, the project gimmick widget (graph / heart-meter / chart+gauge), the cream info panel with the **real description + 3 bullets + BUILT WITH language**, the big CTA, and a blinking status bar. Stalk also shows the scrolling ticker.
4. Click each **CTA** → opens the correct GitHub repo in a new tab.
5. **Fonts:** ad display text renders in Impact / Comic Sans / Times (NOT W95FA); other windows (Welcome/About) still use W95FA.
6. Content **fits** the 330×500 window with no scrollbar.

- [ ] **Step 3: Final confirmation**

If all checks pass, the feature is complete. If the visual differs from the approved mockup, re-open `.superpowers/brainstorm/session1/content/ads-v2.html` side-by-side and adjust the relevant styled-components.

---

## Self-Review Notes

- **Spec coverage:** titlebar restyle (Task 6), `ad` data block incl. `bullets` (Task 1), `ProjectAd` body + address/ticker/shot/info/CTA/status (Task 5), three widgets (Task 4), font `!important` override + `prefers-reduced-motion` + sizing (Tasks 2-3), edge cases (missing thumbnail → black shot bg via `AdShot`; long title → existing ellipsis). All present.
- **Type/name consistency:** styled-components defined in Task 3 (`AdRoot`, `AdScroll`, `AdAddr`, `AdUrl`, `AdGo`, `AdTicker`, `AdHook`, `AdSub`, `AdShot`, `AdHud`, `AdInfo`, `AdSpecs`, `AdReq`, `AdCta`, `AdLegal`, `AdStatus`, `AdSeal`, `AdWidget`) are exactly the names used in Tasks 4-5. Widget names `KnowledgeGraph`/`RelationshipMeter`/`RiskGauge` match the `Widget` selection in `ProjectAd`. Prop names (`$body`, `$color`, `$font`, `$cta`, `$bg`, `$fg`, `$border`, `$side`, `$top`, `$activeBg`) are consistent between definition and use.
- **Dead code:** `ProjectCard`, `Thumb`, `LangTag` removed in Task 5.
