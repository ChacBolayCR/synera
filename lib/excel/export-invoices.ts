import type { Invoice } from "../invoices/types";

const val = <T,>(field: { normalizedValue: T | null }) => field.normalizedValue ?? "";

export async function exportInvoiceWorkbook(invoices: Invoice[]) {
  const XLSX = await import("xlsx");
  const completed = invoices.filter((invoice) => invoice.status !== "Pendiente" && invoice.status !== "Procesando");
  const products = completed.flatMap((invoice) => invoice.items.map((item) => ({
    Factura: val(invoice.invoiceNumber), Fecha: val(invoice.date), Proveedor: val(invoice.supplier), Código: val(item.code), Producto: val(item.description),
    Cantidad: val(item.quantity), Unidad: val(item.unit), "Precio unitario": val(item.unitPrice), Descuento: val(item.discount), Impuesto: val(item.tax), "Total línea": val(item.lineTotal),
  })));
  const consolidated = new Map<string, { code: string; product: string; quantity: number; cost: number; invoices: Set<string>; suppliers: Set<string> }>();
  for (const row of products) {
    const key = String(row.Código || row.Producto).trim().toLowerCase(); if (!key) continue;
    const current = consolidated.get(key) ?? { code: String(row.Código), product: String(row.Producto), quantity: 0, cost: 0, invoices: new Set(), suppliers: new Set() };
    current.quantity += Number(row.Cantidad) || 0; current.cost += Number(row["Total línea"]) || 0; current.invoices.add(String(row.Factura)); current.suppliers.add(String(row.Proveedor)); consolidated.set(key, current);
  }
  const supplierRows = new Map<string, { invoices: Set<string>; total: number; products: Set<string>; units: number }>();
  for (const invoice of completed) {
    const supplier = String(val(invoice.supplier) || "Sin identificar");
    const current = supplierRows.get(supplier) ?? { invoices: new Set(), total: 0, products: new Set(), units: 0 };
    current.invoices.add(String(val(invoice.invoiceNumber) || invoice.fileName)); current.total += Number(val(invoice.total)) || 0;
    for (const item of invoice.items) { current.products.add(String(val(item.code) || val(item.description))); current.units += Number(val(item.quantity)) || 0; }
    supplierRows.set(supplier, current);
  }
  const workbook = XLSX.utils.book_new();
  const totalPurchases = completed.reduce((sum, invoice) => sum + (Number(val(invoice.total)) || 0), 0);
  const totalUnits = products.reduce((sum, row) => sum + (Number(row.Cantidad) || 0), 0);
  const add = (name: string, rows: Record<string, unknown>[]) => { const sheet = XLSX.utils.json_to_sheet(rows); sheet["!cols"] = Array.from({ length: 14 }, () => ({ wch: 22 })); XLSX.utils.book_append_sheet(workbook, sheet, name); };
  add("Resumen", [{ Periodo: "Lote actual", "Total facturas": completed.length, "Total compras": totalPurchases, "Total productos": products.length, "Total unidades": totalUnits, "Total proveedores": supplierRows.size, "Facturas revisadas": completed.filter((i) => i.status === "Requiere revisión").length, "Facturas con errores": completed.filter((i) => i.status === "Error").length }]);
  add("Facturas", completed.map((invoice) => ({ Factura: val(invoice.invoiceNumber), Fecha: val(invoice.date), Proveedor: val(invoice.supplier), "Identificación proveedor": val(invoice.supplierId), Subtotal: val(invoice.subtotal), Impuesto: val(invoice.tax), Total: val(invoice.total), Moneda: val(invoice.currency), Estado: invoice.status, Confianza: invoice.confidence })));
  add("Productos", products);
  add("Productos Consolidados", [...consolidated.values()].map((row) => ({ Código: row.code, Producto: row.product, "Cantidad total": row.quantity, "Costo total": row.cost, "Costo promedio": row.quantity ? row.cost / row.quantity : 0, "Número de facturas": row.invoices.size, "Número de proveedores": row.suppliers.size })));
  add("Proveedores", [...supplierRows.entries()].map(([supplier, row]) => ({ Proveedor: supplier, "Cantidad de facturas": row.invoices.size, "Total comprado": row.total, "Productos diferentes": row.products.size, "Unidades compradas": row.units })));
  add("Revisión", completed.flatMap((invoice) => invoice.issues.map((issue) => ({ Factura: val(invoice.invoiceNumber) || invoice.fileName, Campo: issue.field, Valor: issue.value, Problema: issue.problem, Confianza: issue.confidence, Estado: issue.resolved ? "Resuelto" : "Pendiente" }))));
  XLSX.writeFile(workbook, "SYNERA_Invoice_Analysis.xlsx", { compression: true });
}
