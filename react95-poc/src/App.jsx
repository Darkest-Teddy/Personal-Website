import React, { useState, useEffect, useRef, useCallback } from "react";
import styled, { createGlobalStyle, ThemeProvider, keyframes } from "styled-components";
import {
  styleReset,
  Window,
  WindowHeader,
  WindowContent,
  Button,
  AppBar,
  Toolbar,
  List,
  ListItem,
  Frame,
  Separator,
  createScrollbars,
} from "react95";
import original from "react95/dist/themes/original";

/* ------------------------------------------------------------------
   Theme: React95 "original" nudged toward Jack's '95 OS palette
------------------------------------------------------------------ */
const theme = {
  ...original,
  headerBackground: "#000080",
  headerNotActiveBackground: "#808080",
  headerText: "#ffffff",
  headerNotActiveText: "#d8d8d8",
  material: "#c0c0c0",
};

const GlobalStyles = createGlobalStyle`
  ${styleReset}
  @font-face { font-family: 'W95FA'; src: url('/W95FA.otf'); }
  html, body, #root { height: 100%; margin: 0; }
  body, button, input, select, textarea, ul, li, h1, h2, h3, p, a {
    font-family: 'W95FA' !important;
  }
  a { color: #0000ee; }

  /* Authentic Win95 scrollbars (beveled thumb + arrow buttons from react95) ... */
  ${createScrollbars()}
  /* ... but narrower (17px, not 26) and with a SOLID gray track instead of the
     default white-based hatch, which otherwise looks empty. */
  ::-webkit-scrollbar { width: 17px; height: 17px; }
  ::-webkit-scrollbar-button { width: 17px; height: 17px; }
  ::-webkit-scrollbar-track {
    background: #808080;
    background-image: none;
  }
`;

const Wallpaper = styled.video`
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -1;
`;

const Desktop = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

/* React95's Window: padding 4px + non-flex. Original .window is 3px + flex column,
   so the titlebar stays 22px and the body fills the rest. */
const Win = styled(Window)`
  padding: 3px;
  display: flex;
  flex-direction: column;
  /* Crisp outer bevel + clip content so nothing (scrollbar arrows, the resize
     grip, body content) spills past the window edge onto other windows/buttons. */
  border: 2px solid;
  border-color: #dfdfdf #404040 #404040 #dfdfdf;
  overflow: hidden;

  /* React95's resize handle defaults to 25x25 inset 10px; make it tiny and tuck it
     flush into the bottom-right corner, sitting on top so nothing shows under it. */
  [data-testid="resizeHandle"] {
    width: 10px;
    height: 10px;
    bottom: 2px;
    right: 2px;
    z-index: 2;
  }
`;

/* navy->blue gradient titlebar. React95's WindowHeader defaults to height:33px,
   a 2px border, and FORCES child buttons to 31x27 via a `.header .button` rule
   (specificity 0,2,0) — which is why plain `button {}` overrides did nothing.
   `&& button` (0,2,1) beats it, so the controls shrink to the original 17x15. */
const GradientHeader = styled(WindowHeader)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  height: 22px;
  line-height: 1;
  border: none;
  padding: 0 2px;
  font-size: 13px;
  background: ${(p) =>
    p.$active
      ? (p.$activeBg || "linear-gradient(90deg, #000080, #1084d0)")
      : "linear-gradient(90deg, #808080, #b5b5b5)"};

  && button {
    width: 17px;
    height: 15px;
    min-width: 0;
    padding: 0;
  }
`;

const TitleText = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  img { width: 16px; height: 16px; image-rendering: pixelated; }
`;

const TitleButtons = styled.div`
  display: flex;
  gap: 2px;
`;

/* Authentic Win95 control glyphs (drawn, not text), matching the original CSS */
const MinGlyph = styled.span`
  width: 7px;
  height: 2px;
  background: #000;
  align-self: flex-end;
  margin-bottom: 2px;
`;
const MaxGlyph = styled.span`
  width: 9px;
  height: 8px;
  border: 1px solid #000;
  border-top-width: 2px;
  box-sizing: border-box;
`;
const CloseGlyph = styled.span`
  font-size: 11px;
  font-weight: bold;
  line-height: 1;
`;

