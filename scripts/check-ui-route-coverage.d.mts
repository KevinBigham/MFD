/**
 * Types for the subset of the route-coverage gate that TypeScript consumes.
 *
 * `route-surface-map.test.ts` reuses the gate's CSV reader so the runtime map
 * and the audited matrix are compared by one parser, not two that can disagree.
 */

export declare function parseCsv(text: string): string[][];
