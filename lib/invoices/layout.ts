import { normalizeSpaces } from "./normalize";
import type { PdfTextToken } from "./types";

export type TokenRow = { y: number; tokens: PdfTextToken[]; text: string };

export function groupTokensByRow(tokens: PdfTextToken[], yTolerance = 3): TokenRow[] {
  const rows: PdfTextToken[][] = [];
  for (const token of [...tokens].filter((entry) => entry.text.trim()).sort((a, b) => (a.page ?? 0) - (b.page ?? 0) || b.y - a.y || a.x - b.x)) {
    const row = rows.find((candidate) => (candidate[0].page ?? 0) === (token.page ?? 0) && Math.abs(candidate[0].y - token.y) <= yTolerance);
    if (row) row.push(token); else rows.push([token]);
  }
  return rows.map((row) => { const ordered = row.sort((a, b) => a.x - b.x); return { y: ordered.reduce((sum, token) => sum + token.y, 0) / ordered.length, tokens: ordered, text: normalizeSpaces(ordered.map((token) => token.text).join(" ")) }; });
}

export function findValueRightOfLabel(rows: TokenRow[], label: RegExp, options: { maxDistance?: number; valuePattern?: RegExp } = {}) {
  const maxDistance = options.maxDistance ?? 260;
  for (const row of rows) {
    const anchorIndex = row.tokens.findIndex((token) => label.test(token.text.trim()));
    if (anchorIndex < 0) continue;
    const anchor = row.tokens[anchorIndex]; const startX = anchor.x + anchor.width;
    const candidates = row.tokens.slice(anchorIndex + 1).filter((token) => token.x >= startX - 3 && token.x - startX <= maxDistance);
    const stop = candidates.findIndex((token) => /^(?:doc\.?\s*interno|pedido|entrega|orden\s+de\s+compra|incoterm|total\s+peso|moneda)/i.test(token.text));
    const valueTokens = stop >= 0 ? candidates.slice(0, stop) : candidates;
    const value = normalizeSpaces(valueTokens.map((token) => token.text).join(" "));
    const matched = options.valuePattern ? value.match(options.valuePattern)?.[0] ?? null : value || null;
    return { value: matched, labelToken: anchor, valueTokens };
  }
  return null;
}
