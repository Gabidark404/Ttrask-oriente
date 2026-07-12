// lib/webpush.ts
// Utilidad Web Push para notificaciones nativas al celular/navegador
// Requiere: npm install web-push && npm install @types/web-push --save-dev
// Añadir al .env:
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<clave pública>
//   VAPID_PRIVATE_KEY=<clave privada>
//   VAPID_SUBJECT=mailto:admin@ttraks.com

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

let _webpush: any = null;

async function getWebPush() {
  if (_webpush) return _webpush;
  try {
    // Dynamic import — only runs on server, avoids bundling in client
    _webpush = await import("web-push").catch(() => null);
    if (!_webpush) return null;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@ttraks.com";

    if (vapidPublicKey && vapidPrivateKey) {
      _webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    } else {
      console.warn("⚠️  VAPID keys not configured. Push notifications disabled.");
      _webpush = null;
    }
  } catch (err) {
    console.warn("web-push not available:", err);
    _webpush = null;
  }
  return _webpush;
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  try {
    const wp = await getWebPush();
    if (!wp) return false;

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await wp.sendNotification(pushSubscription, JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icon-192.png",
      url: payload.url || "/",
      tag: payload.tag || "ttraks",
    }));
    return true;
  } catch (err: any) {
    // 410 Gone = subscription expired, caller should delete it
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      return false;
    }
    console.error("Push notification error:", err);
    return false;
  }
}

/**
 * Envía notificación push a todos los usuarios con suscripciones activas.
 * Se pasa supabase client con service_role para leer todas las suscripciones.
 */
export async function broadcastPushNotification(
  supabase: any,
  payload: PushPayload,
  targetUserIds?: string[]
): Promise<void> {
  try {
    let query = supabase.from("push_subscriptions").select("*");
    if (targetUserIds && targetUserIds.length > 0) {
      query = query.in("user_id", targetUserIds);
    }
    const { data: subs } = await query;
    if (!subs || subs.length === 0) return;

    const expiredIds: number[] = [];
    for (const sub of subs) {
      const ok = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      );
      if (!ok) expiredIds.push(sub.id);
    }

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    }
  } catch (err) {
    console.error("broadcastPushNotification error:", err);
  }
}
