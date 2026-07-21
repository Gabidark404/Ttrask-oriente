import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, handleApiError } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthSupabase(req);
    if (!auth?.supabase) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const bucket = (formData.get("bucket") as string) || "tool-images";
    const customPath = formData.get("path") as string;

    if (!file) return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });

    const isImage = (file.type && file.type.startsWith("image/")) || /\.(jpg|jpeg|png|webp|gif|heic|jfif)$/i.test(file.name);
    if (!isImage) {
      return NextResponse.json({ error: "Tipo de archivo no permitido. Use JPG, PNG o WEBP." }, { status: 400 });
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo no puede superar 8MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const rawPath = customPath || `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    
    // Sanitize storage path to avoid invalid character errors in Supabase Storage
    const cleanPath = rawPath
      .split("/")
      .map(part => part.replace(/[^a-zA-Z0-9_.-]/g, "_"))
      .join("/");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let publicUrl = "";

    try {
      // Auto-create bucket if missing
      try {
        const { data: buckets } = await auth.supabase.storage.listBuckets();
        if (buckets && !buckets.some((b: any) => b.name === bucket)) {
          await auth.supabase.storage.createBucket(bucket, { public: true });
        }
      } catch {
        // Ignore bucket list/create permission errors
      }

      const { error: uploadErr } = await auth.supabase.storage
        .from(bucket)
        .upload(cleanPath, buffer, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });

      if (uploadErr) {
        throw uploadErr;
      }

      const { data: urlData } = auth.supabase.storage
        .from(bucket)
        .getPublicUrl(cleanPath);

      publicUrl = urlData.publicUrl;
    } catch (storageErr: any) {
      console.warn("Supabase Storage upload failed, using Data URL fallback:", storageErr?.message || storageErr);
      // Fallback to Base64 Data URL if image <= 3MB so saving image never breaks the user flow
      if (buffer.length <= 3 * 1024 * 1024) {
        const mime = file.type || "image/jpeg";
        publicUrl = `data:${mime};base64,${buffer.toString("base64")}`;
      } else {
        return NextResponse.json({
          error: `Error de almacenamiento Supabase: ${storageErr?.message || "No se pudo subir la imagen."}`,
          details: storageErr?.message,
        }, { status: 500 });
      }
    }

    return NextResponse.json({ url: publicUrl, path: cleanPath }, { status: 201 });
  } catch (err) {
    return handleApiError(err, "Error al subir imagen");
  }
}
