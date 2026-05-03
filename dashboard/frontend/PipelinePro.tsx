import React from "react";

const stages = ["Lead", "Contacto", "Interesado", "Cierre"];

const mockLeads = [
  { id: 1, name: "Juan", stage: "Lead" },
  { id: 2, name: "Maria", stage: "Interesado" }
];

export default function PipelinePro() {
  return (
    <div style={{ display: "flex", gap: 20 }}>
      {stages.map(stage => (
        <div key={stage} style={{ flex: 1, background: "#111", padding: 10, borderRadius: 10 }}>
          <h3>{stage}</h3>

          {mockLeads.filter(l => l.stage === stage).map(lead => (
            <div key={lead.id} style={{ background: "#222", marginTop: 10, padding: 10, borderRadius: 8 }}>
              {lead.name}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
