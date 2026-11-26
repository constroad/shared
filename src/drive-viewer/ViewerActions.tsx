import { DownloadIcon, PrinterIcon } from './icons';
import { cx, formatFileSize } from './labels';
import { VIEWER_BUTTON } from './ViewerControls';
import type { DriveViewerItem, DriveViewerLabels } from './types';

type ViewerActionsProps = {
  item: DriveViewerItem;
  labels: DriveViewerLabels;
  onDownload?: (item: DriveViewerItem) => void;
  onPrint?: (item: DriveViewerItem) => void;
  /** `bar`: in the top bar (wide screens); `row`: its own full-width row under it (phone, Stitch dc03). */
  placement: 'bar' | 'row';
};

/** Whether the item gets «Imprimir» / «Descargar»: never without download (printing needs the original). */
export const actionsOf = (item: DriveViewerItem, handlers: Pick<ViewerActionsProps, 'onDownload' | 'onPrint'>) => ({
  print: Boolean(handlers.onPrint && item.canDownload && item.canPrint),
  download: Boolean((item.downloadHref || handlers.onDownload) && item.canDownload),
});

const downloadClass = 'border-primary bg-primary text-primary-foreground';

/** «Imprimir» and «Descargar PDF · 1,1 MB», as the link allows them. */
export const ViewerActions = ({ item, labels, onDownload, onPrint, placement }: ViewerActionsProps) => {
  const shown = actionsOf(item, { onDownload, onPrint });
  if (!shown.print && !shown.download) return null;
  const row = placement === 'row';
  const downloadText = labels.download(item.kind, formatFileSize(item.sizeBytes));
  return (
    <div className={cx('items-center gap-2', row ? 'flex border-b border-border bg-card px-4 py-2 lg:hidden' : 'hidden shrink-0 lg:flex')}>
      {shown.print && (
        <button type="button" className={cx(VIEWER_BUTTON, row && 'shrink-0')} onClick={() => onPrint?.(item)} aria-label={labels.print}>
          <PrinterIcon />{labels.print}
        </button>
      )}
      {shown.download && (item.downloadHref ? (
        <a href={item.downloadHref} className={cx(VIEWER_BUTTON, downloadClass, row && 'min-w-0 flex-1')} aria-label={downloadText}>
          <DownloadIcon /><span className="truncate">{downloadText}</span>
        </a>
      ) : (
        <button type="button" className={cx(VIEWER_BUTTON, downloadClass, row && 'min-w-0 flex-1')} onClick={() => onDownload?.(item)} aria-label={downloadText}>
          <DownloadIcon /><span className="truncate">{downloadText}</span>
        </button>
      ))}
    </div>
  );
};
