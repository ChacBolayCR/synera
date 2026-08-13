import type { Invoice } from "../invoices/types";

const val = <T,>(entry: { normalizedValue: T | null }) => entry.normalizedValue ?? "";
const text = (value: unknown) => value == null ? "" : String(value);
const sourcePage = (invoice: Invoice) => invoice.sourcePageStart == null ? "" : invoice.sourcePageStart === invoice.sourcePageEnd || invoice.sourcePageEnd == null ? invoice.sourcePageStart : `${invoice.sourcePageStart}-${invoice.sourcePageEnd}`;

export async function createInvoiceWorkbook(invoices: Invoice[]) {
  const XLSX = await import("xlsx");
  const completed = invoices.filter((invoice) => invoice.status !== "Pendiente" && invoice.status !== "Procesando");
  const products = completed.flatMap((invoice) => invoice.items.map((item) => ({
    "Archivo origen": invoice.fileName, "Página origen": sourcePage(invoice), Fecha: text(val(invoice.date)), Factura: text(val(invoice.invoiceNumber)), Proveedor: text(val(invoice.supplier)), "Identificación proveedor": text(val(invoice.supplierId)),
    Código: text(val(item.code)), Descripción: text(val(item.description)), CABYS: text(item.cabys), Lote: text(item.lot), Cantidad: val(item.quantity), Unidad: text(val(item.unit)),
    "Peso bruto": item.grossWeight ?? "", "Peso neto": item.netWeight ?? "", "Precio unitario": val(item.unitPrice), Descuento: val(item.discount), Impuesto: val(item.tax), "Total línea": val(item.lineTotal),
  })));
  const consolidated = new Map<string, { code: string; product: string; quantity: number; cost: number; invoices: Set<string>; suppliers: Set<string> }>();
  for (const row of products) { const key = String(row.Código || row.Descripción).trim().toLowerCase(); if (!key) continue; const current = consolidated.get(key) ?? { code: row.Código, product: row.Descripción, quantity: 0, cost: 0, invoices: new Set(), suppliers: new Set() }; current.quantity += Number(row.Cantidad) || 0; current.cost += Number(row["Total línea"]) || 0; current.invoices.add(row.Factura); current.suppliers.add(row.Proveedor); consolidated.set(key, current); }
  const suppliers = new Map<string, { invoices: Set<string>; total: number; products: Set<string>; units: number }>();
  for (const invoice of completed) { const supplier = text(val(invoice.supplier) || "Sin identificar"); const current = suppliers.get(supplier) ?? { invoices: new Set(), total: 0, products: new Set(), units: 0 }; current.invoices.add(text(val(invoice.invoiceNumber) || invoice.fileName)); current.total += Number(val(invoice.total)) || 0; for (const item of invoice.items) { current.products.add(text(val(item.code) || val(item.description))); current.units += Number(val(item.quantity)) || 0; } suppliers.set(supplier, current); }
  const workbook = XLSX.utils.book_new();
  const add = (name: string, rows: Record<string, unknown>[], textColumns: string[] = []) => { const sheet = XLSX.utils.json_to_sheet(rows); const headers = rows.length ? Object.keys(rows[0]) : []; for (const columnName of textColumns) { const column = headers.indexOf(columnName); if (column < 0) continue; for (let row = 1; row <= rows.length; row += 1) { const address = XLSX.utils.encode_cell({ r: row, c: column }); if (sheet[address]) { sheet[address].t = "s"; sheet[address].v = text(sheet[address].v); sheet[address].z = "@"; } } } sheet["!cols"] = headers.map((header) => ({ wch: Math.max(14, Math.min(32, header.length + 8)) })); XLSX.utils.book_append_sheet(workbook, sheet, name); };
  const totalPurchases = completed.reduce((sum, invoice) => sum + (Number(val(invoice.total)) || 0), 0); const totalUnits = products.reduce((sum, row) => sum + (Number(row.Cantidad) || 0), 0);
  add("Resumen", [{ Periodo: "Lote actual", "Total facturas": completed.length, "Total compras": totalPurchases, "Total productos": products.length, "Total unidades": totalUnits, "Total proveedores": suppliers.size, "Facturas revisadas": completed.filter((invoice) => invoice.status === "Requiere revisión").length, "Facturas con errores": completed.filter((invoice) => invoice.status === "Error").length }]);
  add("Facturas", completed.map((invoice) => ({ "Archivo origen": invoice.fileName, "Página origen": sourcePage(invoice), Factura: text(val(invoice.invoiceNumber)), Fecha: text(val(invoice.date)), Proveedor: text(val(invoice.supplier)), "Identificación proveedor": text(val(invoice.supplierId)), "Orden de compra": text(val(invoice.purchaseOrder)), Subtotal: val(invoice.subtotal), Impuesto: val(invoice.tax), Total: val(invoice.total), Moneda: text(val(invoice.currency)), Estado: invoice.status, Confianza: invoice.confidence })), ["Factura", "Identificación proveedor", "Orden de compra"]);
  add("Productos", products, ["Factura", "Identificación proveedor", "Código", "CABYS", "Lote"]);
  add("Productos Consolidados", [...consolidated.values()].map((row) => ({ Código: text(row.code), Producto: row.product, "Cantidad total": row.quantity, "Costo total": row.cost, "Costo promedio": row.quantity ? row.cost / row.quantity : 0, "Número de facturas": row.invoices.size, "Número de proveedores": row.suppliers.size })), ["Código"]);
  add("Proveedores", [...suppliers.entries()].map(([supplier, row]) => ({ Proveedor: supplier, "Cantidad de facturas": row.invoices.size, "Total comprado": row.total, "Productos diferentes": row.products.size, "Unidades compradas": row.units })));
  add("Revisión", completed.flatMap((invoice) => invoice.issues.map((issue) => ({ "Archivo origen": invoice.fileName, "Página origen": sourcePage(invoice), Factura: text(val(invoice.invoiceNumber) || invoice.fileName), Campo: issue.field, Valor: text(issue.value), Problema: issue.problem, Confianza: issue.confidence, Estado: issue.resolved ? "Resuelto" : "Pendiente" }))), ["Factura", "Valor"]);
  return workbook;
}

export async function exportInvoiceWorkbook(invoices: Invoice[]) {
  const XLSX = await import("xlsx"); const workbook = await createInvoiceWorkbook(invoices);
  XLSX.writeFile(workbook, "SYNERA_Invoice_Analysis.xlsx", { compression: true });
}
