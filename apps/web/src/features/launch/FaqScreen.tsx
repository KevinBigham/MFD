import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import { SAVE_VERSION } from '@mfd/engine';
import { PixelScreenHeader, monoSm, screenStackStyle } from '../shared/pixelUi';

const FAQ_ENTRIES = [
  {
    question: 'What is MFD?',
    answer: 'A browser-based football franchise dynasty sim about running the roster, staff, cap, game plan, media cycle, and long-term legacy.',
  },
  {
    question: 'How long is a season?',
    answer: 'A dynasty season follows the football calendar from preseason through the championship, then rolls into offseason decisions and the next year.',
  },
  {
    question: 'Can I play multiple dynasties?',
    answer: 'Yes. You can start a new dynasty and use the save/load cartridge tools to preserve or move a dynasty backup.',
  },
  {
    question: "What's Call Your Shot?",
    answer: 'A weekly declaration on your game plan. If the team hits the target, the result is reflected in the postgame story and film-room receipt.',
  },
  {
    question: 'How do saves work?',
    answer: `The game autosaves in browser storage and can export portable dynasty backups. Current saves use schema version ${SAVE_VERSION}.`,
  },
  {
    question: "What's rivalry heat?",
    answer: 'Rivalry heat tracks friction between teams as matchups, playoff history, dramatic finishes, and league events stack up over time.',
  },
  {
    question: 'Can I turn off audio?',
    answer: 'Yes. Settings includes master audio, music, SFX, UI, and commentary toggles plus volume controls.',
  },
  {
    question: 'How do I report a bug?',
    answer: 'Use the GitHub repository issue tracker and include the route, save version, browser, and the latest error-boundary context if available.',
  },
];

export function FaqScreen() {
  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="FAQ"
        subtitle="Fast answers for a first public launch visit."
        badges={<PixelBadge variant="cyan">{FAQ_ENTRIES.length} ANSWERS</PixelBadge>}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {FAQ_ENTRIES.map((entry) => (
          <PixelPanel key={entry.question} title={entry.question} accent="default">
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              {entry.answer}
            </div>
          </PixelPanel>
        ))}
      </div>
    </div>
  );
}
