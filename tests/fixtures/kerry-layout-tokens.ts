import type { PdfTextToken } from "../../lib/invoices/types.ts";
const t=(text:string,x:number,y:number,width=70):PdfTextToken=>({text,x,y,width,height:10,page:1});
export const kerryLayoutTokens:PdfTextToken[]=[
 t("KERRY",10,760),t("Baltimore Spice Central America S.A.",10,745,210),t("TAX ID:",10,730,45),t("3101016535",70,730),t("CLAVE NUMERICA:",300,730,100),t("50627072200310101653500100001010000053274110356535",420,730,300),
 t("FECHA DE EMISION:",300,700,115),t("2022-07-27T17:22:59",430,700,130),
 t("Doc. Interno:",10,620,75),t("60458751",100,620),t("Pedido:",190,620,45),t("19458409",250,620),t("Entrega:",340,620,50),t("810954472",405,620),t("Orden de Compra:",510,620,105),t("Case",630,620,30),t("04814210",665,620,55),
 t("Incoterm:",10,590,55),t("DDP SAN JOSE",80,590,85),t("Total Peso Bruto / Neto:",300,590,145),t("483.000 / 450.000",460,590,110),t("Moneda / Tipo de Cambio:",10,570,150),t("USD 1.00",175,570,60),
 t("Código Principal",10,500,85),t("Descripción / Clave CABYS",110,500,145),t("Lote",275,500,35),t("Peso Bruto",330,500,65),t("Peso Neto",410,500,60),t("Cantidad",485,500,50),t("Unidad Medida",550,500,80),t("Precio Unitario",650,500,85),t("Precio Total",755,500,70),
 ...row(460,"20659503","PACK CONDIMENTO SALCHICHON", "0006162626","127.000","125.000","125.000","kg","2,534.51","316,814.06"),t("COMPLETO 25KG",110,447,90),t("Código CABYS: 2399502009900",110,434,160),
 ...row(400,"20659503","PACK CONDIMENTO SALCHICHON COMPLETO 25KG","0006205532","127.000","125.000","125.000","kg","2,534.51","316,814.06"),t("Código CABYS: 2399502009900",110,387,160),
 ...row(350,"20659840","SOYA TEXTURIZADA CLARA 20KG","0006188047","204.000","200.000","200.000","kg","1,723.47","344,693.70"),t("Código CABYS: 2399502009900",110,337,160),t("Observaciones",10,300)
];
function row(y:number,...values:string[]){const xs=[10,110,275,330,410,485,550,650,755];return values.map((value,index)=>t(value,xs[index],y,index===1?150:65));}
