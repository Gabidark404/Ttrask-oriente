"use client";

interface HeaderProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onLogout: () => void;
  pendientesCount?: number;
  session?: any;
}

export default function Header({ currentTab, setTab, onLogout, pendientesCount = 0, session }: HeaderProps) {
  const userRole = session?.user?.app_metadata?.role || "tecnico";

  return (
    <header className="main-header">
      <div className="logo-area">
        <div className="logo-icon">
          <span className="material-symbols-outlined">build</span>
        </div>
        <div>
          <h1>TTRAKS ORIENTE</h1>
          <p>Control de Herramientas · Departamento de Servicio</p>
        </div>
      </div>
      <nav className="main-nav">
        <button 
          className={`nav-btn ${currentTab === "dashboard" ? "active" : ""}`} 
          onClick={() => setTab("dashboard")}
        >
          <span className="material-symbols-outlined">analytics</span> Dashboard
        </button>
        <button 
          className={`nav-btn ${currentTab === "catalogo" ? "active" : ""}`} 
          onClick={() => setTab("catalogo")}
        >
          <span className="material-symbols-outlined">construction</span> Catálogo
        </button>
        
        {userRole === "supervisor" && (
          <>
            <button 
              className={`nav-btn ${currentTab === "importar" ? "active" : ""}`} 
              onClick={() => setTab("importar")}
            >
              <span className="material-symbols-outlined">upload_file</span> Importar Excel
            </button>
            <button 
              className={`nav-btn ${currentTab === "supervision" ? "active" : ""}`} 
              onClick={() => setTab("supervision")}
            >
              <span className="material-symbols-outlined">verified_user</span> Supervisión 
              <span className="badge">{pendientesCount}</span>
            </button>
          </>
        )}
        
        <button className="nav-btn" onClick={onLogout} style={{marginLeft: '10px', backgroundColor: 'rgba(255,255,255,0.1)'}}>
          <span className="material-symbols-outlined">logout</span> Salir
        </button>
      </nav>
    </header>
  );
}
