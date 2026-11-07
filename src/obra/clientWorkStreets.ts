import type { LatLng } from './streetGeometry';

/**
 * The street map for the CLIENT (read-only).
 *
 * It goes through a field whitelist, not by omission: the public payload is
 * built by choosing what goes out, so adding a cost field to the model does not
 * leak by itself. From progress only the measures and the date go out —what is
 * painted and what moves the slider—, never the metrado nor who loaded it.
 */

export interface ClientWorkStreet {
  _id: string;
  name: string;
  geometry: LatLng[];
  lengthM: number;
  /**
   * Roadway width. It joins the whitelist in F5: without it there is no m², and
   * the client report shows «área asfaltada X de Y m²». It is contractual
   * geometry —what the client contracted—, not a cost.
   */
  widthM?: number;
}

export interface ClientWorkScope {
  _id: string;
  streetId: string;
  fromM: number;
  toM: number;
  partidaIds: string[];
  /** The work axis. It wins over the partida for the color (`colorForScope`). */
  tagIds: string[];
  /** Scope width; it wins over the street's (`effectiveWidthM`). */
  widthM?: number;
  stageId?: string;
}

export interface ClientWorkProgress {
  streetId: string;
  partidaId: string;
  /** Present when progress was loaded by tag; then there is no partida. */
  tagId?: string;
  fromM: number;
  toM: number;
  date?: string;
  rework?: boolean;
}

/** The tag as the client sees it: to read the legend, not to edit it. */
export interface ClientWorkTag {
  _id: string;
  name: string;
  color: string;
  order: number;
}

/** A stage of the work, so the client can narrow the map to it. */
export interface ClientWorkStage {
  _id: string;
  name: string;
  order: number;
}

export interface ClientWorkStreets {
  streets: ClientWorkStreet[];
  scopes: ClientWorkScope[];
  progress: ClientWorkProgress[];
  tags: ClientWorkTag[];
  stages: ClientWorkStage[];
}

/** Trims to what the client may see. Pure: security is tested here. */
export const toClientWorkStreets = (input: {
  streets: Array<Record<string, unknown>>;
  scopes: Array<Record<string, unknown>>;
  progress: Array<Record<string, unknown>>;
  tags?: Array<Record<string, unknown>>;
  stages?: Array<Record<string, unknown>>;
}): ClientWorkStreets => ({
  streets: (input.streets ?? []).map((street) => ({
    _id: String(street._id),
    name: String(street.name ?? ''),
    geometry: (street.geometry as LatLng[]) ?? [],
    lengthM: Number(street.lengthM) || 0,
    widthM: Number(street.widthM) || undefined,
  })),
  scopes: (input.scopes ?? []).map((scope) => ({
    _id: String(scope._id),
    streetId: String(scope.streetId),
    fromM: Number(scope.fromM) || 0,
    toM: Number(scope.toM) || 0,
    partidaIds: (scope.partidaIds as string[]) ?? [],
    tagIds: (scope.tagIds as string[]) ?? [],
    widthM: Number(scope.widthM) || undefined,
    stageId: scope.stageId ? String(scope.stageId) : undefined,
  })),
  progress: (input.progress ?? [])
    // Only approved and located work: pending is internal conversation, and
    // without a street it cannot be painted.
    .filter((record) => record.status === 'approved' && Boolean(record.streetId))
    .map((record) => ({
      streetId: String(record.streetId),
      partidaId: record.partidaId ? String(record.partidaId) : '',
      tagId: record.tagId ? String(record.tagId) : undefined,
      fromM: Number(record.fromM) || 0,
      toM: Number(record.toM) || 0,
      date: record.date ? String(record.date) : undefined,
      rework: Boolean(record.rework) || undefined,
    })),
  tags: (input.tags ?? []).map((tag) => ({
    _id: String(tag._id),
    name: String(tag.name ?? ''),
    color: String(tag.color ?? ''),
    order: Number(tag.order) || 0,
  })),
  stages: (input.stages ?? []).map((stage) => ({
    _id: String(stage._id),
    name: String(stage.name ?? ''),
    order: Number(stage.order) || 0,
  })),
});
