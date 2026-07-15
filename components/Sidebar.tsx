"use client";

import { useState } from "react";

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onLogout: () => void;
  unreadCount?: number;
  session?: any;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ currentTab, setTab, onLogout, unreadCount = 0, session, collapsed, onToggle }: SidebarProps) {
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

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Logo */}
      <div className="sidebar-logo" onClick={() => setTab("dashboard")}>
        <div className="sidebar-logo-icon">
          <span className="material-symbols-outlined">build</span>
        </div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <h1>TTRAKS</h1>
            <p>{ROLE_LABELS[userRole] || userRole}</p>
          </div>
        )}
      </div>

      {/* Toggle button */}
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
              onClick={() => setTab(item.id)}
              title={collapsed ? item.label : undefined}
              id={`nav-${item.id}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {!collapsed && <span className="sidebar-label">{item.label}</span>}
            </button>
          ))}
        </div>

        <div className="sidebar-nav-bottom">
          <div className="sidebar-divider" />
          {bottomItems.filter(i => i.show).map(item => (
            <button
              key={item.id}
              className={`sidebar-btn ${currentTab === item.id ? "active" : ""}`}
              onClick={() => setTab(item.id)}
              title={collapsed ? item.label : undefined}
              id={`nav-${item.id}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {!collapsed && <span className="sidebar-label">{item.label}</span>}
            </button>
          ))}
          <button
            className="sidebar-btn sidebar-btn-logout"
            onClick={onLogout}
            title={collapsed ? "Cerrar sesión" : undefined}
            id="nav-logout"
          >
            <span className="material-symbols-outlined">logout</span>
            {!collapsed && <span className="sidebar-label">Salir</span>}
          </button>
        </div>
      </nav>
    </aside>
  );
}
