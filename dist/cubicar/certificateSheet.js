"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CubicageCertificateSheet = exports.CERTIFICATE_CSS = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const hopperFigure_1 = require("./hopperFigure");
/**
 * The cubicage certificate on A4, in the language of chancadora's sheets (José, 14/11/2026): the
 * company header with its legal name and RUC, a title band, the unit card, the hopper drawn with its
 * own measures, dark-headed tables, the certified volume set apart and a mono footer. Paper is always
 * light: it prints. The same sheet is the screen and, through `/print`, the PDF. The accent is the
 * issuer's brand color when it has one, never a color of the code.
 * Shared by Portal and Inframaq: the logo is the issuer's, and `measuredBy` names another company
 * that measured the truck.
 */
const LIMA = 'America/Lima';
const day = (iso) => new Date(iso).toLocaleDateString('es-PE', { timeZone: LIMA, day: '2-digit', month: '2-digit', year: 'numeric' });
const time = (iso) => new Date(iso).toLocaleTimeString('es-PE', { timeZone: LIMA, hour: '2-digit', minute: '2-digit', hour12: false });
const m3 = (value) => `${value.toFixed(2)} m³`;
const CERTIFICATE_CSS = (paged) => `
  .cert { --ink: #0f172a; --muted: #64748b; --line: #e2e8f0; --soft: #f8fafc; --accent: var(--cert-accent, var(--ink)); font-family: Inter, system-ui, sans-serif; color: var(--ink); background: #fff; font-size: 10.5px; line-height: 1.4; }
  .cert.screen { max-width: 210mm; margin: 0 auto; padding: 12mm; box-shadow: 0 1px 3px rgba(15,23,42,.12); border: 1px solid var(--line); border-radius: 6px; }
  .cert .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  .cert .muted { color: var(--muted); }
  .cert .head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; border-bottom: 2px solid var(--ink); padding-bottom: 10px; }
  .cert .brand { display: flex; gap: 12px; align-items: center; }
  .cert .brand img { height: 46px; width: auto; max-width: 120px; object-fit: contain; }
  .cert .brand .name { font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: -.01em; }
  .cert .brand .line { font-size: 10.5px; }
  .cert .brand .tagline { font-size: 9.5px; color: var(--muted); }
  .cert .doc { text-align: right; }
  .cert .chip { display: inline-block; border: 1px solid var(--accent); color: var(--accent); border-radius: 5px; padding: 2px 8px; font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
  .cert .number { font-size: 19px; font-weight: 800; margin-top: 4px; }
  .cert .band { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; border-bottom: 2px solid var(--ink); padding: 9px 0 6px; }
  .cert .band h1 { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; margin: 0; }
  .cert .facts { display: grid; grid-template-columns: 1fr 1fr; column-gap: 22px; border: 1px solid var(--line); background: var(--soft); border-radius: 6px; padding: 6px 12px; margin-top: 10px; }
  .cert .fact { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; border-bottom: 1px solid var(--line); padding: 4px 0; }
  .cert .fact:nth-last-child(-n+2) { border-bottom: 0; }
  .cert .fact .value { font-weight: 600; text-align: right; }
  .cert .plate { font-size: 15px; font-weight: 800; }
  .cert .tag { background: color-mix(in srgb, var(--accent) 14%, #fff); color: var(--accent); border-radius: 4px; padding: 1px 7px; font-size: 10px; font-weight: 700; }
  .cert .panel { border: 1px solid var(--line); border-radius: 6px; padding: 8px 12px 6px; margin-top: 10px; break-inside: avoid; }
  .cert .title { font-size: 10.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; margin: 9px 0 4px; }
  .cert .panel .title { margin-top: 0; }
  .cert .hopper-figure { display: block; width: 100%; height: auto; max-height: 46mm; }
  .cert .hopper-figure .hopper { fill: color-mix(in srgb, var(--accent) 10%, #fff); stroke: var(--ink); stroke-width: 1.6; }
  .cert .hopper-figure .guide { stroke: var(--muted); stroke-width: .8; stroke-dasharray: 3 3; }
  .cert .hopper-figure .dim path { stroke: var(--muted); stroke-width: .9; fill: none; }
  .cert .hopper-figure .dim text { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 9.5px; font-weight: 700; fill: var(--ink); }
  .cert .hopper-figure .view-title { font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; fill: var(--muted); }
  .cert table { width: 100%; border-collapse: collapse; }
  .cert th { background: var(--ink); color: #fff; font-size: 9.5px; font-weight: 600; text-align: left; padding: 4px 8px; }
  .cert td { padding: 3.5px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
  .cert .num { text-align: right; white-space: nowrap; }
  .cert tr.deduced td { color: var(--muted); font-style: italic; }
  .cert tr.total td { border-top: 2px solid var(--ink); border-bottom: 0; font-weight: 800; }
  .cert .split { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 12px; align-items: stretch; margin-top: 9px; }
  .cert .split .title { margin-top: 0; }
  .cert .verdict { border: 2px dashed var(--accent); border-radius: 8px; background: color-mix(in srgb, var(--accent) 6%, #fff); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 10px; }
  .cert .verdict .kicker { font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
  .cert .verdict .big { font-size: 30px; font-weight: 800; color: var(--accent); line-height: 1.1; margin: 4px 0; }
  .cert .from-top { font-weight: 800; color: var(--accent); }
  .cert .note { margin-top: 4px; font-size: 9.5px; color: var(--muted); }
  .cert .foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-top: 16px; break-inside: avoid; }
  .cert .sign { border-top: 1px solid var(--ink); padding-top: 4px; min-width: 60mm; }
  .cert .meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; border-top: 1px solid var(--line); margin-top: 10px; padding-top: 5px; font-size: 8.5px; color: var(--muted); }
  @media (max-width: 640px) { .cert.screen { padding: 14px; } .cert .head { flex-direction: column; } .cert .doc { text-align: left; } .cert .facts, .cert .split { grid-template-columns: 1fr; } .cert .fact:nth-last-child(2) { border-bottom: 1px solid var(--line); } }
  @page { size: A4; margin: ${paged ? '12mm' : '0'}; }
  @media print { .cert.screen { box-shadow: none; border: 0; border-radius: 0; padding: 0; max-width: none; } .no-print { display: none !important; } }
`;
exports.CERTIFICATE_CSS = CERTIFICATE_CSS;
const identityLine = (issuer) => [issuer.taxId ? `RUC ${issuer.taxId}` : '', issuer.address].filter(Boolean).join(' · ');
const Header = ({ view }) => ((0, jsx_runtime_1.jsxs)("header", { className: "head", children: [(0, jsx_runtime_1.jsxs)("div", { className: "brand", children: [view.issuer.logoUrl ? (0, jsx_runtime_1.jsx)("img", { src: view.issuer.logoUrl, alt: view.issuer.name }) : null, (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "name", children: view.issuer.name }), identityLine(view.issuer) ? (0, jsx_runtime_1.jsx)("div", { className: "line", children: identityLine(view.issuer) }) : null, (0, jsx_runtime_1.jsx)("div", { className: "tagline", children: "Cubicaci\u00F3n de volquetes" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "doc", children: [(0, jsx_runtime_1.jsx)("span", { className: "chip", children: "Certificado de cubicaje" }), (0, jsx_runtime_1.jsxs)("div", { className: "number mono", children: ["N.\u00BA ", view.number] }), (0, jsx_runtime_1.jsxs)("div", { children: ["Cubicado: ", (0, jsx_runtime_1.jsx)("strong", { children: day(view.measuredAt) }), " \u00B7 ", time(view.measuredAt)] })] })] }));
const Fact = ({ label, children }) => ((0, jsx_runtime_1.jsxs)("div", { className: "fact", children: [(0, jsx_runtime_1.jsxs)("span", { className: "muted", children: [label, ":"] }), (0, jsx_runtime_1.jsx)("span", { className: "value", children: children })] }));
const Facts = ({ view }) => ((0, jsx_runtime_1.jsxs)("section", { className: "facts", children: [(0, jsx_runtime_1.jsx)(Fact, { label: "Placa", children: (0, jsx_runtime_1.jsx)("span", { className: "plate mono", children: view.plate }) }), (0, jsx_runtime_1.jsx)(Fact, { label: "Forma de tolva", children: (0, jsx_runtime_1.jsx)("span", { className: "tag", children: view.shapeLabel }) }), (0, jsx_runtime_1.jsx)(Fact, { label: "Responsable del cubicaje", children: view.cubicator }), (0, jsx_runtime_1.jsx)(Fact, { label: "Cubicaje anterior", children: (0, jsx_runtime_1.jsx)("span", { className: "mono", children: view.previous ? `${m3(view.previous.m3)}${view.previous.at ? ` · ${day(view.previous.at)}` : ''}` : 'Primer cubicaje' }) })] }));
const Figure = ({ view }) => ((0, jsx_runtime_1.jsxs)("section", { className: "panel", children: [(0, jsx_runtime_1.jsx)("p", { className: "title", children: "Geometr\u00EDa y cotas de la tolva" }), (0, jsx_runtime_1.jsx)(hopperFigure_1.HopperFigure, { shape: view.shape, measures: view.figure, title: `Tolva ${view.shapeLabel.toLowerCase()} de ${view.plate} con sus cotas` })] }));
const Measures = ({ view }) => ((0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("p", { className: "title", children: "Medidas de la tolva" }), (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Cota" }), (0, jsx_runtime_1.jsx)("th", { children: "Descripci\u00F3n" }), (0, jsx_runtime_1.jsx)("th", { className: "num", children: "Medida" }), (0, jsx_runtime_1.jsx)("th", { children: "Origen" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: view.measures.map((measure) => ((0, jsx_runtime_1.jsxs)("tr", { className: measure.formula ? 'deduced' : undefined, children: [(0, jsx_runtime_1.jsx)("td", { className: "mono", children: (0, jsx_runtime_1.jsx)("strong", { children: measure.code }) }), (0, jsx_runtime_1.jsx)("td", { children: measure.label }), (0, jsx_runtime_1.jsx)("td", { className: "num mono", children: `${measure.meters.toFixed(2)} m` }), (0, jsx_runtime_1.jsx)("td", { children: measure.formula ? (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: ["Deducida ", (0, jsx_runtime_1.jsx)("span", { className: "mono", children: measure.formula })] }) : 'Medida con cinta' })] }, measure.code))) })] })] }));
const Volume = ({ view }) => ((0, jsx_runtime_1.jsxs)("section", { className: "split", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "title", children: "C\u00E1lculo del volumen" }), (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Parte" }), (0, jsx_runtime_1.jsx)("th", { children: "F\u00F3rmula" }), (0, jsx_runtime_1.jsx)("th", { className: "num", children: "Volumen" })] }) }), (0, jsx_runtime_1.jsxs)("tbody", { children: [view.parts.map((part) => ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: part.label }), (0, jsx_runtime_1.jsx)("td", { className: "mono muted", children: part.formula }), (0, jsx_runtime_1.jsx)("td", { className: "num mono", children: m3(part.m3) })] }, part.label))), (0, jsx_runtime_1.jsxs)("tr", { className: "total", children: [(0, jsx_runtime_1.jsx)("td", { colSpan: 2, children: "Volumen de la tolva" }), (0, jsx_runtime_1.jsx)("td", { className: "num mono", children: m3(view.m3) })] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "verdict", children: [(0, jsx_runtime_1.jsx)("span", { className: "kicker", children: "Volumen certificado" }), (0, jsx_runtime_1.jsx)("span", { className: "big mono", children: m3(view.m3) }), (0, jsx_runtime_1.jsx)("span", { className: "muted", children: "Capacidad de la tolva al ras" })] })] }));
const Dispatch = ({ view }) => ((0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("p", { className: "title", children: "Tabla de alturas de despacho" }), (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Volumen a despachar" }), (0, jsx_runtime_1.jsx)("th", { className: "num", children: "Altura de carga" }), (0, jsx_runtime_1.jsx)("th", { className: "num", children: "Medir desde el borde" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: view.dispatch.map((row) => ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { className: "mono", children: `${row.m3} m³` }), (0, jsx_runtime_1.jsx)("td", { className: "num mono", children: `${row.loadCm} cm` }), (0, jsx_runtime_1.jsx)("td", { className: "num mono from-top", children: `${row.fromTopCm} cm` })] }, row.m3))) })] }), (0, jsx_runtime_1.jsx)("p", { className: "note", children: "Se mide desde el borde superior de la tolva hacia abajo." })] }));
const Footer = ({ view }) => ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "foot", children: [(0, jsx_runtime_1.jsxs)("div", { className: "sign", children: [(0, jsx_runtime_1.jsx)("strong", { children: view.cubicator }), (0, jsx_runtime_1.jsx)("div", { className: "muted", children: "Responsable del cubicaje" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "doc muted", children: [view.measuredBy ? (0, jsx_runtime_1.jsx)("div", { children: `Medido por ${view.measuredBy.companyName} el ${day(view.measuredAt)}` }) : null, view.previous ? (0, jsx_runtime_1.jsx)("div", { children: `Reemplaza al cubicaje anterior de la unidad ${view.plate}` }) : null] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "meta mono", children: [(0, jsx_runtime_1.jsx)("span", { children: "Generado desde el cubicaje registrado" }), (0, jsx_runtime_1.jsx)("span", { children: `${view.number} · Página 1 / 1` })] })] }));
const CubicageCertificateSheet = ({ view, screen = false }) => ((0, jsx_runtime_1.jsxs)("article", { className: `cert${screen ? ' screen' : ''}`, style: view.issuer.accent ? { '--cert-accent': view.issuer.accent } : undefined, children: [(0, jsx_runtime_1.jsx)(Header, { view: view }), (0, jsx_runtime_1.jsxs)("div", { className: "band", children: [(0, jsx_runtime_1.jsx)("h1", { children: "Cubicaci\u00F3n de tolva de volquete" }), (0, jsx_runtime_1.jsx)("span", { className: "muted", children: "Volumen geom\u00E9trico medido con cinta y alturas de carga para despachar" })] }), (0, jsx_runtime_1.jsx)(Facts, { view: view }), (0, jsx_runtime_1.jsx)(Figure, { view: view }), (0, jsx_runtime_1.jsx)(Measures, { view: view }), (0, jsx_runtime_1.jsx)(Volume, { view: view }), view.dispatch.length > 0 ? (0, jsx_runtime_1.jsx)(Dispatch, { view: view }) : null, (0, jsx_runtime_1.jsx)(Footer, { view: view })] }));
exports.CubicageCertificateSheet = CubicageCertificateSheet;
