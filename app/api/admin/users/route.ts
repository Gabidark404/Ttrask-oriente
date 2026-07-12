import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError, authorizeRole } from "@/lib/api-utils";
import { createClient } from "@supabase/supabase-js";

// Helper to get service role client
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const isAdmin = await authorizeRole(auth.supabase, ["admin"]);
    if (!isAdmin) return NextResponse.json({ error: "Acceso denegado. Se requiere rol de administrador." }, { status: 403 });

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Error de configuración", details: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor" },
        { status: 500 }
      );
    }

    const { data, error } = await adminClient.auth.admin.listUsers();
    if (error) throw error;

    const users = data.users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.app_metadata?.role || "tecnico",
      lastSignIn: user.last_sign_in_at,
      createdAt: user.created_at,
    }));

    // Optionally sort users by email or creation date
    users.sort((a, b) => (a.email || "").localeCompare(b.email || ""));

    return NextResponse.json({ data: users });
  } catch (err) {
    return handleApiError(err, "Error al obtener lista de usuarios");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const isAdmin = await authorizeRole(auth.supabase, ["admin"]);
    if (!isAdmin) return NextResponse.json({ error: "Acceso denegado. Se requiere rol de administrador." }, { status: 403 });

    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: "Falta userId o role" }, { status: 400 });
    }

    const validRoles = ["admin", "supervisor", "jefe_taller", "almacenista", "tecnico", "auditor"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Error de configuración", details: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor" },
        { status: 500 }
      );
    }

    const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
      app_metadata: { role }
    });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.app_metadata?.role
      }
    });
  } catch (err) {
    return handleApiError(err, "Error al actualizar rol de usuario");
  }
}
