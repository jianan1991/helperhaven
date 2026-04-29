import { type FiveVector, SKILL_KEYS, vectorSum } from '../../lib/profile';

/**
 * Five sliders that share a 100-point budget. We don't auto-normalise — the
 * user has to consciously redistribute, which is the point of forcing the
 * sum to 100. The footer shows the running total in clay red until the user
 * lands on exactly 100, then turns sage green.
 */
export default function FiveVectorEditor({
  value,
  onChange,
  labels,
  helpText,
}: {
  value: FiveVector;
  onChange: (next: FiveVector) => void;
  labels: Record<keyof FiveVector, string>;
  helpText?: string;
}) {
  const total = vectorSum(value);
  const remaining = 100 - total;

  return (
    <div className="space-y-4">
      {helpText && <p className="text-xs text-ink-500">{helpText}</p>}

      {SKILL_KEYS.map((key) => (
        <div key={key}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-ink-900">{labels[key]}</span>
            <span className="text-ink-500 tabular-nums">{value[key]}</span>
          </div>
          <input
            type="range"
            min={0}
            max={value[key] + remaining}
            step={1}
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: Math.min(Number(e.target.value), value[key] + remaining) })}
            className="w-full accent-sage-500"
          />
        </div>
      ))}

      <div
        className={`rounded-xl px-4 py-2.5 text-sm font-medium flex justify-between items-center ${
          total === 100
            ? 'bg-sage-50 text-sage-900 border border-sage-400/40'
            : 'bg-clay-500/10 text-clay-600 border border-clay-500/30'
        }`}
      >
        <span>Total</span>
        <span className="tabular-nums">
          {total} / 100 {remaining !== 0 && <span className="text-xs ml-1">({remaining > 0 ? `+${remaining}` : remaining})</span>}
        </span>
      </div>
    </div>
  );
}
