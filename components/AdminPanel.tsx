"use client";

import { useState, useEffect } from "react";

export default function AdminPanel({ session }: { session: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al obtener usuarios");
      setUsers(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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
      </div>
    </div>
  );
}


