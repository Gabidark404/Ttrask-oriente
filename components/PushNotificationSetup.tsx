"use client";

import { useEffect, useState } from "react";

interface PushSetupProps {
  session: any;
}

export default function PushNotificationSetup({ session }: PushSetupProps) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    checkExistingSubscription();
  }, []);

  const checkExistingSubscription = async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {}
  };

  const subscribe = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Tu navegador no soporta notificaciones push.");
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      alert("Configuración de notificaciones no disponible. Contacta al administrador.");
      return;
    }

    setLoading(true);
    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      // Register SW
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
      });


      // Save to server
      const subJson = sub.toJSON();
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      setSubscribed(true);
      alert("✅ Notificaciones activadas correctamente.");
    } catch (err) {
      console.error(err);
      alert("Error al activar notificaciones.");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ endpoint }),
        });
      }
      setSubscribed(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (permission === "unsupported") {
    return (
      <div className="push-setup-card disabled">
        <span className="material-symbols-outlined">notifications_off</span>
        <div>
          <p className="push-title">Notificaciones no disponibles</p>
          <p className="push-desc">Tu navegador no soporta notificaciones push.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`push-setup-card ${subscribed ? "active" : ""}`}>
      <span className="material-symbols-outlined push-icon">
        {subscribed ? "notifications_active" : "notifications"}
      </span>
      <div className="push-info">
        <p className="push-title">
          {subscribed ? "Notificaciones Activas" : "Activar Notificaciones"}
        </p>
        <p className="push-desc">
          {subscribed
            ? "Recibirás alertas en tu dispositivo aunque la app esté cerrada."
            : "Recibe alertas de solicitudes, aprobaciones y devoluciones en tu celular."}
        </p>
      </div>
      <button
        className={`btn ${subscribed ? "btn-danger" : "btn-primary"} push-btn`}
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
        id={subscribed ? "btn-push-unsub" : "btn-push-sub"}
      >
        {loading ? (
          <span className="material-symbols-outlined spinning">sync</span>
        ) : subscribed ? (
          <><span className="material-symbols-outlined">notifications_off</span> Desactivar</>
        ) : (
          <><span className="material-symbols-outlined">notifications</span> Activar</>
        )}
      </button>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
