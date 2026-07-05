"use client";

import { useEffect, useState } from "react";

export default function Dashboard({ session }: { session: any }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/inventory/dashboard", {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (session) fetchDashboard();
  }, [session]);

  return (
    <div className="tab-section active">
      <div className="metrics-grid">
        <div className="metric-card total">
            <h3>Total Herramientas</h3>
            <p>{data?.total || 0}</p>
        </div>
        <div className="metric-card disponible">
            <h3>Disponibles</h3>
            <p>{data?.disponible || 0}</p>
        </div>
        <div className="metric-card prestada">
            <h3>Prestadas</h3>
            <p>{data?.prestada || 0}</p>
        </div>
        <div className="metric-card mantenimiento">
            <h3>En Mantenimiento</h3>
            <p>{data?.mantenimiento || 0}</p>
        </div>
        <div className="metric-card extraviada">
            <h3>Extraviadas</h3>
            <p>{data?.extraviada || 0}</p>
        </div>
        <div className="metric-card pendientes-alerta">
            <h3>Sol. Pendientes</h3>
            <p>{data?.pendientes || 0}</p>
        </div>
      </div>

      <div className="dashboard-panels">
        <div className="panel notifications-panel">
            <div className="panel-header">
                <span className="material-symbols-outlined text-blue">notifications</span>
                <h2>Centro de Notificaciones</h2>
            </div>
            <div className="panel-body list-flow">
                {/* Aqui irán las notificaciones */}
                <div className="notification-item" style={{textAlign: 'center', color: 'var(--text-muted)', border: 'none'}}>
                    <p>Las notificaciones se cargarán aquí.</p>
                </div>
            </div>
        </div>

        <div className="panel history-panel">
            <div className="panel-header">
                <span className="material-symbols-outlined">history</span>
                <h2>Últimos Movimientos Registrados</h2>
            </div>
            <div className="panel-body table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Herramienta</th>
                            <th>Solicitante</th>
                            <th>Fecha Solicitud</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colSpan={4} style={{textAlign: 'center', color: 'var(--text-muted)'}}>No hay movimientos recientes.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}
