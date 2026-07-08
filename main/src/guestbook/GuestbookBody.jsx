// Windows 95 Guestbook - ported from the "Windows 95 Guestbook App" mockup
// (Guestbook.dc.html), adapted to the real site: Supabase storage instead of
// localStorage, all 187 animated emotes, and an allowlist sanitizer + profanity filter.

import { useState, useEffect, useRef, useCallback } from "react";
import { EMOJIS, emojiUrl } from "./emojis.js";
import { sanitizeHtml } from "./sanitize.js";
import { fetchEntries, submitEntry } from "./api.js";
import { getSession, onAuthChange, signIn, signOut, deleteEntry } from "./admin.js";

const PER = 5;
const SUNKEN = "inset 1px 1px 0 #808080, inset -1px -1px 0 #fff, inset 2px 2px 0 #404040, inset -2px -2px 0 #dfdfdf";
const RAISED = "inset 1px 1px 0 #fff, inset -1px -1px 0 #404040, inset 2px 2px 0 #dfdfdf, inset -2px -2px 0 #808080";
const CHIME = "/assets/shared/chimes.mp3";

const COLORS = [
  "#000000", "#808080", "#c0c0c0", "#ffffff", "#800000", "#ff0000",
  "#808000", "#ffff00", "#008000", "#00c000", "#008080", "#00b0b0",
  "#000080", "#0000ff", "#800080", "#c000c0",
];
const SIZES = [
  { label: "Small", px: "11px" },
  { label: "Normal", px: "14px" },
  { label: "Large", px: "19px" },
  { label: "Huge", px: "26px" },
];

const SMILEY_ICON = emojiUrl("1smiling.ico");
const HEART_ICON = emojiUrl("16laughing.ico");

function fmtWhen(iso) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const t = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
  return day + " at " + t;
}

