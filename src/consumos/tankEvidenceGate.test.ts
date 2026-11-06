import { resolveTankEvidenceGate } from './tankEvidenceGate';

describe('resolveTankEvidenceGate', () => {
  it('lets a reading with its photo through, and nothing is pending', () => {
    expect(resolveTankEvidenceGate({ evidenceCount: 1, evidenceDeferred: false })).toEqual({ blocked: false, evidencePending: false });
  });

  it('blocks a reading with no photo and no reason', () => {
    expect(resolveTankEvidenceGate({ evidenceCount: 0, evidenceDeferred: false })).toEqual({ blocked: true, evidencePending: true });
  });

  it('accepts a deferred photo and marks it pending', () => {
    expect(resolveTankEvidenceGate({ evidenceCount: 0, evidenceDeferred: true })).toEqual({ blocked: false, evidencePending: true });
  });
});
