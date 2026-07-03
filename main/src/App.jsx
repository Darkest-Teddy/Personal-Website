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
  @font-face { font-family: 'W95FA'; src: url('/assets/shared/W95FA.otf'); }
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
  @keyframes win95-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
  .win95-blink { animation: win95-blink 1s step-end infinite; }
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
  display: grid; grid-template-rows: repeat(5, auto);
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

function BookIcon() {
  return <img src="/assets/updatelog/book-icon.png" alt="" />;
}

/* ── Minesweeper helpers + sprites ── */
const MINE_ICON_URI = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
  '<rect x="0" y="7" width="16" height="2" fill="#000"/>' +
  '<rect x="7" y="0" width="2" height="16" fill="#000"/>' +
  '<line x1="3" y1="3" x2="13" y2="13" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>' +
  '<line x1="13" y1="3" x2="3" y2="13" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>' +
  '<circle cx="8" cy="8" r="5" fill="#000"/>' +
  '<circle cx="5.5" cy="5.5" r="1.5" fill="#fff"/>' +
  '</svg>'
);

const MS_LEVELS = {
  beginner:     { rows: 9,  cols: 9,  mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert:       { rows: 16, cols: 30, mines: 99 },
};
const MS_NUM_COLOR = ['', '#0000ff', '#007b00', '#ff0000', '#00007b', '#7b0000', '#007b7b', '#000', '#7b7b7b'];

function msCreateGrid(rows, cols) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, state: 'hidden', adj: 0 }))
  );
}

function msPlaceMines(cells, rows, cols, count, safeR, safeC) {
  const safe = new Set();
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const nr = safeR + dr, nc = safeC + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) safe.add(nr * cols + nc);
  }
  const g = cells.map(row => row.map(c => ({ ...c })));
  let placed = 0;
  while (placed < count) {
    const r = Math.floor(Math.random() * rows), c = Math.floor(Math.random() * cols);
    if (!g[r][c].mine && !safe.has(r * cols + c)) { g[r][c].mine = true; placed++; }
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (g[r][c].mine) continue;
    let adj = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && g[nr][nc].mine) adj++;
    }
    g[r][c].adj = adj;
  }
  return g;
}

function msReveal(cells, startR, startC, rows, cols) {
  const g = cells.map(row => row.map(c => ({ ...c })));
  const stack = [[startR, startC]];
  while (stack.length) {
    const [r, c] = stack.pop();
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    if (g[r][c].state !== 'hidden') continue;
    g[r][c].state = 'revealed';
    if (!g[r][c].mine && g[r][c].adj === 0)
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) stack.push([r + dr, c + dc]);
  }
  return g;
}

function msCheckWon(cells, rows, cols) {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    if (!cells[r][c].mine && cells[r][c].state !== 'revealed') return false;
  return true;
}

function MsMine({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" style={{ display: 'block', flexShrink: 0, imageRendering: 'pixelated' }} shapeRendering="crispEdges">
      <rect x="0" y="6" width="14" height="2" fill="#000"/>
      <rect x="6" y="0" width="2" height="14" fill="#000"/>
      <line x1="2.5" y1="2.5" x2="11.5" y2="11.5" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
      <line x1="11.5" y1="2.5" x2="2.5" y2="11.5" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="7" cy="7" r="4.5" fill="#000"/>
      <circle cx="5.5" cy="5" r="1.3" fill="#fff"/>
    </svg>
  );
}

function MsFlag({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" style={{ display: 'block', flexShrink: 0, imageRendering: 'pixelated' }} shapeRendering="crispEdges">
      {/* Pole */}
      <rect x="5" y="0" width="1" height="12" fill="#000"/>
      {/* Red flag — stepped right-pointing triangle */}
      <rect x="6" y="0" width="5" height="1" fill="#f00"/>
      <rect x="6" y="1" width="4" height="1" fill="#f00"/>
      <rect x="6" y="2" width="3" height="1" fill="#f00"/>
      <rect x="6" y="3" width="2" height="1" fill="#f00"/>
      <rect x="6" y="4" width="1" height="1" fill="#f00"/>
      {/* Base */}
      <rect x="3" y="12" width="5" height="1" fill="#000"/>
      <rect x="2" y="13" width="7" height="1" fill="#000"/>
    </svg>
  );
}

function MsSmiley({ state = 'normal', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
      <circle cx="12" cy="12" r="10.5" fill="#ffff00" stroke="#000" strokeWidth="1.5"/>
      {state === 'normal' && <>
        <rect x="7" y="8" width="3" height="3" fill="#000"/>
        <rect x="14" y="8" width="3" height="3" fill="#000"/>
        <path d="M7 16 Q9.5 19.5 12 19.5 Q14.5 19.5 17 16" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </>}
      {state === 'shocked' && <>
        <rect x="7" y="8" width="3" height="3" fill="#000"/>
        <rect x="14" y="8" width="3" height="3" fill="#000"/>
        <ellipse cx="12" cy="17" rx="2.5" ry="2.5" fill="#000"/>
      </>}
      {state === 'dead' && <>
        <path d="M7 8 L10 11 M10 8 L7 11" stroke="#000" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M14 8 L17 11 M17 8 L14 11" stroke="#000" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M7 18 Q9.5 15.5 12 15.5 Q14.5 15.5 17 18" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </>}
      {state === 'cool' && <>
        <rect x="4" y="8" width="6" height="4" rx="1.5" fill="#000"/>
        <rect x="14" y="8" width="6" height="4" rx="1.5" fill="#000"/>
        <rect x="10" y="9" width="4" height="2" fill="#000"/>
        <path d="M7 16 Q9.5 19.5 12 19.5 Q14.5 19.5 17 16" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </>}
    </svg>
  );
}

const LCD_SEG_DATA = [
  [1,1,1,1,1,1,0],[0,1,1,0,0,0,0],[1,1,0,1,1,0,1],[1,1,1,1,0,0,1],
  [0,1,1,0,0,1,1],[1,0,1,1,0,1,1],[1,0,1,1,1,1,1],[1,1,1,0,0,0,0],
  [1,1,1,1,1,1,1],[1,1,1,1,0,1,1],
];

function LcdDigit({ n }) {
  const s = LCD_SEG_DATA[Math.max(0, Math.min(9, n))] || LCD_SEG_DATA[0];
  const ON = '#ff2200', OFF = '#3a0000';
  const W = 11, H = 21, T = 2, SP = 0.5;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <polygon points={`${T},0 ${W-T},0 ${W-T-SP},${T} ${T+SP},${T}`} fill={s[0] ? ON : OFF}/>
      <polygon points={`${W},${T} ${W},${H/2-SP} ${W-T},${H/2-T} ${W-T},${T+SP}`} fill={s[1] ? ON : OFF}/>
      <polygon points={`${W},${H/2+SP} ${W},${H-T} ${W-T},${H-T-SP} ${W-T},${H/2+T}`} fill={s[2] ? ON : OFF}/>
      <polygon points={`${T+SP},${H-T} ${W-T-SP},${H-T} ${W-T},${H} ${T},${H}`} fill={s[3] ? ON : OFF}/>
      <polygon points={`0,${H/2+SP} ${T},${H/2+T} ${T},${H-T-SP} 0,${H-T}`} fill={s[4] ? ON : OFF}/>
      <polygon points={`0,${T} ${T},${T+SP} ${T},${H/2-T} 0,${H/2-SP}`} fill={s[5] ? ON : OFF}/>
      <polygon points={`${T+SP},${H/2} ${W-T-SP},${H/2} ${W-T},${H/2+T/2} ${W-T-SP},${H/2+T} ${T+SP},${H/2+T} ${T},${H/2+T/2}`} fill={s[6] ? ON : OFF}/>
    </svg>
  );
}

