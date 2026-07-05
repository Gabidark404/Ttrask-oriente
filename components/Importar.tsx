"use client";

import { useState, useRef } from "react";

export default function Importar({ session }: { session: any }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setReport(null);

    const formData = new FormData();
    formData.append("excel", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReport(data.report);
      } else {
        setError(data.error || "Ocurrió un error al procesar el archivo");
      }
    } catch (err) {
      setError("Error de conexión al subir el archivo");
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="tab-section active">
        <div className="import-card">
            <span className="material-symbols-outlined upload-icon">
              {loading ? "sync" : "upload_file"}
            </span>
            <h2>Carga de Inventario Automatizada</h2>
            <p>Sube el archivo Excel del Departamento de Servicio. El sistema procesará el catálogo omitiendo costos y evitando duplicados basándose en el <strong>CÓDIGO</strong> único.</p>
            
            {error && (
              <div style={{color: '#EF4444', backgroundColor: '#FEE2E2', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px'}}>
                {error}
              </div>
            )}

            <div 
              className="drop-zone" 
              onClick={triggerFileInput} 
              style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
                <p>
                  {loading 
                    ? "Procesando archivo, por favor espera..." 
                    : "Haz clic para subir y procesar el archivo de Inventario Excel"}
                </p>
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  style={{display: 'none'}} 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={loading}
                />
            </div>

            {report && (
                <div className="import-report">
                    <h3>📊 INFORME DE LOGÍSTICA DE CARGA:</h3>
                    <p>· Registros procesados en Excel: <strong>{report.processed}</strong></p>
                    <p>· Nuevas herramientas añadidas: <strong className="text-green">{report.added}</strong></p>
                    <p>· Registros actualizados (Upsert): <strong className="text-blue">{report.updated}</strong></p>
                    <p>· Errores de formato detectados: <strong style={{color: report.errors > 0 ? '#EF4444' : 'inherit'}}>{report.errors}</strong></p>
                    
                    {report.errorDetails && report.errorDetails.length > 0 && (
                      <div style={{marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #334155'}}>
                        <p style={{color: '#FCA5A5', marginBottom: '5px'}}>Detalles de errores (primeros 20):</p>
                        <ul style={{color: '#FCA5A5', paddingLeft: '15px', maxHeight: '100px', overflowY: 'auto'}}>
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
