import assert from "node:assert/strict";
import test from "node:test";
import { demoInvoices } from "../lib/invoices/demo.ts";
import { extractInvoice } from "../lib/invoices/extract.ts";
import { normalizeCode, normalizeDate, parseNumber } from "../lib/invoices/normalize.ts";

test("normaliza fechas, montos y códigos", () => {
  assert.equal(normalizeDate("12/08/2026"), "2026-08-12");
  assert.equal(parseNumber("₡1.250.500,75"), 1250500.75);
  assert.equal(normalizeCode("txt - 001"), "TXT-001");
});

test("extrae encabezado y líneas desde texto seleccionable", () => {
  const text = "PROVEEDOR: Textiles del Valle S.A.\nFACTURA: F-9012\nFECHA: 12/08/2026\nSUBTOTAL 25.000,00\nIVA 3.250,00\nTOTAL 28.250,00\nTXT-001 Camisa Azul 2 UN 12500 25000";
  const invoice = extractInvoice(text, { id: "text", fileName: "text.pdf", fileSize: 1000, sourceType: "Texto", pageCount: 1 });
  assert.equal(invoice.invoiceNumber.normalizedValue, "F-9012");
  assert.equal(invoice.supplier.normalizedValue, "Textiles del valle s.a.");
  assert.equal(invoice.items.length, 1);
  assert.equal(invoice.status, "Completado");
});

test("marca factura incompleta e inconsistente para revisión", () => {
  const invoice = extractInvoice("SUBTOTAL 1000\nIMPUESTO 130\nTOTAL 900", { id: "bad", fileName: "bad.pdf", fileSize: 20, sourceType: "OCR", pageCount: 1 });
  assert.equal(invoice.status, "Requiere revisión");
  assert.ok(invoice.issues.length >= 2);
});

test("datos demo cubren texto, OCR, múltiples páginas, productos sin código y revisión", () => {
  assert.ok(demoInvoices.some((invoice) => invoice.sourceType === "Texto"));
  assert.ok(demoInvoices.some((invoice) => invoice.sourceType === "OCR"));
  assert.ok(demoInvoices.some((invoice) => invoice.pageCount > 1));
  assert.ok(demoInvoices.some((invoice) => invoice.items.some((item) => !item.code.normalizedValue)));
  assert.ok(demoInvoices.some((invoice) => invoice.status === "Requiere revisión"));
});
