import type { ExtractionField } from "./types";

export const normalizeSpaces = (value: string) => value.replace(/\s+/g, " ").trim();
export const normalizeCode = (value: string) => normalizeSpaces(value).toUpperCase().replace(/\s*[-–—]\s*/g, "-");
export const normalizeDeliveryNumber = (value?: string | number | null) => value == null ? "" : String(value).replace(/[\s\u200B-\u200D\uFEFF._-]+/g, "").replace(/\D/g, "");
export function normalizeDescription(value: string) { const clean = normalizeSpaces(value); return clean ? clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase() : clean; }
export function parseNumber(value?: string | null): number | null {
  if (!value) return null; let clean = value.replace(/[^\d,.-]/g, "").trim(); if (!clean) return null;
  const comma = clean.lastIndexOf(","); const dot = clean.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    clean = comma > dot ? clean.replace(/\./g, "").replace(",", ".") : clean.replace(/,/g, "");
  } else if (comma >= 0) {
    const decimals = clean.length - comma - 1; clean = decimals === 3 ? clean.replace(/,/g, "") : clean.replace(",", ".");
  } else if (dot >= 0) {
    const decimals = clean.length - dot - 1; if (decimals === 3 && /^-?\d{1,3}(\.\d{3})+$/.test(clean)) clean = clean.replace(/\./g, "");
  }
  const parsed = Number(clean); return Number.isFinite(parsed) ? parsed : null;
}
export function parseMeasurement(value?: string | null): number | null {
  if (!value) return null;
  const clean = value.replace(/[^\d,.-]/g, "").trim();
  if (/^-?\d+[.,]\d{3}$/.test(clean)) return Number(clean.replace(",", "."));
  return parseNumber(clean);
}
export function normalizeDate(value?: string | null): string | null {
  if (!value) return null; const match = normalizeSpaces(value).match(/(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4})(?:T\d{2}:\d{2}(?::\d{2})?)?/); if (!match) return null;
  const [, a, b, c] = match; let year: string, month: string, day: string;
  if (a.length === 4) [year, month, day] = [a, b, c]; else [day, month, year] = [a, b, c.length === 2 ? `20${c}` : c];
  const result = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`; return Number.isNaN(Date.parse(`${result}T12:00:00`)) ? null : result;
}
export function field<T>(originalValue: string | null, normalizedValue: T | null, confidence: ExtractionField<T>["confidence"]): ExtractionField<T> { return { originalValue, normalizedValue, confidence }; }
export const emptyText = () => field<string>(null, null, "Baja");
export const emptyNumber = () => field<number>(null, null, "Baja");
