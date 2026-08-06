/**
 * Types for the parts of the surface-map generator that TypeScript consumes.
 *
 * `route-surface-map.test.ts` imports `SURFACE_TYPES` rather than restating it,
 * so the test cannot quietly agree with a generator that has drifted.
 */

export declare const SURFACE_TYPES: Record<string, string>;
export declare const FREQUENCIES: Record<string, string>;
export declare const URGENCIES: Record<string, string>;
export declare function readMatrixRows(csv: string): Record<string, string>[];
export declare function generateSurfaceMap(csv: string): string;
