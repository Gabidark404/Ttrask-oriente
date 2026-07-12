"use client";

import { useEffect, useState } from "react";

interface NotificationsPanelProps {
  session: any;
  onUnreadCountChange?: (count: number) => void;
}

const TYPE_ICONS: Record<string, string> = {
  general: "notifications",
  request: "pending_actions",
  approval: "check_circle",
  rejection: "cancel",
  return: "assignment_return",
  queue: "queue",
  queue_promoted: "notifications_active",
};

const TYPE_COLORS: Record<string, string> = {
  general: "#64748B",
  request: "#F59E0B",
  approval: "#10B981",
  rejection: "#EF4444",
  return: "#3B82F6",
  queue: "#8B5CF6",
  queue_promoted: "#F97316",
};

export default function NotificationsPanel({ session, onUnreadCountChange }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const headers = { Authorization: `Bearer ${session?.access_token}` };

  const fetchNotifications = async () => {
    try {
      const params = new URLSearchParams({ limit: "50", my: "true" });
      if (showUnreadOnly) params.set("unread", "true");

      const res = await fetch(`/api/notifications?${params}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);

        // Count unread
        const unread = (json.data || []).filter((n: any) => !n.isRead).length;
        setUnreadCount(unread);
        onUnreadCountChange?.(unread);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (session) fetchNotifications();
  }, [session, showUnreadOnly]);

  // Poll every 30 seconds for new notifications
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [session, showUnreadOnly]);

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers,
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      const newUnread = Math.max(0, unreadCount - 1);
      setUnreadCount(newUnread);
      onUnreadCountChange?.(newUnread);
    } catch {}
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    for (const n of unread) {
      await markAsRead(n.id);
    }
  };

  return (
    <div className="tab-section active">
      <div className="section-title-card notif-header">
        <div>
          <h2>
            Centro de Notificaciones
            {unreadCount > 0 && (
              <span className="notif-badge-large">{unreadCount} nuevas</span>
            )}
          </h2>
          <p>Alertas de solicitudes, aprobaciones, devoluciones y actualizaciones del sistema.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              id="toggle-unread-only"
            />
            Solo no leídas
          </label>
          {unreadCount > 0 && (
            <button className="btn btn-secondary" onClick={markAllAsRead} id="btn-mark-all-read">
              <span className="material-symbols-outlined">done_all</span>
              Marcar todas leídas
            </button>
          )}
          <button className="btn btn-primary" onClick={fetchNotifications} id="btn-refresh-notifs">
            <span className="material-symbols-outlined">refresh</span>
            Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <span className="material-symbols-outlined spinning">sync</span>
          Cargando notificaciones...
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <span className="material-symbols-outlined">notifications_none</span>
          <p>{showUnreadOnly ? "No tienes notificaciones sin leer." : "No hay notificaciones recientes."}</p>
        </div>
      ) : (
        <div className="notif-list">
          {notifications.map((n) => {
            const icon = TYPE_ICONS[n.type] || "notifications";
            const color = TYPE_COLORS[n.type] || "#64748B";
            const date = new Date(n.createdAt);
            return (
              <div
                key={n.id}
                className={`notif-item ${!n.isRead ? "unread" : ""}`}
                onClick={() => !n.isRead && markAsRead(n.id)}
              >
                <div className="notif-icon-wrap" style={{ background: color + "20", color }}>
                  <span className="material-symbols-outlined">{icon}</span>
                </div>
                <div className="notif-content">
                  <p className="notif-message">{n.message}</p>
                  <div className="notif-footer">
                    <span className="notif-time">
                      <span className="material-symbols-outlined">schedule</span>
                      {date.toLocaleDateString("es", { day: "2-digit", month: "short" })}
                      {" · "}
                      {date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {n.user && (
                      <span className="notif-by">
                        <span className="material-symbols-outlined">person</span>
                        {n.user}
                      </span>
                    )}
                  </div>
                </div>
                <div className="notif-status">
                  {!n.isRead ? (
                    <span className="unread-dot" title="No leída" />
                  ) : (
                    <span className="material-symbols-outlined" style={{ color: "#10B981", fontSize: "18px" }}>check_circle</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
