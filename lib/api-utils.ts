import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "./supabase";

/**
 * Extrae el cliente autenticado de Supabase y el token desde la request.
 * Si no hay token, retorna null.
 */
export function getAuthSupabase(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  const supabase = getAuthenticatedClient(token);
  return { supabase, token };
}

/**
 * Valida si el usuario tiene uno de los roles requeridos decodificando el JWT (o dejando que RLS lo maneje).
 * En este caso, para no instalar jsonwebtoken, simplemente usamos getUser().
 */
export async function authorizeRole(
  supabase: any,
  allowedRoles: string[]
): Promise<boolean> {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.app_metadata || !user.app_metadata.role) return false;
  return allowedRoles.includes(user.app_metadata.role);
}

export function handleApiError(err: any, customMessage: string = "Error interno") {
  console.error(customMessage, err);
  return NextResponse.json(
    { error: customMessage, details: err?.message || String(err) },
    { status: 500 }
  );
}
