"use client";
import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw, Instagram, ExternalLink } from "lucide-react";

function fmtNum(n) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

export default function MonitoringPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/instagram/posts");
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setError("");
    setSyncMessage("");
    try {
      const res = await fetch("/api/instagram/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSyncMessage(`Synced ${data.synced} post(s) from Instagram.` + (data.note ? " " + data.note : ""));
      const refreshed = await fetch("/api/instagram/posts");
      setPosts(await refreshed.json());
    } catch (e) {
      setError("Sync failed: " + e.message);
    } finally {
      setSyncing(false);
    }
  }

  const totalReach = posts.reduce((sum, p) => sum + (p.reach || 0), 0);
  const totalEngagement = posts.reduce((sum, p) => sum + (p.likes || 0) + (p.comments || 0) + (p.saves || 0) + (p.shares || 0), 0);
  const avgEngagementRate = posts.length
    ? (posts.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / posts.filter((p) => p.engagement_rate != null).length || 0).toFixed(2)
    : "0";

  return (
    <>
      <header style={{ marginBottom: 22, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#9AA18C", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Phase 3
          </div>
          <h1 className="cp-display" style={{ fontSize: 30, fontWeight: 600, margin: 0, color: "#20281F", letterSpacing: "-0.01em" }}>
            Instagram Monitoring
          </h1>
        </div>
        <button onClick={handleSync} disabled={syncing}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 8, border: "none", background: syncing ? "#C9A79E" : "#B15140", color: "#fff", fontSize: 13, fontWeight: 500, cursor: syncing ? "default" : "pointer" }}>
          <RefreshCw size={14} className={syncing ? "cp-spin" : ""} />
          {syncing ? "Syncing…" : "Sync from Instagram"}
        </button>
      </header>

      {syncMessage && (
        <div style={{ marginBottom: 16, fontSize: 12.5, color: "#2F5C4E", background: "#E4EEEA", borderRadius: 8, padding: "8px 12px" }}>{syncMessage}</div>
      )}
      {error && (
        <div style={{ marginBottom: 16, fontSize: 12.5, color: "#8A3B2A", background: "#F5E0DC", borderRadius: 8, padding: "8px 12px" }}>{error}</div>
      )}

      {loading ? (
        <div style={{ padding: 40, color: "#7A8272" }}>Loading…</div>
      ) : posts.length === 0 ? (
        <div style={{ border: "1px dashed #C7CDBF", borderRadius: 14, padding: "50px 30px", textAlign: "center", background: "#FAF9F5" }}>
          <Instagram size={26} color="#9AA18C" style={{ marginBottom: 12 }} />
          <h3 className="cp-display" style={{ fontSize: 19, margin: "0 0 6px 0", color: "#3C4433" }}>No Instagram data yet</h3>
          <p style={{ fontSize: 13.5, color: "#7A8272", margin: "0 0 4px 0" }}>Click "Sync from Instagram" above to pull in your recent posts and their performance.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { label: "Posts synced", value: posts.length },
              { label: "Total reach", value: fmtNum(totalReach) },
              { label: "Total engagement", value: fmtNum(totalEngagement) },
              { label: "Avg engagement rate", value: avgEngagementRate + "%" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 10, padding: "10px 16px", minWidth: 120 }}>
                <div className="cp-mono" style={{ fontSize: 18, fontWeight: 500, color: "#20281F" }}>{s.value}</div>
                <div style={{ fontSize: 10.5, color: "#9AA18C", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 14, overflow: "hidden" }}>
            <div className="cp-scrollbar" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#9AA18C", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {["Date", "Type", "Caption", "Reach", "Likes", "Comments", "Saves", "Shares", "Eng. rate", ""].map((h) => (
                      <th key={h} style={{ padding: "9px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {posts.map((p) => (
                    <tr key={p.id}>
                      <td style={{ padding: "9px 14px", borderTop: "1px solid #E9EBE3", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, whiteSpace: "nowrap" }}>
                        {p.posted_at ? new Date(p.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                      </td>
                      <td style={{ padding: "9px 14px", borderTop: "1px solid #E9EBE3" }}>{p.media_type || "—"}</td>
                      <td style={{ padding: "9px 14px", borderTop: "1px solid #E9EBE3", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.caption || "—"}</td>
                      <td style={{ padding: "9px 14px", borderTop: "1px solid #E9EBE3" }}>{fmtNum(p.reach)}</td>
                      <td style={{ padding: "9px 14px", borderTop: "1px solid #E9EBE3" }}>{fmtNum(p.likes)}</td>
                      <td style={{ padding: "9px 14px", borderTop: "1px solid #E9EBE3" }}>{fmtNum(p.comments)}</td>
                      <td style={{ padding: "9px 14px", borderTop: "1px solid #E9EBE3" }}>{fmtNum(p.saves)}</td>
                      <td style={{ padding: "9px 14px", borderTop: "1px solid #E9EBE3" }}>{fmtNum(p.shares)}</td>
                      <td style={{ padding: "9px 14px", borderTop: "1px solid #E9EBE3" }}>{p.engagement_rate != null ? p.engagement_rate + "%" : "—"}</td>
                      <td style={{ padding: "9px 14px", borderTop: "1px solid #E9EBE3" }}>
                        {p.permalink && (
                          <a href={p.permalink} target="_blank" rel="noreferrer" style={{ color: "#7A8272", display: "flex" }}>
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
