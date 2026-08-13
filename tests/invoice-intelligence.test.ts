import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { demoInvoices } from "../lib/invoices/demo.ts";
import { extractInvoice } from "../lib/invoices/extract.ts";
import { normalizeCode, normalizeDate, parseNumber } from "../lib/invoices/normalize.ts";
import { ACTIVE_MODE_KEY, DEMO_STATE_KEY, REAL_STATE_KEY, modeStateKey, sanitizeInvoices } from "../lib/state/mode-storage.ts";
import { createInvoiceWorkbook } from "../lib/excel/export-invoices.ts";
import { parseDocumentPages, segmentInvoicePages } from "../lib/invoices/segment.ts";
import type { ExtractedPage } from "../lib/invoices/types.ts";

const header = (number: string) => `TIPO DOCUMENTO: 01 - FACTURA\nNo.: ${number}\nFECHA DE EMISION: 2022-07-27T17:22:59\nCLAVE NUMERICA: 50627072200310101653500100001010000053274110356535`;
const page = (pageNumber: number, text: string): ExtractedPage => ({ pageNumber, text, sourceType: "Texto" });

test("normaliza fechas, montos y códigos", () => {
  assert.equal(normalizeDate("12/08/2026"), "2026-08-12");
  assert.equal(parseNumber("₡1.250.500,75"), 1250500.75);
  assert.equal(normalizeCode("txt - 001"), "TXT-001");
});

test("extrae encabezado y líneas desde texto seleccionable", () => {
  const text = "PROVEEDOR: Textiles del Valle S.A.\nFACTURA: F-9012\nFECHA: 12/08/2026\nSUBTOTAL 25.000,00\nIVA 3.250,00\nTOTAL 28.250,00\nCódigo Principal Descripción Cantidad Unidad Medida Precio Unitario Precio Total\nTXT-001 Camisa Azul 2 UN 12500 25000";
  const invoice = extractInvoice(text, { id: "text", fileName: "text.pdf", fileSize: 1000, sourceType: "Texto", pageCount: 1 });
  assert.equal(invoice.invoiceNumber.normalizedValue, "F-9012");
  assert.equal(invoice.supplier.normalizedValue, "Textiles del Valle S.A.");
  assert.equal(invoice.items.length, 1);
  assert.equal(invoice.status, "Completado");
});

test("regresión Kerry extrae encabezado y exactamente tres productos válidos", async () => {
  const fixture = await readFile(new URL("fixtures/kerry-baltimore-ocr.txt", import.meta.url), "utf8");
  const invoice = extractInvoice(fixture, { id: "kerry", fileName: "kerry.pdf", fileSize: 5000, sourceType: "OCR", pageCount: 2 });
  assert.equal(invoice.invoiceNumber.normalizedValue, "00100001010000053274");
  assert.equal(invoice.date.normalizedValue, "2022-07-27");
  assert.equal(invoice.supplier.normalizedValue, "Baltimore Spice Central America S.A.");
  assert.equal(invoice.currency.normalizedValue, "USD");
  assert.equal(invoice.purchaseOrder.normalizedValue, "Case 04814210");
  assert.equal(invoice.items.length, 3);
  assert.deepEqual(invoice.items.map((item) => [item.code.normalizedValue, item.quantity.normalizedValue, item.unit.normalizedValue, item.unitPrice.normalizedValue, item.lineTotal.normalizedValue]), [
    ["20659503", 125, "kg", 2534.51, 316814.06], ["20659503", 125, "kg", 2534.51, 316814.06], ["20659840", 200, "kg", 1723.47, 344693.70],
  ]);
  assert.equal(invoice.items[0].lot, "0006162626");
  assert.equal(invoice.items[0].cabys, "2399502009900");
  assert.ok(invoice.items.every((item) => !item.description.normalizedValue?.includes("@")));
  assert.ok(invoice.items.every((item) => item.quantity.normalizedValue! < 1_000_000));
  assert.ok(invoice.items.every((item) => item.code.normalizedValue !== "2399502009900"));
});

test("segmentación A: un PDF de una página produce una factura", () => {
  assert.equal(segmentInvoicePages([page(1, header("001"))]).length, 1);
});

