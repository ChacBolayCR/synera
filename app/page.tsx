"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Gauge,
  Menu,
  PackageCheck,
  Play,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Trash2,
  Upload,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  branches,
  categories,
  dailySales,
  employees,
  invoices,
  monthlySales,
  movements,
  priceEvolution,
  products,
  suppliers,
} from "../data/demo-data";
import { InvoiceIntelligence } from "../components/invoices/InvoiceIntelligence";
import { ACTIVE_MODE_KEY, DEMO_STATE_KEY, REAL_STATE_KEY, modeStateKey, sanitizeInvoices, type DataMode } from "../lib/state/mode-storage";

type Module =
  | "control"
  | "ventas"
  | "compras"
  | "inventario"
  | "proveedores"
  | "planilla"
  | "reportes";
const money = (n: number) =>
  new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  })
    .format(n)
    .replace("CRC", "₡");
const compact = (n: number) => `₡${(n / 1_000_000).toFixed(1)}M`;
const colors = ["#176b64", "#d59a42", "#5d7cba", "#d66b5f", "#7b66a8"];

const nav = [
  ["control", "Centro de Control", Gauge],
  ["ventas", "Ventas", ShoppingBag],
  ["compras", "Compras", ShoppingCart],
  ["inventario", "Inventario", Boxes],
  ["proveedores", "Proveedores", Truck],
  ["planilla", "Planilla", Users],
  ["reportes", "Reportes", BarChart3],
] as const;

