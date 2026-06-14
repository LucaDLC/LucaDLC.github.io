/* nodesphere.js — turns the monogram disc next to the name into a small
   animated spherical knowledge graph: nodes on a sphere joined by edges,
   slowly rotating, with depth fade and a few coral nodes.
   Progressive enhancement: motion off renders a single static frame. */
(function () {
  'use strict';

  var host = document.getElementById('monoGraph');
  if (!host) return;

  var cv = document.createElement('canvas');
  cv.className = 'mg-canvas';
  host.appendChild(cv);
  var ctx = cv.getContext('2d');

  var N = 20;
  var nodes = [], edges = [];
  var size = 0, dpr = 1, cx = 0, cy = 0, R = 0;
  var ang = 0, raf = 0, lastT = 0, built = false;

  function animOn() {
    if (document.documentElement.getAttribute('data-anim') === 'off') return false;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function colors() {
    var cs = getComputedStyle(document.documentElement);
    return { ink: (cs.getPropertyValue('--ink') || '#191512').trim(),
             accent: (cs.getPropertyValue('--accent') || '#d8533a').trim() };
  }
  function parseRGB(str) {
    str = (str || '').trim();
    if (str.charAt(0) === '#') {
      var h = str.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    var m = str.match(/(\d+(?:\.\d+)?)/g) || [0, 0, 0];
    return [+m[0], +m[1], +m[2]];
  }
  function lerpCol(a, b, t) {
    var A = parseRGB(a), B = parseRGB(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }

  function build() {
    nodes = [];
    var off = 2 / N, inc = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var y = i * off - 1 + off / 2;
      var rr = Math.sqrt(Math.max(0, 1 - y * y));
      var phi = i * inc;
      var acc = Math.random() < 0.26;
      var l0 = acc ? (Math.random() < 0.5 ? 1 : 0) : 0;
      nodes.push({ x: Math.cos(phi) * rr, y: y, z: Math.sin(phi) * rr, acc: acc, lit: l0, target: l0, nextFlip: 0 });
    }
    edges = []; var seen = {};
    for (var a = 0; a < N; a++) {
      var d = [];
      for (var b = 0; b < N; b++) if (a !== b) {
        var dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y, dz = nodes[a].z - nodes[b].z;
        d.push({ b: b, dist: dx * dx + dy * dy + dz * dz });
      }
      d.sort(function (p, q) { return p.dist - q.dist; });
      for (var k = 0; k < 2; k++) {
        var lo = Math.min(a, d[k].b), hi = Math.max(a, d[k].b), key = lo + '-' + hi;
        if (!seen[key]) { seen[key] = 1; edges.push([lo, hi]); }
      }
    }
    built = true;
  }

  function resize() {
    var r = host.getBoundingClientRect();
    size = Math.min(r.width, r.height);
    if (size < 8) return false;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = size / 2; cy = size / 2; R = size * 0.40;
    return true;
  }

  function draw() {
    var col = colors();
    ctx.clearRect(0, 0, size, size);
    var ca = Math.cos(ang), sa = Math.sin(ang), tilt = 0.42, ct = Math.cos(tilt), st = Math.sin(tilt);
    var P = nodes.map(function (n) {
      var x = n.x * ca + n.z * sa, z = -n.x * sa + n.z * ca, y = n.y;
      var y2 = y * ct - z * st, z2 = y * st + z * ct;
      return { sx: cx + x * R, sy: cy + y2 * R, depth: z2, acc: n.acc, lit: n.lit };
    });
    for (var e = 0; e < edges.length; e++) {
      var p = P[edges[e][0]], q = P[edges[e][1]], dep = (p.depth + q.depth) / 2;
      ctx.strokeStyle = col.ink; ctx.globalAlpha = 0.08 + 0.20 * (dep + 1) / 2; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(q.sx, q.sy); ctx.stroke();
    }
    var order = P.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) { return a.p.depth - b.p.depth; });
    for (var j = 0; j < order.length; j++) {
      var pt = order[j].p, f = (pt.depth + 1) / 2, rad = 0.7 + 1.7 * f + (pt.acc ? pt.lit * 0.7 : 0);
      ctx.fillStyle = pt.acc ? lerpCol(col.ink, col.accent, pt.lit) : col.ink;
      ctx.globalAlpha = 0.3 + 0.6 * f;
      ctx.beginPath(); ctx.arc(pt.sx, pt.sy, rad, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    if (!lastT) lastT = t;
    var dt = t - lastT; lastT = t;
    ang += dt * 0.0006;
    for (var n = 0; n < nodes.length; n++) {
      var nd = nodes[n]; if (!nd.acc) continue;
      if (t >= nd.nextFlip) { nd.target = nd.nextFlip === 0 ? nd.target : 1 - nd.target; nd.nextFlip = t + 1600 + Math.random() * 3200; }
      nd.lit += (nd.target - nd.lit) * Math.min(1, dt / 420);
    }
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    cancelAnimationFrame(raf); raf = 0; lastT = 0;
    if (!resize()) return;
    if (!built) build();
    if (animOn()) { raf = requestAnimationFrame(frame); }
    else { ang = 0.6; draw(); }
  }

  var ro = new ResizeObserver(function () {
    if (!resize()) return;
    if (animOn()) { if (!raf) raf = requestAnimationFrame(frame); } else draw();
  });
  ro.observe(host);
  window.addEventListener('ldc:anim', start);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
