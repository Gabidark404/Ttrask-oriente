"use client";

import { useEffect, useState } from "react";

interface HistoryProps {
  session: any;
}

const ACTION_COLORS: Record<string, string> = {
  "Prestamo": "#F59E0B",
  "Devolucion": "#10B981",
  "En cola": "#3B82F6",
  "Reserva cancelada": "#EF4444",
  "Mantenimiento": "#F97316",
  "Baja": "#6B7280",
  "Alta": "#8B5CF6",
  "Actualizacion": "#64748B",
};

const ACTION_ICONS: Record<string, string> = {
  "Prestamo": "output",
  "Devolucion": "input",
  "En cola": "queue",
  "Reserva cancelada": "cancel",
  "Mantenimiento": "build",
  "Baja": "delete",
  "Alta": "add_circle",
  "Actualizacion": "edit",
};

export default function History({ session }: HistoryProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const LIMIT = 20;

  // Filters
  const [filterAction, setFilterAction] = useState("");
  const [filterConcesionario, setFilterConcesionario] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [concesionarios, setConcesionarios] = useState<any[]>([]);

  const fetchHistory = async (pageNum = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(LIMIT));
      params.set("offset", String(pageNum * LIMIT));
      if (filterAction) params.set("action", filterAction);
      if (filterConcesionario) params.set("concesionario", filterConcesionario);
      if (filterDateFrom) params.set("date_from", filterDateFrom);
      if (filterDateTo) params.set("date_to", filterDateTo);
      if (filterUser) params.set("performed_by", filterUser);

      const res = await fetch(`/api/history?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setHistory(json.data || []);
        setTotal(json.pagination?.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConcesionarios = async () => {
    try {
      const res = await fetch("/api/concesionarios", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setConcesionarios(json.data || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (session) {
      fetchConcesionarios();
      fetchHistory(0);
    }
  }, [session]);

  const handleFilter = () => {
    setPage(0);
    fetchHistory(0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchHistory(newPage);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="tab-section active">
      <div className="section-title-card">
        <h2>Historial de Movimientos</h2>
        <p>Registro completo de préstamos, devoluciones, mantenimientos y cambios del inventario.</p>
      </div>

      {/* Filtros */}
      <div className="filter-bar history-filters">
        <div className="select-box">
          <label>Acción:</label>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
            <option value="">Todas las acciones</option>
            <option value="Prestamo">Préstamo</option>
            <option value="Devolucion">Devolución</option>
            <option value="En cola">En cola</option>
            <option value="Reserva cancelada">Cancelada</option>
            <option value="Mantenimiento">Mantenimiento</option>
            <option value="Alta">Alta</option>
            <option value="Actualizacion">Actualización</option>
            <option value="Baja">Baja</option>
          </select>
        </div>

        <div className="select-box">
          <label>Concesionario:</label>
          <select value={filterConcesionario} onChange={(e) => setFilterConcesionario(e.target.value)}>
            <option value="">Todos</option>
            {concesionarios.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="select-box">
          <label>Desde:</label>
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
        </div>

        <div className="select-box">
          <label>Hasta:</label>
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
        </div>

        <div className="search-box" style={{ flex: 1 }}>
          <span className="material-symbols-outlined">person_search</span>
          <input
            type="text"
            placeholder="Buscar por responsable..."
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" onClick={handleFilter} id="btn-filter-history">
          <span className="material-symbols-outlined">filter_list</span>
          Filtrar
        </button>
      </div>

      {/* Stats rápidas */}
      <div className="history-stats">
        <span className="history-stat-chip">
          <span className="material-symbols-outlined">list</span>
          {total} registros totales
        </span>
        {filterConcesionario && (
          <span className="history-stat-chip concesionario-chip">
            <span className="material-symbols-outlined">business</span>
            {filterConcesionario}
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="history-timeline">
        {loading ? (
          <div className="loading-state">
            <span className="material-symbols-outlined spinning">sync</span>
            Cargando historial...
          </div>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">history_toggle_off</span>
            <p>No se encontraron registros con esos criterios.</p>
          </div>
        ) : (
          history.map((entry) => {
            const color = ACTION_COLORS[entry.action] || "#64748B";
            const icon = ACTION_ICONS[entry.action] || "info";
            const date = new Date(entry.created_at);
            return (
              <div key={entry.id} className="history-entry">
                <div className="history-dot" style={{ backgroundColor: color }}>
                  <span className="material-symbols-outlined">{icon}</span>
                </div>
                <div className="history-content">
                  <div className="history-header">
                    <span className="history-action-badge" style={{ background: color + "20", color }}>
                      {entry.action}
                    </span>
                    <span className="history-tool-name">{entry.tool_name || "—"}</span>
                    {entry.tool_code && (
                      <span className="history-code font-mono">{entry.tool_code}</span>
                    )}
                  </div>
                  <div className="history-meta">
                    <span>
                      <span className="material-symbols-outlined">person</span>
                      {entry.performed_by}
                    </span>
                    {entry.concesionario && (
                      <span>
                        <span className="material-symbols-outlined">business</span>
                        {entry.concesionario}
                      </span>
                    )}
                    {entry.area && (
                      <span>
                        <span className="material-symbols-outlined">location_on</span>
                        {entry.area}
                      </span>
                    )}
                    <span className="history-time">
                      <span className="material-symbols-outlined">schedule</span>
                      {date.toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" })}
                      {" · "}
                      {date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="history-notes">{entry.notes}</p>
                  )}
                  {entry.evidence_url && (
                    <a
                      href={entry.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="history-evidence-link"
                    >
                      <span className="material-symbols-outlined">photo_camera</span>
                      Ver evidencia
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <button
            className="btn btn-secondary"
            disabled={page === 0}
            onClick={() => handlePageChange(page - 1)}
            id="btn-history-prev"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Anterior
          </button>
          <span className="pagination-info">
            Página {page + 1} de {totalPages} ({total} registros)
          </span>
          <button
            className="btn btn-secondary"
            disabled={page >= totalPages - 1}
            onClick={() => handlePageChange(page + 1)}
            id="btn-history-next"
          >
            Siguiente
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      )}
    </div>
  );
}
