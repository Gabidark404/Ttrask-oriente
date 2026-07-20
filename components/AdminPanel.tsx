"use client";

import { useState, useEffect } from "react";

export default function AdminPanel({ session }: { session: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [concesionarios, setConcesionarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedConc, setSelectedConc] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${session?.access_token}` };
      
      const [resUsers, resConc] = await Promise.all([
        fetch("/api/admin/users", { headers }),
        fetch("/api/concesionarios", { headers })
      ]);

      const jsonUsers = await resUsers.json();
      const jsonConc = await resConc.json();

      if (!resUsers.ok) throw new Error(jsonUsers.error || "Error al obtener usuarios");
      
      setUsers(jsonUsers.data || []);
      setConcesionarios(jsonConc.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setError("");
      setSuccess("");
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al actualizar rol");
      
      setSuccess("Rol actualizado correctamente.");
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    const roles: Record<string, string> = {
      admin: "admin",
      supervisor: "supervisor",
      jefe_taller: "jefe_taller",
      almacenista: "almacenista",
      tecnico: "tecnico",
      auditor: "auditor"
    };
    return roles[role] || "tecnico";
  };

  const handleDeleteCatalog = async () => {
    if (!selectedConc) return alert("Selecciona un concesionario primero.");
    if (!confirm(`¿Estás seguro de que quieres eliminar TODO el catálogo de ${selectedConc}? Esta acción no se puede deshacer.`)) return;

    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/inventory?concesionario=${encodeURIComponent(selectedConc)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        setSelectedConc("");
      } else {
        throw new Error(data.error || "Error al eliminar el catálogo");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="tab-section active">
      <div className="section-title-card">
        <h2>Panel de Administración</h2>
        <p>Gestión de usuarios, roles y configuración del sistema. Solo accesible para el Administrador.</p>
      </div>

      {(error || success) && (
        <div style={{ marginBottom: '20px' }}>
          {error && <div className="alert-banner alert-warning"><span className="material-symbols-outlined">error</span> {error}</div>}
          {success && <div className="alert-banner alert-success"><span className="material-symbols-outlined">check_circle</span> {success}</div>}
        </div>
      )}

      <div className="admin-grid">
        {/* Gestión de Usuarios */}
        <div className="admin-card admin-card-wide">
          <div className="admin-card-header">
            <span className="material-symbols-outlined">manage_accounts</span>
            <h3>Gestión de Usuarios y Roles</h3>
          </div>
          <p>Asigna los roles a cada usuario directamente desde aquí. Los cambios se guardan automáticamente.</p>
          
          <div className="admin-roles-table" style={{ marginTop: '16px', overflowX: 'auto' }}>
            {loading ? (
              <div className="loading-state">
                <span className="material-symbols-outlined spinning">sync</span>
                <p>Cargando usuarios...</p>
              </div>
            ) : (
              <table style={{ width: '100%', minWidth: '600px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 8px' }}>Email</th>
                    <th style={{ padding: '12px 8px' }}>Fecha Registro</th>
                    <th style={{ padding: '12px 8px' }}>Rol Actual</th>
                    <th style={{ padding: '12px 8px' }}>Cambiar Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td style={{ padding: '12px 8px', fontWeight: '500' }}>{user.email}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>{user.role}</span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <select 
                          value={user.role} 
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-light)',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          <option value="admin">Administrador</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="jefe_taller">Jefe de Taller</option>
                          <option value="almacenista">Almacenista</option>
                          <option value="tecnico">Técnico</option>
                          <option value="auditor">Auditor</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '30px' }}>No se encontraron usuarios.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Gestión de Catálogos */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="material-symbols-outlined">delete_sweep</span>
            <h3>Borrar Catálogo</h3>
          </div>
          <p>Elimina permanentemente todas las herramientas asignadas a un concesionario específico.</p>
          
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Selecciona el Concesionario:
            </label>
            <select
              value={selectedConc}
              onChange={(e) => setSelectedConc(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                marginBottom: '16px'
              }}
            >
              <option value="">-- Seleccionar --</option>
              {concesionarios.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            
            <button 
              className="btn"
              onClick={handleDeleteCatalog}
              disabled={deleting || !selectedConc || loading}
              style={{ 
                width: '100%', 
                backgroundColor: (deleting || !selectedConc) ? '#FCA5A5' : '#EF4444', 
                color: 'white',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <span className={`material-symbols-outlined ${deleting ? "spinning" : ""}`}>
                {deleting ? "sync" : "warning"}
              </span>
              {deleting ? "Eliminando..." : "Eliminar Todo el Catálogo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


