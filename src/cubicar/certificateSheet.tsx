import type { CubicageCertificateView } from '../flota/certificate';

/**
 * The cubicage certificate on A4 (Stitch `p02-certificado-cubicaje`, approved by José 13/11/2026).
 * Paper is always light: it prints. The same sheet is the screen and, through `/print`, the PDF.
 * Shared by Portal and Inframaq (José, 14/11/2026): the logo is the issuer's, and `measuredBy`
 * names another company that measured the truck.
 * Left out of the design on purpose: the carrier (the fleet has no such field), «Sede», the RUC,
 * «Unidad conformada» and «verificadas en balanza» (Stitch made them up).
 */

const LIMA = 'America/Lima';

const day = (iso: string): string => new Date(iso).toLocaleDateString('es-PE', { timeZone: LIMA, day: '2-digit', month: '2-digit', year: 'numeric' });
const time = (iso: string): string => new Date(iso).toLocaleTimeString('es-PE', { timeZone: LIMA, hour: '2-digit', minute: '2-digit', hour12: false });
const m3 = (value: number): string => `${value.toFixed(2)} m³`;

export const CERTIFICATE_CSS = (paged: boolean) => `
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

const Header = ({ view }: { view: CubicageCertificateView }) => (
  <div className="head">
    <div className="brand">
      {view.issuer.logoUrl ? <img src={view.issuer.logoUrl} alt={view.issuer.name} /> : null}
      <div>
        <div className="name">{view.issuer.name}</div>
        {view.issuer.address ? <div className="muted">{view.issuer.address}</div> : null}
      </div>
    </div>
    <div className="right">
      <div className="kicker">Certificado de cubicaje</div>
      <div className="number mono">N.° {view.number}</div>
      <div className="muted mono">{`Cubicado el ${day(view.measuredAt)} · ${time(view.measuredAt)}`}</div>
    </div>
  </div>
);

const Facts = ({ view }: { view: CubicageCertificateView }) => (
  <div className="box">
    <div style={{ padding: '7px 10px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }} className="kicker">Ficha de la unidad</div>
    <div className="facts">
      <div><span className="muted">Placa</span><span className="plate mono">{view.plate}</span></div>
      <div><span className="muted">Responsable del cubicaje</span><strong>{view.cubicator}</strong></div>
      <div><span className="muted">Forma de tolva</span><strong>{view.shapeLabel}</strong></div>
      <div><span className="muted">Cubicaje anterior</span><span className="mono">{view.previous ? `${m3(view.previous.m3)}${view.previous.at ? ` el ${day(view.previous.at)}` : ''}` : 'Primer cubicaje'}</span></div>
    </div>
  </div>
);

const Measures = ({ view }: { view: CubicageCertificateView }) => (
  <div className="measures">
    <div className="box figure">
      <img src={view.figureUrl} alt={`Sección de tolva ${view.shapeLabel.toLowerCase()} con sus cotas`} />
    </div>
    <div className="box">
      <table>
        <thead><tr><th>Cota</th><th>Descripción</th><th className="num">Medida</th><th>Origen</th></tr></thead>
        <tbody>
          {view.measures.map((measure) => (
            <tr key={measure.code} className={measure.formula ? 'deduced' : undefined}>
              <td className="mono"><strong>{measure.code}</strong></td>
              <td>{measure.label}</td>
              <td className="num">{`${measure.meters.toFixed(2)} m`}</td>
              <td>{measure.formula ? <>Deducida <span className="mono">{measure.formula}</span></> : 'Medida'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const Volume = ({ view }: { view: CubicageCertificateView }) => (
  <div className="box">
    <table>
      <tbody>
        {view.parts.map((part) => (
          <tr key={part.label}>
            <td>{part.label}</td>
            <td className="mono muted">{part.formula}</td>
            <td className="num">{m3(part.m3)}</td>
          </tr>
        ))}
        <tr className="total">
          <td colSpan={2}>Volumen de la tolva</td>
          <td className="num big">{m3(view.m3)}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

const Dispatch = ({ view }: { view: CubicageCertificateView }) => (
  <>
    <div className="box">
      <table>
        <thead><tr><th>m³ a despachar</th><th className="num">Altura de carga</th><th className="num">Desde arriba (borde de la tolva)</th></tr></thead>
        <tbody>
          {view.dispatch.map((row) => (
            <tr key={row.m3}>
              <td className="mono">{`${row.m3} m³`}</td>
              <td className="num">{`${row.loadCm} cm`}</td>
              <td className="num"><strong>{`${row.fromTopCm} cm`}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="muted" style={{ marginTop: 6 }}>Medir desde el borde superior de la tolva hacia abajo.</p>
  </>
);

export const CubicageCertificateSheet = ({ view, screen = false }: { view: CubicageCertificateView; screen?: boolean }) => (
  <article className={`cert${screen ? ' screen' : ''}`}>
    <Header view={view} />
    <hr className="rule" />
    <Facts view={view} />
    <div className="section"><h2>Medidas de la tolva (metros)</h2></div>
    <Measures view={view} />
    <div className="section"><h2>Cálculo del volumen</h2></div>
    <Volume view={view} />
    {view.dispatch.length > 0 ? (
      <>
        <div className="section"><h2>Tabla de alturas de despacho</h2></div>
        <Dispatch view={view} />
      </>
    ) : null}
    <div className="foot">
      <div className="sign">
        <strong>{view.cubicator}</strong>
        <div className="muted">Responsable del cubicaje</div>
      </div>
      <div className="right muted">
        {view.measuredBy ? <div>{`Medido por ${view.measuredBy.companyName} el ${day(view.measuredAt)}`}</div> : null}
        {view.previous ? <div>{`Este certificado reemplaza al cubicaje anterior de la unidad ${view.plate}`}</div> : null}
        <div className="mono">{`${view.number} · Página 1 / 1`}</div>
      </div>
    </div>
  </article>
);
