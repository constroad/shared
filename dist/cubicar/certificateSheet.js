"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CubicageCertificateSheet = exports.CERTIFICATE_CSS = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * The cubicage certificate on A4 (Stitch `p02-certificado-cubicaje`, approved by José 13/11/2026).
 * Paper is always light: it prints. The same sheet is the screen and, through `/print`, the PDF.
 * Shared by Portal and Inframaq (José, 14/11/2026): the logo is the issuer's, and `measuredBy`
 * names another company that measured the truck.
 * Left out of the design on purpose: the carrier (the fleet has no such field), «Sede», the RUC,
 * «Unidad conformada» and «verificadas en balanza» (Stitch made them up).
 */
const LIMA = 'America/Lima';
const day = (iso) => new Date(iso).toLocaleDateString('es-PE', { timeZone: LIMA, day: '2-digit', month: '2-digit', year: 'numeric' });
const time = (iso) => new Date(iso).toLocaleTimeString('es-PE', { timeZone: LIMA, hour: '2-digit', minute: '2-digit', hour12: false });
const m3 = (value) => `${value.toFixed(2)} m³`;
const CERTIFICATE_CSS = (paged) => `
  .cert { font-family: Inter, system-ui, sans-serif; color: #111827; background: #fff; font-size: 11px; line-height: 1.4; }
  .cert.screen { max-width: 210mm; margin: 0 auto; padding: 14mm; box-shadow: 0 1px 3px rgba(17,24,39,.12); border: 1px solid #e5e7eb; }
  .cert .mono, .cert .num { font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  .cert .kicker { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #6b7280; }
  .cert .head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
  .cert .brand { display: flex; gap: 12px; align-items: center; }
  .cert .brand img { height: 44px; width: auto; }
  .cert .brand .name { font-size: 16px; font-weight: 800; }
  .cert .muted { color: #6b7280; }
  .cert .right { text-align: right; }
  .cert .number { font-size: 20px; font-weight: 800; margin-top: 2px; }
  .cert .rule { border: 0; border-top: 3px solid #111827; margin: 10px 0 10px; }
  .cert table { width: 100%; border-collapse: collapse; }
  .cert td, .cert th { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
  .cert th { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #6b7280; background: #f9fafb; }
  .cert .box { border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
  .cert .section { display: flex; justify-content: space-between; align-items: baseline; margin: 12px 0 5px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }
  .cert .section h2 { font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; margin: 0; }
  .cert .facts { display: grid; grid-template-columns: 1fr 1fr; }
  .cert .facts > div { display: flex; justify-content: space-between; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
  .cert .facts > div:nth-child(odd) { border-right: 1px solid #e5e7eb; }
  .cert .plate { font-size: 16px; font-weight: 800; }
  .cert .measures { display: grid; grid-template-columns: minmax(0, 42fr) minmax(0, 58fr); gap: 10px; }
  .cert .figure { display: flex; align-items: center; justify-content: center; padding: 10px; }
  .cert .figure img { max-width: 100%; max-height: 190px; }
  .cert .deduced td { color: #6b7280; font-style: italic; background: #fafafa; }
  .cert .num { text-align: right; white-space: nowrap; }
  .cert .total td { border-top: 2px solid #111827; border-bottom: 0; font-weight: 800; }
  .cert .total .big { font-size: 22px; }
  .cert .foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-top: 26px; break-inside: avoid; }
  .cert .sign { border-top: 1px solid #111827; padding-top: 4px; min-width: 60mm; }
  @media (max-width: 640px) { .cert.screen { padding: 16px; } .cert .measures, .cert .facts { grid-template-columns: 1fr; } .cert .facts > div:nth-child(odd) { border-right: 0; } .cert .head { flex-direction: column; } .cert .right { text-align: left; } }
  @page { size: A4; margin: ${paged ? '14mm' : '0'}; }
  @media print { .cert.screen { box-shadow: none; border: 0; padding: 0; max-width: none; } .no-print { display: none !important; } }
`;
exports.CERTIFICATE_CSS = CERTIFICATE_CSS;
const Header = ({ view }) => ((0, jsx_runtime_1.jsxs)("div", { className: "head", children: [(0, jsx_runtime_1.jsxs)("div", { className: "brand", children: [view.issuer.logoUrl ? (0, jsx_runtime_1.jsx)("img", { src: view.issuer.logoUrl, alt: view.issuer.name }) : null, (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "name", children: view.issuer.name }), view.issuer.address ? (0, jsx_runtime_1.jsx)("div", { className: "muted", children: view.issuer.address }) : null] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "right", children: [(0, jsx_runtime_1.jsx)("div", { className: "kicker", children: "Certificado de cubicaje" }), (0, jsx_runtime_1.jsxs)("div", { className: "number mono", children: ["N.\u00B0 ", view.number] }), (0, jsx_runtime_1.jsx)("div", { className: "muted mono", children: `Cubicado el ${day(view.measuredAt)} · ${time(view.measuredAt)}` })] })] }));
const Facts = ({ view }) => ((0, jsx_runtime_1.jsxs)("div", { className: "box", children: [(0, jsx_runtime_1.jsx)("div", { style: { padding: '7px 10px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }, className: "kicker", children: "Ficha de la unidad" }), (0, jsx_runtime_1.jsxs)("div", { className: "facts", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "muted", children: "Placa" }), (0, jsx_runtime_1.jsx)("span", { className: "plate mono", children: view.plate })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "muted", children: "Responsable del cubicaje" }), (0, jsx_runtime_1.jsx)("strong", { children: view.cubicator })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "muted", children: "Forma de tolva" }), (0, jsx_runtime_1.jsx)("strong", { children: view.shapeLabel })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "muted", children: "Cubicaje anterior" }), (0, jsx_runtime_1.jsx)("span", { className: "mono", children: view.previous ? `${m3(view.previous.m3)}${view.previous.at ? ` el ${day(view.previous.at)}` : ''}` : 'Primer cubicaje' })] })] })] }));
const Measures = ({ view }) => ((0, jsx_runtime_1.jsxs)("div", { className: "measures", children: [(0, jsx_runtime_1.jsx)("div", { className: "box figure", children: (0, jsx_runtime_1.jsx)("img", { src: view.figureUrl, alt: `Sección de tolva ${view.shapeLabel.toLowerCase()} con sus cotas` }) }), (0, jsx_runtime_1.jsx)("div", { className: "box", children: (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Cota" }), (0, jsx_runtime_1.jsx)("th", { children: "Descripci\u00F3n" }), (0, jsx_runtime_1.jsx)("th", { className: "num", children: "Medida" }), (0, jsx_runtime_1.jsx)("th", { children: "Origen" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: view.measures.map((measure) => ((0, jsx_runtime_1.jsxs)("tr", { className: measure.formula ? 'deduced' : undefined, children: [(0, jsx_runtime_1.jsx)("td", { className: "mono", children: (0, jsx_runtime_1.jsx)("strong", { children: measure.code }) }), (0, jsx_runtime_1.jsx)("td", { children: measure.label }), (0, jsx_runtime_1.jsx)("td", { className: "num", children: `${measure.meters.toFixed(2)} m` }), (0, jsx_runtime_1.jsx)("td", { children: measure.formula ? (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: ["Deducida ", (0, jsx_runtime_1.jsx)("span", { className: "mono", children: measure.formula })] }) : 'Medida' })] }, measure.code))) })] }) })] }));
const Volume = ({ view }) => ((0, jsx_runtime_1.jsx)("div", { className: "box", children: (0, jsx_runtime_1.jsx)("table", { children: (0, jsx_runtime_1.jsxs)("tbody", { children: [view.parts.map((part) => ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: part.label }), (0, jsx_runtime_1.jsx)("td", { className: "mono muted", children: part.formula }), (0, jsx_runtime_1.jsx)("td", { className: "num", children: m3(part.m3) })] }, part.label))), (0, jsx_runtime_1.jsxs)("tr", { className: "total", children: [(0, jsx_runtime_1.jsx)("td", { colSpan: 2, children: "Volumen de la tolva" }), (0, jsx_runtime_1.jsx)("td", { className: "num big", children: m3(view.m3) })] })] }) }) }));
const Dispatch = ({ view }) => ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "box", children: (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "m\u00B3 a despachar" }), (0, jsx_runtime_1.jsx)("th", { className: "num", children: "Altura de carga" }), (0, jsx_runtime_1.jsx)("th", { className: "num", children: "Desde arriba (borde de la tolva)" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: view.dispatch.map((row) => ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { className: "mono", children: `${row.m3} m³` }), (0, jsx_runtime_1.jsx)("td", { className: "num", children: `${row.loadCm} cm` }), (0, jsx_runtime_1.jsx)("td", { className: "num", children: (0, jsx_runtime_1.jsx)("strong", { children: `${row.fromTopCm} cm` }) })] }, row.m3))) })] }) }), (0, jsx_runtime_1.jsx)("p", { className: "muted", style: { marginTop: 6 }, children: "Medir desde el borde superior de la tolva hacia abajo." })] }));
const CubicageCertificateSheet = ({ view, screen = false }) => ((0, jsx_runtime_1.jsxs)("article", { className: `cert${screen ? ' screen' : ''}`, children: [(0, jsx_runtime_1.jsx)(Header, { view: view }), (0, jsx_runtime_1.jsx)("hr", { className: "rule" }), (0, jsx_runtime_1.jsx)(Facts, { view: view }), (0, jsx_runtime_1.jsx)("div", { className: "section", children: (0, jsx_runtime_1.jsx)("h2", { children: "Medidas de la tolva (metros)" }) }), (0, jsx_runtime_1.jsx)(Measures, { view: view }), (0, jsx_runtime_1.jsx)("div", { className: "section", children: (0, jsx_runtime_1.jsx)("h2", { children: "C\u00E1lculo del volumen" }) }), (0, jsx_runtime_1.jsx)(Volume, { view: view }), view.dispatch.length > 0 ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "section", children: (0, jsx_runtime_1.jsx)("h2", { children: "Tabla de alturas de despacho" }) }), (0, jsx_runtime_1.jsx)(Dispatch, { view: view })] })) : null, (0, jsx_runtime_1.jsxs)("div", { className: "foot", children: [(0, jsx_runtime_1.jsxs)("div", { className: "sign", children: [(0, jsx_runtime_1.jsx)("strong", { children: view.cubicator }), (0, jsx_runtime_1.jsx)("div", { className: "muted", children: "Responsable del cubicaje" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "right muted", children: [view.measuredBy ? (0, jsx_runtime_1.jsx)("div", { children: `Medido por ${view.measuredBy.companyName} el ${day(view.measuredAt)}` }) : null, view.previous ? (0, jsx_runtime_1.jsx)("div", { children: `Este certificado reemplaza al cubicaje anterior de la unidad ${view.plate}` }) : null, (0, jsx_runtime_1.jsx)("div", { className: "mono", children: `${view.number} · Página 1 / 1` })] })] })] }));
exports.CubicageCertificateSheet = CubicageCertificateSheet;
