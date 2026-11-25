"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cx = exports.ZOOM_STEPS = exports.DEFAULT_LABELS = void 0;
/** Neutral Spanish copy; an app may override any of it through `labels`. */
exports.DEFAULT_LABELS = {
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
exports.ZOOM_STEPS = [50, 75, 100, 125, 150, 200];
const cx = (...classes) => classes.filter(Boolean).join(' ');
exports.cx = cx;
