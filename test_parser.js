const XLSX = require('xlsx');

function normalizeColumnName(col) {
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

const COLUMN_MAP = {
  ITEM: "item",
  "CANT.": "quantity",
  CANTIDAD: "quantity",
  "DESCRIPCION Y MEDIDA": "description",
  "DESCRIPCION PIEZA": "description",
  MARCA: "brand",
  CODIGO: "code",
  ESTADO: "status",
  CODIFICACION: "codification",
  UBICACION: "location",
  "ENLACE DE IMAGEN": "image_url",
  "ENLACE  DE IMAGEN ": "image_url",
};

function mapRow(row) {
  const mapped = {};
  for (const [originalKey, value] of Object.entries(row)) {
    const normalizedKey = normalizeColumnName(originalKey);
    const field = COLUMN_MAP[normalizedKey];
    if (field) {
      mapped[field] = typeof value === "string" ? value.trim() : value;
    }
  }
  return mapped;
}

const f2 = 'INVENTARIO DE SALA DE HERRAMIENTAS ESPECIALES.xls';
const wb = XLSX.readFile(f2);
const ws = wb.Sheets[wb.SheetNames[0]];

const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
let headerRowIndex = -1;
for (let i = 0; i < Math.min(20, rawRows.length); i++) {
  const rowString = rawRows[i].join("").toUpperCase();
  if (rowString.includes("ITEM") || rowString.includes("DESCRIPCION") || rowString.includes("CÓDIGO") || rowString.includes("CODIGO")) {
    headerRowIndex = i;
    break;
  }
}

console.log("Header index:", headerRowIndex);
const rows = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, defval: "", raw: false });

console.log("Total rows parsed:", rows.length);
for (let i = Math.max(0, rows.length - 15); i < rows.length; i++) {
    console.log(`Row ${i} original:`, rows[i]);
    console.log(`Row ${i} mapped:`, mapRow(rows[i]));
}
