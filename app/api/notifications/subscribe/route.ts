import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError, getUserInfo } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userInfo = await getUserInfo(auth.supabase);
    if (!userInfo) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { endpoint, keys } = body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
    }

    const { error } = await auth.supabase
      .from("push_subscriptions")
      .upsert({
        user_id: userInfo.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: req.headers.get("user-agent") || "",
      }, { onConflict: "user_id,endpoint" });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, "Error al guardar suscripción push");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userInfo = await getUserInfo(auth.supabase);
    if (!userInfo) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { endpoint } = await req.json();
    await auth.supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userInfo.id)
      .eq("endpoint", endpoint);

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, "Error al eliminar suscripción push");
  }
}
