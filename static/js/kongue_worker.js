/*
 * Kongue runs off the main thread.
 *
 * The interpreter is a synchronous tree-walker with no yield point, so a long
 * loop on the main thread freezes the page. Here the main thread can simply
 * terminate us. See kongue_cells.js for the timeout.
 */
var loaded = false;

self.onmessage = function (e) {
  if (!loaded) {
    importScripts(e.data.bundle, e.data.glue);
    loaded = true;
  }
  var res;
  try {
    res = self.konguePlayground.run(e.data.code, e.data.entry || 'main');
  } catch (err) {
    res = {
      ok: false,
      error: String((err && err.message) || err),
      output: '',
      files: {}
    };
  }
  self.postMessage(res);
};
