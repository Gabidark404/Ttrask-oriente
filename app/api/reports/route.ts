import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError, authorizeRole, REPORT_ROLES } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const canReport = await authorizeRole(auth.supabase, REPORT_ROLES);
    if (!canReport) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "loans";
    const concesionario = searchParams.get("concesionario");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    let reportData: any[] = [];

    if (type === "loans" || type === "usage") {
      let query = auth.supabase
        .from("tool_history")
        .select("tool_code, tool_name, action, performed_by, user_role, concesionario, area, notes, created_at")
        .order("created_at", { ascending: false });
      if (concesionario) query = query.eq("concesionario", concesionario);
      if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }
      if (type === "loans") query = query.in("action", ["Prestamo", "Devolucion"]);
      const { data, error } = await query;
      if (error) throw error;
      reportData = data || [];
    }

    if (type === "losses") {
      let query = auth.supabase
        .from("tools")
        .select("code, codification, description, brand, status, concesionario, area, responsible, last_update")
        .in("status", ["Extraviada", "Fuera de servicio"]);
      if (concesionario) query = query.eq("concesionario", concesionario);
      const { data, error } = await query;
      if (error) throw error;
      reportData = data || [];
    }

    if (type === "by_tech") {
      let query = auth.supabase
        .from("requests")
        .select("requested_by, status, tool_name, concesionario, request_date")
        .neq("status", "En cola")
        .order("request_date", { ascending: false });
      if (concesionario) query = query.eq("concesionario", concesionario);
      if (dateFrom) query = query.gte("request_date", new Date(dateFrom).toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte("request_date", end.toISOString());
      }
      const { data, error } = await query;
      if (error) throw error;
      reportData = data || [];
    }

    return NextResponse.json({
      type,
      concesionario: concesionario || "Todos",
      dateFrom,
      dateTo,
      total: reportData.length,
      data: reportData,
    });
  } catch (err) {
    return handleApiError(err, "Error al generar reporte");
  }
}
