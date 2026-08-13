import { extractInvoice } from "./extract";
import type { ExtractedPage, Invoice, ReviewIssue } from "./types";

export type InvoiceSegment = {
  pageNumbers: number[];
  pages: ExtractedPage[];
  requiresReview: boolean;
  reviewReason?: string;
};

const HEADER_SIGNALS = [
  /tipo\s+documento/i,
  /\bfactura\b/i,
  /(?:^|\s)no\.?\s*:/im,
  /fecha\s+de\s+emisi[oó]n/i,
  /clave\s+num[eé]rica/i,
  /facturado\s+a/i,
  /entregado\s+en/i,
  /nota\s+de\s+entrega/i,
  /n[uú]mero\s+de\s+entrega/i,
];

const pageMarker = (text: string) => {
  const match = text.match(/(?:page\s+(\d+)\s+of\s+(\d+)|p[aá]gina\s+(\d+)\s+de\s+(\d+))/i);
  if (!match) return null;
  return { current: Number(match[1] ?? match[3]), total: Number(match[2] ?? match[4]) };
};

const invoiceNumber = (text: string) => text.match(/(?:n[uú]mero\s+de\s+factura|factura|n[uú]mero|no\.?)\s*[:#-]\s*([0-9A-Z-]{3,40})/i)?.[1] ?? null;
const isIndependentHeader = (text: string) => HEADER_SIGNALS.filter((signal) => signal.test(text)).length >= 3;

export function segmentInvoicePages(pages: ExtractedPage[]): InvoiceSegment[] {
  const segments: InvoiceSegment[] = [];
  let expectedTotal: number | null = null;

  const start = (page: ExtractedPage, requiresReview = false, reviewReason?: string) => {
    segments.push({ pages: [page], pageNumbers: [page.pageNumber], requiresReview, reviewReason });
  };

  for (const page of pages) {
    const marker = pageMarker(page.text);
    const header = isIndependentHeader(page.text);
    if (marker?.current === 1) {
      start(page);
      expectedTotal = marker.total;
      continue;
    }
    if (marker && marker.current > 1) {
      const currentSegment = segments.at(-1);
      const priorNumber = currentSegment ? invoiceNumber(currentSegment.pages[0].text) : null;
      const currentNumber = invoiceNumber(page.text);
      const sequential = currentSegment && expectedTotal === marker.total && currentSegment.pages.length + 1 === marker.current;
      const conflictingHeader = header && priorNumber && currentNumber && priorNumber !== currentNumber;
      if (sequential && !conflictingHeader) {
        currentSegment.pages.push(page);
        currentSegment.pageNumbers.push(page.pageNumber);
      } else {
        start(page, true, "No se pudo asociar con seguridad esta página multipágina.");
      }
      continue;
    }
    expectedTotal = null;
    const currentSegment = segments.at(-1);
    if (header || !currentSegment) start(page, !header, !header ? "No se detectó un encabezado independiente de factura." : undefined);
    else {
      currentSegment.pages.push(page);
      currentSegment.pageNumbers.push(page.pageNumber);
    }
  }
  return segments;
}

export function parseDocumentPages(pages: ExtractedPage[], metadata: { documentId: string; fileName: string; fileSize: number }): Invoice[] {
  return segmentInvoicePages(pages).map((segment) => {
    const sourceTypes = new Set(segment.pages.map((page) => page.sourceType));
    const sourceType: Invoice["sourceType"] = sourceTypes.has("OCR") ? "OCR" : "Texto";
    const invoice = extractInvoice(segment.pages.map((page) => page.text).join("\n"), {
      id: crypto.randomUUID(), fileName: metadata.fileName, fileSize: metadata.fileSize, sourceType, pageCount: segment.pages.length,
    }, segment.pages.flatMap((page) => page.tokens ?? []));
    invoice.sourceDocumentId = metadata.documentId;
    invoice.sourcePages = segment.pageNumbers;
    invoice.sourcePageStart = segment.pageNumbers[0];
    invoice.sourcePageEnd = segment.pageNumbers.at(-1);
    if (segment.requiresReview) {
      const issue: ReviewIssue = { id: crypto.randomUUID(), field: "Segmentación", value: segment.pageNumbers.join(", "), problem: segment.reviewReason ?? "La separación de páginas requiere revisión.", confidence: "Baja", resolved: false };
      invoice.issues.push(issue); invoice.status = "Requiere revisión"; invoice.confidence = "Baja";
    }
    return invoice;
  });
}
