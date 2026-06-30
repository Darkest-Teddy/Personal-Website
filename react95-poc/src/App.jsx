import React, { useState, useEffect, useRef, useCallback } from "react";
import styled, { createGlobalStyle, ThemeProvider } from "styled-components";
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
      ? "linear-gradient(90deg, #000080, #1084d0)"
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

const Thumb = styled.img`
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
`;

const LangTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  i {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    display: inline-block;
  }
`;

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
  sapling: { title: "Sapling", icon: "/projects.png", width: 300, height: 360, pixel: true },
  mario: { title: "Super Artificial Bros.", icon: "/projects.png", width: 300, height: 360, pixel: true },
  stalk: { title: "Stalk Market", icon: "/projects.png", width: 300, height: 360, pixel: true },
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
        onMouseDown={onHeaderMouseDown}
        onDoubleClick={() => onMax(id)}
      >
        <TitleText>
          <img src={app.icon} alt="" />
          {app.title}
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

/* A single project's body — used as the content of each spawned project window.
   No inner frame/border: the content sits directly in the one window. */
function ProjectCard({ project: p }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box", padding: 8 }}>
      <Frame variant="well" style={{ padding: 2 }}>
        <Thumb src={p.img} alt={p.name} />
      </Frame>
      <p style={{ fontSize: 12, lineHeight: 1.35, flex: 1, margin: "8px 2px" }}>{p.desc}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2px" }}>
        <LangTag>
          <i style={{ background: p.langColor }} />
          {p.lang}
        </LangTag>
        <Button size="sm" onClick={() => window.open(p.url, "_blank")}>
          View »
        </Button>
      </div>
    </div>
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
  sapling: <ProjectCard project={PROJECTS.find((p) => p.id === "sapling")} />,
  mario: <ProjectCard project={PROJECTS.find((p) => p.id === "mario")} />,
  stalk: <ProjectCard project={PROJECTS.find((p) => p.id === "stalk")} />,
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