function LcdPanel({ value, digits = 3 }) {
  const v = Math.max(-99, Math.min(999, Math.floor(value)));
  const neg = v < 0;
  const abs = Math.abs(v);
  const numStr = String(abs).padStart(neg ? digits - 1 : digits, '0');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1, background: '#000', padding: '2px 4px',
      boxShadow: 'inset 1px 1px 0 #808080,inset -1px -1px 0 #fff,inset 2px 2px 0 #404040,inset -2px -2px 0 #dfdfdf' }}>
      {neg && (
        <svg width={11} height={21} viewBox="0 0 11 21" style={{ display: 'block' }}>
          <polygon points="2,10 9,10 9,13 2,13" fill="#ff2200"/>
        </svg>
      )}
      {numStr.split('').map((ch, i) => <LcdDigit key={i} n={parseInt(ch)} />)}
    </div>
  );
}

function MineIconNode() { return <img src="/assets/minesweeper/Minesweeper - 16.png" alt="" style={{ imageRendering: 'pixelated', width: 12, height: 12 }} />; }

function EmailIconNode() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: 'block', imageRendering: 'pixelated' }} shapeRendering="crispEdges">
      <rect x="1" y="3" width="14" height="10" fill="#fff" stroke="#000" strokeWidth="1"/>
      <polyline points="1,3 8,9 15,3" stroke="#000" strokeWidth="1" fill="none"/>
      <line x1="1" y1="13" x2="6" y2="8.5" stroke="#808080" strokeWidth="1"/>
      <line x1="15" y1="13" x2="10" y2="8.5" stroke="#808080" strokeWidth="1"/>
    </svg>
  );
}

const WEB3FORMS_KEY = 'e575da3e-474f-4a44-bbee-0dcf9e7b27d1';

/* ── App registry ── */
const APPS = {
  welcome:  { title: "Welcome",    icon: "/assets/welcome/welcome.png", width: 300, pixel: true },
  about:    { title: "About Me", icon: "/assets/about/msagent.png", width: 760, height: 480, pixel: true },
  projects: { title: "Projects",   icon: "/assets/projects/projects.png", width: 420, height: 220, pixel: true },
  resume:   { title: "Resume",     icon: "/assets/resume/resume.png",   width: 680, height: 860, pixel: true, gridRow: 3, gridColumn: 2 },
  github:   { title: "GitHub",     icon: "/assets/social/icon-github.png",   link: "https://github.com/Darkest-Teddy",           pixel: true, bottom: true },
  linkedin: { title: "LinkedIn",   icon: "/assets/social/linkedin.png", link: "https://www.linkedin.com/in/jacklhe/",       pixel: true, bottom: true },
  bank:     { title: "RUNDLL",     icon: "/assets/bank/money.png",    width: 420, sound: true },
  updatelog: { title: "UpdateLog", iconNode: <BookIcon />, icon: "/assets/projects/projects.png", width: 320, height: 460, noDesktop: true },
  gallery:       { title: "Photo Gallery",  icon: "/assets/gallery/icon-camera.png", width: 760, height: 560, pixel: true },
  minesweeper:   { title: "Minesweeper",    iconNode: <MineIconNode />, icon: "/assets/minesweeper/Minesweeper Logo.png", width: 310, height: 400, gridRow: 5, gridColumn: 1, iconSize: 50 },
  email:         { title: "Send Mail",     iconNode: <EmailIconNode />, icon: "/assets/email/Email.png", width: 500, height: 420 },
  sapling: {
    title: "Sapling", iconNode: <SaplingIcon />, icon: "/assets/sapling/sapling-icon.svg", width: 256,
    titlebarBg: "linear-gradient(180deg,#39a552,#1f7a33)", titlebarColor: "#fff",
  },
  mario: {
    title: "super-artificial-bros", iconNode: <MarioIcon />, icon: "/assets/mario/mario.gif", width: 256,
    titlebarBg: "linear-gradient(180deg,#e0392c,#b5231a)", titlebarColor: "#fff",
  },
  stalk: {
    title: "Stalk Market", iconNode: <StalkIcon />, icon: "/assets/stalk/chicken.png", width: 256,
    titlebarBg: "linear-gradient(180deg,#ffcf3f,#dda000)", titlebarColor: "#3a2600",
  },
};

const PROJECT_IDS = ["sapling", "mario", "stalk"];

const PROJECTS = [
  { id: "sapling", name: "Sapling",               color: "#3fb950", img: "/assets/sapling/thumb-sapling.png",      url: "https://saplinglearn.com",                                    icon: "/assets/sapling/sapling-icon.svg" },
  { id: "mario",   name: "Super Artificial Bros.", color: "#e34c26", img: "/assets/mario/thumb-mario.png",        url: "https://devpost.com/software/superartificialbrothers",        icon: "/assets/mario/mario.gif" },
  { id: "stalk",   name: "Stalk Market",           color: "#9d4edd", img: "/assets/stalk/thumb-stalk-market.png", url: "https://stalk-market.vercel.app/",                            icon: "/assets/stalk/chicken.png" },
];

