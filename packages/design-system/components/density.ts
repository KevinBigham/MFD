/**
 * Density is a size preference, not a second information architecture.
 *
 * Switching modes changes spacing and row height. It never changes which
 * tasks exist, what they are called, which routes are reachable, or what is
 * marked urgent — the audit found MFD already has one competing navigation map
 * too many, and a compact mode that hides capabilities would be another.
 *
 * The typed accessor exists so no component hardcodes the attribute string and
 * drifts from `density-v2.css`.
 */

export type DensityMode = 'comfortable' | 'compact';

export const DEFAULT_DENSITY_MODE: DensityMode = 'comfortable';

export const DENSITY_ATTRIBUTE = 'data-mfd-density';

export function normalizeDensityMode(value: unknown): DensityMode {
  return value === 'compact' || value === 'comfortable' ? value : DEFAULT_DENSITY_MODE;
}

/**
 * Props for the container that owns a density scope.
 *
 * Comfortable emits nothing: it is the value the tokens already carry, so the
 * attribute only ever appears when something is genuinely narrower than default.
 */
export function densityProps(mode: DensityMode): Record<string, string> {
  return mode === 'compact' ? { [DENSITY_ATTRIBUTE]: 'compact' } : {};
}
