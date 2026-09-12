/*
 * Page wiring for runnable Kongue cells.
 *
 * Hugo's render hook emits the cell markup; this adds Kongue-specific
 * highlighting and makes Run work through a worker with a timeout.
 */
(function () {
  'use strict';

  var CFG = window.KONGUE || {};
  var TIMEOUT = CFG.timeout || 2000;

  /* ---------- highlighting ---------- */

  var KEYWORDS = ('main build prepare check install postinstall if else for in func ' +
    'local global env exec print echo cd write append continue break object true false').split(' ');
  var KW = {};
  KEYWORDS.forEach(function (k) { KW[k] = true; });

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Order matters: triple-quoted strings before quotes, comments before words.
  var TOKEN = /("""[\s\S]*?""")|("(?:[^"\\\n]|\\.)*")|('(?:[^'\\\n]|\\.)*')|(#[^\n]*)|(\$\{[^}]*\}|\$[a-zA-Z_][a-zA-Z0-9_]*)|([a-zA-Z_][a-zA-Z0-9_-]*)|(\d+)/g;

  function highlight(src) {
    var out = '';
    var last = 0;
    var m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(src)) !== null) {
      out += esc(src.slice(last, m.index));
      var t = m[0];
      var cls = null;
      if (m[1] || m[2] || m[3]) cls = 'k-str';
      else if (m[4]) cls = 'k-com';
      else if (m[5]) cls = 'k-var';
      else if (m[6]) { if (KW[t]) cls = 'k-kw'; }
      else if (m[7]) cls = 'k-num';
      out += cls ? '<span class="' + cls + '">' + esc(t) + '</span>' : esc(t);
      last = m.index + t.length;
    }
    return out + esc(src.slice(last));
  }

  /* ---------- running ---------- */

  function sourceOf(cell) {
    var input = cell.querySelector('.kongue-cell__input');
    if (input && !input.hidden) return input.value;
    var code = cell.querySelector('.kongue-cell__code');
    return code ? code.textContent : '';
  }

  function renderResult(cell, r) {
    var out = cell.querySelector('.kongue-cell__out');
    var status = cell.querySelector('.kongue-cell__status');
    var text = r.output || '';

    var files = r.files || {};
    var names = Object.keys(files);
    if (names.length) {
      text += (text ? '\n\n' : '') + '--- files written ---\n';
      names.forEach(function (n) {
        text += n + '\n' + files[n] + '\n';
      });
    }

    if (!r.ok) {
      text = (text ? text + '\n' : '') + 'error: ' + r.error;
    }

    out.textContent = text || '(no output)';
    out.hidden = false;
    out.className = 'kongue-cell__out' + (r.ok ? '' : ' kongue-cell__out--err');
    status.textContent = r.ok ? 'ok' : 'failed';
    status.className = 'kongue-cell__status' + (r.ok ? '' : ' kongue-cell__status--err');
  }

  function errorText(err) {
    return String((err && (err.message || err.name)) || err || 'unknown error');
  }

  function runCell(cell) {
    var runBtn = cell.querySelector('.kongue-cell__run');
    var out = cell.querySelector('.kongue-cell__out');
    var status = cell.querySelector('.kongue-cell__status');

    if (!CFG.worker || typeof Worker === 'undefined') {
      out.hidden = false;
      out.className = 'kongue-cell__out kongue-cell__out--err';
      out.textContent = 'This browser has no Web Worker support, so the runner is disabled.';
      return;
    }

    runBtn.disabled = true;
    status.textContent = 'running…';
    status.className = 'kongue-cell__status';
    out.hidden = false;
    out.className = 'kongue-cell__out';
    out.textContent = '';

    var w;
    try {
      w = new Worker(CFG.worker);
    } catch (err) {
      runBtn.disabled = false;
      out.className = 'kongue-cell__out kongue-cell__out--err';
      out.textContent = 'Could not start the Kongue worker: ' + errorText(err);
      status.textContent = 'error';
      status.className = 'kongue-cell__status kongue-cell__status--err';
      return;
    }
    var settled = false;

    var timer = setTimeout(function () {
      if (settled) return;
      settled = true;
      w.terminate();
      runBtn.disabled = false;
      out.className = 'kongue-cell__out kongue-cell__out--err';
      out.textContent = 'Stopped: still running after ' + TIMEOUT + ' ms.';
      status.textContent = 'timeout';
      status.className = 'kongue-cell__status kongue-cell__status--err';
    }, TIMEOUT);

    w.onmessage = function (e) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      w.terminate();
      runBtn.disabled = false;
      renderResult(cell, e.data || { ok: false, error: 'no result' });
    };

    w.onerror = function (e) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      w.terminate();
      runBtn.disabled = false;
      out.className = 'kongue-cell__out kongue-cell__out--err';
      out.textContent = 'Runner error: ' + errorText(e) +
        ' [' + CFG.worker + ']';
      status.textContent = 'error';
      status.className = 'kongue-cell__status kongue-cell__status--err';
    };

    w.onmessageerror = function () {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      w.terminate();
      runBtn.disabled = false;
      out.className = 'kongue-cell__out kongue-cell__out--err';
      out.textContent = 'Runner returned an unreadable result.';
      status.textContent = 'error';
      status.className = 'kongue-cell__status kongue-cell__status--err';
    };

    w.postMessage({
      code: sourceOf(cell),
      entry: cell.getAttribute('data-entry') || 'main',
      bundle: CFG.bundle,
      glue: CFG.glue
    });
  }

  /* ---------- editing ---------- */

  function toggleEdit(cell) {
    var code = cell.querySelector('.kongue-cell__code');
    var input = cell.querySelector('.kongue-cell__input');
    var btn = cell.querySelector('.kongue-cell__edit');
    if (!code || !input || !btn) return;

    if (input.hidden) {
      input.value = code.textContent;
      input.hidden = false;
      code.hidden = true;
      btn.textContent = 'Done';
      input.focus();
    } else {
      code.innerHTML = highlight(input.value);
      code.hidden = false;
      input.hidden = true;
      btn.textContent = 'Edit';
    }
  }

  /* ---------- init ---------- */

  function init() {
    var cells = document.querySelectorAll('.kongue-cell');
    for (var i = 0; i < cells.length; i++) {
      (function (cell) {
        var code = cell.querySelector('.kongue-cell__code');
        // Add Kongue-specific colours to the plain theme code block.
        if (code) code.innerHTML = highlight(code.textContent);

        var runBtn = cell.querySelector('.kongue-cell__run');
        if (runBtn) runBtn.addEventListener('click', function () { runCell(cell); });

        var editBtn = cell.querySelector('.kongue-cell__edit');
        if (editBtn) editBtn.addEventListener('click', function () { toggleEdit(cell); });
      })(cells[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.kongueCells = { highlight: highlight, runCell: runCell };
})();
