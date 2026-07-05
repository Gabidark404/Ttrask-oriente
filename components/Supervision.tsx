"use client";

import { useEffect, useState } from "react";

export default function Supervision({ session }: { session: any }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/requests?status=Pendiente", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setRequests(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchRequests();
  }, [session]);

  const handleResolve = async (id: number, status: string) => {
    try {
      await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status }),
      });
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="tab-section active">
      <div className="section-title-card">
        <h2>Panel de Autorizaciones del Supervisor</h2>
        <p>Aprobación y rechazo operativo inmediato para la liberación de herramientas a patio de servicio.</p>
      </div>

      <div className="supervision-cards-container">
        {loading ? (
          <div className="section-title-card" style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "12px" }}>
            Cargando solicitudes pendientes...
          </div>
        ) : requests.length === 0 ? (
          <div className="section-title-card" style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "12px" }}>
            No hay solicitudes de salida pendientes de aprobación.
          </div>
        ) : (
          requests.map((s) => (
            <div key={s.id} className="supervision-card">
              <div className="sup-info">
                <h4>{s.toolName}</h4>
                <p><strong>Solicitante:</strong> {s.user}</p>
                <p><strong>Motivo de Uso:</strong> &quot;{s.reason}&quot;</p>
                <div className="sup-meta">
                  Retorno estimado: {s.estimatedReturnDate || "No especificado"}
                </div>
              </div>
              <div className="sup-actions">
                <button className="btn btn-success" onClick={() => handleResolve(s.id, "Aprobada")}>
                  Aprobar Salida
                </button>
                <button className="btn btn-danger" onClick={() => handleResolve(s.id, "Rechazada")}>
                  Rechazar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
