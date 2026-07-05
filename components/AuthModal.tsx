"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
  onLogin: (session: any) => void;
}

export default function AuthModal({ onLogin }: AuthModalProps) {
  const [view, setView] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (!supabase) {
      setError("Supabase no está configurado.");
      setLoading(false);
      return;
    }

    try {
      if (view === "login") {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginError) throw new Error("Credenciales incorrectas.");
        if (data.session) onLogin(data.session);
      } 
      else if (view === "register") {
        const { data, error: regError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (regError) throw new Error(regError.message);
        
        // El usuario se registra como 'tecnico' por defecto mediante el backend de supabase
        // pero podemos mostrar mensaje para confirmar email
        setMessage("Registro exitoso. Revisa tu correo para verificar la cuenta, o intenta iniciar sesión.");
        setView("login");
        setPassword("");
      } 
      else if (view === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        });
        if (resetError) throw new Error(resetError.message);
        setMessage("Enlace de recuperación enviado. Revisa tu correo electrónico.");
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error.");
    } finally {
      setLoading(false);
    }
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

        <div className="auth-divider"></div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="auth-form">
          <h2>
            {view === "login" && "Iniciar Sesión"}
            {view === "register" && "Crear Nueva Cuenta"}
            {view === "forgot" && "Recuperar Contraseña"}
          </h2>

          {error && (
            <div className="auth-error">
              <span className="material-symbols-outlined" style={{fontSize: '16px'}}>error</span>
              {error}
            </div>
          )}
          {message && (
            <div className="auth-success" style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', display: 'flex', gap: '8px'}}>
              <span className="material-symbols-outlined" style={{fontSize: '16px'}}>check_circle</span>
              {message}
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

          {(view === "login" || view === "register") && (
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
                  minLength={6}
                />
              </div>
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <span className="material-symbols-outlined auth-spinner">sync</span>
            ) : (
              <>
                <span className="material-symbols-outlined">
                  {view === "login" ? "login" : view === "register" ? "person_add" : "send"}
                </span>
                {view === "login" ? "Ingresar al Sistema" : view === "register" ? "Registrar Cuenta" : "Enviar Enlace"}
              </>
            )}
          </button>
        </form>

        {/* Auth Toggles */}
        <div className="auth-toggles" style={{marginTop: '20px', textAlign: 'center', fontSize: '13px'}}>
          {view === "login" ? (
            <>
              <p>¿Olvidaste tu contraseña? <span onClick={() => {setView("forgot"); setError(""); setMessage("");}} style={{color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold'}}>Recupérala aquí</span></p>
              <p style={{marginTop: '10px'}}>¿No tienes cuenta? <span onClick={() => {setView("register"); setError(""); setMessage("");}} style={{color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold'}}>Regístrate</span></p>
            </>
          ) : (
            <p>¿Ya tienes cuenta? <span onClick={() => {setView("login"); setError(""); setMessage("");}} style={{color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold'}}>Iniciar Sesión</span></p>
          )}
        </div>

        <p className="auth-footer-text" style={{marginTop: '30px'}}>
          Sistema exclusivo para personal autorizado del concesionario.
        </p>
      </div>
    </div>
  );
}
