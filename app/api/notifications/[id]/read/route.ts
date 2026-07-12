import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError } from "@/lib/api-utils";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { error } = await auth.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, "Error al marcar notificación");
  }
}
