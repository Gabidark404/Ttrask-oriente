"use client";

interface HeaderProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onLogout: () => void;
  unreadCount?: number;
  session?: any;
}

export default function Header({ currentTab, setTab, onLogout, unreadCount = 0, session }: HeaderProps) {
  const userRole = session?.user?.app_metadata?.role || "tecnico";

  const canManage = ["admin", "supervisor", "jefe_taller", "almacenista"].includes(userRole);
  const canReport = ["admin", "supervisor", "jefe_taller", "auditor"].includes(userRole);
  const canImport = ["admin", "supervisor", "almacenista"].includes(userRole);
  const isAdmin = userRole === "admin";

  const ROLE_LABELS: Record<string, string> = {
    admin: "Administrador",
    supervisor: "Supervisor",
    jefe_taller: "Jefe de Taller",
    almacenista: "Almacenista",
    tecnico: "Técnico",
    auditor: "Auditor",
  };

  return (
    <header className="main-header">
      <div className="logo-area">
        <div className="logo-icon">
          <span className="material-symbols-outlined">build</span>
        </div>
        <div>
          <h1>TTRAKS ORIENTE</h1>
          <p>Control de Herramientas · {ROLE_LABELS[userRole] || userRole}</p>
        </div>
      </div>

      <nav className="main-nav">
        <button className={`nav-btn ${currentTab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")} id="nav-dashboard">
          <span className="material-symbols-outlined">analytics</span> Dashboard
        </button>

        <button className={`nav-btn ${currentTab === "catalogo" ? "active" : ""}`} onClick={() => setTab("catalogo")} id="nav-catalogo">
          <span className="material-symbols-outlined">construction</span> Catálogo
        </button>

        <button className={`nav-btn ${currentTab === "concesionarios" ? "active" : ""}`} onClick={() => setTab("concesionarios")} id="nav-concesionarios">
          <span className="material-symbols-outlined">business</span> Concesionarios
        </button>

        <button className={`nav-btn ${currentTab === "historial" ? "active" : ""}`} onClick={() => setTab("historial")} id="nav-historial">
          <span className="material-symbols-outlined">history</span> Historial
        </button>

        {canManage && (
          <button className={`nav-btn ${currentTab === "supervision" ? "active" : ""}`} onClick={() => setTab("supervision")} id="nav-supervision">
            <span className="material-symbols-outlined">verified_user</span> Gestión
          </button>
        )}

        {canReport && (
          <button className={`nav-btn ${currentTab === "reportes" ? "active" : ""}`} onClick={() => setTab("reportes")} id="nav-reportes">
            <span className="material-symbols-outlined">bar_chart</span> Reportes
          </button>
        )}

        {canImport && (
          <button className={`nav-btn ${currentTab === "importar" ? "active" : ""}`} onClick={() => setTab("importar")} id="nav-importar">
            <span className="material-symbols-outlined">upload_file</span> Importar
          </button>
        )}

        {isAdmin && (
          <button className={`nav-btn ${currentTab === "admin" ? "active" : ""}`} onClick={() => setTab("admin")} id="nav-admin">
            <span className="material-symbols-outlined">admin_panel_settings</span> Admin
          </button>
        )}

        <div style={{ flexGrow: 1 }} />

        <button className={`nav-btn notif-btn ${currentTab === "notificaciones" ? "active" : ""}`} onClick={() => setTab("notificaciones")} id="nav-notificaciones">
          <span className="material-symbols-outlined">notifications</span>
          {unreadCount > 0 && <span className="badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
        </button>

        <button className={`nav-btn ${currentTab === "perfil" ? "active" : ""}`} onClick={() => setTab("perfil")} id="nav-perfil">
          <span className="material-symbols-outlined">person</span> Mi Perfil
        </button>

        <button className="nav-btn" onClick={onLogout} style={{ marginLeft: "10px", backgroundColor: "rgba(255,255,255,0.1)" }} id="nav-logout">
          <span className="material-symbols-outlined">logout</span> Salir
        </button>
      </nav>
    </header>
  );
}
