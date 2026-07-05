import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError } from "@/lib/api-utils";

function buildRequestResponse(data: any): any {
  if (!data) return null;
  if (Array.isArray(data)) return data.map(buildRequestResponse);
  return {
    id: data.id,
    toolId: data.tool_id,
    toolName: data.tool_name,
    user: data.requested_by,
    reason: data.reason,
    estimatedReturnDate: data.estimated_return,
    requestDate: data.request_date,
    status: data.status,
    tool: data.tools
      ? {
          id: data.tools.id,
          code: data.tools.code,
          description: data.tools.description,
          available: data.tools.available,
          status: data.tools.status,
        }
      : undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = auth.supabase
      .from("requests")
      .select("*, tools(*)", { count: "exact" })
      .order("request_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      data: buildRequestResponse(data || []),
      pagination: { total: count, limit, offset },
    });
  } catch (err) {
    return handleApiError(err, "Error al obtener solicitudes");
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { code, reason, estimatedReturnDate, user } = body;

    if (!code || !reason) {
      return NextResponse.json({ error: "Código de herramienta y motivo son obligatorios" }, { status: 400 });
    }

    const { data: tool, error: toolErr } = await auth.supabase
      .from("tools")
      .select("*")
      .eq("code", code)
      .single();
    if (toolErr || !tool) return NextResponse.json({ error: "Herramienta no encontrada" }, { status: 404 });

    if (tool.status !== "Disponible" || tool.available <= 0) {
      return NextResponse.json({ error: "Herramienta no disponible para préstamo" }, { status: 400 });
    }

    // Get current user email from token instead of assuming req.user
    const { data: { user: authUser } } = await auth.supabase.auth.getUser();

    const newRequest = {
      tool_id: tool.id,
      tool_name: tool.description,
      requested_by: user || authUser?.email || "Técnico de Guardia",
      reason,
      estimated_return: estimatedReturnDate ? new Date(estimatedReturnDate).toISOString() : null,
      status: "Pendiente",
    };

    const { data: request, error: reqErr } = await auth.supabase
      .from("requests")
      .insert([newRequest])
      .select()
      .single();
    if (reqErr) throw reqErr;

    await auth.supabase.from("notifications").insert([
      {
        message: `Nueva solicitud: ${tool.description} por ${newRequest.requested_by}`,
        created_by: newRequest.requested_by,
      },
    ]);

    return NextResponse.json({ requestId: request.id, request: buildRequestResponse(request) }, { status: 201 });
  } catch (err) {
    return handleApiError(err, "Error al crear solicitud");
  }
}
