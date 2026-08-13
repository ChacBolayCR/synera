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
  documentType?: "invoice" | "delivery_note" | "unknown"; tradeName?: ExtractionField<string>; documentTypeLabel?: ExtractionField<string>;
  numericKey?: ExtractionField<string>; client?: ExtractionField<string>; clientId?: ExtractionField<string>;
  deliveryAddress?: ExtractionField<string>; salesConditions?: ExtractionField<string>; paymentMethod?: ExtractionField<string>;
  exchangeRate?: ExtractionField<number>; incoterm?: ExtractionField<string>; internalDocument?: ExtractionField<string>;
  orderNumber?: ExtractionField<string>; deliveryNumber?: ExtractionField<string>; totalGrossWeight?: ExtractionField<number>;
  totalNetWeight?: ExtractionField<number>; taxableTotal?: ExtractionField<number>; exemptTotal?: ExtractionField<number>;
  exoneratedTotal?: ExtractionField<number>; emissionTimestamp?: string;
  items: InvoiceItem[]; issues: ReviewIssue[]; confidence: ConfidenceLevel; rawText?: string; error?: string;
};
export type UploadedDocument = {
  id: string; fileName: string; fileSize: number; pageCount: number; invoices: Invoice[];
  status: InvoiceStatus; progress: number; progressLabel: string; detectedInvoices: number;
  currentPage?: number; ocrProgress?: number | null; error?: string;
  batchType?: "invoice" | "delivery_note";
};
export type PdfTextToken = { text: string; x: number; y: number; width: number; height: number; page?: number };
export type ExtractedPage = { pageNumber: number; text: string; sourceType: "Texto" | "OCR"; tokens?: PdfTextToken[] };
export type ProcessingOptions = { signal?: AbortSignal; onProgress?: (progress: number, label: string, detectedInvoices?: number, pageNumber?: number, pageCount?: number, ocrProgress?: number | null) => void };
export type DocumentProcessingOptions = ProcessingOptions & { expectedDocumentType?: "invoice" | "delivery_note"; onPageDebug?: (entry: { page: number; preview: string; documentType: Invoice["documentType"]; deliveryNumber: string | null }) => void };
export type ReconciliationStatus = "Coincide" | "Factura sin nota" | "Nota sin factura" | "Duplicado factura" | "Duplicado nota" | "Revisión requerida";
export type ReconciliationRecord = { id: string; deliveryNumber: string; invoices: Invoice[]; deliveryNotes: Invoice[]; status: ReconciliationStatus; observation: string };
