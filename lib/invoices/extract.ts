import { emptyNumber, emptyText, field, normalizeCode, normalizeDate, normalizeDescription, normalizeSpaces, parseMeasurement, parseNumber } from "./normalize";
import type { ConfidenceLevel, Invoice, InvoiceItem, PdfTextToken, ReviewIssue } from "./types";

const find = (text: string, patterns: RegExp[]) => { for (const pattern of patterns) { const match = text.match(pattern); if (match?.[1]) return normalizeSpaces(match[1]); } return null; };
const confidence = (value: unknown, labeled = true): ConfidenceLevel => value == null || value === "" ? "Baja" : labeled ? "Alta" : "Media";
const TABLE_HEADER = /c[oó]digo\s+principal|precio\s+unitario|precio\s+total|unidad\s+medida/i;
const NON_PRODUCT = /@|tel[eé]fono|direcci[oó]n|identificaci[oó]n|c[eé]dula|clave\s+num[eé]rica|fecha|facturado\s+a|entrega|c[oó]digo\s+cabys|descripci[oó]n|precio\s+unitario|precio\s+total|unidad\s+medida/i;
const plausibleQuantity = (value: number | null) => value != null && value > 0 && value <= 10_000_000;
const plausibleMoney = (value: number | null) => value != null && value >= 0 && value <= 1_000_000_000_000;
const closeEnough = (quantity: number, price: number, total: number) => Math.abs(quantity * price - total) <= Math.max(1, total * 0.05);
const numericId = (value: string | null, min = 5, max = 60) => { const clean = value?.replace(/\D/g, "") ?? ""; return clean.length >= min && clean.length <= max ? clean : null; };
const rightOfLabel = (tokens: PdfTextToken[], label: RegExp) => { const anchor = tokens.find((token) => label.test(token.text)); if (!anchor) return null; return tokens.filter((token) => token !== anchor && token.x > anchor.x + anchor.width - 2 && Math.abs(token.y - anchor.y) <= Math.max(4, anchor.height * .7)).sort((a, b) => a.x - b.x)[0]?.text ?? null; };

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
    const descriptionLines: string[] = [];
    for (let cursor = index + 1; cursor < Math.min(lines.length, index + 6); cursor += 1) {
      if (/^(?:c[oó]digo\s+cabys|cabys|lote|peso\s+bruto|peso\s+neto|cantidad|unidad|precio)/i.test(lines[cursor]) || /^\d{5,14}$/.test(lines[cursor])) break;
      if (!NON_PRODUCT.test(lines[cursor])) descriptionLines.push(lines[cursor]);
    }
    const description = normalizeSpaces(descriptionLines.join(" "));
    if (!description || /^\d+$/.test(description) || description.length < 4) continue;
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

