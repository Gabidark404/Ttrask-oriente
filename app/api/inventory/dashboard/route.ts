import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const [
      { count: total, error: err1 },
      { count: disponible, error: err2 },
      { count: prestada, error: err3 },
      { count: mantenimiento, error: err4 },
      { count: extraviada, error: err5 },
      { count: pendientes, error: err6 },
    ] = await Promise.all([
      auth.supabase.from("tools").select("id", { count: "exact", head: true }),
      auth.supabase.from("tools").select("id", { count: "exact", head: true }).eq("status", "Disponible"),
      auth.supabase.from("tools").select("id", { count: "exact", head: true }).eq("status", "Prestada"),
      auth.supabase.from("tools").select("id", { count: "exact", head: true }).eq("status", "En mantenimiento"),
      auth.supabase.from("tools").select("id", { count: "exact", head: true }).eq("status", "Extraviada"),
      auth.supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "Pendiente"),
    ]);

    if (err1 || err2 || err3 || err4 || err5 || err6) {
      throw err1 || err2 || err3 || err4 || err5 || err6;
    }

    return NextResponse.json({
      total,
      disponible,
      prestada,
      mantenimiento,
      extraviada,
      pendientes,
    });
  } catch (err) {
    return handleApiError(err, "Error al obtener dashboard");
  }
}
