import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const toolId = searchParams.get("tool_id");
    const action = searchParams.get("action");
    const concesionario = searchParams.get("concesionario");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const performedBy = searchParams.get("performed_by");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = auth.supabase
      .from("tool_history")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (toolId) query = query.eq("tool_id", toolId);
    if (action) query = query.eq("action", action);
    if (concesionario) query = query.eq("concesionario", concesionario);
    if (performedBy) query = query.ilike("performed_by", `%${performedBy}%`);
    if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query = query.lte("created_at", end.toISOString());
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      pagination: { total: count, limit, offset },
    });
  } catch (err) {
    return handleApiError(err, "Error al obtener historial");
  }
}