/* ---- Desktop icons ---- */
const IconGrid = styled.div`
  position: absolute;
  top: 12px;
  left: 10px;
  display: grid;
  grid-template-rows: repeat(5, auto);
  grid-auto-flow: column;
  gap: 18px;
`;

const DesktopIcon = styled.div`
  width: 84px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 4px;
  user-select: none;
  img { width: 56px; height: 56px; }
  span {
    margin-top: 4px;
    padding: 1px 3px;
    color: aliceblue;
    font-size: 13px;
    text-align: center;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.7);
  }
  &.selected span {
    background: #000080;
    color: #fff;
    outline: 1px dotted #fff;
  }
`;

/* ---- Projects ---- */
/* Folder grid inside the Projects window (desktop-icon style) */
const Folders = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 16px;
`;

const FolderIcon = styled.div`
  width: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 4px;
  user-select: none;
  img { width: 56px; height: 56px; image-rendering: pixelated; }
  span {
    margin-top: 4px;
    padding: 1px 3px;
    font-size: 13px;
    text-align: center;
  }
`;

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
  overflow-y: auto;
  overflow-x: hidden;
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
  img { display: block; width: 100%; height: 132px; object-fit: cover; }
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
  font-size: 12px;
  font-weight: 900;
  line-height: 0.95;
  padding: 6px;
  z-index: 3;
  clip-path: polygon(50% 0,61% 18%,82% 12%,77% 33%,98% 38%,82% 53%,97% 70%,75% 70%,77% 92%,57% 80%,50% 100%,43% 80%,23% 92%,25% 70%,3% 70%,18% 53%,2% 38%,23% 33%,18% 12%,39% 18%);
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.4);
  background: ${(p) => p.$bg};
  color: ${(p) => p.$fg || "#fff"};
  top: ${(p) => p.$top || "34px"};
  ${(p) => (p.$side === "left" ? "left: 6px; transform: rotate(11deg);" : "right: 6px; transform: rotate(-12deg);")}
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

/* ---- Taskbar ----
   React95 AppBar/Toolbar + md Buttons default to ~44px tall (button height 36px,
   Toolbar padding 4px). The original taskbar is 32px: 25px controls + 3px padding.
   `.TaskbarBtns button` (0,1,1) outranks Button's own height rule, so heights stick. */
const Taskbar = styled(AppBar)`
  height: 32px;
`;

const StartButton = styled(Button)`
  && {
    height: 25px;
    padding: 0 7px 0 4px;
    gap: 4px;
    font-size: 14px;
    font-weight: bold;
  }
`;

const TaskbarBtns = styled.div`
  display: flex;
  gap: 3px;
  flex: 1;
  margin-left: 4px;
  overflow: hidden;
  button {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 25px;
    min-width: 120px;
    max-width: 165px;
    padding: 0 7px;
    font-size: 12px;
    justify-content: flex-start;
    img { width: 16px; height: 16px; image-rendering: pixelated; }
    span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  }
`;

const Clock = styled(Frame)`
  margin-left: auto;
  height: 25px;
  display: flex;
  align-items: center;
  padding: 0 9px;
  font-size: 13px;
`;

const StartImg = styled.img`
  height: 16px;
  width: auto;
