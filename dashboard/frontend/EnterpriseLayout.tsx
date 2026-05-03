import React from "react";

export default function EnterpriseLayout({ children }: any) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0b0b0b", color: "white" }}>
      {/* Sidebar */}
      <div style={{ width: 250, background: "#111", padding: 20 }}>
        <h2>🚀 SaaS Pro</h2>
        <ul style={{ marginTop: 20, lineHeight: "2" }}>
          <li>📊 Dashboard</li>
          <li>👥 Leads</li>
          <li>💬 Conversaciones</li>
          <li>⚙️ Automatización</li>
        </ul>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: 20 }}>
        {children}
      </div>
    </div>
  );
}