function extractPositionalItems(tokens: PdfTextToken[]): InvoiceItem[] {
  if (!tokens.length) return [];
  const header = tokens.filter((token) => /c[oó]digo|descripci[oó]n|cantidad|precio|lote|peso|unidad/i.test(token.text));
  if (header.length < 4) return [];
  const headerY = Math.max(...header.map((token) => token.y));
  const body = tokens.filter((token) => token.y < headerY - 2 && !/observaciones|subtotal|total\s+del\s+comprobante/i.test(token.text));
  const codes = body.filter((token) => /^\d{5,10}$/.test(token.text)).sort((a, b) => b.y - a.y);
  return codes.flatMap((code, index) => {
    const nextY = codes[index + 1]?.y ?? -Infinity;
    const group = body.filter((token) => token.y <= code.y + 3 && token.y > nextY + 3);
    const label = (regex: RegExp) => group.map((token) => token.text).join(" ").match(regex)?.[1] ?? null;
    const numbers = group.filter((token) => /^[\d,.]+$/.test(token.text) && token !== code).sort((a, b) => a.x - b.x);
    const quantityRaw = label(/cantidad\s*:?[ ]*([\d,.]+)/i) ?? numbers.at(-3)?.text ?? null;
    const priceRaw = label(/precio\s+unitario\s*:?[ ]*([\d,.]+)/i) ?? numbers.at(-2)?.text ?? null;
    const totalRaw = label(/precio\s+total\s*:?[ ]*([\d,.]+)/i) ?? numbers.at(-1)?.text ?? null;
    const quantity = parseMeasurement(quantityRaw); const price = parseNumber(priceRaw); const total = parseNumber(totalRaw);
    if (quantity == null || price == null || total == null || !plausibleQuantity(quantity) || !plausibleMoney(price) || !plausibleMoney(total)) return [];
    const description = normalizeSpaces(group.filter((token) => token.x > code.x && /[A-Za-zÁÉÍÓÚÑ]/i.test(token.text) && !/cabys|lote|peso|cantidad|unidad|precio/i.test(token.text)).sort((a, b) => b.y - a.y || a.x - b.x).map((token) => token.text).join(" "));
    return [{ id: crypto.randomUUID(), code: field(code.text, code.text, "Alta"), description: field(description, description || null, description ? "Media" : "Baja"), quantity: field(quantityRaw, quantity, "Alta"), unit: field("kg", "kg", "Media"), unitPrice: field(priceRaw, price, "Alta"), discount: emptyNumber(), tax: emptyNumber(), lineTotal: field(totalRaw, total, closeEnough(quantity, price, total) ? "Alta" : "Media"), lot: numericId(label(/lote\s*:?[ ]*([A-Z0-9-]+)/i), 4, 30) ?? undefined, cabys: numericId(label(/(?:c[oó]digo\s+)?cabys\s*:?[ ]*(\d{8,20})/i), 8, 20) ?? undefined }];
  });
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
  const company = companies.at(-1) ?? null;
  return company?.match(/^(.+?\b(?:S\.?A\.?|S\.?R\.?L\.?|LTDA\.?|INC\.?|CORP\.?))/i)?.[1] ?? company;
}

