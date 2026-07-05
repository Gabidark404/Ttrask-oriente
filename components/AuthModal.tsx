"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
  onLogin: (session: any) => void;
}

export default function AuthModal({ onLogin }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!supabase) {
      setError("Supabase no está configurado.");
      setLoading(false);
      return;
    }

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
    } else if (data.session) {
      onLogin(data.session);
    }
    setLoading(false);
  };

  return (
    <div className="auth-backdrop">
      <div className="auth-card">
        {/* Logo y marca */}
        <div className="auth-brand">
          <div className="auth-logo-circle">
            <span className="material-symbols-outlined">build</span>
          </div>
          <h1>TTRAKS ORIENTE</h1>
          <p>Control de Herramientas · Departamento de Servicio</p>
        </div>

        {/* Separador */}
        <div className="auth-divider"></div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="auth-form">
          <h2>Iniciar Sesión</h2>

          {error && (
            <div className="auth-error">
              <span className="material-symbols-outlined" style={{fontSize: '16px'}}>error</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Email corporativo</label>
            <div className="auth-input-wrapper">
              <span className="material-symbols-outlined auth-input-icon">mail</span>
              <input
                type="email"
                placeholder="usuario@concesionario.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="auth-input-wrapper">
              <span className="material-symbols-outlined auth-input-icon">lock</span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <span className="material-symbols-outlined auth-spinner">sync</span>
            ) : (
              <>
                <span className="material-symbols-outlined">login</span>
                Ingresar al Sistema
              </>
            )}
          </button>
        </form>

        <p className="auth-footer-text">
          Sistema exclusivo para personal autorizado del concesionario.
        </p>
      </div>
    </div>
  );
}
