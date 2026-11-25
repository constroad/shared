import {
  DEFAULT_PAGE_SCALE,
  MAX_PAGE_SCALE,
  MAX_PAGES_PER_DOCUMENT,
  MIN_PAGE_SCALE,
  clampPageScale,
  isRenderablePage,
} from './limits';

describe('render limits', () => {
  it('clamps the scale into the allowed range', () => {
    expect(clampPageScale(10)).toBe(MAX_PAGE_SCALE);
    expect(clampPageScale(0.01)).toBe(MIN_PAGE_SCALE);
    expect(clampPageScale(1.25)).toBe(1.25);
  });

  it('uses the default scale for missing or invalid input', () => {
    expect(clampPageScale(undefined)).toBe(DEFAULT_PAGE_SCALE);
    expect(clampPageScale(Number.NaN)).toBe(DEFAULT_PAGE_SCALE);
    expect(clampPageScale(Number.POSITIVE_INFINITY)).toBe(DEFAULT_PAGE_SCALE);
  });

  it('accepts only whole pages within the document and the cap', () => {
    expect(isRenderablePage(1)).toBe(true);
    expect(isRenderablePage(MAX_PAGES_PER_DOCUMENT)).toBe(true);
    expect(isRenderablePage(MAX_PAGES_PER_DOCUMENT + 1)).toBe(false);
    expect(isRenderablePage(0)).toBe(false);
    expect(isRenderablePage(1.5)).toBe(false);
    expect(isRenderablePage(5, 4)).toBe(false);
    expect(isRenderablePage(4, 4)).toBe(true);
  });
});
