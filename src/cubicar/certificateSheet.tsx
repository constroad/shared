import type { CSSProperties } from 'react';
import type { CubicageCertificateView } from '../flota/certificate';
import { HopperFigure } from './hopperFigure';

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

const day = (iso: string): string => new Date(iso).toLocaleDateString('es-PE', { timeZone: LIMA, day: '2-digit', month: '2-digit', year: 'numeric' });
const time = (iso: string): string => new Date(iso).toLocaleTimeString('es-PE', { timeZone: LIMA, hour: '2-digit', minute: '2-digit', hour12: false });
const m3 = (value: number): string => `${value.toFixed(2)} m³`;

export const CERTIFICATE_CSS = (paged: boolean) => `
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

const identityLine = (issuer: CubicageCertificateView['issuer']): string => [issuer.taxId ? `RUC ${issuer.taxId}` : '', issuer.address].filter(Boolean).join(' · ');

const Header = ({ view }: { view: CubicageCertificateView }) => (
  <header className="head">
    <div className="brand">
      {view.issuer.logoUrl ? <img src={view.issuer.logoUrl} alt={view.issuer.name} /> : null}
      <div>
        <div className="name">{view.issuer.name}</div>
        {identityLine(view.issuer) ? <div className="line">{identityLine(view.issuer)}</div> : null}
        <div className="tagline">Cubicación de volquetes</div>
      </div>
    </div>
    <div className="doc">
      <span className="chip">Certificado de cubicaje</span>
      {view.number ? <div className="number mono">N.º {view.number}</div> : null}
      {view.measuredAt ? (
        <div>
          Cubicado: <strong>{day(view.measuredAt)}</strong> · {time(view.measuredAt)}
        </div>
      ) : null}
    </div>
  </header>
);

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="fact">
    <span className="muted">{label}:</span>
    <span className="value">{children}</span>
  </div>
);

const Facts = ({ view }: { view: CubicageCertificateView }) => (
  <section className="facts">
    <Fact label="Placa">
      <span className="plate mono">{view.plate}</span>
    </Fact>
    <Fact label="Forma de tolva">
      <span className="tag">{view.shapeLabel}</span>
    </Fact>
    <Fact label="Responsable del cubicaje">{view.cubicator}</Fact>
    <Fact label="Cubicaje anterior">
      <span className="mono">{view.previous ? `${m3(view.previous.m3)}${view.previous.at ? ` · ${day(view.previous.at)}` : ''}` : 'Primer cubicaje'}</span>
    </Fact>
  </section>
);

const Figure = ({ view }: { view: CubicageCertificateView }) => (
  <section className="panel">
    <p className="title">Geometría y cotas de la tolva</p>
    <HopperFigure shape={view.shape} measures={view.figure} title={`Tolva ${view.shapeLabel.toLowerCase()} de ${view.plate} con sus cotas`} />
  </section>
);

const Measures = ({ view }: { view: CubicageCertificateView }) => (
  <section>
    <p className="title">Medidas de la tolva</p>
    <table>
      <thead>
        <tr>
          <th>Cota</th>
          <th>Descripción</th>
          <th className="num">Medida</th>
          <th>Origen</th>
        </tr>
      </thead>
      <tbody>
        {view.measures.map((measure) => (
          <tr key={measure.code} className={measure.formula ? 'deduced' : undefined}>
            <td className="mono">
              <strong>{measure.code}</strong>
            </td>
            <td>{measure.label}</td>
            <td className="num mono">{`${measure.meters.toFixed(2)} m`}</td>
            <td>{measure.formula ? <>Deducida <span className="mono">{measure.formula}</span></> : 'Medida con cinta'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const Volume = ({ view }: { view: CubicageCertificateView }) => (
  <section className="split">
    <div>
      <p className="title">Cálculo del volumen</p>
      <table>
        <thead>
          <tr>
            <th>Parte</th>
            <th>Fórmula</th>
            <th className="num">Volumen</th>
          </tr>
        </thead>
        <tbody>
          {view.parts.map((part) => (
            <tr key={part.label}>
              <td>{part.label}</td>
              <td className="mono muted">{part.formula}</td>
              <td className="num mono">{m3(part.m3)}</td>
            </tr>
          ))}
          <tr className="total">
            <td colSpan={2}>Volumen de la tolva</td>
            <td className="num mono">{m3(view.m3)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div className="verdict">
      <span className="kicker">Volumen certificado</span>
      <span className="big mono">{m3(view.m3)}</span>
      <span className="muted">Capacidad de la tolva al ras</span>
    </div>
  </section>
);

const Dispatch = ({ view }: { view: CubicageCertificateView }) => (
  <section>
    <p className="title">Tabla de alturas de despacho</p>
    <table>
      <thead>
        <tr>
          <th>Volumen a despachar</th>
          <th className="num">Altura de carga</th>
          <th className="num">Medir desde el borde</th>
        </tr>
      </thead>
      <tbody>
        {view.dispatch.map((row) => (
          <tr key={row.m3}>
            <td className="mono">{`${row.m3} m³`}</td>
            <td className="num mono">{`${row.loadCm} cm`}</td>
            <td className="num mono from-top">{`${row.fromTopCm} cm`}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <p className="note">Se mide desde el borde superior de la tolva hacia abajo.</p>
  </section>
);

const Footer = ({ view }: { view: CubicageCertificateView }) => (
  <>
    <div className="foot">
      <div className="sign">
        <strong>{view.cubicator}</strong>
        <div className="muted">Responsable del cubicaje</div>
      </div>
      <div className="doc muted">
        {view.measuredBy ? <div>{`Medido por ${view.measuredBy.companyName}${view.measuredAt ? ` el ${day(view.measuredAt)}` : ''}`}</div> : null}
        {view.previous ? <div>{`Reemplaza al cubicaje anterior de la unidad ${view.plate}`}</div> : null}
      </div>
    </div>
    <div className="meta mono">
      <span>Generado desde el cubicaje registrado</span>
      <span>{view.number ? `${view.number} · Página 1 / 1` : 'Página 1 / 1'}</span>
    </div>
  </>
);

export const CubicageCertificateSheet = ({ view, screen = false }: { view: CubicageCertificateView; screen?: boolean }) => (
  <article className={`cert${screen ? ' screen' : ''}`} style={view.issuer.accent ? ({ '--cert-accent': view.issuer.accent } as CSSProperties) : undefined}>
    <Header view={view} />
    <div className="band">
      <h1>Cubicación de tolva de volquete</h1>
      <span className="muted">Volumen geométrico medido con cinta y alturas de carga para despachar</span>
    </div>
    <Facts view={view} />
    <Figure view={view} />
    <Measures view={view} />
    <Volume view={view} />
    {view.dispatch.length > 0 ? <Dispatch view={view} /> : null}
    <Footer view={view} />
  </article>
);
