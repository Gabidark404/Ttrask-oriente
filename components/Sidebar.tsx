"use client";

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onLogout: () => void;
  unreadCount?: number;
  session?: any;
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ currentTab, setTab, onLogout, unreadCount = 0, session, collapsed, onToggle, isMobile, mobileOpen, onCloseMobile }: SidebarProps) {
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

  const navItems = [
    { id: "dashboard", icon: "analytics", label: "Dashboard", show: true },
    { id: "catalogo", icon: "construction", label: "Catálogo", show: true },
    { id: "historial", icon: "history", label: "Historial", show: true },
    { id: "supervision", icon: "verified_user", label: "Gestión", show: canManage },
    { id: "reportes", icon: "bar_chart", label: "Reportes", show: canReport },
    { id: "importar", icon: "upload_file", label: "Importar", show: canImport },
  ];

  const bottomItems = [
    { id: "admin", icon: "admin_panel_settings", label: "Admin", show: isAdmin },
    { id: "perfil", icon: "person", label: "Mi Perfil", show: true },
  ];

  const handleNavClick = (tabId: string) => {
    setTab(tabId);
    if (isMobile && onCloseMobile) onCloseMobile();
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("ttraks-theme", next);
  };

  const isDark = typeof window !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";

  const sidebarClasses = [
    "sidebar",
    collapsed && !isMobile ? "collapsed" : "",
    isMobile && mobileOpen ? "mobile-open" : "",
  ].filter(Boolean).join(" ");

  const showLabels = isMobile || !collapsed;

  return (
    <aside className={sidebarClasses}>
      {/* Logo */}
      <div className="sidebar-logo" onClick={() => handleNavClick("dashboard")}>
        <div className="sidebar-logo-icon">
          <span className="material-symbols-outlined">build</span>
        </div>
        {showLabels && (
          <div className="sidebar-logo-text">
            <h1>TTRAKS</h1>
            <p>{ROLE_LABELS[userRole] || userRole}</p>
          </div>
        )}
      </div>

      {/* Toggle button (hidden on mobile via CSS) */}
      <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? "Expandir menú" : "Colapsar menú"}>
        <span className="material-symbols-outlined">
          {collapsed ? "chevron_right" : "chevron_left"}
        </span>
      </button>

      {/* Main nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-main">
          {navItems.filter(i => i.show).map(item => (
            <button
              key={item.id}
              className={`sidebar-btn ${currentTab === item.id ? "active" : ""}`}
              onClick={() => handleNavClick(item.id)}
              title={!showLabels ? item.label : undefined}
              id={`nav-${item.id}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {showLabels && <span className="sidebar-label">{item.label}</span>}
            </button>
          ))}
        </div>

        <div className="sidebar-nav-bottom">
          <div className="sidebar-divider" />

          {/* Theme toggle */}
          <button className="theme-toggle-btn" onClick={toggleTheme} title={!showLabels ? "Cambiar tema" : undefined}>
            <span className="material-symbols-outlined">{isDark ? "light_mode" : "dark_mode"}</span>
            {showLabels && <span className="sidebar-label">{isDark ? "Modo Claro" : "Modo Oscuro"}</span>}
          </button>

          {bottomItems.filter(i => i.show).map(item => (
            <button
              key={item.id}
              className={`sidebar-btn ${currentTab === item.id ? "active" : ""}`}
              onClick={() => handleNavClick(item.id)}
              title={!showLabels ? item.label : undefined}
              id={`nav-${item.id}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {showLabels && <span className="sidebar-label">{item.label}</span>}
            </button>
          ))}
          <button
            className="sidebar-btn sidebar-btn-logout"
            onClick={onLogout}
            title={!showLabels ? "Cerrar sesión" : undefined}
            id="nav-logout"
          >
            <span className="material-symbols-outlined">logout</span>
            {showLabels && <span className="sidebar-label">Salir</span>}
          </button>
        </div>
      </nav>
    </aside>
  );
}
