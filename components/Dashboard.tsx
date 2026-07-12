"use client";

import { useEffect, useState } from "react";

export default function Dashboard({ session }: { session: any }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const headers = { Authorization: `Bearer ${session?.access_token}` };
        const res = await fetch("/api/inventory/dashboard", { headers });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
        
        // Cargar notificaciones
        const notifRes = await fetch("/api/notifications?limit=5", { headers });
        if (notifRes.ok) {
          const nJson = await notifRes.json();
          setNotifications(nJson.data || []);
        }

        // Cargar historial
        const reqRes = await fetch("/api/requests?limit=5", { headers });
        if (reqRes.ok) {
          const rJson = await reqRes.json();
          setRecentRequests(rJson.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (session) fetchDashboard();
  }, [session]);

  const userRole = session?.user?.app_metadata?.role || "tecnico";

  return (
    <div className="tab-section active">
      <div className="metrics-grid">
        {userRole === "supervisor" ? (
          <>
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
            <div className="metric-card mantenimiento">
                <h3>En Cola</h3>
                <p>{data?.en_cola || 0}</p>
            </div>
            <div className="metric-card disponible">
                <h3>Préstamos Activos</h3>
                <p>{data?.prestamos_activos || 0}</p>
            </div>
          </>
        ) : (
          <>
            <div className="metric-card total">
                <h3>Mis Préstamos Activos</h3>
                <p>{data?.misPrestamos || 0}</p>
            </div>
            <div className="metric-card pendientes-alerta">
                <h3>Mis Solicitudes Pendientes</h3>
                <p>{data?.misPendientes || 0}</p>
            </div>
            <div className="metric-card extraviada">
                <h3>Solicitudes Rechazadas</h3>
                <p>{data?.misRechazadas || 0}</p>
            </div>
            <div className="metric-card disponible">
                <h3>Total Histórico (Aprobadas)</h3>
                <p>{data?.misHistorico || 0}</p>
            </div>
          </>
        )}
      </div>

      <div className="dashboard-panels">
        <div className="panel notifications-panel">
            <div className="panel-header">
                <span className="material-symbols-outlined text-blue">notifications</span>
                <h2>Centro de Notificaciones</h2>
            </div>
            <div className="panel-body list-flow">
                {notifications.length === 0 ? (
                  <div className="notification-item" style={{textAlign: 'center', color: 'var(--text-muted)', border: 'none'}}>
                      <p>No hay notificaciones recientes.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div className="notification-item" key={n.id}>
                        <p>{n.message}</p>
                        <div className="notification-meta">
                            <span>Por: {n.created_by}</span>
                            <span>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                  ))
                )}
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
                        {recentRequests.length === 0 ? (
                          <tr>
                              <td colSpan={4} style={{textAlign: 'center', color: 'var(--text-muted)'}}>No hay movimientos recientes.</td>
                          </tr>
                        ) : (
                          recentRequests.map((r) => (
                            <tr key={r.id}>
                                <td>{r.toolName}</td>
                                <td>{r.user}</td>
                                <td>{new Date(r.requestDate).toLocaleDateString()}</td>
                                <td>
                                  <span style={{
                                    color: r.status === 'Aprobada' ? '#10B981' : r.status === 'Rechazada' ? '#EF4444' : '#F59E0B',
                                    fontWeight: 'bold'
                                  }}>
                                    {r.status}
                                  </span>
                                </td>
                            </tr>
                          ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}
