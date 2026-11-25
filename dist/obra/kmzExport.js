"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWorkStreetsKmz = exports.KML_MIME = exports.KMZ_MIME = exports.buildWorkStreetsKml = exports.kmlColor = void 0;
const zipStore_1 = require("./zipStore");
const partidaColors_1 = require("./partidaColors");
const streetProgress_1 = require("./streetProgress");
const streetGeometry_1 = require("./streetGeometry");
const kmStrip_1 = require("./kmStrip");
/**
 * The work as a KMZ, so it can still be viewed in Google Earth.
 *
 * It is not a whim: the client and the supervision already review the drawings
 * there, and the staged KMZ is what this module came to replace inside the
 * Portal. Exporting it is the friendly way out, not a retreat.
 *
 * Pure module: it builds the XML. The zip is done by `buildWorkStreetsKmz`.
 */
const XML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
};
/** Without this, a work named "Av. Perú & Cía." breaks the whole file. */
const escapeXml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char);
/**
 * KML color: `AABBGGRR`. **It is not RGB**: alpha goes first and the channels
 * are reversed. With CSS order, the base's brown comes out light blue and the
 * drawing stops being readable — the classic mistake with this format.
 */
const kmlColor = (hex, alpha = 'ff') => {
    const clean = String(hex ?? '').replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(clean))
        return `${alpha}888888`;
    const red = clean.slice(0, 2);
    const green = clean.slice(2, 4);
    const blue = clean.slice(4, 6);
    return `${alpha}${blue}${green}${red}`.toLowerCase();
};
exports.kmlColor = kmlColor;
/** KML wants `lng,lat[,alt]`. Swapping it sends the work to the other side of the world. */
const toCoordinates = (line) => line.map((point) => `${point.lng},${point.lat},0`).join(' ');
const lineStyle = (id, color, width) => `<Style id="${id}"><LineStyle><color>${color}</color><width>${width}</width></LineStyle></Style>`;
const placemark = (params) => `<Placemark><name>${escapeXml(params.name)}</name><styleUrl>#${params.styleId}</styleUrl>` +
    `<LineString><tessellate>1</tessellate><coordinates>${toCoordinates(params.line)}</coordinates></LineString></Placemark>`;
/** A scope's axis: its tags if it has any, otherwise its partidas. */
const workIdsOf = (scope) => (scope.tagIds ?? []).length > 0
    ? (scope.tagIds ?? []).map(String)
    : (scope.partidaIds ?? []).map(String);
