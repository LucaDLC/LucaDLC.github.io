/* Luca Del Conte — portfolio interactions
   Vanilla JS: scramble/decode reveal, highlight sweep, count-up, in-view triggers.
   All effects are PROGRESSIVE ENHANCEMENT: the real content is already in the DOM,
   so no-JS / reduced-motion / anim-off states show the final composition. */
(function () {
  'use strict';

  var root = document.documentElement;
  var GLYPHS = '!<>-_\\/[]{}—=+*^?#__:;.0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

  function animOn() {
    if (root.getAttribute('data-anim') === 'off') return false;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ---------- Scramble / decode reveal ---------- */
  function scramble(el) {
    var finalText = el.getAttribute('data-final');
    if (finalText == null) { finalText = el.textContent; el.setAttribute('data-final', finalText); }
    if (!animOn()) { el.textContent = finalText; return; }

    var chars = finalText.split('');
    var start = performance.now();
    var perChar = 26;            // ms before a char locks, staggered
    var stagger = 14;
    var settle = 320;            // scramble window per char

    function frame(now) {
      var out = '';
      var done = 0;
      for (var i = 0; i < chars.length; i++) {
        var ch = chars[i];
        if (ch === ' ' || ch === '\n') { out += ch; done++; continue; }
        var t0 = i * stagger;
        var p = (now - start - t0);
        if (p < 0) { out += randGlyph(); }
        else if (p > settle) { out += ch; done++; }
        else { out += (Math.random() < (p / settle) ? ch : randGlyph()); }
      }
      el.textContent = out;
      if (done < chars.length) requestAnimationFrame(frame);
      else el.textContent = finalText;
    }
    requestAnimationFrame(frame);
  }
  function randGlyph() { return GLYPHS[(Math.random() * GLYPHS.length) | 0]; }

  /* ---------- Highlight sweep ---------- */
  function sweep(el) {
    if (!animOn()) { el.classList.add('hl-in'); return; }
    el.classList.remove('hl-in');
    el.classList.add('hl-arm');           // armed = block hidden, text dark
    // force reflow then play
    void el.offsetWidth;
    requestAnimationFrame(function () {
      el.classList.remove('hl-arm');
      el.classList.add('hl-in');
    });
  }

  /* ---------- Count up ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    if (!animOn()) { el.textContent = el.getAttribute('data-final-num') || formatNum(el, target); return; }
    var dur = 900, start = performance.now();
    function frame(now) {
      var p = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = formatNum(el, Math.round(target * e));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function formatNum(el, n) {
    var pad = el.getAttribute('data-pad');
    var s = String(n);
    if (pad) while (s.length < parseInt(pad, 10)) s = '0' + s;
    return s + (el.getAttribute('data-suffix') || '');
  }

  /* ---------- Skill bars ---------- */
  function fillBar(el) {
    var v = el.getAttribute('data-bar');
    // Resting state is FILLED, set synchronously with no transition so it is
    // correct even where rAF/transitions are paused. Motion comes from shimmer.
    el.style.width = v + '%';
  }

  /* ---------- Trigger orchestration ---------- */
  function play(container) {
    container.querySelectorAll('[data-scramble]').forEach(function (el, i) {
      setTimeout(function () { scramble(el); }, i * 90);
    });
    container.querySelectorAll('[data-sweep]').forEach(function (el, i) {
      setTimeout(function () { sweep(el); }, 180 + i * 120);
    });
    container.querySelectorAll('[data-count]').forEach(function (el) { countUp(el); });
    container.querySelectorAll('[data-bar]').forEach(function (el, i) {
      setTimeout(function () { fillBar(el); }, 260 + i * 130);
    });
    container.querySelectorAll('.stat').forEach(function (el, i) {
      setTimeout(function () { el.classList.add('in'); }, 200 + i * 90);
    });
  }

  /* ---------- Typing effect for the role line ---------- */
  var roleTok = 0;
  function typeRole() {
    var el = document.querySelector('[data-k="role_lab"]');
    if (!el) return;
    var full = (el.textContent || '').trim();
    if (!full) return;
    if (!animOn()) { el.textContent = full; return; }
    var tok = ++roleTok;
    el.textContent = '';
    var i = 0;
    (function step() {
      if (tok !== roleTok) return;
      el.textContent = full.slice(0, i);
      if (i < full.length) { i++; setTimeout(step, 62); }
    })();
  }
  window.ldcTypeRole = typeRole;

  function init() {
    // Typing effect on the role line (uses the blinking caret next to it)
    typeRole();

    // Staggered entrance reveal (JS-driven so no-JS keeps content visible)
    if (animOn()) {
      var rev = document.querySelectorAll('.reveal');
      rev.forEach(function (el) { el.classList.add('pre'); });
      requestAnimationFrame(function () {
        rev.forEach(function (el, i) {
          setTimeout(function () { el.classList.add('show'); }, 70 + i * 75);
        });
      });
      // fail-safe: never leave anything hidden
      setTimeout(function () {
        rev.forEach(function (el) { el.classList.add('show'); });
      }, 1400);
    }

    // Hero plays immediately
    var hero = document.querySelector('[data-stage="hero"]');
    if (hero) play(hero);

    // Sections play when scrolled into view (replayable)
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { play(e.target); }
      });
    }, { threshold: 0.35 });
    document.querySelectorAll('[data-stage="onview"]').forEach(function (s) { io.observe(s); });
  }

  // Re-apply when tweaks toggle animation off/on (dispatched from tweaks app)
  window.addEventListener('ldc:anim', function () {
    document.querySelectorAll('[data-sweep]').forEach(function (el) {
      if (!animOn()) { el.classList.remove('hl-arm'); el.classList.add('hl-in'); }
    });
    document.querySelectorAll('[data-scramble]').forEach(function (el) {
      if (!animOn() && el.getAttribute('data-final') != null) el.textContent = el.getAttribute('data-final');
    });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Replay scramble + sweep after a language switch (content innerHTML changed)
  window.addEventListener('ldc:lang', function () {
    document.querySelectorAll('[data-scramble]').forEach(function (el) { el.removeAttribute('data-final'); });
    document.querySelectorAll('[data-sweep]').forEach(function (el) { el.classList.remove('hl-in', 'hl-arm'); });
    document.querySelectorAll('[data-stage]').forEach(function (s) { play(s); });
    typeRole();
  });

  // Year in footer / plate numbers (auto-updates each year)
  var nowY = new Date().getFullYear();
  var y = document.getElementById('yr'); if (y) y.textContent = nowY;
  var yy = String(nowY).slice(-2);
  document.querySelectorAll('.yr2').forEach(function (e) { e.textContent = yy; });
})();
