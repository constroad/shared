import { readFileSync } from 'fs';
import { join } from 'path';
import { PLANILLA_VERSION } from './version';

describe('PLANILLA_VERSION', () => {
  it('is the package version: each app reports it in its /health', () => {
    const manifest = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as { version: string };
    expect(PLANILLA_VERSION).toBe(manifest.version);
  });
});
