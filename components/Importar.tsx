"use client";

import { useState, useRef, useEffect } from "react";

export default function Importar({ session }: { session: any }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [concesionarios, setConcesionarios] = useState<any[]>([]);
  const [selectedConc, setSelectedConc] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const headers = { Authorization: `Bearer ${session?.access_token}` };

  useEffect(() => {
    fetch("/api/concesionarios", { headers })
      .then(r => r.json())
      .then(j => setConcesionarios(j.data || []))
      .catch(() => {});
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedConc) {
      alert("Selecciona un concesionario antes de importar");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);

    const formData = new FormData();
    formData.append("excel", file);
    formData.append("concesionario", selectedConc);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReport(data.report);
      } else {
        setError(data.error || "Ocurrió un error al procesar el archivo");
      }
    } catch {
      setError("Error de conexión al subir el archivo");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    if (!selectedConc) {
      alert("Selecciona un concesionario antes de importar");
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="tab-section active">
      <div className="import-card">
        <span className="material-symbols-outlined upload-icon" style={{ fontSize: "48px", color: loading ? "#64748B" : "#2563EB" }}>
          {loading ? "sync" : "upload_file"}
        </span>
        <h2>Carga de Inventario Automatizada</h2>
        <p>
          Sube el archivo Excel del Departamento de Servicio. El sistema procesará el catálogo
          omitiendo costos y evitando duplicados basándose en el <strong>CÓDIGO</strong> único.
        </p>

        {/* Concesionario selector */}
        <div style={{ margin: "20px 0", width: "100%", maxWidth: "400px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>
            1. Selecciona el concesionario de este inventario:
          </label>
          <select
            value={selectedConc}
            onChange={e => setSelectedConc(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "8px",
              border: selectedConc ? "2px solid #2563EB" : "2px solid #E2E8F0",
              fontSize: "14px",
              background: "white",
              cursor: "pointer",
            }}
          >
            <option value="">-- Seleccionar concesionario --</option>
            {concesionarios.map((c: any) => (
              <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>

        {selectedConc && (
          <div style={{
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: "8px",
            padding: "10px 16px",
            marginBottom: "16px",
            fontSize: "13px",
            color: "#1D4ED8",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>info</span>
            Todas las herramientas importadas se asignarán a <strong>{selectedConc}</strong>
          </div>
        )}

        {error && (
          <div style={{ color: "#EF4444", backgroundColor: "#FEE2E2", padding: "10px", borderRadius: "6px", marginBottom: "15px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <label style={{ display: "block", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>
          2. Sube el archivo Excel:
        </label>
        <div
          className="drop-zone"
          onClick={triggerFileInput}
          style={{
            opacity: loading || !selectedConc ? 0.5 : 1,
            cursor: loading || !selectedConc ? "not-allowed" : "pointer",
          }}
        >
          <p>
            {loading
              ? "Procesando archivo, por favor espera..."
              : !selectedConc
              ? "Primero selecciona un concesionario arriba"
              : "Haz clic para subir y procesar el archivo Excel"}
          </p>
          <input
            type="file"
            accept=".xlsx, .xls"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={loading || !selectedConc}
          />
        </div>

        {report && (
          <div className="import-report">
            <h3>📊 INFORME DE LOGÍSTICA DE CARGA — {selectedConc}:</h3>
            <p>· Registros procesados en Excel: <strong>{report.processed}</strong></p>
            <p>· Nuevas herramientas añadidas: <strong className="text-green">{report.added}</strong></p>
            <p>· Registros actualizados (Upsert): <strong className="text-blue">{report.updated}</strong></p>
            <p>· Errores de formato detectados: <strong style={{ color: report.errors > 0 ? "#EF4444" : "inherit" }}>{report.errors}</strong></p>

            {report.errorDetails && report.errorDetails.length > 0 && (
              <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #334155" }}>
                <p style={{ color: "#FCA5A5", marginBottom: "5px" }}>Detalles de errores (primeros 20):</p>
                <ul style={{ color: "#FCA5A5", paddingLeft: "15px", maxHeight: "100px", overflowY: "auto" }}>
                  {report.errorDetails.map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
