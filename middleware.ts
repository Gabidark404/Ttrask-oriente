import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Solo interceptamos rutas de API
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Rutas públicas (login/health/docs)
    const publicApiPaths = ["/api/auth", "/api/health", "/api/docs"];
    if (publicApiPaths.some((p) => request.nextUrl.pathname.startsWith(p))) {
      return NextResponse.next();
    }

    // Verificar token Bearer
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Token no proporcionado o formato inválido" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
