import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase } from "@/lib/api-utils";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthSupabase(req);
  if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  return NextResponse.json({ success: true, message: "Funcionalidad pendiente" });
}
