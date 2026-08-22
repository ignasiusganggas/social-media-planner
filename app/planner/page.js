"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Trash2, Calendar, Layers, Sparkles, Pencil, X, Check, XCircle } from "lucide-react";

const PILLAR_PALETTE = [
  { bg: "#E4EEEA", fg: "#2F5C4E", dot: "#3E7C74" },
  { bg: "#F5E9D4", fg: "#8A5A17", dot: "#C98A2B" },
  { bg: "#EFE1EA", fg: "#6B3B5D", dot: "#7A4C6E" },
  { bg: "#E9EFE0", fg: "#4A5F38", dot: "#6B8F5C" },
  { bg: "#E9E4F5", fg: "#4C3F7A", dot: "#6B5CA8" },
  { bg: "#F5E0DC", fg: "#8A3B2A", dot: "#B15140" },
];
const FORMATS = ["Reel", "Carousel", "Static Image", "Story"];
const OBJECTIVES = ["Awareness", "Engagement", "Conversion", "Education"];
const STATUSES = ["Planned", "Drafting", "Ready", "Published"];

function pillarStyle(pillar, pillars) {
  const idx = Math.max(0, pillars.indexOf(pillar));
  return PILLAR_PALETTE[idx % PILLAR_PALETTE.length];
}
function computeDates(start, end, perWeek) {
  if (!start || !end || !perWeek) return [];
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  if (isNaN(startDate) || isNaN(endDate) || endDate < startDate) return [];
  const weekdaySlots = {
    1: [3], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6],
  };
  const slots = weekdaySlots[Math.min(7, Math.max(1, perWeek))] || [1, 3, 5];
  const dates = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    if (slots.includes(cursor.getDay())) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
function formatDate(d) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function isoDate(d) { return d.toISOString().slice(0, 10); }

const inputStyle = { width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: 7, border: "1px solid #DEE2D6", background: "#fff", fontSize: 13.5, color: "#20281F" };

