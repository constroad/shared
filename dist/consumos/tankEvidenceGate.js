"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTankEvidenceGate = void 0;
const resolveTankEvidenceGate = ({ evidenceCount, evidenceDeferred, }) => ({
    blocked: evidenceCount === 0 && !evidenceDeferred,
    evidencePending: evidenceCount === 0,
});
exports.resolveTankEvidenceGate = resolveTankEvidenceGate;
