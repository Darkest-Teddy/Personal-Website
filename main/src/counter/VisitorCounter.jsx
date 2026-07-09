// Windows 95 visitor counter widget. Fixed, always-on, bottom-right desktop corner.
// Real counts via Supabase (see visits.js + schema.sql); On-site is live via presence.

import { useState, useEffect } from "react";
import { recordVisit, getStats, trackPresence, isConfigured } from "./visits.js";

const SUNKEN = "inset 1px 1px 0 #808080, inset -1px -1px 0 #fff, inset 2px 2px 0 #404040, inset -2px -2px 0 #dfdfdf";

const fmt = (n) => (n == null ? "…" : Number(n).toLocaleString("en-US"));

export default function VisitorCounter() {
  const [stats, setStats] = useState(null); // { visits, unique } | null
  const [onsite, setOnsite] = useState(1);

  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;

    (async () => {
      await recordVisit();
      const s = await getStats();
      if (alive && s) setStats(s);
    })();

    // Refresh totals periodically so they tick up while the widget is on screen.
    const iv = setInterval(async () => {
      const s = await getStats();
      if (alive && s) setStats(s);
    }, 60000);

    const untrack = trackPresence((n) => { if (alive) setOnsite(n); });

    return () => { alive = false; clearInterval(iv); untrack(); };
  }, []);

  if (!isConfigured) return null;

  const rows = [
    ["Visits:", stats ? fmt(stats.visits) : "…"],
    ["Unique Visitors:", stats ? fmt(stats.unique) : "…"],
    ["On-site:", fmt(onsite)],
  ];

  return (
    <div
      style={{
        position: "fixed", right: 10, bottom: 42, zIndex: 5, width: 198,
        background: "#c0c0c0", border: "2px solid", borderColor: "#dfdfdf #404040 #404040 #dfdfdf",
        boxShadow: "2px 2px 0 rgba(0,0,0,.35)", padding: 5,
        fontFamily: "'W95FA', Tahoma, sans-serif", userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: "bold", color: "#000", padding: "0 1px 6px" }}>
        <img src="/assets/shared/viewers-icon.png" alt="" style={{ height: 26, width: "auto", imageRendering: "pixelated" }} />
        Visitors
      </div>
      {rows.map(([label, val], i) => (
        <div
          key={label}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: i < rows.length - 1 ? 4 : 0 }}
        >
          <span style={{ fontSize: 12, color: "#000" }}>{label}</span>
          <span style={{ minWidth: 64, textAlign: "right", fontSize: 12, color: "#000", background: "#fff", boxShadow: SUNKEN, padding: "1px 6px" }}>{val}</span>
        </div>
      ))}
    </div>
  );
}
