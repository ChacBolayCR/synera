import { emptyNumber, emptyText, field, normalizeCode, normalizeDate, normalizeDescription, normalizeSpaces, parseMeasurement, parseNumber } from "./normalize";
import type { ConfidenceLevel, Invoice, InvoiceItem, ReviewIssue } from "./types";

const find = (text: string, patterns: RegExp[]) => { for (const pattern of patterns) { const match = text.match(pattern); if (match?.[1]) return normalizeSpaces(match[1]); } return null; };
const confidence = (value: unknown, labeled = true): ConfidenceLevel => value == null || value === "" ? "Baja" : labeled ? "Alta" : "Media";
const TABLE_HEADER = /c[oó]digo\s+principal|precio\s+unitario|precio\s+total|unidad\s+medida/i;
const NON_PRODUCT = /@|tel[eé]fono|direcci[oó]n|identificaci[oó]n|c[eé]dula|clave\s+num[eé]rica|fecha|facturado\s+a|entrega|c[oó]digo\s+cabys|descripci[oó]n|precio\s+unitario|precio\s+total|unidad\s+medida/i;
const plausibleQuantity = (value: number | null) => value != null && value > 0 && value <= 10_000_000;
const plausibleMoney = (value: number | null) => value != null && value >= 0 && value <= 1_000_000_000_000;
const closeEnough = (quantity: number, price: number, total: number) => Math.abs(quantity * price - total) <= Math.max(0.05, total * 0.02);

function tableRegion(text: string) {
  const lines = text.split(/\r?\n/).map(normalizeSpaces).filter(Boolean);
  const start = lines.findIndex((line) => TABLE_HEADER.test(line));
  return start >= 0 ? lines.slice(start + 1) : [];
}

function labeledValue(lines: string[], start: number, label: RegExp) {
  for (let index = start; index < Math.min(lines.length, start + 16); index += 1) {
    const match = lines[index].match(label); if (match?.[1]) return match[1];
  }
  return null;
}

function extractStructuredItems(lines: string[]): InvoiceItem[] {
  const items: InvoiceItem[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const codeLine = lines[index];
    if (!/^\d{5,14}$/.test(codeLine) || NON_PRODUCT.test(codeLine)) continue;
    const description = lines[index + 1];
    if (!description || NON_PRODUCT.test(description) || /^\d+$/.test(description) || description.length < 4) continue;
    const lotRaw = labeledValue(lines, index + 2, /(?:lote)\s*:?\s*([A-Z0-9-]+)/i);
    const cabysRaw = labeledValue(lines, index + 2, /(?:cabys|clave\s+cabys)\s*:?\s*([0-9]{8,20})/i);
    const grossRaw = labeledValue(lines, index + 2, /peso\s+bruto\s*:?\s*([\d.,]+)/i);
    const netRaw = labeledValue(lines, index + 2, /peso\s+neto\s*:?\s*([\d.,]+)/i);
    const quantityRaw = labeledValue(lines, index + 2, /cantidad\s*:?\s*([^\s]+)/i);
    const unitRaw = labeledValue(lines, index + 2, /(?:unidad(?:\s+medida)?)\s*:?\s*([A-Za-z]+)/i);
    const priceRaw = labeledValue(lines, index + 2, /precio\s+unitario\s*:?\s*([\d.,]+)/i);
    const totalRaw = labeledValue(lines, index + 2, /precio\s+total\s*:?\s*([\d.,]+)/i);
    const quantity = quantityRaw && /e[+-]?\d+/i.test(quantityRaw) ? null : parseMeasurement(quantityRaw); const price = parseNumber(priceRaw); const total = parseNumber(totalRaw);
    const signals = [codeLine, description, plausibleQuantity(quantity), plausibleMoney(price), plausibleMoney(total), quantity != null && price != null && total != null && closeEnough(quantity, price, total)].filter(Boolean).length;
    if (signals < 6 || quantity == null || price == null || total == null || !plausibleQuantity(quantity) || !plausibleMoney(price) || !plausibleMoney(total) || !closeEnough(quantity, price, total)) continue;
    items.push({ id: crypto.randomUUID(), code: field(codeLine, codeLine, "Alta"), description: field(description, normalizeDescription(description), "Alta"),
      quantity: field(quantityRaw, quantity, "Alta"), unit: field(unitRaw, unitRaw?.toLowerCase() ?? null, unitRaw ? "Alta" : "Baja"), unitPrice: field(priceRaw, price, "Alta"),
      discount: emptyNumber(), tax: emptyNumber(), lineTotal: field(totalRaw, total, closeEnough(quantity, price, total) ? "Alta" : "Baja"),
      lot: lotRaw ?? undefined, cabys: cabysRaw ?? undefined, grossWeight: parseMeasurement(grossRaw) ?? undefined, netWeight: parseMeasurement(netRaw) ?? undefined });
  }
  return items;
}

