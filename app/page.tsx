"use client";

import { useState, useEffect } from "react";
import AuthModal from "@/components/AuthModal";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import Catalog from "@/components/Catalog";
import Importar from "@/components/Importar";
import Supervision from "@/components/Supervision";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase?.auth.getSession() || { data: { session: null } };
      setSession(data.session);
      setCheckingAuth(false);
    };

    checkSession();

    const { data: authListener } = supabase?.auth.onAuthStateChange(
      (_event: string, session: any) => {
        setSession(session);
      }
    ) || { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase?.auth.signOut();
    setSession(null);
  };

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-light)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthModal onLogin={(s) => setSession(s)} />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case "dashboard":
        return <Dashboard session={session} />;
      case "catalogo":
        return <Catalog session={session} />;
      case "importar":
        return <Importar session={session} />;
      case "supervision":
        return <Supervision session={session} />;
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