test("segmentación B: tres encabezados independientes producen tres facturas", () => {
  const segments = segmentInvoicePages([1, 2, 3].map((value) => page(value, header(`00${value}`))));
  assert.equal(segments.length, 3);
  assert.deepEqual(segments.map((segment) => segment.pageNumbers), [[1], [2], [3]]);
});

test("segmentación C: Page 1 of 2 y Page 2 of 2 forman una factura multipágina", () => {
  const segments = segmentInvoicePages([page(1, `Page 1 of 2\n${header("001")}`), page(2, "Page 2 of 2\nContinuación de productos")]);
  assert.equal(segments.length, 1);
  assert.deepEqual(segments[0].pageNumbers, [1, 2]);
});

test("segmentación D: 193 páginas con encabezados generan 193 facturas", () => {
  const pages = Array.from({ length: 193 }, (_, index) => page(index + 1, header(String(index + 1).padStart(20, "0"))));
  assert.equal(segmentInvoicePages(pages).length, 193);
});

test("segmentación E: no copia invoiceNumber entre facturas", () => {
  const invoices = parseDocumentPages([page(1, header("00100000000000000001")), page(2, "TIPO DOCUMENTO: 01 - FACTURA\nFECHA DE EMISION: 2022-07-28\nFACTURADO A: Cliente")], { documentId: "doc", fileName: "lote.pdf", fileSize: 100 });
  assert.equal(invoices.length, 2);
  assert.equal(invoices[0].invoiceNumber.normalizedValue, "00100000000000000001");
  assert.equal(invoices[1].invoiceNumber.normalizedValue, null);
  assert.equal(invoices[1].sourcePageStart, 2);
});

test("Excel conserva identificadores largos como texto y métricas como números", async () => {
  const fixture = await readFile(new URL("fixtures/kerry-baltimore-ocr.txt", import.meta.url), "utf8");
  const invoice = extractInvoice(fixture, { id: "kerry-xlsx", fileName: "kerry.pdf", fileSize: 5000, sourceType: "OCR", pageCount: 1 });
  invoice.sourcePageStart = 37; invoice.sourcePageEnd = 37;
  const workbook = await createInvoiceWorkbook([invoice]);
  const facturas = workbook.Sheets.Facturas; const productos = workbook.Sheets.Productos;
  assert.equal(facturas.A2.v, "kerry.pdf"); assert.equal(facturas.B2.v, 37);
  assert.equal(facturas.C2.t, "s"); assert.equal(facturas.C2.v, "00100001010000053274"); assert.doesNotMatch(String(facturas.C2.v), /e\+/i);
  assert.equal(productos.A2.v, "kerry.pdf"); assert.equal(productos.B2.v, 37);
  assert.equal(productos.D2.t, "s"); assert.equal(productos.D2.v, "00100001010000053274");
  assert.equal(productos.G2.t, "s"); assert.equal(productos.I2.t, "s"); assert.equal(productos.J2.t, "s");
  assert.equal(productos.K2.t, "n"); assert.equal(productos.O2.t, "n"); assert.equal(productos.R2.t, "n");
});

test("rechaza cantidades exponenciales y las envía a revisión", () => {
  const invoice = extractInvoice(`${header("001")}\nCódigo Principal\n20659503\nProducto válido\nCantidad: 1.0101659500100002e+29\nUnidad: kg\nPrecio Unitario: 1\nPrecio Total: 1`, { id: "huge", fileName: "huge.pdf", fileSize: 1, sourceType: "OCR", pageCount: 1 });
  assert.equal(invoice.items.length, 0);
  assert.ok(invoice.issues.some((issue) => issue.problem === "Cantidad fuera de rango esperado."));
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

test("separa las claves de Demo y Real y elimina texto OCR antes de persistir", () => {
  assert.equal(modeStateKey("demo"), DEMO_STATE_KEY);
  assert.equal(modeStateKey("real"), REAL_STATE_KEY);
  assert.notEqual(DEMO_STATE_KEY, REAL_STATE_KEY);
  assert.equal(ACTIVE_MODE_KEY, "synera-active-mode-v1");
  const invoice = { ...demoInvoices[0], rawText: "texto extenso que no debe persistirse" };
  assert.equal(sanitizeInvoices([invoice])[0].rawText, undefined);
});
