"use client";

import { useEffect, useState } from "react";

export default function Supervision({ session }: { session: any }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "active" | "queue">("pending");

  // Devolución
  const [returningId, setReturningId] = useState<number | null>(null);
  const [returnNotes, setReturnNotes] = useState("");
  const [returnEvidenceFile, setReturnEvidenceFile] = useState<File | null>(null);
  const [returnLoading, setReturnLoading] = useState(false);

  const headers = { Authorization: `Bearer ${session?.access_token}` };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [pendRes, activeRes, queueRes] = await Promise.all([
        fetch("/api/requests?status=Pendiente&limit=50", { headers }),
        fetch("/api/requests?status=Aprobada&limit=50", { headers }),
        fetch("/api/requests?status=En%20cola&limit=50", { headers }),
      ]);
      const [pend, active, queue] = await Promise.all([
        pendRes.ok ? pendRes.json() : { data: [] },
        activeRes.ok ? activeRes.json() : { data: [] },
        queueRes.ok ? queueRes.json() : { data: [] },
      ]);

      const map: Record<string, any[]> = {
        pending: pend.data || [],
        active: active.data || [],
        queue: queue.data || [],
      };
      setAllRequests(map as any);
      setRequests(map[tab] || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchRequests();
  }, [session]);

  useEffect(() => {
    setRequests((allRequests as any)[tab] || []);
  }, [tab, allRequests]);

  const handleResolve = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchRequests();
    } catch (err) { console.error(err); }
  };

  const handleReturn = async () => {
    if (!returningId) return;
    setReturnLoading(true);
    try {
      let evidenceUrl = "";
      if (returnEvidenceFile) {
        const fd = new FormData();
        fd.append("file", returnEvidenceFile);
        fd.append("bucket", "evidence-images");
        const uploadRes = await fetch("/api/upload/image", { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` }, body: fd });
        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          evidenceUrl = uploadJson.url || "";
        }
      }
      const res = await fetch(`/api/requests/${returningId}/return`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ returnEvidenceUrl: evidenceUrl, notes: returnNotes }),
      });
      if (res.ok) {
        setReturningId(null);
        setReturnNotes("");
        setReturnEvidenceFile(null);
        fetchRequests();
      } else {
        const err = await res.json();
        alert(err.error || "Error al registrar devolución");
      }
    } catch { alert("Error de conexión"); }
    setReturnLoading(false);
  };

  const countOf = (key: string) => ((allRequests as any)[key] || []).length;

  const statusColor = (s: string) => ({
    "Aprobada": "#10B981", "Rechazada": "#EF4444", "Pendiente": "#F59E0B",
    "En cola": "#3B82F6", "Devuelta": "#8B5CF6",
  }[s] || "#64748B");

  return (
    <div className="tab-section active">
      <div className="section-title-card">
        <h2>Panel de Gestión de Solicitudes</h2>
        <p>Aprobación, rechazo, devolución y seguimiento de la cola de espera.</p>
      </div>

      {/* Tabs */}
      <div className="sup-tabs">
        <button className={`sup-tab-btn ${tab === "pending" ? "active" : ""}`} onClick={() => setTab("pending")} id="sup-tab-pending">
          <span className="material-symbols-outlined">pending_actions</span>
          Pendientes
          {countOf("pending") > 0 && <span className="badge">{countOf("pending")}</span>}
        </button>
        <button className={`sup-tab-btn ${tab === "active" ? "active" : ""}`} onClick={() => setTab("active")} id="sup-tab-active">
          <span className="material-symbols-outlined">output</span>
          Préstamos Activos
          {countOf("active") > 0 && <span className="badge badge-green">{countOf("active")}</span>}
        </button>
        <button className={`sup-tab-btn ${tab === "queue" ? "active" : ""}`} onClick={() => setTab("queue")} id="sup-tab-queue">
          <span className="material-symbols-outlined">queue</span>
          Cola de Espera
          {countOf("queue") > 0 && <span className="badge badge-blue">{countOf("queue")}</span>}
        </button>
        <button className="btn btn-secondary" style={{ marginLeft: "auto" }} onClick={fetchRequests} id="btn-refresh-sup">
          <span className="material-symbols-outlined">refresh</span>
        </button>
      </div>

      <div className="supervision-cards-container">
        {loading ? (
          <div className="loading-state">
            <span className="material-symbols-outlined spinning">sync</span>
            Cargando solicitudes...
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">
              {tab === "pending" ? "check_circle" : tab === "active" ? "inventory_2" : "queue"}
            </span>
            <p>
              {tab === "pending" && "No hay solicitudes pendientes de aprobación."}
              {tab === "active" && "No hay préstamos activos en este momento."}
              {tab === "queue" && "No hay solicitudes en cola de espera."}
            </p>
          </div>
        ) : (
          requests.map((s) => (
            <div key={s.id} className="supervision-card">
              <div className="sup-info">
                <h4>{s.toolName}</h4>
                <div className="sup-badges">
                  {s.concesionario && (
                    <span className="conc-badge">{s.concesionario}</span>
                  )}
                  {s.isQueued && (
                    <span className="queue-badge">Cola #{s.queuePosition}</span>
                  )}
                  <span className="status-badge" style={{ background: statusColor(s.status) + "22", color: statusColor(s.status) }}>
                    {s.status}
                  </span>
                </div>
                <p><strong>Solicitante:</strong> {s.user}</p>
                <p><strong>Motivo:</strong> &ldquo;{s.reason}&rdquo;</p>
                <div className="sup-meta">
                  Retorno estimado: {s.estimatedReturnDate ? new Date(s.estimatedReturnDate).toLocaleDateString("es") : "No especificado"}
                  {" · "}
                  Solicitado: {new Date(s.requestDate).toLocaleDateString("es")}
                </div>
              </div>
              <div className="sup-actions">
                {tab === "pending" && (
                  <>
                    <button className="btn btn-success" onClick={() => handleResolve(s.id, "Aprobada")} id={`btn-approve-${s.id}`}>
                      <span className="material-symbols-outlined">check_circle</span>
                      Aprobar
                    </button>
                    <button className="btn btn-danger" onClick={() => handleResolve(s.id, "Rechazada")} id={`btn-reject-${s.id}`}>
                      <span className="material-symbols-outlined">cancel</span>
                      Rechazar
                    </button>
                  </>
                )}
                {tab === "active" && (
                  <button className="btn btn-primary" onClick={() => setReturningId(s.id)} id={`btn-return-${s.id}`}>
                    <span className="material-symbols-outlined">assignment_return</span>
                    Registrar Devolución
                  </button>
                )}
                {tab === "queue" && (
                  <button className="btn btn-secondary" onClick={() => handleResolve(s.id, "Rechazada")} id={`btn-cancel-queue-${s.id}`}>
                    <span className="material-symbols-outlined">remove_from_queue</span>
                    Cancelar solicitud
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Devolución */}
      {returningId && (
        <div className="modal-overlay open">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Registrar Devolución</h3>
              <button className="close-btn" onClick={() => { setReturningId(null); setReturnNotes(""); setReturnEvidenceFile(null); }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Notas de devolución (opcional)</label>
                <textarea
                  placeholder="Estado de la herramienta al retornar, observaciones..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Foto de evidencia (opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReturnEvidenceFile(e.target.files?.[0] || null)}
                  id="input-return-evidence"
                />
                {returnEvidenceFile && (
                  <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--color-disponible)" }}>
                    ✓ {returnEvidenceFile.name}
                  </p>
                )}
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => { setReturningId(null); setReturnNotes(""); setReturnEvidenceFile(null); }}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleReturn} disabled={returnLoading} id="btn-confirm-return">
                  {returnLoading ? <span className="material-symbols-outlined spinning">sync</span> : <span className="material-symbols-outlined">assignment_return</span>}
                  {returnLoading ? "Procesando..." : "Confirmar Devolución"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
