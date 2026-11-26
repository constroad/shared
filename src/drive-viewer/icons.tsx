/** Stroke icons drawn inline: the viewer carries no icon library. They never shrink beside a long text (dc02 lock, 26/11). */
const Svg = ({ d, className = 'h-4 w-4 shrink-0' }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={d} />
  </svg>
);

export const ArrowLeftIcon = () => <Svg d="M19 12H5M12 19l-7-7 7-7" />;
export const ChevronLeftIcon = () => <Svg d="M15 18l-6-6 6-6" />;
export const ChevronRightIcon = () => <Svg d="M9 18l6-6-6-6" />;
export const MinusIcon = () => <Svg d="M5 12h14" />;
export const PlusIcon = () => <Svg d="M12 5v14M5 12h14" />;
export const FitIcon = () => <Svg d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />;
export const LockIcon = () => <Svg d="M7 11V7a5 5 0 0110 0v4M5 11h14v10H5z" />;
export const PrinterIcon = () => <Svg d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" />;
export const DownloadIcon = () => <Svg d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />;
export const FileTextIcon = () => <Svg d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />;
export const ImageFileIcon = () => <Svg d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21" />;
export const VideoFileIcon = () => <Svg d="M23 7l-7 5 7 5V7zM14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z" />;
