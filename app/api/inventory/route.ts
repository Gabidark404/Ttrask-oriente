import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError, authorizeRole, WRITE_ROLES } from "@/lib/api-utils";

const STATUS_VALUES = [
  "Disponible", "Prestada", "Reservada", "En mantenimiento", "Extraviada", "Fuera de servicio",
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
    concesionario: item.concesionario || "General",
    area: item.area,
    responsible: item.responsible,
    imageUrl: item.image_url,
    lastUpdate: item.last_update,
  }));
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const brand = searchParams.get("brand");
    const code = searchParams.get("code");
    const codification = searchParams.get("codification");
    const concesionario = searchParams.get("concesionario");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = auth.supabase
      .from("tools")
      .select("*", { count: "exact" })
      .order("last_update", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (code) query = query.ilike("code", `%${code}%`);
    if (brand) query = query.ilike("brand", `%${brand}%`);
    if (codification) query = query.ilike("codification", `%${codification}%`);
    if (concesionario) query = query.eq("concesionario", concesionario);
    if (search) {
      query = query.or(
        `description.ilike.%${search}%,brand.ilike.%${search}%,code.ilike.%${search}%,codification.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      data: buildToolResponse(data || []),
      pagination: { total: count, limit, offset },
    });
  } catch (err) {
    return handleApiError(err, "Error al obtener herramientas");
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const canWrite = await authorizeRole(auth.supabase, WRITE_ROLES);
    if (!canWrite) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const body = await req.json();
    const { code } = body;
    if (!code) return NextResponse.json({ error: "El código es obligatorio" }, { status: 400 });

    const { data: existing } = await auth.supabase
      .from("tools").select("id").eq("code", code).single();
    if (existing) return NextResponse.json({ error: "Ya existe una herramienta con este código" }, { status: 409 });

    const tool = {
      item: body.item,
      code,
      codification: body.codification,
      description: body.description,
      brand: body.brand,
      quantity: body.quantity || 0,
      available: body.available !== undefined ? body.available : body.quantity || 0,
      status: body.status || "Disponible",
      location: body.location,
      concesionario: body.concesionario || "General",
      area: body.area,
      responsible: body.responsible,
      image_url: body.imageUrl,
      last_update: new Date().toISOString(),
    };

    if (!STATUS_VALUES.includes(tool.status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const { data, error } = await auth.supabase
      .from("tools").insert([tool]).select().single();
    if (error) throw error;

    return NextResponse.json(buildToolResponse([data])[0], { status: 201 });
  } catch (err) {
    return handleApiError(err, "Error al crear herramienta");
  }
}
