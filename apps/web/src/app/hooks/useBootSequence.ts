import { useState, useEffect, useRef } from 'react';

interface BootLine {
  text: string;
  delay: number;
  color?: string;
}

const BOOT_LINES: BootLine[] = [
  { text: 'MR. FOOTBALL DYNASTY', delay: 0, color: 'var(--mfd-gold)' },
  { text: 'v1.0.0-beta // BUILD 28 — CONVENTION EDITION', delay: 120 },
  { text: '', delay: 200 },
  { text: 'Initializing engine core...', delay: 280 },
  { text: 'RNG channels: 7 seeded [OK]', delay: 400 },
  { text: '140+ simulation systems loaded [OK]', delay: 480 },
  { text: 'Config loaded: positions, schemes, coaching, cap-math [OK]', delay: 600 },
  { text: 'Systems online: 1,125 tests verified [OK]', delay: 720 },
  { text: 'Save pipeline: v25 migration chain // Dexie slots [OK]', delay: 840 },
  { text: '', delay: 900 },
  { text: 'Design system: 8-BIT ESPN // 31 components [OK]', delay: 1000 },
  { text: 'All systems nominal.', delay: 1150, color: 'var(--mfd-green)' },
  { text: '', delay: 1250 },
  { text: 'Ready._', delay: 1400, color: 'var(--mfd-gold)' },
];

const BOOT_KEY = 'mfd-boot-seen';

export function useBootSequence() {
  const [visibleLines, setVisibleLines] = useState<BootLine[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const seen = sessionStorage.getItem(BOOT_KEY);
    if (seen) {
      setIsComplete(true);
      return;
    }
    setShouldShow(true);

    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < BOOT_LINES.length; i++) {
      const line = BOOT_LINES[i];
      if (!line) continue;
      const t = setTimeout(() => {
        setVisibleLines((prev) => [...prev, line]);
      }, line.delay);
      timers.push(t);
    }

    const lastLine = BOOT_LINES[BOOT_LINES.length - 1];
    const finishTimer = setTimeout(() => {
      sessionStorage.setItem(BOOT_KEY, '1');
      setIsComplete(true);
    }, (lastLine?.delay ?? 0) + 1200);
    timers.push(finishTimer);

    timersRef.current = timers;

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  function skip() {
    timersRef.current.forEach(clearTimeout);
    sessionStorage.setItem(BOOT_KEY, '1');
    setIsComplete(true);
  }

  return { visibleLines, isComplete, shouldShow, skip };
}