const TASKBAR_H = 32;
const MIN_W = 200;
const MIN_H = 120;
const BODY_PAD = { welcome: 12, about: 0, projects: 0, bank: 0, resume: 0, updatelog: 0, gallery: 0, minesweeper: 0, email: 0, sapling: 0, mario: 0, stalk: 0 };

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
      {id === "mario" && <GoombaWalker src="/assets/mario/goomba-walk.gif" alt="" />}

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
        overflow: isProject ? "visible" : (id === "resume" || id === "minesweeper" || id === "email") ? "hidden" : "auto",
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
      <img src="/assets/welcome/car.gif" alt="" style={{ width: 128, height: 128, borderRadius: "50%", border: "2px solid #d1d0d0", objectFit: "cover" }} />
      <h1 style={{ margin: "6px 0", fontSize: 34, fontWeight: "bold", lineHeight: 1 }}>'95 OS</h1>
      <p style={{ margin: "0 0 8px" }}>Seems like yesterday...<br />Developed by Jack He</p>
      <a href="https://github.com/Darkest-Teddy" target="_blank" rel="noreferrer">Github</a>
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 12 }}>
        <img src="/assets/shared/bestviewed.gif" alt="" style={{ imageRendering: "pixelated" }} />
        <img src="/assets/shared/noframes3.gif" alt="" style={{ imageRendering: "pixelated" }} />
        <img src="/assets/shared/notepadpowered.gif" alt="" style={{ imageRendering: "pixelated" }} />
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
  { name:"Waymark", date:"May 2026", win:"Best Overall · Red Hat Open Accelerator", stack:"Llama 3.1 8B · Python · React · ChromaDB", desc:"Multimodal RAG over Google Drive and Slack, delivering sub-2s answers at 93.6% accuracy across 847 documents.", logo:"/assets/about/logo-openaccel.png", logoBg:"#fff" },
  { name:"Sapling", date:"Feb 2026", win:"AI Tutor Track Winner · BU CivicHacks 2026", stack:"Next.js · FastAPI · D3.js · WebSockets", desc:"Open-source AI study platform with Socratic, expository, and teach-back modes plus a real-time knowledge graph.", logo:"/assets/about/logo-civichacks.png", logoBg:"#0a0a0a" },
  { name:"Stalk Market", date:"Oct 2025", win:"Best Technical Execution · BU Data Science + X", stack:"OpenAI · Python · JavaScript", desc:"Stock market simulation with Geometric Brownian Motion pricing and adaptive AI trading agents.", logo:"/assets/about/logo-dsx.png", logoBg:"#1a1a2e" },
  { name:"Super Artificial Bros.", date:"Oct 2025", win:"Best Use of AI & LLMs · BostonHacks 2025", stack:"Gemini API · Python · JavaScript · Node.js", desc:"AI-generated Mario game with procedural levels and an NPC relationship system.", logo:"/assets/about/logo-bostonhacks.png", logoBg:"#65b0f1" },
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
  { href:"https://github.com/Darkest-Teddy",       icon:"/assets/social/icon-github.png",   label:"github.com/Darkest-Teddy",    sub:"Code, projects, and hackathon repos" },
  { href:"https://www.linkedin.com/in/jacklhe/",   icon:"/assets/social/linkedin.png", label:"linkedin.com/in/jacklhe",     sub:"Professional profile" },
  { href:"https://jacklhe.com",                    icon:"/assets/shared/icon-ie.png",       label:"jacklhe.com",                 sub:"Personal website" },
  { href:"mailto:jackhe@bu.edu",                   icon:"/assets/email/icon-email.png",    label:"jackhe@bu.edu",               sub:"Email" },
];

function aboutBadgeFg(hex) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (0.299*r+0.587*g+0.114*b) > 150 ? "#000" : "#fff";
}

function AboutFolderIcon() {
  return <img src="/assets/projects/folder.png" alt="" style={{ width:17, height:15, flexShrink:0, imageRendering:"pixelated" }} />;
}

function AboutTrophySVG() {
  return <img src="/assets/about/trophy.png" alt="" style={{ width:18, height:18, flexShrink:0, imageRendering:"pixelated", marginTop:1 }} />;
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
      <div style={{ height:20, flexShrink:0, display:"flex", alignItems:"center", padding:"2px 2px 0", fontSize:13, cursor:"default", userSelect:"none" }}>
        {["File","Edit","View","Help"].map(m => (
          <span key={m} style={{ padding:"1px 7px" }}
            onMouseEnter={e=>{ e.currentTarget.style.background="#000080"; e.currentTarget.style.color="#fff"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#000"; }}>
            <span style={{textDecoration:"underline"}}>{m[0]}</span>{m.slice(1)}
          </span>
        ))}
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
                    <img src="/assets/about/profile-pixel.png" alt="Jack He"
                      style={{ width:128, height:128, display:"block", imageRendering:"pixelated", objectFit:"cover" }} />
                  </div>
                  <div style={{ flex:1, minWidth:0, fontSize:15, lineHeight:1.7, color:"#000" }}>
                    <p style={{ margin:"0 0 14px" }}>Hi, I'm <b>Jack He</b>, a Computer Science student at <b>Boston University</b> (minor in Data Science, GPA 3.93, Class of 2029). I build software with a real purpose and a little personality.</p>
                    <p style={{ margin:"0 0 14px" }}>I'm especially into <b>machine learning</b>, and I've spent a good chunk of time training custom AI models from scratch using online data and reinforced prompting.</p>
                    <p style={{ margin:0 }}>I've racked up <b>4 hackathon wins</b> so far, which shows I can adapt and think critically in a team environment fast (fueled by a healthy supply of Red Bulls). Beyond that, I aim to not just ship code every day but to understand it to the fullest, so we can build toward a future where we aren't just giving our brains to the machines at its fullest.</p>
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
                  <img src="/assets/about/gradcap.png" alt="" style={{ width:26, height:26, flexShrink:0, imageRendering:"pixelated" }} />
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
                      <div style={{ width:112, flexShrink:0, display:"flex", justifyContent:"center" }}>
                        <div style={{ width: h.name === "Super Artificial Bros." ? 86 : 112, height:64, padding:3, boxShadow:sunken, background:h.logoBg, overflow:"hidden" }}>
                          <img src={h.logo} alt={h.name} style={{ width:"100%", height:"100%", objectFit:"contain" }}
                            onError={e => { e.target.style.display="none"; }} />
                        </div>
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
        <img src="/assets/sapling/thumb-sapling.png" alt="Sapling" style={{ width: "100%", height: "auto", display: "block" }} />
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
        <img src="/assets/mario/thumb-mario.png" alt="Super Artificial Bros." style={{ width: "100%", height: "auto", display: "block", imageRendering: "pixelated" }} />
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
          <img src="/assets/stalk/thumb-stalk-market.png" alt="Stalk Market" style={{ width: "100%", height: "auto", display: "block", imageRendering: "pixelated" }} />
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
      <img src="/assets/stalk/chicken.png" alt="" style={{ position: "absolute", right: -32, bottom: -12, width: 60, height: "auto", imageRendering: "pixelated", transform: "scaleX(-1)", filter: "drop-shadow(2px 3px 2px rgba(0,0,0,.35))", pointerEvents: "none" }} />
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
          file="/assets/resume/resume.pdf"
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
      <img src="/assets/shared/error.png" alt="Error" style={{ width: 32, height: 32, flexShrink: 0 }} />
      <div style={{ textAlign: "left" }}>
        <p style={{ margin: "2px 0" }}>Error loading bankaccountinformation.exe</p>
        <p style={{ margin: "2px 0" }}>One of the library files needed to run this application cannot be found.</p>
      </div>
    </div>
  );
}

const UPDATE_LOG = [
  { name: "Site Launch", date: "7/2/26", bullets: [
    "jacklhe.com is live",
    "Win95-themed desktop with draggable windows",
    "About Me, Projects, Resume, and Update Log windows",
    "Retro wallpaper, sounds, and 88x31 web badges",
  ]},
];

function UpdateLogMenuBar() {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ display: "flex", background: "#c0c0c0", borderBottom: "1px solid #808080",
      flexShrink: 0, userSelect: "none", color: "#000" }}>
      {["File", "Edit", "Search", "Help"].map(item => (
        <div key={item}
          onMouseDown={() => setOpen(open === item ? null : item)}
          onBlur={() => setOpen(null)}
          tabIndex={0}
          style={{ padding: "2px 8px", fontSize: 13, cursor: "default",
            background: open === item ? "#000080" : "transparent",
            color: open === item ? "#fff" : "#000" }}
          onMouseEnter={() => { if (open) setOpen(item); }}
        >
          <span style={{ textDecoration: "underline" }}>{item[0]}</span>{item.slice(1)}
        </div>
      ))}
    </div>
  );
}

