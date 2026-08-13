import { normalizeDeliveryNumber } from "./normalize";
import type { Invoice, ReconciliationRecord } from "./types";

export function reconcileDeliveries(documents: Invoice[]): ReconciliationRecord[] {
  const invoices = documents.filter((document) => document.documentType !== "delivery_note");
  const notes = documents.filter((document) => document.documentType === "delivery_note");
  const invoiceMap = new Map<string, Invoice[]>(); const noteMap = new Map<string, Invoice[]>();
  const add = (map: Map<string, Invoice[]>, document: Invoice) => { const key = normalizeDeliveryNumber(document.deliveryNumber?.normalizedValue); if (!key) return; map.set(key, [...(map.get(key) ?? []), document]); };
  invoices.forEach((document) => add(invoiceMap, document)); notes.forEach((document) => add(noteMap, document));
  const records: ReconciliationRecord[] = [];
  for (const deliveryNumber of new Set([...invoiceMap.keys(), ...noteMap.keys()])) {
    const matchedInvoices = invoiceMap.get(deliveryNumber) ?? []; const matchedNotes = noteMap.get(deliveryNumber) ?? [];
    let status: ReconciliationRecord["status"];
    if (matchedInvoices.length > 1) status = "Duplicado factura";
    else if (matchedNotes.length > 1) status = "Duplicado nota";
    else if (matchedInvoices.length && matchedNotes.length) status = "Coincide";
    else if (matchedInvoices.length) status = "Factura sin nota";
    else status = "Nota sin factura";
    records.push({ id: crypto.randomUUID(), deliveryNumber, invoices: matchedInvoices, deliveryNotes: matchedNotes, status, observation: status === "Coincide" ? "Número de entrega coincidente." : status });
  }
  for (const document of [...invoices, ...notes].filter((entry) => !normalizeDeliveryNumber(entry.deliveryNumber?.normalizedValue))) records.push({ id: crypto.randomUUID(), deliveryNumber: "", invoices: document.documentType === "delivery_note" ? [] : [document], deliveryNotes: document.documentType === "delivery_note" ? [document] : [], status: "Revisión requerida", observation: "No se pudo extraer un número de entrega válido." });
  return records;
}

export function reconciliationSummary(records: ReconciliationRecord[]) {
  const invoices = records.flatMap((record) => record.invoices); const notes = records.flatMap((record) => record.deliveryNotes);
  const validInvoices = invoices.filter((invoice) => normalizeDeliveryNumber(invoice.deliveryNumber?.normalizedValue)).length;
  const matchedInvoices = records.filter((record) => record.status === "Coincide").reduce((sum, record) => sum + record.invoices.length, 0);
  return { invoices: invoices.length, notes: notes.length, matches: records.filter((record) => record.status === "Coincide").length, invoicesWithoutNote: records.filter((record) => record.status === "Factura sin nota").length, notesWithoutInvoice: records.filter((record) => record.status === "Nota sin factura").length, duplicates: records.filter((record) => /Duplicado/.test(record.status)).length, review: records.filter((record) => record.status === "Revisión requerida").length, percentage: validInvoices ? (matchedInvoices / validInvoices) * 100 : 0 };
}
