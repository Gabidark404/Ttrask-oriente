import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError, authorizeRole } from "@/lib/api-utils";
import * as XLSX from "xlsx";

const COLUMN_MAP: Record<string, string> = {
  ITEM: "item",
  "CANT.": "quantity",
  CANTIDAD: "quantity",
  "DESCRIPCIÓN Y MEDIDA": "description",
  "DESCRIPCION Y MEDIDA": "description",
  MARCA: "brand",
  CÓDIGO: "code",
  CODIGO: "code",
  ESTADO: "status",
  CODIFICACIÓN: "codification",
  CODIFICACION: "codification",
  UBICACIÓN: "location",
  UBICACION: "location",
  IMAGEN: "image_url",
  FOTO: "image_url",
};

const STATUS_MAP: Record<string, string> = {
  "BUENA": "Disponible",
  "BUENO": "Disponible",
  "NUEVO": "Disponible",
  "POR CALIBRAR": "En mantenimiento",
  "DAÑADO": "Fuera de servicio",
  "MALA": "Fuera de servicio",
  "MALO": "Fuera de servicio",
  "EXTRAVIADA": "Extraviada",
  "PRESTADA": "Prestada",
};

const STATUS_VALUES = ["Disponible", "Prestada", "Reservada", "En mantenimiento", "Extraviada", "Fuera de servicio"];

function normalizeColumnName(col: string) {
  return col
    .trim()
    .toUpperCase()
    .replace(/[ÁÀÄ]/g, "A")
    .replace(/[ÉÈË]/g, "E")
    .replace(/[ÍÌÏ]/g, "I")
    .replace(/[ÓÒÖ]/g, "O")
    .replace(/[ÚÙÜ]/g, "U")
    .replace(/Ñ/g, "N");
}

function mapRow(row: any) {
  const mapped: any = {};
  for (const [originalKey, value] of Object.entries(row)) {
    const normalizedKey = normalizeColumnName(originalKey);
    const field = COLUMN_MAP[normalizedKey];
    if (field) {
      mapped[field] = typeof value === "string" ? value.trim() : value;
    }
  }
  
  if (mapped.status) {
    const upperStatus = String(mapped.status).trim().toUpperCase();
    if (STATUS_MAP[upperStatus]) {
      mapped.status = STATUS_MAP[upperStatus];
    } else if (!STATUS_VALUES.includes(mapped.status)) {
       mapped.status = "Disponible"; // Default para estados desconocidos
    }
  }

  // Eliminamos el fallback de ITEM a CÓDIGO
  return mapped;
}

function validateRow(mapped: any, index: number) {
  const errors = [];
  // Eliminada la validación de código obligatorio para permitir herramientas sin código
  if (!mapped.description) errors.push(`Fila ${index}: Falta descripción (DESCRIPCIÓN Y MEDIDA)`);
  return errors;
}

function buildToolRecord(mapped: any, index: number) {
  const qty = parseInt(mapped.quantity) || 1;
  // Si no tiene código, generamos uno interno único para que Supabase no dé error de UNIQUE
  const finalCode = mapped.code ? mapped.code.toString().trim() : `__NO_CODE__${index}_${Date.now()}`;
  
  return {
    item: parseInt(mapped.item) || index,
    code: finalCode,
    codification: mapped.codification || "",
    description: mapped.description,
    brand: mapped.brand || "",
    quantity: qty,
    available: qty,
    status: mapped.status || "Disponible",
    location: mapped.location || "",
    image_url: mapped.image_url || null,
    last_update: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const canImport = await authorizeRole(auth.supabase, ["admin", "supervisor", "almacenista"]);
    if (!canImport) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("excel") as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se envió archivo Excel (campo "excel")' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Start reading at row index 5 (which is the 6th row, where headers are)
    const rows = XLSX.utils.sheet_to_json(worksheet, { range: 5, defval: "", raw: false });

    if (rows.length === 0) {
      return NextResponse.json({ error: "No se encontraron datos a partir de la fila 6" }, { status: 400 });
    }

    let processed = 0, added = 0, updated = 0, errors = 0;
    const errorDetails: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      processed++;
      const mapped = mapRow(rows[i]);
      if (!mapped.code && !mapped.item) {
        // Probablemente sea una fila de pie de página (firmas, totales)
        continue;
      }

      const validationErrors = validateRow(mapped, i + 1);

      if (validationErrors.length > 0) {
        errors += validationErrors.length;
        errorDetails.push(...validationErrors);
        continue;
      }

      const toolRecord = buildToolRecord(mapped, i + 1);

      const { data: existing, error: findErr } = await auth.supabase
        .from("tools")
        .select("id, available, quantity")
        .eq("code", toolRecord.code)
        .single();

      if (findErr && findErr.code !== "PGRST116") {
        errors++;
        errorDetails.push(`Fila ${i + 1}: Error consultando BD - ${findErr.message}`);
        continue;
      }

      if (existing) {
        const newAvailable = Math.min(
          toolRecord.quantity,
          existing.available + (toolRecord.quantity - existing.quantity)
        );
        const { error: updErr } = await auth.supabase
          .from("tools")
          .update({
            ...toolRecord,
            available: newAvailable,
            last_update: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updErr) {
          errors++;
          errorDetails.push(`Fila ${i + 1}: Error actualizando - ${updErr.message}`);
        } else {
          updated++;
        }
      } else {
        const { error: insErr } = await auth.supabase.from("tools").insert([toolRecord]);
        if (insErr) {
          errors++;
          errorDetails.push(`Fila ${i + 1}: Error insertando - ${insErr.message}`);
        } else {
          added++;
        }
      }
    }

    const { data: { user: authUser } } = await auth.supabase.auth.getUser();

    await auth.supabase.from("notifications").insert([
      {
        message: `Importación Excel completada: ${added} nuevas, ${updated} actualizadas, ${errors} errores`,
        created_by: authUser?.email || "Sistema",
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Importación completada",
      report: { processed, added, updated, errors, errorDetails: errorDetails.slice(0, 20) },
    });
  } catch (err) {
    return handleApiError(err, "Error procesando archivo Excel");
  }
}
