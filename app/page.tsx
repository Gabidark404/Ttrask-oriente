"use client";

import { useState, useEffect } from "react";
import AuthModal from "@/components/AuthModal";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import Catalog from "@/components/Catalog";
import Importar from "@/components/Importar";
import Supervision from "@/components/Supervision";
import Profile from "@/components/Profile";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("dashboard");

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

  const handleLogout = async () => {
    await supabase?.auth.signOut();
  };

  if (loading) {
    return <div className="loading-screen">Cargando sistema...</div>;
  }

  if (!session) {
    return <AuthModal onLogin={setSession} />;
  }

  const renderContent = () => {
    const userRole = session?.user?.app_metadata?.role || "tecnico";

    switch (currentTab) {
      case "dashboard":
        return <Dashboard session={session} />;
      case "catalogo":
        return <Catalog session={session} />;
      case "importar":
        return userRole === "supervisor" ? <Importar session={session} /> : <Dashboard session={session} />;
      case "supervision":
        return userRole === "supervisor" ? <Supervision session={session} /> : <Dashboard session={session} />;
      case "perfil":
        return <Profile session={session} />;
      default:
        return <Dashboard session={session} />;
    }
  };

  return (
    <>
      <Header
        currentTab={currentTab}
        setTab={setCurrentTab}
        onLogout={handleLogout}
        session={session}
      />
      <main className="main-content">
        {renderContent()}
      </main>
      <footer className="main-footer">
        TTRAKS ORIENTE ©️ 2026 · Sistema Integrado de Control de Herramientas para Concesionarios Automotrices.
      </footer>
    </>
  );
}
