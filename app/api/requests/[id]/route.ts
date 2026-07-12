import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError, authorizeRole, getUserInfo, MANAGER_ROLES } from "@/lib/api-utils";

const REQUEST_STATUS = ["Pendiente", "Aprobada", "Rechazada", "Devuelta", "En cola"];

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
    isQueued: data.is_queued,
    queuePosition: data.queue_position,
    concesionario: data.concesionario,
    returnedAt: data.returned_at,
    returnedBy: data.returned_by,
    tool: data.tools
      ? { id: data.tools.id, code: data.tools.code, description: data.tools.description, available: data.tools.available, status: data.tools.status }
      : undefined,
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data, error } = await auth.supabase
      .from("requests").select("*, tools(*)").eq("id", params.id).single();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });

    return NextResponse.json(buildRequestResponse(data));
  } catch (err) {
    return handleApiError(err, "Error al obtener solicitud");
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const canManage = await authorizeRole(auth.supabase, MANAGER_ROLES);
    if (!canManage) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const { status } = await req.json();
    if (!status || !REQUEST_STATUS.includes(status)) {
      return NextResponse.json({ error: `Estado inválido. Valores: ${REQUEST_STATUS.join(", ")}` }, { status: 400 });
    }

    const { data: request, error: reqErr } = await auth.supabase
      .from("requests").select("*, tools(*)").eq("id", params.id).single();
    if (reqErr || !request) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });

    const userInfo = await getUserInfo(auth.supabase);
    const { data: updatedRequest, error: updErr } = await auth.supabase
      .from("requests").update({ status }).eq("id", params.id).select().single();
    if (updErr) throw updErr;

    const tool = request.tools;

    if (status === "Rechazada" && tool) {
      await auth.supabase.from("tools").update({
        available: Math.min(tool.available + 1, tool.quantity),
        status: "Disponible",
        last_update: new Date().toISOString(),
      }).eq("id", tool.id);

      // Promote next in queue
      const { data: nextQueued } = await auth.supabase
        .from("requests").select("*")
        .eq("tool_id", tool.id).eq("is_queued", true).eq("status", "En cola")
        .order("request_date", { ascending: true }).limit(1).maybeSingle();
      if (nextQueued) {
        await auth.supabase.from("requests").update({
          is_queued: false, queue_position: 0, status: "Pendiente",
        }).eq("id", nextQueued.id);
        await auth.supabase.from("notifications").insert([{
          message: `Tu solicitud para "${request.tool_name}" está ahora pendiente de aprobación.`,
          created_by: "Sistema", user_id: nextQueued.user_id, type: "queue_promoted",
        }]);
      }
    }

    if (status === "Aprobada" && tool) {
      await auth.supabase.from("tools").update({
        status: "Prestada",
        last_update: new Date().toISOString(),
      }).eq("id", tool.id);
    }

    // Log to history
    if (tool) {
      const action = status === "Aprobada" ? "Prestamo" : status === "Rechazada" ? "Reserva cancelada" : "Actualizacion";
      await auth.supabase.from("tool_history").insert([{
        tool_id: tool.id,
        tool_code: tool.code,
        tool_name: request.tool_name,
        action,
        performed_by: userInfo?.email || "Supervisor",
        user_role: userInfo?.role,
        concesionario: request.concesionario,
        notes: `Solicitud ${status.toLowerCase()} por ${userInfo?.email}`,
        request_id: request.id,
      }]);
    }

    const actionText = status === "Aprobada" ? "aprobada" : "rechazada";
    await auth.supabase.from("notifications").insert([{
      message: `Solicitud ${actionText}: ${request.tool_name} (${request.requested_by})`,
      created_by: userInfo?.email || "Supervisor",
      user_id: request.user_id,
      type: status === "Aprobada" ? "approval" : "rejection",
    }]);

    return NextResponse.json({ status, request: buildRequestResponse(updatedRequest) });
  } catch (err) {
    return handleApiError(err, "Error al actualizar solicitud");
  }
}
