import type { CSSProperties } from 'react';

export interface ExportFrameOptions {
  title: string;
  subtitle?: string;
  footer: string;
  themeVars?: CSSProperties;
}

export interface ExportFrameHandle {
  frame: HTMLElement;
  cleanup: () => void;
}

function applyStyles(target: HTMLElement, styles: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(styles)) {
    if (!value) continue;
    const propertyName = key.startsWith('--')
      ? key
      : key.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
    target.style.setProperty(propertyName, value);
  }
}

function createTextBlock(tagName: 'div' | 'span', text: string, styles: Record<string, string>): HTMLElement {
  const element = document.createElement(tagName);
  element.textContent = text;
  applyStyles(element, styles);
  return element;
}

export function createExportFrame(node: HTMLElement, options: ExportFrameOptions): ExportFrameHandle {
  if (typeof document === 'undefined') {
    return {
      frame: node,
      cleanup: () => undefined,
    };
  }

  const frame = document.createElement('div');
  frame.setAttribute('data-export-frame', 'true');
  applyStyles(frame, {
    '--mfd-team-primary': 'var(--mfd-gold)',
    '--mfd-team-secondary': 'var(--mfd-cyan)',
    '--mfd-team-tertiary': 'var(--mfd-red)',
    width: '960px',
    boxSizing: 'border-box',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    background: 'var(--mfd-bg)',
    color: 'var(--mfd-text)',
    position: 'fixed',
    left: '-10000px',
    top: '0',
    zIndex: '-1',
  });
  applyStyles(frame, (options.themeVars ?? {}) as Record<string, string | undefined>);

  const header = document.createElement('div');
  applyStyles(header, {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'center',
    textAlign: 'center',
  });

  const title = createTextBlock('div', options.title, {
    fontFamily: 'var(--mfd-font-display), "Press Start 2P", monospace',
    fontSize: '32px',
    lineHeight: '1.2',
  });
  title.setAttribute('data-export-frame-title', 'true');

  const rule = document.createElement('div');
  rule.setAttribute('data-export-frame-rule', 'true');
  applyStyles(rule, {
    width: '100%',
    height: '4px',
    background: 'var(--mfd-team-primary)',
  });

  header.appendChild(title);
  header.appendChild(rule);

  if (options.subtitle) {
    const subtitle = createTextBlock('div', options.subtitle, {
      fontFamily: 'var(--mfd-font-mono), "JetBrains Mono", monospace',
      fontSize: '12px',
      lineHeight: '1.6',
      color: 'var(--mfd-text-dim)',
    });
    subtitle.setAttribute('data-export-frame-subtitle', 'true');
    header.appendChild(subtitle);
  }

  const content = document.createElement('div');
  content.setAttribute('data-export-frame-content', 'true');
  applyStyles(content, {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  });
  content.appendChild(node.cloneNode(true) as HTMLElement);

  const footer = createTextBlock('div', options.footer, {
    fontFamily: 'var(--mfd-font-mono), "JetBrains Mono", monospace',
    fontSize: '11px',
    lineHeight: '1.6',
    color: 'var(--mfd-text-dim)',
    textTransform: 'uppercase',
    textAlign: 'right',
  });
  footer.setAttribute('data-export-frame-footer', 'true');

  frame.appendChild(header);
  frame.appendChild(content);
  frame.appendChild(footer);
  document.body?.appendChild(frame);

  return {
    frame,
    cleanup: () => {
      frame.remove();
    },
  };
}