function extractCompactItems(lines: string[]): InvoiceItem[] {
  const items: InvoiceItem[] = [];
  const row = /^([A-Z0-9][A-Z0-9-]{2,20})\s+(.{3,80}?)\s+(\d+(?:[.,]\d+)?)\s+(UN|UND|UNI|UNIDAD|KG|CAJA|CJ|M|LT)\s*[₡$]?\s*([\d.,]+)\s*[₡$]?\s*([\d.,]+)$/i;
  for (const line of lines) {
    if (NON_PRODUCT.test(line)) continue; const match = line.match(row); if (!match) continue;
    const quantity = parseNumber(match[3]); const price = parseNumber(match[5]); const total = parseNumber(match[6]);
    if (quantity == null || price == null || total == null || !plausibleQuantity(quantity) || !plausibleMoney(price) || !plausibleMoney(total) || !closeEnough(quantity, price, total)) continue;
    items.push({ id: crypto.randomUUID(), code: field(match[1], normalizeCode(match[1]), "Alta"), description: field(match[2], normalizeDescription(match[2]), "Media"),
      quantity: field(match[3], quantity, "Alta"), unit: field(match[4], match[4].toLowerCase(), "Alta"), unitPrice: field(match[5], price, "Alta"), discount: emptyNumber(), tax: emptyNumber(), lineTotal: field(match[6], total, "Alta") });
  }
  return items;
}

function extractItems(text: string): InvoiceItem[] {
  const region = tableRegion(text); if (!region.length) return [];
  const structured = extractStructuredItems(region); return (structured.length ? structured : extractCompactItems(region)).slice(0, 200);
}

function hasOutOfRangeQuantity(text: string) {
  return tableRegion(text).some((line) => {
    const match = line.match(/cantidad\s*:?\s*([^\s]+)/i);
    if (!match) return false;
    if (/e[+-]?\d+/i.test(match[1])) return true;
    const value = parseMeasurement(match[1]);
    return value != null && !plausibleQuantity(value);
  });
}

