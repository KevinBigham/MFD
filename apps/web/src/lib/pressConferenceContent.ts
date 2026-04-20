import {
  getPressConferenceScenarioContent,
  interpolateContentPlaceholders,
  type GameDayPackage,
} from '@mfd/engine';

export interface PressConferenceTemplateContext extends Record<string, string> {
  teamName: string;
  opponentName: string;
  score: string;
  playerName: string;
  stat: string;
}

function leadPerformerName(packageData: GameDayPackage | null, fallback: string): string {
  const label = packageData?.topPerformers[0]?.label ?? '';
  const match = label.match(/^(.*?)\s+\(/);
  return (match?.[1] ?? label) || fallback;
}

function leadPerformerStat(packageData: GameDayPackage | null): string {
  return packageData?.topPerformers[0]?.statLine ?? packageData?.finalScore ?? 'a strong night';
}

export function buildPressConferenceTemplateContext(params: {
  packageData: GameDayPackage | null;
  teamName?: string | null;
  opponentName?: string | null;
  speaker?: string | null;
}): PressConferenceTemplateContext {
  const teamName = params.teamName ?? 'the club';
  const speaker = params.speaker ?? 'the room';
  return {
    teamName,
    opponentName: params.opponentName ?? 'the opponent',
    score: params.packageData?.finalScore ?? 'the final',
    playerName: leadPerformerName(params.packageData, speaker),
    stat: leadPerformerStat(params.packageData),
  };
}

export function interpolatePressConferencePool(
  pool: readonly string[],
  context: PressConferenceTemplateContext,
): string[] {
  return pool.map((entry) => interpolateContentPlaceholders(entry, context));
}

export function buildPressConferencePromptBank(
  scenario: string,
  context: PressConferenceTemplateContext,
): string[] {
  const content = getPressConferenceScenarioContent(scenario);
  return content ? interpolatePressConferencePool(content.questions, context) : [];
}
