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

  /* The photo's ring answering the board (phone layout only; data-ring is 'A' or 'D', picked per load).
     A: the photo is an obstacle; what hits it lights an arc of the ring.
     D: when the ring flashes, a wave of births spreads from it. */
  var RING = document.documentElement.getAttribute('data-ring') || '';
  var photoEl = document.querySelector('.photo');
  var RING_W = 6;                       // the ring's thickness, as in the CSS outline
  var RING_LIFE = 2400;                 // an arc: orange 0.4 s, white until 0.9 s, then a short 1.5 s fade to the dark
  var WAVE_DELAY = 500, WAVE_MS = 1700, WAVE_REACH = 90, WAVE_P = 0.45;   // D: starts when the ring is orange; a thin shell, 90px out
  var AIM_EVERY = 45;                   // A: a glider aimed at the photo every ~7 s (else impacts are rare)
  var geo = null, zone = null, dist = null;     // photo circle (canvas px), cells under it, cell distances
  var hits = [], hitAcc = new Float32Array(12), hitX = new Float32Array(12), hitY = new Float32Array(12);
  var lastHit = 0, sinceAim = 0, wave = null;
  var GLIDERS = [   // heading (dx, dy) and the pattern that walks that way
    [ 1,  1, ["010","001","111"]], [-1,  1, ["010","100","111"]],
    [ 1, -1, ["111","001","010"]], [-1, -1, ["111","100","010"]]
  ];

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
            accent: cs.getPropertyValue('--accent').trim() || '#e0461b',
            panel: cs.getPropertyValue('--panel').trim() || '#1b1a18' };
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
    if (nc !== cols || nr !== rows || !cur) { cols = nc; rows = nr; geometry(); seed(); }
    else geometry();
    return true;
  }

  /* ---------- the photo circle, in board coordinates ---------- */
  function geometry() {
    geo = null; zone = null; dist = null;
    if (!RING || !photoEl || !window.matchMedia('(max-width: 900px)').matches) return;
    var pr = photoEl.getBoundingClientRect(), hr = host.getBoundingClientRect();
    if (pr.width < 8) return;
    geo = { x: pr.left + pr.width / 2 - hr.left, y: pr.top + pr.height / 2 - hr.top, r: pr.width / 2 };
    dist = new Float32Array(cols * rows); zone = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var x = ox + c * CELL + (CELL - GAP) / 2 - geo.x, y = oy + r * CELL + (CELL - GAP) / 2 - geo.y;
      var d = Math.sqrt(x * x + y * y);
      dist[r * cols + c] = d;
      if (d <= geo.r + RING_W + CELL * 0.4) zone.push(r * cols + c);   // under the photo and its ring
    }
  }

  function hexRGB(c) {
    c = c.trim();
    if (c.charAt(0) === '#') {
      if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
      var n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    var m = c.match(/\d+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]];
  }
  function mix(a, b, t) {
    var A = hexRGB(a), B = hexRGB(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
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
    clearZone(cur, false);
  }

  /* ---------- variant A: the photo is an obstacle ---------- */
  // empties the cells under the photo; with report, counts what was lost per 30° of the ring
  function clearZone(a, report) {
    if (RING !== 'A' || !zone) return;
    for (var k = 0; k < zone.length; k++) {
      var i = zone[k];
      if (!a[i]) continue;
      a[i] = 0;
      if (report) {
        var c = i % cols, r = (i / cols) | 0;
        var ang = Math.atan2(oy + r * CELL + (CELL - GAP) / 2 - geo.y, ox + c * CELL + (CELL - GAP) / 2 - geo.x);
        var w = (Math.round((ang + Math.PI) / (Math.PI * 2) * 12) % 12 + 12) % 12;
        hitAcc[w] += 1; hitX[w] += Math.cos(ang); hitY[w] += Math.sin(ang);
      }
    }
  }
  // a group that reaches the photo lights one arc; calm by construction: few at a time, never close together
  function detectImpacts(now) {
    hits = hits.filter(function (h) { return now - h.t0 < RING_LIFE; });
    for (var w = 0; w < 12; w++) {
      if (hitAcc[w] >= 2.6 && now - lastHit > 700 && hits.length < 5) {
        var a = Math.atan2(hitY[w], hitX[w]), near = false;
        for (var k = 0; k < hits.length; k++) {
          var d = Math.abs(Math.atan2(Math.sin(a - hits[k].a), Math.cos(a - hits[k].a)));
          if (d < 0.9 && now - hits[k].t0 < 2500) near = true;
        }
        if (!near) { hits.push({ a: a, t0: now }); lastHit = now; hitAcc[w] = hitX[w] = hitY[w] = 0; }
      }
      hitAcc[w] *= 0.82; hitX[w] *= 0.82; hitY[w] *= 0.82;
    }
  }
  function aimedGlider() {
    if (!geo) return;
    var g = GLIDERS[(Math.random() * 4) | 0];
    var k = Math.ceil((geo.r + RING_W + 46) / (CELL * Math.SQRT2));
    var c0 = Math.round((geo.x - ox) / CELL) - g[0] * k - 1, r0 = Math.round((geo.y - oy) / CELL) - g[1] * k - 1;
    put(g[2], c0, r0, 1);
  }

  /* ---------- variant D: a wave of births from the ring ---------- */
  function applyWave(nxt, now) {
    if (!wave || !geo || now < wave.t0) return;
    var rMax = geo.r + RING_W + WAVE_REACH;
    var rNow = geo.r + RING_W + Math.min(1, (now - wave.t0) / WAVE_MS) * WAVE_REACH;
    for (var i = 0; i < dist.length; i++) {
      var d = dist[i];
      if (d > wave.r - 2 && d <= rNow && Math.random() < WAVE_P) nxt[i] = 1;
    }
    wave.r = rNow;
    if (rNow >= rMax) wave = null;
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
    var now = performance.now();
    if (RING === 'D') applyWave(nxt, now);
    if (RING === 'A' && geo) { clearZone(nxt, true); detectImpacts(now); }
    for (var k = 0; k < nxt.length; k++) age[k] = nxt[k] ? (cur[k] ? Math.min(age[k] + 1, 999) : 0) : 0;
    prev = cur; cur = nxt;

    if (population() < cols * rows * 0.04) { soup(0.06); stamp(); sinceStamp = 0; clearZone(cur, false); }
    else if (++sinceStamp >= 20) { stamp(); sinceStamp = 0; clearZone(cur, false); }
    if (RING === 'A' && geo && ++sinceAim >= AIM_EVERY) { aimedGlider(); sinceAim = 0; }
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
    drawRing(performance.now());
  }

  // variant A: the ring itself is drawn here (dark, like the CSS outline), with the arcs the impacts light
  function ringColour(a) {
    if (a < 0.4) return mix(col.panel, col.accent, a / 0.4);
    if (a < 0.9) return mix(col.accent, '#ffffff', (a - 0.4) / 0.5);
    var t = Math.min(1, (a - 0.9) / (RING_LIFE / 1000 - 0.9)); t = t * t * (3 - 2 * t);
    return mix('#ffffff', col.panel, t);
  }
  function drawRing(now) {
    if (RING !== 'A' || !geo) return;
    var rm = geo.r + RING_W / 2, HALF = 0.45, N = 32;
    ctx.save();
    ctx.lineWidth = RING_W; ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    ctx.strokeStyle = col.panel;
    ctx.beginPath(); ctx.arc(geo.x, geo.y, rm, 0, Math.PI * 2); ctx.stroke();
    hits = hits.filter(function (h) { return now - h.t0 < RING_LIFE; });
    for (var k = 0; k < hits.length; k++) {
      var h = hits[k], c = ringColour((now - h.t0) / 1000);
      for (var s = 0; s < N; s++) {                       // brightest at the impact, soft at the ends
        var u0 = -HALF + 2 * HALF * s / N, u1 = -HALF + 2 * HALF * (s + 1) / N;
        ctx.strokeStyle = mix(col.panel, c, Math.cos((u0 + u1) / 2 / HALF * Math.PI / 2));
        ctx.beginPath(); ctx.arc(geo.x, geo.y, rm, h.a + u0, h.a + u1 + 0.004); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // variant D: the ring flash (app.js) starts the wave
  window.addEventListener('ldc:ringflash', function () {
    if (RING === 'D' && geo) wave = { t0: performance.now() + WAVE_DELAY, r: geo.r + RING_W };
  });

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
