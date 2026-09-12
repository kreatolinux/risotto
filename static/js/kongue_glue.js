/*
 * Browser embedding for Kongue.
 *
 * Kongue's native `exec` uses a host process. A browser JavaScript bundle has
 * no process-spawning API, so this hook deliberately does not run commands.
 * The message is returned as normal output so a tutorial cell can explain the
 * limitation without pretending that a shell exists.
 */
(function (global) {
  'use strict';

  var lastFiles = {};
  var EXEC_MESSAGE =
    '[exec unavailable] This code is running as browser JavaScript, so it cannot ' +
    'spawn processes. The command was not run.';

  global.kongueExec = function (_command) {
    return JSON.stringify({ output: EXEC_MESSAGE, exitCode: 0 });
  };

  function run(code, entrypoint) {
    if (typeof global.kongueRun !== 'function') {
      throw new Error('kongue.js is not loaded: kongueRun is missing');
    }

    var lines = [];
    var originalLog = console.log;
    console.log = function () {
      lines.push(Array.prototype.slice.call(arguments).join(' '));
    };

    var raw;
    try {
      raw = global.kongueRun(code || '', entrypoint || 'main');
    } catch (e) {
      raw = JSON.stringify({
        ok: false,
        error: String((e && e.message) || e),
        files: {}
      });
    } finally {
      console.log = originalLog;
    }

    var res;
    try {
      res = JSON.parse(raw);
    } catch (e) {
      res = { ok: false, error: 'Unreadable result from kongueRun: ' + raw, files: {} };
    }

    res.output = lines.join('\n');
    lastFiles = res.files || {};
    return res;
  }

  global.konguePlayground = {
    run: run,
    lastFiles: function () { return lastFiles; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
