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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const isSupervisor = await authorizeRole(auth.supabase, ["supervisor"]);
    if (!isSupervisor) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const { status } = await req.json();
    if (!status || !STATUS_VALUES.includes(status)) {
      return NextResponse.json({ error: `Estado inválido` }, { status: 400 });
    }

    const { data, error } = await auth.supabase
      .from("tools")
      .update({ status, last_update: new Date().toISOString() })
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Herramienta no encontrada" }, { status: 404 });

    return NextResponse.json(buildToolResponse([data])[0]);
  } catch (err) {
    return handleApiError(err, "Error al actualizar estado");
  }
}