function extractSupplier(text: string) {
  const labeled = find(text, [/(?:proveedor|supplier|raz[oó]n social)\s*[:#-]?\s*([^\n]{3,100})/i]); if (labeled) return labeled;
  const issuerBlock = text.split(/FACTURADO\s+A/i)[0];
  const companies = issuerBlock.split(/\r?\n/).map(normalizeSpaces).filter((line) => /\b(?:S\.?A\.?|S\.?R\.?L\.?|LTDA\.?|INC\.?|CORP\.?)\b/i.test(line) && !/@/.test(line));
  return companies.at(-1) ?? null;
}

export function extractInvoice(text: string, metadata: Pick<Invoice, "id" | "fileName" | "fileSize" | "sourceType" | "pageCount">): Invoice {
  const invoiceRaw = find(text, [/(?:n[uú]mero\s+de\s+factura|factura|n[uú]mero|no\.?|no|nro\.?)\s*[:#-]\s*([0-9A-Z-]{3,40})/i]);
  const dateRaw = find(text, [/(?:fecha\s+de\s+emisi[oó]n|fecha)\s*[:#-]?\s*(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?)/i, /(?:fecha)\s*[:#-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i]);
  const supplierRaw = extractSupplier(text);
  const supplierIdRaw = find(text, [/(?:c[eé]dula|identificaci[oó]n|tax id|ruc|nit)\s*[:#-]?\s*([A-Z0-9-]{5,40})/i]);
  const subtotalRaw = find(text, [/(?:^|\n)\s*subtotal\s*[:₡$]?\s*([\d.,]+)/im]);
  const taxRaw = find(text, [/(?:^|\n)\s*(?:impuesto|iva|i\.?v\.?a\.?|tax)\s*[:₡$]?\s*([\d.,]+)/im]);
  const totalRaw = find(text, [/(?:^|\n)\s*total(?:\s+a\s+pagar)?\s*[:₡$]?\s*([\d.,]+)/im]);
  const orderRaw = find(text, [/(?:orden\s+de\s+compra|o\.?c\.?|purchase\s+order)\s*[:#-]?\s*([^\n]{2,50})/i]);
  const termsRaw = find(text, [/(?:condiciones? de pago|forma de pago|payment terms)\s*[:#-]?\s*([^\n]{3,50})/i]);
  const dateValue = normalizeDate(dateRaw); const subtotal = parseNumber(subtotalRaw); const tax = parseNumber(taxRaw); const total = parseNumber(totalRaw);
  const currencyRaw = /\bUSD\b|US\$/.test(text) ? "USD" : /\bEUR\b|€/.test(text) ? "EUR" : /\bCRC\b|₡|colones?/i.test(text) ? "CRC" : null;
  const items = extractItems(text); const issues: ReviewIssue[] = [];
  if (!invoiceRaw && !dateValue && !supplierRaw) issues.push({ id: crypto.randomUUID(), field: "Encabezado", value: "Vacío", problem: "No se identificó factura, fecha ni proveedor", confidence: "Baja", resolved: false });
  if (TABLE_HEADER.test(text) && !items.length) issues.push({ id: crypto.randomUUID(), field: "Productos", value: "Vacío", problem: "Se detectó una tabla, pero ninguna línea cumplió las validaciones de producto", confidence: "Baja", resolved: false });
  if (hasOutOfRangeQuantity(text)) issues.push({ id: crypto.randomUUID(), field: "Cantidad", value: "Fuera de rango", problem: "Cantidad fuera de rango esperado.", confidence: "Baja", resolved: false });
  if (subtotal != null && tax != null && total != null && Math.abs(subtotal + tax - total) > Math.max(2, total * .02)) issues.push({ id: crypto.randomUUID(), field: "Total", value: String(total), problem: "Subtotal e impuesto no coinciden con el total", confidence: "Baja", resolved: false });
  for (const entry of items) if (!plausibleQuantity(entry.quantity.normalizedValue) || entry.lineTotal.confidence === "Baja") issues.push({ id: crypto.randomUUID(), field: "Producto", value: entry.description.originalValue ?? "", problem: "Cantidad o total de línea inconsistente", confidence: "Baja", resolved: false });
  const levels = [invoiceRaw, dateValue, supplierRaw, total].filter(Boolean).length; const overall: ConfidenceLevel = issues.length ? "Baja" : levels >= 3 ? "Alta" : "Media";
  return { ...metadata, status: issues.length ? "Requiere revisión" : "Completado", progress: 100, progressLabel: "Análisis completado",
    invoiceNumber: field(invoiceRaw, invoiceRaw, confidence(invoiceRaw)), date: field(dateRaw, dateValue, confidence(dateValue)), supplier: field(supplierRaw, supplierRaw, confidence(supplierRaw)), supplierId: field(supplierIdRaw, supplierIdRaw, confidence(supplierIdRaw)),
    currency: field(currencyRaw, currencyRaw, confidence(currencyRaw)), subtotal: field(subtotalRaw, subtotal, confidence(subtotal)), tax: field(taxRaw, tax, confidence(tax)), total: field(totalRaw, total, confidence(total)), purchaseOrder: field(orderRaw, orderRaw, confidence(orderRaw)), paymentTerms: field(termsRaw, termsRaw, confidence(termsRaw)), items, issues, confidence: overall, rawText: text };
}

export function blankInvoice(file: File): Invoice {
  return { id: crypto.randomUUID(), fileName: file.name, fileSize: file.size, sourceType: "Texto", pageCount: 0, status: "Pendiente", progress: 0, progressLabel: "En espera", invoiceNumber: emptyText(), date: emptyText(), supplier: emptyText(), supplierId: emptyText(), currency: emptyText(), subtotal: emptyNumber(), tax: emptyNumber(), total: emptyNumber(), purchaseOrder: emptyText(), paymentTerms: emptyText(), items: [], issues: [], confidence: "Baja" };
}