export function extractInvoice(text: string, metadata: Pick<Invoice, "id" | "fileName" | "fileSize" | "sourceType" | "pageCount">, tokens: PdfTextToken[] = [], expectedDocumentType?: "invoice" | "delivery_note"): Invoice {
  const documentType: Invoice["documentType"] = /\bnota\s+de\s+entrega\b/i.test(text) ? "delivery_note" : /\bfactura\b|tipo\s+documento\s*:\s*01/i.test(text) ? "invoice" : "unknown";
  const effectiveDocumentType: Invoice["documentType"] = expectedDocumentType ?? documentType;
  const invoiceRaw = find(text, [/(?:n[uú]mero\s+de\s+factura|factura|n[uú]mero|no\.?|no|nro\.?)\s*[:#-]\s*([0-9A-Z-]{3,40})/i]);
  const dateRaw = find(text, [/(?:fecha\s+de\s+emisi[oó]n|fecha)\s*[:#-]?\s*(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?)/i, /(?:fecha)\s*[:#-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i]) ?? rightOfLabel(tokens, /fecha\s+de\s+emisi[oó]n|fecha/i);
  const supplierRaw = extractSupplier(text);
  const supplierIdRaw = numericId(find(text.split(/FACTURADO\s+A/i)[0], [/(?:tax id|c[eé]dula\s+jur[ií]dica|identificaci[oó]n)\s*[:#-]?\s*([\d-]{5,30})/i]));
  const subtotalRaw = find(text, [/(?:^|\n)\s*subtotal\s*[:₡$]?\s*([\d.,]+)/im]);
  const taxRaw = find(text, [/(?:^|\n)\s*(?:impuesto|iva|i\.?v\.?a\.?|tax)\s*[:₡$]?\s*([\d.,]+)/im]);
  const totalRaw = find(text, [/(?:^|\n)\s*total(?:\s+a\s+pagar)?\s*[:₡$]?\s*([\d.,]+)/im]);
  const orderRaw = find(text, [/(?:^|\n)\s*orden\s+de\s+compra\s*[:#-]\s*([^\n]{2,50})/im]) ?? rightOfLabel(tokens, /orden\s+de\s+compra/i);
  const termsRaw = find(text, [/(?:condiciones? de pago|forma de pago|payment terms)\s*[:#-]?\s*([^\n]{3,50})/i]);
  const dateValue = normalizeDate(dateRaw); const subtotal = parseNumber(subtotalRaw); const tax = parseNumber(taxRaw); const total = parseNumber(totalRaw);
  const currencyRaw = /\bUSD\b|US\$/.test(text) ? "USD" : /\bEUR\b|€/.test(text) ? "EUR" : /\bCRC\b|₡|colones?/i.test(text) ? "CRC" : null;
  const exact = (regex: RegExp) => find(text, [new RegExp(`(?:^|\\n)\\s*${regex.source}\\s*[:#-]\\s*([^\\n]+)`, "im")]);
  const deliveryNumberRaw = find(text, [effectiveDocumentType === "delivery_note" ? /(?:^|\n)\s*(?:n[uú]mero\s+de\s+entrega|entrega)\s*[:#-]\s*([\d\s.-]+)/im : /(?:^|\n)\s*entrega\s*[:#-]\s*([\d\s.-]+)/im]) ?? rightOfLabel(tokens, effectiveDocumentType === "delivery_note" ? /n[uú]mero\s+de\s+entrega/i : /^entrega\s*:?$/i);
  const clientBlock = text.split(/FACTURADO\s+A/i)[1]?.split(/ENTREGADO\s+EN|CONDICIONES|DOC\.?\s*INTERNO|C[oó]digo\s+Principal/i)[0] ?? "";
  const clientRaw = clientBlock.split(/\r?\n/).map(normalizeSpaces).find((line) => line.length > 3 && !/c[eé]dula|tel[eé]fono|email|@/i.test(line)) ?? null;
  const positionalItems = extractPositionalItems(tokens);
  const items = effectiveDocumentType === "delivery_note" ? [] : positionalItems.length ? positionalItems : extractItems(text); const issues: ReviewIssue[] = [];
  if (documentType === "delivery_note") issues.push({ id: crypto.randomUUID(), field: "Tipo documento", value: "Nota de Entrega", problem: "El documento es una nota de entrega y no se procesó como factura.", confidence: "Alta", resolved: false });
  if (!invoiceRaw && !dateValue && !supplierRaw) issues.push({ id: crypto.randomUUID(), field: "Encabezado", value: "Vacío", problem: "No se identificó factura, fecha ni proveedor", confidence: "Baja", resolved: false });
  if (TABLE_HEADER.test(text) && !items.length) issues.push({ id: crypto.randomUUID(), field: "Productos", value: "Vacío", problem: "Se detectó una tabla, pero ninguna línea cumplió las validaciones de producto", confidence: "Baja", resolved: false });
  if (hasOutOfRangeQuantity(text)) issues.push({ id: crypto.randomUUID(), field: "Cantidad", value: "Fuera de rango", problem: "Cantidad fuera de rango esperado.", confidence: "Baja", resolved: false });
  if (subtotal != null && tax != null && total != null && Math.abs(subtotal + tax - total) > Math.max(2, total * .02)) issues.push({ id: crypto.randomUUID(), field: "Total", value: String(total), problem: "Subtotal e impuesto no coinciden con el total", confidence: "Baja", resolved: false });
  for (const entry of items) if (!plausibleQuantity(entry.quantity.normalizedValue) || entry.lineTotal.confidence === "Baja") issues.push({ id: crypto.randomUUID(), field: "Producto", value: entry.description.originalValue ?? "", problem: "Cantidad o total de línea inconsistente", confidence: "Baja", resolved: false });
  const levels = [invoiceRaw, dateValue, supplierRaw, total].filter(Boolean).length; const overall: ConfidenceLevel = issues.length ? "Baja" : levels >= 3 ? "Alta" : "Media";
  const result: Invoice = { ...metadata, documentType: effectiveDocumentType, status: issues.length ? "Requiere revisión" : "Completado", progress: 100, progressLabel: "Análisis completado",
    invoiceNumber: field(invoiceRaw, invoiceRaw, confidence(invoiceRaw)), date: field(dateRaw, dateValue, confidence(dateValue)), supplier: field(supplierRaw, supplierRaw, confidence(supplierRaw)), supplierId: field(supplierIdRaw, supplierIdRaw, confidence(supplierIdRaw)),
    currency: field(currencyRaw, currencyRaw, confidence(currencyRaw)), subtotal: field(subtotalRaw, subtotal, confidence(subtotal)), tax: field(taxRaw, tax, confidence(tax)), total: field(totalRaw, total, confidence(total)), purchaseOrder: field(orderRaw, orderRaw, confidence(orderRaw)), paymentTerms: field(termsRaw, termsRaw, confidence(termsRaw)), tradeName: field(/^\s*KERRY\s*$/im.test(text) ? "KERRY" : null, /^\s*KERRY\s*$/im.test(text) ? "KERRY" : null, "Alta"), documentTypeLabel: field(exact(/tipo\s+documento/), exact(/tipo\s+documento/), "Media"), numericKey: field(numericId(exact(/clave\s+num[eé]rica/), 30, 60), numericId(exact(/clave\s+num[eé]rica/), 30, 60), "Alta"), client: field(clientRaw, clientRaw, confidence(clientRaw)), clientId: field(numericId(find(clientBlock, [/(?:c[eé]dula\s+jur[ií]dica|identificaci[oó]n)\s*[:#-]?\s*([\d-]+)/i])), numericId(find(clientBlock, [/(?:c[eé]dula\s+jur[ií]dica|identificaci[oó]n)\s*[:#-]?\s*([\d-]+)/i])), "Media"), deliveryAddress: field(exact(/entregado\s+en/), exact(/entregado\s+en/), "Media"), salesConditions: field(exact(/condiciones\s+de\s+venta/), exact(/condiciones\s+de\s+venta/), "Media"), paymentMethod: field(exact(/medio\s+de\s+pago/), exact(/medio\s+de\s+pago/), "Media"), exchangeRate: field(exact(/tipo\s+de\s+cambio/), parseNumber(exact(/tipo\s+de\s+cambio/)), "Media"), incoterm: field(exact(/incoterm/), exact(/incoterm/), "Media"), internalDocument: field(exact(/doc\.?\s*interno/), exact(/doc\.?\s*interno/), "Media"), orderNumber: field(exact(/pedido/), exact(/pedido/), "Media"), deliveryNumber: field(exact(/entrega/), exact(/entrega/), "Media"), totalGrossWeight: field(exact(/total\s+peso\s+bruto/), parseMeasurement(exact(/total\s+peso\s+bruto/)), "Media"), totalNetWeight: field(exact(/total\s+peso\s+neto/), parseMeasurement(exact(/total\s+peso\s+neto/)), "Media"), taxableTotal: field(exact(/total\s+gravado/), parseNumber(exact(/total\s+gravado/)), "Media"), exemptTotal: field(exact(/total\s+exento/), parseNumber(exact(/total\s+exento/)), "Media"), exoneratedTotal: field(exact(/total\s+exonerado/), parseNumber(exact(/total\s+exonerado/)), "Media"), emissionTimestamp: dateRaw ?? undefined, items, issues, confidence: overall, rawText: text };
  result.deliveryNumber = field(deliveryNumberRaw, numericId(deliveryNumberRaw), confidence(deliveryNumberRaw));
  return result;
}

export function blankInvoice(file: File): Invoice {
  return { id: crypto.randomUUID(), fileName: file.name, fileSize: file.size, sourceType: "Texto", pageCount: 0, status: "Pendiente", progress: 0, progressLabel: "En espera", invoiceNumber: emptyText(), date: emptyText(), supplier: emptyText(), supplierId: emptyText(), currency: emptyText(), subtotal: emptyNumber(), tax: emptyNumber(), total: emptyNumber(), purchaseOrder: emptyText(), paymentTerms: emptyText(), items: [], issues: [], confidence: "Baja" };
}
