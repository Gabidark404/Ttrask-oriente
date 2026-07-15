"use client";

import { useEffect, useState } from "react";

export default function Catalog({ session }: { session: any }) {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [concesionarioFilter, setConcesionarioFilter] = useState("");
  const [concesionarios, setConcesionarios] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  // Solicitud modal
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ isQueued: boolean; queuePosition: number } | null>(null);

  // Tool detail modal
  const [detailTool, setDetailTool] = useState<any>(null);
  const [detailHistory, setDetailHistory] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const headers = { Authorization: `Bearer ${session?.access_token}` };

  const fetchTools = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "Todos") params.append("status", statusFilter);
      if (concesionarioFilter) params.append("concesionario", concesionarioFilter);

      const res = await fetch(`/api/inventory?${params.toString()}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setTools(json.data || []);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchConcesionarios = async () => {
    try {
      const res = await fetch("/api/concesionarios", { headers });
      if (res.ok) {
        const json = await res.json();
        setConcesionarios(json.data || []);
        fetchAllStats(json.data || []);
      }
    } catch {}
  };

  const fetchAllStats = async (concList: any[]) => {
    const statsMap: Record<string, any> = {};
    for (const c of concList) {
      try {
        const res = await fetch(`/api/inventory?concesionario=${encodeURIComponent(c.name)}&limit=999`, { headers });
        if (res.ok) {
          const json = await res.json();
          const toolsList = json.data || [];
          statsMap[c.name] = {
            total: toolsList.length,
            disponible: toolsList.filter((t: any) => t.status === "Disponible").length,
            prestada: toolsList.filter((t: any) => t.status === "Prestada").length,
            mantenimiento: toolsList.filter((t: any) => t.status === "En mantenimiento").length,
            extraviada: toolsList.filter((t: any) => t.status === "Extraviada").length,
          };
        }
      } catch {}
    }
    setStats(statsMap);
  };

  const openDetail = async (tool: any) => {
    setDetailTool(tool);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/inventory/${tool.id}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setDetailTool(json);
        setDetailHistory(json.history || []);
      }
    } catch {}
    setDetailLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !detailTool) return;
    
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      // 1. Upload image
      const uploadRes = await fetch("/api/upload/image", {
        method: "POST",
        headers: { Authorization: headers.Authorization },
        body: formData
      });
      
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || "Error subiendo imagen");
      }
      
      const { url } = await uploadRes.json();
      
      // 2. Update tool with new image URL
      const updateRes = await fetch(`/api/inventory/${detailTool.id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url })
      });
      
      if (!updateRes.ok) throw new Error("Error guardando URL en herramienta");
      
      // Update local state
      setDetailTool({ ...detailTool, imageUrl: url });
      fetchTools(); // Refresh the list to show new image
      alert("Imagen actualizada correctamente");
      
    } catch (err: any) {
      alert(err.message || "Error al actualizar imagen");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRequestSubmit = async () => {
    if (!reason) return alert("Debes indicar el motivo de uso");
    setSubmitting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          code: selectedTool.code,
          reason,
          estimatedReturnDate: returnDate || null,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setLastResult({ isQueued: json.isQueued, queuePosition: json.queuePosition });
        setSelectedTool(null);
        setReason("");
        setReturnDate("");
        fetchTools();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Error al solicitar la herramienta");
      }
    } catch { alert("Error de conexión"); }
    setSubmitting(false);
  };

  useEffect(() => {
    if (session) {
      fetchConcesionarios();
      fetchTools();
    }
  }, [session, search, statusFilter, concesionarioFilter]);

  const getStatusColor = (status: string) => ({
    "Disponible": "#10B981", "Prestada": "#F59E0B", "Reservada": "#3B82F6",
    "En mantenimiento": "#F97316", "Extraviada": "#EF4444", "Fuera de servicio": "#6B7280",
  }[status] || "#ccc");

  const canRequest = (tool: any) =>
    !["Extraviada", "Fuera de servicio"].includes(tool.status);

  const getRequestLabel = (tool: any) => {
    if (tool.status === "Disponible" && tool.available > 0) return "Solicitar";
    if (canRequest(tool)) return "Entrar en cola";
    return "No disponible";
  };

  return (
    <div className="tab-section active">
      {/* Resultado de solicitud */}
      {lastResult && (
        <div className={`alert-banner ${lastResult.isQueued ? "alert-info" : "alert-success"}`}>
          <span className="material-symbols-outlined">
            {lastResult.isQueued ? "queue" : "check_circle"}
          </span>
          {lastResult.isQueued
            ? `Tu solicitud fue registrada en la cola de espera (posición #${lastResult.queuePosition}). Serás notificado cuando esté disponible.`
            : "¡Solicitud enviada exitosamente! El supervisor la revisará pronto."}
          <button onClick={() => setLastResult(null)} className="close-btn">×</button>
        </div>
      )}

      {/* Visual Concesionarios Grid */}
      {concesionarios.length > 0 && (
        <div className="concesionarios-grid" style={{ marginBottom: "24px" }}>
          <div 
            className={`conc-card ${concesionarioFilter === "" ? "active" : ""}`}
            onClick={() => setConcesionarioFilter("")}
            style={{ borderLeftColor: "var(--primary-dark)" }}
          >
            <div className="conc-color-bar" style={{ background: "var(--primary-dark)" }} />
            <div className="conc-body">
              <div className="conc-name">Inventario General</div>
              <div className="conc-code">ALL</div>
            </div>
          </div>
          {concesionarios.map(c => {
            const s = stats[c.name] || { total: 0, disponible: 0, prestada: 0, extraviada: 0 };
            return (
              <div 
                key={c.id} 
                className={`conc-card ${concesionarioFilter === c.name ? "active" : ""}`}
                onClick={() => setConcesionarioFilter(c.name)}
                style={{ borderLeftColor: c.color }}
              >
                <div className="conc-color-bar" style={{ background: c.color }} />
                <div className="conc-body">
                  <div className="conc-name">{c.name}</div>
                  <div className="conc-code">{c.code}</div>
                  <div className="conc-mini-stats">
                    <span className="mini-stat disponible">{s.total || 0} total</span>
                    <span className="mini-stat">{s.disponible || 0} disp.</span>
                    {s.prestada > 0 && <span className="mini-stat prestada">{s.prestada} prest.</span>}
                    {s.extraviada > 0 && <span className="mini-stat extraviada">⚠ {s.extraviada}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="filter-bar">
        <div className="search-box">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Buscar por nombre, marca, código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="select-box">
          <label>Estado:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="Todos">Todos los estados</option>
            <option value="Disponible">Disponible</option>
            <option value="Prestada">Prestada</option>
            <option value="Reservada">Reservada</option>
            <option value="En mantenimiento">En mantenimiento</option>
            <option value="Extraviada">Extraviada</option>
            <option value="Fuera de servicio">Fuera de servicio</option>
          </select>
        </div>
      </div>

      <div className="table-container shadow-sm">
        {loading ? (
          <div style={{ padding: "30px", textAlign: "center" }}>
            <span className="material-symbols-outlined spinning">sync</span> Cargando inventario...
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="text-center">FOTO</th>
                <th className="text-center">ITEM</th>
                <th>CÓDIGO / CODIF.</th>
                <th>DESCRIPCIÓN</th>
                <th>MARCA</th>
                <th>CONCESIONARIO</th>
                <th className="text-center">DISP.</th>
                <th>ESTADO</th>
                <th className="text-center">ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {tools.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center" style={{ color: "var(--text-muted)", padding: "30px" }}>
                    No se encontraron herramientas con esos criterios.
                  </td>
                </tr>
              ) : (
                tools.map((h, index) => {
                  const sc = getStatusColor(h.status);
                  const canReq = canRequest(h);
                  return (
                    <tr key={h.id}>
                      <td className="text-center">
                        {h.imageUrl ? (
                          <img src={h.imageUrl} alt={h.description} className="tool-thumb-cell" />
                        ) : (
                          <div className="tool-thumb-placeholder">
                            <span className="material-symbols-outlined">construction</span>
                          </div>
                        )}
                      </td>
                      <td className="text-center" style={{ fontWeight: "bold", color: "var(--text-muted)" }}>{index + 1}</td>
                      <td>
                        <strong>{h.code.startsWith("__NO_CODE__") ? "S/C" : h.code}</strong><br />
                        <span className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{h.codification || "—"}</span>
                      </td>
                      <td>
                        <button
                          className="tool-name-link"
                          onClick={() => openDetail(h)}
                          title="Ver ficha completa"
                        >
                          {h.description}
                        </button>
                      </td>
                      <td>{h.brand || "—"}</td>
                      <td>
                        {h.concesionario ? (
                          <span className="conc-badge-sm">{h.concesionario}</span>
                        ) : "—"}
                      </td>
                      <td className="text-center" style={{ fontSize: "13px", fontWeight: "bold" }}>
                        {h.available} <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: "normal" }}>/ {h.quantity}</span>
                      </td>
                      <td>
                        <span className="status-badge" style={{ background: sc + "22", color: sc, border: `1px solid ${sc}40` }}>
                          {h.status}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          className={`btn ${canReq ? (h.status === "Disponible" && h.available > 0 ? "btn-primary" : "btn-outline-queue") : "btn-secondary"}`}
                          disabled={!canReq}
                          onClick={() => canReq && setSelectedTool(h)}
                          id={`btn-request-${h.id}`}
                        >
                          {h.status !== "Disponible" || h.available <= 0 ? (
                            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>queue</span>
                          ) : null}
                          {getRequestLabel(h)}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Solicitud */}
      {selectedTool && (
        <div className="modal-overlay open">
          <div className="modal-box">
            <div className="modal-header">
              <h3>
                {selectedTool.status === "Disponible" && selectedTool.available > 0
                  ? "Confirmar Solicitud"
                  : "Entrar en Cola de Espera"}
              </h3>
              <button className="close-btn" onClick={() => setSelectedTool(null)}>×</button>
            </div>
            <div className="modal-body">
              {selectedTool.status !== "Disponible" || selectedTool.available <= 0 ? (
                <div className="alert-banner alert-info" style={{ marginBottom: "16px" }}>
                  <span className="material-symbols-outlined">info</span>
                  Esta herramienta está <strong>{selectedTool.status}</strong>. Tu solicitud quedará en cola y serás notificado cuando esté disponible.
                </div>
              ) : null}
              <div className="tool-summary-badge">
                {selectedTool.imageUrl && (
                  <img src={selectedTool.imageUrl} alt={selectedTool.description} className="tool-thumb" />
                )}
                <div>
                  <div className="tool-title">{selectedTool.description}</div>
                  <div className="tool-meta">
                    Código: {selectedTool.code.startsWith("__NO_CODE__") ? "S/C" : selectedTool.code} · Marca: {selectedTool.brand || "—"}
                    {selectedTool.concesionario && ` · ${selectedTool.concesionario}`}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Motivo de Uso / Orden de Reparación *</label>
                <textarea
                  placeholder="Ej. Cambio de bujías vehículo Corolla placa XXX..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Fecha Estimada de Retorno</label>
                <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setSelectedTool(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleRequestSubmit} disabled={submitting} id="btn-confirm-request">
                  {submitting ? <span className="material-symbols-outlined spinning">sync</span> : <span className="material-symbols-outlined">send</span>}
                  {submitting ? "Enviando..." : "Enviar Solicitud"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ficha de Herramienta */}
      {detailTool && (
        <div className="modal-overlay open">
          <div className="modal-box modal-wide">
            <div className="modal-header">
              <h3>Ficha de Herramienta</h3>
              <button className="close-btn" onClick={() => { setDetailTool(null); setDetailHistory([]); }}>×</button>
            </div>
            <div className="modal-body">
              {detailLoading ? (
                <div className="loading-state"><span className="material-symbols-outlined spinning">sync</span></div>
              ) : (
                <>
                  <div className="tool-detail-grid">
                    <div className="tool-detail-img-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {detailTool.imageUrl ? (
                        <div className="tool-detail-img">
                          <img src={detailTool.imageUrl} alt={detailTool.description} />
                        </div>
                      ) : (
                        <div className="tool-thumb-placeholder" style={{ width: '100%', height: '200px', fontSize: '48px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '64px' }}>construction</span>
                        </div>
                      )}
                      
                      {/* Botón para subir foto (Solo admin/supervisor) */}
                      {["admin", "supervisor", "jefe_taller", "almacenista"].includes(session?.user?.app_metadata?.role) && (
                        <div className="upload-photo-btn-container">
                          <input 
                            type="file" 
                            id="photo-upload" 
                            accept="image/jpeg, image/png, image/webp" 
                            style={{ display: "none" }} 
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                          />
                          <label htmlFor="photo-upload" className="btn btn-secondary" style={{ display: 'flex', justifyContent: 'center', width: '100%', cursor: 'pointer' }}>
                            {uploadingImage ? (
                              <><span className="material-symbols-outlined spinning">sync</span> Subiendo...</>
                            ) : (
                              <><span className="material-symbols-outlined">add_a_photo</span> Subir Foto</>
                            )}
                          </label>
                        </div>
                      )}
                    </div>
                    <div className="tool-detail-info">
                      <h4>{detailTool.description}</h4>
                      <div className="detail-fields">
                        <div><span>Código</span><strong>{detailTool.code}</strong></div>
                        <div><span>Codificación</span><strong>{detailTool.codification || "—"}</strong></div>
                        <div><span>Marca</span><strong>{detailTool.brand || "—"}</strong></div>
                        <div><span>Concesionario</span><strong>{detailTool.concesionario || "—"}</strong></div>
                        <div><span>Área</span><strong>{detailTool.area || "—"}</strong></div>
                        <div><span>Responsable</span><strong>{detailTool.responsible || "—"}</strong></div>
                        <div><span>Ubicación</span><strong>{detailTool.location || "—"}</strong></div>
                        <div><span>Disponibles</span><strong>{detailTool.available} / {detailTool.quantity}</strong></div>
                        <div><span>Estado</span>
                          <span className="status-badge" style={{ background: "#3B82F622", color: "#3B82F6" }}>{detailTool.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {detailHistory.length > 0 && (
                    <div className="tool-history-mini">
                      <h5><span className="material-symbols-outlined">history</span> Últimos movimientos</h5>
                      <table>
                        <thead>
                          <tr><th>Acción</th><th>Por</th><th>Fecha</th><th>Notas</th></tr>
                        </thead>
                        <tbody>
                          {detailHistory.slice(0, 8).map((h: any) => (
                            <tr key={h.id}>
                              <td><span style={{ color: h.action === "Prestamo" ? "#F59E0B" : h.action === "Devolucion" ? "#10B981" : "#64748B" }}>{h.action}</span></td>
                              <td>{h.performed_by}</td>
                              <td>{new Date(h.created_at).toLocaleDateString("es")}</td>
                              <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{h.notes || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
