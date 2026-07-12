import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError, authorizeRole } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data, error } = await auth.supabase
      .from("concesionarios").select("*").eq("active", true).order("name");
    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    return handleApiError(err, "Error al obtener concesionarios");
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const canCreate = await authorizeRole(auth.supabase, ["admin", "supervisor"]);
    if (!canCreate) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const body = await req.json();
    if (!body.name || !body.code) {
      return NextResponse.json({ error: "Nombre y código son obligatorios" }, { status: 400 });
    }

    const { data, error } = await auth.supabase
      .from("concesionarios")
      .insert([{ name: body.name, code: body.code.toUpperCase(), color: body.color || "#3B82F6" }])
      .select().single();
    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return handleApiError(err, "Error al crear concesionario");
  }
}
