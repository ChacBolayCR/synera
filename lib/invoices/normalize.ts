import type { ExtractionField } from "./types";

export const normalizeSpaces = (value: string) => value.replace(/\s+/g, " ").trim();
export const normalizeCode = (value: string) => normalizeSpaces(value).toUpperCase().replace(/\s*[-–—]\s*/g, "-");
export function normalizeDescription(value: string) { const clean = normalizeSpaces(value); return clean ? clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase() : clean; }
export function parseNumber(value?: string | null): number | null {
  if (!value) return null; let clean = value.replace(/[^\d,.-]/g, "").trim(); if (!clean) return null;
  const comma = clean.lastIndexOf(","); const dot = clean.lastIndexOf(".");
  if (comma > dot) clean = clean.replace(/\./g, "").replace(",", "."); else clean = clean.replace(/,/g, "");
  const parsed = Number(clean); return Number.isFinite(parsed) ? parsed : null;
}
export function normalizeDate(value?: string | null): string | null {
  if (!value) return null; const match = normalizeSpaces(value).match(/(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4})/); if (!match) return null;
  const [, a, b, c] = match; let year: string, month: string, day: string;
  if (a.length === 4) [year, month, day] = [a, b, c]; else [day, month, year] = [a, b, c.length === 2 ? `20${c}` : c];
  const result = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`; return Number.isNaN(Date.parse(`${result}T12:00:00`)) ? null : result;
}
export function field<T>(originalValue: string | null, normalizedValue: T | null, confidence: ExtractionField<T>["confidence"]): ExtractionField<T> { return { originalValue, normalizedValue, confidence }; }
export const emptyText = () => field<string>(null, null, "Baja");
export const emptyNumber = () => field<number>(null, null, "Baja");
