/*
 * Kongue runs off the main thread. The main thread can terminate us when the
 * script exceeds its time budget.
 */
var loaded = false;

function errorText(err) {
  return String((err && (err.message || err.name)) || err || 'unknown error');
}

self.onmessage = function (e) {
  if (!loaded) {
    try {
      importScripts(e.data.bundle, e.data.glue);
      loaded = true;
    } catch (err) {
      self.postMessage({
        ok: false,
        error: 'Could not load the Kongue browser runtime: ' + errorText(err),
        output: '',
        files: {}
      });
      return;
    }
  }

  try {
    if (!self.konguePlayground || !self.konguePlayground.run) {
      throw new Error('konguePlayground.run is missing after loading the runtime');
    }
    self.postMessage(self.konguePlayground.run(e.data.code, e.data.entry || 'main'));
  } catch (err) {
    self.postMessage({
      ok: false,
      error: 'Kongue worker failed: ' + errorText(err),
      output: '',
      files: {}
    });
  }
};
