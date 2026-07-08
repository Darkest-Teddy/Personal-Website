// Strict allowlist HTML sanitizer for guestbook messages.
//
// Public guestbook + rich text = XSS risk. We NEVER trust stored/submitted HTML.
// Strategy: parse the input into a detached document and rebuild a fresh tree that
// contains ONLY explicitly-allowed tags/attributes. Anything else is dropped.
// Applied on submit (before insert) AND on render (defense in depth).

import { EMOJI_DIR, EMOJI_FILES } from "./emojis.js";

// tag -> allowed attributes (besides the special handling below)
const ALLOWED = {
  B: [],
  STRONG: [],
  I: [],
  EM: [],
  U: [],
  BR: [],
  FONT: ["color"],
  SPAN: ["style"], // style is filtered to color / font-size only
  A: ["href"], // href validated to http(s); target/rel forced
  IMG: ["src", "alt"], // src validated to our own emote dir + known file
};

const HEX = /^#[0-9a-fA-F]{3,8}$/;
const NAMED_COLOR = /^[a-z]{3,20}$/i; // e.g. "red"; harmless as a CSS color token
const FONT_SIZE = /^(?:[0-9]{1,3}(?:\.[0-9]+)?px|small|medium|large|x-large|xx-large)$/i;

function isSafeColor(v) {
  const s = (v || "").trim();
  return HEX.test(s) || NAMED_COLOR.test(s);
}

// Keep only `color` and `font-size` from an inline style string.
function filterStyle(style) {
  const out = [];
  for (const decl of String(style).split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const val = decl.slice(idx + 1).trim();
    if (prop === "color" && isSafeColor(val)) out.push(`color:${val}`);
    else if (prop === "font-size" && FONT_SIZE.test(val)) out.push(`font-size:${val}`);
  }
  return out.join(";");
}

function isHttpUrl(href) {
  const s = (href || "").trim();
  // Block javascript:, data:, vbscript:, etc. Allow only http(s) and protocol-relative.
  return /^https?:\/\//i.test(s) || /^\/\//.test(s);
}

// Validate an emote img src against our own directory + known filenames.
function isAllowedEmote(src) {
  const s = (src || "").trim();
  if (!s.startsWith(EMOJI_DIR)) return false;
  const file = s.slice(EMOJI_DIR.length);
  return EMOJI_FILES.has(file);
}

function cleanNode(node, doc) {
  // Text node -> copy verbatim (textContent is inert; the browser escapes on render).
  if (node.nodeType === 3) return doc.createTextNode(node.nodeValue);
  if (node.nodeType !== 1) return null; // drop comments / everything non-element

  const tag = node.tagName.toUpperCase();
  const allowedAttrs = ALLOWED[tag];
  if (!allowedAttrs) {
    // Disallowed element: drop the element but keep its (sanitized) children,
    // so e.g. an errant <div> doesn't nuke the text inside it.
    const frag = doc.createDocumentFragment();
    for (const child of Array.from(node.childNodes)) {
      const c = cleanNode(child, doc);
      if (c) frag.appendChild(c);
    }
    return frag;
  }

  // IMG: only our own emotes survive; anything else is dropped entirely.
  if (tag === "IMG") {
    const src = node.getAttribute("src");
    if (!isAllowedEmote(src)) return null;
    const el = doc.createElement("img");
    el.setAttribute("src", src.trim());
    const alt = node.getAttribute("alt");
    if (alt) el.setAttribute("alt", alt.slice(0, 40));
    return el; // void element, no children
  }

  const el = doc.createElement(tag.toLowerCase());

  if (tag === "A") {
    const href = node.getAttribute("href");
    if (!isHttpUrl(href)) {
      // Unsafe/again missing href: drop the <a>, keep its text.
      const frag = doc.createDocumentFragment();
      for (const child of Array.from(node.childNodes)) {
        const c = cleanNode(child, doc);
        if (c) frag.appendChild(c);
      }
      return frag;
    }
    el.setAttribute("href", href.trim());
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noreferrer noopener");
  } else if (tag === "FONT") {
    const color = node.getAttribute("color");
    if (color && isSafeColor(color)) el.setAttribute("color", color.trim());
  } else if (tag === "SPAN") {
    const style = filterStyle(node.getAttribute("style") || "");
    if (style) el.setAttribute("style", style);
  }

  for (const child of Array.from(node.childNodes)) {
    const c = cleanNode(child, doc);
    if (c) el.appendChild(c);
  }
  return el;
}

// Returns sanitized HTML string safe to store and to render via dangerouslySetInnerHTML.
export function sanitizeHtml(dirty) {
  if (!dirty) return "";
  const doc = document.implementation.createHTMLDocument("gb");
  const container = doc.createElement("div");
  container.innerHTML = String(dirty);

  const clean = doc.createElement("div");
  for (const child of Array.from(container.childNodes)) {
    const c = cleanNode(child, doc);
    if (c) clean.appendChild(c);
  }
  return clean.innerHTML;
}

// Plain visible text (for length checks, profanity scan, emptiness test).
export function htmlToText(html) {
  if (!html) return "";
  const doc = document.implementation.createHTMLDocument("gb");
  const div = doc.createElement("div");
  div.innerHTML = String(html);
  return (div.textContent || "").trim();
}

// True if the message has neither visible text nor an emote image.
export function isEmptyMessage(html) {
  if (!html) return true;
  if (htmlToText(html)) return false;
  const doc = document.implementation.createHTMLDocument("gb");
  const div = doc.createElement("div");
  div.innerHTML = String(html);
  return !div.querySelector("img");
}
