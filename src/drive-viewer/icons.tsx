/** Stroke icons drawn inline: the viewer carries no icon library. */
const Svg = ({ d, className = 'h-4 w-4' }: { d: string; className?: string }) => (
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
