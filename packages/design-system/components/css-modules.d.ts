/**
 * CSS Module typings for the v2 components.
 *
 * `apps/web` gets these from `vite/client`; this package has no Vite config of
 * its own, so it declares them directly. Kept deliberately loose — a generated
 * per-file typing would need a build step, and the class names are already
 * pinned by the stylesheet assertions in the component tests.
 */

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
