import type { WeatherCondition } from '@mfd/engine';

export type WeatherImpactSeverity = 'none' | 'notable' | 'game_changer';

export interface WeatherImpactCopy {
  label: string;
  headline: string;
  detail: string;
  inboxBody: string | null;
  severity: WeatherImpactSeverity;
}

export function getWeatherImpactCopy(weather: WeatherCondition | null | undefined): WeatherImpactCopy {
  if (weather === 'rain') {
    return {
      label: 'rain',
      headline: 'Rain favors ball control',
      detail: 'Saved rain conditions dampen passing quality and raise ball-security risk. Lean on clean handling, efficient throws, and patient drives.',
      inboxBody: 'Rain is in the forecast. Passing quality will tighten and ball security matters more, so lean on clean handling and patient drives.',
      severity: 'notable',
    };
  }
  if (weather === 'snow') {
    return {
      label: 'snow',
      headline: 'Snow changes the play sheet',
      detail: 'Saved snow conditions drag passing and rushing efficiency while raising fumble risk. Short fields and ball security matter more than volume.',
      inboxBody: 'Snow is in the forecast. Passing and rushing efficiency tighten while fumble risk rises, so short fields and ball security matter.',
      severity: 'game_changer',
    };
  }
  if (weather === 'wind') {
    return {
      label: 'wind',
      headline: 'Wind stresses explosives',
      detail: 'Saved wind conditions make long field goals and vertical shots more volatile. Treat deep attempts and late-game kicking choices with extra caution.',
      inboxBody: 'Heavy wind is in the forecast. Long field goals and deep passing will be volatile, so late-game field position matters.',
      severity: 'game_changer',
    };
  }
  if (weather === 'dome') {
    return {
      label: 'dome',
      headline: 'Dome conditions are controlled',
      detail: 'Saved dome conditions remove weather penalties. The full game plan is available.',
      inboxBody: null,
      severity: 'none',
    };
  }
  return {
    label: 'clear',
    headline: 'Standard conditions',
    detail: 'Saved clear conditions carry no weather penalty. Call the full game plan.',
    inboxBody: null,
    severity: 'none',
  };
}
