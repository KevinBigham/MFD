export function parseE2ESmokeArgs(args) {
  var argv = Array.isArray(args) ? args : [];
  var out = {
    distDir: 'dist',
    reportPath: 'dist/e2e-launcher-report.json',
    summaryPath: 'dist/e2e-launcher-summary.md',
    baseUrl: '',
    timeoutMs: 7000,
    retries: 1,
    noBrowser: false,
  };

  for (var i = 0; i < argv.length; i += 1) {
    var current = argv[i];
    if (current === '--dist' && argv[i + 1]) out.distDir = argv[i + 1];
    if (current === '--report' && argv[i + 1]) out.reportPath = argv[i + 1];
    if (current === '--summary' && argv[i + 1]) out.summaryPath = argv[i + 1];
    if (current === '--base-url' && argv[i + 1]) out.baseUrl = argv[i + 1];
    if (current === '--timeout' && argv[i + 1]) out.timeoutMs = Number(argv[i + 1]) || out.timeoutMs;
    if (current === '--retries' && argv[i + 1]) out.retries = Number(argv[i + 1]) || out.retries;
    if (current === '--no-browser') out.noBrowser = true;
  }

  if (out.retries < 1) out.retries = 1;
  if (out.timeoutMs < 1000) out.timeoutMs = 1000;
  return out;
}
