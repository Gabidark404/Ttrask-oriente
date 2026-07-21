"use client";

import { useEffect, useState, useRef } from "react";

export default function Catalog({ session }: { session: any }) {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [concesionarioFilter, setConcesionarioFilter] = useState("");
  const [concesionarios, setConcesionarios] = useState<any[]>([]);
  const [concStats, setConcStats] = useState<Record<string, number>>({});
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 50;

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

  // Photo upload
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const uploadingToolRef = useRef<any>(null);

  // Expanded Image
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${session?.access_token}` };

  // ── Fetch tools ──────────────────────────────────────────────────
  const fetchTools = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "Todos") params.append("status", statusFilter);
      if (concesionarioFilter) params.append("concesionario", concesionarioFilter);
      
      params.append("limit", limit.toString());
      params.append("offset", ((page - 1) * limit).toString());

      const res = await fetch(`/api/inventory?${params.toString()}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setTools(json.data || []);
        setTotalItems(json.pagination?.total || 0);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // ── Fetch concesionarios + stats ──────────────────────────────────
  const fetchConcesionarios = async () => {
    try {
      const res = await fetch("/api/concesionarios", { headers });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || [];
        setConcesionarios(list);
        // Fetch count per concesionario
        const statsMap: Record<string, number> = {};
        await Promise.all(list.map(async (c: any) => {
          try {
            const r = await fetch(`/api/inventory?concesionario=${encodeURIComponent(c.name)}&limit=1`, { headers });
            if (r.ok) {
              const j = await r.json();
              statsMap[c.name] = j.pagination?.total || 0;
            }
          } catch {}
        }));
        setConcStats(statsMap);
      }
    } catch {}
  };

  // ── Open tool detail ────────────────────────────────────────────
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

  // ── Request submit ──────────────────────────────────────────────
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

  // ── Photo upload ────────────────────────────────────────────────
  const handlePhotoClick = (tool: any) => {
    uploadingToolRef.current = tool;
    photoInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const tool = uploadingToolRef.current;
    if (!file || !tool) return;

    setUploadingPhotoId(tool.id);
    try {
      // 1. Upload to storage
      const safeCode = (tool.code || "tool").replace(/[^a-zA-Z0-9_-]/g, "_");
      const ext = file.name.split(".").pop() || "jpg";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "tool-images");
      formData.append("path", `tools/${safeCode}-${Date.now()}.${ext}`);

      const uploadRes = await fetch("/api/upload/image", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });

      const uploadJson = await uploadRes.json().catch(() => null);

      if (!uploadRes.ok || !uploadJson?.url) {
        alert(uploadJson?.error || uploadJson?.details || "Error al subir la imagen.");
        setUploadingPhotoId(null);
        return;
      }

      const url = uploadJson.url;

      // 2. Save URL to tool
      const patchRes = await fetch(`/api/inventory/${tool.id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });

      const patchJson = await patchRes.json().catch(() => null);

      if (patchRes.ok) {
        // Update locally without full reload
        setTools(prev => prev.map(t => t.id === tool.id ? { ...t, imageUrl: url } : t));
      } else {
        alert(patchJson?.error || patchJson?.details || "Error al guardar la URL de la imagen en la base de datos.");
      }
    } catch (err: any) {
      alert("Error de conexión al subir foto: " + (err?.message || "intente nuevamente"));
    }

    setUploadingPhotoId(null);
    if (e.target) e.target.value = "";
  };

  // ── Effects ─────────────────────────────────────────────────────
  useEffect(() => {
    if (session) {
      fetchConcesionarios();
      fetchTools();
    }
  }, [session]);

  useEffect(() => {
    setPage(1); // Reset page on filter change
  }, [search, statusFilter, concesionarioFilter]);

  useEffect(() => {
    if (session) fetchTools();
  }, [search, statusFilter, concesionarioFilter, page]);

  // ── Helpers ─────────────────────────────────────────────────────
  const getStatusColor = (status: string) => ({
    "Disponible": "#10B981", "Prestada": "#F59E0B", "Reservada": "#3B82F6",
    "En mantenimiento": "#F97316", "Extraviada": "#EF4444", "Fuera de servicio": "#6B7280",
  }[status] || "#ccc");

  const canRequest = (tool: any) => !["Extraviada", "Fuera de servicio"].includes(tool.status);

  const getRequestLabel = (tool: any) => {
    if (tool.status === "Disponible" && tool.available > 0) return "Solicitar";
    if (canRequest(tool)) return "En cola";
    return "No disponible";
  };

  // Concesionarios with tools (dynamic)
  const activeConcesionarios = concesionarios.filter(c => (concStats[c.name] || 0) > 0);
  const totalTools = Object.values(concStats).reduce((a, b) => a + b, 0);

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="tab-section active">
      {/* Hidden photo input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handlePhotoChange}
      />

      {/* Alert banner */}
      {lastResult && (
        <div className={`alert-banner ${lastResult.isQueued ? "alert-info" : "alert-success"}`}>
          <span className="material-symbols-outlined">
            {lastResult.isQueued ? "queue" : "check_circle"}
          </span>
          {lastResult.isQueued
            ? `Tu solicitud fue registrada en la cola de espera (posición #${lastResult.queuePosition}).`
            : "¡Solicitud enviada exitosamente! El supervisor la revisará pronto."}
          <button onClick={() => setLastResult(null)} className="close-btn">×</button>
        </div>
      )}

      {/* ── CONCESIONARIO CARDS (dynamic) ── */}
      {activeConcesionarios.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            {/* "Todos" card */}
            <button
              onClick={() => setConcesionarioFilter("")}
              className={`conc-filter-card ${concesionarioFilter === "" ? "active" : ""}`}
              id="filter-todos"
            >
              <span className="material-symbols-outlined">apps</span>
              <div>
                <div className="conc-filter-name">Todos</div>
                <div className="conc-filter-count">{totalTools} herramientas</div>
              </div>
            </button>

            {activeConcesionarios.map(c => (
              <button
                key={c.id}
                onClick={() => setConcesionarioFilter(c.name)}
                className={`conc-filter-card ${concesionarioFilter === c.name ? "active" : ""}`}
                style={{ borderColor: concesionarioFilter === c.name ? c.color : undefined }}
                id={`filter-${c.code}`}
              >
                <div className="conc-filter-dot" style={{ background: c.color }} />
                <div>
                  <div className="conc-filter-name">{c.name}</div>
                  <div className="conc-filter-count">{concStats[c.name] || 0} herramientas</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── FILTER BAR ── */}
      <div className="filter-bar">
        <div className="search-box">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Buscar por nombre, marca, código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="select-box">
          <label>Estado:</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="Todos">Todos los estados</option>
            <option value="Disponible">Disponible</option>
            <option value="Prestada">Prestada</option>
            <option value="Reservada">Reservada</option>
            <option value="En mantenimiento">En mantenimiento</option>
            <option value="Extraviada">Extraviada</option>
            <option value="Fuera de servicio">Fuera de servicio</option>
          </select>
        </div>
        {concesionarioFilter && (
          <button
            className="btn btn-secondary"
            onClick={() => setConcesionarioFilter("")}
            style={{ fontSize: "12px", padding: "6px 12px" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>
            Quitar filtro
          </button>
        )}
      </div>

      {/* ── TABLE ── */}
      <div className="table-container shadow-sm">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <span className="material-symbols-outlined spinning">sync</span>
            <p style={{ marginTop: "8px", color: "var(--text-muted)" }}>Cargando inventario...</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="text-center" style={{ width: "60px" }}>FOTO</th>
                <th className="text-center" style={{ width: "40px" }}>#</th>
                <th>CÓDIGO / CODIF.</th>
                <th>DESCRIPCIÓN</th>
                <th>MARCA</th>
                {!concesionarioFilter && <th>CONCESIONARIO</th>}
                <th className="text-center">DISP.</th>
                <th>ESTADO</th>
                <th className="text-center">ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {tools.length === 0 ? (
                <tr>
                  <td colSpan={concesionarioFilter ? 8 : 9} className="text-center" style={{ color: "var(--text-muted)", padding: "40px" }}>
                    No se encontraron herramientas con esos criterios.
                  </td>
                </tr>
              ) : (
                tools.map((h, index) => {
                  const sc = getStatusColor(h.status);
                  const canReq = canRequest(h);
                  const isUploadingThis = uploadingPhotoId === h.id;
                  return (
                    <tr key={h.id}>
                      {/* FOTO — clickeable para subir/cambiar */}
                      <td className="text-center">
                        <div
                          onClick={() => !isUploadingThis && handlePhotoClick(h)}
                          title={h.imageUrl ? "Clic para cambiar foto" : "Clic para agregar foto"}
                          style={{ cursor: "pointer", display: "inline-block", position: "relative" }}
                        >
                          {isUploadingThis ? (
                            <div className="tool-thumb-placeholder">
                              <span className="material-symbols-outlined spinning" style={{ fontSize: "18px" }}>sync</span>
                            </div>
                          ) : h.imageUrl ? (
                            <div style={{ position: "relative" }}>
                              <img src={h.imageUrl} alt={h.description} className="tool-thumb-cell" />
                              <div style={{
                                position: "absolute", inset: 0, borderRadius: "8px",
                                background: "rgba(0,0,0,0.4)", opacity: 0, transition: "opacity 0.2s",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}
                                className="photo-hover-overlay"
                                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                                onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                              >
                                <span className="material-symbols-outlined" style={{ color: "white", fontSize: "18px" }}>photo_camera</span>
                              </div>
                            </div>
                          ) : (
                            <div className="tool-thumb-placeholder" style={{ border: "1.5px dashed #CBD5E1" }}>
                              <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#94A3B8" }}>add_a_photo</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="text-center" style={{ fontWeight: "bold", color: "var(--text-muted)", fontSize: "12px" }}>{index + 1}</td>

                      <td>
                        <strong>{h.code.startsWith("__NO_CODE__") ? "S/C" : h.code}</strong><br />
                        <span className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{h.codification || "—"}</span>
                      </td>

                      <td>
                        <button className="tool-name-link" onClick={() => openDetail(h)} title="Ver ficha completa">
                          {h.description}
                        </button>
                      </td>

                      <td>{h.brand || "—"}</td>

                      {!concesionarioFilter && (
                        <td>
                          {h.concesionario ? (
                            <span className="conc-badge-sm">{h.concesionario}</span>
                          ) : "—"}
                        </td>
                      )}

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
                          style={{ fontSize: "12px" }}
                        >
                          {(h.status !== "Disponible" || h.available <= 0) && canReq && (
                            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>queue</span>
                          )}
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

      {/* ── PAGINACIÓN ── */}
      {!loading && totalItems > limit && (
        <div className="pagination-bar">
          <button 
            className="btn btn-secondary" 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '8px 16px' }}
          >
            <span className="material-symbols-outlined">chevron_left</span> Anterior
          </button>
          
          <div className="pagination-info">
            Página <strong>{page}</strong> de {Math.ceil(totalItems / limit)} (Total: {totalItems})
          </div>
          
          <button 
            className="btn btn-secondary" 
            disabled={page >= Math.ceil(totalItems / limit)}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '8px 16px' }}
          >
            Siguiente <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}

      {/* ── MODAL SOLICITUD ── */}
      {selectedTool && (
        <div className="modal-overlay open">
          <div className="modal-box">
            <div className="modal-header">
              <h3>{selectedTool.status === "Disponible" && selectedTool.available > 0 ? "Confirmar Solicitud" : "Entrar en Cola de Espera"}</h3>
              <button className="close-btn" onClick={() => setSelectedTool(null)}>×</button>
            </div>
            <div className="modal-body">
              {(selectedTool.status !== "Disponible" || selectedTool.available <= 0) && (
                <div className="alert-banner alert-info" style={{ marginBottom: "16px" }}>
                  <span className="material-symbols-outlined">info</span>
                  Esta herramienta está <strong>{selectedTool.status}</strong>. Tu solicitud quedará en cola.
                </div>
              )}
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
                <textarea placeholder="Ej. Cambio de bujías vehículo Corolla placa XXX..." value={reason} onChange={e => setReason(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Fecha Estimada de Retorno</label>
                <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
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

      {/* ── MODAL FICHA ── */}
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
                    {detailTool.imageUrl && (
                      <div className="tool-detail-img">
                        <img 
                          src={detailTool.imageUrl} 
                          alt={detailTool.description} 
                          onClick={() => setExpandedImage(detailTool.imageUrl)}
                          style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          title="Click para expandir"
                        />
                      </div>
                    )}
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
                        <div>
                          <span>Estado</span>
                          <span className="status-badge" style={{ background: getStatusColor(detailTool.status) + "22", color: getStatusColor(detailTool.status) }}>
                            {detailTool.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {detailHistory.length > 0 && (
                    <div className="tool-history-mini">
                      <h5><span className="material-symbols-outlined">history</span> Últimos movimientos</h5>
                      <table>
                        <thead><tr><th>Acción</th><th>Por</th><th>Fecha</th><th>Notas</th></tr></thead>
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

      {/* ── MODAL IMAGEN EXPANDIDA ── */}
      {expandedImage && (
        <div 
          className="modal-overlay open" 
          onClick={() => setExpandedImage(null)}
          style={{ zIndex: 9999, padding: '20px', cursor: 'zoom-out' }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button 
              className="icon-btn" 
              onClick={() => setExpandedImage(null)}
              style={{ position: 'absolute', top: '-40px', right: 0, color: 'white', background: 'rgba(0,0,0,0.5)', borderRadius: '50%' }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <img 
              src={expandedImage} 
              alt="Herramienta expandida" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '90vh', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
