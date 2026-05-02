import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Lun", leads: 12 },
  { name: "Mar", leads: 20 },
  { name: "Mie", leads: 35 },
  { name: "Jue", leads: 28 },
  { name: "Vie", leads: 40 }
];

function Card({ title, value }: any) {
  return (
    <div style={{ background: "#111", padding: 20, borderRadius: 12 }}>
      <p style={{ opacity: 0.6 }}>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}

export default function DashboardPro() {
  return (
    <div style={{ padding: 20, background: "#0b0b0b", color: "white", minHeight: "100vh" }}>
      <h1>🚀 Dashboard Pro</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <Card title="Leads" value="120" />
        <Card title="Conversion" value="12%" />
        <Card title="Ingresos" value="$3,200" />
        <Card title="Agentes" value="7" />
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>📊 Leads por día</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="leads" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>📈 Pipeline</h2>
        <div style={{ display: "flex", gap: 16 }}>
          <div>Lead</div>
          <div>Contacto</div>
          <div>Interesado</div>
          <div>Cierre</div>
        </div>
      </div>
    </div>
  );
}
