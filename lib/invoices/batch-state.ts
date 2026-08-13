import type { Invoice } from "./types";

export type DocumentBatches = { invoices: Invoice[]; deliveryNotes: Invoice[] };
export const splitDocumentBatches = (documents: Invoice[]): DocumentBatches => ({ invoices: documents.filter((document) => document.documentType !== "delivery_note"), deliveryNotes: documents.filter((document) => document.documentType === "delivery_note") });
export const replaceInvoiceBatch = (state: DocumentBatches, invoices: Invoice[]): DocumentBatches => ({ ...state, invoices });
export const replaceDeliveryNoteBatch = (state: DocumentBatches, deliveryNotes: Invoice[]): DocumentBatches => ({ ...state, deliveryNotes });
export const clearInvoiceBatch = (state: DocumentBatches): DocumentBatches => ({ ...state, invoices: [] });
export const clearDeliveryNoteBatch = (state: DocumentBatches): DocumentBatches => ({ ...state, deliveryNotes: [] });
export const combinedDocumentBatches = (state: DocumentBatches) => [...state.invoices, ...state.deliveryNotes];
