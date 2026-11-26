import type { ReactNode } from 'react';

/**
 * The Drive viewer shared by Portal (public link and intranet) and Inframaq.
 * Self-contained on purpose: React and Tailwind classes with shadcn token
 * names only, no app import, so it can move to `@constroad/shared/drive-viewer`.
 */

export type DriveViewerKind = 'pdf' | 'image' | 'video' | 'none';

/** A window of page images (the share contract of lila: 5-minute signed URLs). */
export interface DriveViewerPageWindow {
  pages: number;
  from: number;
  urls: string[];
  /** ISO instant at which the URLs stop working. */
  expiresAt: string;
}

/** Where the page images of a document come from (`thumbs` asks for light ones). */
export type DriveViewerPagesLoader = (from: number, options: { thumbs: boolean }) => Promise<DriveViewerPageWindow>;

/** A video that must not be downloaded: a short-lived stream and the watermark to lay over it. */
export interface DriveViewerProtectedStream {
  url: string;
  watermark: string;
}

export interface DriveViewerItem {
  id: string;
  name: string;
  kind: DriveViewerKind;
  /** The original may be downloaded: it is shown as is, with the item's actions. */
  canDownload: boolean;
  /** The original (or a signed URL of it) when `canDownload`. */
  src?: string;
  /** Without download, a PDF or an image is shown as watermarked page images. */
  loadPages?: DriveViewerPagesLoader;
  /** Without download, a video plays from a short-lived stream under a watermark. */
  loadStream?: () => Promise<DriveViewerProtectedStream>;
  /** Small text above the name (the folder). */
  kicker?: string;
  /** Bytes of the original, for «Descargar PDF · 1,1 MB». */
  sizeBytes?: number;
  /** Where «Descargar» goes (a link, so it works without JS); without it, `onDownload` is called. */
  downloadHref?: string;
  /** The link lets print this file (needs `canDownload`): the viewer shows «Imprimir» when `onPrint` is given. */
  canPrint?: boolean;
}

/** Page state of the open document, lifted to the top bar on wide screens. */
export interface DriveViewerPager {
  current: number;
  pages: number;
  goTo: (page: number) => void;
}

export interface DriveViewerProps {
  items: DriveViewerItem[];
  /** Id of the item open; `null` closes the viewer. */
  currentId: string | null;
  onNavigate: (id: string) => void;
  onClose: () => void;
  /** Extra buttons of the top bar for the open item, app-specific (prefer `onDownload`/`onPrint`). */
  renderActions?: (item: DriveViewerItem) => ReactNode;
  /** «Descargar» (with the size) for an item with `canDownload`: in the bar, and as its own row on the phone. */
  onDownload?: (item: DriveViewerItem) => void;
  /** «Imprimir» for an item with `canDownload` and `canPrint`. */
  onPrint?: (item: DriveViewerItem) => void;
  /** The company logo, in the top bar on desktop (next to «Volver a la carpeta»). */
  logo?: ReactNode;
  /** A downloadable PDF in the app's own pdf.js viewer; without it, an iframe. */
  renderPdf?: (item: DriveViewerItem) => ReactNode;
  /** Badge next to the name (e.g. «Solo lectura»). */
  renderBadge?: (item: DriveViewerItem) => ReactNode;
  /** Copy, in the app's language. */
  labels?: Partial<DriveViewerLabels>;
  /**
   * Class of the wrapper the viewer is portaled into (on `document.body`), so the app's theme
   * tokens apply there too (Portal: `shadcn-surface` + `dark`). An ancestor with a transform would
   * otherwise trap the `fixed` overlay inside it.
   */
  surfaceClassName?: string;
}

export interface DriveViewerLabels {
  back: string;
  previous: string;
  next: string;
  zoomIn: string;
  zoomOut: string;
  fit: string;
  /** «Ajustar», where «Ajustar al ancho» does not fit (phone). */
  fitShort: string;
  thumbnails: string;
  /** «Miniaturas (12 páginas)» over the phone strip. */
  thumbnailsCount: (pages: number) => string;
  /** «12 págs» next to «Miniaturas» on desktop. */
  pagesShort: (pages: number) => string;
  /** «Pág. 3 activa» over the phone strip. */
  activePage: (page: number) => string;
  page: (page: number, pages: number) => string;
  /** «Página» before the editable page field. */
  pageField: string;
  /** «de 12» after the editable page field. */
  pageOf: (pages: number) => string;
  /** «Páginas» over the phone paginator. */
  pagesLabel: string;
  /** «Archivo 2 de 4»: the files of the folder, never confused with the pages. */
  fileCounter: (index: number, total: number) => string;
  files: string;
  previousFile: string;
  nextFile: string;
  print: string;
  /** «Descargar PDF · 1,1 MB» (kind of the file, formatted size or empty). */
  download: (kind: DriveViewerKind, size: string) => string;
  noPreview: string;
  noPreviewDetail: string;
  readOnly: string;
  videoNotice: string;
}
