export const branches = ["San José Centro", "Escazú", "Heredia"];
export const categories = ["Textiles", "Calzado", "Accesorios", "Hogar", "Cuidado personal"];

export const monthlySales = [
  ["Ene", 14800000, 13200000], ["Feb", 15600000, 14100000], ["Mar", 16900000, 15200000],
  ["Abr", 16200000, 14900000], ["May", 17800000, 15800000], ["Jun", 18400000, 16600000],
  ["Jul", 19750000, 17550000], ["Ago", 19100000, 17200000], ["Sep", 20500000, 18400000],
  ["Oct", 21800000, 19300000], ["Nov", 23200000, 21100000], ["Dic", 28600000, 25400000],
].map(([mes, actual, anterior]) => ({ mes, actual, anterior }));

export const dailySales = Array.from({ length: 60 }, (_, i) => {
  const d = new Date(2026, 6, 21 - i);
  const base = 148000 + ((i * 17731) % 92000);
  const previous = Math.round(base / (1.07 + (i % 5) * .012));
  return { fecha: d.toISOString().slice(0, 10), sucursal: branches[i % 3], ventas: base, anterior: previous, meta: 200000 };
});

export const products = [
  ["TXT-001", "Camisa Oxford", "Textiles", "Textiles del Valle", 42, 15, 12500],
  ["TXT-002", "Blusa Lino", "Textiles", "Textiles del Valle", 8, 12, 10800],
  ["TXT-003", "Pantalón Clásico", "Textiles", "Moda Central", 24, 10, 14900],
  ["TXT-004", "Vestido Midi", "Textiles", "Moda Central", 0, 8, 18500],
  ["CAL-001", "Tenis Urbano", "Calzado", "Calzado Tico", 31, 10, 22000],
  ["CAL-002", "Sandalia Cuero", "Calzado", "Calzado Tico", 6, 10, 16800],
  ["CAL-003", "Zapato Ejecutivo", "Calzado", "Calzado Tico", 19, 8, 28500],
  ["CAL-004", "Bota Casual", "Calzado", "Importadora Norte", 0, 6, 32000],
  ["ACC-001", "Bolso Crossbody", "Accesorios", "Importadora Norte", 17, 8, 9800],
  ["ACC-002", "Cinturón Cuero", "Accesorios", "Artesanos CR", 9, 12, 7200],
  ["ACC-003", "Aretes Dorados", "Accesorios", "Artesanos CR", 54, 20, 2800],
  ["ACC-004", "Billetera Compacta", "Accesorios", "Artesanos CR", 28, 10, 6500],
  ["HOG-001", "Manta Tejida", "Hogar", "Casa & Más", 12, 8, 11500],
  ["HOG-002", "Cojín Decorativo", "Hogar", "Casa & Más", 5, 10, 5900],
  ["HOG-003", "Vela Aromática", "Hogar", "Casa & Más", 37, 15, 3800],
  ["HOG-004", "Canasta Fibra", "Hogar", "Casa & Más", 14, 6, 8400],
  ["CUI-001", "Crema Corporal", "Cuidado personal", "Importadora Norte", 23, 10, 4800],
  ["CUI-002", "Jabón Artesanal", "Cuidado personal", "Artesanos CR", 7, 15, 2200],
  ["CUI-003", "Aceite Esencial", "Cuidado personal", "Importadora Norte", 0, 7, 5500],
  ["CUI-004", "Kit de Viaje", "Cuidado personal", "Importadora Norte", 16, 8, 7900],
].map(([code, name, category, supplier, stock, min, cost]) => ({ code, name, category, supplier, stock, min, cost } as { code:string; name:string; category:string; supplier:string; stock:number; min:number; cost:number }));

export const suppliers = [
  ["Textiles del Valle", "María Vargas", 4, 4385000, "Textiles", "12 jul 2026", "+8.0%", "Atención"],
  ["Moda Central", "Andrés Soto", 2, 2760000, "Textiles", "8 jul 2026", "+2.4%", "Activo"],
  ["Calzado Tico", "Laura Mora", 2, 3150000, "Calzado", "15 jul 2026", "-1.2%", "Activo"],
  ["Importadora Norte", "Diego Rojas", 2, 1980000, "Accesorios", "18 jul 2026", "+3.1%", "Activo"],
  ["Artesanos CR", "Sofía Brenes", 1, 740000, "Accesorios", "2 jul 2026", "+0.8%", "Activo"],
  ["Casa & Más", "Pablo Arias", 1, 1285000, "Hogar", "10 jul 2026", "+1.5%", "Activo"],
].map(([name, contact, invoices, total, supplied, last, variation, status]) => ({ name, contact, invoices, total, supplied, last, variation, status }));

export const invoices = Array.from({ length: 12 }, (_, i) => ({
  number: `FAC-${20260700 + i + 1}`, date: `2026-07-${String(20 - i).padStart(2, "0")}`,
  supplier: suppliers[i % 6].name, products: 2 + (i % 5), total: 385000 + i * 73500,
  status: ["Procesada", "Pendiente de revisión", "Confirmada", "Error"][i % 4],
}));

const names = ["Ana Solís", "Carlos Mena", "Valeria Chaves", "Luis Jiménez", "Mariana Castro", "Jorge Salas", "Daniela Rojas", "Esteban Mora", "Paola Vargas", "Ricardo Arias", "Natalia Brenes", "Kevin Soto", "Gabriela López", "Óscar Ramírez", "Lucía Hernández"];
export const employees = names.map((name, i) => ({ name, role: ["Gerente", "Ventas", "Bodega", "Caja", "Compras"][i % 5], branch: branches[i % 3], joined: `202${i % 6}-0${(i % 8) + 1}-15`, salary: 420000 + (i % 5) * 85000, status: i === 13 ? "Vacaciones" : "Activo" }));

export const movements = Array.from({ length: 40 }, (_, i) => ({ date: `2026-07-${String(21 - (i % 20)).padStart(2, "0")}`, product: products[i % 20].name, type: ["Venta", "Entrada por factura", "Ajuste", "Conteo físico", "Devolución"][i % 5], ref: `MOV-${1040 - i}`, input: i % 5 === 1 ? 20 + i : i % 5 === 4 ? 2 : 0, output: i % 5 === 0 ? 1 + (i % 4) : 0, result: Math.max(0, products[i % 20].stock - (i % 6)), supplier: products[i % 20].supplier, note: i % 5 === 2 ? "Verificación de bodega" : "Movimiento registrado" }));

export const priceEvolution = [
  { mes: "Feb", valle: 10800, central: 11200 }, { mes: "Mar", valle: 10950, central: 11300 },
  { mes: "Abr", valle: 11200, central: 11450 }, { mes: "May", valle: 11600, central: 11700 },
  { mes: "Jun", valle: 11900, central: 12000 }, { mes: "Jul", valle: 12500, central: 12200 },
];
