export type ConfidenceLevel = "Alta" | "Media" | "Baja";
export type InvoiceStatus = "Pendiente" | "Procesando" | "Completado" | "Requiere revisión" | "Error" | "Cancelado";

export type ExtractionField<T> = { originalValue: string | null; normalizedValue: T | null; confidence: ConfidenceLevel };
export type InvoiceItem = {
  id: string; code: ExtractionField<string>; description: ExtractionField<string>; quantity: ExtractionField<number>;
  unit: ExtractionField<string>; unitPrice: ExtractionField<number>; discount: ExtractionField<number>;
  tax: ExtractionField<number>; lineTotal: ExtractionField<number>;
  lot?: string; cabys?: string; grossWeight?: number; netWeight?: number;
};
export type ReviewIssue = { id: string; field: string; value: string; problem: string; confidence: ConfidenceLevel; resolved: boolean };
export type Invoice = {
  id: string; fileName: string; fileSize: number; sourceType: "Texto" | "OCR" | "Demo"; pageCount: number;
  sourceDocumentId?: string; sourcePageStart?: number; sourcePageEnd?: number; sourcePages?: number[];
  status: InvoiceStatus; progress: number; progressLabel: string; invoiceNumber: ExtractionField<string>;
  date: ExtractionField<string>; supplier: ExtractionField<string>; supplierId: ExtractionField<string>;
  currency: ExtractionField<string>; subtotal: ExtractionField<number>; tax: ExtractionField<number>;
  total: ExtractionField<number>; purchaseOrder: ExtractionField<string>; paymentTerms: ExtractionField<string>;
  items: InvoiceItem[]; issues: ReviewIssue[]; confidence: ConfidenceLevel; rawText?: string; error?: string;
};
export type UploadedDocument = {
  id: string; fileName: string; fileSize: number; pageCount: number; invoices: Invoice[];
  status: InvoiceStatus; progress: number; progressLabel: string; detectedInvoices: number; error?: string;
};
export type ExtractedPage = { pageNumber: number; text: string; sourceType: "Texto" | "OCR" };
export type ProcessingOptions = { signal?: AbortSignal; onProgress?: (progress: number, label: string, detectedInvoices?: number, pageNumber?: number, pageCount?: number) => void };
