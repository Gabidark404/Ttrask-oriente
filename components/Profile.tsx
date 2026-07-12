"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import PushNotificationSetup from "@/components/PushNotificationSetup";


export default function Profile({ session }: { session: any }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const user = session?.user;
  const role = user?.app_metadata?.role || "tecnico";

  const handlePasswordUpdate = async (e: React.FormEvent) => {
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

    if (!supabase) {
      setError("Supabase no está configurado.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage("Contraseña actualizada exitosamente.");
      setPassword("");
      setConfirmPassword("");
    }
    
    setLoading(false);
  };

  return (
    <div className="tab-section active" style={{ maxWidth: '600px', margin: '0 auto', marginTop: '40px' }}>
      <div className="panel shadow-sm">
        <div className="panel-header">
          <span className="material-symbols-outlined text-blue">person</span>
          <h2>Mi Perfil</h2>
        </div>
        
        <div className="panel-body">
          <div style={{ background: 'var(--bg-light)', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: 'var(--text-color)' }}>Información de la Cuenta</h3>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>Email:</strong> {user?.email}
            </p>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>Rol:</strong> <span style={{ textTransform: 'capitalize', color: role === 'supervisor' ? 'var(--primary-color)' : 'var(--text-color)', fontWeight: 'bold' }}>{role}</span>
            </p>
          </div>

          <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: 'var(--text-color)' }}>Cambiar Contraseña</h3>
          
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px' }}>
              {error}
            </div>
          )}
          
          {message && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px' }}>
              {message}
            </div>
          )}

          <form onSubmit={handlePasswordUpdate}>
            <div className="form-group">
              <label>Nueva Contraseña</label>
              <input 
                type="password" 
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
              />
            </div>
            
            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>Confirmar Nueva Contraseña</label>
              <input 
                type="password" 
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ marginTop: '20px', width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
              disabled={loading}
            >
              {loading ? (
                <span className="material-symbols-outlined auth-spinner" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  Guardar Contraseña
                </>
              )}
            </button>
          </form>

          {/* Notificaciones Push */}
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: 'var(--text-color)' }}>Notificaciones al Celular</h3>
            <PushNotificationSetup session={session} />
          </div>
        </div>
      </div>
    </div>
  );
}

