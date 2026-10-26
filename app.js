/* Luca Del Conte — portfolio interactions
   Vanilla JS: staggered entrance as each part scrolls into view.
   PROGRESSIVE ENHANCEMENT: content is in the DOM and visible without JS; the
   hidden "pre" state is only ever added here, with a fail-safe. */
(function () {
  'use strict';

  function init() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.rv'));
    if (!items.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    items.forEach(function (el) { el.classList.add('pre'); });

    // Reveal each batch that enters together with a short stagger
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      batch.forEach(function (el, i) {
        io.unobserve(el);
        setTimeout(function () { el.classList.add('show'); }, i * 75);
      });
    }, { rootMargin: '0px' });   // any shrink here can strand items sitting at the fold
    items.forEach(function (el) { io.observe(el); });

    // fail-safe: never leave anything hidden (e.g. printed page, odd viewport)
    window.addEventListener('beforeprint', function () { items.forEach(function (el) { el.classList.add('show'); }); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // The section crossing a reading line gets .on: its ">" of three cells lights up (CSS).
  // Desktop: the line is where the photo meets the Life board; phone: the middle of the screen.
  var secs = Array.prototype.slice.call(document.querySelectorAll('.sec'));
  var divider = document.querySelector('.photo'), wide = window.matchMedia('(min-width: 901px)');
  var ticking = false;
  function markSection() {
    ticking = false;
    var y = wide.matches && divider ? divider.getBoundingClientRect().bottom : window.innerHeight / 2;
    secs.forEach(function (s) {
      var r = s.getBoundingClientRect();
      s.classList.toggle('on', r.top <= y && r.bottom > y);
    });
  }
  function queueMark() { if (!ticking) { ticking = true; requestAnimationFrame(markSection); } }
  if (secs.length) {
    window.addEventListener('scroll', queueMark, { passive: true });
    window.addEventListener('resize', queueMark);
    markSection();
  }

  // Theme: dark by default (index.html sets it before the first paint). Holding the sphere until its ring
  // closes (nodesphere.js) flips it; the colours change during the reset (CSS animates the tokens).
  var root = document.documentElement, themeMeta = document.querySelector('meta[name="theme-color"]');
  function setTheme(t, animate) {
    if (animate) {
      root.classList.add('theme-anim');
      setTimeout(function () { root.classList.remove('theme-anim'); }, 1300);
    }
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('ldc-theme', t); } catch (e) {}
    if (themeMeta) themeMeta.setAttribute('content', t === 'light' ? '#f2efe9' : '#131211');
    window.dispatchEvent(new Event('ldc:theme'));
  }
  if (themeMeta && root.getAttribute('data-theme') === 'light') themeMeta.setAttribute('content', '#f2efe9');
  window.addEventListener('ldc:themetoggle', function () {
    setTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light', true);
  });
})();
