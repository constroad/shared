import { PLANILLA_VERSION } from './version';

describe('PLANILLA_VERSION', () => {
  it('names the payroll calculation, not the package: agentes compares it across the apps', () => {
    expect(PLANILLA_VERSION).toBe('0.1.1');
  });
});
