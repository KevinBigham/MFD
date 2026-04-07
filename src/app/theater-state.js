export function buildTheaterState(options) {
  var settings = options || {};
  var result = settings.result || { log: [] };
  var totalDrives = result && result.log ? result.log.length : 0;
  var skipPresentation = !!settings.skipPresentation;

  return {
    result: result,
    driveIdx: skipPresentation ? totalDrives : 0,
    speed: settings.speed || 'normal',
    paused: skipPresentation ? true : !!settings.paused,
    homeTeam: settings.homeTeam || null,
    awayTeam: settings.awayTeam || null,
    gameRef: settings.gameRef || null,
    decisions: skipPresentation ? [] : settings.decisions || [],
    decisionActive: null,
    quickSim: skipPresentation,
  };
}
