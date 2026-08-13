import { parseDocumentPages, segmentInvoicePages } from "../invoices/segment";
import type { ExtractedPage, ProcessingOptions, UploadedDocument } from "../invoices/types";

const PDF_TEXT_THRESHOLD = 30;

export async function processInvoicePdf(file: File, documentId: string, options: ProcessingOptions = {}): Promise<UploadedDocument> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const buffer = await file.arrayBuffer();
  if (options.signal?.aborted) throw new DOMException("Cancelado", "AbortError");
  const pdfDocument = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: ExtractedPage[] = [];
  let worker: Awaited<ReturnType<typeof import("tesseract.js")["createWorker"]>> | null = null;

  try {
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      if (options.signal?.aborted) throw new DOMException("Cancelado", "AbortError");
      const page = await pdfDocument.getPage(pageNumber);
      const content = await page.getTextContent();
      const selectableText = content.items.map((entry) => "str" in entry ? entry.str : "").join(" ").trim();
      let text = selectableText;
      let sourceType: ExtractedPage["sourceType"] = "Texto";

      if (selectableText.replace(/\s/g, "").length < PDF_TEXT_THRESHOLD) {
        sourceType = "OCR";
        if (!worker) {
          const { createWorker } = await import("tesseract.js");
          worker = await createWorker("spa", 1, { langPath: "/ocr", logger: (message) => {
            if (message.status === "recognizing text") {
              const overall = Math.round((((pageNumber - 1) + message.progress) / pdfDocument.numPages) * 94);
              options.onProgress?.(overall, `Página ${pageNumber}/${pdfDocument.numPages} · OCR ${Math.round(message.progress * 100)}%`, segmentInvoicePages(pages).length, pageNumber, pdfDocument.numPages);
            }
          }});
        }
        const viewport = page.getViewport({ scale: 1.7 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width; canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("No fue posible preparar la página para análisis");
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        const result = await worker.recognize(canvas);
        text = result.data.text;
        canvas.width = 1; canvas.height = 1;
      }

      pages.push({ pageNumber, text, sourceType });
      const detected = segmentInvoicePages(pages).length;
      options.onProgress?.(Math.round((pageNumber / pdfDocument.numPages) * 94), `Página ${pageNumber}/${pdfDocument.numPages} · ${detected} factura(s) detectada(s)`, detected, pageNumber, pdfDocument.numPages);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    options.onProgress?.(97, "Organizando facturas", segmentInvoicePages(pages).length, pdfDocument.numPages, pdfDocument.numPages);
    const invoices = parseDocumentPages(pages, { documentId, fileName: file.name, fileSize: file.size });
    return { id: documentId, fileName: file.name, fileSize: file.size, pageCount: pdfDocument.numPages, invoices, status: invoices.some((invoice) => invoice.status === "Requiere revisión") ? "Requiere revisión" : "Completado", progress: 100, progressLabel: "Análisis completado", detectedInvoices: invoices.length };
  } finally {
    if (worker) await worker.terminate();
    await pdfDocument.cleanup();
  }
}
