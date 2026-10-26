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

  // Phone layout: every 6-14 s the photo's ring flashes (the animation lives in the CSS)
  var photo = document.querySelector('.photo');
  var narrow = window.matchMedia('(max-width: 900px)'), calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  function nextFlash() {
    setTimeout(function () {
      if (narrow.matches && !calm.matches && !document.hidden) photo.classList.add('flash');
      else nextFlash();   // not now: try again later
    }, 6000 + Math.random() * 8000);
  }
  if (photo) {
    photo.addEventListener('animationend', function (e) {
      if (e.animationName === 'ring-flash') { photo.classList.remove('flash'); nextFlash(); }
    });
    nextFlash();
  }
})();
