import { parseDocumentPages, segmentInvoicePages } from "../invoices/segment";
import type { DocumentProcessingOptions, ExtractedPage, PdfTextToken, UploadedDocument } from "../invoices/types";

const PDF_TEXT_THRESHOLD = 30;

function tokensFromContent(items: unknown[]): PdfTextToken[] {
  return items.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || !("str" in entry) || !("transform" in entry)) return [];
    const item = entry as { str: string; transform: number[]; width?: number; height?: number };
    if (!item.str.trim()) return [];
    return [{ text: item.str.trim(), x: item.transform[4] ?? 0, y: item.transform[5] ?? 0, width: item.width ?? 0, height: item.height ?? 0 }];
  });
}

function textFromTokens(tokens: PdfTextToken[]) {
  const rows: PdfTextToken[][] = [];
  for (const token of [...tokens].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find((candidate) => Math.abs(candidate[0].y - token.y) <= 2.5);
    if (row) row.push(token); else rows.push([token]);
  }
  return rows.map((row) => row.sort((a, b) => a.x - b.x).map((token) => token.text).join(" ")).join("\n");
}

export async function processInvoicePdf(file: File, documentId: string, options: DocumentProcessingOptions = {}): Promise<UploadedDocument> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const buffer = await file.arrayBuffer();
  if (options.signal?.aborted) throw new DOMException("Cancelado", "AbortError");
  const pdfDocument = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: ExtractedPage[] = [];
  let worker: Awaited<ReturnType<typeof import("tesseract.js")["createWorker"]>> | null = null;
  let currentPageNumber = 0;

  try {
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      if (options.signal?.aborted) throw new DOMException("Cancelado", "AbortError");
      currentPageNumber = pageNumber;
      options.onProgress?.(Math.round(((pageNumber - 1) / pdfDocument.numPages) * 94), `Procesando: página ${pageNumber}`, segmentInvoicePages(pages).length, pageNumber, pdfDocument.numPages, null);
      const page = await pdfDocument.getPage(pageNumber);
      const rotation = page.rotate ?? 0;
      const content = await page.getTextContent();
      const tokens = tokensFromContent(content.items as unknown[]);
      const selectableText = textFromTokens(tokens).trim();
      let text = selectableText;
      let sourceType: ExtractedPage["sourceType"] = "Texto";

      if (selectableText.replace(/\s/g, "").length < PDF_TEXT_THRESHOLD) {
        sourceType = "OCR";
        if (!worker) {
          const { createWorker } = await import("tesseract.js");
          worker = await createWorker("spa", 1, { langPath: "/ocr", logger: (message) => {
            if (message.status === "recognizing text") {
              const ocrProgress = Math.round(message.progress * 100);
              const overall = Math.round((((currentPageNumber - 1) + message.progress) / pdfDocument.numPages) * 94);
              options.onProgress?.(overall, `Procesando: página ${currentPageNumber}`, segmentInvoicePages(pages).length, currentPageNumber, pdfDocument.numPages, ocrProgress);
            }
          }});
        }
        const viewport = page.getViewport({ scale: 1.7, rotation });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width; canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("No fue posible preparar la página para análisis");
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        const result = await worker.recognize(canvas);
        text = result.data.text;
        canvas.width = 1; canvas.height = 1;
      }

      pages.push({ pageNumber, text, sourceType, tokens: sourceType === "Texto" ? tokens : undefined });
      const debugInvoice = parseDocumentPages([{ pageNumber, text, sourceType, tokens: sourceType === "Texto" ? tokens : undefined }], { documentId, fileName: file.name, fileSize: file.size, expectedDocumentType: options.expectedDocumentType })[0];
      options.onPageDebug?.({ page: pageNumber, preview: text.replace(/\s+/g, " ").slice(0, 120), documentType: debugInvoice?.documentType ?? "unknown", deliveryNumber: debugInvoice?.deliveryNumber?.normalizedValue ?? null });
      const detected = segmentInvoicePages(pages).length;
      options.onProgress?.(Math.round((pageNumber / pdfDocument.numPages) * 94), `Página ${pageNumber} completada`, detected, pageNumber, pdfDocument.numPages, sourceType === "OCR" ? 100 : null);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    options.onProgress?.(97, "Organizando facturas", segmentInvoicePages(pages).length, pdfDocument.numPages, pdfDocument.numPages, null);
    const invoices = parseDocumentPages(pages, { documentId, fileName: file.name, fileSize: file.size, expectedDocumentType: options.expectedDocumentType });
    return { id: documentId, fileName: file.name, fileSize: file.size, pageCount: pdfDocument.numPages, invoices, status: invoices.some((invoice) => invoice.status === "Requiere revisión") ? "Requiere revisión" : "Completado", progress: 100, progressLabel: "Análisis completado", detectedInvoices: invoices.length };
  } finally {
    if (worker) await worker.terminate();
    await pdfDocument.cleanup();
  }
}
