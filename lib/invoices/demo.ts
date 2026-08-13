import { field } from "./normalize";
import type { ConfidenceLevel, Invoice, InvoiceItem, ReviewIssue } from "./types";

const item = (id: string, code: string | null, description: string, quantity: number, price: number, confidence: ConfidenceLevel = "Alta"): InvoiceItem => ({
  id, code: field(code, code, code ? confidence : "Baja"), description: field(description, description, confidence),
  quantity: field(String(quantity), quantity, confidence), unit: field("unidad", "unidad", "Alta"),
  unitPrice: field(String(price), price, confidence), discount: field("0", 0, "Alta"),
  tax: field(String(quantity * price * 0.13), quantity * price * 0.13, "Alta"), lineTotal: field(String(quantity * price), quantity * price, confidence),
});
const issue = (id: string, fieldName: string, value: string, problem: string): ReviewIssue => ({ id, field: fieldName, value, problem, confidence: "Baja", resolved: false });

export const demoInvoices: Invoice[] = [
  { id: "demo-001", fileName: "Factura_Textiles_Valle_001.pdf", fileSize: 284000, sourceType: "Texto", pageCount: 1, status: "Completado", progress: 100, progressLabel: "Lista",
    invoiceNumber: field("F-000123", "F-000123", "Alta"), date: field("12/08/2026", "2026-08-12", "Alta"), supplier: field("TEXTILES DEL VALLE S.A.", "Textiles del Valle S.A.", "Alta"), supplierId: field("3-101-458921", "3-101-458921", "Alta"), currency: field("CRC", "CRC", "Alta"), subtotal: field("1.790.000,00", 1790000, "Alta"), tax: field("232.700,00", 232700, "Alta"), total: field("2.022.700,00", 2022700, "Alta"), purchaseOrder: field("OC-2026-0812", "OC-2026-0812", "Alta"), paymentTerms: field("30 días", "30 días", "Alta"),
    items: [item("d1-i1", "TXT-001", "Camisa Oxford", 100, 12500), item("d1-i2", "TXT-002", "Blusa Lino", 50, 10800)], issues: [], confidence: "Alta" },
  { id: "demo-002", fileName: "Factura_Calzado_Tico_087.pdf", fileSize: 756000, sourceType: "OCR", pageCount: 2, status: "Completado", progress: 100, progressLabel: "OCR completado",
    invoiceNumber: field("FT-0874", "FT-0874", "Alta"), date: field("10-08-2026", "2026-08-10", "Alta"), supplier: field("CALZADO TICO LTDA", "Calzado Tico Ltda", "Alta"), supplierId: field("3-102-778215", "3-102-778215", "Media"), currency: field("₡", "CRC", "Alta"), subtotal: field("2,270,000", 2270000, "Alta"), tax: field("295,100", 295100, "Alta"), total: field("2,565,100", 2565100, "Alta"), purchaseOrder: field<string>(null, null, "Baja"), paymentTerms: field("Contado", "Contado", "Media"),
    items: [item("d2-i1", "CAL-001", "Tenis Urbano", 60, 22000), item("d2-i2", "CAL-002", "Sandalia Cuero", 40, 16800), item("d2-i3", "CAL-003", "Zapato Ejecutivo", 10, 27800, "Media")], issues: [], confidence: "Alta" },
  { id: "demo-003", fileName: "Escaneo_Importadora_Norte_44.pdf", fileSize: 1280000, sourceType: "OCR", pageCount: 1, status: "Requiere revisión", progress: 100, progressLabel: "OCR completado con advertencias",
    invoiceNumber: field("IN-44?8", "IN-448", "Media"), date: field("08/08/26", "2026-08-08", "Media"), supplier: field("IMPORTADORA NOR?E", "Importadora Norte", "Media"), supplierId: field<string>(null, null, "Baja"), currency: field("COLONES", "CRC", "Alta"), subtotal: field("845.000", 845000, "Media"), tax: field("109.850", 109850, "Media"), total: field("950.000", 950000, "Baja"), purchaseOrder: field<string>(null, null, "Baja"), paymentTerms: field<string>(null, null, "Baja"),
    items: [item("d3-i1", "ACC-001", "Bolso Crossbody", 35, 9800, "Media"), item("d3-i2", null, "Kit de viaje", 12, 7900, "Baja")],
    issues: [issue("d3-r1", "Total", "₡950.000", "Subtotal e impuesto no coinciden con el total"), issue("d3-r2", "Código", "Vacío", "Producto sin código; se consolidará por descripción"), issue("d3-r3", "Proveedor", "IMPORTADORA NOR?E", "Texto OCR con caracteres dudosos")], confidence: "Baja" },
  { id: "demo-004", fileName: "Casa_y_Mas_Agosto.pdf", fileSize: 412000, sourceType: "Texto", pageCount: 1, status: "Requiere revisión", progress: 100, progressLabel: "Datos incompletos",
    invoiceNumber: field<string>(null, null, "Baja"), date: field("07/08/2026", "2026-08-07", "Alta"), supplier: field("CASA & MÁS", "Casa & Más", "Alta"), supplierId: field<string>(null, null, "Baja"), currency: field("CRC", "CRC", "Alta"), subtotal: field("476,000", 476000, "Alta"), tax: field("61,880", 61880, "Alta"), total: field("537,880", 537880, "Alta"), purchaseOrder: field<string>(null, null, "Baja"), paymentTerms: field("15 días", "15 días", "Media"),
    items: [item("d4-i1", "HOG-001", "Manta Tejida", 20, 11500), item("d4-i2", null, "Cojín Decorativo", 30, 5900)], issues: [issue("d4-r1", "Factura", "Vacío", "No se identificó el número de factura")], confidence: "Media" },
];

