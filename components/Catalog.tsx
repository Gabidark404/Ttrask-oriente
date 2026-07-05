"use client";

import { useEffect, useState } from "react";

export default function Catalog({ session }: { session: any }) {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const fetchTools = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "Todos") params.append("status", statusFilter);

      const res = await fetch(`/api/inventory?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setTools(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchTools();
  }, [session, search, statusFilter]);

  const getStatusBadge = (status: string) => {
    const s = status.replace(" ", "");
    return <span className={`status-dot status-${s}`}>🟢 {status}</span>;
  };

  return (
    <div className="tab-section active">
      <div className="filter-bar">
          <div className="search-box">
              <span className="material-symbols-outlined">search</span>
              <input 
                type="text" 
                placeholder="Buscar por Nombre, Marca, Código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
          </div>
          <div className="select-box">
              <label>Estado:</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="Todos">Todos los Estados</option>
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
             <div style={{padding: '30px', textAlign: 'center'}}>Cargando inventario...</div>
          ) : (
            <table>
                <thead>
                    <tr>
                        <th className="text-center">ITEM</th>
                        <th>CÓDIGO / CODIF.</th>
                        <th>DESCRIPCIÓN Y MEDIDA</th>
                        <th>MARCA</th>
                        <th className="text-center">CANT. DISP.</th>
                        <th>ESTADO</th>
                        <th className="text-center">ACCIÓN</th>
                    </tr>
                </thead>
                <tbody>
                    {tools.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center" style={{color: 'var(--text-muted)', padding: '30px'}}>
                          No se encontraron herramientas en el almacén con esos criterios.
                        </td>
                      </tr>
                    ) : (
                      tools.map((h, index) => (
                        <tr key={h.id}>
                            <td className="text-center" style={{fontWeight: 'bold', color: 'var(--text-muted)'}}>
                              {index + 1}
                            </td>
                            <td>
                              <strong>{h.code.startsWith('__NO_CODE__') ? 'S/C' : h.code}</strong><br/>
                              <span className="font-mono">{h.code.startsWith('__NO_CODE__') ? '-' : h.code}</span>
                            </td>
                            <td>
                              <strong style={{color: 'var(--primary-dark)', fontSize: '13px'}}>
                                {h.description}
                              </strong>
                            </td>
                            <td>{h.brand || '-'}</td>
                            <td className="text-center" style={{fontSize: '13px', fontWeight: 'bold'}}>
                              {h.available} <span style={{color: 'var(--text-muted)', fontSize: '11px', fontWeight: 'normal'}}>/ {h.quantity}</span>
                            </td>
                            <td>{getStatusBadge(h.status)}</td>
                            <td className="text-center">
                                <button 
                                  className="btn btn-primary" 
                                  disabled={h.available === 0 || h.status !== 'Disponible'}
                                >
                                    Solicitar
                                </button>
                            </td>
                        </tr>
                      ))
                    )}
                </tbody>
            </table>
          )}
      </div>
    </div>
  );
}
