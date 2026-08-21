"use client";
import React, { useEffect, useState } from "react";
import { RefreshCw, Instagram, ExternalLink, Users, Clock } from "lucide-react";

function fmtNum(n) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 === 0 ? 12 : i % 12;
  return `${h}${i < 12 ? "am" : "pm"}`;
});

export default function MonitoringPage() {
  const [tab, setTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [audience, setAudience] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [audienceSyncing, setAudienceSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [audienceMessage, setAudienceMessage] = useState("");
  const [error, setError] = useState("");
  const [audienceError, setAudienceError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [postsRes, audienceRes] = await Promise.all([
        fetch("/api/instagram/posts"),
        fetch("/api/instagram/audience"),
      ]);
      setPosts(await postsRes.json());
      setAudience(await audienceRes.json());
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

  async function handleAudienceSync() {
    setAudienceSyncing(true);
    setAudienceError("");
    setAudienceMessage("");
    try {
      const res = await fetch("/api/instagram/audience-sync", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAudienceMessage(data.note || "Audience insights updated.");
      setAudience(data);
    } catch (e) {
      setAudienceError("Sync failed: " + e.message);
    } finally {
      setAudienceSyncing(false);
    }
  }

  const totalReach = posts.reduce((sum, p) => sum + (p.reach || 0), 0);
  const totalEngagement = posts.reduce((sum, p) => sum + (p.likes || 0) + (p.comments || 0) + (p.saves || 0) + (p.shares || 0), 0);
  const avgEngagementRate = posts.length
    ? (posts.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / posts.filter((p) => p.engagement_rate != null).length || 0).toFixed(2)
    : "0";

  return (
    <>
      <header style={{ marginBottom: 18, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#9AA18C", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Phase 3
          </div>
          <h1 className="cp-display" style={{ fontSize: 30, fontWeight: 600, margin: 0, color: "#20281F", letterSpacing: "-0.01em" }}>
            Instagram Monitoring
          </h1>
        </div>
        {tab === "posts" ? (
          <button onClick={handleSync} disabled={syncing}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 8, border: "none", background: syncing ? "#C9A79E" : "#B15140", color: "#fff", fontSize: 13, fontWeight: 500, cursor: syncing ? "default" : "pointer" }}>
            <RefreshCw size={14} className={syncing ? "cp-spin" : ""} />
            {syncing ? "Syncing…" : "Sync from Instagram"}
          </button>
        ) : (
          <button onClick={handleAudienceSync} disabled={audienceSyncing}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 8, border: "none", background: audienceSyncing ? "#C9A79E" : "#B15140", color: "#fff", fontSize: 13, fontWeight: 500, cursor: audienceSyncing ? "default" : "pointer" }}>
            <RefreshCw size={14} className={audienceSyncing ? "cp-spin" : ""} />
            {audienceSyncing ? "Fetching…" : "Refresh audience data"}
          </button>
        )}
      </header>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[
          { key: "posts", label: "Post performance", icon: Instagram },
          { key: "audience", label: "Audience insights", icon: Users },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 20, border: "1px solid #DEE2D6", background: active ? "#20281F" : "#fff", color: active ? "#F5F4EF" : "#40473A", fontSize: 12.5, cursor: "pointer" }}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "posts" && (
        <>
          {syncMessage && <div style={{ marginBottom: 16, fontSize: 12.5, color: "#2F5C4E", background: "#E4EEEA", borderRadius: 8, padding: "8px 12px" }}>{syncMessage}</div>}
          {error && <div style={{ marginBottom: 16, fontSize: 12.5, color: "#8A3B2A", background: "#F5E0DC", borderRadius: 8, padding: "8px 12px" }}>{error}</div>}

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
      )}

      {tab === "audience" && (
        <AudienceTab audience={audience} loading={loading} message={audienceMessage} error={audienceError} />
      )}
    </>
  );
}