function Badge({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function statusTone(s: string) {
  return /Error|Agotado/.test(s)
    ? "red"
    : /Pendiente|bajo|Atención|Vacaciones/.test(s)
      ? "amber"
      : /Sobrestock/.test(s)
        ? "blue"
        : "green";
}
function Select({
  children,
  value,
  onChange,
  label,
}: {
  children: React.ReactNode;
  value?: string;
  onChange?: (v: string) => void;
  label?: string;
}) {
  return (
    <label className="select-wrap">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange?.(e.target.value)}>
        {children}
      </select>
      <ChevronDown size={14} />
    </label>
  );
}
function Kpi({
  label,
  value,
  detail,
  icon: Icon,
  tone = "green",
}: {
  label: string;
  value: string;
  detail?: string;
  icon: React.ElementType;
  tone?: string;
}) {
  return (
    <article className="kpi">
      <div className={`kpi-icon ${tone}`}>
        <Icon size={18} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </article>
  );
}
function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-head">
          <div>
            <h3>{title}</h3>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
function Filters({ extended = false }: { extended?: boolean }) {
  return (
    <div className="filters">
      <div className="filter-title">
        <Search size={15} /> Filtros
      </div>
      <Select label="Sucursal">
        <option>Todas las sucursales</option>
        {branches.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </Select>
      <Select label="Año">
        <option>2026</option>
        <option>2025</option>
      </Select>
      <Select label="Mes">
        <option>Julio</option>
        <option>Junio</option>
      </Select>
      {extended && (
        <>
          <Select label="Categoría">
            <option>Todas las categorías</option>
            {categories.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
          <Select label="Producto">
            <option>Todos los productos</option>
            {products.slice(0, 5).map((x) => (
              <option key={x.code}>{x.name}</option>
            ))}
          </Select>
        </>
      )}
      <button className="link-btn">Limpiar</button>
    </div>
  );
}

function SalesChart({ small = false }: { small?: boolean }) {
  const chartData = small
    ? dailySales
        .slice(0, 30)
        .reverse()
        .map((item) => ({
          label: item.fecha.slice(8),
          current: item.ventas,
          previous: item.anterior,
        }))
    : monthlySales.map((item) => ({
        label: item.mes,
        current: item.actual,
        previous: item.anterior,
      }));

  return (
    <ResponsiveContainer width="100%" height={small ? 230 : 310}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#176b64" stopOpacity={0.24} />
            <stop offset="100%" stopColor="#176b64" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e9ece8" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          fontSize={11}
        />
        <Tooltip formatter={(v) => money(Number(v))} />
        <Legend />
        <Area
          type="monotone"
          dataKey="current"
          name="Año actual"
          stroke="#176b64"
          fill="url(#salesFill)"
          strokeWidth={2.5}
        />
        <Line
          type="monotone"
          dataKey="previous"
          name="Año anterior"
          stroke="#9aa39f"
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function Home() {
  const [module, setModule] = useState<Module>("control");
  const [branch, setBranch] = useState("Todas las sucursales");
  const [mode, setMode] = useState<DataMode>(() => typeof window !== "undefined" && localStorage.getItem(ACTIVE_MODE_KEY) === "real" ? "real" : "demo");
  const readModeState = (selectedMode: DataMode) => { if (typeof window === "undefined") return { stocks: {}, invoices: [] }; try { return JSON.parse(localStorage.getItem(selectedMode === "demo" ? DEMO_STATE_KEY : REAL_STATE_KEY) || "{}"); } catch { return { stocks: {}, invoices: [] }; } };
  const [stocks, setStocks] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    const selectedMode = localStorage.getItem(ACTIVE_MODE_KEY) === "real" ? "real" : "demo";
    return readModeState(selectedMode).stocks || {};
  });
  const [modeInvoices, setModeInvoices] = useState<import("../lib/invoices/types").Invoice[]>(() => readModeState(mode).invoices || []);
  const [toast, setToast] = useState("");
  const [tour, setTour] = useState(false);
  const [mobile, setMobile] = useState(false);
  const saveStocks = (next: Record<string, number>) => {
    setStocks(next);
    localStorage.setItem(modeStateKey(mode), JSON.stringify({ ...readModeState(mode), stocks: next, invoices: modeInvoices }));
  };
  const saveInvoices = (next: import("../lib/invoices/types").Invoice[]) => { const structured = sanitizeInvoices(next); setModeInvoices(structured); try { localStorage.setItem(modeStateKey(mode), JSON.stringify({ ...readModeState(mode), stocks, invoices: structured })); } catch { notify("No fue posible guardar todos los resultados en este dispositivo"); } };
  const switchMode = (next: DataMode) => { if (next === mode) return; const message = next === "real" ? "Está entrando al entorno de datos reales. Los datos de demostración no se mostrarán." : "Está entrando al entorno de demostración. Sus datos reales permanecerán guardados en este dispositivo."; if (!window.confirm(message)) return; const state = readModeState(next); setMode(next); setStocks(state.stocks || {}); setModeInvoices(state.invoices || []); localStorage.setItem(ACTIVE_MODE_KEY, next); };
  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2800);
  };
  const reset = () => {
    localStorage.removeItem(DEMO_STATE_KEY);
    setStocks({});
    setModeInvoices([]);
    notify("Datos demo restablecidos");
  };
  const clearReal = () => { if (!window.confirm("Esta acción eliminará los datos reales almacenados localmente en este dispositivo. Los datos demo no serán afectados.")) return; localStorage.removeItem(REAL_STATE_KEY); setStocks({}); setModeInvoices([]); notify("Datos reales eliminados"); };
  const title = nav.find((x) => x[0] === module)?.[1];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand">
          <div className="mark">
            <span />
            <span />
            <span />
          </div>
          <div>
            <b>SYNERA</b>
            <small>Business Operations Platform</small>
          </div>
          <button className="mobile-close" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={module === id ? "active" : ""}
              onClick={() => {
                setModule(id);
                setMobile(false);
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "compras" && <em>2</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {mode === "demo" && <button onClick={() => setTour(true)}>
            <Play size={17} /> Iniciar recorrido demo
          </button>}
          <div className="mission">
            “Simplificamos el trabajo para dedicar más tiempo a lo que realmente
            importa.”
          </div>
          <div className="user">
            <div>AS</div>
            <span>
              <b>Ana Solís</b>
              <small>Administradora</small>
            </span>
          </div>
        </div>
      </aside>
      {mobile && <div className="scrim" onClick={() => setMobile(false)} />}
      <main>
        <header>
          <button className="menu-btn" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <div>
            <p>SYNERA / {title}</p>
            <h1>{title}</h1>
          </div>
          <div className="header-actions">
            <div className="mode-switch"><button className={mode === "demo" ? "active" : ""} onClick={() => switchMode("demo")}>Demo</button><button className={mode === "real" ? "active real" : ""} onClick={() => switchMode("real")}>Datos reales</button></div>
            <Select value={branch} onChange={setBranch} label="Sucursal">
              <option>Todas las sucursales</option>
              {branches.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
            <button className="icon-btn" aria-label="Notificaciones">
              <Bell size={18} />
              <i />
            </button>
            <button className="avatar">AS</button>
          </div>
        </header>
        <div className="content">
          {mode === "real" && module !== "compras" ? <RealEmpty module={module} go={setModule} /> : <>
          {module === "control" && <Control branch={branch} go={setModule} />}{" "}
          {module === "ventas" && <Sales />}{" "}
          {module === "compras" && (
            <Purchases stocks={stocks} save={saveStocks} notify={notify} mode={mode} analyzedInvoices={modeInvoices} saveInvoices={saveInvoices} />
          )}{" "}
          {module === "inventario" && (
            <Inventory stocks={stocks} save={saveStocks} notify={notify} />
          )}{" "}
          {module === "proveedores" && <Suppliers />}{" "}
          {module === "planilla" && <Payroll notify={notify} />}{" "}
          {module === "reportes" && <Reports notify={notify} />}
          </>}
        </div>
      </main>
      {toast && (
        <div className="toast">
          <Check size={18} />
          {toast}
        </div>
      )}
      {tour && (
        <Tour
          close={() => setTour(false)}
          go={(m) => {
            setModule(m);
            setTour(false);
          }}
        />
      )}
      {mode === "demo" ? <button className="reset" onClick={reset}>
        <RefreshCw size={14} /> Restablecer datos demo
      </button> : <button className="reset real-clear" onClick={clearReal}><Trash2 size={14}/> Limpiar datos reales</button>}
    </div>
  );
}

function Control({ branch, go }: { branch: string; go: (m: Module) => void }) {
  const low = products.filter((p) => p.stock > 0 && p.stock < p.min).length;
  return (
    <>
      <div className="welcome">
        <div>
          <span className="eyebrow">SÁBADO, 18 DE JULIO DE 2026</span>
          <h2>
            Buenos días, Ana <span>👋</span>
          </h2>
          <p>
            Este es el pulso de{" "}
            {branch === "Todas las sucursales" ? "tu negocio hoy" : branch}.
          </p>
        </div>
        <div className="goal">
          <span>Meta diaria</span>
          <b>92%</b>
          <div>
            <i style={{ width: "92%" }} />
          </div>
          <small>
            {money(185250)} de {money(201500)}
          </small>
        </div>
      </div>
      <div className="kpi-grid control-kpis">
        <Kpi
          label="Ventas de hoy"
          value={money(185250)}
          detail="↑ 12.3% vs. año anterior"
          icon={CircleDollarSign}
        />
        <Kpi
          label="Compras del mes"
          value={compact(12_480_000)}
          detail="48 facturas procesadas"
          icon={ReceiptText}
          tone="blue"
        />
        <Kpi
          label="Stock bajo"
          value={String(low)}
          detail="3 productos agotados"
          icon={AlertTriangle}
          tone="amber"
        />
        <Kpi
          label="Colaboradores"
          value="15"
          detail="Próximo pago: 31 jul"
          icon={Users}
          tone="purple"
        />
        <Kpi
          label="Entregas pendientes"
          value="4"
          detail="2 llegan esta semana"
          icon={Truck}
          tone="blue"
        />
        <Kpi
          label="Facturas por revisar"
          value="2"
          detail="Requieren confirmación"
          icon={FileCheck2}
          tone="red"
        />
      </div>
      <div className="dashboard-grid">
        <Card
          title="Ventas de los últimos 30 días"
          action={
            <button className="text-action" onClick={() => go("ventas")}>
              Ver detalle →
            </button>
          }
        >
          <SalesChart small />
        </Card>
        <Card
          className="insights"
          title="SYNERA Insights"
          action={<Sparkles size={18} />}
        >
          <div className="insight">
            <TrendingUp />
            <span>
              <b>Buen desempeño hoy</b>Las ventas están 12.3% por encima del
              mismo día del año anterior.
            </span>
          </div>
          <div className="insight">
            <Building2 />
            <span>
              <b>Escazú lidera el crecimiento</b>La sucursal creció 18.7% este
              mes.
            </span>
          </div>
          <div className="insight warn">
            <AlertTriangle />
            <span>
              <b>Atención al inventario</b>Cinco productos están por debajo del
              stock mínimo.
            </span>
          </div>
          <div className="insight warn">
            <TrendingUp />
            <span>
              <b>Cambio de costo detectado</b>Textiles del Valle aumentó sus
              precios un 8%.
            </span>
          </div>
        </Card>
      </div>
      <div className="lower-grid">
        <Card title="Ventas por sucursal">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart
              data={[
                { n: "San José", v: 8.2 },
                { n: "Escazú", v: 6.8 },
                { n: "Heredia", v: 4.7 },
              ]}
              layout="vertical"
            >
              <CartesianGrid stroke="#eee" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                dataKey="n"
                type="category"
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip />
              <Bar dataKey="v" fill="#176b64" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Próximas acciones">
          <div className="actions-list">
            <button onClick={() => go("compras")}>
              <span className="action-icon amber">
                <ReceiptText />
              </span>
              <span>
                <b>Revisar factura FAC-20260702</b>
                <small>Textiles del Valle · {money(458500)}</small>
              </span>
              <Badge tone="amber">Pendiente</Badge>
            </button>
            <button onClick={() => go("inventario")}>
              <span className="action-icon red">
                <Boxes />
              </span>
              <span>
                <b>Reponer productos agotados</b>
                <small>3 productos sin existencias</small>
              </span>
              <Badge tone="red">Urgente</Badge>
            </button>
            <button onClick={() => go("planilla")}>
              <span className="action-icon blue">
                <WalletCards />
              </span>
              <span>
                <b>Preparar planilla quincenal</b>
                <small>Pago programado para el 31 de julio</small>
              </span>
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}

function RealEmpty({ module, go }: { module: Module; go: (module: Module) => void }) {
  const labels: Record<Module, string> = { control: "Centro de Control", ventas: "Ventas", compras: "Compras", inventario: "Inventario", proveedores: "Proveedores", planilla: "Planilla", reportes: "Reportes" };
  return <section className="real-empty"><div className="real-empty-icon"><BarChart3/></div><span className="eyebrow">DATOS REALES · {labels[module].toUpperCase()}</span><h2>Aún no hay información disponible</h2><p>Comience cargando facturas o registrando datos para generar indicadores. SYNERA no mostrará datos ficticios dentro de este entorno.</p><button className="primary" onClick={() => go("compras")}><ReceiptText size={17}/> Analizar facturas</button></section>;
}

function Sales() {
  return (
    <>
      <div className="section-intro">
        <div>
          <h2>Rendimiento de ventas</h2>
          <p>Analiza resultados, metas y comparativos interanuales.</p>
        </div>
        <div className="segmented">
          <button className="active">Misma fecha</button>
          <button>Día comercial equivalente</button>
        </div>
      </div>
      <Filters extended />
      <div className="kpi-grid seven">
        <Kpi
          label="Ventas de hoy"
          value={money(185250)}
          detail="↑ 12.3%"
          icon={CircleDollarSign}
        />
        <Kpi
          label="Semana"
          value={compact(1_248_000)}
          detail="↑ 8.4%"
          icon={CalendarDays}
        />
        <Kpi
          label="Mes"
          value={compact(19_750_000)}
          detail="↑ 12.5%"
          icon={BarChart3}
        />
        <Kpi
          label="Año"
          value={compact(219_250_000)}
          detail="↑ 11.2%"
          icon={TrendingUp}
        />
        <Kpi
          label="Ticket promedio"
          value={money(18550)}
          detail="10 transacciones"
          icon={ReceiptText}
          tone="blue"
        />
        <Kpi
          label="Variación interanual"
          value="+12.3%"
          detail="+₡20.250"
          icon={TrendingUp}
        />
        <Kpi
          label="Cumplimiento"
          value="92%"
          detail="Meta ₡201.500"
          icon={Gauge}
          tone="amber"
        />
      </div>
      <Card className="comparison" title="Comparación diaria">
        <div className="compare-block">
          <span>21 JUL 2026</span>
          <strong>{money(185250)}</strong>
          <small>Periodo actual</small>
        </div>
        <div className="vs">VS</div>
        <div className="compare-block muted">
          <span>21 JUL 2025</span>
          <strong>{money(165000)}</strong>
          <small>Misma fecha</small>
        </div>
        <div className="delta">
          <TrendingUp />
          <span>
            <b>+{money(20250)}</b>
            <small>+12.3% interanual</small>
          </span>
        </div>
        <div className="meta-status">
          <span>Meta configurada</span>
          <b>{money(201500)}</b>
          <Badge tone="amber">Al 92%</Badge>
        </div>
      </Card>
      <div className="dashboard-grid">
        <Card title="Ventas actual vs. año anterior">
          <SalesChart />
        </Card>
        <Card title="Ventas por categoría">
          <ResponsiveContainer width="100%" height={310}>
            <PieChart>
              <Pie
                data={categories.map((n, i) => ({
                  n,
                  v: [32, 25, 18, 15, 10][i],
                }))}
                dataKey="v"
                nameKey="n"
                innerRadius={68}
                outerRadius={105}
                paddingAngle={3}
              >
                {categories.map((_, i) => (
                  <Cell key={i} fill={colors[i]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card
        title="Ventas diarias"
        action={
          <button className="secondary">
            <Download size={15} /> Exportar
          </button>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Sucursal</th>
                <th>Ventas</th>
                <th>Año anterior</th>
                <th>Variación</th>
                <th>Meta</th>
                <th>Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {dailySales.slice(0, 8).map((r) => (
                <tr key={r.fecha}>
                  <td>
                    {new Date(r.fecha + "T12:00").toLocaleDateString("es-CR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td>{r.sucursal}</td>
                  <td className="strong">{money(r.ventas)}</td>
                  <td>{money(r.anterior)}</td>
                  <td>
                    <span className="positive">
                      ↑ {((r.ventas / r.anterior - 1) * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td>{money(r.meta)}</td>
                  <td>
                    <div className="progress">
                      <i
                        style={{
                          width: `${Math.min(100, (r.ventas / r.meta) * 100)}%`,
                        }}
                      />
                    </div>
                    {Math.round((r.ventas / r.meta) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function Purchases({
  stocks,
  save,
  notify,
  mode,
  analyzedInvoices,
  saveInvoices,
}: {
  stocks: Record<string, number>;
  save: (x: Record<string, number>) => void;
  notify: (s: string) => void;
  mode: DataMode;
  analyzedInvoices: import("../lib/invoices/types").Invoice[];
  saveInvoices: (invoices: import("../lib/invoices/types").Invoice[]) => void;
}) {
  const [tab, setTab] = useState(mode === "real" ? "Analizar facturas" : "Facturas");
  const [flow, setFlow] = useState(false);
  const [step, setStep] = useState(0);
  const confirm = () => {
    save({ ...stocks, "TXT-001": (stocks["TXT-001"] ?? 42) + 100 });
    setStep(4);
    notify("Entrada confirmada: +100 Camisas Oxford");
  };
  return (
    <>
      {tab === "Analizar facturas" || mode === "real" ? (
        <>
          <div className="tabs">
            {(mode === "real" ? ["Analizar facturas"] : ["Resumen", "Facturas", "Analizar facturas", "Productos detectados", "Entradas pendientes", "Historial de compras"]).map((t) => (
              <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <InvoiceIntelligence key={mode} notify={notify} mode={mode} initialInvoices={analyzedInvoices} onInvoicesChange={saveInvoices} />
        </>
      ) : (
      <>
      <div className="section-intro">
        <div>
          <h2>Compras y facturas</h2>
          <p>
            Controla el ciclo completo desde la factura hasta la entrada a
            bodega.
          </p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setFlow(true);
            setStep(1);
          }}
        >
          <Upload size={17} /> Procesar factura
        </button>
      </div>
      <div className="tabs">
        {[ 
          "Resumen",
          "Facturas",
          "Analizar facturas",
          "Productos detectados",
          "Entradas pendientes",
          "Historial de compras",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="kpi-grid five">
        <Kpi
          label="Compras del mes"
          value={compact(12_480_000)}
          detail="↑ 6.8% vs. junio"
          icon={ShoppingCart}
        />
        <Kpi
          label="Facturas procesadas"
          value="48"
          detail="12 esta semana"
          icon={FileCheck2}
          tone="blue"
        />
        <Kpi
          label="Pendientes"
          value="2"
          detail="Requieren revisión"
          icon={ClipboardList}
          tone="amber"
        />
        <Kpi
          label="Con errores"
          value="1"
          detail="Datos incompletos"
          icon={AlertTriangle}
          tone="red"
        />
        <Kpi
          label="Mayor proveedor"
          value="₡4.4M"
          detail="Textiles del Valle"
          icon={Truck}
          tone="purple"
        />
      </div>
      <Card
        title="Facturas recientes"
        action={
          <div className="search">
            <Search size={15} />
            <input placeholder="Buscar factura..." />
          </div>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((x) => (
                <tr key={x.number}>
                  <td className="code">{x.number}</td>
                  <td>{x.date}</td>
                  <td className="strong">{x.supplier}</td>
                  <td>{x.products}</td>
                  <td>{money(x.total)}</td>
                  <td>
                    <Badge tone={statusTone(x.status)}>{x.status}</Badge>
                  </td>
                  <td>
                    <button className="dots">•••</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {flow && (
        <div className="modal-bg">
          <div className="modal wide">
            <button className="modal-x" onClick={() => setFlow(false)}>
              <X />
            </button>
            <span className="eyebrow">PROCESAMIENTO SIMULADO</span>
            <h2>Factura FAC-20260713</h2>
            <p>Textiles del Valle · 18 julio 2026</p>
            <div className="steps">
              {[
                "Factura cargada",
                "Productos detectados",
                "Revisión",
                "Entrada confirmada",
              ].map((s, i) => (
                <div
                  key={s}
                  className={
                    step > i ? "done" : step === i + 1 ? "current" : ""
                  }
                >
                  <span>{step > i ? <Check /> : i + 1}</span>
                  <small>{s}</small>
                </div>
              ))}
            </div>
            {step === 1 && (
              <div className="upload-ok">
                <FileCheck2 />
                <b>factura_textiles_julio.pdf</b>
                <span>Archivo cargado correctamente</span>
                <button className="primary" onClick={() => setStep(2)}>
                  Detectar productos
                </button>
              </div>
            )}
            {step >= 2 && step < 4 && (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Costo unitario</th>
                        <th>Total</th>
                        <th>Coincidencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>TXT-001</td>
                        <td>Camisa Oxford</td>
                        <td>
                          <input className="cell-input" defaultValue="100" />
                        </td>
                        <td>{money(12500)}</td>
                        <td>{money(1250000)}</td>
                        <td>
                          <Badge>98% coincidente</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td>TXT-002</td>
                        <td>Blusa Lino</td>
                        <td>
                          <input className="cell-input" defaultValue="50" />
                        </td>
                        <td>{money(10800)}</td>
                        <td>{money(540000)}</td>
                        <td>
                          <Badge>95% coincidente</Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="modal-actions">
                  <button className="secondary" onClick={() => setFlow(false)}>
                    Cancelar
                  </button>
                  {step === 2 ? (
                    <button className="primary" onClick={() => setStep(3)}>
                      Continuar a revisión
                    </button>
                  ) : (
                    <button className="primary" onClick={confirm}>
                      <PackageCheck size={17} /> Confirmar entrada a inventario
                    </button>
                  )}
                </div>
              </>
            )}
            {step === 4 && (
              <div className="success-state">
                <div>
                  <Check />
                </div>
                <h3>Entrada confirmada</h3>
                <p>
                  El inventario de Camisa Oxford ahora muestra{" "}
                  <b>{stocks["TXT-001"] ?? 142} unidades</b>.
                </p>
                <button className="primary" onClick={() => setFlow(false)}>
                  Finalizar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </>
      )}
    </>
  );
}

function Inventory({
  stocks,
  save,
  notify,
}: {
  stocks: Record<string, number>;
  save: (x: Record<string, number>) => void;
  notify: (s: string) => void;
}) {
  const [tab, setTab] = useState("Existencias actuales");
  const [adjust, setAdjust] = useState(false);
  const displayed = products.map((p) => ({
    ...p,
    stock: stocks[p.code] ?? p.stock,
  }));
  const value = displayed.reduce((a, p) => a + p.stock * p.cost, 0);
  return (
    <>
      <div className="section-intro">
        <div>
          <h2>Inventario</h2>
          <p>Visibilidad de existencias, movimientos y alertas por sucursal.</p>
        </div>
        <button className="primary" onClick={() => setAdjust(true)}>
          <Plus size={17} /> Registrar ajuste
        </button>
      </div>
      <div className="tabs">
        {[
          "Existencias actuales",
          "Movimientos",
          "Conteo físico",
          "Alertas",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="kpi-grid six">
        <Kpi
          label="Productos activos"
          value="20"
          detail="5 categorías"
          icon={Boxes}
        />
        <Kpi
          label="Stock bajo"
          value="5"
          detail="Requieren reposición"
          icon={AlertTriangle}
          tone="amber"
        />
        <Kpi
          label="Agotados"
          value="3"
          detail="Sin existencias"
          icon={TrendingDown}
          tone="red"
        />
        <Kpi
          label="Valor estimado"
          value={compact(value)}
          detail="A costo promedio"
          icon={CircleDollarSign}
          tone="blue"
        />
        <Kpi
          label="Entradas del mes"
          value="684"
          detail="+18% vs. junio"
          icon={PackageCheck}
        />
        <Kpi
          label="Salidas del mes"
          value="519"
          detail="Ventas y ajustes"
          icon={ShoppingBag}
          tone="purple"
        />
      </div>
      <Filters extended />
      {tab === "Movimientos" ? (
        <Card title="Historial de movimientos · Kardex">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Referencia</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Existencia</th>
                  <th>Proveedor</th>
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 15).map((m, i) => (
                  <tr key={i}>
                    <td>{m.date}</td>
                    <td className="strong">{m.product}</td>
                    <td>
                      <Badge tone={m.type === "Venta" ? "blue" : "green"}>
                        {m.type}
                      </Badge>
                    </td>
                    <td className="code">{m.ref}</td>
                    <td className="positive">{m.input || "—"}</td>
                    <td className="negative">{m.output || "—"}</td>
                    <td>{m.result}</td>
                    <td>{m.supplier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card title="Existencias actuales">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Sucursal</th>
                  <th>Stock</th>
                  <th>Mínimo</th>
                  <th>Costo</th>
                  <th>Valor total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((p, i) => {
                  const st =
                    p.stock === 0
                      ? "Agotado"
                      : p.stock < p.min
                        ? "Stock bajo"
                        : p.stock > 45
                          ? "Sobrestock"
                          : "Normal";
                  return (
                    <tr key={p.code}>
                      <td className="code">{p.code}</td>
                      <td className="strong">{p.name}</td>
                      <td>{p.category}</td>
                      <td>{branches[i % 3]}</td>
                      <td className="stock-num">{p.stock}</td>
                      <td>{p.min}</td>
                      <td>{money(p.cost)}</td>
                      <td>{money(p.stock * p.cost)}</td>
                      <td>
                        <Badge tone={statusTone(st)}>{st}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {adjust && (
        <div className="modal-bg">
          <div className="modal">
            <button className="modal-x" onClick={() => setAdjust(false)}>
              <X />
            </button>
            <h2>Registrar ajuste manual</h2>
            <p>Actualiza una existencia con trazabilidad.</p>
            <label>
              Producto
              <Select label="Producto">
                <option>Camisa Oxford (TXT-001)</option>
              </Select>
            </label>
            <div className="form-grid">
              <label>
                Tipo
                <Select label="Tipo">
                  <option>Entrada</option>
                  <option>Salida</option>
                </Select>
              </label>
              <label>
                Cantidad
                <input type="number" defaultValue="5" />
              </label>
            </div>
            <label>
              Observación
              <textarea defaultValue="Corrección por conteo físico" />
            </label>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setAdjust(false)}>
                Cancelar
              </button>
              <button
                className="primary"
                onClick={() => {
                  save({ ...stocks, "TXT-001": (stocks["TXT-001"] ?? 42) + 5 });
                  setAdjust(false);
                  notify("Ajuste registrado: +5 Camisa Oxford");
                }}
              >
                Guardar ajuste
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Suppliers() {
  const [selected, setSelected] = useState<string | null>(null);
  const supplier = suppliers.find((s) => s.name === selected);
  return (
    <>
      <div className="section-intro">
        <div>
          <h2>Proveedores</h2>
          <p>Compara compras, entregas y evolución de costos.</p>
        </div>
      </div>
      <Filters extended />
      <div className="kpi-grid four">
        <Kpi
          label="Proveedores activos"
          value="6"
          detail="Todos evaluados"
          icon={Truck}
        />
        <Kpi
          label="Total comprado"
          value={compact(14_300_000)}
          detail="Julio 2026"
          icon={CircleDollarSign}
          tone="blue"
        />
        <Kpi
          label="Entregas pendientes"
          value="4"
          detail="2 para esta semana"
          icon={ClipboardList}
          tone="amber"
        />
        <Kpi
          label="Variación promedio"
          value="+2.4%"
          detail="En costos de compra"
          icon={TrendingUp}
          tone="purple"
        />
      </div>
      <Card title="Directorio de proveedores">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Contacto</th>
                <th>Facturas</th>
                <th>Total comprado</th>
                <th>Suministra</th>
                <th>Última compra</th>
                <th>Variación</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr
                  key={String(s.name)}
                  onClick={() => setSelected(String(s.name))}
                  className="clickable"
                >
                  <td className="strong">{s.name}</td>
                  <td>{s.contact}</td>
                  <td>{s.invoices}</td>
                  <td>{money(Number(s.total))}</td>
                  <td>{s.supplied}</td>
                  <td>{s.last}</td>
                  <td
                    className={
                      String(s.variation).startsWith("+")
                        ? "negative"
                        : "positive"
                    }
                  >
                    {s.variation}
                  </td>
                  <td>
                    <Badge tone={statusTone(String(s.status))}>
                      {s.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="dashboard-grid">
        <Card title="Evolución del precio · Camisa Oxford">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={priceEvolution}>
              <CartesianGrid stroke="#eee" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} />
              <YAxis
                domain={[10000, 13000]}
                tickFormatter={(v) => `${v / 1000}k`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Legend />
              <Line
                dataKey="valle"
                name="Textiles del Valle"
                stroke="#176b64"
                strokeWidth={3}
              />
              <Line
                dataKey="central"
                name="Moda Central"
                stroke="#d59a42"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Distribución de compras">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={suppliers.map((s) => ({
                n: String(s.name).split(" ")[0],
                v: Number(s.total),
              }))}
            >
              <CartesianGrid stroke="#eee" vertical={false} />
              <XAxis dataKey="n" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Bar dataKey="v" fill="#176b64" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      {supplier && (
        <div className="drawer-bg" onClick={() => setSelected(null)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <button className="modal-x" onClick={() => setSelected(null)}>
              <X />
            </button>
            <span className="eyebrow">DETALLE DE PROVEEDOR</span>
            <h2>{supplier.name}</h2>
            <p>{supplier.contact} · Activo desde 2021</p>
            <div className="detail-grid">
              <div>
                <span>Total comprado</span>
                <b>{money(Number(supplier.total))}</b>
              </div>
              <div>
                <span>Facturas</span>
                <b>{supplier.invoices}</b>
              </div>
              <div>
                <span>Última compra</span>
                <b>{supplier.last}</b>
              </div>
              <div>
                <span>Entregas pendientes</span>
                <b>2</b>
              </div>
            </div>
            <h3>Productos principales</h3>
            {products
              .filter((p) => p.supplier === supplier.name)
              .map((p) => (
                <div className="product-row" key={p.code}>
                  <span>
                    {p.name}
                    <small>{p.code}</small>
                  </span>
                  <b>{money(p.cost)}</b>
                </div>
              ))}
            <h3>Historial reciente</h3>
            {invoices
              .filter((i) => i.supplier === supplier.name)
              .map((i) => (
                <div className="product-row" key={i.number}>
                  <span>
                    {i.number}
                    <small>{i.date}</small>
                  </span>
                  <b>{money(i.total)}</b>
                </div>
              ))}
          </aside>
        </div>
      )}
    </>
  );
}

function Payroll({ notify }: { notify: (s: string) => void }) {
  const [generated, setGenerated] = useState(false);
  return (
    <>
      <div className="section-intro">
        <div>
          <h2>Planilla administrativa</h2>
          <p>Organiza colaboradores, periodos y estimaciones de pago.</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setGenerated(true);
            notify("Planilla demo generada correctamente");
          }}
        >
          <WalletCards size={17} /> Generar planilla
        </button>
      </div>
      <div className="warning">
        <AlertTriangle size={18} /> Los cálculos de esta demo son
        administrativos y no sustituyen validación contable o legal.
      </div>
      <div className="tabs">
        <button className="active">Resumen de planilla</button>
        <button>Personal</button>
        <button>Periodos de pago</button>
      </div>
      <div className="kpi-grid six">
        <Kpi
          label="Colaboradores"
          value="15"
          detail="14 activos"
          icon={Users}
        />
        <Kpi
          label="Planilla estimada"
          value={compact(9_875_000)}
          detail="II quincena julio"
          icon={WalletCards}
          tone="blue"
        />
        <Kpi
          label="Próximo pago"
          value="31 jul"
          detail="Faltan 13 días"
          icon={CalendarDays}
          tone="amber"
        />
        <Kpi
          label="Horas extra"
          value="42.5 h"
          detail={money(148750)}
          icon={TrendingUp}
        />
        <Kpi
          label="Bonificaciones"
          value={money(325000)}
          detail="8 colaboradores"
          icon={Sparkles}
          tone="purple"
        />
        <Kpi
          label="Rebajos"
          value={money(218500)}
          detail="Adelantos y otros"
          icon={TrendingDown}
          tone="red"
        />
      </div>
      {generated && (
        <Card
          className="generated"
          title="Planilla generada · II quincena de julio"
        >
          <div className="success-inline">
            <Check />
            <span>
              <b>Cálculo administrativo completado</b>15 colaboradores · Total
              neto estimado {money(4_812_450)}
            </span>
            <Badge>Lista para revisión</Badge>
          </div>
        </Card>
      )}
      <Card title="Resumen del periodo">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Salario base</th>
                <th>Horas extra</th>
                <th>Bonos</th>
                <th>Rebajos</th>
                <th>Adelantos</th>
                <th>Total bruto</th>
                <th>Total neto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e, i) => {
                const extra = (i % 4) * 12500,
                  bonus = i % 3 === 0 ? 35000 : 0,
                  discount = (i % 5) * 4500,
                  advance = i % 6 === 0 ? 25000 : 0,
                  gross = e.salary / 2 + extra + bonus,
                  net = gross - discount - advance;
                return (
                  <tr key={e.name}>
                    <td className="strong">
                      {e.name}
                      <small className="sub">
                        {e.role} · {e.branch}
                      </small>
                    </td>
                    <td>{money(e.salary / 2)}</td>
                    <td>{money(extra)}</td>
                    <td>{money(bonus)}</td>
                    <td>{money(discount)}</td>
                    <td>{money(advance)}</td>
                    <td>{money(gross)}</td>
                    <td className="strong">{money(net)}</td>
                    <td>
                      <Badge tone={generated ? "green" : "amber"}>
                        {generated ? "Calculada" : "Borrador"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function Reports({ notify }: { notify: (s: string) => void }) {
  const exportFile = (type: string) => {
    const csv =
      "Métrica,Valor\nVentas 2026,219250000\nCompras julio,12480000\nInventario,8650000\nPlanilla,9875000";
    const b = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `synera-reporte.${type === "Excel" ? "csv" : "txt"}`;
    a.click();
    notify(`Reporte ${type} exportado`);
  };
  return (
    <>
      <div className="section-intro">
        <div>
          <h2>Reportes ejecutivos</h2>
          <p>Una vista consolidada para tomar mejores decisiones.</p>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={() => exportFile("Excel")}>
            <FileSpreadsheet size={17} /> Exportar Excel
          </button>
          <button className="primary" onClick={() => exportFile("PDF")}>
            <Download size={17} /> Exportar PDF
          </button>
        </div>
      </div>
      <Filters extended />
      <div className="kpi-grid six">
        <Kpi
          label="Crecimiento interanual"
          value="+12.5%"
          detail="Ventas acumuladas"
          icon={TrendingUp}
        />
        <Kpi
          label="Meta alcanzada"
          value="96.8%"
          detail="Promedio del periodo"
          icon={Gauge}
          tone="amber"
        />
        <Kpi
          label="Proveedor principal"
          value="Textiles del Valle"
          detail="₡4.4M comprados"
          icon={Truck}
          tone="blue"
        />
        <Kpi
          label="Producto más vendido"
          value="Camisa Oxford"
          detail="385 unidades"
          icon={ShoppingBag}
        />
        <Kpi
          label="Menor rotación"
          value="Canasta Fibra"
          detail="8 unidades"
          icon={TrendingDown}
          tone="purple"
        />
        <Kpi
          label="Total de compras"
          value={compact(12_480_000)}
          detail="Julio 2026"
          icon={CircleDollarSign}
          tone="blue"
        />
      </div>
      <div className="dashboard-grid">
        <Card title="Ventas actuales vs. año anterior">
          <SalesChart />
        </Card>
        <Card title="Compras por proveedor">
          <ResponsiveContainer width="100%" height={310}>
            <BarChart
              data={suppliers.map((s) => ({
                n: String(s.name).split(" ")[0],
                v: Number(s.total),
              }))}
            >
              <CartesianGrid stroke="#eee" vertical={false} />
              <XAxis dataKey="n" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Bar dataKey="v" fill="#176b64" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Inventario por categoría">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categories.map((n, i) => ({
                  n,
                  v: [29, 24, 18, 17, 12][i],
                }))}
                dataKey="v"
                nameKey="n"
                innerRadius={55}
                outerRadius={92}
              >
                {categories.map((_, i) => (
                  <Cell key={i} fill={colors[i]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Costo de planilla por sucursal">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={[
                { n: "San José", v: 4.1 },
                { n: "Escazú", v: 3.2 },
                { n: "Heredia", v: 2.6 },
              ]}
            >
              <CartesianGrid stroke="#eee" vertical={false} />
              <XAxis dataKey="n" axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `₡${v}M`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip />
              <Bar dataKey="v" fill="#5d7cba" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

function Tour({ close, go }: { close: () => void; go: (m: Module) => void }) {
  return (
    <div className="modal-bg">
      <div className="modal tour">
        <button className="modal-x" onClick={close}>
          <X />
        </button>
        <div className="tour-icon">
          <Sparkles />
        </div>
        <span className="eyebrow">RECORRIDO DEMO · 9 PASOS</span>
        <h2>Descubre cómo SYNERA conecta tu operación</h2>
        <p>
          En menos de cinco minutos recorrerás ventas, compras, inventario,
          proveedores, planilla y reportes con una historia guiada.
        </p>
        <ol>
          <li className="active">
            <b>1</b>
            <span>
              Revisa el pulso del negocio
              <small>Ventas, metas y alertas del día</small>
            </span>
          </li>
          <li>
            <b>2</b>
            <span>
              Compara las ventas<small>Periodo actual vs. año anterior</small>
            </span>
          </li>
          <li>
            <b>3</b>
            <span>
              Procesa una factura
              <small>Confirma una entrada al inventario</small>
            </span>
          </li>
        </ol>
        <div className="modal-actions">
          <button className="secondary" onClick={close}>
            Ahora no
          </button>
          <button className="primary" onClick={() => go("ventas")}>
            Comenzar recorrido <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
