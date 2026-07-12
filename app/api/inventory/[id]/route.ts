import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError, authorizeRole, getUserInfo, WRITE_ROLES } from "@/lib/api-utils";

function buildToolResponse(item: any) {
  return {
    id: item.id,
    item: item.item,
    code: item.code,
    codification: item.codification,
    description: item.description,
    brand: item.brand,
    quantity: item.quantity,
    available: item.available,
    status: item.status,
    location: item.location,
    concesionario: item.concesionario || "General",
    area: item.area,
    responsible: item.responsible,
    imageUrl: item.image_url,
    lastUpdate: item.last_update,
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data, error } = await auth.supabase
      .from("tools").select("*").eq("id", params.id).single();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Herramienta no encontrada" }, { status: 404 });

    const { data: history } = await auth.supabase
      .from("tool_history").select("*")
      .eq("tool_id", params.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ ...buildToolResponse(data), history: history || [] });
  } catch (err) {
    return handleApiError(err, "Error al obtener herramienta");
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const canWrite = await authorizeRole(auth.supabase, WRITE_ROLES);
    if (!canWrite) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const body = await req.json();
    const userInfo = await getUserInfo(auth.supabase);

    const { data: currentTool, error: fetchErr } = await auth.supabase
      .from("tools").select("*").eq("id", params.id).single();
    if (fetchErr || !currentTool) return NextResponse.json({ error: "Herramienta no encontrada" }, { status: 404 });

    const updates: any = { last_update: new Date().toISOString() };
    const allowedFields = ["description","brand","quantity","available","status","location","concesionario","area","responsible","codification","item"];
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    if (body.imageUrl !== undefined) updates.image_url = body.imageUrl;

    const { data, error } = await auth.supabase
      .from("tools").update(updates).eq("id", params.id).select().single();
    if (error) throw error;

    await auth.supabase.from("tool_history").insert([{
      tool_id: currentTool.id,
      tool_code: currentTool.code,
      tool_name: currentTool.description,
      action: "Actualizacion",
      performed_by: userInfo?.email || "Sistema",
      user_role: userInfo?.role,
      concesionario: data.concesionario,
      area: data.area,
      notes: `Campos actualizados: ${Object.keys(updates).filter(k => k !== "last_update").join(", ")}`,
    }]);

    return NextResponse.json(buildToolResponse(data));
  } catch (err) {
    return handleApiError(err, "Error al actualizar herramienta");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const isAdmin = await authorizeRole(auth.supabase, ["admin"]);
    if (!isAdmin) return NextResponse.json({ error: "Solo el administrador puede eliminar herramientas" }, { status: 403 });

    const { error } = await auth.supabase.from("tools").delete().eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, "Error al eliminar herramienta");
  }
}
