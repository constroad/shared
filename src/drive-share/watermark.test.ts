import { WATERMARK_MAX_LENGTH, watermarkText } from './watermark';

const AT = new Date(Date.UTC(2026, 10, 25, 19, 5, 0)); // 14:05 in Lima

describe('watermarkText', () => {
  it('marks the link and the Lima date and time', () => {
    expect(watermarkText({ linkCode: 'AB12CD', at: AT })).toBe('Enlace AB12CD · 25/11/2026 14:05');
  });

  it('adds the identified viewer between both', () => {
    expect(watermarkText({ linkCode: 'AB12CD', viewer: 'cliente@correo.com', at: AT })).toBe(
      'Enlace AB12CD · cliente@correo.com · 25/11/2026 14:05'
    );
  });

  it('accepts epoch milliseconds and ISO strings', () => {
    expect(watermarkText({ linkCode: 'X', at: AT.getTime() })).toBe('Enlace X · 25/11/2026 14:05');
    expect(watermarkText({ linkCode: 'X', at: AT.toISOString() })).toBe('Enlace X · 25/11/2026 14:05');
  });

  it('strips control characters and blank viewers', () => {
    expect(watermarkText({ linkCode: 'A\nB', viewer: '  \t ', at: AT })).toBe('Enlace A B · 25/11/2026 14:05');
  });

  it('never exceeds the maximum length', () => {
    const text = watermarkText({ linkCode: 'X', viewer: 'v'.repeat(500), at: AT });
    expect(text.length).toBeLessThanOrEqual(WATERMARK_MAX_LENGTH);
    expect(text.endsWith('25/11/2026 14:05')).toBe(true);
  });

  it('refuses an invalid date instead of printing garbage', () => {
    expect(() => watermarkText({ linkCode: 'X', at: 'nunca' })).toThrow(RangeError);
  });
});
