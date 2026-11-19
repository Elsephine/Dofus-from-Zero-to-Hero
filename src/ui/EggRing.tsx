// Œuf entouré d'un anneau de progression, teinté de la couleur de l'œuf.
import { eggColors } from '../data/egg-colors';

export const eggColor = (image?: string | null) => (image && eggColors[image]) || '#c8283c';

export function EggRing({ src, image, pct, size = 88, stroke = 5 }: { src: string; image?: string | null; pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const col = eggColor(image);
  return (
    <span className={`egg-ring${pct >= 100 ? ' full' : ''}`} style={{ width: size, height: size, '--egg': col } as React.CSSProperties}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, pct) / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <img src={src} alt="" loading="lazy" />
    </span>
  );
}
