export function importWithTimeout(loader, timeoutMs) {
  var ms = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : 8000;

  return Promise.race([
    loader(),
    new Promise(function (_, reject) {
      setTimeout(function () {
        reject(new Error('Module runtime import timed out after ' + ms + 'ms'));
      }, ms);
    }),
  ]);
}
