import type { CSSProperties } from 'react';

interface MaterialIconProps {
  name: string;
  className?: string;
  filled?: boolean;
  style?: CSSProperties;
}

/** Material Symbols Outlined ligature icon (used by the admin & membership screens). */
export function MaterialIcon({ name, className = '', filled = false, style }: MaterialIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`.trim()}
      style={style}
    >
      {name}
    </span>
  );
}
