import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

const routeTransitionKeyframes = `
@keyframes mfdRouteEnter {
  0% {
    opacity: 0;
    transform: translateY(14px);
    filter: blur(6px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}
`;

export function useReducedMotionPreference(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  ));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(media.matches);

    handleChange();
    media.addEventListener?.('change', handleChange);
    media.addListener?.(handleChange);

    return () => {
      media.removeEventListener?.('change', handleChange);
      media.removeListener?.(handleChange);
    };
  }, []);

  return reducedMotion;
}

export function getRouteTransitionStyle(reducedMotion: boolean): CSSProperties {
  if (reducedMotion) {
    return {
      animation: 'none',
      opacity: 1,
      transform: 'none',
      filter: 'none',
    };
  }

  return {
    animation: 'mfdRouteEnter 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    willChange: 'opacity, transform, filter',
  };
}

interface RouteTransitionFrameProps {
  pathname: string;
  reducedMotion: boolean;
  children: ReactNode;
}

export function RouteTransitionFrame({ pathname, reducedMotion, children }: RouteTransitionFrameProps) {
  return (
    <>
      <style>{routeTransitionKeyframes}</style>
      <div key={pathname} data-route-transition={pathname} style={getRouteTransitionStyle(reducedMotion)}>
        {children}
      </div>
    </>
  );
}

interface RouteTransitionProps {
  pathname: string;
  children: ReactNode;
}

export function RouteTransition({ pathname, children }: RouteTransitionProps) {
  const reducedMotion = useReducedMotionPreference();

  return (
    <RouteTransitionFrame pathname={pathname} reducedMotion={reducedMotion}>
      {children}
    </RouteTransitionFrame>
  );
}
