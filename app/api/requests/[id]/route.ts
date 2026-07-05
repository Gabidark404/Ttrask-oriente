import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError, authorizeRole } from "@/lib/api-utils";

const REQUEST_STATUS = ["Pendiente", "Aprobada", "Rechazada"];

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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data, error } = await auth.supabase
      .from("requests")
      .select("*, tools(*)")
      .eq("id", params.id)
      .single();
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

    const isSupervisor = await authorizeRole(auth.supabase, ["supervisor"]);
    if (!isSupervisor) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const { status } = await req.json();
    if (!status || !REQUEST_STATUS.includes(status)) {
      return NextResponse.json({ error: `Estado inválido. Valores: ${REQUEST_STATUS.join(", ")}` }, { status: 400 });
    }

    const { data: request, error: reqErr } = await auth.supabase
      .from("requests")
      .select("*, tools(*)")
      .eq("id", params.id)
      .single();
    if (reqErr || !request) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });

    const { data: updatedRequest, error: updErr } = await auth.supabase
      .from("requests")
      .update({ status })
      .eq("id", params.id)
      .select()
      .single();
    if (updErr) throw updErr;

    const tool = request.tools;

    if (status === "Rechazada" && tool) {
      await auth.supabase
        .from("tools")
        .update({
          available: Math.min(tool.available + 1, tool.quantity),
          status: "Disponible",
          last_update: new Date().toISOString(),
        })
        .eq("id", tool.id);
    }

    if (status === "Aprobada" && tool) {
      await auth.supabase
        .from("tools")
        .update({
          status: "Prestada",
          last_update: new Date().toISOString(),
        })
        .eq("id", tool.id);
    }

    const { data: { user: authUser } } = await auth.supabase.auth.getUser();

    const action = status === "Aprobada" ? "aprobada" : "rechazada";
    await auth.supabase.from("notifications").insert([
      {
        message: `Solicitud ${action}: ${request.tool_name} (${request.requested_by})`,
        created_by: authUser?.email || "Supervisor",
      },
    ]);

    return NextResponse.json({ status, request: buildRequestResponse(updatedRequest) });
  } catch (err) {
    return handleApiError(err, "Error al actualizar solicitud");
  }
}
