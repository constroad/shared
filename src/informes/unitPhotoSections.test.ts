import { buildUnitPhotoSectionKey, parseUnitPhotoDispatchId } from './unitPhotoSections';

describe('unit photo sections', () => {
  it('a dispatch goes and comes back through its section key', () => {
    expect(buildUnitPhotoSectionKey('d1')).toBe('unitPhotos_d1');
    expect(parseUnitPhotoDispatchId(buildUnitPhotoSectionKey('d1'))).toBe('d1');
  });

  it('any other section is no unit', () => {
    expect(parseUnitPhotoDispatchId('panelFotografico')).toBeNull();
  });
});
