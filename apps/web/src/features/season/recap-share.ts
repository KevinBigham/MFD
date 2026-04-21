import type { SeasonRecap } from '@mfd/engine';

function recapPlayoffLabel(playoffResult: SeasonRecap['playoffResult']): string {
  switch (playoffResult) {
    case 'champion':
      return 'Champion';
    case 'championship-loss':
      return 'Championship Loss';
    case 'conf-loss':
      return 'Conference Final Loss';
    case 'division-loss':
      return 'Division Round Loss';
    case 'wild-card-loss':
      return 'Wild Card Loss';
    case 'missed':
    default:
      return 'Missed Playoffs';
  }
}

export function formatRecapAsText(recap: SeasonRecap): string {
  const lines = [
    `${recap.teamCity} ${recap.teamName} ${recap.seasonYear} Season Recap`,
    `Motto: ${recap.teamMotto ?? 'No motto on file.'}`,
    `Record: ${recap.record}`,
    `Division Finish: ${recap.divisionFinish}`,
    `Conference Finish: ${recap.conferenceFinish}`,
    `Playoff Result: ${recapPlayoffLabel(recap.playoffResult)}`,
    `Story: ${recap.seasonStory}`,
  ];

  if (recap.teamAwards.length > 0) {
    lines.push(`Awards: ${recap.teamAwards.join(', ')}`);
  }

  if (recap.topPerformers.passingLeader) {
    lines.push(
      `Passing Leader: ${recap.topPerformers.passingLeader.playerName} (${recap.topPerformers.passingLeader.value.toLocaleString()} pass yds)`,
    );
  }

  if (recap.topPerformers.rushingLeader) {
    lines.push(
      `Rushing Leader: ${recap.topPerformers.rushingLeader.playerName} (${recap.topPerformers.rushingLeader.value.toLocaleString()} rush yds)`,
    );
  }

  if (recap.breakoutCandidates.length > 0) {
    lines.push(
      `Breakouts: ${recap.breakoutCandidates.map((candidate) => candidate.playerName).join(', ')}`,
    );
  }

  return lines.join('\n');
}

export async function exportRecapAsPng(node: HTMLElement): Promise<string> {
  const { toPng } = await import('html-to-image');
  return toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#000000',
  });
}

export async function copyRecapAsText(recap: SeasonRecap): Promise<string> {
  const summary = formatRecapAsText(recap);
  if (!navigator?.clipboard?.writeText) {
    throw new Error('Clipboard API is unavailable.');
  }
  await navigator.clipboard.writeText(summary);
  return summary;
}