const normUrl = (u) => (/^https?:\/\//i.test(u) ? u : "https://" + u);

const inputStyle = {
  width: "100%", boxSizing: "border-box", height: 23, background: "#fff", border: "none",
  outline: "none", padding: "2px 5px", fontFamily: "'W95FA', Tahoma, sans-serif",
  fontSize: 14, color: "#000", boxShadow: SUNKEN,
};
const labelStyle = { display: "block", fontSize: 13, color: "#000", marginBottom: 3 };
const toolBtn = {
  height: 24, display: "flex", alignItems: "center", justifyContent: "center",
  background: "#c0c0c0", border: "1px solid", borderColor: "#fff #808080 #808080 #fff",
  boxShadow: "inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #404040", color: "#000",
  padding: 0, cursor: "pointer",
};
const popover = {
  position: "absolute", top: 32, zIndex: 30, background: "#c0c0c0", border: "2px solid",
  borderColor: "#fff #404040 #404040 #fff", boxShadow: "2px 2px 5px rgba(0,0,0,.4)", padding: 5,
};
const smallBtn = {
  height: 20, padding: "0 8px", background: "#c0c0c0", border: "1px solid",
  borderColor: "#fff #808080 #808080 #fff", boxShadow: "inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #404040",
  fontFamily: "'W95FA', Tahoma, sans-serif", fontSize: 12, color: "#000", cursor: "pointer",
};
// Shared modal-dialog styling (login, confirm-delete, error).
const overlayStyle = { position: "absolute", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" };
const dialogStyle = { background: "#c0c0c0", border: "2px solid", borderColor: "#dfdfdf #404040 #404040 #dfdfdf", boxShadow: "2px 2px 0 rgba(0,0,0,.35)" };
const dlgTitle = { display: "flex", alignItems: "center", height: 20, padding: "0 3px", background: "linear-gradient(90deg,#000080,#1084d0)", color: "#fff", fontSize: 12, fontWeight: "bold" };
const dlgBtn = { height: 24, minWidth: 74, background: "#c0c0c0", border: "2px solid", borderColor: "#fff #808080 #808080 #fff", boxShadow: "inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #404040", fontFamily: "'W95FA', Tahoma, sans-serif", fontSize: 13, cursor: "pointer" };

// Pixel-art red map pin (shapeRendering crispEdges = blocky, matches the Win95 theme).
function PinIcon() {
  return (
    <svg width="11" height="10" viewBox="0 0 9 8" shapeRendering="crispEdges" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <g fill="#d40000">
        <rect x="3" y="0" width="3" height="1" />
        <rect x="2" y="1" width="5" height="1" />
        <rect x="1" y="2" width="7" height="1" />
        <rect x="1" y="3" width="7" height="1" />
        <rect x="1" y="4" width="7" height="1" />
        <rect x="2" y="5" width="5" height="1" />
        <rect x="3" y="6" width="3" height="1" />
        <rect x="4" y="7" width="1" height="1" />
      </g>
      <g fill="#fff">
        <rect x="3" y="2" width="3" height="1" />
        <rect x="3" y="3" width="3" height="1" />
      </g>
    </svg>
  );
}

export default function GuestbookBody() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [hasText, setHasText] = useState(false);
  const [pop, setPop] = useState(null); // 'size' | 'color' | 'emoji' | null
  const [curColor, setCurColor] = useState("#000000");
  const [justSent, setJustSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── admin moderation ──
  const [session, setSession] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // entry id, or null

  const editorRef = useRef(null);
  const toolsRef = useRef(null);
  const savedRange = useRef(null);
  const honeypotRef = useRef(null);
  const sentTimer = useRef(null);

  // ── load entries ──
  useEffect(() => {
    let alive = true;
    fetchEntries()
      .then((rows) => { if (alive) { setEntries(rows); setLoading(false); } })
      .catch(() => { if (alive) { setError("Couldn't load the guestbook. Please try again later."); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  // ── admin session: ?admin reveals the login; a saved session persists ──
  useEffect(() => {
    let alive = true;
    getSession().then((s) => {
      if (!alive) return;
      setSession(s);
      if (!s && /[?&]admin\b/i.test(window.location.search)) setShowLogin(true);
    });
    const off = onAuthChange((s) => { if (alive) { setSession(s); if (s) setShowLogin(false); } });
    return () => { alive = false; off(); };
  }, []);

  // ── close popovers on outside click ──
  useEffect(() => {
    const onDown = (e) => {
      if (!pop) return;
      if (toolsRef.current && !toolsRef.current.contains(e.target)) setPop(null);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [pop]);

  useEffect(() => () => clearTimeout(sentTimer.current), []);

  // ── editor helpers ──
  const syncText = useCallback(() => {
    const ed = editorRef.current;
    const has = !!(ed && ((ed.textContent || "").trim() || ed.querySelector("img")));
    setHasText(has);
  }, []);

  const hold = (e) => {
    e.preventDefault();
    const s = window.getSelection();
    if (s && s.rangeCount) savedRange.current = s.getRangeAt(0).cloneRange();
  };
  const restore = () => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    if (savedRange.current) {
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(savedRange.current);
    }
  };

  const doBold = () => { restore(); document.execCommand("styleWithCSS", false, false); document.execCommand("bold"); syncText(); };
  const doItalic = () => { restore(); document.execCommand("styleWithCSS", false, false); document.execCommand("italic"); syncText(); };

  const pickSize = (px) => {
    restore();
    document.execCommand("fontSize", false, "7");
    const ed = editorRef.current;
    // Convert <font size="7"> into <span style="font-size"> so it survives sanitizing.
    ed && ed.querySelectorAll("font[size='7']").forEach((f) => {
      const span = document.createElement("span");
      span.style.fontSize = px;
      while (f.firstChild) span.appendChild(f.firstChild);
      f.replaceWith(span);
    });
    setPop(null); syncText();
  };
  const pickColor = (hex) => {
    restore();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("foreColor", false, hex);
    setCurColor(hex); setPop(null); syncText();
  };
  const insertEmoji = (file) => {
    restore();
    document.execCommand("insertHTML", false, '<img src="' + emojiUrl(file) + '" alt="emoji">');
    syncText();
  };
  const insertLink = () => {
    const url = window.prompt("Link URL:", "https://");
    if (!url || url === "https://") return;
    const href = normUrl(url);
    restore();
    const sel = window.getSelection();
    if (sel && sel.isCollapsed) {
      document.execCommand("insertHTML", false, '<a href="' + href + '">' + href + "</a>&nbsp;");
    } else {
      document.execCommand("createLink", false, href);
    }
    syncText();
  };

  const togglePop = (which) => setPop((p) => (p === which ? null : which));

  // ── submit ──
  const send = async () => {
    if (sending) return;
    const ed = editorRef.current;
    const raw = ed ? ed.innerHTML.trim() : "";
    setSending(true);
    const res = await submitEntry({
      name, location, website, html: raw,
      honeypot: honeypotRef.current ? honeypotRef.current.value : "",
    });
    setSending(false);
    if (!res.ok) { setError(res.message); return; }
    if (res.entry) setEntries((prev) => [res.entry, ...prev]);
    if (ed) ed.innerHTML = "";
    setName(""); setLocation(""); setWebsite("");
    setHasText(false); setPage(1); setPop(null); setJustSent(true);
    try { const a = new Audio(CHIME); a.volume = 0.6; a.play().catch(() => {}); } catch (e) { /* ignore */ }
    clearTimeout(sentTimer.current);
    sentTimer.current = setTimeout(() => setJustSent(false), 3500);
  };

  const canSend = hasText && !sending;

  // ── admin handlers ──
  const isAdmin = !!session;
  const doLogin = async () => {
    if (loggingIn) return;
    setLoginError("");
    setLoggingIn(true);
    const res = await signIn(loginEmail, loginPw);
    setLoggingIn(false);
    if (!res.ok) { setLoginError(res.message); return; }
    setShowLogin(false); setLoginEmail(""); setLoginPw("");
  };
  const closeLogin = () => { setShowLogin(false); setLoginEmail(""); setLoginPw(""); setLoginError(""); };
  const doLogout = async () => { await signOut(); setSession(null); };
  const doDelete = async (id) => {
    setConfirmDelete(null);
    const res = await deleteEntry(id);
    if (!res.ok) { setError(res.message); return; }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  // ── pagination math ──
  const total = entries.length;
  const pages = Math.max(1, Math.ceil(total / PER));
  const cur = Math.min(page, pages);
  const shown = entries.slice((cur - 1) * PER, (cur - 1) * PER + PER);

  const pageBtn = (label, target, active, disabled) => (
    <span
      key={"p" + label + target}
      onClick={disabled ? undefined : () => { setPage(target); setPop(null); }}
      style={{
        padding: "0 5px", fontSize: 13, userSelect: "none",
        cursor: disabled ? "default" : "pointer",
        color: disabled ? "#808080" : "#0000ee",
        fontWeight: active ? "bold" : "normal",
      }}
    >{active ? "[" + label + "]" : label}</span>
  );
  const pageNums = [];
  {
    const maxN = 8;
    let lo = 1, hi = pages;
    if (pages > maxN) { lo = Math.max(1, cur - 3); hi = Math.min(pages, lo + maxN - 1); lo = Math.max(1, hi - maxN + 1); }
    pageNums.push(pageBtn("◂", cur - 1, false, cur === 1));
    for (let n = lo; n <= hi; n++) pageNums.push(pageBtn(String(n), n, n === cur, false));
    pageNums.push(pageBtn("▸", cur + 1, false, cur === pages));
  }

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", background: "#c0c0c0", fontFamily: "'W95FA', Tahoma, sans-serif" }}>
      <style>{`
        #gb-editor:empty:before { content: attr(data-ph); color:#9a9a9a; }
        #gb-editor img, .gb-body img { height:16px; width:auto; vertical-align:-3px; margin:0 1px; image-rendering: pixelated; }
        .gb-body a { color:#0000ee; }
        .gb-menu span:hover { background:#000080; color:#fff !important; }
        /* W95FA has no true italic face, so its synthesized slant is invisible.
           Render italics in an italic-capable font so they actually slant. */
        #gb-editor i, #gb-editor em, .gb-body i, .gb-body em { font-family: Tahoma, "Segoe UI", sans-serif; font-style: italic; }
      `}</style>

      {/* Menu bar */}
      <div className="gb-menu" style={{ flex: "none", display: "flex", alignItems: "center", height: 19, padding: "2px 2px 0", fontSize: 13, color: "#000", userSelect: "none" }}>
        {["File", "Edit", "View", "Help"].map((m) => (
          <span key={m} style={{ padding: "1px 7px" }}><u>{m[0]}</u>{m.slice(1)}</span>
        ))}
      </div>

      {/* Admin bar - only while signed in */}
      {isAdmin && (
        <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "3px 6px", background: "#000080", color: "#fff", fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>🔒 Signed in as admin - delete buttons enabled</span>
          <button onClick={doLogout} style={smallBtn}>Log out</button>
        </div>
      )}

      {/* Scrollable content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#c0c0c0" }}>
        <div style={{ padding: "10px 12px 12px" }}>
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 24, color: "#000", margin: "4px 0 12px", textTransform: "capitalize" }}>
            Welcome to my guestbook!!
          </div>

          {/* Sign form */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Name:</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Anonymous" style={inputStyle} />

            {/* honeypot - hidden from users, catches bots */}
            <input ref={honeypotRef} type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
              style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />

            <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={labelStyle}>Where ya from <span style={{ color: "#555" }}>(optional)</span>:</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={60} placeholder="City, Country" style={inputStyle} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={labelStyle}>Your website <span style={{ color: "#555" }}>(optional)</span>:</label>
                <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={80} placeholder="yoursite.com" style={inputStyle} />
              </div>
            </div>

            <label style={{ ...labelStyle, margin: "9px 0 3px" }}>Message<span style={{ color: "#a00" }}>*</span>:</label>

            {/* Toolbar + popovers */}
            <div ref={toolsRef} id="gb-tools" style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3, padding: 3, background: "#c0c0c0", boxShadow: "inset 1px 1px 0 #fff, inset -1px -1px 0 #808080" }}>
                <button onMouseDown={hold} onClick={doBold} title="Bold" style={{ ...toolBtn, width: 26, fontFamily: "'Times New Roman', serif", fontWeight: "bold", fontSize: 16 }}>B</button>
                <button onMouseDown={hold} onClick={doItalic} title="Italic" style={{ ...toolBtn, width: 26, fontFamily: "'Times New Roman', serif", fontStyle: "italic", fontSize: 16 }}>I</button>

                <span style={{ width: 1, height: 20, background: "#808080", boxShadow: "1px 0 0 #fff", margin: "0 2px" }} />

                <button onMouseDown={hold} onClick={() => togglePop("size")} title="Font size" style={{ ...toolBtn, minWidth: 30, alignItems: "flex-end", gap: 1, padding: "0 4px 2px" }}>
                  <span style={{ fontSize: 10, lineHeight: 1 }}>A</span><span style={{ fontSize: 16, lineHeight: 1 }}>A</span>
                </button>

                <button onMouseDown={hold} onClick={() => togglePop("color")} title="Font color" style={{ ...toolBtn, width: 30, flexDirection: "column" }}>
                  <span style={{ fontFamily: "'Times New Roman', serif", fontWeight: "bold", fontSize: 14, lineHeight: 1, color: "#000" }}>A</span>
                  <span style={{ width: 16, height: 3, marginTop: 1, background: curColor }} />
                </button>

                <button onMouseDown={hold} onClick={insertLink} title="Insert link" style={{ ...toolBtn, width: 28 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16"><path d="M6.5 9.5 L9.5 6.5" stroke="#0000cc" strokeWidth="1.6" strokeLinecap="round" /><path d="M9 4.2 L10.2 3 a2.6 2.6 0 0 1 3.7 3.7 L12.7 7.9" stroke="#000" strokeWidth="1.6" fill="none" strokeLinecap="round" /><path d="M7 12 L5.8 13.2 a2.6 2.6 0 0 1 -3.7 -3.7 L3.3 8.3" stroke="#000" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
                </button>

                <button onMouseDown={hold} onClick={() => togglePop("emoji")} title="Emoji" style={{ ...toolBtn, width: 28 }}>
                  <img src={SMILEY_ICON} alt="" style={{ width: 18, height: 18, objectFit: "contain", imageRendering: "pixelated" }} />
                </button>
              </div>

              {/* Size popover */}
              {pop === "size" && (
                <div style={{ ...popover, left: 64, padding: 3, minWidth: 120 }}>
                  {SIZES.map((s) => (
                    <div key={s.label} onMouseDown={hold} onClick={() => pickSize(s.px)} style={{ padding: "4px 10px", fontSize: s.px, color: "#000", cursor: "pointer" }}>{s.label}</div>
                  ))}
                </div>
              )}

              {/* Color popover */}
              {pop === "color" && (
                <div style={{ ...popover, left: 96 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6,18px)", gap: 3 }}>
                    {COLORS.map((hex) => (
                      <div key={hex} onMouseDown={hold} onClick={() => pickColor(hex)} title={hex} style={{ width: 18, height: 18, background: hex, border: "1px solid", borderColor: "#808080 #fff #fff #808080", cursor: "pointer" }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Emoji popover - 16 classic emoticons in a 4x4 grid. Upscaled with
                  image-rendering:pixelated so the 12x12 icons stay crisp and uniform. */}
              {pop === "emoji" && (
                <div style={{ ...popover, right: 0, width: 150 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, padding: "0 1px" }}>
                    <span style={{ fontSize: 11, color: "#000" }}>Insert emoji</span>
                    <span style={{ fontSize: 10, color: "#555" }}>classic smileys</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2, background: "#fff", boxShadow: "inset 1px 1px 0 #808080, inset -1px -1px 0 #fff", padding: 4 }}>
                    {EMOJIS.map((e) => (
                      <div key={e.file} onMouseDown={hold} onClick={() => insertEmoji(e.file)} title={e.label} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 24, cursor: "pointer" }}>
                        <img src={emojiUrl(e.file)} alt={e.label} style={{ width: 12, height: 12, imageRendering: "pixelated" }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Editor */}
            <div
              id="gb-editor"
              ref={editorRef}
              suppressContentEditableWarning
              data-ph="Say something nice..."
              onInput={syncText}
              contentEditable={true}
              style={{ minHeight: 88, maxHeight: 170, overflowY: "auto", background: "#fff", padding: "6px 8px", fontSize: 14, lineHeight: 1.5, color: "#000", outline: "none", boxShadow: SUNKEN, wordBreak: "break-word" }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9 }}>
              <button
                onClick={send}
                disabled={!canSend}
                style={{
                  height: 26, minWidth: 78, padding: "0 14px", background: "#c0c0c0",
                  border: "2px solid", borderColor: "#fff #808080 #808080 #fff",
                  boxShadow: "inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #404040",
                  fontFamily: "'W95FA', Tahoma, sans-serif", fontSize: 14,
                  color: canSend ? "#000" : "#808080", cursor: canSend ? "pointer" : "default",
                }}
              >{sending ? "Signing…" : "Sign it!"}</button>
              {justSent && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#0a6b2e" }}>
                  <img src={HEART_ICON} alt="" style={{ width: 20, height: 20, imageRendering: "pixelated" }} /> Thanks for signing!
                </span>
              )}
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: "#555" }}>
              {"Select text, then use the toolbar for bold, italics, size, color, links & emoji."}
            </div>
          </div>

          <div style={{ height: 2, background: "#808080", borderBottom: "1px solid #fff", margin: "4px 0 10px" }} />

          {/* Results */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "24px 12px", fontSize: 13, color: "#555" }}>Loading…</div>
          ) : total === 0 ? (
            <div style={{ background: "#fff", boxShadow: RAISED, padding: "26px 18px", textAlign: "center" }}>
              <img src={SMILEY_ICON} alt="" style={{ width: 24, height: 24, imageRendering: "pixelated" }} />
              <div style={{ fontSize: 15, fontWeight: "bold", color: "#000", marginTop: 8 }}>No messages yet!</div>
              <div style={{ fontSize: 13, color: "#555", marginTop: 5, lineHeight: 1.5 }}>
                {"Be the first to sign the guestbook. Say something nice above."}
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "#000", flexWrap: "wrap", gap: 6 }}>
                <span>Page {cur} of {pages} ({total} message{total === 1 ? "" : "s"})</span>
                <span style={{ display: "flex", alignItems: "center" }}>{pageNums}</span>
              </div>
              <div>
                {shown.map((e) => (
                  <div key={e.id} style={{ background: "#fff", boxShadow: RAISED, padding: "9px 11px", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: "bold", color: "#000080" }}>{e.name}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "#808080", whiteSpace: "nowrap", flexShrink: 0 }}>{fmtWhen(e.created_at)}</span>
                      {isAdmin && (
                        <button onClick={() => setConfirmDelete(e.id)} title="Delete this entry" style={{ ...smallBtn, height: 18, padding: "0 6px", fontSize: 11, color: "#a00", flexShrink: 0 }}>Delete</button>
                      )}
                    </div>
                    {(e.location || e.website) && (
                      <div style={{ fontSize: 12, marginBottom: 5, display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2px 12px" }}>
                        {e.location && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <PinIcon />
                            <a href={"https://www.openstreetmap.org/search?query=" + encodeURIComponent(e.location)} target="_blank" rel="noreferrer" title="Find on map" style={{ color: "#0000ee" }}>{e.location}</a>
                          </span>
                        )}
                        {e.website && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <span style={{ fontWeight: "bold", color: "#000" }}>Website:</span>
                            <a href={normUrl(e.website)} target="_blank" rel="noreferrer" style={{ color: "#0000ee" }}>{e.website}</a>
                          </span>
                        )}
                      </div>
                    )}
                    <div className="gb-body" style={{ fontSize: 14, lineHeight: 1.55, color: "#000", wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(e.html) }} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div style={{ flex: "none", display: "flex", gap: 3, padding: 2 }}>
        <div style={{ flex: 1, boxShadow: "inset 1px 1px 0 #808080, inset -1px -1px 0 #fff", padding: "2px 8px", fontSize: 12, color: "#000", display: "flex", alignItems: "center" }}>
          {total} message{total === 1 ? "" : "s"} signed
        </div>
        <div style={{ width: 160, boxShadow: "inset 1px 1px 0 #808080, inset -1px -1px 0 #fff", padding: "2px 8px", fontSize: 12, color: "#000", display: "flex", alignItems: "center", gap: 5 }}>
          <img src="/assets/shared/icon-ie.png" alt="" style={{ width: 14, height: 14, imageRendering: "pixelated" }} /> jacklhe.com
        </div>
      </div>

      {/* Error dialog */}
      {error && (
        <div style={overlayStyle}>
          <div style={{ ...dialogStyle, width: 300 }}>
            <div style={dlgTitle}>Guestbook</div>
            <div style={{ display: "flex", gap: 12, padding: "14px 14px 8px", alignItems: "flex-start" }}>
              <img src="/assets/shared/info-icon.png" alt="" style={{ width: 32, height: 32, imageRendering: "pixelated", flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: "#000", lineHeight: 1.4 }}>{error}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", paddingBottom: 12 }}>
              <button onClick={() => setError("")} style={dlgBtn}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin login dialog (revealed by ?admin) */}
      {showLogin && (
        <div style={overlayStyle}>
          <div style={{ ...dialogStyle, width: 300 }}>
            <div style={dlgTitle}>Admin login</div>
            <div style={{ padding: "12px 14px 6px" }}>
              <label style={labelStyle}>Email:</label>
              <input type="email" autoComplete="username" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} style={inputStyle} />
              <label style={{ ...labelStyle, margin: "9px 0 3px" }}>Password:</label>
              <input type="password" autoComplete="current-password" value={loginPw}
                onChange={(e) => setLoginPw(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") doLogin(); }}
                style={inputStyle} />
              {loginError && <div style={{ marginTop: 8, fontSize: 12, color: "#a00" }}>{loginError}</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, padding: "8px 0 12px" }}>
              <button onClick={doLogin} disabled={loggingIn} style={{ ...dlgBtn, cursor: loggingIn ? "default" : "pointer" }}>{loggingIn ? "…" : "Log in"}</button>
              <button onClick={closeLogin} style={dlgBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm-delete dialog */}
      {confirmDelete != null && (
        <div style={overlayStyle}>
          <div style={{ ...dialogStyle, width: 320 }}>
            <div style={dlgTitle}>Confirm delete</div>
            <div style={{ display: "flex", gap: 12, padding: "14px 14px 8px", alignItems: "flex-start" }}>
              <img src="/assets/shared/info-icon.png" alt="" style={{ width: 32, height: 32, imageRendering: "pixelated", flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: "#000", lineHeight: 1.4 }}>Delete this entry permanently? This can't be undone.</div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, paddingBottom: 12 }}>
              <button onClick={() => doDelete(confirmDelete)} style={{ ...dlgBtn, color: "#a00" }}>Delete</button>
              <button onClick={() => setConfirmDelete(null)} style={dlgBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
