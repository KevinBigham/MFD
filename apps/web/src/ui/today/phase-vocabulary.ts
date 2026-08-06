/**
 * The one place the app says what a season phase is called and what it is for.
 *
 * These words already shipped in `features/monday-briefing/PhaseIndicator.tsx`
 * and are reproduced exactly — amendment A1 pins legacy rendered copy, and the
 * tips are the phase explanations the audit wanted Today to lead with, so
 * rewriting them would both break A1 and throw away working copy.
 *
 * The legacy indicator prints `label` all-caps with a legacy accent colour; the
 * new shell prints `title` and owns its own palette. Two presentations, one
 * vocabulary. Colour deliberately does not live here: it is the one thing the
 * two shells genuinely disagree about.
 */

export interface PhaseVocabulary {
  /** All-caps kicker, as the legacy phase strip renders it. */
  label: string;
  /** Title case, for the new shell's context line. */
  title: string;
  /** What this phase is for. Doubles as the empty-state reason on Today. */
  tip: string;
}

const PHASE_VOCABULARY: Record<string, Omit<PhaseVocabulary, 'title'>> = {
  preseason: {
    label: 'PRESEASON',
    tip: 'Set roster, depth chart, and Game Plan before the regular season begins.',
  },
  regular_season: {
    label: 'REGULAR SEASON',
    tip: 'Set injuries, depth, and Game Plan before Advance Week; standings punish missed weekly choices.',
  },
  playoffs: {
    label: 'PLAYOFFS',
    tip: 'Set health, depth, and matchup calls now; one missed assignment ends the season.',
  },
  offseason: {
    label: 'OFFSEASON',
    tip: 'Re-sign core players, clear cap space, and save room for Free Agency bids.',
  },
  free_agency: {
    label: 'FREE AGENCY',
    tip: 'Sign free agents for open starter or backup jobs before the draft.',
  },
  draft: {
    label: 'DRAFT',
    tip: 'Pick players for named starter, backup, or development jobs.',
  },
  post_draft: {
    label: 'POST-DRAFT',
    tip: 'Set rookie roles and roster cuts before camp opens.',
  },
  training_camp: {
    label: 'TRAINING CAMP',
    tip: 'Assign rookie reps, veteran jobs, and injury backup plans before Week 1.',
  },
};

/**
 * An unknown phase gets its own identifier back, spaced out, rather than a
 * guess or a throw. A phase the engine grows later must be legible on screen
 * before anyone gets round to writing copy for it.
 */
function fallbackLabel(phase: string): string {
  return phase.toUpperCase().replace(/_/g, ' ');
}

/** Capitalises after spaces and hyphens, so `POST-DRAFT` reads `Post-Draft`. */
function titleCase(label: string): string {
  return label.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_match, separator: string, letter: string) =>
    separator + letter.toUpperCase());
}

export function phaseVocabulary(phase: string): PhaseVocabulary {
  const known = PHASE_VOCABULARY[phase];
  const label = known?.label ?? fallbackLabel(phase);
  return { label, title: titleCase(label), tip: known?.tip ?? '' };
}

export const KNOWN_PHASES: readonly string[] = Object.keys(PHASE_VOCABULARY);
