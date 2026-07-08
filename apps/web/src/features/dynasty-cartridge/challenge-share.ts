export interface DynastyChallengeShareInput {
  teamName: string;
  season: number;
  week: number;
  cartridge: string;
  sizeBytes: number;
}

export function formatDynastyChallengeShare(input: DynastyChallengeShareInput): string {
  return [
    `MFD Dynasty Challenge: ${input.teamName}`,
    `Checkpoint: Season ${input.season}, Week ${input.week}`,
    `Cartridge Size: ${input.sizeBytes} bytes`,
    'Load this cartridge and try to beat the next four weeks.',
    input.cartridge,
  ].join('\n');
}
