"use client";
import React, { useEffect, useState } from "react";
import { FileText, Sparkles, ChevronDown, TrendingUp, TrendingDown, Layers, Grid3x3 } from "lucide-react";

const inputStyle = { padding: "9px 11px", borderRadius: 7, border: "1px solid #DEE2D6", background: "#fff", fontSize: 13.5, color: "#20281F" };

function isoDate(d) { return d.toISOString().slice(0, 10); }
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

export default function ReportsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [periodType, setPeriodType] = useState("monthly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch("/api/campaigns").then((r) => r.json()).then((data) => {
      const list = Array.isArray(data) ? data : [];
      setCampaigns(list);
      if (list.length > 0) setCampaignId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!campaignId) return;
    fetch(`/api/reports?campaign_id=${campaignId}`).then((r) => r.json()).then((data) => setHistory(Array.isArray(data) ? data : []));
  }, [campaignId, report]);

  async function handleGenerate() {
    setError("");
    if (!campaignId) { setError("Please select a campaign first."); return; }

    let start, end;
    if (periodType === "weekly") { start = daysAgo(7); end = isoDate(new Date()); }
    else if (periodType === "monthly") { start = daysAgo(30); end = isoDate(new Date()); }
    else {
      if (!customStart || !customEnd) { setError("Please pick a start and end date."); return; }
      start = customStart; end = customEnd;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, period_start: start, period_end: end, period_type: periodType }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReport(data);
    } catch (e) {
      setError("Something went wrong: " + e.message);
    } finally {
      setGenerating(false);
    }
  }

  const c = report?.content || null;

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#9AA18C", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Phase 4
        </div>
        <h1 className="cp-display" style={{ fontSize: 30, fontWeight: 600, margin: 0, color: "#20281F", letterSpacing: "-0.01em" }}>
          AI Reporting
        </h1>
      </header>

      <div style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 14, padding: 20, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "#5C6650", marginBottom: 5 }}>Campaign</label>
          <select style={inputStyle} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "#5C6650", marginBottom: 5 }}>Period</label>
          <select style={inputStyle} value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
            <option value="weekly">Last 7 days</option>
            <option value="monthly">Last 30 days</option>
            <option value="custom">Custom range</option>
          </select>
        </div>
        {periodType === "custom" && (
          <>
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "#5C6650", marginBottom: 5 }}>Start</label>
              <input type="date" style={inputStyle} value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "#5C6650", marginBottom: 5 }}>End</label>
              <input type="date" style={inputStyle} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          </>
        )}
        <button onClick={handleGenerate} disabled={generating}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 8, border: "none", background: generating ? "#C9A79E" : "#B15140", color: "#fff", fontSize: 13.5, fontWeight: 500, cursor: generating ? "default" : "pointer" }}>
          <Sparkles size={15} /> {generating ? "Generating report…" : "Generate report"}
        </button>
      </div>

      {error && <div style={{ marginBottom: 16, fontSize: 12.5, color: "#8A3B2A", background: "#F5E0DC", borderRadius: 8, padding: "8px 12px" }}>{error}</div>}

      {c && c.insufficient_data && (
        <div style={{ border: "1px dashed #C7CDBF", borderRadius: 14, padding: "40px 30px", textAlign: "center", background: "#FAF9F5" }}>
          <FileText size={24} color="#9AA18C" style={{ marginBottom: 10 }} />
          <p style={{ fontSize: 13.5, color: "#5C6650", margin: 0 }}>{c.message}</p>
        </div>
      )}

      {c && !c.insufficient_data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Section title="Executive summary" icon={FileText}>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#3C4433", margin: 0 }}>{c.executive_summary}</p>
          </Section>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { label: "Total reach", value: c.overall.total_reach },
              { label: "Total likes", value: c.overall.total_likes },
              { label: "Total comments", value: c.overall.total_comments },
              { label: "Total saves", value: c.overall.total_saves },
              { label: "Avg engagement rate", value: c.overall.avg_engagement_rate + "%" },
              { label: "Posts published", value: `${c.overall.posts_published}/${c.overall.posts_planned}` },
            ].map((s) => (
              <div key={s.label} style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 10, padding: "10px 16px", minWidth: 110 }}>
                <div className="cp-mono" style={{ fontSize: 17, fontWeight: 500, color: "#20281F" }}>{s.value}</div>
                <div style={{ fontSize: 10.5, color: "#9AA18C", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <Section title="Overall performance">
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3C4433", margin: 0 }}>{c.overall_performance_narrative}</p>
          </Section>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Section title="Top performing content" icon={TrendingUp}>
              <PostList posts={c.top_posts} />
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "#5C6650", marginTop: 10 }}>{c.top_performing_narrative}</p>
            </Section>
            <Section title="Lower performing content" icon={TrendingDown}>
              <PostList posts={c.low_posts} />
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "#5C6650", marginTop: 10 }}>{c.low_performing_narrative}</p>
            </Section>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Section title="Content pillar analysis" icon={Layers}>
              <StatTable rows={c.pillar_stats} labelKey="pillar" />
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "#5C6650", marginTop: 10 }}>{c.pillar_analysis_narrative}</p>
            </Section>
            <Section title="Format analysis" icon={Grid3x3}>
              <StatTable rows={c.format_stats} labelKey="format" />
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "#5C6650", marginTop: 10 }}>{c.format_analysis_narrative}</p>
            </Section>
          </div>

          <Section title="Audience & engagement insights">
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3C4433", margin: 0 }}>{c.audience_engagement_insights}</p>
          </Section>

          <Section title="Recommendations">
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              {(c.recommendations || []).map((r, i) => (
                <li key={i} style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3C4433" }}>{r}</li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {!report && history.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12.5, color: "#9AA18C", marginBottom: 10 }}>Past reports for this campaign</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.map((h) => (
              <button key={h.id} onClick={() => setReport(h)}
                style={{ textAlign: "left", padding: "10px 14px", borderRadius: 8, border: "1px solid #DEE2D6", background: "#fff", cursor: "pointer", fontSize: 12.5, color: "#3C4433" }}>
                {h.period_start} → {h.period_end} · {h.period_type}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#3C4433", marginBottom: 12 }}>
        {Icon && <Icon size={15} />} {title}
      </div>
      {children}
    </div>
  );
}

function PostList({ posts }) {
  if (!posts || posts.length === 0) return <div style={{ fontSize: 12.5, color: "#9AA18C" }}>No data.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {posts.map((p, i) => (
        <div key={i} style={{ fontSize: 12.5, borderBottom: "1px solid #E9EBE3", paddingBottom: 6 }}>
          <div style={{ fontWeight: 500, color: "#20281F" }}>{p.topic}</div>
          <div style={{ color: "#9AA18C" }}>{p.pillar} · {p.format} · {p.engagement_rate}% engagement</div>
        </div>
      ))}
    </div>
  );
}

function StatTable({ rows, labelKey }) {
  if (!rows || rows.length === 0) return <div style={{ fontSize: 12.5, color: "#9AA18C" }}>No data.</div>;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
      <thead>
        <tr style={{ textAlign: "left", color: "#9AA18C", fontSize: 10.5, textTransform: "uppercase" }}>
          <th style={{ padding: "4px 0" }}>{labelKey}</th>
          <th style={{ padding: "4px 0" }}>Posts</th>
          <th style={{ padding: "4px 0" }}>Avg eng. rate</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td style={{ padding: "4px 0", borderTop: "1px solid #E9EBE3" }}>{r[labelKey]}</td>
            <td style={{ padding: "4px 0", borderTop: "1px solid #E9EBE3" }}>{r.post_count}</td>
            <td style={{ padding: "4px 0", borderTop: "1px solid #E9EBE3" }}>{r.avg_engagement_rate != null ? r.avg_engagement_rate + "%" : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
