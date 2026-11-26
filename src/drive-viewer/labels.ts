import type { DriveViewerLabels } from './types';

/** Neutral Spanish copy; an app may override any of it through `labels`. */
export const DEFAULT_LABELS: DriveViewerLabels = {
  back: 'Volver a la carpeta',
  previous: 'Anterior',
  next: 'Siguiente',
  zoomIn: 'Acercar',
  zoomOut: 'Alejar',
  fit: 'Ajustar al ancho',
  fitShort: 'Ajustar',
  thumbnails: 'Miniaturas',
  thumbnailsCount: (pages) => `Miniaturas (${pages} ${pages === 1 ? 'página' : 'páginas'})`,
  pagesShort: (pages) => `${pages} págs`,
  activePage: (page) => `Pág. ${page} activa`,
  page: (page, pages) => `Página ${page} de ${pages}`,
  pageField: 'Página',
  pageOf: (pages) => `de ${pages}`,
  pagesLabel: 'Páginas',
  fileCounter: (index, total) => `Archivo ${index} de ${total}`,
  files: 'Archivos de la carpeta',
  previousFile: 'Archivo anterior',
  nextFile: 'Siguiente archivo',
  print: 'Imprimir',
  download: (kind, size) => `${kind === 'pdf' ? 'Descargar PDF' : 'Descargar'}${size ? ` · ${size}` : ''}`,
  noPreview: 'Vista previa no disponible',
  noPreviewDetail: 'Este archivo no se puede mostrar en línea.',
  readOnly: 'Documento de solo lectura. Quien te lo compartió desactivó la descarga y la impresión.',
  videoNotice: 'Video de solo lectura: quien lo compartió desactivó la descarga.',
};

const BYTES_PER_UNIT = 1024;
const SIZE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;

/** «1,1 MB» (comma decimal); empty for a missing or zero size. */
export const formatFileSize = (bytes?: number): string => {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return '';
  let value = bytes;
  let unit = 0;
  while (value >= BYTES_PER_UNIT && unit < SIZE_UNITS.length - 1) { value /= BYTES_PER_UNIT; unit += 1; }
  const shown = unit === 0 || value >= 10 ? String(Math.round(value)) : value.toFixed(1).replace('.', ',');
  return `${shown} ${SIZE_UNITS[unit]}`;
};

export const ZOOM_STEPS = [50, 75, 100, 125, 150, 200] as const;

export const cx = (...classes: Array<string | false | null | undefined>): string => classes.filter(Boolean).join(' ');
