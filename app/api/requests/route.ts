import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError, getUserInfo } from "@/lib/api-utils";

function buildRequestResponse(data: any): any {
  if (!data) return null;
  if (Array.isArray(data)) return data.map(buildRequestResponse);
  return {
    id: data.id,
    toolId: data.tool_id,
    toolName: data.tool_name,
    user: data.requested_by,
    userId: data.user_id,
    reason: data.reason,
    estimatedReturnDate: data.estimated_return,
    requestDate: data.request_date,
    status: data.status,
    concesionario: data.concesionario,
    isQueued: data.is_queued,
    queuePosition: data.queue_position,
    returnEvidenceUrl: data.return_evidence_url,
    returnedAt: data.returned_at,
    returnedBy: data.returned_by,
    tool: data.tools
      ? {
          id: data.tools.id,
          code: data.tools.code,
          description: data.tools.description,
          available: data.tools.available,
          status: data.tools.status,
          concesionario: data.tools.concesionario,
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
    const concesionario = searchParams.get("concesionario");
    const myOnly = searchParams.get("my") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = auth.supabase
      .from("requests")
      .select("*, tools(*)", { count: "exact" })
      .order("request_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (concesionario) query = query.eq("concesionario", concesionario);
    if (myOnly) {
      const userInfo = await getUserInfo(auth.supabase);
      if (userInfo?.id) query = query.eq("user_id", userInfo.id);
    }

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
      .from("tools").select("*").eq("code", code).single();
    if (toolErr || !tool) return NextResponse.json({ error: "Herramienta no encontrada" }, { status: 404 });

    const userInfo = await getUserInfo(auth.supabase);
    const requestedBy = user || userInfo?.email || "Técnico de Guardia";

    // Determine availability
    const isAvailable = tool.status === "Disponible" && tool.available > 0;
    const canBeQueued = ["Prestada", "Reservada", "En mantenimiento"].includes(tool.status) || tool.available <= 0;
    if (!isAvailable && !canBeQueued) {
      return NextResponse.json({ error: "Herramienta no disponible para solicitar" }, { status: 400 });
    }

    // Count queue position
    const { count: queueCount } = await auth.supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .eq("tool_id", tool.id)
      .eq("is_queued", true);

    const shouldQueue = !isAvailable;

    const newRequest = {
      tool_id: tool.id,
      tool_name: tool.description,
      requested_by: requestedBy,
      user_id: userInfo?.id || null,
      reason,
      estimated_return: estimatedReturnDate ? new Date(estimatedReturnDate).toISOString() : null,
      status: shouldQueue ? "En cola" : "Pendiente",
      concesionario: tool.concesionario,
      is_queued: shouldQueue,
      queue_position: shouldQueue ? (queueCount || 0) + 1 : 0,
    };

    const { data: request, error: reqErr } = await auth.supabase
      .from("requests").insert([newRequest]).select().single();
    if (reqErr) throw reqErr;

    if (!shouldQueue) {
      await auth.supabase.from("tools").update({
        available: Math.max(0, tool.available - 1),
        status: "Reservada",
        last_update: new Date().toISOString(),
      }).eq("id", tool.id);
    }

    await auth.supabase.from("tool_history").insert([{
      tool_id: tool.id,
      tool_code: tool.code,
      tool_name: tool.description,
      action: shouldQueue ? "En cola" : "Reserva cancelada",
      performed_by: requestedBy,
      user_role: userInfo?.role,
      concesionario: tool.concesionario,
      area: tool.area,
      notes: shouldQueue
        ? `Solicitud en cola (posición ${newRequest.queue_position}): ${reason}`
        : `Solicitud creada: ${reason}`,
      request_id: request.id,
    }]);

    await auth.supabase.from("notifications").insert([{
      message: shouldQueue
        ? `Solicitud en cola: ${tool.description} por ${requestedBy} (posición ${newRequest.queue_position})`
        : `Nueva solicitud: ${tool.description} por ${requestedBy}`,
      created_by: requestedBy,
      type: shouldQueue ? "queue" : "request",
    }]);

    return NextResponse.json({
      requestId: request.id,
      request: buildRequestResponse(request),
      isQueued: shouldQueue,
      queuePosition: newRequest.queue_position,
    }, { status: 201 });
  } catch (err) {
    return handleApiError(err, "Error al crear solicitud");
  }
}
