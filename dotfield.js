/* dotfield.js — a living grid of little squares under the photo.
   Conway's Game of Life (classic computing) on a square-cell grid, periodically
   seeded with classic glyphs (space invader, glider, lightweight spaceship,
   pixel heart, binary). Live cells light up in ink; fresh births flash coral.
   Progressive enhancement: with motion off it renders one static stamped frame. */
(function () {
  'use strict';

  var host = document.querySelector('.dotfield');
  if (!host) return;

  var cap = document.createElement('div');
  cap.className = 'df-cap';
  cap.textContent = '● LIFE / 1970';
  host.appendChild(cap);

  var canvas = document.createElement('canvas');
  host.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var CELL = 15, GAP = 3;
  var cols = 0, rows = 0, W = 0, H = 0;
  var cur = null, prev = null;
  var raf = 0, acc = 0, last = 0, stepEvery = 150, sinceStamp = 0;

  var GLYPHS = [
    ["00100000100","00010001000","00111111100","01101110110","11111111111","10111111101","10100000101","00011011000"], // invader
    ["01100110","11111111","11111111","11111111","01111110","00111100","00011000"], // heart
    ["010","001","111"],                 // glider
    ["10010","00001","10001","01111"],   // lightweight spaceship
    ["111","101","101","101","111"],     // 0
    ["010","110","010","010","111"]      // 1
  ];

  function animOn() {
    if (document.documentElement.getAttribute('data-anim') === 'off') return false;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function I(c, r) { return ((r % rows) + rows) % rows * cols + (((c % cols) + cols) % cols); }

  function colors() {
    var cs = getComputedStyle(document.documentElement);
    return { ink: (cs.getPropertyValue('--ink') || '#191512').trim(),
             accent: (cs.getPropertyValue('--accent') || '#d8533a').trim() };
  }

  function resize() {
    var r = host.getBoundingClientRect();
    W = Math.max(0, Math.floor(r.width));
    H = Math.max(0, Math.floor(r.height));
    if (W < 8 || H < 8) return false;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr;
    // canvas is position:absolute / inset:0 in CSS — do NOT set style px size here
    // (it would feed back into the ResizeObserver and grow the container).
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var nc = Math.floor(W / CELL), nr = Math.floor(H / CELL);
    if (nc !== cols || nr !== rows || !cur) {
      cols = nc; rows = nr;
      cur = new Uint8Array(cols * rows);
      prev = new Uint8Array(cols * rows);
      soup(0.10);
      stamp();
    }
    return true;
  }

  function soup(d) {
    var n = Math.floor(cols * rows * (d || 0.06));
    for (var k = 0; k < n; k++) cur[(Math.random() * cols * rows) | 0] = 1;
  }

  function stamp(pat) {
    pat = pat || GLYPHS[(Math.random() * GLYPHS.length) | 0];
    var ph = pat.length, pw = pat[0].length;
    if (pw >= cols || ph >= rows) return;
    var c0 = (Math.random() * (cols - pw)) | 0;
    var r0 = (Math.random() * (rows - ph)) | 0;
    for (var rr = 0; rr < ph; rr++)
      for (var cc = 0; cc < pw; cc++)
        if (pat[rr][cc] === '1') cur[I(c0 + cc, r0 + rr)] = 1;
  }

  function lifeStep() {
    var nxt = new Uint8Array(cols * rows);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var n = 0;
        for (var dr = -1; dr <= 1; dr++)
          for (var dc = -1; dc <= 1; dc++)
            if (dc || dr) n += cur[I(c + dc, r + dr)];
        var a = cur[I(c, r)];
        nxt[I(c, r)] = (a ? (n === 2 || n === 3) : (n === 3)) ? 1 : 0;
      }
    }
    prev = cur; cur = nxt;
  }

  function population() {
    var p = 0;
    for (var i = 0; i < cur.length; i++) p += cur[i];
    return p;
  }

  function render() {
    var col = colors(), s = CELL - GAP;
    ctx.clearRect(0, 0, W, H);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var i = I(c, r), x = c * CELL, y = r * CELL;
        if (cur[i]) {
          if (prev && !prev[i]) { ctx.fillStyle = col.accent; ctx.globalAlpha = 0.95; }
          else { ctx.fillStyle = col.ink; ctx.globalAlpha = 0.9; }
        } else {
          ctx.fillStyle = col.ink; ctx.globalAlpha = 0.07;
        }
        ctx.fillRect(x, y, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  function tick(t) {
    if (!last) last = t;
    acc += t - last; last = t;
    if (acc >= stepEvery) {
      acc = 0; sinceStamp++;
      lifeStep();
      if (population() < cols * rows * 0.025) { soup(0.05); stamp(); sinceStamp = 0; }
      else if (sinceStamp >= 16) { stamp(); if (Math.random() < 0.5) soup(0.02); sinceStamp = 0; }
      render();
    }
    raf = requestAnimationFrame(tick);
  }

  function start() {
    cancelAnimationFrame(raf); raf = 0; last = 0; acc = 0;
    if (!resize()) return;
    render();   // immediate seeded frame (never blank, even before first tick)
    if (animOn()) { raf = requestAnimationFrame(tick); }
    else { // static, still-life frame
      prev = new Uint8Array(cur.length);
      stamp(GLYPHS[0]); stamp(GLYPHS[1]); render();
    }
  }

  var roW = 0, roH = 0;
  var ro = new ResizeObserver(function () {
    var r = host.getBoundingClientRect();
    var w = Math.floor(r.width), h = Math.floor(r.height);
    if (w === roW && h === roH) return;   // ignore non-size notifications / self-echo
    roW = w; roH = h;
    if (resize() && !raf && animOn()) raf = requestAnimationFrame(tick);
    else if (!animOn()) render();
  });
  ro.observe(host);
  window.addEventListener('ldc:anim', start);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
