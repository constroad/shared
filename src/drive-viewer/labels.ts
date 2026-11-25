import type { DriveViewerLabels } from './types';

/** Neutral Spanish copy; an app may override any of it through `labels`. */
export const DEFAULT_LABELS: DriveViewerLabels = {
  back: 'Volver a la carpeta',
  previous: 'Anterior',
  next: 'Siguiente',
  zoomIn: 'Acercar',
  zoomOut: 'Alejar',
  fit: 'Ajustar al ancho',
  thumbnails: 'Miniaturas',
  page: (page, pages) => `Página ${page} de ${pages}`,
  fileCounter: (index, total) => `${index} de ${total}`,
  noPreview: 'Vista previa no disponible',
  noPreviewDetail: 'Este archivo no se puede mostrar en línea.',
  readOnly: 'Documento de solo lectura. Quien te lo compartió desactivó la descarga y la impresión.',
  videoNotice: 'Video de solo lectura: quien lo compartió desactivó la descarga.',
};

export const ZOOM_STEPS = [50, 75, 100, 125, 150, 200] as const;

export const cx = (...classes: Array<string | false | null | undefined>): string => classes.filter(Boolean).join(' ');
