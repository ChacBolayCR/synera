import { emptyNumber, field, normalizeDate, normalizeSpaces, parseMeasurement, parseNumber } from "./normalize";
import { findValueRightOfLabel, groupTokensByRow } from "./layout";
import type { InvoiceItem, PdfTextToken } from "./types";

export type KerryLayoutResult = { date:string|null; originalDateTime:string|null; supplier:string|null; supplierTaxId:string|null; internalDocument:string|null; orderNumber:string|null; deliveryNumber:string|null; purchaseOrder:string|null; currency:string|null; exchangeRate:number|null; incoterm:string|null; totalGrossWeight:number|null; totalNetWeight:number|null; items:InvoiceItem[]; confidence:number };
const digits = (value:string|null, min=5, max=60) => { const clean=value?.replace(/\D/g,"")??""; return clean.length>=min&&clean.length<=max?clean:null; };
const cleanCompany = (value:string) => value.match(/^(.+?\b(?:S\.?A\.?|S\.?R\.?L\.?|LTDA\.?))/i)?.[1] ?? value;

export function isKerryLayout(text:string, tokens:PdfTextToken[]) { const corpus=`${text}\n${tokens.map(t=>t.text).join(" ")}`; return [/\bKERRY\b/i,/Baltimore\s+Spice\s+Central\s+America/i,/c[oó]digo\s+principal/i,/precio\s+unitario/i,/clave\s+num[eé]rica/i].filter(r=>r.test(corpus)).length>=4; }

export function extractKerryLayout(text:string, tokens:PdfTextToken[]): KerryLayoutResult|null {
  if (!isKerryLayout(text,tokens)) return null; const rows=groupTokensByRow(tokens);
  const right=(label:RegExp, pattern?:RegExp, maxDistance=260)=>findValueRightOfLabel(rows,label,{valuePattern:pattern,maxDistance})?.value??null;
  const dateTime=right(/^fecha\s+de\s+emisi[oó]n\s*:?$/i,/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?/);
  const delivery=digits(right(/^entrega\s*:?$/i,/\d{6,20}/),6,20); const order=digits(right(/^pedido\s*:?$/i,/\d{5,20}/)); const internal=digits(right(/^doc\.?\s*interno\s*:?$/i,/\d{5,20}/));
  const purchase=right(/^orden\s+de\s+compra\s*:?$/i,undefined,220); const incoterm=right(/^incoterm\s*:?$/i,undefined,180);
  const weights=right(/^total\s+peso\s+bruto\s*\/\s*neto\s*:?$/i,/[\d.,]+\s*\/\s*[\d.,]+/,220)?.split("/").map(value=>parseMeasurement(value.trim()))??[];
  const supplierRow=rows.find(row=>/Baltimore\s+Spice\s+Central\s+America/i.test(row.text)); const supplier=supplierRow?cleanCompany(supplierRow.text):null;
  const taxId=digits(right(/^tax\s*id\s*:?$/i,/\d[\d-]{7,20}/),8,20); const currencyRow=right(/^moneda\s*\/\s*tipo\s+de\s+cambio\s*:?$/i); const currency=currencyRow?.match(/\b(?:USD|CRC|EUR)\b/i)?.[0].toUpperCase()??null; const exchange=currencyRow?parseNumber(currencyRow.replace(/\b(?:USD|CRC|EUR)\b/i,"")):null;
  const items=extractKerryItems(rows); const confidence=[dateTime,delivery,order,internal,purchase,supplier,taxId,items.length===3].filter(Boolean).length;
  if (process.env.NODE_ENV === "development") for (const [label,value] of Object.entries({Entrega:delivery,Pedido:order,"Doc Interno":internal,"Orden Compra":purchase,Fecha:dateTime})) console.debug(`[KERRY] ${label}`,value);
  return {date:normalizeDate(dateTime),originalDateTime:dateTime,supplier,supplierTaxId:taxId,internalDocument:internal,orderNumber:order,deliveryNumber:delivery,purchaseOrder:purchase,currency,exchangeRate:exchange,incoterm,totalGrossWeight:weights[0]??null,totalNetWeight:weights[1]??null,items,confidence};
}

function extractKerryItems(rows:ReturnType<typeof groupTokensByRow>):InvoiceItem[] {
  const headerRows=rows.filter(row=>/c[oó]digo\s+principal|descripci[oó]n|lote|peso\s+bruto|peso\s+neto|cantidad|unidad\s+medida|precio\s+unitario|precio\s+total/i.test(row.text));
  if (!headerRows.length) return []; const headerTokens=headerRows.flatMap(row=>row.tokens); const column=(pattern:RegExp)=>headerTokens.find(token=>pattern.test(token.text))?.x;
  const xs=[column(/c[oó]digo\s+principal/i),column(/descripci[oó]n/i),column(/^lote$/i),column(/peso\s+bruto/i),column(/peso\s+neto/i),column(/^cantidad$/i),column(/unidad\s+medida/i),column(/precio\s+unitario/i),column(/precio\s+total/i)]; if(xs.some(x=>x==null))return[];
  const positions=xs as number[]; const bounds=positions.slice(0,-1).map((x,i)=>(x+positions[i+1])/2); const headerY=Math.min(...headerRows.map(row=>row.y)); const body=rows.filter(row=>row.y<headerY-2&&!/observaciones|subtotal|total\s+del\s+comprobante/i.test(row.text)); const items:InvoiceItem[]=[];
  for(const row of body){ const cells=Array.from({length:9},()=>[] as string[]); for(const token of row.tokens){let index=bounds.findIndex(bound=>token.x<bound);if(index<0)index=8;cells[index].push(token.text);} const code=digits(cells[0].join(""),5,14); if(code){const q=parseMeasurement(cells[5].join(" "));const price=parseNumber(cells[7].join(" "));const total=parseNumber(cells[8].join(" "));if(q!=null&&q>0&&price!=null&&price>=0&&total!=null&&total>=0)items.push({id:crypto.randomUUID(),code:field(code,code,"Alta"),description:field(cells[1].join(" "),normalizeSpaces(cells[1].join(" "))||null,"Media"),quantity:field(cells[5].join(" "),q,"Alta"),unit:field(cells[6].join(" "),cells[6].join(" ").toLowerCase()||null,"Alta"),unitPrice:field(cells[7].join(" "),price,"Alta"),discount:emptyNumber(),tax:emptyNumber(),lineTotal:field(cells[8].join(" "),total,"Alta"),lot:digits(cells[2].join(""),4,30)??undefined,grossWeight:parseMeasurement(cells[3].join(" "))??undefined,netWeight:parseMeasurement(cells[4].join(" "))??undefined});}
    else if(items.length){const current=items.at(-1)!;const description=normalizeSpaces(cells[1].join(" "));const cabys=digits(row.text.match(/(?:c[oó]digo\s+)?cabys\s*:?\s*(\d{8,20})/i)?.[1]??null,8,20);if(description&&!/cabys/i.test(description))current.description=field(`${current.description.originalValue??""} ${description}`.trim(),`${current.description.normalizedValue??""} ${description}`.trim(),"Alta");if(cabys)current.cabys=cabys;}
  } return items;
}
