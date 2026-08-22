"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Layers, Instagram as InstagramIcon } from "lucide-react";

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const cRes = await fetch(`/api/campaigns?t=${Date.now()}`, { cache: "no-store" });
      const cData = await cRes.json();
      const campaignsList = Array.isArray(cData) ? cData : [];
      setCampaigns(campaignsList);

      const allItems = [];
      for (const c of campaignsList) {
        const iRes = await fetch(`/api/content-plans?campaign_id=${c.id}&t=${Date.now()}`, { cache: "no-store" });
        const iData = await iRes.json();
        if (Array.isArray(iData)) allItems.push(...iData.map((it) => ({ ...it, campaignName: c.name })));
      }
      setItems(allItems);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div style={{ padding: 40, color: "#7A8272" }}>Loading…</div>;

  const planned = items.filter((i) => i.status === "Planned").length;
  const published = items.filter((i) => i.status === "Published").length;

  const byPlatform = {};
  const byPillar = {};
  items.forEach((i) => {
    byPlatform[i.platform] = (byPlatform[i.platform] || 0) + 1;
    byPillar[i.pillar] = (byPillar[i.pillar] || 0) + 1;
  });

  const upcoming = [...items]
    .filter((i) => new Date(i.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(0, 5);

  const stats = [
    { label: "Total campaigns", value: campaigns.length },
    { label: "Planned content", value: planned },
    { label: "Published content", value: published },
    { label: "Total content items", value: items.length },
  ];

  return (
    <>
      <header style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#9AA18C", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Overview
        </div>
        <h1 className="cp-display" style={{ fontSize: 30, fontWeight: 600, margin: 0, color: "#20281F", letterSpacing: "-0.01em" }}>Dashboard</h1>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 12, padding: "16px 18px" }}>
            <div className="cp-display" style={{ fontSize: 26, fontWeight: 600, color: "#20281F" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#9AA18C", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <div style={{ border: "1px dashed #C7CDBF", borderRadius: 14, padding: "50px 30px", textAlign: "center", background: "#FAF9F5" }}>
          <Calendar size={26} color="#9AA18C" style={{ marginBottom: 12 }} />
          <h3 className="cp-display" style={{ fontSize: 19, margin: "0 0 6px 0", color: "#3C4433" }}>No campaigns yet</h3>
          <p style={{ fontSize: 13.5, color: "#7A8272", margin: "0 0 18px 0" }}>Create your first campaign in the Content Planner.</p>
          <Link href="/planner" style={{ display: "inline-block", padding: "9px 16px", borderRadius: 8, background: "#20281F", color: "#F5F4EF", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
            Go to Content Planner
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
          <div style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#3C4433", marginBottom: 14 }}>
              <Layers size={15} /> Upcoming content
            </div>
            {upcoming.length === 0 ? (
              <div style={{ fontSize: 13, color: "#9AA18C" }}>Nothing scheduled ahead.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {upcoming.map((i) => (
                  <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid #E9EBE3", paddingBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 500, color: "#20281F" }}>{i.topic}</div>
                      <div style={{ fontSize: 11.5, color: "#9AA18C" }}>{i.campaignName} · {i.pillar}</div>
                    </div>
                    <div className="cp-mono" style={{ fontSize: 12, color: "#7A8272" }}>{i.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#3C4433", marginBottom: 12 }}>Content by platform</div>
              {Object.entries(byPlatform).map(([k, v]) => (
                <BarRow key={k} label={k} value={v} max={items.length} />
              ))}
            </div>
            <div style={{ background: "#FAF9F5", border: "1px solid #DEE2D6", borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#3C4433", marginBottom: 12 }}>Content by pillar</div>
              {Object.entries(byPillar).map(([k, v]) => (
                <BarRow key={k} label={k} value={v} max={items.length} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BarRow({ label, value, max }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#5C6650", marginBottom: 3 }}>
        <span>{label}</span><span>{value}</span>
      </div>
      <div style={{ height: 6, background: "#E9EBE3", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#B15140", borderRadius: 4 }} />
      </div>
    </div>
  );
}
