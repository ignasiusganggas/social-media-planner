import { Instagram } from "lucide-react";

export default function Page() {
  return (
    <div style={{ marginTop: 60, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "#7A8272", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, background: "#E4E7DA", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Instagram size={22} color="#5C6650" />
      </div>
      <h2 className="cp-display" style={{ fontSize: 20, color: "#3C4433", margin: "0 0 6px 0" }}>Instagram Monitoring</h2>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
        This section builds in <strong>Phase 3</strong> of the project, once earlier phases are confirmed working. It'll unlock automatically as we move through the roadmap.
      </p>
    </div>
  );
}
