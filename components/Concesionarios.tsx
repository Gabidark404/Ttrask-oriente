"use client";

import { useEffect, useState } from "react";

interface ConcesionariosProps {
  session: any;
}

export default function Concesionarios({ session }: ConcesionariosProps) {
  const [concesionarios, setConcesionarios] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("all");
  const [tools, setTools] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  // Add concesionario modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newColor, setNewColor] = useState("#3B82F6");

  // Request modal
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const userRole = session?.user?.app_metadata?.role || "tecnico";
  const canManage = ["admin", "supervisor"].includes(userRole);

  const headers = { Authorization: `Bearer ${session?.access_token}` };

  const fetchConcesionarios = async () => {
    try {
      const res = await fetch("/api/concesionarios", { headers });
      if (res.ok) {
        const json = await res.json();
        setConcesionarios(json.data || []);
        // Pre-fetch stats for all
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
    setLoading(false);
  };

  const fetchTools = async (concesionario: string) => {
    setToolsLoading(true);
    try {
      const params = new URLSearchParams();
      if (concesionario !== "all") params.set("concesionario", concesionario);
      if (search) params.set("search", search);
      if (statusFilter !== "Todos") params.set("status", statusFilter);
      params.set("limit", "100");

      const res = await fetch(`/api/inventory?${params}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setTools(json.data || []);
      }
    } catch {}
    setToolsLoading(false);
  };

  useEffect(() => {
    if (session) fetchConcesionarios();
  }, [session]);

  useEffect(() => {
    if (session) fetchTools(selected);
  }, [selected, search, statusFilter]);

  const handleAddConcesionario = async () => {
    if (!newName || !newCode) return alert("Nombre y código son obligatorios");
    try {
      const res = await fetch("/api/concesionarios", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, code: newCode, color: newColor }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewName(""); setNewCode(""); setNewColor("#3B82F6");
        fetchConcesionarios();
      } else {
        const err = await res.json();
        alert(err.error || "Error al crear concesionario");
      }
    } catch { alert("Error de conexión"); }
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
        setSelectedTool(null);
        setReason("");
        setReturnDate("");
        fetchTools(selected);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Error al solicitar");
      }
    } catch { alert("Error de conexión"); }
    setSubmitting(false);
  };

  const canRequest = (tool: any) => !["Extraviada", "Fuera de servicio"].includes(tool.status);

  const getRequestLabel = (tool: any) => {
    if (tool.status === "Disponible" && tool.available > 0) return "Solicitar";
    if (canRequest(tool)) return "En cola";
    return "No disp.";
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      "Disponible": "var(--color-disponible)",
      "Prestada": "var(--color-prestada)",
      "Reservada": "var(--color-reservada)",
      "En mantenimiento": "var(--color-mantenimiento)",
      "Extraviada": "var(--color-extraviada)",
      "Fuera de servicio": "var(--color-fuera)",
    };
    return (
      <span className="status-badge" style={{ background: (colors[status] || "#ccc") + "22", color: colors[status] || "#666", border: `1px solid ${colors[status] || "#ccc"}40` }}>
        {status}
      </span>
    );
  };

  return (
    <div className="tab-section active">
      <div className="section-title-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>Organización por Concesionario</h2>
          <p>Visualiza el inventario segmentado por concesionario. Selecciona uno para ver sus herramientas.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} id="btn-add-concesionario">
            <span className="material-symbols-outlined">add_business</span>
            Nuevo Concesionario
          </button>
        )}
      </div>

      {/* Tarjetas de concesionarios */}
      {loading ? (
        <div className="loading-state">
          <span className="material-symbols-outlined spinning">sync</span>
          Cargando concesionarios...
        </div>
      ) : (
        <div className="concesionarios-grid">
          {/* Tarjeta "Todos" */}
          <div
            className={`concesionario-card ${selected === "all" ? "selected" : ""}`}
            onClick={() => setSelected("all")}
            id="card-all-concesionarios"
          >
            <div className="conc-color-bar" style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)" }} />
            <div className="conc-body">
              <div className="conc-name">Todos los Concesionarios</div>
              <div className="conc-stats">
                {Object.values(stats).reduce((acc, s) => ({ total: acc.total + (s.total || 0) }), { total: 0 }).total} herramientas
              </div>
            </div>
          </div>

          {concesionarios.map((c) => {
            const s = stats[c.name] || {};
            return (
              <div
                key={c.id}
                className={`concesionario-card ${selected === c.name ? "selected" : ""}`}
                onClick={() => setSelected(c.name)}
                id={`card-conc-${c.code}`}
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

      {/* Filtros del inventario */}
      <div className="filter-bar" style={{ marginTop: "24px" }}>
        <div className="search-box">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Buscar herramienta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="select-box">
          <label>Estado:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Disponible">Disponible</option>
            <option value="Prestada">Prestada</option>
            <option value="Reservada">Reservada</option>
            <option value="En mantenimiento">En mantenimiento</option>
            <option value="Extraviada">Extraviada</option>
          </select>
        </div>
      </div>

      {/* Tabla de herramientas */}
      <div className="table-container shadow-sm" style={{ marginTop: "16px" }}>
        {toolsLoading ? (
          <div style={{ padding: "30px", textAlign: "center" }}>
            <span className="material-symbols-outlined spinning">sync</span>
            Cargando inventario...
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="text-center">FOTO</th>
                <th>CÓDIGO</th>
                <th>DESCRIPCIÓN</th>
                <th>MARCA</th>
                <th>ÁREA</th>
                <th>RESPONSABLE</th>
                <th>ESTADO</th>
                <th className="text-center">ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {tools.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                    No se encontraron herramientas en este concesionario.
                  </td>
                </tr>
              ) : (
                tools.map((t) => (
                  <tr key={t.id}>
                    <td className="text-center">
                      {t.imageUrl ? (
                        <img src={t.imageUrl} alt={t.description} className="tool-thumb-cell" />
                      ) : (
                        <div className="tool-thumb-placeholder">
                          <span className="material-symbols-outlined">construction</span>
                        </div>
                      )}
                    </td>
                    <td><strong className="font-mono">{t.code.startsWith("__NO_CODE__") ? "S/C" : t.code}</strong></td>
                    <td><strong style={{ color: "var(--primary-dark)", fontSize: "13px" }}>{t.description}</strong></td>
                    <td>{t.brand || "—"}</td>
                    <td>{t.area || "—"}</td>
                    <td>{t.responsible || "—"}</td>
                    <td>{getStatusBadge(t.status)}</td>
                    <td className="text-center">
                      <button
                        className={`btn ${canRequest(t) ? (t.status === "Disponible" && t.available > 0 ? "btn-primary" : "btn-outline-queue") : "btn-secondary"}`}
                        disabled={!canRequest(t)}
                        onClick={() => canRequest(t) && setSelectedTool(t)}
                        style={{ fontSize: "12px", padding: "5px 10px" }}
                      >
                        {getRequestLabel(t)}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal para agregar concesionario */}
      {showAddModal && (
        <div className="modal-overlay open">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Nuevo Concesionario</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" placeholder="Ej. Honda" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Código (3 letras)</label>
                <input type="text" placeholder="Ej. HON" maxLength={5} value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} />
              </div>
              <div className="form-group">
                <label>Color de identificación</label>
                <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} style={{ width: "60px", height: "40px", border: "none", cursor: "pointer" }} />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleAddConcesionario} id="btn-save-concesionario">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request modal */}
      {selectedTool && (
        <div className="modal-overlay open">
          <div className="modal-box">
            <div className="modal-header">
              <h3>{selectedTool.status === "Disponible" && selectedTool.available > 0 ? "Solicitar Herramienta" : "Entrar en Cola"}</h3>
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
                {selectedTool.imageUrl && <img src={selectedTool.imageUrl} alt={selectedTool.description} className="tool-thumb" />}
                <div>
                  <div className="tool-title">{selectedTool.description}</div>
                  <div className="tool-meta">Código: {selectedTool.code.startsWith("__NO_CODE__") ? "S/C" : selectedTool.code} · Marca: {selectedTool.brand || "—"}</div>
                </div>
              </div>
              <div className="form-group">
                <label>Motivo de Uso *</label>
                <textarea placeholder="Ej. Cambio de bujías..." value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Fecha Estimada de Retorno</label>
                <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setSelectedTool(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleRequestSubmit} disabled={submitting}>
                  {submitting ? "Enviando..." : "Enviar Solicitud"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
