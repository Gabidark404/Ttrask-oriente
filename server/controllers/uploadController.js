const XLSX = require('xlsx');

const REQUIRED_COLUMNS = ['CODE', 'CÓDIGO'];
const COLUMN_MAP = {
  'ITEM': 'item',
  'CANTIDAD': 'quantity',
  'DESCRIPCIÓN Y MEDIDA': 'description',
  'DESCRIPCION Y MEDIDA': 'description',
  'MARCA': 'brand',
  'CÓDIGO': 'code',
  'CODIGO': 'code',
  'ESTADO': 'status',
  'CODIFICACIÓN': 'codification',
  'CODIFICACION': 'codification',
  'UBICACIÓN': 'location',
  'UBICACION': 'location'
};

const STATUS_VALUES = ['Disponible', 'Prestada', 'Reservada', 'En mantenimiento', 'Extraviada', 'Fuera de servicio'];

function normalizeColumnName(col) {
  return col.trim().toUpperCase().replace(/[ÁÀÄ]/g, 'A').replace(/[ÉÈË]/g, 'E').replace(/[ÍÌÏ]/g, 'I').replace(/[ÓÒÖ]/g, 'O').replace(/[ÚÙÜ]/g, 'U').replace(/Ñ/g, 'N');
}

function mapRow(row) {
  const mapped = {};
  for (const [originalKey, value] of Object.entries(row)) {
    const normalizedKey = normalizeColumnName(originalKey);
    const field = COLUMN_MAP[normalizedKey];
    if (field) {
      mapped[field] = typeof value === 'string' ? value.trim() : value;
    }
  }
  return mapped;
}

function validateRow(mapped, index) {
  const errors = [];
  if (!mapped.code) errors.push(`Fila ${index}: Falta código (CÓDIGO)`);
  if (!mapped.description) errors.push(`Fila ${index}: Falta descripción (DESCRIPCIÓN Y MEDIDA)`);
  if (mapped.status && !STATUS_VALUES.includes(mapped.status)) {
    errors.push(`Fila ${index}: Estado inválido "${mapped.status}". Valores: ${STATUS_VALUES.join(', ')}`);
  }
  return errors;
}

function buildToolRecord(mapped, index) {
  const qty = parseInt(mapped.quantity) || 0;
  return {
    item: parseInt(mapped.item) || index,
    code: mapped.code,
    codification: mapped.codification || '',
    description: mapped.description,
    brand: mapped.brand || '',
    quantity: qty,
    available: qty,
    status: mapped.status || 'Disponible',
    location: mapped.location || '',
    last_update: new Date().toISOString()
  };
}

exports.importExcel = async (req, res) => {
  try {
    if (!req.files || !req.files.excel) {
      return res.status(400).json({ error: 'No se envió archivo Excel (campo "excel")' });
    }

    const file = req.files.excel;
    const workbook = XLSX.read(file.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío' });
    }

    let processed = 0;
    let added = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails = [];

    for (let i = 0; i < rows.length; i++) {
      processed++;
      const mapped = mapRow(rows[i]);
      const validationErrors = validateRow(mapped, i + 1);

      if (validationErrors.length > 0) {
        errors += validationErrors.length;
        errorDetails.push(...validationErrors);
        continue;
      }

      const toolRecord = buildToolRecord(mapped, i + 1);

      const { data: existing, error: findErr } = await req.supabase
        .from('tools')
        .select('id, available, quantity')
        .eq('code', toolRecord.code)
        .single();

      if (findErr && findErr.code !== 'PGRST116') {
        errors++;
        errorDetails.push(`Fila ${i + 1}: Error consultando BD - ${findErr.message}`);
        continue;
      }

      if (existing) {
        const newAvailable = Math.min(toolRecord.quantity, existing.available + (toolRecord.quantity - existing.quantity));
        const { error: updErr } = await req.supabase
          .from('tools')
          .update({
            ...toolRecord,
            available: newAvailable,
            last_update: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (updErr) {
          errors++;
          errorDetails.push(`Fila ${i + 1}: Error actualizando - ${updErr.message}`);
        } else {
          updated++;
        }
      } else {
        const { error: insErr } = await req.supabase.from('tools').insert([toolRecord]);
        if (insErr) {
          errors++;
          errorDetails.push(`Fila ${i + 1}: Error insertando - ${insErr.message}`);
        } else {
          added++;
        }
      }
    }

    await req.supabase.from('notifications').insert([{
      message: `Importación Excel completada: ${added} nuevas, ${updated} actualizadas, ${errors} errores`,
      created_by: req.user?.email || 'Sistema'
    }]);

    res.json({
      success: true,
      message: 'Importación completada',
      report: {
        processed,
        added,
        updated,
        errors,
        errorDetails: errorDetails.slice(0, 20)
      }
    });
  } catch (err) {
    console.error('Error importExcel:', err);
    res.status(500).json({ error: 'Error procesando archivo Excel', details: err.message });
  }
};