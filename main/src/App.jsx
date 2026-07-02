import React, { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();
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

const theme = {
  ...original,
  headerBackground: "#000080",
  headerNotActiveBackground: "#808080",
  headerText: "#ffffff",
  headerNotActiveText: "#d8d8d8",
  material: "#c0c0c0",
};

const goombaWalk = keyframes`
  0%   { transform: translateX(0); }
  50%  { transform: translateX(210px); }
  100% { transform: translateX(0); }
`;

const tickAnim = keyframes`
  to { transform: translateX(-100%); }
`;

const GlobalStyles = createGlobalStyle`
  ${styleReset}
  @font-face { font-family: 'W95FA'; src: url('/W95FA.otf'); }
  html, body, #root { height: 100%; margin: 0; }
  body, button, input, select, textarea, ul, li, h1, h2, h3, p, a {
    font-family: 'W95FA' !important;
  }
  a { color: #0000ee; }
  button { outline: none !important; background-image: none !important; }
  button:focus { outline: none !important; }
  button:active { background: #b8b8b8 !important; background-image: none !important; }
  b, strong { font-weight: bold !important; }
  ${createScrollbars()}
  ::-webkit-scrollbar { width: 17px; height: 17px; }
  ::-webkit-scrollbar-button { width: 17px; height: 17px; }
  ::-webkit-scrollbar-track { background: #808080; background-image: none; }
`;

const Wallpaper = styled.video`
  position: fixed; inset: 0; width: 100%; height: 100%;
  object-fit: cover; z-index: -1;
`;

const Desktop = styled.div`
  position: relative; width: 100%; height: 100%; overflow: hidden;
`;

/* $clip=false lets decorations (goomba, chicken, svg graph) overflow the window frame */
const Win = styled(Window)`
  padding: 3px;
  display: flex;
  flex-direction: column;
  border: 2px solid;
  border-color: #dfdfdf #404040 #404040 #dfdfdf;
  overflow: ${p => p.$clip === false ? "visible" : "hidden"};

  [data-testid="resizeHandle"] {
    width: 10px; height: 10px; bottom: 2px; right: 2px; z-index: 2;
  }
`;

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
  background: ${p => p.$active
    ? (p.$activeBg   || "linear-gradient(90deg, #000080, #1084d0)")
    : (p.$inactiveBg || "linear-gradient(90deg, #808080, #b5b5b5)")};
  color: ${p => p.$active
    ? (p.$activeColor   || "#ffffff")
    : (p.$inactiveColor || "#d8d8d8")};

`;


const TitleText = styled.span`
  display: flex; align-items: center; gap: 4px;
  font-weight: bold; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
  img { width: 16px; height: 16px; image-rendering: pixelated; }
  svg { flex: none; }
`;

const TitleButtons = styled.div`display: flex; gap: 2px;`;

/* Native button matching the original HTML's .tb-btn exactly */
const TitleBtn = styled.button`
  width: 17px; height: 15px; padding: 0;
  background: #c0c0c0;
  border: 1px solid;
  border-color: #ffffff #404040 #404040 #ffffff;
  box-shadow: inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #000;
  outline: none; flex-shrink: 0;
  &:focus { outline: none; }
  &:active {
    border-color: #404040 #ffffff #ffffff #404040;
    box-shadow: inset 1px 1px 0 #808080;
  }
`;

const MinGlyph = styled.span`
  display: block; width: 7px; height: 2px; background: #000; margin-top: 6px;
`;
const MaxGlyph = styled.span`
  width: 9px; height: 8px;
  border: 1px solid #000; border-top-width: 2px; box-sizing: border-box;
`;
const CloseGlyph = styled.span`font-size: 11px; font-weight: bold; line-height: 1;`;

/* Goomba walks above the Mario window (absolute inside Win, overflows via $clip=false) */
const GoombaWalker = styled.img`
  position: absolute;
  top: -30px;
  left: 4px;
  width: 30px; height: 30px;
  image-rendering: pixelated;
  animation: ${goombaWalk} 7s linear infinite;
  pointer-events: none;
  z-index: 10;
`;

/* Stalk ticker span */
const TickSpan = styled.span`
  display: inline-block;
  padding-left: 100%;
  font-family: "Courier New", monospace !important;
  font-weight: 700;
  font-size: 11px;
  color: #39ff88;
  letter-spacing: .04em;
  animation: ${tickAnim} 13s linear infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const IconGrid = styled.div`
  position: absolute; top: 12px; left: 10px;
  display: grid; grid-template-rows: repeat(4, auto);
  grid-auto-flow: column; row-gap: 18px; column-gap: 2px;
`;

const DesktopIcon = styled.div`
  width: 84px; display: flex; flex-direction: column;
  align-items: center; cursor: pointer; padding: 4px; user-select: none;
  ${p => p.$gridRow ? `grid-row: ${p.$gridRow};` : ""}
  ${p => p.$gridColumn ? `grid-column: ${p.$gridColumn};` : ""}
  img { width: 56px; height: 56px; object-fit: contain; }
  span {
    margin-top: 4px; padding: 1px 3px; color: aliceblue;
    font-size: 13px; text-align: center;
    text-shadow: 1px 1px 1px rgba(0,0,0,0.7);
  }
  &.selected span { background: #000080; color: #fff; outline: 1px dotted #fff; }
`;

const Folders = styled.div`display: flex; flex-wrap: wrap; gap: 24px; padding: 16px;`;

const FolderIcon = styled.div`
  width: 96px; display: flex; flex-direction: column;
  align-items: center; cursor: pointer; padding: 4px; user-select: none;
  img { width: 56px; height: 56px; image-rendering: pixelated; }
  span { margin-top: 4px; padding: 1px 3px; font-size: 13px; text-align: center; }
`;

const Taskbar = styled(AppBar)`height: 32px;`;

const StartButton = styled.button`
  display: flex; align-items: center; gap: 5px;
  height: 25px; padding: 0 7px 0 4px;
  font-size: 14px; font-weight: bold; font-family: 'W95FA', sans-serif;
  cursor: pointer; outline: none; flex-shrink: 0;
  background: ${p => p.$active ? "#b8b8b8" : "#c0c0c0"};
  border: 2px solid;
  border-color: ${p => p.$active ? "#404040 #ffffff #ffffff #404040" : "#ffffff #404040 #404040 #ffffff"};
  box-shadow: ${p => p.$active ? "inset 1px 1px 0 #808080" : "inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080"};
`;

const TaskbarBtns = styled.div`
  display: flex; gap: 3px; flex: 1; margin-left: 4px; overflow: hidden;
`;

const TaskbarWinBtn = styled.button`
  display: flex; align-items: center; gap: 5px; height: 25px;
  min-width: 120px; max-width: 165px; padding: 0 7px;
  font-size: 12px; font-family: 'W95FA', sans-serif;
  justify-content: flex-start; cursor: pointer;
  background: #c0c0c0;
  border: 2px solid;
  border-color: #ffffff #404040 #404040 #ffffff;
  box-shadow: inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080;
  outline: none;
  img { width: 16px; height: 16px; image-rendering: pixelated; flex-shrink: 0; }
  span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &.active {
    background: #b8b8b8;
    border-color: #404040 #ffffff #ffffff #404040;
    box-shadow: inset 1px 1px 0 #808080;
    font-weight: bold;
  }
`;

const Clock = styled(Frame)`
  margin-left: auto; height: 25px;
  display: flex; align-items: center; padding: 0 9px; font-size: 13px;
`;

const StartImg = styled.img`height: 16px; width: auto;`;

/* ── Titlebar SVG icons for project windows ── */
function SaplingIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15">
      <circle cx="7.5" cy="7.5" r="7" fill="#0d5c22" />
      <path d="M7.5 12.5V6" stroke="#d8ffe2" strokeWidth="1.4" />
      <path d="M7.5 7.2c-2 0-3.2-1.3-3.2-3.1 2 0 3.2 1 3.2 3.1z" fill="#8be3a0" />
      <path d="M7.5 6.4c1.6 0 2.7-1.1 2.7-2.6-1.7 0-2.7 1-2.7 2.6z" fill="#d8ffe2" />
    </svg>
  );
}

function MarioIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15">
      <rect x="1" y="1" width="13" height="13" fill="#f2a900" stroke="#8a5a00" strokeWidth="1.2" />
      <text x="7.5" y="11.3" textAnchor="middle" fontFamily="Arial" fontWeight="900" fontSize="10" fill="#fff">?</text>
    </svg>
  );
}

function StalkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15">
      <circle cx="7.5" cy="7.5" r="7" fill="#0f6b2e" />
      <text x="7.5" y="11.2" textAnchor="middle" fontFamily="Georgia" fontWeight="900" fontSize="10" fill="#ffd93b">$</text>
    </svg>
  );
}

/* ── App registry ── */
const APPS = {
  welcome:  { title: "Welcome",    icon: "/welcome.png", width: 300, pixel: true },
  about:    { title: "About Me", icon: "/msagent.png", width: 760, height: 480, pixel: true },
  projects: { title: "Projects",   icon: "/projects.png", width: 420, height: 220, pixel: true },
  resume:   { title: "Resume",     icon: "/resume.png",   width: 680, height: 860, pixel: true, gridRow: 3, gridColumn: 2 },
  github:   { title: "GitHub",     icon: "/icon-github.png",   link: "https://github.com/Darkest-Teddy",           pixel: true, bottom: true },
  linkedin: { title: "LinkedIn",   icon: "/linkedin.png", link: "https://www.linkedin.com/in/jacklhe/",       pixel: true, bottom: true },
  bank:     { title: "RUNDLL",     icon: "/money.png",    width: 420, sound: true },
  updatelog: { title: "Patch", icon: "/projects.png", width: 300, height: 380, noDesktop: true },
  sapling: {
    title: "Sapling", iconNode: <SaplingIcon />, icon: "/sapling-icon.svg", width: 256,
    titlebarBg: "linear-gradient(180deg,#39a552,#1f7a33)", titlebarColor: "#fff",
  },
  mario: {
    title: "super-artificial-bros", iconNode: <MarioIcon />, icon: "/mario.gif", width: 256,
    titlebarBg: "linear-gradient(180deg,#e0392c,#b5231a)", titlebarColor: "#fff",
  },
  stalk: {
    title: "Stalk Market", iconNode: <StalkIcon />, icon: "/chicken.png", width: 256,
    titlebarBg: "linear-gradient(180deg,#ffcf3f,#dda000)", titlebarColor: "#3a2600",
  },
};

const PROJECT_IDS = ["sapling", "mario", "stalk"];

const PROJECTS = [
  { id: "sapling", name: "Sapling",               color: "#3fb950", img: "/thumb-sapling.png",      url: "https://saplinglearn.com",                                    icon: "/sapling-icon.svg" },
  { id: "mario",   name: "Super Artificial Bros.", color: "#e34c26", img: "/thumb-mario.png",        url: "https://devpost.com/software/superartificialbrothers",        icon: "/mario.gif" },
  { id: "stalk",   name: "Stalk Market",           color: "#9d4edd", img: "/thumb-stalk-market.png", url: "https://stalk-market.vercel.app/",                            icon: "/chicken.png" },
];

const TASKBAR_H = 32;
const MIN_W = 200;
const MIN_H = 120;
const BODY_PAD = { welcome: 12, about: 0, projects: 0, bank: 0, resume: 0, sapling: 0, mario: 0, stalk: 0 };

function randomPosition(width, height) {
  const maxX = Math.max(8, window.innerWidth  - width  - 8);
  const maxY = Math.max(8, window.innerHeight - TASKBAR_H - height - 8);
  return { x: Math.round(8 + Math.random() * (maxX - 8)), y: Math.round(8 + Math.random() * (maxY - 8)) };
}

function rectsOverlap(a, b, gap = 8) {
  return !(a.x+a.w+gap <= b.x || b.x+b.w+gap <= a.x || a.y+a.h+gap <= b.y || b.y+b.h+gap <= a.y);
}

function spawnPosition(width, height, placed) {
  const clear = pos => !placed.some(r => rectsOverlap({ x: pos.x, y: pos.y, w: width, h: height }, r));
  for (let i = 0; i < 60; i++) { const pos = randomPosition(width, height); if (clear(pos)) return pos; }
  const maxX = Math.max(8, window.innerWidth - width - 8);
  const maxY = Math.max(8, window.innerHeight - TASKBAR_H - height - 8);
  for (let y = 8; y <= maxY; y += 16) for (let x = 8; x <= maxX; x += 16) if (clear({ x, y })) return { x, y };
  return randomPosition(width, height);
}