function AudienceTab({ audience, loading, message, error }) {
  if (loading) return <div style={{ padding: 40, color: "#7A8272" }}>Loading…</div>;

  return (
    <>
      {message && <div style={{ marginBottom: 16, fontSize: 12.5, color: "#5C6650", background: "#F5E9D4", borderRadius: 8, padding: "8px 12px" }}>{message}</div>}
      {error && <div style={{ marginBottom: 16, fontSize: 12.5, color: "#8A3B2A", background: "#F5E0DC", borderRadius: 8, padding: "8px 12px" }}>{error}</div>}

      {!audience ? (
        <div style={{ border: "1px dashed #C7CDBF", borderRadius: 14, padding: "50px 30px", textAlign: "center", background: "#FAF9F5" }}>
          <Users size={26} color="#9AA18C" style={{ marginBottom: 12 }} />
          <h3 className="cp-display" style={{ fontSize: 19, margin: "0 0 6px 0", color: "#3C4433" }}>No audience data yet</h3>
          <p style={{ fontSize: 13.5, color: "#7A8272", margin: 0 }}>Click "Refresh audience data" above to pull in your followers' age, gender, location, and active hours.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <DistributionCard title="Age distribution" data={audience.age_distribution} />
          <DistributionCard title="Gender distribution" data={audience.gender_distribution} />
          <DistributionCard title="Top locations (city)" data={audience.top_cities} limit={6} />
          <DistributionCard title="Top locations (country)" data={audience.top_countries} limit={6} />
          <div style={{ gridColumn: "span 2" }}>
            <PeakHoursCard peakHours={audience.peak_hours} />
          </div>
        </div>
      )}
    </>
  );
}

function DistributionCard({ title, data, limit }) {
  const hasData = data && data.length > 0;
  const rows = hasData ? (limit ? [...data].sort((a, b) => b.value - a.value).slice(0, limit) : data) : [];
  const max = hasData ? Math.max(...rows.map((r) => r.value)) : 0;

  return (
    <div style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 14, padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: "#3C4433", marginBottom: 12 }}>{title}</div>
      {!hasData ? (
        <div style={{ fontSize: 12.5, color: "#9AA18C" }}>Not available for this account yet.</div>
      ) : (
        rows.map((r, i) => {
          const label = (r.dimension_values || []).join(", ") || "Unknown";
          const pct = max ? Math.round((r.value / max) * 100) : 0;
          return (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#5C6650", marginBottom: 3 }}>
                <span>{label}</span><span>{r.value.toLocaleString()}</span>
              </div>
              <div style={{ height: 6, background: "#E9EBE3", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "#B15140", borderRadius: 4 }} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function PeakHoursCard({ peakHours }) {
  const hasData = peakHours && Object.keys(peakHours).length > 0;
  let topHour = null;
  let max = 0;

  const hourly = HOUR_LABELS.map((label, i) => {
    const value = hasData ? (peakHours[String(i)] || 0) : 0;
    if (value > max) { max = value; topHour = label; }
    return { hour: i, label, value };
  });

  return (
    <div style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#3C4433", marginBottom: 4 }}>
        <Clock size={15} /> When your audience is online
      </div>
      {!hasData ? (
        <div style={{ fontSize: 12.5, color: "#9AA18C", marginTop: 8 }}>Not available for this account yet.</div>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: "#5C6650", marginBottom: 14 }}>
            Peak hour: <strong style={{ color: "#B15140" }}>{topHour}</strong>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 90 }}>
            {hourly.map((h) => (
              <div key={h.hour} title={`${h.label}: ${h.value}`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                <div style={{
                  width: "100%",
                  height: max ? `${Math.max(3, (h.value / max) * 100)}%` : "3%",
                  background: h.label === topHour ? "#B15140" : "#DDBFAF",
                  borderRadius: "2px 2px 0 0",
                }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#9AA18C", marginTop: 4 }}>
            <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
          </div>
        </>
      )}
    </div>
  );
}
