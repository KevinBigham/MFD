import { PixelButton, PixelModal, PixelPanel } from '@mfd/design-system/components';
import { buildSeasonRecap, type GameState } from '@mfd/engine';
import { useGameStore, selectUserTeam } from '../../app/store/game-store';
import { monoSm, navigateTo, pixelSm } from '../shared/pixelUi';

export interface SeasonRecapPromptProps {
  open: boolean;
  onClose: () => void;
}

export function dismissSeasonRecapPrompt(
  setSeen: (seen: boolean) => void,
  onClose: () => void,
): void {
  setSeen(true);
  onClose();
}

export function openSeasonRecapScreen(
  setSeen: (seen: boolean) => void,
  onClose: () => void,
): void {
  setSeen(true);
  onClose();
  navigateTo('/season/recap');
}

export function shouldOpenSeasonRecapPrompt(
  previousYear: number | null,
  game: GameState | null,
  teamId: string | null,
  recapPromptSeenThisSession: boolean,
): boolean {
  if (!game || !teamId || recapPromptSeenThisSession) return false;
  if (previousYear === null || game.year <= previousYear) return false;
  return buildSeasonRecap(game, teamId) !== null;
}

export function SeasonRecapPrompt({ open, onClose }: SeasonRecapPromptProps) {
  const game = useGameStore((state) => state.game);
  const team = useGameStore(selectUserTeam);
  const setSeen = useGameStore((state) => state.actions.setRecapPromptSeenThisSession);
  const recap = game && team ? buildSeasonRecap(game, team.id) : null;

  if (!team || !recap) return null;

  const dismiss = () => dismissSeasonRecapPrompt(setSeen, onClose);

  const viewRecap = () => openSeasonRecapScreen(setSeen, onClose);

  return (
    <PixelModal
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) dismiss(); }}
      title="Season Recap Ready"
      accent="cyan"
      width={500}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
          The {team.city} {team.name} wrapped up {recap.seasonYear}. Your shareable recap card is ready.
        </div>

        <PixelPanel title="Quick Look" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ ...pixelSm, color: 'var(--mfd-text-dim)' }}>RECORD</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{recap.record}</div>
            <div style={{ ...pixelSm, color: 'var(--mfd-text-dim)' }}>SEASON STORY</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{recap.seasonStory}</div>
          </div>
        </PixelPanel>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <PixelButton accent="default" onClick={dismiss}>
            Dismiss
          </PixelButton>
          <PixelButton accent="cyan" onClick={viewRecap}>
            View Season Recap
          </PixelButton>
        </div>
      </div>
    </PixelModal>
  );
}
