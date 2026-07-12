import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError, getUserInfo } from "@/lib/api-utils";

function buildNotifResponse(data: any): any {
  if (!data) return null;
  if (Array.isArray(data)) return data.map((d: any) => buildNotifResponse(d));
  return {
    id: data.id,
    message: data.message,
    user: data.created_by,
    userId: data.user_id,
    type: data.type || "general",
    isRead: data.is_read,
    createdAt: data.created_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const unreadOnly = searchParams.get("unread") === "true";
    const myOnly = searchParams.get("my") === "true";

    let query = auth.supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) query = query.eq("is_read", false);
    if (myOnly) {
      const userInfo = await getUserInfo(auth.supabase);
      if (userInfo?.id) {
        query = query.or(`user_id.eq.${userInfo.id},user_id.is.null`);
      }
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      data: buildNotifResponse(data || []),
      pagination: { total: count, limit, offset },
    });
  } catch (err) {
    return handleApiError(err, "Error al obtener notificaciones");
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    if (!body.message) return NextResponse.json({ error: "El mensaje es obligatorio" }, { status: 400 });

    const { data, error } = await auth.supabase
      .from("notifications")
      .insert([{
        message: body.message,
        created_by: body.user || "Sistema",
        user_id: body.userId || null,
        type: body.type || "general",
      }]).select().single();
    if (error) throw error;

    return NextResponse.json(buildNotifResponse(data), { status: 201 });
  } catch (err) {
    return handleApiError(err, "Error al crear notificación");
  }
}
