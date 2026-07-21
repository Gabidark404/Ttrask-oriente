"use client";

import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";

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
        
        const notifRes = await fetch("/api/notifications?limit=5", { headers });
        if (notifRes.ok) {
          const nJson = await notifRes.json();
          setNotifications(nJson.data || []);
        }

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

  if (loading) {
    return <div className="tab-section active">Cargando...</div>;
  }

  const renderKPIs = () => {
    if (userRole === "supervisor") {
      const total = data?.total || 0;
      const disponibles = data?.disponibles || 0;
      const prestadas = data?.prestadas || 0;
      const extraviadas = data?.extraviadas || 0;

      return (
        <div className="metrics-grid">
          <div className="metric-card total" style={{ backgroundColor: 'white', borderColor: 'var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined">build</span>
                <h3 style={{ color: 'var(--text-muted)' }}>Total Herramientas</h3>
              </div>
              <p style={{ color: 'var(--primary-dark)', fontSize: '2rem' }}>{total}</p>
              <span style={{ color: 'var(--text-muted)' }}>100% del inventario</span>
          </div>
          <div className="metric-card disponible" style={{ backgroundColor: 'white', borderColor: 'var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#10B981' }}>check_circle</span>
                <h3 style={{ color: 'var(--text-muted)' }}>Disponibles</h3>
              </div>
              <p style={{ color: 'var(--primary-dark)', fontSize: '2rem' }}>{disponibles}</p>
              <span style={{ color: '#10B981' }}>{total ? ((disponibles/total)*100).toFixed(1) : 0}% del total</span>
          </div>
          <div className="metric-card prestada" style={{ backgroundColor: 'white', borderColor: 'var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#F59E0B' }}>handshake</span>
                <h3 style={{ color: 'var(--text-muted)' }}>Prestadas</h3>
              </div>
              <p style={{ color: 'var(--primary-dark)', fontSize: '2rem' }}>{prestadas}</p>
              <span style={{ color: '#F59E0B' }}>{total ? ((prestadas/total)*100).toFixed(1) : 0}% del total</span>
          </div>
          <div className="metric-card extraviada" style={{ backgroundColor: 'white', borderColor: 'var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#EF4444' }}>warning</span>
                <h3 style={{ color: 'var(--text-muted)' }}>Extraviadas</h3>
              </div>
              <p style={{ color: 'var(--primary-dark)', fontSize: '2rem' }}>{extraviadas}</p>
              <span style={{ color: '#EF4444' }}>{total ? ((extraviadas/total)*100).toFixed(1) : 0}% del total</span>
          </div>
        </div>
      );
    } else {
      return (
        <div className="metrics-grid">
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
        </div>
      );
    }
  };

  const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#F97316', '#EF4444', '#6B7280'];

  return (
    <div className="tab-section active">
      <div className="section-title-card">
        <h2>Dashboard de Control</h2>
      </div>

      {renderKPIs()}

      {userRole === "supervisor" && data && (
        <div className="dashboard-charts-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px',
          marginTop: '24px'
        }}>
          {/* Status Distribution */}
          <div className="panel" style={{ backgroundColor: 'white', borderColor: 'var(--border-color)' }}>
            <div className="panel-header">
              <span className="material-symbols-outlined text-blue">pie_chart</span>
              <h2>Distribución por Estado</h2>
            </div>
            <div className="panel-body" style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusDistribution || []}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(data.statusDistribution || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Request Trend */}
          <div className="panel" style={{ backgroundColor: 'white', borderColor: 'var(--border-color)' }}>
            <div className="panel-header">
              <span className="material-symbols-outlined text-blue">trending_up</span>
              <h2>Tendencia de Solicitudes (30 Días)</h2>
            </div>
            <div className="panel-body" style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.requestTrend || []}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#3B82F6" fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Requested Tools */}
          <div className="panel" style={{ backgroundColor: 'white', borderColor: 'var(--border-color)' }}>
            <div className="panel-header">
              <span className="material-symbols-outlined text-blue">bar_chart</span>
              <h2>Top 10 Herramientas más Solicitadas</h2>
            </div>
            <div className="panel-body" style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topRequested || []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                  <XAxis type="number" />
                  <YAxis dataKey="description" type="category" width={120} tick={{fontSize: 11}} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Return Rate & Concesionarios */}
          <div className="panel" style={{ backgroundColor: 'white', borderColor: 'var(--border-color)' }}>
            <div className="panel-header">
              <span className="material-symbols-outlined text-blue">analytics</span>
              <h2>Tasa de Devolución y Sucursales</h2>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                <div style={{ 
                  width: '120px', height: '120px', borderRadius: '50%', 
                  border: '8px solid #10B981', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', flexDirection: 'column'
                }}>
                  <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-dark)' }}>
                    {data.returnRate || 0}%
                  </span>
                </div>
                <div>
                  <h3 style={{ color: 'var(--text-muted)' }}>Tasa de Devolución</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Herramientas devueltas vs prestadas</p>
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <h3 style={{ color: 'var(--text-muted)', marginBottom: '10px', fontSize: '0.9rem', textTransform: 'uppercase' }}>Por Concesionario</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(data.concesionarioStats || []).map((c: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: 'var(--bg-light)', borderRadius: '6px' }}>
                      <span style={{ fontWeight: '500' }}>{c.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{c.disponibles} / {c.total} disp.</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications and History */}
      <div className="dashboard-panels" style={{ marginTop: '24px' }}>
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
                                <td>{r.toolName || (r.tools ? r.tools.description : 'Desconocida')}</td>
                                <td>{r.user || r.requested_by}</td>
                                <td>{new Date(r.requestDate || r.request_date).toLocaleDateString()}</td>
                                <td>
                                  <span style={{
                                    color: (r.status === 'Aprobada' || r.status === 'Devuelta') ? '#10B981' : (r.status === 'Rechazada' || r.status === 'Extraviada') ? '#EF4444' : '#F59E0B',
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
