"use client";

import { useState, useEffect } from "react";
import AuthModal from "@/components/AuthModal";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import Catalog from "@/components/Catalog";
import Importar from "@/components/Importar";
import Supervision from "@/components/Supervision";
import Profile from "@/components/Profile";
import History from "@/components/History";
import Concesionarios from "@/components/Concesionarios";
import Reportes from "@/components/Reportes";
import NotificationsPanel from "@/components/NotificationsPanel";
import { supabase } from "@/lib/supabase";

import dynamic from "next/dynamic";
const AdminPanel = dynamic(() => import("@/components/AdminPanel"), { ssr: false });

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: authListener } = supabase?.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setCurrentTab("dashboard");
    }) || { data: null };

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const handleLogout = async () => {
    await supabase?.auth.signOut();
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="material-symbols-outlined spinning" style={{ fontSize: "48px" }}>sync</span>
        <p>Cargando sistema...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthModal onLogin={setSession} />;
  }

  const userRole = session?.user?.app_metadata?.role || "tecnico";
  const canManage = ["admin", "supervisor", "jefe_taller", "almacenista"].includes(userRole);
  const canReport = ["admin", "supervisor", "jefe_taller", "auditor"].includes(userRole);
  const canImport = ["admin", "supervisor", "almacenista"].includes(userRole);

  const renderContent = () => {
    switch (currentTab) {
      case "dashboard":   return <Dashboard session={session} />;
      case "catalogo":    return <Catalog session={session} />;
      case "concesionarios": return <Concesionarios session={session} />;
      case "historial":   return <History session={session} />;
      case "notificaciones": return <NotificationsPanel session={session} onUnreadCountChange={setUnreadCount} />;
      case "supervision": return canManage ? <Supervision session={session} /> : <Dashboard session={session} />;
      case "reportes":    return canReport ? <Reportes session={session} /> : <Dashboard session={session} />;
      case "importar":    return canImport ? <Importar session={session} /> : <Dashboard session={session} />;
      case "admin":       return userRole === "admin" ? <AdminPanel session={session} /> : <Dashboard session={session} />;
      case "perfil":      return <Profile session={session} />;
      default:            return <Dashboard session={session} />;
    }
  };

  return (
    <div className={`app-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        currentTab={currentTab}
        setTab={setCurrentTab}
        onLogout={handleLogout}
        session={session}
        unreadCount={unreadCount}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Floating notification FAB */}
      <button
        className={`notif-fab ${currentTab === "notificaciones" ? "active" : ""}`}
        onClick={() => setCurrentTab("notificaciones")}
        title="Notificaciones"
        id="nav-notificaciones"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && <span className="notif-fab-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}
