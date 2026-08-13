import { processInvoicePdf } from "../ocr/process-pdf";
import type { UploadedDocument } from "./types";

export async function processInvoiceQueue(files: File[], documentIds: string[], concurrency: number, signal: AbortSignal, update: (id: string, patch: Partial<UploadedDocument>) => void) {
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < files.length && !signal.aborted) {
      const index = nextIndex++;
      const file = files[index]; const id = documentIds[index];
      update(id, { status: "Procesando", progress: 2, progressLabel: "Abriendo PDF" });
      try {
        const document = await processInvoicePdf(file, id, { signal, onProgress: (progress, label, detectedInvoices, currentPage, pageCount, ocrProgress) => update(id, { progress, progressLabel: label, detectedInvoices, currentPage, pageCount, ocrProgress }) });
        update(id, document);
      } catch (error) {
        if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) update(id, { status: "Cancelado", progressLabel: "Procesamiento cancelado" });
        else update(id, { status: "Error", progress: 100, progressLabel: "No se pudo analizar", error: error instanceof Error ? error.message : "PDF inválido o corrupto" });
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker));
}
