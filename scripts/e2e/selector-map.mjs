export var SELECTOR_MAP = Object.freeze({
  tabList: '[role="tablist"]',
  tabPlay: '#tab-play',
  tabStatus: '#tab-status',
  panelPlay: '#panel-play',
  panelStatus: '#panel-status',
  diagnostics: 'Diagnostics:',
  playOpenDirect: 'Open legacy directly',
  playRetry: 'Retry Launch',
  playWarning: 'Playability Check Warning',
  playError: 'Legacy Launch Error',
  runtimeVersion: 'Legacy runtime version:',
  statusRuntimeTitle: 'Validation Runtime',
  statusSummaryTitle: 'Extraction Summary',
  missingAssetsBanner: 'Missing or invalid legacy assets detected.',
});

export function getSelector(name) {
  if (!name) return '';
  return SELECTOR_MAP[name] || '';
}

export function hasSelector(name) {
  return getSelector(name).length > 0;
}
