/**
 * Displays a team logo image from public/logos/{icon}.png.
 * Logos are ~1.84:1 aspect ratio (512x279). The `size` prop controls height;
 * width scales proportionally.
 */
import { useCallback, useRef } from 'react';

const ASPECT = 512 / 279; // width / height

interface TeamLogoProps {
  /** The team's icon field (lowercase abbreviation, e.g. 'kc') */
  icon: string;
  /** Display height in pixels (width derived from aspect ratio) */
  size?: number;
  /** Alt text — defaults to icon uppercase */
  alt?: string;
}

export function TeamLogo({ icon, size = 32, alt }: TeamLogoProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  const handleError = useCallback(() => {
    const el = imgRef.current;
    if (el) el.style.display = 'none';
  }, []);

  const w = Math.round(size * ASPECT);

  return (
    <img
      ref={imgRef}
      src={`logos/${icon}.png`}
      alt={alt ?? icon.toUpperCase()}
      width={w}
      height={size}
      onError={handleError}
      style={{ flexShrink: 0, borderRadius: 'var(--mfd-rad-sm)', objectFit: 'contain' }}
    />
  );
}
