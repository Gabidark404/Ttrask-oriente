import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const supabase = auth.supabase;
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.app_metadata?.role || "tecnico";
    const email = user?.email || "";

    if (role === "supervisor") {
      // 1. Fetch Tools
      const { data: toolsData, error: err1 } = await supabase.from("tools").select("*");
      if (err1) throw err1;

      // 2. Fetch Requests
      const { data: requestsData, error: err2 } = await supabase.from("requests").select(`
        *,
        tools(description, code)
      `);
      if (err2) throw err2;

      // 3. Fetch Concesionarios (ignore if not exists)
      let concesionariosData: any[] = [];
      try {
        const { data } = await supabase.from("concesionarios").select("*");
        if (data) concesionariosData = data;
      } catch (e) {
        // Ignore if table doesn't exist
      }
      
      const tools = toolsData || [];
      const requests = requestsData || [];
      const concesionarios = concesionariosData || [];

      // Basic Counts
      const total = tools.length;
      const prestadas = tools.filter(t => t.status === "Prestada").length;
      const disponibles = tools.filter(t => t.status === "Disponible").length;
      const mantenimiento = tools.filter(t => t.status === "En mantenimiento").length;
      const extraviadas = tools.filter(t => t.status === "Extraviada").length;
      const pendingRequests = requests.filter(r => r.status === "Pendiente").length;

      // Status Distribution
      const statuses = ["Disponible", "Prestada", "Reservada", "En mantenimiento", "Extraviada", "Fuera de servicio"];
      const colors = {
        "Disponible": "#10B981",
        "Prestada": "#F59E0B",
        "Reservada": "#3B82F6",
        "En mantenimiento": "#F97316",
        "Extraviada": "#EF4444",
        "Fuera de servicio": "#6B7280"
      };

      const statusDistribution = statuses.map(st => {
        return {
          name: st,
          value: tools.filter(t => t.status === st).length,
          color: colors[st as keyof typeof colors] || "#000"
        };
      }).filter(s => s.value > 0);

      // Top Requested Tools
      const toolCounts: Record<string, { count: number, description: string, code: string }> = {};
      requests.forEach(r => {
        if (!r.tool_id) return;
        if (!toolCounts[r.tool_id]) {
          const t = Array.isArray(r.tools) ? r.tools[0] : r.tools;
          toolCounts[r.tool_id] = {
            count: 0,
            description: t?.description || "Desconocida",
            code: t?.code || r.tool_id
          };
        }
        toolCounts[r.tool_id].count += 1;
      });

      const topRequested = Object.values(toolCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Request Trend (Last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      
      const trendsMap: Record<string, number> = {};
      requests.forEach(r => {
        if (r.request_date) {
          const d = new Date(r.request_date);
          if (d >= thirtyDaysAgo) {
            const dateStr = d.toISOString().split("T")[0];
            trendsMap[dateStr] = (trendsMap[dateStr] || 0) + 1;
          }
        }
      });
      const requestTrend = Object.keys(trendsMap).sort().map(k => ({ date: k, count: trendsMap[k] }));

      // Return Rate
      const devueltas = requests.filter(r => r.status === "Devuelta").length;
      const prestadasTotal = requests.filter(r => r.status === "Aprobada" || r.status === "Prestada" || r.status === "Devuelta").length;
      
      const returnRate = prestadasTotal > 0 ? (devueltas / prestadasTotal) * 100 : 0;

      // Concesionario Stats
      const concesionarioStats = concesionarios.map(c => {
        const cTools = tools.filter(t => t.concesionario_id === c.id);
        return {
          name: c.name,
          total: cTools.length,
          disponibles: cTools.filter(t => t.status === "Disponible").length
        };
      });

      return NextResponse.json({
        total,
        disponibles,
        prestadas,
        mantenimiento,
        extraviadas,
        pendingRequests,
        statusDistribution,
        topRequested,
        requestTrend,
        returnRate: parseFloat(returnRate.toFixed(1)),
        concesionarioStats
      });

    } else {
      // Estadísticas individuales para técnicos
      const [
        { count: misPrestamos, error: e1 },
        { count: misPendientes, error: e2 },
        { count: misRechazadas, error: e3 },
        { count: misHistorico, error: e4 },
      ] = await Promise.all([
        supabase.from("requests").select("id", { count: "exact", head: true }).eq("requested_by", email).eq("status", "Aprobada"),
        supabase.from("requests").select("id", { count: "exact", head: true }).eq("requested_by", email).eq("status", "Pendiente"),
        supabase.from("requests").select("id", { count: "exact", head: true }).eq("requested_by", email).eq("status", "Rechazada"),
        supabase.from("requests").select("id", { count: "exact", head: true }).eq("requested_by", email).eq("status", "Aprobada"),
      ]);

      if (e1 || e2 || e3 || e4) throw e1 || e2 || e3 || e4;

      return NextResponse.json({
        misPrestamos,
        misPendientes,
        misRechazadas,
        misHistorico,
      });
    }
  } catch (err) {
    return handleApiError(err, "Error al obtener dashboard");
  }
}
