import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError, authorizeRole } from "@/lib/api-utils";

const STATUS_VALUES = [
  "Disponible",
  "Prestada",
  "Reservada",
  "En mantenimiento",
  "Extraviada",
  "Fuera de servicio",
];

function buildToolResponse(data: any[]) {
  return data.map((item) => ({
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
    lastUpdate: item.last_update,
  }));
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data, error } = await auth.supabase
      .from("tools")
      .select("*")
      .eq("id", params.id)
      .single();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Herramienta no encontrada" }, { status: 404 });

    return NextResponse.json(buildToolResponse([data])[0]);
  } catch (err) {
    return handleApiError(err, "Error al obtener herramienta");
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const isSupervisor = await authorizeRole(auth.supabase, ["supervisor"]);
    if (!isSupervisor) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const updates = await req.json();
    updates.last_update = new Date().toISOString();
    delete updates.id;
    delete updates.created_at;

    if (updates.status && !STATUS_VALUES.includes(updates.status)) {
      return NextResponse.json({ error: `Estado inválido` }, { status: 400 });
    }

    const { data, error } = await auth.supabase
      .from("tools")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Herramienta no encontrada" }, { status: 404 });

    return NextResponse.json(buildToolResponse([data])[0]);
  } catch (err) {
    return handleApiError(err, "Error al actualizar herramienta");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const isSupervisor = await authorizeRole(auth.supabase, ["supervisor"]);
    if (!isSupervisor) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const { error } = await auth.supabase.from("tools").delete().eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: "Herramienta eliminada" });
  } catch (err) {
    return handleApiError(err, "Error al eliminar herramienta");
  }
}