/* ── Draggable Win95 window ── */
function Win95Window({ id, win, active, onFocus, onClose, onMin, onMax, onMove, onResize, children }) {
  const app = APPS[id];
  const isProject = PROJECT_IDS.includes(id);
  const dragging = useRef(null);
  const resizing = useRef(null);
  const winRef   = useRef(null);
  const resizeRef = useRef(null);

  const onHeaderMouseDown = e => {
    onFocus(id);
    if (e.target.closest("button")) return;
    if (win.max) return;
    dragging.current = { startX: e.clientX, startY: e.clientY, ox: win.x, oy: win.y };
    e.preventDefault();
  };

  useEffect(() => {
    const handle = resizeRef.current;
    if (!handle) return;
    const down = e => {
      onFocus(id);
      if (win.max) return;
      const box = winRef.current;
      resizing.current = {
        startX: e.clientX, startY: e.clientY,
        ow: box ? box.offsetWidth  : (win.w ?? app.width),
        oh: box ? box.offsetHeight : (win.h ?? app.height ?? MIN_H),
      };
      e.preventDefault(); e.stopPropagation();
    };
    handle.addEventListener("mousedown", down);
    return () => handle.removeEventListener("mousedown", down);
  }, [id, win.max, win.w, win.h, app.width, app.height, onFocus]);

  useEffect(() => {
    const move = e => {
      if (dragging.current) {
        const d = dragging.current;
        onMove(id, d.ox + (e.clientX - d.startX), d.oy + (e.clientY - d.startY));
      } else if (resizing.current) {
        const r = resizing.current;
        onResize(id, Math.max(MIN_W, r.ow + (e.clientX - r.startX)), Math.max(MIN_H, r.oh + (e.clientY - r.startY)));
      }
    };
    const up = () => { dragging.current = null; resizing.current = null; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [id, onMove, onResize]);

  const style = win.max
    ? { position: "absolute", top: 0, left: 0, width: "100%", height: `calc(100% - ${TASKBAR_H}px)`, zIndex: win.z }
    : { position: "absolute", top: win.y, left: win.x, width: win.w ?? app.width, height: win.h ?? app.height, zIndex: win.z };

  return (
    <Win
      ref={winRef}
      style={style}
      $clip={!isProject}
      onMouseDown={() => onFocus(id)}
      resizable={!win.max && !isProject}
      resizeRef={!isProject ? resizeRef : undefined}
    >
      {/* Goomba walks above the Mario window titlebar */}
      {id === "mario" && <GoombaWalker src="/goomba-walk.gif" alt="" />}

      <GradientHeader
        active={active}
        $active={active}
        $activeBg={app.titlebarBg}
        $inactiveBg={app.titlebarBg}
        $activeColor={app.titlebarColor}
        $inactiveColor={app.titlebarColor}
        onMouseDown={onHeaderMouseDown}
        onDoubleClick={() => !isProject && onMax(id)}
      >
        <TitleText>
          {app.iconNode ?? <img src={app.icon} alt="" />}
          {app.title}
        </TitleText>
        <TitleButtons>
          {!isProject && <TitleBtn onClick={() => onMin(id)}><MinGlyph /></TitleBtn>}
          {!isProject && <TitleBtn onClick={() => onMax(id)}><MaxGlyph /></TitleBtn>}
          <TitleBtn onClick={() => onClose(id)}><CloseGlyph>✕</CloseGlyph></TitleBtn>
        </TitleButtons>
      </GradientHeader>

      <WindowContent style={{
        flex: 1, minHeight: 0,
        overflow: isProject ? "visible" : id === "resume" ? "hidden" : "auto",
        padding: BODY_PAD[id],
        textAlign: id === "welcome" ? "center" : undefined,
        marginBottom: (win.max || isProject) ? 0 : 12,
        display: id === "resume" ? "flex" : undefined,
        flexDirection: id === "resume" ? "column" : undefined,
      }}>
        {children}
      </WindowContent>
    </Win>
  );
}

/* ── Window bodies ── */
function WelcomeBody() {
  return (
    <div style={{ textAlign: "center" }}>
      <img src="/car.gif" alt="" style={{ width: 128, height: 128, borderRadius: "50%", border: "2px solid #d1d0d0", objectFit: "cover" }} />
      <h1 style={{ margin: "6px 0", fontSize: 34, fontWeight: "bold", lineHeight: 1 }}>'95 OS</h1>
      <p style={{ margin: "0 0 8px" }}>Seems like yesterday...<br />Developed by Jack He</p>
      <a href="https://github.com/Darkest-Teddy" target="_blank" rel="noreferrer">Github</a>
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 12 }}>
        <img src="/bestviewed.gif" alt="" style={{ imageRendering: "pixelated" }} />
        <img src="/noframes3.gif" alt="" style={{ imageRendering: "pixelated" }} />
        <img src="/notepadpowered.gif" alt="" style={{ imageRendering: "pixelated" }} />
      </div>
    </div>
  );
}

/* ── About Me explorer data ── */
const ABOUT_NAV = ["About Me","Skills","Experience","Education","Hackathons","Awards","Links"];
const ABOUT_SOFT = ["Graphic Design","Web Design","Attention to Detail","Math / Logic","Outreach"];
const ABOUT_TECH = [
  ["Assembly","#007acc"],["C","#555555"],["Java","#b07219"],["Python","#3572A5"],
  ["HTML5","#e34c26"],["CSS3","#563d7c"],["TypeScript","#2b7489"],["React","#61dafb"],
  ["Docker","#0db7ed"],["PyTorch","#ee4c2c"],["TensorFlow","#ff6f00"],["Arduino","#00979d"],
  ["Git","#f05032"],["Railway","#0b0d0e"],["Supabase","#3ecf8e"],
];
const ABOUT_EXP = [
  { role:"Co-founder & Founding Engineer", org:"Sapling", date:"Feb 2026 – Present", desc:"Co-founded an AI study startup from idea to launch: product vision, full stack with React and Python, RAG pipeline over 8,700+ courses. Shipping 8+ features while steering strategy and fundraising. Gearing up for beta launch this fall." },
  { role:"Software Developer", org:"Honor Society of Cinematic Arts", date:"2025 – Present", desc:"Building interactive gaming and visual content for filmmaking students." },
  { role:"Microelectronics & Hardware Dev Student", org:"MIT Lincoln Labs Beaver Works", date:"Jul – Aug 2024", desc:"Selected as 1 of 41 students nationally. Hands-on IC design, PCB layout, and microchip fabrication." },
];
const ABOUT_HACKS = [
  { name:"Waymark", date:"May 2026", win:"Best Overall · Red Hat Open Accelerator", stack:"Llama 3.1 8B · Python · React · ChromaDB", desc:"Multimodal RAG over Google Drive and Slack, delivering sub-2s answers at 93.6% accuracy across 847 documents.", logo:"/logo-openaccel.png", logoBg:"#fff" },
  { name:"Sapling", date:"Feb 2026", win:"AI Tutor Track Winner · BU CivicHacks 2026", stack:"Next.js · FastAPI · D3.js · WebSockets", desc:"Open-source AI study platform with Socratic, expository, and teach-back modes plus a real-time knowledge graph.", logo:"/logo-civichacks.png", logoBg:"#0a0a0a" },
  { name:"Stalk Market", date:"Oct 2025", win:"Best Technical Execution · BU Data Science + X", stack:"OpenAI · Python · JavaScript", desc:"Stock market simulation with Geometric Brownian Motion pricing and adaptive AI trading agents.", logo:"/logo-dsx.png", logoBg:"#1a1a2e" },
  { name:"Super Artificial Bros.", date:"Oct 2025", win:"Best Use of AI & LLMs · BostonHacks 2025", stack:"Gemini API · Python · JavaScript · Node.js", desc:"AI-generated Mario game with procedural levels and an NPC relationship system.", logo:"/logo-bostonhacks.png", logoBg:"#65b0f1" },
];
const ABOUT_AWARDS = [
  { name:"Best Use of AI & LLMs Track Winner", desc:"at Boston Hacks 2025 for Super Artificial Bros." },
  { name:"Best Overall", desc:"at the Red Hat-IBM Open Accelerator Hackathon for Waymark" },
  { name:"AI Tutor Track Winner", desc:"at BU Civic Hacks 2026 for Sapling" },
  { name:"Best Technical Execution Overall", desc:"at BU Data Science + X 2026 for Stalk Market" },
  { name:"BU Code & Tell Audience Choice Award", desc:"for presenting Sapling" },
  { name:"3rd Place – 2024 IEEE SSCS Arduino Contest", desc:"cheap automated lighting system in C++ with Arduino hardware" },
];
const ABOUT_LINKS = [
  { href:"https://github.com/Darkest-Teddy",       icon:"/icon-github.png",   label:"github.com/Darkest-Teddy",    sub:"Code, projects, and hackathon repos" },
  { href:"https://www.linkedin.com/in/jacklhe/",   icon:"/linkedin.png", label:"linkedin.com/in/jacklhe",     sub:"Professional profile" },
  { href:"https://jacklhe.com",                    icon:"/icon-ie.png",       label:"jacklhe.com",                 sub:"Personal website" },
  { href:"mailto:jackhe@bu.edu",                   icon:"/icon-email.png",    label:"jackhe@bu.edu",               sub:"Email" },
];