const buildKmlContext = (params) => {
    const { progress, partidas, tags = [] } = params;
    const tagById = new Map(tags.map((tag) => [String(tag._id), tag]));
    /** What an axis is called: the tag first, the partida second. */
    const nameOf = (workId) => tagById.get(workId)?.name ||
        partidas.find((partida) => partida._id === workId)?.description ||
        'Trabajo';
    /** Its color: the tag's, or the one derived from the partida. */
    const colorOf = (workId) => tagById.get(workId)?.color || (0, partidaColors_1.colorForPartida)(workId, nameOf(workId));
    const eventsOf = (streetId) => progress
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
const kmlStyles = (context, usedWorkIds) => [
    lineStyle('pendiente', (0, exports.kmlColor)(partidaColors_1.NO_PARTIDA_COLOR, 'aa'), 4),
    ...usedWorkIds.map((workId) => lineStyle(`p-${workId}`, (0, exports.kmlColor)(context.colorOf(workId)), 6)),
].join('');
const kmlViewOf = (params) => {
    const wanted = params.works && params.works.length > 0 ? new Set(params.works.map(String)) : null;
    const scopes = params.scopes
        .filter((scope) => !params.stageId || scope.stageId === params.stageId)
        .filter((scope) => !wanted || workIdsOf(scope).some((workId) => wanted.has(workId)));
    const narrowed = Boolean(params.stageId) || wanted !== null;
    const streets = narrowed
        ? params.streets.filter((street) => scopes.some((scope) => scope.streetId === street._id))
        : params.streets;
    const workIds = Array.from(new Set(scopes.flatMap(workIdsOf))).filter((workId) => !wanted || wanted.has(workId));
    return { streets, scopes, workIds, narrowed };
};
const stretchName = (street, fromM, toM, labels) => labels === 'progresiva'
    ? `${street} · ${(0, kmStrip_1.stationLabel)(fromM)} a ${(0, kmStrip_1.stationLabel)(toM)}`
    : `${street} · ${Math.round(fromM)}–${Math.round(toM)} m`;
/** The approved placemarks of one axis on one scope of a street. */
const scopeDonePlacemarks = (params) => {
    const { context, street, scope, workId, upToDate, labels } = params;
    return (0, streetProgress_1.paintSegments)({
        line: street.geometry,
        events: context.eventsOf(street._id),
        workId,
        scope: { fromM: scope.fromM, toM: scope.toM },
        upToDate,
    })
        .filter((segment) => segment.state === 'approved')
        .map((segment) => placemark({
        name: stretchName(street.name, segment.fromM, segment.toM, labels),
        styleId: `p-${workId}`,
        line: segment.points.length >= 2
            ? segment.points
            : (0, streetGeometry_1.sliceLine)(street.geometry, segment.fromM, segment.toM),
    }));
};
/** One folder per axis with what was executed, drawn over the street line. */
const doneFolders = (params, context, view) => view.workIds.flatMap((workId) => {
    const marks = view.streets.flatMap((street) => view.scopes
        .filter((scope) => scope.streetId === street._id)
        .filter((scope) => workIdsOf(scope).includes(workId))
        .flatMap((scope) => scopeDonePlacemarks({ context, street, scope, workId, upToDate: params.upToDate, labels: params.labels })));
    if (marks.length === 0)
        return [];
    return [`<Folder><name>${escapeXml(context.nameOf(workId))}</name>${marks.join('')}</Folder>`];
});
const pendingMark = (street, line) => placemark({ name: street.name, styleId: 'pendiente', line });
/** Each planned stretch, and the streets without one while nothing narrows the file. */
const plannedPlacemarks = (view) => {
    const stretches = view.scopes.flatMap((scope) => {
        const street = view.streets.find((one) => one._id === scope.streetId);
        const line = street ? (0, streetGeometry_1.sliceLine)(street.geometry, scope.fromM, scope.toM) : [];
        return street && line.length >= 2 ? [pendingMark(street, line)] : [];
    });
    const bare = view.narrowed
        ? []
        : view.streets.filter((street) => street.geometry.length >= 2 && !view.scopes.some((scope) => scope.streetId === street._id));
    return [...stretches, ...bare.map((street) => pendingMark(street, street.geometry))];
};
const buildWorkStreetsKml = (params) => {
    const context = buildKmlContext(params);
    const view = kmlViewOf(params);
    // By default the whole street line, in grey: it is the contracted area, done or not.
    const pending = params.pending === 'planned'
        ? plannedPlacemarks(view)
        : view.streets.map((street) => pendingMark(street, street.geometry));
    const done = doneFolders(params, context, view);
    const folders = [
        done.length > 0 ? `<Folder><name>Ejecutado</name>${done.join('')}</Folder>` : '',
        pending.length > 0 ? `<Folder><name>Pendiente</name>${pending.join('')}</Folder>` : '',
    ].join('');
    return ('<?xml version="1.0" encoding="UTF-8"?>' +
        '<kml xmlns="http://www.opengis.net/kml/2.2">' +
        `<Document><name>${escapeXml(params.obraName)}</name>` +
        kmlStyles(context, view.workIds) +
        folders +
        '</Document></kml>');
};
exports.buildWorkStreetsKml = buildWorkStreetsKml;
/** Official KMZ MIME. It is the only thing that makes Earth offer to open it. */
exports.KMZ_MIME = 'application/vnd.google-earth.kmz';
/** Plain KML: more apps recognise it and nothing needs unzipping. */
exports.KML_MIME = 'application/vnd.google-earth.kml+xml';
/**
 * The KMZ bytes: a zip holding `doc.kml`, stored without compression
 * (`zipOneFile`), so the web and the APK write the same file with no zip
 * library. The caller wraps it with `KMZ_MIME`: with `application/zip` Android
 * forwards it as a zip and Google Earth does not show up to open it.
 */
const buildWorkStreetsKmz = (kml) => (0, zipStore_1.zipOneFile)('doc.kml', (0, zipStore_1.utf8)(kml));
exports.buildWorkStreetsKmz = buildWorkStreetsKmz;
