import { utf8, zipOneFile } from './zipStore';
import { colorForPartida, NO_PARTIDA_COLOR } from './partidaColors';
import { paintSegments, type StreetProgressEvent } from './streetProgress';
import { sliceLine, type LatLng } from './streetGeometry';

/**
 * The work as a KMZ, so it can still be viewed in Google Earth.
 *
 * It is not a whim: the client and the supervision already review the drawings
 * there, and the staged KMZ is what this module came to replace inside the
 * Portal. Exporting it is the friendly way out, not a retreat.
 *
 * Pure module: it builds the XML. The zip is done by `buildWorkStreetsKmz`.
 */

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

/** Without this, a work named "Av. Perú & Cía." breaks the whole file. */
const escapeXml = (value: string): string =>
  String(value ?? '').replace(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char);

/**
 * KML color: `AABBGGRR`. **It is not RGB**: alpha goes first and the channels
 * are reversed. With CSS order, the base's brown comes out light blue and the
 * drawing stops being readable — the classic mistake with this format.
 */
export const kmlColor = (hex: string, alpha = 'ff'): string => {
  const clean = String(hex ?? '').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return `${alpha}888888`;
  const red = clean.slice(0, 2);
  const green = clean.slice(2, 4);
  const blue = clean.slice(4, 6);
  return `${alpha}${blue}${green}${red}`.toLowerCase();
};

/** KML wants `lng,lat[,alt]`. Swapping it sends the work to the other side of the world. */
const toCoordinates = (line: LatLng[]): string =>
  line.map((point) => `${point.lng},${point.lat},0`).join(' ');

const lineStyle = (id: string, color: string, width: number): string =>
  `<Style id="${id}"><LineStyle><color>${color}</color><width>${width}</width></LineStyle></Style>`;

const placemark = (params: { name: string; styleId: string; line: LatLng[] }): string =>
  `<Placemark><name>${escapeXml(params.name)}</name><styleUrl>#${params.styleId}</styleUrl>` +
  `<LineString><tessellate>1</tessellate><coordinates>${toCoordinates(params.line)}</coordinates></LineString></Placemark>`;

export interface KmlStreet {
  _id: string;
  name: string;
  geometry: LatLng[];
  lengthM: number;
}

export interface KmlScope {
  _id: string;
  streetId: string;
  fromM: number;
  toM: number;
  /** Work tags: they take precedence since 30/08/2026. */
  tagIds?: string[];
  /** Contracted partidas. Used when the scope has no tags. */
  partidaIds?: string[];
}

export interface KmlProgress {
  streetId: string;
  /** The progress axis: a tag, or a partida in old records. */
  workId: string;
  fromM: number;
  toM: number;
  date?: string;
  rework?: boolean;
}

/** A scope's axis: its tags if it has any, otherwise its partidas. */
const workIdsOf = (scope: KmlScope): string[] =>
  (scope.tagIds ?? []).length > 0
    ? (scope.tagIds ?? []).map(String)
    : (scope.partidaIds ?? []).map(String);

interface KmlParams {
  obraName: string;
  streets: KmlStreet[];
  scopes: KmlScope[];
  progress: KmlProgress[];
  partidas: Array<{ _id: string; description?: string }>;
  /**
   * Work tags. They carry their name and their OWN COLOR: the KMZ must look
   * like the map and the PDF drawing, otherwise the client opens Google Earth
   * and sees different colors for the same work.
   */
  tags?: Array<{ _id: string; name: string; color: string }>;
  /** Rebuilds the work at a date, just like the client's slider. */
  upToDate?: string;
}

/** Name, color and approved events of each axis, shared by the KML builders. */
interface KmlContext {
  nameOf: (workId: string) => string;
  colorOf: (workId: string) => string;
  eventsOf: (streetId: string) => StreetProgressEvent[];
}

