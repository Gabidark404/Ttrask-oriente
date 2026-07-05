import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = auth.supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      data: (data || []).map((n) => ({
        id: n.id,
        message: n.message,
        user: n.created_by,
        createdAt: n.created_at,
      })),
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

    const { message, user } = await req.json();
    if (!message) return NextResponse.json({ error: "Mensaje obligatorio" }, { status: 400 });

    const { data, error } = await auth.supabase
      .from("notifications")
      .insert([{ message, created_by: user || "Sistema" }])
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(
      { id: data.id, message: data.message, user: data.created_by, createdAt: data.created_at },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err, "Error al crear notificación");
  }
}