function aboutBadgeFg(hex) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (0.299*r+0.587*g+0.114*b) > 150 ? "#000" : "#fff";
}

function AboutFolderIcon() {
  return <img src="/folder.png" alt="" style={{ width:17, height:15, flexShrink:0, imageRendering:"pixelated" }} />;
}

function AboutTrophySVG() {
  return <img src="/trophy.png" alt="" style={{ width:18, height:18, flexShrink:0, imageRendering:"pixelated", marginTop:1 }} />;
}

function AboutBody() {
  const [active, setActive] = useState("About Me");

  const sunken = "inset 1px 1px 0 #808080, inset -1px -1px 0 #fff, inset 2px 2px 0 #404040, inset -2px -2px 0 #dfdfdf";
  const raised  = "inset 1px 1px 0 #fff, inset -1px -1px 0 #404040, inset 2px 2px 0 #dfdfdf, inset -2px -2px 0 #808080";

  const Heading = ({ text }) => (
    <div style={{ fontSize:20, fontWeight:"bold", color:"#000080", marginBottom:12, borderBottom:"1px solid #c0c0c0", paddingBottom:6 }}>{text}</div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* Menu bar */}
      <div style={{ height:20, flexShrink:0, display:"flex", alignItems:"center", gap:12, padding:"2px 6px 0", fontSize:13, cursor:"default", userSelect:"none" }}>
        {["File","Edit","View","Help"].map(m => <span key={m}><u>{m[0]}</u>{m.slice(1)}</span>)}
      </div>

      {/* Two-panel body */}
      <div style={{ flex:1, display:"flex", gap:3, padding:"2px 3px 3px", minHeight:0 }}>

        {/* Sidebar */}
        <div style={{ width:140, flexShrink:0, background:"#fff", boxShadow:sunken, padding:"4px 2px", overflowY:"auto" }}>
          {ABOUT_NAV.map(label => (
            <div key={label} onClick={() => setActive(label)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"3px 6px", fontSize:13, cursor:"default", userSelect:"none",
                background: active===label ? "#000080" : "transparent",
                color:       active===label ? "#fff"    : "#000" }}>
              <AboutFolderIcon />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Content pane */}
        <div style={{ flex:1, background:"#fff", boxShadow:sunken, overflowY:"auto", minWidth:0 }}>
          <div style={{ padding:"14px 16px" }}>

            {/* ABOUT ME */}
            {active==="About Me" && (
              <div>
                <Heading text="About Me" />
                <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
                  <div style={{ flexShrink:0, padding:3, background:"#c0c0c0", boxShadow:sunken }}>
                    <img src="/profile-pixel.png" alt="Jack He"
                      style={{ width:128, height:128, display:"block", imageRendering:"pixelated", objectFit:"cover" }} />
                  </div>
                  <div style={{ flex:1, minWidth:0, fontSize:15, lineHeight:1.7, color:"#000" }}>
                    <p style={{ margin:"0 0 14px" }}>Hi, I'm <b>Jack He</b>, a Computer Science student at <b>Boston University</b> (minor in Data Science, GPA 3.93, Class of 2029). I build software with a real purpose and a little personality.</p>
                    <p style={{ margin:"0 0 14px" }}>I'm especially into <b>machine learning</b>, and I've spent a good chunk of time training custom AI models from scratch using online data and reinforced prompting.</p>
                    <p style={{ margin:0 }}>I've racked up <b>4 hackathon wins</b> so far, which shows I can adapt and think critically in a team environment fast (fueled by a healthy supply of Red Bulls). Beyond that, I aim to not just ship code every day but to understand it to the fullest, so we can build toward a safer but promising future.</p>
                  </div>
                </div>
              </div>
            )}

            {/* SKILLS */}
            {active==="Skills" && (
              <div>
                <Heading text="Skills" />
                <div style={{ fontSize:15, fontWeight:"bold", color:"#000", marginBottom:8 }}>Soft Skills</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
                  {ABOUT_SOFT.map(s => (
                    <div key={s} style={{ background:"#c0c0c0", boxShadow:raised, padding:"5px 12px", fontSize:13 }}>{s}</div>
                  ))}
                </div>
                <div style={{ height:2, background:"#808080", borderBottom:"1px solid #fff", marginBottom:14 }} />
                <div style={{ fontSize:15, fontWeight:"bold", color:"#000", marginBottom:8 }}>Tech Stack</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {ABOUT_TECH.map(([name, bg]) => (
                    <div key={name} style={{ background:bg, color:aboutBadgeFg(bg), fontSize:12, padding:"3px 8px", border:"1px solid rgba(0,0,0,0.35)", letterSpacing:"0.3px" }}>{name}</div>
                  ))}
                </div>
              </div>
            )}

            {/* EXPERIENCE */}
            {active==="Experience" && (
              <div>
                <Heading text="Experience" />
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {ABOUT_EXP.map((job, i) => (
                    <div key={i} style={{ background:"#fff", boxShadow:raised, padding:"10px 12px" }}>
                      <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:2 }}>
                        <span style={{ fontSize:14, fontWeight:"bold", color:"#000" }}>{job.role}</span>
                        <span style={{ fontSize:12, color:"#808080", marginLeft:"auto", flexShrink:0, whiteSpace:"nowrap" }}>{job.date}</span>
                      </div>
                      <div style={{ fontSize:13, color:"#000080", fontWeight:"bold", marginBottom:3 }}>{job.org}</div>
                      <div style={{ fontSize:13, color:"#555", lineHeight:1.5 }}>{job.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EDUCATION */}
            {active==="Education" && (
              <div>
                <Heading text="Education" />
                <div style={{ background:"#fff", boxShadow:raised, padding:"12px 14px", display:"flex", gap:12, alignItems:"flex-start" }}>
                  <img src="/gradcap.png" alt="" style={{ width:26, height:26, flexShrink:0, imageRendering:"pixelated" }} />
                  <div>
                    <div style={{ fontSize:16, fontWeight:"bold", color:"#000", marginBottom:4 }}>B.S. Computer Science</div>
                    <div style={{ fontSize:14, color:"#555" }}>Boston University · Minor in Data Science · GPA 3.93 · Expected 2029</div>
                  </div>
                </div>
              </div>
            )}

            {/* HACKATHONS */}
            {active==="Hackathons" && (
              <div>
                <Heading text="Hackathons" />
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {ABOUT_HACKS.map((h, i) => (
                    <div key={i} style={{ background:"#fff", boxShadow:raised, padding:"10px 12px", display:"flex", gap:12, alignItems:"flex-start" }}>
                      <div style={{ width:112, height:64, flexShrink:0, padding:3, boxShadow:sunken, background:h.logoBg, overflow:"hidden" }}>
                        <img src={h.logo} alt={h.name} style={{ width:"100%", height:"100%", objectFit:"contain" }}
                          onError={e => { e.target.style.display="none"; }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:14, fontWeight:"bold", color:"#000" }}>{h.name}</span>
                          <span style={{ fontSize:12, color:"#808080", marginLeft:"auto", flexShrink:0, whiteSpace:"nowrap" }}>{h.date}</span>
                        </div>
                        <div style={{ fontSize:12, color:"#008000", fontWeight:"bold", marginBottom:3 }}>{h.win}</div>
                        <div style={{ fontSize:12, color:"#666", marginBottom:3 }}>{h.stack}</div>
                        <div style={{ fontSize:13, color:"#333", lineHeight:1.5 }}>{h.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AWARDS */}
            {active==="Awards" && (
              <div>
                <Heading text="Awards" />
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {ABOUT_AWARDS.map((a, i) => (
                    <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                      <AboutTrophySVG />
                      <div style={{ lineHeight:1.5 }}>
                        <span style={{ fontSize:14, fontWeight:"bold", color:"#000" }}>{a.name} </span>
                        <span style={{ fontSize:14, color:"#777" }}>{a.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LINKS */}
            {active==="Links" && (
              <div>
                <Heading text="Links" />
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {ABOUT_LINKS.map((l, i) => (
                    <a key={i} href={l.href} target="_blank" rel="noreferrer"
                      style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
                      <img src={l.icon} alt="" style={{ width:22, height:22, objectFit:"contain", imageRendering:"pixelated", flexShrink:0 }}
                        onError={e => { e.target.style.display="none"; }} />
                      <div>
                        <div style={{ fontSize:14, color:"#0000ee", textDecoration:"underline" }}>{l.label}</div>
                        <div style={{ fontSize:12, color:"#777" }}>{l.sub}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ height:20, flexShrink:0, display:"flex", gap:3, padding:"0 1px 1px" }}>
        <div style={{ flex:1, boxShadow:"inset 1px 1px 0 #808080, inset -1px -1px 0 #fff", padding:"2px 8px", fontSize:12, display:"flex", alignItems:"center" }}>{active}</div>
        <div style={{ width:150, boxShadow:"inset 1px 1px 0 #808080, inset -1px -1px 0 #fff", padding:"2px 8px", fontSize:12, display:"flex", alignItems:"center" }}>jacklhe.com</div>
      </div>

    </div>
  );
}

/* ── Sapling ad — exact mockup ── */
function SaplingAd() {
  return (
    <div style={{ background: "linear-gradient(180deg,#f6fff4,#e2f6e5)", padding: "10px 11px 11px", position: "relative" }}>
      <div style={{ fontStyle: "italic", fontWeight: 700, fontSize: 10, fontFamily: "Georgia,serif", color: "#2f7a3a", textAlign: "center", letterSpacing: ".03em" }}>
        A HEALTHY MIND, NATURALLY™
      </div>
      <div style={{ margin: "7px 0 0", border: "2px solid", borderColor: "#808080 #fff #fff #808080", background: "#0d5c22", lineHeight: 0 }}>
        <img src="/thumb-sapling.png" alt="Sapling" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
      <p style={{ margin: "6px 0 0", fontFamily: "Georgia,'Times New Roman',serif", fontSize: 12, lineHeight: 1.42, color: "#184b23", textAlign: "center" }}>
        Made for university students. Add your courses and our custom <b>LLM model</b> grows a living knowledge graph, personalized to exactly what you're studying.
      </p>
      <div style={{ margin: "8px 0 0", fontFamily: '"Courier New",monospace', fontSize: 10, color: "#2f7a3a", textAlign: "center", letterSpacing: ".02em" }}>
        Gemini · React · D3.js
      </div>
      <a href="https://saplinglearn.com" target="_blank" rel="noopener noreferrer"
        style={{ display: "block", textAlign: "center", textDecoration: "none", margin: "9px 0 0", padding: "6px 8px", fontFamily: "'W95FA',Tahoma,sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: ".02em", color: "#fff", background: "linear-gradient(180deg,#46cb61,#1f7a33)", border: "2px solid", borderColor: "#93e9a7 #0b5a1f #0b5a1f #93e9a7" }}>
        PLANT YOUR NOTES »
      </a>
      <div style={{ margin: "7px 0 0", fontSize: 8, fontFamily: "Tahoma,sans-serif", color: "#5c6b5e", textAlign: "center", lineHeight: 1.35 }}>
        *Side effects may include understanding. A real, open-source project.
      </div>
      {/* Knowledge graph peeks out bottom-left of the window */}
      <svg viewBox="0 0 84 84" style={{ position: "absolute", left: -38, bottom: -22, width: 66, height: 66, filter: "drop-shadow(2px 3px 2px rgba(0,0,0,.32))", pointerEvents: "none" }}>
        <path d="M18 56 L38 36 M38 36 L60 46 M38 36 L56 24 M60 46 L44 66 M18 56 L44 66 M56 24 L32 18 M38 36 L32 18" stroke="#3f9e57" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="18" cy="56" r="8"   fill="#1f7a33" stroke="#0d5c22" strokeWidth="2" />
        <circle cx="44" cy="66" r="5.5" fill="#fff"    stroke="#2f9e44" strokeWidth="2.4" />
        <circle cx="60" cy="46" r="6"   fill="#eafff0" stroke="#2f9e44" strokeWidth="2.4" />
        <circle cx="32" cy="18" r="4.5" fill="#8be3a0" stroke="#2f9e44" strokeWidth="2" />
        <circle cx="56" cy="24" r="5.5" fill="#fff"    stroke="#2f9e44" strokeWidth="2.4" />
        <circle cx="38" cy="36" r="7.5" fill="#fff"    stroke="#2f9e44" strokeWidth="2.6" />
        <path d="M38 30c0-3.6-2.5-6.1-6.1-6.1 0 3.6 2.3 6.1 6.1 6.1z" fill="#43a862" />
        <path d="M38 30c0-3.6 2.5-6.1 6.1-6.1 0 3.6-2.3 6.1-6.1 6.1z" fill="#8be3a0" />
      </svg>
    </div>
  );
}

/* ── Mario ad — exact mockup (goomba rendered in Win95Window above titlebar) ── */
function MarioAd() {
  return (
    <div style={{ background: "linear-gradient(180deg,#6db8ff,#c3e6ff)", padding: "9px 10px 10px" }}>
      <div style={{ textAlign: "center" }}>
        <span style={{ display: "inline-block", background: "#b5231a", color: "#ffe14d", fontFamily: "Tahoma,sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: ".06em", padding: "2px 8px", border: "1px solid #7a1414" }}>
          100% FREE · NO DOWNLOAD
        </span>
      </div>
      <div style={{ margin: "6px 0 0", border: "2px solid", borderColor: "#808080 #fff #fff #808080", background: "#000", lineHeight: 0 }}>
        <img src="/thumb-mario.png" alt="Super Artificial Bros." style={{ width: "100%", height: "auto", display: "block", imageRendering: "pixelated" }} />
      </div>
      <div style={{ fontStyle: "italic", fontWeight: 700, fontSize: 11, fontFamily: "Georgia,serif", color: "#12314f", textAlign: "center", marginTop: 5 }}>
        The classic platformer, now endless
      </div>
      <div style={{ margin: "8px 0 0", background: "rgba(255,255,255,.85)", border: "1px solid #2a6fb0", padding: "6px 7px", fontFamily: "'W95FA',Tahoma,sans-serif", fontWeight: 400, fontSize: 11, lineHeight: 1.4, color: "#12314f" }}>
        Classic Super Mario Bros., revamped: Gemini generates brand-new, fully playable levels forever, so the game never ends.
      </div>
      <div style={{ margin: "7px 0 0", fontFamily: '"Courier New",monospace', fontSize: 10, color: "#12314f", textAlign: "center", letterSpacing: ".02em" }}>
        Gemini · Python · JavaScript
      </div>
      <a href="https://devpost.com/software/superartificialbrothers" target="_blank" rel="noopener noreferrer"
        style={{ display: "block", textAlign: "center", textDecoration: "none", margin: "9px 0 0", padding: "6px 8px", fontFamily: "'W95FA',Tahoma,sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: ".03em", color: "#6b3d00", background: "linear-gradient(180deg,#ffd93b,#e0a900)", border: "2px solid", borderColor: "#fff2b0 #a97b00 #a97b00 #fff2b0" }}>
        ▶ PRESS START »
      </a>
      <div style={{ margin: "7px 0 0", fontSize: 8, fontFamily: "Tahoma,sans-serif", color: "#2a5075", textAlign: "center", lineHeight: 1.35 }}>
        *Mushrooms not included. A real, open-source project.
      </div>
    </div>
  );
}

/* ── Stalk Market ad — exact mockup ── */
function StalkAd() {
  return (
    <div style={{ background: "#eefaef", position: "relative" }}>
      {/* Scrolling stock ticker */}
      <div style={{ background: "#00190a", overflow: "hidden", whiteSpace: "nowrap", padding: "3px 0", borderBottom: "1px solid #0a3d1e" }}>
        <TickSpan>
          <span style={{color:"#39ff88"}}>▲ TOMATO 12.40</span>&nbsp;&nbsp;<span style={{color:"#ff4444"}}>▼ CORN 3.15</span>&nbsp;&nbsp;<span style={{color:"#39ff88"}}>▲ WHEAT 8.02</span>&nbsp;&nbsp;<span style={{color:"#39ff88"}}>▲ PUMPKIN 21.70</span>&nbsp;&nbsp;<span style={{color:"#ff4444"}}>▼ SOY 1.09</span>&nbsp;&nbsp;<span style={{color:"#39ff88"}}>▲ BASIL 6.55</span>&nbsp;&nbsp;<span style={{color:"#39ff88"}}>▲ KALE 4.88</span>&nbsp;&nbsp;
        </TickSpan>
      </div>

      <div style={{ padding: "9px 11px 11px" }}>
        <div style={{ textAlign: "center" }}>
          <span style={{ display: "inline-block", background: "#d62828", color: "#fff", fontFamily: "Tahoma,sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: ".06em", padding: "2px 8px", border: "1px solid #7a1414" }}>
            ★ HOT TIP
          </span>
        </div>
        <div style={{ fontFamily: "Impact,'Arial Narrow',sans-serif", fontWeight: 800, fontSize: 27, lineHeight: .9, color: "#0f6b2e", textAlign: "center", letterSpacing: ".02em", textShadow: "1px 1px 0 rgba(255,255,255,.7)", marginTop: 4 }}>
          BUY LOW.<br />GROW HIGH.
        </div>
        <div style={{ margin: "7px 0 0", border: "2px solid", borderColor: "#808080 #fff #fff #808080", background: "#000", lineHeight: 0 }}>
          <img src="/thumb-stalk-market.png" alt="Stalk Market" style={{ width: "100%", height: "auto", display: "block", imageRendering: "pixelated" }} />
        </div>
        <div style={{ margin: "6px 0 0", fontFamily: "'W95FA',Tahoma,sans-serif", fontWeight: 400, fontSize: 11, lineHeight: 1.42, color: "#123b1f", textAlign: "center" }}>
          Learn to invest by farming the market. Stocks are plants that grow &amp; wilt on real Geometric Brownian Motion + an ML risk engine.
        </div>
        <div style={{ margin: "8px 0 0", fontFamily: '"Courier New",monospace', fontSize: 10, color: "#0f6b2e", textAlign: "center", letterSpacing: ".02em" }}>
          ML Risk Engine · GPT · FRED Data
        </div>
        <a href="https://stalk-market.vercel.app/" target="_blank" rel="noopener noreferrer"
          style={{ display: "block", textAlign: "center", textDecoration: "none", margin: "9px 0 0", padding: "6px 8px", fontFamily: "'W95FA',Tahoma,sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: ".02em", color: "#fff", background: "linear-gradient(180deg,#2fae53,#0f6b2e)", border: "2px solid", borderColor: "#7fd897 #084d1f #084d1f #7fd897" }}>
          START TRADING · RISK FREE »
        </a>
        <div style={{ margin: "7px 0 0", fontSize: 8, fontFamily: "Tahoma,sans-serif", color: "#5c6b5e", textAlign: "center", lineHeight: 1.35 }}>
          *Not financial advice. It's a game. A real project.
        </div>
      </div>

      {/* Chicken peeks out bottom-right of the window */}
      <img src="/chicken.png" alt="" style={{ position: "absolute", right: -32, bottom: -12, width: 60, height: "auto", imageRendering: "pixelated", transform: "scaleX(-1)", filter: "drop-shadow(2px 3px 2px rgba(0,0,0,.35))", pointerEvents: "none" }} />
    </div>
  );
}

function ResumeMenuBar() {
  const [open, setOpen] = useState(null);
  const items = ["File", "Edit", "View", "Help"];
  return (
    <div style={{ display: "flex", background: "#c0c0c0", borderBottom: "1px solid #808080",
      flexShrink: 0, userSelect: "none" }}>
      {items.map(item => (
        <div key={item}
          onMouseDown={() => setOpen(open === item ? null : item)}
          onBlur={() => setOpen(null)}
          tabIndex={0}
          style={{ padding: "2px 8px", fontSize: 13, cursor: "default",
            background: open === item ? "#000080" : "transparent",
            color: open === item ? "#fff" : "#000" }}
          onMouseEnter={e => { if (open) { setOpen(item); } }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

function ResumeBody() {
  const [numPages, setNumPages] = useState(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(640);

  useEffect(() => {
    if (!containerRef.current) return;
    setContainerWidth(containerRef.current.offsetWidth);
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      <ResumeMenuBar />
      <div ref={containerRef}
        style={{ flex: 1, overflow: "auto", background: "#808080", padding: 8, minHeight: 0 }}>
        <Document
          file="/resume.pdf"
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<p style={{ color: "#fff", padding: 12 }}>Loading resume...</p>}
          error={<p style={{ color: "#fff", padding: 12 }}>Could not load resume.pdf</p>}
        >
          {Array.from({ length: numPages ?? 0 }, (_, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <Page
                pageNumber={i + 1}
                width={Math.max(containerWidth - 24, 80)}
                renderTextLayer={false}
                renderAnnotationLayer={true}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}

function ProjectsBody() {
  return (
    <Folders>
      {PROJECTS.map(p => (
        <FolderIcon key={p.id} onDoubleClick={() => window.open(p.url, "_blank")}>
          <img src={p.icon} alt="" style={{ objectFit: "contain" }} />
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

const UPDATE_LOG = [
  { name: "Launch", date: "2026-07-02", bullets: [
    "Site is live at jacklhe.com",
    "Added Resume window with PDF viewer",
    "Added GitHub and LinkedIn desktop icons",
    "Added Update Log window",
  ]},
];

function UpdateLogBody() {
  return (
    <div style={{ fontFamily: "'W95FA',Tahoma,sans-serif", fontSize: 12, background: "#fffde7", height: "100%", overflowY: "auto", padding: "8px 10px" }}>
      <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 10 }}>📋 Patch Updates...</div>
      {UPDATE_LOG.map((entry, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: "bold" }}>**{entry.name}** – {entry.date}</div>
          {entry.bullets.map((b, j) => (
            <div key={j} style={{ paddingLeft: 4 }}>- {b}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

const BODIES = {
  welcome:   <WelcomeBody />,
  about:     <AboutBody />,
  projects:  <ProjectsBody />,
  bank:      <BankBody />,
  resume:    <ResumeBody />,
  updatelog: <UpdateLogBody />,
  sapling:   <SaplingAd />,
  mario:     <MarioAd />,
  stalk:     <StalkAd />,
};

/* ── App + window manager ── */
export default function App() {
  const [wins, setWins] = useState(() => {
    const wx = Math.max(8, Math.round((window.innerWidth - APPS.welcome.width) / 2));
    const wy = Math.max(8, Math.round((window.innerHeight - TASKBAR_H - 300) / 2));
    return {
      welcome:   { open: true,  min: false, max: false, x: wx,      y: wy,      z: 10, prev: null },
      updatelog: { open: true,  min: false, max: false, x: wx + 280, y: wy,      z: 9,  prev: null },
      about:     { open: false, min: false, max: false, x: 140,      y: 70,      z: 1,  prev: null },
      projects:  { open: false, min: false, max: false, x: 200,      y: 90,      z: 1,  prev: null },
      bank:      { open: false, min: false, max: false, x: 320,      y: 160,     z: 1,  prev: null },
      resume:    { open: false, min: false, max: false, x: 180,      y: 60,      z: 1,  prev: null },
      sapling:   { open: false, min: false, max: false, x: 0,        y: 0,       z: 1,  prev: null },
      mario:     { open: false, min: false, max: false, x: 0,        y: 0,       z: 1,  prev: null },
      stalk:     { open: false, min: false, max: false, x: 0,        y: 0,       z: 1,  prev: null },
    };
  });
  const [activeId, setActiveId]   = useState("welcome");
  const [startOpen, setStartOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [time, setTime] = useState("");
  const zTop = useRef(10);
  const errorSound = useRef(null);
  const audioCtxRef = useRef(null);
  const chordSound = useRef(null);
  const winsRef = useRef(null);

  useEffect(() => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 3.0;
    gainNode.connect(audioCtx.destination);
    const err = new Audio("/error.mp3");
    err.volume = 1.0;
    const errSource = audioCtx.createMediaElementSource(err);
    errSource.connect(gainNode);
    errorSound.current = err;
    const chord = new Audio("/Windows 95 Chord Sound Effect (High Quality) (mp3cut.net) (1).mp3");
    chord.preload = "auto";
    chord.volume = 1.0;
    chord.load();
    chordSound.current = chord;
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  winsRef.current = wins;

  const focusWin = useCallback(id => {
    zTop.current += 1;
    setActiveId(id);
    setWins(w => ({ ...w, [id]: { ...w[id], z: zTop.current, min: false } }));
  }, []);

  const openWin = useCallback(id => {
    setStartOpen(false);
    setActiveId(id);
    setWins(w => {
      let z = zTop.current;
      const next = { ...w, [id]: { ...w[id], open: true, min: false, z: ++z } };
      if (id === "projects") {
        const placed = PROJECT_IDS.filter(pid => w[pid].open).map(pid => ({
          x: w[pid].x, y: w[pid].y,
          w: w[pid].w ?? APPS[pid].width,
          h: w[pid].h ?? 420,
        }));
        for (const pid of PROJECT_IDS) {
          if (!w[pid].open) {
            const { x, y } = spawnPosition(APPS[pid].width, 420, placed);
            placed.push({ x, y, w: APPS[pid].width, h: 420 });
            next[pid] = { ...w[pid], open: true, min: false, max: false, x, y, z: ++z };
          }
        }
      }
      zTop.current = z;
      return next;
    });
    if (APPS[id].sound && errorSound.current) {
      const play = () => { errorSound.current.currentTime = 0; errorSound.current.play().catch(() => {}); };
      audioCtxRef.current?.resume().then(play).catch(play);
    }
    if (id === "projects" && chordSound.current) {
      const anyNew = PROJECT_IDS.some(pid => !winsRef.current[pid].open);
      if (anyNew) {
        chordSound.current.currentTime = 0;
        chordSound.current.play().catch(() => {});
      }
    }
  }, []);

  const closeWin  = useCallback(id => setWins(w => ({ ...w, [id]: { ...w[id], open: false, min: false, max: false } })), []);
  const minWin    = useCallback(id => { setWins(w => ({ ...w, [id]: { ...w[id], min: true } })); setActiveId(a => a === id ? null : a); }, []);
  const toggleMax = useCallback(id => setWins(w => ({ ...w, [id]: { ...w[id], max: !w[id].max } })), []);
  const moveWin   = useCallback((id, x, y) => setWins(w => ({ ...w, [id]: { ...w[id], x, y } })), []);
  const resizeWin = useCallback((id, width, height) => setWins(w => ({ ...w, [id]: { ...w[id], w: width, h: height } })), []);

  const onTaskbarClick = id => {
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

      <Desktop onMouseDown={() => { setSelectedIcon(null); if (startOpen) setStartOpen(false); }}>

        <IconGrid onMouseDown={e => e.stopPropagation()}>
          {Object.entries(APPS)
            .filter(([id, app]) => !PROJECT_IDS.includes(id) && !app.bottom && !app.noDesktop)
            .map(([id, app]) => (
              <DesktopIcon
                key={id}
                className={selectedIcon === id ? "selected" : ""}
                onClick={() => setSelectedIcon(id)}
                onDoubleClick={() => app.link ? window.open(app.link, "_blank") : openWin(id)}
                $gridRow={app.gridRow}
                $gridColumn={app.gridColumn}
              >
                <img src={app.icon} alt="" style={{ imageRendering: app.pixel ? "pixelated" : "auto", objectFit: "contain" }} />
                <span>{id === "bank" ? "My Bank Account Information" : app.title}</span>
              </DesktopIcon>
            ))}
        </IconGrid>

        {/* Bottom social icons row */}
        <div onMouseDown={e => e.stopPropagation()}
          style={{ position: "absolute", bottom: TASKBAR_H + 12, left: 10,
            display: "flex", flexDirection: "row", gap: 2 }}>
          {Object.entries(APPS)
            .filter(([, app]) => app.bottom)
            .map(([id, app]) => (
              <DesktopIcon
                key={id}
                className={selectedIcon === id ? "selected" : ""}
                onClick={() => setSelectedIcon(id)}
                onDoubleClick={() => window.open(app.link, "_blank")}
              >
                <img src={app.icon} alt="" style={{
                  imageRendering: "pixelated", objectFit: "contain",
                  mixBlendMode: id === "github" ? "multiply" : undefined,
                }} />
                <span>{app.title}</span>
              </DesktopIcon>
            ))}
        </div>

        {Object.entries(wins).map(([id, win]) =>
          win.open && !win.min ? (
            <Win95Window key={id} id={id} win={win} active={activeId === id}
              onFocus={focusWin} onClose={closeWin} onMin={minWin}
              onMax={toggleMax} onMove={moveWin} onResize={resizeWin}
            >
              {BODIES[id]}
            </Win95Window>
          ) : null
        )}

        {startOpen && (
          <div onMouseDown={e => e.stopPropagation()}
            style={{ position: "absolute", left: 4, bottom: TASKBAR_H, zIndex: 99999,
              display: "flex", background: "#c0c0c0",
              border: "2px solid", borderColor: "#ffffff #404040 #404040 #ffffff",
              boxShadow: "inset 1px 1px 0 #dfdfdf, 4px 4px 10px rgba(0,0,0,0.45)" }}>

            {/* Blue gradient banner */}
            <div style={{ width: 30, flexShrink: 0, background: "linear-gradient(180deg, #000080, #1084d0)",
              display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 8 }}>
              <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)",
                color: "#fff", fontWeight: "bold", fontSize: 18, letterSpacing: 2,
                whiteSpace: "nowrap", userSelect: "none" }}>'95 OS</span>
            </div>

            {/* Menu items */}
            <div style={{ display: "flex", flexDirection: "column", padding: 3, minWidth: 180 }}>
              {Object.entries(APPS).filter(([id, app]) => !PROJECT_IDS.includes(id) && !app.bottom && !app.noDesktop).map(([id, app]) => (
                <div key={id} onClick={() => app.link ? window.open(app.link, "_blank") : openWin(id)}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 10px",
                    fontSize: 14, cursor: "default", userSelect: "none", color: "#000" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#000080"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#000"; }}>
                  <img src={app.icon} alt="" style={{ width: 26, height: 26, imageRendering: "pixelated", flexShrink: 0 }} />
                  {id === "bank" ? "My Bank Account" : app.title}
                </div>
              ))}
              <div style={{ height: 0, margin: "4px 3px", borderTop: "1px solid #808080", borderBottom: "1px solid #fff" }} />
              <div onClick={() => window.open("https://github.com/Darkest-Teddy", "_blank")}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 10px",
                  fontSize: 14, cursor: "default", userSelect: "none", color: "#000" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#000080"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#000"; }}>
                <img src="/icon-github.png" alt="" style={{ width: 26, height: 26, imageRendering: "pixelated", mixBlendMode: "multiply", flexShrink: 0 }} />
                GitHub
              </div>
            </div>
          </div>
        )}

        <Taskbar style={{ top: "auto", bottom: 0, zIndex: 9999 }}>
          <Toolbar style={{ justifyContent: "flex-start", padding: 3, gap: 4, minHeight: 0 }}>
            <StartButton $active={startOpen} onMouseDown={e => { e.stopPropagation(); setStartOpen(s => !s); }}>
              <StartImg src="/start.png" alt="" />
              Start
            </StartButton>

            <TaskbarBtns>
              {Object.entries(wins).filter(([, w]) => w.open).map(([id]) => (
                <TaskbarWinBtn key={id} className={activeId === id && !wins[id].min ? "active" : ""} onClick={() => onTaskbarClick(id)}>
                  {APPS[id].iconNode ?? <img src={APPS[id].icon ?? "/projects.png"} alt="" />}
                  <span>{APPS[id].title}</span>
                </TaskbarWinBtn>
              ))}
            </TaskbarBtns>

            <Clock variant="well">{time}</Clock>
          </Toolbar>
        </Taskbar>
      </Desktop>
    </ThemeProvider>
  );
}
