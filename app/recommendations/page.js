"use client";
import React, { useEffect, useState } from "react";
import { Lightbulb, Sparkles, Trash2, Layers, Grid3x3, Calendar, TrendingUp } from "lucide-react";

const inputStyle = { padding: "9px 11px", borderRadius: 7, border: "1px solid #DEE2D6", background: "#fff", fontSize: 13.5, color: "#20281F" };

function isoDate(d) { return d.toISOString().slice(0, 10); }
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function fmtLabel(item) {
  return `${item.period_start} → ${item.period_end}`;
}

export default function RecommendationsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [reports, setReports] = useState([]);
  const [reportId, setReportId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [frequency, setFrequency] = useState(4);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [rec, setRec] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/campaigns", { cache: "no-store" }).then((r) => r.json()).then((data) => {
      const list = Array.isArray(data) ? data : [];
      setCampaigns(list);
      if (list.length > 0) setCampaignId(list[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!campaignId) return;
    fetch(`/api/reports?campaign_id=${campaignId}&t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const usable = (Array.isArray(data) ? data : []).filter((r) => !r.content?.insufficient_data);
        setReports(usable);
        if (usable.length > 0) {
          setReportId(usable[0].id);
          setPeriodStart(addDays(usable[0].period_end, 1));
          setPeriodEnd(addDays(usable[0].period_end, 14));
        }
      });

    fetch(`/api/recommendations?campaign_id=${campaignId}&t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setHistory(list);
        setRec(list.length > 0 ? list[0] : null);
      });
  }, [campaignId]);

  async function handleGenerate() {
    setError("");
    if (!reportId) { setError("You need at least one full report (with real data) before generating a recommendation."); return; }
    if (!periodStart || !periodEnd) { setError("Please set a date range for the next content plan."); return; }

    setGenerating(true);
    try {
      const res = await fetch("/api/generate-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId, report_id: reportId,
          period_start: periodStart, period_end: periodEnd, frequency: Number(frequency),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRec(data);
      const refreshed = await fetch(`/api/recommendations?campaign_id=${campaignId}&t=${Date.now()}`, { cache: "no-store" });
      setHistory(await refreshed.json());
    } catch (e) {
      setError("Something went wrong: " + e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this recommendation? (The content items already added to your Content Planner will stay -- this only removes the recommendation record.)");
    if (!confirmed) return;
    await fetch(`/api/recommendations/${id}`, { method: "DELETE" });
    setHistory((prev) => {
      const remaining = prev.filter((h) => h.id !== id);
      if (rec?.id === id) setRec(remaining.length > 0 ? remaining[0] : null);
      return remaining;
    });
  }

  const c = rec?.content || null;

  if (loading) return <div style={{ padding: 40, color: "#7A8272" }}>Loading…</div>;

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#9AA18C", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Phase 5
        </div>
        <h1 className="cp-display" style={{ fontSize: 30, fontWeight: 600, margin: 0, color: "#20281F", letterSpacing: "-0.01em" }}>
          AI Content Recommendations
        </h1>
      </header>

      {campaigns.length === 0 ? (
        <div style={{ border: "1px dashed #C7CDBF", borderRadius: 14, padding: "50px 30px", textAlign: "center", background: "#FAF9F5" }}>
          <p style={{ fontSize: 13.5, color: "#7A8272", margin: 0 }}>Create a campaign in the Content Planner first.</p>
        </div>
      ) : (
        <>
          <div style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 14, padding: 20, marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "#5C6650", marginBottom: 5 }}>Campaign</label>
              <select style={inputStyle} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "#5C6650", marginBottom: 5 }}>Base on report</label>
              <select style={inputStyle} value={reportId} onChange={(e) => setReportId(e.target.value)} disabled={reports.length === 0}>
                {reports.length === 0
                  ? <option>No usable reports yet</option>
                  : reports.map((r) => <option key={r.id} value={r.id}>{r.period_start} → {r.period_end}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "#5C6650", marginBottom: 5 }}>Next period start</label>
              <input type="date" style={inputStyle} value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "#5C6650", marginBottom: 5 }}>Next period end</label>
              <input type="date" style={inputStyle} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "#5C6650", marginBottom: 5 }}>Posts / week</label>
              <input type="number" min={1} max={7} style={{ ...inputStyle, width: 70 }} value={frequency} onChange={(e) => setFrequency(e.target.value)} />
            </div>
            <button onClick={handleGenerate} disabled={generating || reports.length === 0}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 8, border: "none", background: generating ? "#C9A79E" : "#B15140", color: "#fff", fontSize: 13.5, fontWeight: 500, cursor: generating ? "default" : "pointer" }}>
              <Sparkles size={15} /> {generating ? "Generating…" : "Generate next content plan"}
            </button>
          </div>

          {reports.length === 0 && (
            <div style={{ marginBottom: 16, fontSize: 12.5, color: "#5C6650", background: "#F5E9D4", borderRadius: 8, padding: "8px 12px" }}>
              You need at least one full AI report (with real matched Instagram data) before a recommendation can be generated. Head to Reports first.
            </div>
          )}
          {error && <div style={{ marginBottom: 16, fontSize: 12.5, color: "#8A3B2A", background: "#F5E0DC", borderRadius: 8, padding: "8px 12px" }}>{error}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "flex-start" }}>
            <div style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 14, padding: 16, position: "sticky", top: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 500, color: "#9AA18C", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
                <Lightbulb size={13} /> Recommendation log
              </div>
              {history.length === 0 ? (
                <div style={{ fontSize: 12, color: "#9AA18C" }}>No recommendations yet for this campaign.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {history.map((h) => {
                    const active = rec?.id === h.id;
                    return (
                      <div key={h.id} style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setRec(h)}
                          style={{ flex: 1, textAlign: "left", padding: "8px 10px", borderRadius: 7, border: "1px solid #DEE2D6", background: active ? "#20281F" : "#fff", color: active ? "#F5F4EF" : "#3C4433", cursor: "pointer", fontSize: 11.5, lineHeight: 1.4 }}>
                          {fmtLabel(h)}
                        </button>
                        <button onClick={() => handleDelete(h.id)} title="Delete"
                          style={{ border: "1px solid #DEE2D6", background: "#fff", borderRadius: 7, padding: "0 8px", cursor: "pointer", color: "#B15140" }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              {!c ? (
                <div style={{ border: "1px dashed #C7CDBF", borderRadius: 14, padding: "50px 30px", textAlign: "center", background: "#FAF9F5" }}>
                  <Lightbulb size={26} color="#9AA18C" style={{ marginBottom: 12 }} />
                  <h3 className="cp-display" style={{ fontSize: 19, margin: "0 0 6px 0", color: "#3C4433" }}>No recommendation yet</h3>
                  <p style={{ fontSize: 13.5, color: "#7A8272", margin: 0 }}>Pick a report and date range above, then generate your next content plan.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <Section title="Strategy for this period" icon={TrendingUp}>
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: "#3C4433", margin: 0 }}>{c.overall_strategy}</p>
                  </Section>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Section title="Recommended pillar mix" icon={Layers}>
                      <MixBars items={c.pillar_mix} labelKey="pillar" />
                    </Section>
                    <Section title="Recommended format mix" icon={Grid3x3}>
                      <MixBars items={c.format_mix} labelKey="format" />
                    </Section>
                  </div>

                  <Section title="Posting frequency" icon={Calendar}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#20281F", marginBottom: 6 }}>{c.frequency_recommendation}</div>
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: "#5C6650", margin: 0 }}>{c.frequency_reason}</p>
                  </Section>

                  <Section title={`Next content calendar${rec.items_added ? ` — ${rec.items_added} item(s) added to your Content Planner` : ""}`}>
                    <div className="cp-scrollbar" style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ textAlign: "left", color: "#9AA18C", fontSize: 10.5, textTransform: "uppercase" }}>
                            {["Date", "Pillar", "Topic", "Format", "Objective", "Why"].map((h) => (
                              <th key={h} style={{ padding: "6px 10px", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(c.calendar || []).map((item, i) => (
                            <tr key={i}>
                              <td style={{ padding: "8px 10px", borderTop: "1px solid #E9EBE3", whiteSpace: "nowrap", fontFamily: "'IBM Plex Mono', monospace" }}>{item.date}</td>
                              <td style={{ padding: "8px 10px", borderTop: "1px solid #E9EBE3" }}>{item.pillar}</td>
                              <td style={{ padding: "8px 10px", borderTop: "1px solid #E9EBE3", maxWidth: 220 }}>{item.topic}</td>
                              <td style={{ padding: "8px 10px", borderTop: "1px solid #E9EBE3" }}>{item.format}</td>
                              <td style={{ padding: "8px 10px", borderTop: "1px solid #E9EBE3" }}>{item.objective}</td>
                              <td style={{ padding: "8px 10px", borderTop: "1px solid #E9EBE3", maxWidth: 280, color: "#5C6650" }}>{item.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Section>
                </div>
              )}
            </div>
          </div>
        </>
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

function MixBars({ items, labelKey }) {
  if (!items || items.length === 0) return <div style={{ fontSize: 12.5, color: "#9AA18C" }}>No data.</div>;
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#3C4433", marginBottom: 3, fontWeight: 500 }}>
            <span>{item[labelKey]}</span><span>{item.percent}%</span>
          </div>
          <div style={{ height: 6, background: "#E9EBE3", borderRadius: 4, overflow: "hidden", marginBottom: 4 }}>
            <div style={{ height: "100%", width: `${item.percent}%`, background: "#B15140", borderRadius: 4 }} />
          </div>
          <p style={{ fontSize: 11.5, lineHeight: 1.5, color: "#7A8272", margin: 0 }}>{item.reason}</p>
        </div>
      ))}
    </div>
  );
}