const buildKmlContext = (params: KmlParams): KmlContext => {
  const { progress, partidas, tags = [] } = params;
  const tagById = new Map(tags.map((tag) => [String(tag._id), tag]));

  /** What an axis is called: the tag first, the partida second. */
  const nameOf = (workId: string) =>
    tagById.get(workId)?.name ||
    partidas.find((partida) => partida._id === workId)?.description ||
    'Trabajo';

  /** Its color: the tag's, or the one derived from the partida. */
  const colorOf = (workId: string) =>
    tagById.get(workId)?.color || colorForPartida(workId, nameOf(workId));

  const eventsOf = (streetId: string): StreetProgressEvent[] =>
    progress
      .filter((record) => record.streetId === streetId)
      .map((record) => ({
        workId: record.workId,
        fromM: record.fromM,
        toM: record.toM,
        status: 'approved',
        date: record.date,
        rework: record.rework,
      }));

  return { nameOf, colorOf, eventsOf };
};

const kmlStyles = (context: KmlContext, usedWorkIds: string[]): string =>
  [
    lineStyle('pendiente', kmlColor(NO_PARTIDA_COLOR, 'aa'), 4),
    ...usedWorkIds.map((workId) => lineStyle(`p-${workId}`, kmlColor(context.colorOf(workId)), 6)),
  ].join('');

/** The approved placemarks of one axis on one scope of a street. */
const scopeDonePlacemarks = (params: {
  context: KmlContext;
  street: KmlStreet;
  scope: KmlScope;
  workId: string;
  upToDate?: string;
}): string[] => {
  const { context, street, scope, workId, upToDate } = params;
  return paintSegments({
    line: street.geometry,
    events: context.eventsOf(street._id),
    workId,
    scope: { fromM: scope.fromM, toM: scope.toM },
    upToDate,
  })
    .filter((segment) => segment.state === 'approved')
    .map((segment) =>
      placemark({
        name: `${street.name} · ${Math.round(segment.fromM)}–${Math.round(segment.toM)} m`,
        styleId: `p-${workId}`,
        line: segment.points.length >= 2
          ? segment.points
          : sliceLine(street.geometry, segment.fromM, segment.toM),
      })
    );
};

/** One folder per axis with what was executed, drawn over the street line. */
const doneFolders = (params: KmlParams, context: KmlContext, usedWorkIds: string[]): string[] =>
  usedWorkIds.flatMap((workId) => {
    const marks = params.streets.flatMap((street) =>
      params.scopes
        .filter((scope) => scope.streetId === street._id)
        .filter((scope) => workIdsOf(scope).includes(workId))
        .flatMap((scope) =>
          scopeDonePlacemarks({ context, street, scope, workId, upToDate: params.upToDate })
        )
    );
    if (marks.length === 0) return [];
    return [`<Folder><name>${escapeXml(context.nameOf(workId))}</name>${marks.join('')}</Folder>`];
  });

export const buildWorkStreetsKml = (params: KmlParams): string => {
  const { obraName, streets, scopes } = params;
  const context = buildKmlContext(params);
  const usedWorkIds = Array.from(new Set(scopes.flatMap(workIdsOf)));

  // The whole street line, in grey: it is the contracted area, done or not.
  const pending = streets.map((street) =>
    placemark({ name: street.name, styleId: 'pendiente', line: street.geometry })
  );
  const done = doneFolders(params, context, usedWorkIds);

  const folders = [
    done.length > 0 ? `<Folder><name>Ejecutado</name>${done.join('')}</Folder>` : '',
    pending.length > 0 ? `<Folder><name>Pendiente</name>${pending.join('')}</Folder>` : '',
  ].join('');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<kml xmlns="http://www.opengis.net/kml/2.2">' +
    `<Document><name>${escapeXml(obraName)}</name>` +
    kmlStyles(context, usedWorkIds) +
    folders +
    '</Document></kml>'
  );
};

/** Official KMZ MIME. It is the only thing that makes Earth offer to open it. */
export const KMZ_MIME = 'application/vnd.google-earth.kmz';
/** Plain KML: more apps recognise it and nothing needs unzipping. */
export const KML_MIME = 'application/vnd.google-earth.kml+xml';

/**
 * The KMZ bytes: a zip holding `doc.kml`, stored without compression
 * (`zipOneFile`), so the web and the APK write the same file with no zip
 * library. The caller wraps it with `KMZ_MIME`: with `application/zip` Android
 * forwards it as a zip and Google Earth does not show up to open it.
 */
export const buildWorkStreetsKmz = (kml: string): Uint8Array => zipOneFile('doc.kml', utf8(kml));