function UpdateLogBody() {
  const sunken = "inset 1px 1px 0 #808080, inset -1px -1px 0 #fff, inset 2px 2px 0 #404040, inset -2px -2px 0 #dfdfdf";
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", color: "#000" }}>
      <UpdateLogMenuBar />
      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        margin: "2px 3px 3px", boxShadow: sunken,
        background: "#fffde7", padding: "8px 10px",
        fontFamily: "'W95FA',Tahoma,sans-serif", fontSize: 15, color: "#000",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
          <img src="/assets/shared/info-icon.png" alt="" style={{ width: 22, height: 22, imageRendering: "pixelated", flexShrink: 0 }} />
          <span style={{ fontWeight: "bold", fontSize: 20, color: "#000" }}>New Updates...</span>
        </div>
        {UPDATE_LOG.map((entry, i) => {
          const isLast = i === UPDATE_LOG.length - 1;
          return (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: "bold", fontSize: 17, color: "#000" }}>{entry.name} - {entry.date}</div>
              {entry.bullets.map((b, j) => {
                const isLastBullet = isLast && j === entry.bullets.length - 1;
                return (
                  <div key={j} style={{ color: "#000" }}>- {b}{isLastBullet && <span className="win95-blink">█</span>}</div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Photo Gallery ── */
const GALLERY_FOLDERS = [
  { id:'hackathons', name:"Hackathons", count:10, desc:"Photos from hackathons and competitions." },
];

const GALLERY_CAPS = {
  hackathons: [
    "Working",
    "Money",
    "BostonHacks Win",
    "BU DS + X Win",
    "Civic Hacks Announcement",
    "BU Civic Hacks Win",
    "Presentations",
    "Red Hat Win",
    "Red Hat Win 2",
    "Red Hat Logo",
  ],
};

function GalleryBody() {
  const [st, setSt] = useState({
    hist: [{ view:'folders', folderId:null, vi:0, sel:-1 }],
    hi: 0, zoom: 1, rot: 0,
  });

  const loc = st.hist[st.hi];
  const f = loc.folderId ? GALLERY_FOLDERS.find(x => x.id === loc.folderId) : null;
  const isFolders = loc.view === 'folders';
  const isFolder  = loc.view === 'folder';
  const isViewer  = loc.view === 'viewer';
  const canBack = st.hi > 0;
  const canFwd  = st.hi < st.hist.length - 1;

  const update = fn => setSt(s => fn(s));
  const go = next => update(s => { const hist=[...s.hist.slice(0,s.hi+1),next]; return {...s,hist,hi:hist.length-1,zoom:1,rot:0}; });
  const back    = () => update(s => s.hi>0 ? {...s,hi:s.hi-1,zoom:1,rot:0} : s);
  const forward = () => update(s => s.hi<s.hist.length-1 ? {...s,hi:s.hi+1,zoom:1,rot:0} : s);
  const setSel  = i  => update(s => { const hist=[...s.hist]; hist[s.hi]={...hist[s.hi],sel:i}; return {...s,hist}; });
  const step    = d  => update(s => {
    const folder = GALLERY_FOLDERS.find(x => x.id === s.hist[s.hi].folderId);
    if (!folder) return s;
    const ni = Math.min(folder.count-1, Math.max(0, s.hist[s.hi].vi+d));
    if (ni === s.hist[s.hi].vi) return s;
    const hist=[...s.hist]; hist[s.hi]={...hist[s.hi],vi:ni,sel:ni};
    return {...s,hist,zoom:1,rot:0};
  });

  const caps = f ? (GALLERY_CAPS[f.id]||[]) : [];
  const photos = f ? Array.from({length:f.count},(_,i)=>({
    src:'/assets/gallery/'+f.id+'/'+(i+1)+'.'+(f.ext||'jpg'),
    cap: caps[i]||('Photo '+(i+1)),
    file:'DSC0'+String(100+i).padStart(4,'0')+'.JPG',
    sel: loc.sel===i,
  })) : [];

  const cur = isViewer && photos[loc.vi] ? photos[loc.vi] : null;

  let panel = { title:'My Pictures', desc:'Select a folder to see its photos.', preview:null, details:[{k:'Folders',v:GALLERY_FOLDERS.length}] };
  if (isFolders && loc.sel>=0) {
    const sf=GALLERY_FOLDERS[loc.sel];
    panel={title:sf.name, desc:sf.desc, preview:null, details:[{k:'Type',v:'File Folder'},{k:'Photos',v:sf.count||'—'}]};
  } else if (isFolder) {
    const p = loc.sel>=0 ? photos[loc.sel] : null;
    panel = p
      ? {title:p.cap, desc:'', preview:p.src, details:[{k:'File',v:p.file},{k:'Folder',v:f.name}]}
      : {title:f.name, desc:f.count?'Double-click a photo to open it.':'No photos yet. Add images to /assets/gallery/'+f.id+'/', preview:null, details:[{k:'Photos',v:f.count||'—'}]};
  }

  const pathText = isFolders ? 'My Pictures'
    : isFolder ? ('My Pictures\\'+f.name)
    : ('My Pictures\\'+f.name+'\\'+(cur?.file||''));

  const statusLeft  = isFolders ? (GALLERY_FOLDERS.length+' folder(s)')
    : isFolder ? (f.count+' photo(s)')
    : ('Photo '+(loc.vi+1)+' of '+f.count);
  const statusMid   = isViewer ? (cur?.file||'') : (isFolder&&loc.sel>=0 ? '1 object(s) selected' : '');
  const statusRight = isViewer ? (Math.round(st.zoom*100)+'%') : '';

  const sunken = "inset 1px 1px 0 #808080, inset -1px -1px 0 #fff, inset 2px 2px 0 #404040, inset -2px -2px 0 #dfdfdf";

  const TbBtn = ({ onClick, disabled, children }) => (
    <div onClick={disabled ? undefined : onClick}
      style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 7px 2px 5px',
        border:'1px solid transparent', cursor:'default', fontSize:13, userSelect:'none',
        opacity: disabled ? 0.45 : 1 }}
      onMouseEnter={e=>{ if(!disabled){ e.currentTarget.style.borderColor='#fff #404040 #404040 #fff'; e.currentTarget.style.boxShadow='inset 1px 1px 0 #dfdfdf,inset -1px -1px 0 #808080'; }}}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.boxShadow='none'; }}
      onMouseDown={e=>{ if(!disabled){ e.currentTarget.style.borderColor='#404040 #fff #fff #404040'; e.currentTarget.style.boxShadow='inset 1px 1px 0 #808080'; }}}
      onMouseUp={e=>{ e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.boxShadow='none'; }}
    >{children}</div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', fontFamily:"'W95FA',Tahoma,sans-serif", fontSize:13, color:'#000' }}>

      {/* Menu bar */}
      <div style={{ height:20, flexShrink:0, display:'flex', alignItems:'center', padding:'2px 2px 0', fontSize:13, userSelect:'none', cursor:'default' }}>
        {['File','Edit','View','Go','Favorites','Help'].map(m=>(
          <span key={m} style={{ padding:'1px 7px' }}
            onMouseEnter={e=>{ e.currentTarget.style.background='#000080'; e.currentTarget.style.color='#fff'; }}
            onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#000'; }}>
            <span style={{textDecoration:'underline'}}>{m[0]}</span>{m.slice(1)}
          </span>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:1, padding:'3px 4px', borderTop:'1px solid #fff', borderBottom:'1px solid #808080' }}>
        <TbBtn onClick={back} disabled={!canBack}>
          <img src="/assets/gallery/icon-arrow.png" alt="" style={{width:26,height:26,imageRendering:'pixelated'}} />
          <span>Back</span>
        </TbBtn>
        <TbBtn onClick={forward} disabled={!canFwd}>
          <img src="/assets/gallery/icon-arrow.png" alt="" style={{width:26,height:26,imageRendering:'pixelated',transform:'scaleX(-1)'}} />
          <span>Forward</span>
        </TbBtn>
        <TbBtn onClick={() => {
          if (isViewer) go({view:'folder', folderId:loc.folderId, vi:0, sel:loc.vi});
          else if (isFolder) { const idx=GALLERY_FOLDERS.findIndex(x=>x.id===loc.folderId); go({view:'folders',folderId:null,vi:0,sel:idx}); }
        }} disabled={isFolders}>
          <img src="/assets/shared/uparrow.png" alt="" style={{width:26,height:26,imageRendering:'pixelated'}} />
          <span>Up</span>
        </TbBtn>
        <div style={{width:2,height:26,margin:'0 4px',borderLeft:'1px solid #808080',borderRight:'1px solid #fff'}}/>
        <TbBtn>
          <img src="/assets/shared/views.png" alt="" style={{width:22,height:22,imageRendering:'pixelated'}} />
          <span>Views</span>
        </TbBtn>
      </div>

      {/* Address bar */}
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:6, padding:'3px 6px', borderBottom:'1px solid #808080' }}>
        <span style={{ fontSize:12, color:'#404040' }}>Address</span>
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:5, height:22, padding:'0 2px 0 4px', background:'#fff', boxShadow:sunken }}>
          <img src="/assets/gallery/icon-camera.png" alt="" style={{width:15,height:15,imageRendering:'pixelated',flexShrink:0}}/>
          <span style={{flex:1,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{pathText}</span>
          <div style={{width:16,height:18,background:'#c0c0c0',border:'1px solid',borderColor:'#fff #404040 #404040 #fff',boxShadow:'inset 1px 1px 0 #dfdfdf,inset -1px -1px 0 #808080',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9}}>▼</div>
        </div>
      </div>

      {/* Viewer toolbar */}
      {isViewer && (
        <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:2, padding:'3px 5px', borderBottom:'1px solid #808080' }}>
          {[['Zoom Out',()=>update(s=>({...s,zoom:Math.max(0.25,+(s.zoom/1.25).toFixed(3))}))],
            ['Zoom In', ()=>update(s=>({...s,zoom:Math.min(4,+(s.zoom*1.25).toFixed(3))}))],
            ['Actual Size',()=>update(s=>({...s,zoom:1,rot:0}))]
          ].map(([l,fn])=>(
            <button key={l} onClick={fn} style={{padding:'2px 10px',fontSize:13,background:'#c0c0c0',border:'1px solid',borderColor:'#fff #404040 #404040 #fff',boxShadow:'inset 1px 1px 0 #dfdfdf,inset -1px -1px 0 #808080',cursor:'default'}}>{l}</button>
          ))}
          <div style={{width:2,height:20,margin:'0 5px',borderLeft:'1px solid #808080',borderRight:'1px solid #fff'}}/>
          {[['↺ Rotate',()=>update(s=>({...s,rot:s.rot-90}))],['↻ Rotate',()=>update(s=>({...s,rot:s.rot+90}))]].map(([l,fn])=>(
            <button key={l} onClick={fn} style={{padding:'2px 10px',fontSize:13,background:'#c0c0c0',border:'1px solid',borderColor:'#fff #404040 #404040 #fff',boxShadow:'inset 1px 1px 0 #dfdfdf,inset -1px -1px 0 #808080',cursor:'default'}}>{l}</button>
          ))}
          <div style={{width:2,height:20,margin:'0 5px',borderLeft:'1px solid #808080',borderRight:'1px solid #fff'}}/>
          <button onClick={()=>step(-1)} disabled={loc.vi===0} style={{padding:'2px 12px',fontSize:13,background:'#c0c0c0',border:'1px solid',borderColor:'#fff #404040 #404040 #fff',boxShadow:'inset 1px 1px 0 #dfdfdf,inset -1px -1px 0 #808080',cursor:'default',opacity:loc.vi===0?0.5:1}}>◄ Prev</button>
          <button onClick={()=>step(1)} disabled={!f||loc.vi>=f.count-1} style={{padding:'2px 12px',fontSize:13,background:'#c0c0c0',border:'1px solid',borderColor:'#fff #404040 #404040 #fff',boxShadow:'inset 1px 1px 0 #dfdfdf,inset -1px -1px 0 #808080',cursor:'default',opacity:!f||loc.vi>=f.count-1?0.5:1}}>Next ►</button>
        </div>
      )}

      {/* Main body */}
      <div style={{ flex:1, minHeight:0, display:'flex', padding:3, gap:3 }}>

        {/* Left panel */}
        {!isViewer && (
          <div style={{ width:190, flexShrink:0, background:'#fff', boxShadow:sunken, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ height:5, flexShrink:0, background:'linear-gradient(90deg,#000080,#1084d0)' }}/>
            <div style={{ flex:1, minHeight:0, overflowY:'auto', padding:'14px 14px 10px' }}>
              <div style={{ fontSize:18, fontWeight:'bold', color:'#000080', lineHeight:1.2, marginBottom:3 }}>{panel.title}</div>
              <div style={{ height:2, background:'#808080', borderBottom:'1px solid #fff', margin:'6px 0 10px' }}/>
              {panel.desc && <div style={{ fontSize:12, color:'#000080', lineHeight:1.55, marginBottom:10 }}>{panel.desc}</div>}
              {panel.preview && (
                <div style={{ padding:3, background:'#fff', boxShadow:sunken, marginBottom:10 }}>
                  <img src={panel.preview} alt="" style={{ display:'block', width:'100%', height:'auto' }} onError={e=>{ e.target.style.display='none'; }}/>
                </div>
              )}
              {panel.details.map(({k,v})=>(
                <div key={k} style={{ display:'flex', gap:5, fontSize:12, lineHeight:1.7 }}>
                  <span style={{ color:'#808080', flexShrink:0 }}>{k}:</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ flexShrink:0, padding:'6px 14px 10px', fontSize:11, color:'#808080' }}>My Pictures</div>
          </div>
        )}

        {/* Content */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* Folder grid */}
          {isFolders && (
            <div style={{ height:'100%', overflowY:'auto', background:'#fff', boxShadow:sunken }}>
              <div style={{ display:'flex', flexWrap:'wrap', alignContent:'flex-start', gap:6, padding:12 }}>
                {GALLERY_FOLDERS.map((fo,i)=>{
                  const sel=loc.sel===i;
                  return (
                    <div key={fo.id}
                      onClick={()=>setSel(i)}
                      onDoubleClick={()=>go({view:'folder',folderId:fo.id,vi:0,sel:-1})}
                      style={{ width:100, display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'6px 4px', cursor:'default', userSelect:'none' }}>
                      <img src="/assets/gallery/icon-picfolder.png" alt="" style={{ width:48, imageRendering:'pixelated' }} onError={e=>{ e.target.style.opacity='0.4'; }}/>
                      <div style={{ fontSize:12, textAlign:'center', padding:'1px 4px', background:sel?'#000080':'transparent', color:sel?'#fff':'#000', outline:sel?'1px dotted #fff':'none', outlineOffset:-1 }}>
                        {fo.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Photo grid */}
          {isFolder && (
            <div style={{ height:'100%', overflowY:'auto', background:'#fff', boxShadow:sunken }}>
              {f.count === 0
                ? <div style={{ padding:20, fontSize:13, color:'#808080' }}>No photos yet. Add images to <code>/gallery/{f.id}/</code> named 1.png, 2.png, etc., then update the count in GALLERY_FOLDERS.</div>
                : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', alignContent:'flex-start', gap:10, padding:12 }}>
                    {photos.map((ph,i)=>(
                      <div key={i}
                        onClick={()=>setSel(i)}
                        onDoubleClick={()=>go({view:'viewer',folderId:loc.folderId,vi:i,sel:i})}
                        style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'7px 5px', cursor:'default', userSelect:'none' }}>
                        <div style={{ position:'relative', width:'100%' }}>
                          <div style={{ padding:3, background:'#fff', boxShadow:sunken }}>
                            <img src={ph.src} alt="" style={{ display:'block', width:'100%', aspectRatio:'4/3', objectFit:'cover' }} onError={e=>{ e.target.style.opacity='0.3'; }}/>
                          </div>
                          {ph.sel && <div style={{ position:'absolute', inset:0, border:'2px solid #000080', pointerEvents:'none' }}/>}
                        </div>
                        <div style={{ fontSize:12, textAlign:'center', padding:'1px 4px', background:ph.sel?'#000080':'transparent', color:ph.sel?'#fff':'#000', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {ph.cap}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* Viewer */}
          {isViewer && cur && (
            <div style={{ height:'100%', overflow:'hidden', background:'#808080', boxShadow:'inset 1px 1px 0 #404040,inset -1px -1px 0 #fff', display:'flex', alignItems:'center', justifyContent:'center', padding:12 }}>
              <img src={cur.src} alt="" style={{ display:'block', width:'calc(100% - 24px)', height:'calc(100% - 24px)', objectFit:'cover', border:'5px solid #fff', boxShadow:'3px 3px 10px rgba(0,0,0,.55)', transform:`scale(${st.zoom}) rotate(${st.rot}deg)`, transition:'transform 0.08s ease' }} onError={e=>{ e.target.alt='Image not found'; }}/>
            </div>
          )}

        </div>
      </div>

      {/* Status bar */}
      <div style={{ flexShrink:0, display:'flex', gap:3, padding:'1px 2px 2px' }}>
        {[[null,statusLeft],[150,statusMid],[110,statusRight]].map(([w,txt],i)=>(
          <div key={i} style={{ flex:w?0:1, width:w||undefined, padding:'2px 8px', fontSize:12, boxShadow:'inset 1px 1px 0 #808080,inset -1px -1px 0 #fff', display:'flex', alignItems:'center' }}>{txt}</div>
        ))}
      </div>

    </div>
  );
}

function MinesweeperBody() {
  const [level, setLevel] = useState('intermediate');
  const [cells, setCells] = useState(() => msCreateGrid(16, 16));
  const [gameState, setGameState] = useState('idle');
  const [flagCount, setFlagCount] = useState(0);
  const [time, setTime] = useState(0);
  const [pressedCell, setPressedCell] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const timerRef = useRef(null);

  const { rows, cols, mines } = MS_LEVELS[level];

  const doReset = useCallback((lv) => {
    const newLv = lv || level;
    clearInterval(timerRef.current);
    const lvl = MS_LEVELS[newLv];
    setCells(msCreateGrid(lvl.rows, lvl.cols));
    setGameState('idle');
    setFlagCount(0);
    setTime(0);
    if (lv) setLevel(lv);
  }, [level]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleClick = (r, c) => {
    if (gameState === 'won' || gameState === 'lost') return;
    const cell = cells[r][c];
    if (cell.state === 'flagged' || cell.state === 'question') return;

    if (cell.state === 'revealed') {
      if (cell.adj === 0) return;
      let adjFlags = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && cells[nr][nc].state === 'flagged') adjFlags++;
      }
      if (adjFlags !== cell.adj) return;
      let g = cells.map(row => row.map(c => ({ ...c })));
      let hitMine = false;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (g[nr][nc].state === 'hidden') {
          if (g[nr][nc].mine) { g[nr][nc].state = 'revealed'; hitMine = true; }
          else g = msReveal(g, nr, nc, rows, cols);
        }
      }
      if (hitMine) {
        g = g.map(row => row.map(c => c.mine && c.state !== 'flagged' ? { ...c, state: 'revealed' } : { ...c }));
        clearInterval(timerRef.current);
        setCells(g); setGameState('lost'); return;
      }
      if (msCheckWon(g, rows, cols)) {
        clearInterval(timerRef.current);
        setCells(g.map(row => row.map(c => c.mine ? { ...c, state: 'flagged' } : { ...c })));
        setFlagCount(mines); setGameState('won'); return;
      }
      setCells(g); return;
    }

    let g = cells;
    if (gameState === 'idle') {
      g = msPlaceMines(cells, rows, cols, mines, r, c);
      setGameState('playing');
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setTime(t => Math.min(999, t + 1)), 1000);
    }
    if (g[r][c].mine) {
      g = g.map(row => row.map(c => c.mine && c.state !== 'flagged' ? { ...c, state: 'revealed' } : { ...c }));
      clearInterval(timerRef.current);
      setCells(g); setGameState('lost'); return;
    }
    g = msReveal(g, r, c, rows, cols);
    if (msCheckWon(g, rows, cols)) {
      clearInterval(timerRef.current);
      setCells(g.map(row => row.map(c => c.mine ? { ...c, state: 'flagged' } : { ...c })));
      setFlagCount(mines); setGameState('won'); return;
    }
    setCells(g);
  };

  const handleRightClick = (e, r, c) => {
    e.preventDefault();
    if (gameState === 'won' || gameState === 'lost') return;
    if (cells[r][c].state === 'revealed') return;
    const g = cells.map(row => row.map(c => ({ ...c })));
    const cur = g[r][c].state;
    if (cur === 'hidden') { g[r][c].state = 'flagged'; setFlagCount(f => f + 1); }
    else if (cur === 'flagged') { g[r][c].state = 'question'; setFlagCount(f => f - 1); }
    else { g[r][c].state = 'hidden'; }
    setCells(g);
  };

  const smileyState = gameState === 'won' ? 'cool' : gameState === 'lost' ? 'dead' : pressedCell !== null ? 'shocked' : 'normal';
  const CELL = 16;

  const renderCell = (cell, r, c) => {
    const { state, mine, adj } = cell;
    const key = `${r}-${c}`;
    const base = { width: CELL, height: CELL, boxSizing: 'border-box', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };

    if (state === 'revealed') {
      return (
        <div key={key} style={{ ...base, border: '1px solid #808080', background: mine ? '#f00' : '#c0c0c0', fontSize: 13, fontWeight: 'bold', color: MS_NUM_COLOR[adj] || '#000', fontFamily: "'W95FA', sans-serif", userSelect: 'none' }}
          onClick={() => handleClick(r, c)}>
          {mine ? <MsMine size={12} /> : adj > 0 ? adj : null}
        </div>
      );
    }

    const raised = { ...base, border: '2px solid', borderColor: '#fff #808080 #808080 #fff', background: '#c0c0c0', cursor: 'default' };

    if (state === 'flagged') {
      const wrongFlag = gameState === 'lost' && !mine;
      return (
        <div key={key} style={raised} onContextMenu={e => handleRightClick(e, r, c)}>
          {wrongFlag
            ? <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MsMine size={12} />
                <div style={{ position: 'absolute', fontSize: 13, color: '#f00', fontWeight: 'bold', pointerEvents: 'none' }}>✕</div>
              </div>
            : <MsFlag size={12} />}
        </div>
      );
    }

    if (state === 'question') {
      return (
        <div key={key} style={{ ...raised, fontSize: 12, fontWeight: 'bold', color: '#000', userSelect: 'none' }}
          onClick={() => handleClick(r, c)} onContextMenu={e => handleRightClick(e, r, c)}>?</div>
      );
    }

    const isPressed = pressedCell && pressedCell.r === r && pressedCell.c === c;
    const pressedStyle = { ...base, border: '1px solid #808080', background: '#c0c0c0' };
    return (
      <div key={key} style={isPressed ? pressedStyle : raised}
        onClick={() => handleClick(r, c)}
        onContextMenu={e => handleRightClick(e, r, c)}
        onMouseDown={() => setPressedCell({ r, c })}
        onMouseUp={() => setPressedCell(null)}
        onMouseLeave={() => setPressedCell(null)}
      />
    );
  };

  const outerBorder = { border: '3px solid', borderColor: '#808080 #fff #fff #808080', boxShadow: 'inset 1px 1px 0 #404040' };

  const menuItems = [
    { label: 'New Game', shortcut: 'F2', action: () => doReset() },
    null,
    { label: 'Beginner',     action: () => doReset('beginner'),     check: level === 'beginner' },
    { label: 'Intermediate', action: () => doReset('intermediate'), check: level === 'intermediate' },
    { label: 'Expert',       action: () => doReset('expert'),       check: level === 'expert' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#c0c0c0', userSelect: 'none' }}
      onContextMenu={e => e.preventDefault()}>

      {/* Menu bar */}
      <div style={{ height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '2px 2px 0', fontSize: 13, cursor: 'default' }}>
        {['Game', 'Help', 'Extras'].map(m => (
          <div key={m} style={{ position: 'relative' }} onMouseDown={e => e.stopPropagation()}>
            <span style={{ padding: '1px 7px', display: 'block' }}
              onMouseDown={() => setMenuOpen(p => p === m ? null : m)}
              onMouseEnter={e => { e.currentTarget.style.background = '#000080'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000'; }}>
              <span style={{ textDecoration: 'underline' }}>{m[0]}</span>{m.slice(1)}
            </span>
            {menuOpen === m && m === 'Game' && (
              <div style={{ position: 'absolute', top: '100%', left: 0, background: '#c0c0c0', border: '2px solid', borderColor: '#fff #404040 #404040 #fff', boxShadow: '2px 2px 4px rgba(0,0,0,.35)', zIndex: 999, minWidth: 170, padding: '2px 0' }}>
                {menuItems.map((item, i) => item === null
                  ? <div key={i} style={{ height: 1, background: '#808080', margin: '3px 4px' }} />
                  : (
                    <div key={i} style={{ padding: '3px 24px 3px 24px', fontSize: 13, color: '#000', display: 'flex', alignItems: 'center', cursor: 'default', position: 'relative' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#000080'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000'; }}
                      onMouseDown={() => { item.action(); setMenuOpen(null); }}>
                      {item.check && <span style={{ position: 'absolute', left: 8 }}>•</span>}
                      {item.label}
                      {item.shortcut && <span style={{ marginLeft: 'auto', paddingLeft: 16, opacity: 0.65 }}>{item.shortcut}</span>}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Game area */}
      <div style={{ flex: 1, overflow: 'hidden', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, ...outerBorder, padding: 6, background: '#c0c0c0' }}>

          {/* Header: counter | smiley | timer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', ...outerBorder, minWidth: cols * CELL - 12 }}>
            <LcdPanel value={mines - flagCount} digits={3} />
            <button onClick={() => doReset()}
              style={{ width: 30, height: 30, background: '#c0c0c0', border: '2px solid', borderColor: '#fff #808080 #808080 #fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, outline: 'none' }}
              onMouseDown={e => { e.currentTarget.style.borderColor = '#808080 #fff #fff #808080'; }}
              onMouseUp={e => { e.currentTarget.style.borderColor = '#fff #808080 #808080 #fff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#fff #808080 #808080 #fff'; }}>
              <img src={{ dead: '/assets/minesweeper/Minesweeper - Lost.png', cool: '/assets/minesweeper/Minesweeper - Won.png', shocked: '/assets/minesweeper/Minesweeper - Shocked.png' }[smileyState] ?? '/assets/minesweeper/Minesweeper - Idle.png'} alt="" style={{ width: 24, height: 24, imageRendering: 'pixelated' }} />
            </button>
            <LcdPanel value={time} digits={3} />
          </div>

          {/* Grid */}
          <div style={{ ...outerBorder, display: 'inline-block', lineHeight: 0 }}>
            {cells.map((row, r) => (
              <div key={r} style={{ display: 'flex' }}>
                {row.map((cell, c) => renderCell(cell, r, c))}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

function EmailBody() {
  const [form, setForm] = useState({ from: '', subject: '', message: '' });
  const [status, setStatus] = useState('idle');

  const sunken = "inset 1px 1px 0 #808080, inset -1px -1px 0 #fff, inset 2px 2px 0 #404040, inset -2px -2px 0 #dfdfdf";

  const [errorMsg, setErrorMsg] = useState('');

  const handleSend = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!form.from.trim() || !form.subject.trim() || !form.message.trim()) {
      setStatus('incomplete'); return;
    }
    setStatus('sending');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: form.subject,
          from_name: 'Portfolio Contact',
          email: form.from,
          message: form.message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setStatus('sent');
      } else {
        setErrorMsg(data.message || `HTTP ${res.status}`);
        setStatus('error');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error');
      setStatus('error');
    }
  };

  const inputStyle = {
    flex: 1, boxSizing: 'border-box', background: '#fff', border: 'none', outline: 'none',
    padding: '2px 4px', fontFamily: "'W95FA', sans-serif", fontSize: 13, height: 22,
    boxShadow: sunken, userSelect: 'text',
  };

  const W95Btn = ({ onClick, children, disabled }) => (
    <button onClick={onClick} disabled={!!disabled} style={{
      height: 22, background: '#c0c0c0',
      border: '2px solid', borderColor: '#fff #808080 #808080 #fff',
      boxShadow: 'inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #404040',
      fontFamily: "'W95FA', sans-serif", fontSize: 13,
      cursor: disabled ? 'default' : 'pointer', outline: 'none', padding: '0 6px',
      display: 'flex', alignItems: 'center', gap: 4,
    }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.borderColor = '#808080 #fff #fff #808080'; }}
      onMouseUp={e => { if (!disabled) e.currentTarget.style.borderColor = '#fff #808080 #808080 #fff'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#fff #808080 #808080 #fff'; }}
    >{children}</button>
  );

  if (status === 'sent') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, fontFamily: "'W95FA', sans-serif", fontSize: 13, background: '#c0c0c0' }}>
        <img src="/assets/email/Email.png" alt="" style={{ width: 48, height: 48, imageRendering: 'pixelated', objectFit: 'contain' }} />
        <p style={{ margin: 0 }}>Message sent!</p>
        <W95Btn onClick={() => { setForm({ from: '', subject: '', message: '' }); setStatus('idle'); }}>New Message</W95Btn>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#c0c0c0', fontFamily: "'W95FA', sans-serif", fontSize: 13, userSelect: 'none' }}>
      {/* Menu bar */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '2px 4px', borderBottom: '1px solid #808080' }}>
        {['File', 'Edit', 'View', 'Insert', 'Format', 'Help'].map(m => (
          <span key={m} style={{ padding: '1px 6px', fontSize: 13, cursor: 'default' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#000080'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000'; }}>
            <u>{m[0]}</u>{m.slice(1)}
          </span>
        ))}
      </div>

      {/* Content wrapper — 3px side padding matches About Me's panel inset */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 3px 3px', minHeight: 0 }}>

      {/* Header fields */}
      <div style={{ flexShrink: 0, padding: '5px 5px 3px', borderBottom: '1px solid #808080' }}>
        {/* To row with Send button */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ width: 56, flexShrink: 0, textAlign: 'right', paddingRight: 6, userSelect: 'none' }}>To:</span>
          <input readOnly value="jackhe@bu.edu" style={{ ...inputStyle, background: '#c0c0c0', userSelect: 'none', flex: 1 }} />
          <div style={{ marginLeft: 6, flexShrink: 0 }}>
            <W95Btn onClick={handleSend} disabled={status === 'sending'}>
              <img src="/assets/email/send.svg" alt="" style={{ width: 16, height: 16, objectFit: 'contain', display: 'block' }} />
              Send
            </W95Btn>
          </div>
        </div>
        {[
          { label: 'From:',    field: 'from',    placeholder: 'your@email.com' },
          { label: 'Subject:', field: 'subject', placeholder: 'Enter subject' },
        ].map(({ label, field, placeholder }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ width: 56, flexShrink: 0, textAlign: 'right', paddingRight: 6, userSelect: 'none' }}>{label}</span>
            <input
              type={field === 'from' ? 'email' : 'text'}
              value={form[field]}
              placeholder={placeholder}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              style={{ ...inputStyle }}
            />
          </div>
        ))}
      </div>

      {/* Message */}
      <textarea
        value={form.message}
        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
        placeholder="Type your message here..."
        style={{
          flex: 1, resize: 'none', border: 'none', outline: 'none',
          padding: '6px 8px', fontFamily: "'W95FA', sans-serif", fontSize: 13,
          background: '#fff', userSelect: 'text',
          boxShadow: 'inset 1px 1px 0 #808080, inset 2px 2px 0 #404040',
        }}
      />

      {/* Status — only shown when actionable */}
      {(status === 'sending' || status === 'error' || status === 'incomplete') && (
        <div style={{ flexShrink: 0, padding: '2px 5px', fontSize: 12, background: '#c0c0c0', borderTop: '1px solid #808080' }}>
          {status === 'sending'    ? 'Sending...' :
           status === 'error'      ? `Error: ${errorMsg || 'could not send'}` :
                                     'Please fill in all fields.'}
        </div>
      )}

      </div>{/* end content wrapper */}
    </div>
  );
}

const BODIES = {
  welcome:     <WelcomeBody />,
  about:       <AboutBody />,
  projects:    <ProjectsBody />,
  bank:        <BankBody />,
  resume:      <ResumeBody />,
  updatelog:   <UpdateLogBody />,
  gallery:     <GalleryBody />,
  minesweeper: <MinesweeperBody />,
  email:       <EmailBody />,
  sapling:     <SaplingAd />,
  mario:       <MarioAd />,
  stalk:       <StalkAd />,
};

/* ── App + window manager ── */
export default function App() {
  const [wins, setWins] = useState(() => {
    const wx = Math.max(8, Math.round((window.innerWidth - APPS.welcome.width) / 2));
    const wy = Math.max(8, Math.round((window.innerHeight - TASKBAR_H - 300) / 2));
    return {
      welcome:   { open: true,  min: false, max: false, x: wx,      y: wy,      z: 10, prev: null },
      updatelog: { open: true,  min: false, max: false, x: Math.max(8, window.innerWidth - 330), y: 8, z: 9, prev: null },
      gallery:      { open: false, min: false, max: false, x: 120, y: 60,  z: 1, prev: null },
      minesweeper:  { open: false, min: false, max: false, x: 180, y: 70,  z: 1, prev: null },
      email:        { open: false, min: false, max: false, x: 200, y: 80,  z: 1, prev: null },
      about:        { open: false, min: false, max: false, x: 140, y: 70,  z: 1, prev: null },
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
    const err = new Audio("/assets/shared/error.mp3");
    err.volume = 1.0;
    const errSource = audioCtx.createMediaElementSource(err);
    errSource.connect(gainNode);
    errorSound.current = err;
    const chord = new Audio("/assets/shared/Windows 95 Chord Sound Effect (High Quality) (mp3cut.net) (1).mp3");
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
        <source src="/assets/shared/wallpaper.mp4" type="video/mp4" />
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
                <img src={app.icon} alt="" style={{ imageRendering: app.pixel ? "pixelated" : "auto", objectFit: "contain", width: app.iconSize, height: app.iconSize }} />
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
                <img src="/assets/social/icon-github.png" alt="" style={{ width: 26, height: 26, imageRendering: "pixelated", mixBlendMode: "multiply", flexShrink: 0 }} />
                GitHub
              </div>
            </div>
          </div>
        )}

        <Taskbar style={{ top: "auto", bottom: 0, zIndex: 9999 }}>
          <Toolbar style={{ justifyContent: "flex-start", padding: 3, gap: 4, minHeight: 0 }}>
            <StartButton $active={startOpen} onMouseDown={e => { e.stopPropagation(); setStartOpen(s => !s); }}>
              <StartImg src="/assets/shared/start.png" alt="" />
              Start
            </StartButton>

            <TaskbarBtns>
              {Object.entries(wins).filter(([, w]) => w.open).map(([id]) => (
                <TaskbarWinBtn key={id} className={activeId === id && !wins[id].min ? "active" : ""} onClick={() => onTaskbarClick(id)}>
                  {APPS[id].iconNode ?? <img src={APPS[id].icon ?? "/assets/projects/projects.png"} alt="" />}
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
