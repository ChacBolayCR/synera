"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Ban, Check, Download, Eye, FileText, PackageCheck, Pencil, Play, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { demoInvoices } from "../../lib/invoices/demo";
import { blankInvoice } from "../../lib/invoices/extract";
import { processInvoiceQueue } from "../../lib/invoices/queue";
import type { ConfidenceLevel, ExtractionField, Invoice, InvoiceItem } from "../../lib/invoices/types";
import { exportInvoiceWorkbook } from "../../lib/excel/export-invoices";

const money = (value: number) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value).replace("CRC", "₡");
const size = (bytes: number) => bytes < 1_000_000 ? (bytes / 1000).toFixed(0) + " KB" : (bytes / 1_000_000).toFixed(1) + " MB";
const tone = (value: string) => /Error|Baja/.test(value) ? "red" : /Requiere|Media|Cancelado/.test(value) ? "amber" : "green";
const cloneDemo = () => demoInvoices.map((invoice) => ({ ...invoice, id: crypto.randomUUID(), items: invoice.items.map((item) => ({ ...item, id: crypto.randomUUID() })), issues: invoice.issues.map((issue) => ({ ...issue, id: crypto.randomUUID() })) }));

export function InvoiceIntelligence({ notify }: { notify: (message: string) => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [concurrency, setConcurrency] = useState(3);
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<"Resultados" | "Requieren revisión">("Resultados");
  const [supplier, setSupplier] = useState("Todos los proveedores");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const update = (id: string, patch: Partial<Invoice>) => setInvoices((current) => current.map((invoice) => invoice.id === id ? { ...invoice, ...patch } : invoice));
  const chooseFiles = (list: FileList | null) => {
    if (!list) return; const selectedFiles = Array.from(list).filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")).slice(0, 200);
    const pending = selectedFiles.map(blankInvoice); setFiles(selectedFiles); setInvoices(pending); notify(selectedFiles.length + " PDFs seleccionados");
  };
  const start = async () => {
    if (!files.length || running) return; setRunning(true); const controller = new AbortController(); abortRef.current = controller;
    await processInvoiceQueue(files, invoices.map((invoice) => invoice.id), concurrency, controller.signal, update); setRunning(false); notify(controller.signal.aborted ? "Procesamiento cancelado" : "Lote analizado");
  };
  const retry = async (invoice: Invoice) => {
    const index = invoices.findIndex((entry) => entry.id === invoice.id); const file = files[index]; if (!file) { notify("El archivo original ya no está disponible; selecciónalo nuevamente"); return; }
    const controller = new AbortController(); await processInvoiceQueue([file], [invoice.id], 1, controller.signal, update);
  };
  const suppliers = useMemo(() => [...new Set(invoices.map((invoice) => invoice.supplier.normalizedValue).filter(Boolean) as string[])], [invoices]);
  const visible = invoices.filter((invoice) => (supplier === "Todos los proveedores" || invoice.supplier.normalizedValue === supplier) && (view === "Resultados" || invoice.status === "Requiere revisión"));
  const completed = visible.filter((invoice) => invoice.status === "Completado").length;
  const reviews = visible.filter((invoice) => invoice.status === "Requiere revisión").length;
  const errors = visible.filter((invoice) => invoice.status === "Error").length;
  const total = visible.reduce((sum, invoice) => sum + (invoice.total.normalizedValue ?? 0), 0);
  const productCount = visible.reduce((sum, invoice) => sum + invoice.items.length, 0);
  const units = visible.flatMap((invoice) => invoice.items).reduce((sum, item) => sum + (item.quantity.normalizedValue ?? 0), 0);

  return <div className="invoice-intelligence">
    <div className="invoice-hero"><div><span className="eyebrow">INVOICE INTELLIGENCE</span><h2>Analizar facturas</h2><p>Convierte facturas PDF en datos revisables y un Excel consolidado. Los documentos permanecen en este dispositivo.</p></div><div className="button-row"><button className="secondary" onClick={() => { setInvoices(cloneDemo()); setFiles([]); notify("Facturas demo cargadas"); }}><Play size={16}/> Cargar modo demo</button><label className="primary file-button"><Upload size={16}/> Seleccionar PDFs<input type="file" accept="application/pdf,.pdf" multiple onChange={(event) => chooseFiles(event.target.files)}/></label></div></div>
    <div className="privacy-note"><Check size={16}/><span><b>Procesamiento local</b> Los PDFs no se suben a servidores ni se guardan en localStorage.</span></div>
    <div className="queue-toolbar"><div><b>{invoices.length} archivos seleccionados</b><span>{completed} completados · {reviews} requieren revisión · {errors} con error · {invoices.filter((i) => i.status === "Procesando").length} procesando</span></div><label>Procesar simultáneamente <select value={concurrency} onChange={(event) => setConcurrency(Number(event.target.value))}>{[1,2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select></label>{running ? <button className="secondary danger" onClick={() => abortRef.current?.abort()}><Ban size={15}/> Cancelar</button> : <button className="primary" disabled={!files.length} onClick={start}><Play size={15}/> Iniciar análisis</button>}</div>
    {invoices.length === 0 ? <div className="invoice-empty"><FileText/><h3>Selecciona hasta 200 facturas PDF</h3><p>SYNERA detectará si cada documento contiene texto o si necesita análisis de imagen.</p><div><span>PDF con texto</span><span>Factura escaneada</span><span>Varias páginas</span></div></div> : <>
      <div className="invoice-kpis"><MiniKpi label="Facturas listas" value={String(completed)} /><MiniKpi label="Requieren revisión" value={String(reviews)} tone="amber"/><MiniKpi label="Con error" value={String(errors)} tone="red"/><MiniKpi label="Total de compra" value={money(total)}/><MiniKpi label="Productos" value={productCount.toLocaleString("es-CR")}/><MiniKpi label="Unidades" value={units.toLocaleString("es-CR")}/><MiniKpi label="Proveedores" value={String(suppliers.length)}/></div>
      <div className="invoice-tabs"><button className={view === "Resultados" ? "active" : ""} onClick={() => setView("Resultados")}>Resultados</button><button className={view === "Requieren revisión" ? "active" : ""} onClick={() => setView("Requieren revisión")}><AlertTriangle size={14}/> Requieren revisión <em>{reviews}</em></button><div/><select value={supplier} onChange={(event) => setSupplier(event.target.value)}><option>Todos los proveedores</option>{suppliers.map((name) => <option key={name}>{name}</option>)}</select><button className="primary" onClick={() => exportInvoiceWorkbook(visible)} disabled={!visible.length}><Download size={15}/> Exportar Excel</button></div>
      {view === "Requieren revisión" ? <div className="review-grid">{visible.map((invoice) => <article className="review-card" key={invoice.id}><div><AlertTriangle/><span><b>{invoice.fileName}</b><small>{invoice.invoiceNumber.normalizedValue || "Factura sin identificar"} · {invoice.supplier.normalizedValue || "Proveedor no identificado"}</small></span></div><ul>{invoice.issues.filter((issue) => !issue.resolved).map((issue) => <li key={issue.id}>{issue.problem}</li>)}</ul><button className="secondary" onClick={() => setSelected(invoice)}>Revisar</button></article>)}</div> : <div className="invoice-table-wrap"><table><thead><tr><th>Estado</th><th>Archivo / factura</th><th>Fecha</th><th>Proveedor</th><th>Subtotal</th><th>Impuesto</th><th>Total</th><th>Confianza</th><th>Acciones</th></tr></thead><tbody>{visible.map((invoice) => <tr key={invoice.id}><td><span className={"badge " + tone(invoice.status)}>{invoice.status}</span>{invoice.status === "Procesando" && <div className="invoice-progress"><i style={{ width: invoice.progress + "%" }}/><small>{invoice.progressLabel}</small></div>}</td><td className="strong">{invoice.invoiceNumber.normalizedValue || invoice.fileName}<small className="sub">{invoice.fileName} · {size(invoice.fileSize)} · {invoice.sourceType}</small></td><td>{invoice.date.normalizedValue || "—"}</td><td>{invoice.supplier.normalizedValue || "—"}</td><td>{invoice.subtotal.normalizedValue == null ? "—" : money(invoice.subtotal.normalizedValue)}</td><td>{invoice.tax.normalizedValue == null ? "—" : money(invoice.tax.normalizedValue)}</td><td className="strong">{invoice.total.normalizedValue == null ? "—" : money(invoice.total.normalizedValue)}</td><td><span className={"confidence " + tone(invoice.confidence)}>{invoice.confidence}</span></td><td><div className="row-actions"><button title="Ver" onClick={() => setSelected(invoice)}><Eye/></button><button title="Editar" onClick={() => setSelected(invoice)}><Pencil/></button><button title="Reprocesar" onClick={() => retry(invoice)}><RotateCcw/></button><button title="Eliminar" onClick={() => setInvoices((current) => current.filter((entry) => entry.id !== invoice.id))}><Trash2/></button></div></td></tr>)}</tbody></table></div>}
      <div className="inventory-prep"><PackageCheck/><span><b>Preparación para inventario</b>Revisa proveedor, factura, producto y cantidad antes de crear una futura entrada.</span><button className="secondary" disabled={!visible.some((invoice) => invoice.items.length)} onClick={() => notify("Resumen de entrada preparado; el inventario no fue modificado")}>Preparar entrada de inventario</button></div>
    </>}
    {selected && <InvoiceEditor invoice={selected} close={() => setSelected(null)} save={(invoice) => { update(invoice.id, invoice); setSelected(null); notify("Correcciones guardadas"); }}/>} 
  </div>;
}

function MiniKpi({ label, value, tone = "green" }: { label: string; value: string; tone?: string }) { return <article className={"invoice-mini-kpi " + tone}><span>{label}</span><b>{value}</b></article>; }

function InvoiceEditor({ invoice, close, save }: { invoice: Invoice; close: () => void; save: (invoice: Invoice) => void }) {
  const [draft, setDraft] = useState(invoice);
  const setText = (key: "invoiceNumber" | "date" | "supplier", value: string) => setDraft((current) => ({ ...current, [key]: { ...current[key], originalValue: value, normalizedValue: value, confidence: "Alta" as ConfidenceLevel } }));
  const setItem = (id: string, key: keyof Pick<InvoiceItem, "code" | "description" | "quantity" | "unitPrice" | "lineTotal">, value: string) => setDraft((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, [key]: { ...item[key], originalValue: value, normalizedValue: key === "quantity" || key === "unitPrice" || key === "lineTotal" ? Number(value) : value, confidence: "Alta" } as ExtractionField<string | number> } : item) }));
  const finalize = () => save({ ...draft, status: "Completado", confidence: "Alta", issues: draft.issues.map((issue) => ({ ...issue, resolved: true })) });
  return <div className="modal-bg"><div className="modal invoice-editor"><button className="modal-x" onClick={close}><X/></button><span className="eyebrow">REVISIÓN DE FACTURA</span><h2>{draft.invoiceNumber.normalizedValue || draft.fileName}</h2><p>{draft.fileName} · {draft.pageCount} página(s) · extracción por {draft.sourceType}</p><div className="editor-fields"><label>Número de factura<input value={draft.invoiceNumber.normalizedValue ?? ""} onChange={(event) => setText("invoiceNumber", event.target.value)}/></label><label>Fecha<input type="date" value={draft.date.normalizedValue ?? ""} onChange={(event) => setText("date", event.target.value)}/></label><label>Proveedor<input value={draft.supplier.normalizedValue ?? ""} onChange={(event) => setText("supplier", event.target.value)}/></label><label>Total<input type="number" value={draft.total.normalizedValue ?? ""} onChange={(event) => setDraft((current) => ({ ...current, total: { ...current.total, normalizedValue: Number(event.target.value), originalValue: event.target.value, confidence: "Alta" } }))}/></label></div>
    <h3>Productos</h3><div className="table-wrap"><table><thead><tr><th>Código</th><th>Descripción</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr></thead><tbody>{draft.items.map((item) => <tr key={item.id}><td><input value={item.code.normalizedValue ?? ""} onChange={(event) => setItem(item.id, "code", event.target.value)}/></td><td><input value={item.description.normalizedValue ?? ""} onChange={(event) => setItem(item.id, "description", event.target.value)}/></td><td><input type="number" value={item.quantity.normalizedValue ?? ""} onChange={(event) => setItem(item.id, "quantity", event.target.value)}/></td><td><input type="number" value={item.unitPrice.normalizedValue ?? ""} onChange={(event) => setItem(item.id, "unitPrice", event.target.value)}/></td><td><input type="number" value={item.lineTotal.normalizedValue ?? ""} onChange={(event) => setItem(item.id, "lineTotal", event.target.value)}/></td></tr>)}</tbody></table></div>
    {draft.issues.length > 0 && <div className="editor-issues"><AlertTriangle/><span><b>{draft.issues.filter((issue) => !issue.resolved).length} observaciones</b>{draft.issues.map((issue) => <small key={issue.id}>{issue.problem}</small>)}</span></div>}
    <div className="modal-actions"><button className="secondary" onClick={close}>Cancelar</button><button className="primary" onClick={finalize}><Check size={16}/> Guardar revisión</button></div></div></div>;
}
