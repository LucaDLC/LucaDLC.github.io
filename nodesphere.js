/* nodesphere.js — turns the monogram disc next to the name into a small
   animated spherical knowledge graph: nodes on a sphere, slowly rotating,
   with depth fade and coral nodes that light up. Edges are arcs drawn on the
   sphere's surface (great circles, so the graph stays round): each one links
   two random nodes, grows from one to the other, lives a few seconds, then
   retracts and disappears while new ones are born.
   A thin dashed ring always circles the graph.
   Easter egg (desktop, mouse): hold the graph for 1 s and the ring turns
   orange clockwise as you hold; when it closes, every arc fades out, the
   orange lingers a moment and fades back to grey, then arcs start again from
   none. Let go early and the orange winds back.
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
  var EDGES = 24;                       // how many arcs are alive at once
  var GROW = 450, FADE = 550;           // ms to draw an arc in / pull it back
  var MIN_ARC = 0.35, MAX_ARC = 1.7;    // radians: no stubs, no arcs across the whole sphere
  var nodes = [], edges = [];
  var size = 0, dpr = 1, cx = 0, cy = 0, R = 0;
  var ang = 0, raf = 0, lastT = 0, built = false, nextSpawn = 0;

  // hold-to-reset easter egg
  var HOLD = 1000, REWIND = 450, CLEAR = 350, RING_STAY = 1000, RING_FADE = 450;
  var egg = { state: 'idle', p: 0, t: 0 };   // idle | holding | rewinding | clearing | ring | ringfade
  var arcAlpha = 1, ringAlpha = 0;

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
      var acc = Math.random() < 0.45;
      var l0 = acc ? (Math.random() < 0.5 ? 1 : 0) : 0;
      nodes.push({ x: Math.cos(phi) * rr, y: y, z: Math.sin(phi) * rr, acc: acc, lit: l0, target: l0, nextFlip: 0 });
    }
    // start with a full set of arcs at random ages, so the first frame is not empty
    edges = [];
    var now = performance.now();
    for (var e = 0; e < EDGES; e++) spawn(now, true);
    built = true;
  }

  /* ---------- edges: born between random nodes, then die ---------- */
  function linked(a, b) {
    for (var i = 0; i < edges.length; i++)
      if ((edges[i].a === a && edges[i].b === b) || (edges[i].a === b && edges[i].b === a)) return true;
    return false;
  }
  function spawn(t, mature) {
    for (var tries = 0; tries < 12; tries++) {
      var a = (Math.random() * N) | 0, b = (Math.random() * N) | 0;
      if (a === b || linked(a, b)) continue;
      var A = nodes[a], B = nodes[b];
      var th = Math.acos(Math.max(-1, Math.min(1, A.x * B.x + A.y * B.y + A.z * B.z)));
      if (th < MIN_ARC || th > MAX_ARC) continue;
      var life = 2500 + Math.random() * 4500;
      edges.push({ a: a, b: b, th: th, life: life,
                   t0: mature ? t - GROW - Math.random() * life * 0.9 : t });
      return;
    }
  }
  function cull(t) {
    edges = edges.filter(function (e) { return t - e.t0 < GROW + e.life + FADE; });
    if (egg.state === 'clearing' || egg.state === 'ring' || egg.state === 'ringfade') return;
    // births keep pace with deaths: about six a second while below the target
    if (edges.length < EDGES && t >= nextSpawn) { spawn(t, false); nextSpawn = t + 60 + Math.random() * 200; }
  }

  // point at fraction u of the great-circle arc from node a to node b
  function slerp(A, B, th, u) {
    var s = Math.sin(th), wa = Math.sin((1 - u) * th) / s, wb = Math.sin(u * th) / s;
    return [A.x * wa + B.x * wb, A.y * wa + B.y * wb, A.z * wa + B.z * wb];
  }
  function ease(x) { return x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3); }

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

  function draw(t) {
    var col = colors();
    ctx.clearRect(0, 0, size, size);
    var ca = Math.cos(ang), sa = Math.sin(ang), tilt = 0.42, ct = Math.cos(tilt), st = Math.sin(tilt);
    var k = Math.max(1, Math.sqrt(size / 56));   // thicker dots and lines as the sphere grows
    function project(x0, y0, z0) {
      var x = x0 * ca + z0 * sa, z = -x0 * sa + z0 * ca;
      var y2 = y0 * ct - z * st, z2 = y0 * st + z * ct;
      return { sx: cx + x * R, sy: cy + y2 * R, depth: z2 };
    }
    var P = nodes.map(function (n) {
      var p = project(n.x, n.y, n.z); p.acc = n.acc; p.lit = n.lit; return p;
    });

    // arcs: drawn from u0 to u1 along the great circle, in short pieces so each fades with its depth
    ctx.strokeStyle = col.ink; ctx.lineWidth = 0.8 * k; ctx.lineCap = 'butt';   // round caps would bead where pieces overlap
    for (var e = 0; e < edges.length; e++) {
      var ed = edges[e], age = t - ed.t0;
      var u1 = ease(age / GROW), u0 = ease((age - GROW - ed.life) / FADE);   // grow in, then retract
      if (u1 <= u0) continue;
      var A = nodes[ed.a], B = nodes[ed.b];
      var steps = Math.max(4, Math.ceil(ed.th / 0.1 * (u1 - u0)));
      var prev = null;
      for (var s = 0; s <= steps; s++) {
        var v = slerp(A, B, ed.th, u0 + (u1 - u0) * s / steps), q = project(v[0], v[1], v[2]);
        if (prev) {
          ctx.globalAlpha = (0.22 + 0.48 * ((prev.depth + q.depth) / 2 + 1) / 2) * arcAlpha;
          ctx.beginPath(); ctx.moveTo(prev.sx, prev.sy); ctx.lineTo(q.sx, q.sy); ctx.stroke();
        }
        prev = q;
      }
    }
    var order = P.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) { return a.p.depth - b.p.depth; });
    for (var j = 0; j < order.length; j++) {
      var pt = order[j].p, f = (pt.depth + 1) / 2, rad = (1 + 2 * f + (pt.acc ? pt.lit * 0.8 : 0)) * k;
      ctx.fillStyle = pt.acc ? lerpCol(col.ink, col.accent, pt.lit) : col.ink;
      ctx.globalAlpha = 0.55 + 0.45 * f;
      ctx.beginPath(); ctx.arc(pt.sx, pt.sy, rad, 0, 7); ctx.fill();
    }

    // the dashed ring of the old design, always there; holding paints it orange clockwise from the top
    ctx.save();
    ctx.lineWidth = 0.75;                                       // a hairline at any size
    ctx.setLineDash([3, 3]); ctx.lineDashOffset = -t * 0.012;   // the dashes keep marching
    ctx.strokeStyle = col.ink; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(cx, cy, size * 0.47, 0, Math.PI * 2); ctx.stroke();
    if (egg.p > 0 && ringAlpha > 0) {
      ctx.strokeStyle = col.accent; ctx.globalAlpha = ringAlpha; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, size * 0.47, -Math.PI / 2, -Math.PI / 2 + egg.p * Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function stepEgg(t, dt) {
    var e = egg;
    if (e.state === 'holding') {
      e.p = Math.min(1, e.p + dt / HOLD); ringAlpha = 1;
      if (e.p >= 1) { e.state = 'clearing'; e.t = t; }
    } else if (e.state === 'rewinding') {
      e.p = Math.max(0, e.p - dt / REWIND);
      if (e.p <= 0) e.state = 'idle';
    } else if (e.state === 'clearing') {          // every arc fades out together
      arcAlpha = 1 - Math.min(1, (t - e.t) / CLEAR);
      if (t - e.t >= CLEAR) { edges = []; arcAlpha = 1; e.state = 'ring'; e.t = t; }
    } else if (e.state === 'ring') {              // the closed ring stays a moment on its own
      if (t - e.t >= RING_STAY) { e.state = 'ringfade'; e.t = t; }
    } else if (e.state === 'ringfade') {
      ringAlpha = 1 - Math.min(1, (t - e.t) / RING_FADE);
      if (ringAlpha <= 0) { e.state = 'idle'; e.p = 0; nextSpawn = t; }   // arcs start again from none
    }
  }

  function frame(t) {
    if (!lastT) lastT = t;
    var dt = t - lastT; lastT = t;
    ang += dt * 0.0006;
    for (var n = 0; n < nodes.length; n++) {
      var nd = nodes[n]; if (!nd.acc) continue;
      if (t >= nd.nextFlip) { nd.target = nd.nextFlip === 0 ? nd.target : 1 - nd.target; nd.nextFlip = t + 700 + Math.random() * 1600; }
      nd.lit += (nd.target - nd.lit) * Math.min(1, dt / 300);
    }
    stepEgg(t, dt);
    cull(t);
    draw(t);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    cancelAnimationFrame(raf); raf = 0; lastT = 0;
    if (!resize()) return;
    if (!built) build();
    if (animOn()) { raf = requestAnimationFrame(frame); }
    else { ang = 0.6; draw(performance.now()); }
  }

  var ro = new ResizeObserver(function () {
    if (!resize()) return;
    if (!built) build();   // it can fire before start(): the nodes must exist before the first frame
    if (animOn()) { if (!raf) raf = requestAnimationFrame(frame); } else draw(performance.now());
  });
  ro.observe(host);
  window.addEventListener('ldc:anim', start);

  // easter egg input: desktop only (a mouse and the two-column layout), and only while animating
  var eggMQ = window.matchMedia('(pointer: fine) and (min-width: 901px)');
  host.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !eggMQ.matches || !animOn()) return;
    if (egg.state !== 'idle' && egg.state !== 'rewinding') return;
    e.preventDefault();                          // no text selection or image drag while holding
    host.setPointerCapture(e.pointerId);
    egg.state = 'holding';
  });
  function letGo() { if (egg.state === 'holding') egg.state = 'rewinding'; }
  host.addEventListener('pointerup', letGo);
  host.addEventListener('pointercancel', letGo);
  host.addEventListener('lostpointercapture', letGo);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
