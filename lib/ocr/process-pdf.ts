import type { Invoice, ProcessingOptions } from "../invoices/types";
import { extractInvoice } from "../invoices/extract";

const PDF_TEXT_THRESHOLD = 30;

export async function processInvoicePdf(file: File, options: ProcessingOptions = {}): Promise<Invoice> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const buffer = await file.arrayBuffer();
  if (options.signal?.aborted) throw new DOMException("Cancelado", "AbortError");
  const pdfDocument = await pdfjs.getDocument({ data: buffer }).promise;
  const pageTexts: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const content = await page.getTextContent();
    pageTexts.push(content.items.map((entry) => "str" in entry ? entry.str : "").join(" "));
  }
  const selectableText = pageTexts.join("\n").trim();
  let text = selectableText;
  let sourceType: Invoice["sourceType"] = "Texto";
  if (selectableText.replace(/\s/g, "").length < PDF_TEXT_THRESHOLD) {
    sourceType = "OCR";
    text = "";
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("spa", 1, { langPath: "/ocr", logger: (message) => {
      if (message.status === "recognizing text") options.onProgress?.(Math.round(message.progress * 90), "Analizando imagen · " + Math.round(message.progress * 100) + "%");
    }});
    try {
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        if (options.signal?.aborted) throw new DOMException("Cancelado", "AbortError");
        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.7 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("No fue posible preparar la página para análisis");
        options.onProgress?.(Math.round(((pageNumber - 1) / pdfDocument.numPages) * 100), "Analizando página " + pageNumber + "/" + pdfDocument.numPages);
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        const result = await worker.recognize(canvas);
        text += result.data.text + "\n";
        canvas.width = 1;
        canvas.height = 1;
      }
    } finally {
      await worker.terminate();
    }
  }
  options.onProgress?.(96, "Organizando datos");
  return extractInvoice(text, { id: crypto.randomUUID(), fileName: file.name, fileSize: file.size, sourceType, pageCount: pdfDocument.numPages });
}
