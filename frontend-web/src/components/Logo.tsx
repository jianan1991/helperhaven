/**
 * Cottage logo mark — sage pentagon house with clay figure inside.
 * Picked 2026-04-25 over the Haven arch (see memory/project_decisions.md).
 * Used in nav, footer, favicons.
 */
type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, number> = { sm: 28, md: 38, lg: 56 };

export function CottageMark({ size = 'md', className = '' }: { size?: Size; className?: string }) {
  const px = SIZES[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M 14 100 L 14 55 L 60 16 L 106 55 L 106 100 Z"
        stroke="#1a685e"
        strokeWidth="9"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="60" cy="60" r="8" fill="#c75d3e" />
      <path
        d="M 45 93 L 45 80 C 45 72, 51 70, 60 70 C 69 70, 75 72, 75 80 L 75 93 Z"
        fill="#c75d3e"
      />
    </svg>
  );
}

/** Full lockup: cottage + sage "Helper" + clay "Haven". */
export function HelperHavenWordmark({
  size = 'md',
  className = '',
}: {
  size?: Size;
  className?: string;
}) {
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <CottageMark size={size} />
      <span className={`serif ${textSize} font-bold text-sage-900 leading-none`}>
        Helper<span className="text-clay-500">Haven</span>
      </span>
    </div>
  );
}
