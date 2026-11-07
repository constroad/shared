"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toClientWorkStreets = void 0;
/** Trims to what the client may see. Pure: security is tested here. */
const toClientWorkStreets = (input) => ({
    streets: (input.streets ?? []).map((street) => ({
        _id: String(street._id),
        name: String(street.name ?? ''),
        geometry: street.geometry ?? [],
        lengthM: Number(street.lengthM) || 0,
        widthM: Number(street.widthM) || undefined,
    })),
    scopes: (input.scopes ?? []).map((scope) => ({
        _id: String(scope._id),
        streetId: String(scope.streetId),
        fromM: Number(scope.fromM) || 0,
        toM: Number(scope.toM) || 0,
        partidaIds: scope.partidaIds ?? [],
        tagIds: scope.tagIds ?? [],
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
exports.toClientWorkStreets = toClientWorkStreets;
