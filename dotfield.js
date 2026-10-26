/* dotfield.js — Conway's Game of Life (1970) under the photo.
   Starts from a random board with a few classic patterns. Cells fade in and
   out between generations; newborns flash in the accent colour.
   The grid bleeds off every edge so it fills the whole panel.
   Easter egg (mouse/pen only): clicking the "LIFE / 1970" label turns drawing
   on (drag; start on a live cell to erase) and the label orange; clicking it
   again turns drawing off. On touch screens and the one-column (mobile)
   layout the label stays a plain label.
   It sleeps while off screen. Reduced motion: a still frame. */
(function () {
  'use strict';

  var host = document.querySelector('.dotfield');
  if (!host) return;

  var canvas = document.createElement('canvas');
  host.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var CELL = 14, GAP = 3;
  var cols = 0, rows = 0, W = 0, H = 0, ox = 0, oy = 0;
  var cur = null, prev = null, age = null;
  var sinceStamp = 0, stepEvery = 160;
  var playing = true, visible = true, drawing = null;
  var raf = 0, last = 0, acc = 0;
  var hover = -1, col = null;

  var GLYPHS = [
    ["00100000100","00010001000","00111111100","01101110110","11111111111","10111111101","10100000101","00011011000"], // invader
    ["01100110","11111111","11111111","11111111","01111110","00111100","00011000"], // heart
    ["010","001","111"],                 // glider
    ["10010","00001","10001","01111"],   // lightweight spaceship
    ["0010","1001","1001","0100"],       // toad-ish beacon seed
    ["01110","10001","10001","01110"]    // ring
  ];

  function reduced() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function I(c, r) { return ((r % rows) + rows) % rows * cols + (((c % cols) + cols) % cols); }

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    col = { ink: cs.getPropertyValue('--ink').trim() || '#151412',
            accent: cs.getPropertyValue('--accent').trim() || '#e0461b' };
  }
  readColors();   // the ResizeObserver can fire before start()

  /* ---------- grid setup ---------- */
  function resize() {
    var r = host.getBoundingClientRect();
    W = Math.floor(r.width); H = Math.floor(r.height);
    if (W < 8 || H < 8) return false;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // one cell more than fits, centred: partial cells are cut at every edge
    var nc = Math.ceil((W + GAP) / CELL) + 1, nr = Math.ceil((H + GAP) / CELL) + 1;
    ox = Math.floor((W - (nc * CELL - GAP)) / 2);
    oy = Math.floor((H - (nr * CELL - GAP)) / 2);
    if (nc !== cols || nr !== rows || !cur) { cols = nc; rows = nr; seed(); }
    return true;
  }

  function clear() {
    cur = new Uint8Array(cols * rows);
    prev = new Uint8Array(cols * rows);
    age = new Uint16Array(cols * rows);
  }

  function put(pat, c0, r0, scale) {
    scale = scale || 1;
    for (var rr = 0; rr < pat.length; rr++)
      for (var cc = 0; cc < pat[rr].length; cc++)
        if (pat[rr][cc] === '1')
          for (var a = 0; a < scale; a++)
            for (var b = 0; b < scale; b++) cur[I(c0 + cc * scale + b, r0 + rr * scale + a)] = 1;
  }

  // a random soup plus a couple of classic patterns
  function seed() {
    clear();
    soup(0.12); stamp(); stamp();
    sinceStamp = 0;
  }

  function soup(d) {
    var n = Math.floor(cols * rows * d);
    for (var k = 0; k < n; k++) cur[(Math.random() * cols * rows) | 0] = 1;
  }
  function stamp() {
    var pat = GLYPHS[(Math.random() * GLYPHS.length) | 0];
    if (pat[0].length >= cols || pat.length >= rows) return;
    put(pat, (Math.random() * (cols - pat[0].length)) | 0, (Math.random() * (rows - pat.length)) | 0);
  }

  /* ---------- rules ---------- */
  function step() {
    var nxt = new Uint8Array(cols * rows);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var n = 0;
        for (var dr = -1; dr <= 1; dr++)
          for (var dc = -1; dc <= 1; dc++)
            if (dc || dr) n += cur[I(c + dc, r + dr)];
        var i = r * cols + c;
        nxt[i] = (cur[i] ? (n === 2 || n === 3) : n === 3) ? 1 : 0;
      }
    }
    for (var k = 0; k < nxt.length; k++) age[k] = nxt[k] ? (cur[k] ? Math.min(age[k] + 1, 999) : 0) : 0;
    prev = cur; cur = nxt;

    if (population() < cols * rows * 0.04) { soup(0.06); stamp(); sinceStamp = 0; }
    else if (++sinceStamp >= 20) { stamp(); sinceStamp = 0; }
  }

  function population() { var p = 0; for (var i = 0; i < cur.length; i++) p += cur[i]; return p; }

  /* ---------- drawing ---------- */
  // t: 0..1 progress towards the next generation, used to fade cells
  function render(t) {
    var s = CELL - GAP, ease = 1 - Math.pow(1 - t, 3);
    ctx.clearRect(0, 0, W, H);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var i = r * cols + c, x = ox + c * CELL, y = oy + r * CELL;
        // the empty cell is always there: it is the texture of the board
        ctx.globalAlpha = 0.07; ctx.fillStyle = col.ink; ctx.fillRect(x, y, s, s);
        if (cur[i]) {
          if (age[i] === 0 && !prev[i]) {            // just born: accent, fading in
            ctx.globalAlpha = 0.25 + 0.7 * ease; ctx.fillStyle = col.accent;
          } else if (age[i] === 1) {                 // one generation old: accent cools to ink
            ctx.globalAlpha = 0.9; ctx.fillStyle = col.ink; ctx.fillRect(x, y, s, s);
            ctx.globalAlpha = 0.95 * (1 - ease); ctx.fillStyle = col.accent;
          } else { ctx.globalAlpha = 0.9; ctx.fillStyle = col.ink; }
          ctx.fillRect(x, y, s, s);
        } else if (prev[i]) {                        // just died: a short ghost
          ctx.globalAlpha = 0.55 * (1 - ease); ctx.fillStyle = col.ink; ctx.fillRect(x, y, s, s);
        }
      }
    }
    if (hover >= 0 && hover < cur.length) {
      ctx.globalAlpha = 0.45; ctx.fillStyle = col.accent;
      ctx.fillRect(ox + (hover % cols) * CELL, oy + ((hover / cols) | 0) * CELL, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function tick(now) {
    raf = 0;
    if (!running()) { last = 0; return; }
    if (!last) last = now;
    var dt = now - last; last = now;
    if (!drawing) {
      acc += dt;
      if (acc >= stepEvery) { acc = acc % stepEvery; step(); }
    }
    render(drawing ? 1 : acc / stepEvery);
    raf = requestAnimationFrame(tick);
  }

  function running() { return playing && visible && !document.hidden; }
  function wake() { if (running() && !raf) { last = 0; raf = requestAnimationFrame(tick); } }

  /* ---------- easter egg: the label toggles drawing with mouse/pen ---------- */
  function cellAt(e) {
    var r = canvas.getBoundingClientRect();
    var c = Math.floor((e.clientX - r.left - ox) / CELL), rr = Math.floor((e.clientY - r.top - oy) / CELL);
    if (c < 0 || rr < 0 || c >= cols || rr >= rows) return -1;
    return rr * cols + c;
  }
  function paint(i, on) {
    if (i < 0) return;
    cur[i] = on ? 1 : 0; age[i] = 0; prev[i] = on ? 0 : 1;
  }
  function endDraw() { if (drawing) { drawing = null; acc = 0; } }

  var cap = document.querySelector('.life-cap'), interactive = false;
  function setInteractive(on) {
    interactive = on;
    cap.setAttribute('aria-pressed', on ? 'true' : 'false');
    host.style.cursor = on ? 'crosshair' : '';
    if (!on) { endDraw(); hover = -1; render(1); }
  }

  // desktop only: a mouse and the two-column layout; narrowing the window switches it off
  var eggMQ = window.matchMedia('(pointer: fine) and (min-width: 901px)');
  function syncEgg() {
    cap.disabled = !eggMQ.matches;
    if (!eggMQ.matches && interactive) setInteractive(false);
  }

  if (cap) {
    syncEgg();
    eggMQ.addEventListener('change', syncEgg);
    window.addEventListener('resize', syncEgg);
    cap.addEventListener('click', function () { syncEgg(); if (eggMQ.matches) setInteractive(!interactive); });
    canvas.addEventListener('pointerdown', function (e) {
      if (interactive) syncEgg();   // the layout may have gone narrow without a change event
      if (!interactive || e.pointerType === 'touch') return;
      var i = cellAt(e); if (i < 0) return;
      drawing = { on: !cur[i] };
      canvas.setPointerCapture(e.pointerId);
      paint(i, drawing.on); render(1);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!interactive || e.pointerType === 'touch') return;
      var i = cellAt(e);
      if (drawing && i >= 0 && cur[i] !== (drawing.on ? 1 : 0)) paint(i, drawing.on);
      if (i !== hover) { hover = i; if (!running()) render(1); }
    });
    canvas.addEventListener('pointerup', endDraw);
    canvas.addEventListener('pointercancel', endDraw);
    canvas.addEventListener('pointerleave', function () { hover = -1; if (!running()) render(1); });
  }

  /* ---------- lifecycle ---------- */
  function start() {
    readColors();
    if (!resize()) return;
    if (reduced()) playing = false;
    render(1); wake();
  }

  var roW = 0, roH = 0;
  new ResizeObserver(function () {
    var r = host.getBoundingClientRect(), w = Math.floor(r.width), h = Math.floor(r.height);
    if (w === roW && h === roH) return;   // ignore self-echo
    roW = w; roH = h;
    if (resize()) { render(1); wake(); }
  }).observe(host);

  new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting; wake();
  }).observe(host);
  document.addEventListener('visibilitychange', wake);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { readColors(); render(1); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
