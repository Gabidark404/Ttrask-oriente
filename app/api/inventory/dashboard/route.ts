import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: { user } } = await auth.supabase.auth.getUser();
    const role = user?.app_metadata?.role || "tecnico";
    const email = user?.email || "";

    if (role === "supervisor") {
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
    } else {
      // Estadísticas individuales para técnicos
      const [
        { count: misPrestamos, error: e1 },
        { count: misPendientes, error: e2 },
        { count: misRechazadas, error: e3 },
        { count: misHistorico, error: e4 },
      ] = await Promise.all([
        auth.supabase.from("requests").select("id", { count: "exact", head: true }).eq("requested_by", email).eq("status", "Aprobada"),
        auth.supabase.from("requests").select("id", { count: "exact", head: true }).eq("requested_by", email).eq("status", "Pendiente"),
        auth.supabase.from("requests").select("id", { count: "exact", head: true }).eq("requested_by", email).eq("status", "Rechazada"),
        auth.supabase.from("requests").select("id", { count: "exact", head: true }).eq("requested_by", email).eq("status", "Aprobada"),
      ]);

      if (e1 || e2 || e3 || e4) throw e1 || e2 || e3 || e4;

      return NextResponse.json({
        misPrestamos,
        misPendientes,
        misRechazadas,
        misHistorico,
      });
    }
  } catch (err) {
    return handleApiError(err, "Error al obtener dashboard");
  }
}
