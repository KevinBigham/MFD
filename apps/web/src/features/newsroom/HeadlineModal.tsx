import type { NewsItem } from '@mfd/engine';
import { PixelBadge, PixelButton, PixelModal } from '@mfd/design-system/components';
import { useGameStore, selectTeams, selectUserTeamId } from '../../app/store/game-store';
import { monoSm, navigateTo, pixelSm } from '../shared/pixelUi';

type Accent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

function importanceAccent(importance: NewsItem['importance']): Accent {
  if (importance === 'breaking') return 'gold';
  if (importance === 'major') return 'cyan';
  return 'default';
}

function importanceLabel(importance: NewsItem['importance']): string {
  if (importance === 'breaking') return 'BREAKING';
  if (importance === 'major') return 'MAJOR STORY';
  return 'WIRE NOTE';
}

interface HeadlineModalProps {
  item: NewsItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Click-through detail for a single wire story. Keeps a short, newspaper-style layout:
 * kicker, headline, body, team/player chips, and an action row that deep-links to
 * related screens (rankings, roster) when the story has teamIds/playerIds.
 *
 * The modal is pure presentational when `item` is null — it renders empty but stays
 * mounted-safe so parents can toggle `open` without remounting.
 */
export function HeadlineModal({ item, open, onOpenChange }: HeadlineModalProps) {
  const teams = useGameStore(selectTeams);
  const userTeamId = useGameStore(selectUserTeamId);

  if (!item) {
    return (
      <PixelModal
        open={open}
        onOpenChange={onOpenChange}
        title="No Story"
        accent="default"
      >
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
          No story selected.
        </div>
      </PixelModal>
    );
  }

  const accent = importanceAccent(item.importance);
  const involvesUser = item.teamIds.includes(userTeamId ?? '__none__');
  const teamChips = item.teamIds
    .map((teamId) => {
      const team = teams?.[teamId];
      const label = team ? `${team.city} ${team.name}` : teamId;
      return { teamId, label, isUser: teamId === userTeamId };
    });

  return (
    <PixelModal
      open={open}
      onOpenChange={onOpenChange}
      title={item.headline}
      description={`${importanceLabel(item.importance)} // Y${item.year} W${item.week}`}
      accent={accent}
      width={680}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant={accent}>{item.type.toUpperCase()}</PixelBadge>
          <PixelBadge variant={accent}>{importanceLabel(item.importance)}</PixelBadge>
          {involvesUser ? <PixelBadge variant="gold">INVOLVES YOUR TEAM</PixelBadge> : null}
        </div>

        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.8 }}>
          {item.body}
        </div>

        {teamChips.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ ...pixelSm, color: 'var(--mfd-text-dim)' }}>TEAMS INVOLVED</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {teamChips.map((chip) => (
                <PixelBadge key={`${item.id}-${chip.teamId}`} variant={chip.isUser ? 'gold' : 'cyan'}>
                  {chip.label}
                </PixelBadge>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
          <PixelButton
            accent="gold"
            onClick={() => {
              onOpenChange(false);
              navigateTo('/power-rankings');
            }}
          >
            Open Rankings
          </PixelButton>
          <PixelButton
            accent="cyan"
            onClick={() => {
              onOpenChange(false);
              navigateTo('/news');
            }}
          >
            Full Wire
          </PixelButton>
          <PixelButton accent="default" onClick={() => onOpenChange(false)}>
            Close
          </PixelButton>
        </div>
      </div>
    </PixelModal>
  );
}
