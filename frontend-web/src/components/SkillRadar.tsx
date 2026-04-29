import type { FiveVector } from '../lib/profile';

const AXES: { key: keyof FiveVector; label: string }[] = [
  { key: 'infant',   label: 'Infant care' },
  { key: 'elderly',  label: 'Elderly care' },
  { key: 'cooking',  label: 'Cooking' },
  { key: 'house',    label: 'Housework' },
  { key: 'attitude', label: 'Attitude' },
];

const CX = 170;
const CY = 130;
const MAX_R = 88;
const LABEL_R = 116;

function axisAngle(i: number) {
  return (Math.PI * 2 * i) / 5 - Math.PI / 2;
}

function polarPt(r: number, i: number) {
  const a = axisAngle(i);
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function polyPoints(values: number[]) {
  return values
    .map((v, i) => {
      const pt = polarPt(MAX_R * (v / 100), i);
      return `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`;
    })
    .join(' ');
}

function bgPoints(frac: number) {
  return AXES.map((_, i) => {
    const pt = polarPt(MAX_R * frac, i);
    return `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`;
  }).join(' ');
}

function textAnchor(i: number): 'middle' | 'start' | 'end' {
  if (i === 0) return 'middle';
  if (i === 1 || i === 2) return 'start';
  return 'end';
}

export function helperArchetype(scores: FiveVector): { label: string; specialist: boolean } {
  const vals = AXES.map((a) => scores[a.key]);
  const max = Math.max(...vals);
  if (max >= 35) {
    const idx = vals.indexOf(max);
    return { label: `${AXES[idx].label} specialist`, specialist: true };
  }
  return { label: 'All-rounder', specialist: false };
}

export default function SkillRadar({ scores }: { scores: FiveVector }) {
  const vals = AXES.map((a) => scores[a.key]);

  return (
    <svg
      viewBox="0 0 340 260"
      className="w-full"
      aria-hidden="true"
    >
      {/* Background reference rings */}
      {[0.25, 0.5, 0.75, 1].map((frac) => (
        <polygon
          key={frac}
          points={bgPoints(frac)}
          fill="none"
          stroke="#e8e0d5"
          strokeWidth="1"
        />
      ))}

      {/* Axis spokes */}
      {AXES.map((_, i) => {
        const pt = polarPt(MAX_R, i);
        return (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={pt.x.toFixed(2)}
            y2={pt.y.toFixed(2)}
            stroke="#e8e0d5"
            strokeWidth="1"
          />
        );
      })}

      {/* Score polygon */}
      <polygon
        points={polyPoints(vals)}
        fill="#5c7a6b"
        fillOpacity="0.2"
        stroke="#5c7a6b"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Score dots */}
      {vals.map((v, i) => {
        const pt = polarPt(MAX_R * (v / 100), i);
        return (
          <circle
            key={i}
            cx={pt.x.toFixed(2)}
            cy={pt.y.toFixed(2)}
            r="4"
            fill="#5c7a6b"
          />
        );
      })}

      {/* Axis labels */}
      {AXES.map((axis, i) => {
        const pt = polarPt(LABEL_R, i);
        return (
          <text
            key={axis.key}
            x={pt.x.toFixed(2)}
            y={pt.y.toFixed(2)}
            textAnchor={textAnchor(i)}
            dominantBaseline="middle"
            fontSize="11"
            fill="#4a4035"
            fontFamily="system-ui, sans-serif"
          >
            {axis.label}
          </text>
        );
      })}

      {/* Score values near dots */}
      {vals.map((v, i) => {
        const dot = polarPt(MAX_R * (v / 100), i);
        const off = 14;
        const a = axisAngle(i);
        return (
          <text
            key={i}
            x={(dot.x + off * Math.cos(a)).toFixed(2)}
            y={(dot.y + off * Math.sin(a)).toFixed(2)}
            textAnchor={textAnchor(i)}
            dominantBaseline="middle"
            fontSize="9.5"
            fill="#5c7a6b"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            {v}
          </text>
        );
      })}
    </svg>
  );
}
