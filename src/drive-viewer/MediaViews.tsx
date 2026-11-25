import { useCallback, useEffect, useRef, useState } from 'react';
import { NoPreview, ZoomControls, blockGesture } from './ViewerControls';
import type { DriveViewerItem, DriveViewerLabels, DriveViewerProtectedStream } from './types';

/** An image: the original when it can be downloaded, the watermarked 1600 px derivative otherwise. */
export const ImageView = ({ item, labels, zoom, onZoom }: { item: DriveViewerItem; labels: DriveViewerLabels; zoom: number; onZoom: (zoom: number) => void }) => {
  const [src, setSrc] = useState<string | undefined>(item.canDownload ? item.src : undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (item.canDownload) return setSrc(item.src);
    setSrc(undefined);
    item.loadPages?.(1, { thumbs: false }).then((window) => setSrc(window.urls[0])).catch(() => setFailed(true));
  }, [item]);
  if (failed || (item.canDownload && !item.src)) return <NoPreview labels={labels} />;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex justify-end border-b border-border bg-card px-4 py-2"><ZoomControls zoom={zoom} labels={labels} onZoom={onZoom} /></div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        {src ? (
          <img src={src} alt={item.name} draggable={false} referrerPolicy="no-referrer" crossOrigin={item.canDownload ? undefined : 'anonymous'} onContextMenu={item.canDownload ? undefined : blockGesture}
            className="max-w-none select-none rounded-lg shadow-sm" style={{ width: zoom === 100 ? 'auto' : `${zoom}%`, maxHeight: zoom === 100 ? '100%' : undefined, maxWidth: zoom === 100 ? '100%' : undefined }} />
        ) : <div className="aspect-[4/3] w-full max-w-3xl animate-pulse rounded-lg bg-muted" />}
      </div>
    </div>
  );
};

/** The watermark over a protected video: the same text lila stamps on pages, tiled. */
/** Enough repeats to tile twice the player (the rotated grid is `-inset-1/2`) on a wide screen. */
const WATERMARK_REPEATS = 240;

const WatermarkLayer = ({ text }: { text: string }) => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden select-none" aria-hidden="true">
    <div className="absolute -inset-1/2 flex rotate-[-24deg] flex-wrap content-start gap-x-16 gap-y-12 opacity-30">
      {Array.from({ length: WATERMARK_REPEATS }, (_, index) => <span key={index} className="whitespace-nowrap text-sm font-semibold text-white [text-shadow:0_0_2px_rgba(0,0,0,0.8)]">{text}</span>)}
    </div>
  </div>
);

/** A short-lived stream, asked again when it expires mid-playback (Range requests then fail). */
const useProtectedStream = (item: DriveViewerItem) => {
  const [stream, setStream] = useState<DriveViewerProtectedStream | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => { item.loadStream?.().then(setStream).catch(() => setFailed(true)); }, [item]);
  useEffect(() => { setStream(null); setFailed(false); if (!item.canDownload) load(); }, [item, load]);
  return { stream, failed, reload: load };
};

/** A video: the original with download; without it, a signed stream that only makes downloading harder. */
export const VideoView = ({ item, labels }: { item: DriveViewerItem; labels: DriveViewerLabels }) => {
  const video = useRef<HTMLVideoElement>(null);
  const resumeAt = useRef(0);
  const { stream, failed, reload } = useProtectedStream(item);
  const src = item.canDownload ? item.src : stream?.url;
  const onError = () => { resumeAt.current = video.current?.currentTime ?? 0; if (!item.canDownload) reload(); };
  const onLoaded = () => { if (video.current && resumeAt.current) video.current.currentTime = resumeAt.current; };
  if (failed || (item.canDownload && !item.src)) return <NoPreview labels={labels} />;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-auto bg-background p-4">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-lg bg-black shadow-sm" onContextMenu={item.canDownload ? undefined : blockGesture}>
        {src ? (
          <video ref={video} src={src} controls playsInline preload="metadata" className="block max-h-[75vh] w-full" onError={onError} onLoadedMetadata={onLoaded}
            {...(item.canDownload ? {} : { controlsList: 'nodownload noremoteplayback', disablePictureInPicture: true, disableRemotePlayback: true })} />
        ) : <div className="aspect-video w-full animate-pulse bg-muted" />}
        {!item.canDownload && stream && <WatermarkLayer text={stream.watermark} />}
      </div>
      {!item.canDownload && <p className="text-center text-sm text-muted-foreground">{labels.videoNotice}</p>}
    </div>
  );
};
