import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError } from "@/lib/api-utils";

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

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data, error } = await auth.supabase
      .from("tools")
      .select("*")
      .eq("code", params.code)
      .single();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Herramienta no encontrada" }, { status: 404 });

    return NextResponse.json(buildToolResponse([data])[0]);
  } catch (err) {
    return handleApiError(err, "Error al obtener herramienta");
  }
}