function Field({ label, children, span }) {
  return (
    <div style={{ gridColumn: span ? "span 2" : "span 1" }}>
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "#5C6650", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

export default function PlannerPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [genError, setGenError] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const [pillarDraft, setPillarDraft] = useState("");
  const [form, setForm] = useState({
    name: "", objective: "", audience: "", start: "", end: "",
    platform: "Instagram", frequency: 4,
    pillars: ["Destination", "Culture", "Food", "Travel Tips"], notes: "",
  });

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId) || null;

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/campaigns?t=${Date.now()}`, { cache: "no-store" });
    const data = await res.json();
    setCampaigns(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  useEffect(() => {
    if (!activeCampaignId) { setItems([]); return; }
    fetch(`/api/content-plans?campaign_id=${activeCampaignId}&t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []));
  }, [activeCampaignId]);

  function addPillar() {
    const v = pillarDraft.trim();
    if (!v || form.pillars.includes(v)) return;
    setForm({ ...form, pillars: [...form.pillars, v] });
    setPillarDraft("");
  }
  function removePillar(p) { setForm({ ...form, pillars: form.pillars.filter((x) => x !== p) }); }

  async function handleGenerate() {
    setGenError("");
    if (!form.name || !form.start || !form.end || form.pillars.length === 0) {
      setGenError("Please fill in the campaign name, dates, and at least one content pillar first.");
      return;
    }
    setGenerating(true);
    const dates = computeDates(form.start, form.end, Number(form.frequency));
    if (dates.length === 0) {
      setGenError("No posting dates fall in that date range with that frequency. Try widening the range.");
      setGenerating(false);
      return;
    }
    const slots = dates.map((d, i) => ({ date: isoDate(d), pillar: form.pillars[i % form.pillars.length] }));

    try {
      // 1. Save the campaign
      const campaignRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, objective: form.objective, audience: form.audience,
          start_date: form.start, end_date: form.end, platform: form.platform,
          frequency: Number(form.frequency), notes: form.notes,
        }),
      });
      const campaign = await campaignRes.json();
      if (campaign.error) throw new Error(campaign.error);

      // 2. Ask the AI to generate content ideas
      const genRes = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign: form, slots }),
      });
      const generated = await genRes.json();
      if (generated.error) throw new Error(generated.error);

      // 3. Save the generated content items
      const rows = generated.map((g) => ({
        campaign_id: campaign.id, date: g.date, platform: form.platform,
        pillar: g.pillar, topic: g.topic, format: g.format, objective: g.objective, status: "Planned",
      }));
      const savedRes = await fetch("/api/content-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      });
      const saved = await savedRes.json();

      setCampaigns((prev) => [campaign, ...prev]);
      setActiveCampaignId(campaign.id);
      setItems(Array.isArray(saved) ? saved : []);
      setShowForm(false);
    } catch (e) {
      setGenError("Something went wrong generating the plan: " + e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function updateItem(itemId, patch) {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, ...patch } : it)));
    await fetch(`/api/content-plans/${itemId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
  }
  async function deleteItem(itemId) {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    await fetch(`/api/content-plans/${itemId}`, { method: "DELETE" });
  }
  async function deleteCampaign(campaignId, campaignName) {
    const confirmed = window.confirm(
      `Delete "${campaignName}"? This will also permanently delete all of its content plan items. This cannot be undone.`
    );
    if (!confirmed) return;

    await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });
    setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    if (activeCampaignId === campaignId) {
      setActiveCampaignId(null);
      setItems([]);
      setShowForm(true);
    }
  }

  async function addManualItem() {
    if (!activeCampaign) return;
    const res = await fetch("/api/content-plans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_id: activeCampaign.id, date: activeCampaign.start_date || isoDate(new Date()),
        platform: activeCampaign.platform, pillar: "General", topic: "New content idea",
        format: "Reel", objective: "Awareness", status: "Planned",
      }),
    });
    const created = await res.json();
    const newItem = Array.isArray(created) ? created[0] : created;
    setItems((prev) => [...prev, newItem]);
    setEditingRow(newItem.id);
  }

  const sortedItems = useMemo(() => [...items].sort((a, b) => (a.date > b.date ? 1 : -1)), [items]);
  const campaignPillars = form.pillars;

  if (loading) return <div style={{ padding: 40, color: "#7A8272" }}>Loading…</div>;

  return (
    <>
      <header style={{ marginBottom: 22, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#9AA18C", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Content Planner
          </div>
          <h1 className="cp-display" style={{ fontSize: 30, fontWeight: 600, margin: 0, color: "#20281F", letterSpacing: "-0.01em" }}>
            {activeCampaign ? activeCampaign.name : "Plan a campaign"}
          </h1>
        </div>
        <button onClick={() => setShowForm((s) => !s)}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 8, border: "1px solid #20281F", background: showForm ? "#20281F" : "transparent", color: showForm ? "#F5F4EF" : "#20281F", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <Plus size={15} /> {activeCampaign ? "New campaign" : "Campaign details"}
        </button>
      </header>

      {campaigns.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {campaigns.map((c) => (
            <div key={c.id} style={{ display: "inline-flex", alignItems: "center", borderRadius: 20, border: "1px solid #DEE2D6", background: c.id === activeCampaignId ? "#20281F" : "#fff", overflow: "hidden" }}>
              <button onClick={() => { setActiveCampaignId(c.id); setShowForm(false); }}
                style={{ padding: "6px 6px 6px 12px", border: "none", background: "transparent", color: c.id === activeCampaignId ? "#F5F4EF" : "#40473A", fontSize: 12.5, cursor: "pointer" }}>
                {c.name}
              </button>
              <button onClick={() => deleteCampaign(c.id, c.name)} title="Delete campaign"
                style={{ padding: "6px 10px 6px 4px", border: "none", background: "transparent", color: c.id === activeCampaignId ? "#C9A79E" : "#B15140", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <XCircle size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 14, padding: 24, marginBottom: 26 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Campaign name" span>
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Korea Festival 2026" />
            </Field>
            <Field label="Objective" span>
              <input style={inputStyle} value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="e.g. Promote Korea tourism" />
            </Field>
            <Field label="Target audience">
              <input style={inputStyle} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="e.g. Young Indonesian travelers" />
            </Field>
            <Field label="Platform">
              <select style={inputStyle} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                <option>Instagram</option><option>TikTok</option><option>Facebook</option><option>Multi-platform</option>
              </select>
            </Field>
            <Field label="Start date"><input type="date" style={inputStyle} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
            <Field label="End date"><input type="date" style={inputStyle} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
            <Field label="Posting frequency (per week)">
              <input type="number" min={1} max={7} style={inputStyle} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} />
            </Field>
            <Field label="Additional notes">
              <input style={inputStyle} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
            </Field>
            <Field label="Content pillars" span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {form.pillars.map((p, i) => {
                  const s = PILLAR_PALETTE[i % PILLAR_PALETTE.length];
                  return (
                    <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: s.bg, color: s.fg, borderRadius: 20, padding: "4px 6px 4px 10px", fontSize: 12.5, fontWeight: 500 }}>
                      {p}
                      <button onClick={() => removePillar(p)} style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", color: s.fg, opacity: 0.7 }}><X size={12} /></button>
                    </span>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={pillarDraft} onChange={(e) => setPillarDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPillar())} placeholder="Add a pillar, e.g. Food" />
                <button onClick={addPillar} style={{ padding: "0 14px", borderRadius: 7, border: "1px solid #DEE2D6", background: "#fff", cursor: "pointer", color: "#20281F" }}>Add</button>
              </div>
            </Field>
          </div>
          {genError && <div style={{ marginTop: 14, fontSize: 12.5, color: "#8A3B2A", background: "#F5E0DC", borderRadius: 8, padding: "8px 12px" }}>{genError}</div>}
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleGenerate} disabled={generating}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, border: "none", background: generating ? "#C9A79E" : "#B15140", color: "#fff", fontSize: 13.5, fontWeight: 500, cursor: generating ? "default" : "pointer" }}>
              <Sparkles size={15} /> {generating ? "Generating content plan…" : "Generate content plan"}
            </button>
          </div>
        </div>
      )}

      {!showForm && activeCampaign && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { label: "Platform", value: activeCampaign.platform },
              { label: "Posts planned", value: sortedItems.length },
              { label: "Frequency", value: `${activeCampaign.frequency}/wk` },
            ].map((s) => (
              <div key={s.label} style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 10, padding: "10px 16px", minWidth: 100 }}>
                <div className="cp-mono" style={{ fontSize: 18, fontWeight: 500, color: "#20281F" }}>{s.value}</div>
                <div style={{ fontSize: 10.5, color: "#9AA18C", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #DEE2D6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#3C4433" }}>
                <Layers size={15} /> Content calendar
              </div>
              <button onClick={addManualItem} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, border: "1px solid #DEE2D6", background: "#fff", borderRadius: 7, padding: "6px 10px", cursor: "pointer", color: "#20281F" }}>
                <Plus size={13} /> Add item
              </button>
            </div>
            {sortedItems.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#9AA18C", fontSize: 13 }}>No content items yet.</div>
            ) : (
              <div className="cp-scrollbar" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#9AA18C", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {["Date", "Platform", "Pillar", "Topic", "Format", "Objective", "Status", ""].map((h) => (
                        <th key={h} style={{ padding: "9px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((item) => (
                      <Row key={item.id} item={item} pillars={campaignPillars} isEditing={editingRow === item.id}
                        onEdit={() => setEditingRow(item.id)} onDone={() => setEditingRow(null)}
                        updateItem={updateItem} deleteItem={deleteItem} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!showForm && !activeCampaign && (
        <div style={{ marginTop: 30, border: "1px dashed #C7CDBF", borderRadius: 14, padding: "50px 30px", textAlign: "center", background: "#FAF9F5" }}>
          <Calendar size={26} color="#9AA18C" style={{ marginBottom: 12 }} />
          <h3 className="cp-display" style={{ fontSize: 19, margin: "0 0 6px 0", color: "#3C4433" }}>No campaign yet</h3>
          <p style={{ fontSize: 13.5, color: "#7A8272", margin: "0 0 18px 0" }}>Fill in your campaign details and pillars, then generate a content calendar.</p>
          <button onClick={() => setShowForm(true)} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#20281F", color: "#F5F4EF", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            Start a campaign
          </button>
        </div>
      )}
    </>
  );
}

function Row({ item, pillars, isEditing, onEdit, onDone, updateItem, deleteItem }) {
  const style = pillarStyle(item.pillar, pillars.length ? pillars : [item.pillar]);
  const d = new Date(item.date + "T00:00:00");
  const cellStyle = { padding: "9px 14px", borderTop: "1px solid #E9EBE3", verticalAlign: "middle" };

  if (isEditing) {
    return (
      <tr style={{ background: "#F3F1E9" }}>
        <td style={cellStyle}><input type="date" style={{ ...inputStyle, padding: "5px 7px" }} value={item.date} onChange={(e) => updateItem(item.id, { date: e.target.value })} /></td>
        <td style={cellStyle}><input style={{ ...inputStyle, padding: "5px 7px", width: 100 }} value={item.platform || ""} onChange={(e) => updateItem(item.id, { platform: e.target.value })} /></td>
        <td style={cellStyle}><input style={{ ...inputStyle, padding: "5px 7px", width: 110 }} value={item.pillar || ""} onChange={(e) => updateItem(item.id, { pillar: e.target.value })} /></td>
        <td style={cellStyle}><input style={{ ...inputStyle, padding: "5px 7px", minWidth: 180 }} value={item.topic || ""} onChange={(e) => updateItem(item.id, { topic: e.target.value })} /></td>
        <td style={cellStyle}>
          <select style={{ ...inputStyle, padding: "5px 7px" }} value={item.format} onChange={(e) => updateItem(item.id, { format: e.target.value })}>
            {FORMATS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </td>
        <td style={cellStyle}>
          <select style={{ ...inputStyle, padding: "5px 7px" }} value={item.objective} onChange={(e) => updateItem(item.id, { objective: e.target.value })}>
            {OBJECTIVES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </td>
        <td style={cellStyle}>
          <select style={{ ...inputStyle, padding: "5px 7px" }} value={item.status} onChange={(e) => updateItem(item.id, { status: e.target.value })}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </td>
        <td style={cellStyle}>
          <button onClick={onDone} style={{ border: "none", background: "#20281F", color: "#fff", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex" }}><Check size={13} /></button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td style={{ ...cellStyle, whiteSpace: "nowrap", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{formatDate(d)}</td>
      <td style={cellStyle}>{item.platform}</td>
      <td style={cellStyle}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: style.bg, color: style.fg, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: style.dot }} /> {item.pillar}
        </span>
      </td>
      <td style={{ ...cellStyle, maxWidth: 260 }}>{item.topic}</td>
      <td style={cellStyle}>{item.format}</td>
      <td style={cellStyle}>{item.objective}</td>
      <td style={cellStyle}><StatusBadge status={item.status} /></td>
      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
        <button onClick={onEdit} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#7A8272", padding: 4 }}><Pencil size={13} /></button>
        <button onClick={() => deleteItem(item.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#B15140", padding: 4 }}><Trash2 size={13} /></button>
      </td>
    </tr>
  );
}

function StatusBadge({ status }) {
  const map = {
    Planned: { bg: "#E9EBE3", fg: "#5C6650" }, Drafting: { bg: "#F5E9D4", fg: "#8A5A17" },
    Ready: { bg: "#E4EEEA", fg: "#2F5C4E" }, Published: { bg: "#20281F", fg: "#F5F4EF" },
  };
  const s = map[status] || map.Planned;
  return <span style={{ fontSize: 11.5, fontWeight: 500, background: s.bg, color: s.fg, borderRadius: 6, padding: "3px 8px" }}>{status}</span>;
}
