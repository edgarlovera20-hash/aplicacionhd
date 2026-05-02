import React, { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return <div>Cargando...</div>;

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>📊 Dashboard SaaS</h1>

      <h2>Leads</h2>
      <p>Total: {data.leads}</p>

      <h2>Conversiones</h2>
      <p>Cierres: {data.closures}</p>

      <h2>Agentes activos</h2>
      <p>{data.agents}</p>

      <h2>Métricas</h2>
      <ul>
        <li>Respuesta IA: {data.responseRate}%</li>
        <li>Conversión: {data.conversionRate}%</li>
      </ul>
    </div>
  );
}
