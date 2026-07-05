"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "../globals.css";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Supabase maneja los tokens en el hash de la URL automáticamente y establece una sesión
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event == "PASSWORD_RECOVERY") {
        console.log("Recuperación de contraseña en proceso...");
      }
    });
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      setMessage("Contraseña actualizada con éxito. Redirigiendo...");
      setTimeout(() => {
        router.push("/");
      }, 2000);
    }
  };

  return (
    <div className="auth-backdrop" style={{ minHeight: '100vh' }}>
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo-circle">
            <span className="material-symbols-outlined">lock_reset</span>
          </div>
          <h1>TTRAKS ORIENTE</h1>
          <p>Actualizar Contraseña</p>
        </div>

        <div className="auth-divider"></div>

        <form onSubmit={handleUpdate} className="auth-form">
          <h2>Crea una nueva contraseña</h2>

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
            <label>Nueva Contraseña</label>
            <div className="auth-input-wrapper">
              <span className="material-symbols-outlined auth-input-icon">lock</span>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Confirmar Nueva Contraseña</label>
            <div className="auth-input-wrapper">
              <span className="material-symbols-outlined auth-input-icon">lock</span>
              <input
                type="password"
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <span className="material-symbols-outlined auth-spinner">sync</span>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                Guardar y Entrar
              </>
            )}
          </button>
          
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button 
              type="button" 
              onClick={() => router.push("/")}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Volver al inicio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
