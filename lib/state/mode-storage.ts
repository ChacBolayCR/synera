import type { Invoice } from "../invoices/types";

export type DataMode = "demo" | "real";
export const DEMO_STATE_KEY = "synera-demo-state-v1";
export const REAL_STATE_KEY = "synera-real-state-v1";
export const ACTIVE_MODE_KEY = "synera-active-mode-v1";
export type ModeState = { stocks: Record<string, number>; invoices: Invoice[] };

export const modeStateKey = (mode: DataMode) => mode === "demo" ? DEMO_STATE_KEY : REAL_STATE_KEY;
export const emptyModeState = (): ModeState => ({ stocks: {}, invoices: [] });
export const sanitizeInvoices = (invoices: Invoice[]) => invoices.map((invoice) => { const copy = { ...invoice }; delete copy.rawText; return copy; });
