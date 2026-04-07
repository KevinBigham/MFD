export var APP_TITLE = 'MR. FOOTBALL DYNASTY';
export var APP_SUBTITLE = '';

export var MODE_COPY = Object.freeze({
  play: {
    tabLabel: 'Play Now',
    title: 'Play Legacy Build',
    loading: 'Loading legacy game...',
    retry: 'Retry Launch',
    openDirect: 'Open legacy directly',
    recoveryHint: 'If retry fails, open direct or switch to Module Status while assets recover.',
  },
  status: {
    tabLabel: 'Module Status',
  },
});

export var STORAGE_MODE_KEY = 'mfd.bootMode';

export var STATUS_COPY = Object.freeze({
  loadingTitle: 'Loading Module Validation',
  loadingBody: 'Running extracted module checks...',
  errorTitle: 'Module Validation Error',
  retryLabel: 'Retry Validation',
  runtimeTitle: 'Runtime Validation',
  systemsTitle: 'Extracted Module Status',
  summaryTitle: 'Phase 1 Summary',
  filesLabel: 'Files extracted:',
  systemsLabel: 'Systems:',
  narrativeLabel: 'Narrative/Data:',
  buildLabel: 'Build system:',
  originalLabel: 'Original game:',
});