`;

/* ==================================================================
   App data
================================================================== */
const APPS = {
  welcome: { title: "Welcome", icon: "/computer.png", width: 256 },
  about: { title: "About Me", icon: "/msagent.png", width: 700, height: 400, pixel: true },
  projects: { title: "Projects", icon: "/projects.png", width: 420, height: 220, pixel: true },
  bank: { title: "RUNDLL", icon: "/money.png", width: 420, sound: true },
  sapling: { title: "Sapling", icon: "/projects.png", width: 330, height: 700, pixel: true },
  mario: { title: "Super Artificial Bros.", icon: "/projects.png", width: 330, height: 700, pixel: true },
  stalk: { title: "Stalk Market", icon: "/projects.png", width: 330, height: 700, pixel: true },
};

/* Project windows that spawn (at random on-screen spots) when Projects is opened. */
const PROJECT_IDS = ["sapling", "mario", "stalk"];

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

const TASKBAR_H = 32;
const MIN_W = 200;
const MIN_H = 120;

/* window-body padding per app: welcome/bank get the 12px "wb-pad"; about, projects,
   and the project windows manage their own inner padding, so the body is flush (0). */
const BODY_PAD = { welcome: 12, about: 0, projects: 0, bank: 0, sapling: 0, mario: 0, stalk: 0 };

/* Random spawn position that keeps the whole window in frame and clear of the taskbar. */
function randomPosition(width, height) {
  const maxX = Math.max(8, window.innerWidth - width - 8);
  const maxY = Math.max(8, window.innerHeight - TASKBAR_H - height - 8);
  return {
    x: Math.round(8 + Math.random() * (maxX - 8)),
    y: Math.round(8 + Math.random() * (maxY - 8)),
  };
}

/* Do two window rects overlap (with an 8px breathing gap)? */
function rectsOverlap(a, b, gap = 8) {
  return !(
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

/* On-screen position that does NOT overlap any already-placed rect. First tries
   random spots (so placement still looks varied); if those keep colliding, it scans
   a grid and returns the first clear spot — so it only ever overlaps when the
   viewport genuinely can't fit all the windows. */
function spawnPosition(width, height, placed) {
  const clear = (pos) =>
    !placed.some((r) => rectsOverlap({ x: pos.x, y: pos.y, w: width, h: height }, r));

  for (let i = 0; i < 60; i++) {
    const pos = randomPosition(width, height);
    if (clear(pos)) return pos;
  }

  const maxX = Math.max(8, window.innerWidth - width - 8);
  const maxY = Math.max(8, window.innerHeight - TASKBAR_H - height - 8);
  for (let y = 8; y <= maxY; y += 16) {
    for (let x = 8; x <= maxX; x += 16) {
      if (clear({ x, y })) return { x, y };
    }
  }
  return randomPosition(width, height); // viewport too small — overlap unavoidable
}

/* ==================================================================
   Reusable draggable window
================================================================== */
function Win95Window({ id, win, active, onFocus, onClose, onMin, onMax, onMove, onResize, children }) {
  const app = APPS[id];
  const isProject = PROJECT_IDS.includes(id); // project pop-ups: close-only, no scrollbar
  const projectAd = isProject ? PROJECTS.find((pp) => pp.id === id)?.ad : null;
  const dragging = useRef(null);
  const resizing = useRef(null);
  const winRef = useRef(null);
  const resizeRef = useRef(null);

  const onHeaderMouseDown = (e) => {
    onFocus(id);
    if (e.target.closest("button")) return; // don't drag from controls
    if (win.max) return;
    dragging.current = { startX: e.clientX, startY: e.clientY, ox: win.x, oy: win.y };
    e.preventDefault();
  };

  /* Start a resize from React95's bottom-right handle. Seed the start size from the
     live DOM box so windows with auto height (welcome/bank) resize from their
     rendered size rather than `undefined`. */
  useEffect(() => {
    const handle = resizeRef.current;
    if (!handle) return;
    const down = (e) => {
      onFocus(id);
      if (win.max) return;
      const box = winRef.current;
      resizing.current = {
        startX: e.clientX,
        startY: e.clientY,
        ow: box ? box.offsetWidth : win.w ?? app.width,
        oh: box ? box.offsetHeight : win.h ?? app.height ?? MIN_H,
      };
      e.preventDefault();
      e.stopPropagation();
    };
    handle.addEventListener("mousedown", down);
    return () => handle.removeEventListener("mousedown", down);
  }, [id, win.max, win.w, win.h, app.width, app.height, onFocus]);

  useEffect(() => {
    const move = (e) => {
      if (dragging.current) {
        const d = dragging.current;
        onMove(id, d.ox + (e.clientX - d.startX), d.oy + (e.clientY - d.startY));
      } else if (resizing.current) {
        const r = resizing.current;
        onResize(
          id,
          Math.max(MIN_W, r.ow + (e.clientX - r.startX)),
          Math.max(MIN_H, r.oh + (e.clientY - r.startY))
        );
      }
    };
    const up = () => {
      dragging.current = null;
      resizing.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [id, onMove, onResize]);

  const style = win.max
    ? { position: "absolute", top: 0, left: 0, width: "100%", height: `calc(100% - ${TASKBAR_H}px)`, zIndex: win.z }
    : {
        position: "absolute",
        top: win.y,
        left: win.x,
        width: win.w ?? app.width,
        height: win.h ?? app.height,
        zIndex: win.z,
      };

  return (
    <Win
      ref={winRef}
      style={style}
      onMouseDown={() => onFocus(id)}
      resizable={!win.max}
      resizeRef={resizeRef}
    >
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
        <TitleButtons>
          {!isProject && <Button onClick={() => onMin(id)}><MinGlyph /></Button>}
          {!isProject && <Button onClick={() => onMax(id)}><MaxGlyph /></Button>}
          <Button onClick={() => onClose(id)}><CloseGlyph>✕</CloseGlyph></Button>
        </TitleButtons>
      </GradientHeader>
      <WindowContent
        style={{
          flex: 1,
          minHeight: 0,
          /* Project pop-ups don't scroll (no scrollbar); other windows scroll. */
          overflow: isProject ? "hidden" : "auto",
          padding: BODY_PAD[id],
          textAlign: id === "welcome" ? "center" : undefined,
          /* Reserve a strip below the content so a vertical scrollbar's down-arrow
             ends ABOVE the resize grip. Not needed when there's no scrollbar. */
          marginBottom: win.max || isProject ? 0 : 12,
        }}
      >
        {children}
      </WindowContent>
    </Win>
  );
}

/* ==================================================================
   Window contents
================================================================== */
function WelcomeBody() {
  return (
    <div style={{ textAlign: "center" }}>
      <img
        src="/car.gif"
        alt=""
        style={{
          width: 128,
          height: 128,
          borderRadius: "50%",
          border: "2px solid #d1d0d0",
          objectFit: "cover",
        }}
      />
      <h1 style={{ margin: "6px 0", fontSize: 34, fontWeight: "bold", lineHeight: 1 }}>'95 OS</h1>
      <p style={{ margin: "0 0 8px" }}>
        Seems like yesterday...
        <br />
        Developed by Jack He
      </p>
      <a href="https://github.com/Darkest-Teddy" target="_blank" rel="noreferrer">
        Github
      </a>
    </div>
  );
}

function AboutBody() {
  return (
    <div style={{ display: "flex", height: "100%", boxSizing: "border-box" }}>
      <div style={{ width: "50%", padding: 16, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
        <img
          src="/profile-pixel.png"
          alt="Jack He"
          style={{ width: 128, height: 128, border: "2px solid #d1d0d0", objectFit: "cover", imageRendering: "pixelated" }}
        />
      </div>
      <Separator orientation="vertical" size="100%" />
      <div style={{ width: "50%", padding: 16, overflowY: "auto", textAlign: "left" }}>
        <h2 style={{ margin: "0 0 8px" }}>Jack He</h2>
        <p style={{ margin: "0 0 12px" }}>
          I'm Jack, a propspective software engineer currently studying Computer Science @ Boston University. I care about
          building things that actually matter: software with a real purpose and a little personality. I'm especially into
          machine learning, and I've spent a good chunk of time training custom AI models from scratch using online data and
          reinforced prompting. When I'm not deep in a codebase, I'm probably thinking about the next problem worth solving in
          the real world.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          I currently work as a software developer @ Honor Society of Cinematic Arts, building new, exciting interactive gaming
          and visual content for filmmaking students.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          As a first year, I have exercised my skills to build the impossible in a single day at many hackathons. I have
          competeted at Boston Hacks, BU's Data Science + X, and BU's Civic Hacks. Personally, I always felt the passion to push
          myself to go beyond academia and to persue ideas that challenge my thinking critically.
        </p>
      </div>
    </div>
  );
}

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

/* Projects window body: three folders, laid out like desktop icons, directly in
   WindowContent (single scroll container). Clicking a folder does nothing yet. */
function ProjectsBody() {
  return (
    <Folders>
      {PROJECTS.map((p) => (
        <FolderIcon key={p.id}>
          <img src="/projects.png" alt="" />
          <span>{p.name}</span>
        </FolderIcon>
      ))}
    </Folders>
  );
}

function BankBody() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 14px" }}>
      <img src="/error.png" alt="Error" style={{ width: 32, height: 32, flexShrink: 0 }} />
      <div style={{ textAlign: "left" }}>
        <p style={{ margin: "2px 0" }}>Error loading bankaccountinformation.exe</p>
        <p style={{ margin: "2px 0" }}>One of the library files needed to run this application cannot be found.</p>
      </div>
    </div>
  );
}

const BODIES = {
  welcome: <WelcomeBody />,
  about: <AboutBody />,
  projects: <ProjectsBody />,
  bank: <BankBody />,
  sapling: <ProjectAd project={PROJECTS.find((p) => p.id === "sapling")} />,
  mario: <ProjectAd project={PROJECTS.find((p) => p.id === "mario")} />,
  stalk: <ProjectAd project={PROJECTS.find((p) => p.id === "stalk")} />,
};

/* ==================================================================
   App + window manager
================================================================== */
export default function App() {
  const [wins, setWins] = useState(() => {
    // Center the Welcome window on load (width known; height ~300 estimated).
    const wx = Math.max(8, Math.round((window.innerWidth - APPS.welcome.width) / 2));
    const wy = Math.max(8, Math.round((window.innerHeight - TASKBAR_H - 300) / 2));
    return {
      welcome: { open: true, min: false, max: false, x: wx, y: wy, z: 10, prev: null },
      about: { open: false, min: false, max: false, x: 140, y: 70, z: 1, prev: null },
      projects: { open: false, min: false, max: false, x: 200, y: 90, z: 1, prev: null },
      bank: { open: false, min: false, max: false, x: 320, y: 160, z: 1, prev: null },
      sapling: { open: false, min: false, max: false, x: 0, y: 0, z: 1, prev: null },
      mario: { open: false, min: false, max: false, x: 0, y: 0, z: 1, prev: null },
      stalk: { open: false, min: false, max: false, x: 0, y: 0, z: 1, prev: null },
    };
  });
  const [activeId, setActiveId] = useState("welcome");
  const [startOpen, setStartOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [time, setTime] = useState("");
  const zTop = useRef(10);
  const errorSound = useRef(null);

  useEffect(() => {
    errorSound.current = new Audio("/error.mp3");
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const focusWin = useCallback((id) => {
    zTop.current += 1;
    setActiveId(id);
    setWins((w) => ({ ...w, [id]: { ...w[id], z: zTop.current, min: false } }));
  }, []);

  const openWin = useCallback((id) => {
    setStartOpen(false);
    setActiveId(id);
    setWins((w) => {
      let z = zTop.current;
      const next = { ...w, [id]: { ...w[id], open: true, min: false, z: ++z } };
      // Opening Projects also spawns each project window that isn't already open,
      // at a random on-screen spot that doesn't overlap the others (already-open
      // ones are left as-is, but counted so new ones avoid them too).
      if (id === "projects") {
        const placed = PROJECT_IDS.filter((pid) => w[pid].open).map((pid) => ({
          x: w[pid].x,
          y: w[pid].y,
          w: w[pid].w ?? APPS[pid].width,
          h: w[pid].h ?? APPS[pid].height,
        }));
        for (const pid of PROJECT_IDS) {
          if (!w[pid].open) {
            const width = APPS[pid].width;
            const height = APPS[pid].height;
            const { x, y } = spawnPosition(width, height, placed);
            placed.push({ x, y, w: width, h: height });
            next[pid] = { ...w[pid], open: true, min: false, max: false, x, y, z: ++z };
          }
        }
      }
      zTop.current = z;
      return next;
    });
    if (APPS[id].sound && errorSound.current) {
      errorSound.current.currentTime = 0;
      errorSound.current.play().catch(() => {});
    }
  }, []);

  const closeWin = useCallback((id) => {
    setWins((w) => ({ ...w, [id]: { ...w[id], open: false, min: false, max: false } }));
  }, []);

  const minWin = useCallback((id) => {
    setWins((w) => ({ ...w, [id]: { ...w[id], min: true } }));
    setActiveId((a) => (a === id ? null : a));
  }, []);

  const toggleMax = useCallback((id) => {
    setWins((w) => ({ ...w, [id]: { ...w[id], max: !w[id].max } }));
  }, []);

  const moveWin = useCallback((id, x, y) => {
    setWins((w) => ({ ...w, [id]: { ...w[id], x, y } }));
  }, []);

  const resizeWin = useCallback((id, width, height) => {
    setWins((w) => ({ ...w, [id]: { ...w[id], w: width, h: height } }));
  }, []);

  const onTaskbarClick = (id) => {
    const win = wins[id];
    if (win.min) focusWin(id);
    else if (activeId === id) minWin(id);
    else focusWin(id);
  };

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <Wallpaper autoPlay loop muted playsInline>
        <source src="/wallpaper.mp4" type="video/mp4" />
      </Wallpaper>

      <Desktop
        onMouseDown={() => {
          setSelectedIcon(null);
          if (startOpen) setStartOpen(false);
        }}
      >
        {/* Desktop icons */}
        <IconGrid onMouseDown={(e) => e.stopPropagation()}>
          {Object.entries(APPS)
            .filter(([id]) => !PROJECT_IDS.includes(id))
            .map(([id, app]) => (
            <DesktopIcon
              key={id}
              className={selectedIcon === id ? "selected" : ""}
              onClick={() => setSelectedIcon(id)}
              onDoubleClick={() => openWin(id)}
            >
              <img src={app.icon} alt="" style={{ imageRendering: app.pixel ? "pixelated" : "auto" }} />
              <span>{id === "bank" ? "My Bank Account Information" : app.title}</span>
            </DesktopIcon>
          ))}
        </IconGrid>

        {/* Windows */}
        {Object.entries(wins).map(([id, win]) =>
          win.open && !win.min ? (
            <Win95Window
              key={id}
              id={id}
              win={win}
              active={activeId === id}
              onFocus={focusWin}
              onClose={closeWin}
              onMin={minWin}
              onMax={toggleMax}
              onMove={moveWin}
              onResize={resizeWin}
            >
              {BODIES[id]}
            </Win95Window>
          ) : null
        )}

        {/* Start menu */}
        {startOpen && (
          <List
            style={{ position: "absolute", left: 4, bottom: TASKBAR_H, zIndex: 99999 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {Object.entries(APPS)
              .filter(([id]) => !PROJECT_IDS.includes(id))
              .map(([id, app]) => (
              <ListItem key={id} onClick={() => openWin(id)}>
                <img src={app.icon} alt="" style={{ width: 22, height: 22, marginRight: 8, imageRendering: "pixelated" }} />
                {id === "bank" ? "My Bank Account" : app.title}
              </ListItem>
            ))}
            <Separator />
            <ListItem onClick={() => window.open("https://github.com/Darkest-Teddy", "_blank")}>
              <img src="/computer.png" alt="" style={{ width: 22, height: 22, marginRight: 8 }} />
              GitHub
            </ListItem>
          </List>
        )}

        {/* Taskbar */}
        <Taskbar style={{ top: "auto", bottom: 0, zIndex: 9999 }}>
          <Toolbar style={{ justifyContent: "flex-start", padding: 3, gap: 4, minHeight: 0 }}>
            <StartButton
              active={startOpen}
              onMouseDown={(e) => {
                e.stopPropagation();
                setStartOpen((s) => !s);
              }}
            >
              <StartImg src="/start.png" alt="" />
              Start
            </StartButton>

            <TaskbarBtns>
              {Object.entries(wins)
                .filter(([, w]) => w.open)
                .map(([id]) => (
                  <Button key={id} active={activeId === id && !wins[id].min} onClick={() => onTaskbarClick(id)}>
                    <img src={APPS[id].icon} alt="" />
                    <span>{APPS[id].title}</span>
                  </Button>
                ))}
            </TaskbarBtns>

            <Clock variant="well">{time}</Clock>
          </Toolbar>
        </Taskbar>
      </Desktop>
    </ThemeProvider>
  );
}
