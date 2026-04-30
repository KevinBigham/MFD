import { type SyntheticEvent, useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { PixelButton } from '@mfd/design-system/components';
import { addToWatchList, isOnWatchList, removeFromWatchList, subscribeWatchList } from './watchListPrefs';

interface WatchListPinButtonProps {
  playerId: string;
  size?: 'sm' | 'md';
}

export function toggleWatchListPin(playerId: string, pinned: boolean): boolean {
  if (pinned) {
    removeFromWatchList(playerId);
    return false;
  }
  addToWatchList(playerId);
  return true;
}

function stopRowActivation(event: SyntheticEvent<HTMLElement>): void {
  event.preventDefault();
  event.stopPropagation();
}

export function WatchListPinButton({ playerId, size = 'sm' }: WatchListPinButtonProps) {
  const [pinned, setPinned] = useState(() => isOnWatchList(playerId));

  useEffect(() => {
    const refresh = () => setPinned(isOnWatchList(playerId));
    refresh();
    return subscribeWatchList(refresh);
  }, [playerId]);

  const handleClick = (event: SyntheticEvent<HTMLButtonElement>) => {
    stopRowActivation(event);
    setPinned(toggleWatchListPin(playerId, pinned));
  };

  return (
    <PixelButton
      accent={pinned ? 'gold' : 'default'}
      onPointerDown={stopRowActivation}
      onMouseDown={stopRowActivation}
      onClick={handleClick}
      aria-label={pinned ? `Remove ${playerId} from watch list` : `Add ${playerId} to watch list`}
      style={size === 'sm' ? { minHeight: '28px', padding: '5px 8px' } : undefined}
    >
      <Star size={size === 'sm' ? 13 : 16} fill={pinned ? 'currentColor' : 'none'} aria-hidden="true" />
      {pinned ? 'Pinned' : 'Watch'}
    </PixelButton>
  );
}
