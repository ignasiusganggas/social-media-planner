"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Calendar, Instagram, BarChart3, Lightbulb } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutGrid, live: true },
  { href: "/planner", label: "Content Planner", icon: Calendar, live: true },
  { href: "/monitoring", label: "Instagram Monitoring", icon: Instagram, live: false, phase: "Phase 3" },
  { href: "/reports", label: "Reports", icon: BarChart3, live: false, phase: "Phase 4" },
  { href: "/recommendations", label: "Recommendations", icon: Lightbulb, live: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{ width: 236, flexShrink: 0, background: "#FAF9F5", borderRight: "1px solid #DEE2D6", padding: "24px 14px" }}>
      <div style={{ padding: "0 10px 22px 10px" }}>
        <div className="cp-display" style={{ fontSize: 20, fontWeight: 600, color: "#20281F", letterSpacing: "-0.01em" }}>
          Fieldnote
        </div>
        <div style={{ fontSize: 11.5, color: "#7A8272", marginTop: 2 }}>Social campaign studio</div>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 8,
                background: active ? "#20281F" : "transparent",
                color: active ? "#F5F4EF" : "#40473A",
                fontSize: 13.5,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              <Icon size={16} strokeWidth={2} style={{ flexShrink: 0, opacity: active ? 1 : 0.65 }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {!item.live && (
                <span
                  style={{
                    fontSize: 9.5,
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: active ? "#C9CFBE" : "#9AA18C",
                    border: `1px solid ${active ? "#3C4433" : "#DEE2D6"}`,
                    borderRadius: 4,
                    padding: "1px 5px",
                  }}
                >
                  {item.phase}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
