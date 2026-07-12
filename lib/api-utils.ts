import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "./supabase";

/**
 * Extrae el cliente autenticado de Supabase y el token desde la request.
 */
export function getAuthSupabase(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  const supabase = getAuthenticatedClient(token);
  return { supabase, token };
}

/**
 * Valida si el usuario tiene uno de los roles requeridos.
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

/**
 * Retorna info completa del usuario autenticado: id, email, role.
 */
export async function getUserInfo(supabase: any) {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    user,
    role: (user.app_metadata?.role || "tecnico") as string,
    email: user.email || "unknown",
    id: user.id as string,
  };
}

export const MANAGER_ROLES = ['admin', 'supervisor', 'jefe_taller', 'almacenista'];
export const WRITE_ROLES = ['admin', 'supervisor', 'almacenista'];
export const REPORT_ROLES = ['admin', 'supervisor', 'jefe_taller', 'auditor'];

export function handleApiError(err: any, customMessage: string = "Error interno") {
  console.error(customMessage, err);
  return NextResponse.json(
    { error: customMessage, details: err?.message || String(err) },
    { status: 500 }
  );
}
