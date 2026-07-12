"use client";

import { useEffect, useState } from "react";

interface ReportesProps {
  session: any;
}

const REPORT_TYPES = [
  { key: "loans", label: "Préstamos y Devoluciones", icon: "swap_horiz" },
  { key: "usage", label: "Uso General de Herramientas", icon: "bar_chart" },
  { key: "losses", label: "Extraviadas / Fuera de Servicio", icon: "report_problem" },
  { key: "by_tech", label: "Por Técnico / Solicitante", icon: "person_search" },
];

export default function Reportes({ session }: ReportesProps) {
  const [reportType, setReportType] = useState("loans");
  const [concesionario, setConcesionario] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [concesionarios, setConcesionarios] = useState<any[]>([]);

  const headers = { Authorization: `Bearer ${session?.access_token}` };

  useEffect(() => {
    fetch("/api/concesionarios", { headers })
      .then((r) => r.json())
      .then((j) => setConcesionarios(j.data || []))
      .catch(() => {});
  }, [session]);

  const generateReport = async () => {
    setLoading(true);
    setGenerated(false);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (concesionario) params.set("concesionario", concesionario);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch(`/api/reports?${params}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
        setGenerated(true);
      } else {
        alert("Error al generar reporte. Verifica tus permisos.");
      }
    } catch {
      alert("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) return;
    const keys = Object.keys(data[0]);
    const csv = [
      keys.join(","),
      ...data.map((row) =>
        keys.map((k) => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderTable = () => {
    if (data.length === 0) {
      return (
        <div className="empty-state">
          <span className="material-symbols-outlined">table_chart</span>
          <p>No se encontraron datos con los criterios seleccionados.</p>
        </div>
      );
    }

    const keys = Object.keys(data[0]).filter(
      (k) => !["id", "request_id"].includes(k)
    );

    return (
      <div className="table-container shadow-sm">
        <table>
          <thead>
            <tr>
              {keys.map((k) => (
                <th key={k}>{k.replace(/_/g, " ").toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {keys.map((k) => (
                  <td key={k}>
                    {k.includes("_at") || k.includes("date") || k.includes("update")
                      ? row[k]
                        ? new Date(row[k]).toLocaleString("es")
                        : "—"
                      : String(row[k] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="tab-section active">
      <div className="section-title-card">
        <h2>Reportes y Análisis</h2>
        <p>Genera reportes de uso, préstamos, pérdidas y actividad por técnico.</p>
      </div>

      {/* Selector de tipo de reporte */}
      <div className="report-type-grid">
        {REPORT_TYPES.map((rt) => (
          <div
            key={rt.key}
            className={`report-type-card ${reportType === rt.key ? "selected" : ""}`}
            onClick={() => setReportType(rt.key)}
            id={`report-type-${rt.key}`}
          >
            <span className="material-symbols-outlined">{rt.icon}</span>
            <span>{rt.label}</span>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="filter-bar report-filters">
        <div className="select-box">
          <label>Concesionario:</label>
          <select value={concesionario} onChange={(e) => setConcesionario(e.target.value)}>
            <option value="">Todos</option>
            {concesionarios.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="select-box">
          <label>Desde:</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="select-box">
          <label>Hasta:</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <button
          className="btn btn-primary"
          onClick={generateReport}
          disabled={loading}
          id="btn-generate-report"
        >
          {loading ? (
            <span className="material-symbols-outlined spinning">sync</span>
          ) : (
            <span className="material-symbols-outlined">analytics</span>
          )}
          {loading ? "Generando..." : "Generar Reporte"}
        </button>
        {generated && data.length > 0 && (
          <button
            className="btn btn-success"
            onClick={exportToCSV}
            id="btn-export-csv"
          >
            <span className="material-symbols-outlined">download</span>
            Exportar CSV
          </button>
        )}
      </div>

      {/* Resultado */}
      {generated && (
        <div className="report-results">
          <div className="report-header-bar">
            <span className="report-summary">
              <strong>{data.length}</strong> registros encontrados
              {concesionario && ` · ${concesionario}`}
              {dateFrom && ` · Desde ${dateFrom}`}
              {dateTo && ` · Hasta ${dateTo}`}
            </span>
          </div>
          {renderTable()}
        </div>
      )}

      {!generated && !loading && (
        <div className="empty-state" style={{ marginTop: "40px" }}>
          <span className="material-symbols-outlined">analytics</span>
          <p>Selecciona el tipo de reporte y los filtros, luego haz clic en <strong>Generar Reporte</strong>.</p>
        </div>
      )}
    </div>
  );
}
