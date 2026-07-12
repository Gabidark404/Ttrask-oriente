import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError, authorizeRole, getUserInfo, MANAGER_ROLES } from "@/lib/api-utils";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const canManage = await authorizeRole(auth.supabase, MANAGER_ROLES);
    if (!canManage) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const body = await req.json();
    const { returnEvidenceUrl, notes } = body;

    const { data: request, error: reqErr } = await auth.supabase
      .from("requests").select("*, tools(*)").eq("id", params.id).single();
    if (reqErr || !request) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    if (request.status !== "Aprobada") {
      return NextResponse.json({ error: "Solo se pueden devolver solicitudes aprobadas" }, { status: 400 });
    }

    const userInfo = await getUserInfo(auth.supabase);
    const now = new Date().toISOString();

    const { data: updated, error: updErr } = await auth.supabase
      .from("requests").update({
        status: "Devuelta",
        returned_at: now,
        returned_by: userInfo?.email || "Sistema",
        return_evidence_url: returnEvidenceUrl || null,
      }).eq("id", params.id).select().single();
    if (updErr) throw updErr;

    const tool = request.tools;
    if (tool) {
      const newAvailable = Math.min((tool.available || 0) + 1, tool.quantity);
      await auth.supabase.from("tools").update({
        available: newAvailable,
        status: newAvailable >= tool.quantity ? "Disponible" : "Prestada",
        last_update: now,
      }).eq("id", tool.id);

      await auth.supabase.from("tool_history").insert([{
        tool_id: tool.id,
        tool_code: tool.code,
        tool_name: request.tool_name,
        action: "Devolucion",
        performed_by: userInfo?.email || "Sistema",
        user_role: userInfo?.role,
        concesionario: request.concesionario,
        notes: notes || `Devuelta por ${request.requested_by}`,
        evidence_url: returnEvidenceUrl || null,
        request_id: request.id,
      }]);

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

    await auth.supabase.from("notifications").insert([{
      message: `Devolución registrada: ${request.tool_name} (solicitado por ${request.requested_by})`,
      created_by: userInfo?.email || "Sistema",
      type: "return",
    }]);

    return NextResponse.json({ success: true, request: updated });
  } catch (err) {
    return handleApiError(err, "Error al registrar devolución");
  }
}
