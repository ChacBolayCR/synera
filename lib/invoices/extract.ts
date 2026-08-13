import { emptyNumber, emptyText, field, normalizeCode, normalizeDate, normalizeDescription, normalizeSpaces, parseNumber } from "./normalize";
import type { ConfidenceLevel, Invoice, InvoiceItem, ReviewIssue } from "./types";

const find = (text: string, patterns: RegExp[]) => { for (const pattern of patterns) { const match = text.match(pattern); if (match?.[1]) return normalizeSpaces(match[1]); } return null; };
const confidence = (value: unknown, labeled = true): ConfidenceLevel => value == null || value === "" ? "Baja" : labeled ? "Alta" : "Media";

function extractItems(text: string): InvoiceItem[] {
  const lines = text.split(/\r?\n/).map(normalizeSpaces).filter(Boolean);
  const items: InvoiceItem[] = [];
  const rowPattern = /^(?:([A-Z0-9][A-Z0-9-]{2,})\s+)?(.{3,80}?)\s+(\d+(?:[.,]\d+)?)\s+(UN|UND|UNI|UNIDAD|KG|CAJA|CJ|M|LT)?\s*[₡$]?\s*([\d.,]+)\s*[₡$]?\s*([\d.,]+)$/i;
  for (const line of lines) {
    const match = line.match(rowPattern); if (!match) continue;
    const quantity = parseNumber(match[3]); const price = parseNumber(match[5]); const total = parseNumber(match[6]);
    if (quantity == null || price == null || total == null || quantity <= 0) continue;
    items.push({ id: crypto.randomUUID(), code: match[1] ? field(match[1], normalizeCode(match[1]), "Alta") : emptyText(),
      description: field(match[2], normalizeDescription(match[2]), "Media"), quantity: field(match[3], quantity, "Alta"),
      unit: match[4] ? field(match[4], match[4].toLowerCase(), "Media") : field(null, "unidad", "Baja"), unitPrice: field(match[5], price, "Alta"),
      discount: emptyNumber(), tax: emptyNumber(), lineTotal: field(match[6], total, Math.abs(quantity * price - total) <= Math.max(1, total * .02) ? "Alta" : "Baja") });
  }
  return items.slice(0, 200);
}

export function extractInvoice(text: string, metadata: Pick<Invoice, "id" | "fileName" | "fileSize" | "sourceType" | "pageCount">): Invoice {
  const invoiceRaw = find(text, [/(?:factura|invoice|n[úu]mero|no\.?|nro\.?)\s*[:#-]?\s*([A-Z0-9-]{3,})/i]);
  const dateRaw = find(text, [/(?:fecha|date)\s*[:#-]?\s*(\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{1,4})/i, /(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/]);
  const supplierRaw = find(text, [/(?:proveedor|supplier|raz[oó]n social)\s*[:#-]?\s*([^\n]{3,80})/i]);
  const supplierIdRaw = find(text, [/(?:c[eé]dula|identificaci[oó]n|tax id|ruc|nit)\s*[:#-]?\s*([A-Z0-9-]{5,})/i]);
  const subtotalRaw = find(text, [/(?:subtotal)\s*[:₡$]?\s*([\d.,]+)/i]);
  const taxRaw = find(text, [/(?:impuesto|iva|i\.?v\.?a\.?|tax)\s*[:₡$]?\s*([\d.,]+)/i]);
  const totalRaw = find(text, [/(?:^|\n)\s*total(?:\s+a\s+pagar)?\s*[:₡$]?\s*([\d.,]+)/im]);
  const orderRaw = find(text, [/(?:orden de compra|o\.?c\.?|purchase order)\s*[:#-]?\s*([A-Z0-9-]+)/i]);
  const termsRaw = find(text, [/(?:condiciones? de pago|forma de pago|payment terms)\s*[:#-]?\s*([^\n]{3,50})/i]);
  const dateValue = normalizeDate(dateRaw); const subtotal = parseNumber(subtotalRaw); const tax = parseNumber(taxRaw); const total = parseNumber(totalRaw);
  const currencyRaw = /\bUSD\b|US\$|\$/.test(text) ? "USD" : /\bEUR\b|€/.test(text) ? "EUR" : /\bCRC\b|₡|colones?/i.test(text) ? "CRC" : null;
  const items = extractItems(text); const issues: ReviewIssue[] = [];
  if (!invoiceRaw && !dateValue && !supplierRaw) issues.push({ id: crypto.randomUUID(), field: "Encabezado", value: "Vacío", problem: "No se identificó factura, fecha ni proveedor", confidence: "Baja", resolved: false });
  if (subtotal != null && tax != null && total != null && Math.abs(subtotal + tax - total) > Math.max(2, total * .02)) issues.push({ id: crypto.randomUUID(), field: "Total", value: String(total), problem: "Subtotal e impuesto no coinciden con el total", confidence: "Baja", resolved: false });
  for (const entry of items) if ((entry.quantity.normalizedValue ?? 0) <= 0 || entry.lineTotal.confidence === "Baja") issues.push({ id: crypto.randomUUID(), field: "Producto", value: entry.description.originalValue ?? "", problem: "Cantidad o total de línea inconsistente", confidence: "Baja", resolved: false });
  const levels = [invoiceRaw, dateValue, supplierRaw, total].filter(Boolean).length; const overall: ConfidenceLevel = issues.length ? "Baja" : levels >= 3 ? "Alta" : "Media";
  return { ...metadata, status: issues.length ? "Requiere revisión" : "Completado", progress: 100, progressLabel: "Análisis completado",
    invoiceNumber: field(invoiceRaw, invoiceRaw, confidence(invoiceRaw)), date: field(dateRaw, dateValue, confidence(dateValue)),
    supplier: field(supplierRaw, supplierRaw ? normalizeDescription(supplierRaw) : null, confidence(supplierRaw)), supplierId: field(supplierIdRaw, supplierIdRaw, confidence(supplierIdRaw)),
    currency: field(currencyRaw, currencyRaw, confidence(currencyRaw)), subtotal: field(subtotalRaw, subtotal, confidence(subtotal)), tax: field(taxRaw, tax, confidence(tax)),
    total: field(totalRaw, total, confidence(total)), purchaseOrder: field(orderRaw, orderRaw, confidence(orderRaw)), paymentTerms: field(termsRaw, termsRaw, confidence(termsRaw)),
    items, issues, confidence: overall, rawText: text };
}

export function blankInvoice(file: File): Invoice {
  return { id: crypto.randomUUID(), fileName: file.name, fileSize: file.size, sourceType: "Texto", pageCount: 0, status: "Pendiente", progress: 0, progressLabel: "En espera",
    invoiceNumber: emptyText(), date: emptyText(), supplier: emptyText(), supplierId: emptyText(), currency: emptyText(), subtotal: emptyNumber(), tax: emptyNumber(), total: emptyNumber(), purchaseOrder: emptyText(), paymentTerms: emptyText(), items: [], issues: [], confidence: "Baja" };
}
