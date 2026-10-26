/* Bilingual IT/EN. Italian is the source of truth in the HTML; this file holds
   only the English overrides keyed by data-k. Desktop: the IT / EN buttons pick the
   language; phone: a one-bit switch flips it. The choice persists. */
(function () {
  'use strict';

  var EN = {
    role_lab: 'Computer Scientist — AI, Data Science, Cybersecurity',
    bio: 'From a Bachelor thesis, a custom supervised Machine Learning model to detect business anomalies, to infrastructure and security. I build innovative, high-impact solutions, an enthusiast of the Healthcare &amp; Fitness sectors.',
    quote: '“Whether a failure or a success, you will always learn something that helps you level up.”',
    foot_loc: 'Asti · Copenhagen',

    lab_exp: 'Experience',
    now: 'Now',
    r0: 'DevOps Consultant',
    rd0: 'Managed AWS cloud infrastructure for major clients and codified it with Terraform for reproducible, consistent environments, containerising and orchestrating workloads with Docker and Kubernetes while administering Linux servers and clients, migrating both to newer releases and taking full ownership of a project repository\'s maintenance.',
    r1: 'Data Analyst &amp; AI Developer',
    r2: 'Specialized IT Consultant',
    r3: 'External IT Specialist',
    r4: 'IT Technician',
    r5: 'Social Media Manager',
    rd1: 'Designed and developed a custom supervised machine-learning model, applying statistical data analysis to detect and mitigate anomalies in business processes and to optimise the workflows behind them.',
    rd2: 'Looked after clients\' hardware, software and network infrastructure and hardened it with Fortinet, maintaining close client relationships to keep each engagement running smoothly end to end.',
    rd3: 'Managed hardware and software across warehouse and office environments and designed, built and maintained the network connecting them, with a strong focus on cybersecurity and hardware security to protect day-to-day operations.',
    rd4: 'Kept critical hardware, software and network infrastructure running for real-time healthcare systems across Asti\'s two hospitals (Asti and Nizza Monferrato), the local health authority (ASL di Asti) and the community health houses and district health posts throughout the province, hardening public healthcare cybersecurity and mitigating critical bugs and security breaches to safeguard essential services.',
    rd5: 'Designed and built the company website and ran its social presence, editing video and photo content and shaping brand identity to strengthen the company\'s online reputation.',

    lab_edu: 'Education',
    uni: 'University of Turin',
    ongoing: 'ongoing',
    ed0: 'Track: Machine Learning and Artificial Intelligence.',
    e1: 'BSc in Computer Science',
    e2: 'Diploma in Computer Science & Telecommunications',
    ed1: 'Thesis: Training of a supervised learning model to identify, analyze and understand anomalies in business processes, in order to mitigate them and optimize existing processes, increasing their efficiency.',
    ed1b: 'Paket Project: in collaboration with the Italian Red Cross (Asti branch), a food-parcel management system to reduce every kind of waste, standardize the distributed portions, and simplify the work of operators during distribution and of administrators handling the paperwork.',
    ed2: 'Final research project: Wearable and portable devices to improve quality of life through Personal Area Networks, with a focus on healthcare applications (ECG, health monitoring).',

    lab_det: 'Details & languages',
    d_sede: 'Location',
    v_sede: 'Asti, Italy',
    v_sede2: 'Copenhagen, Denmark',
    d_lang: 'Languages',
    l_it: 'Italian',
    lv_it: 'native',
    l_en: 'English',
    d_lic: 'Licenses (EU)',
    lic_b: 'Car B',
    lic_a2: 'Motorcycle A2',
    d_contact: 'Contact',

    lab_skill: 'Skills',
    g_dev: 'Development',
    g_os: 'Systems',
    g_design: 'Design',
    g_net: 'Networking',
    g_net_v: 'ISO/OSI stack, protocols, network devices, Cisco Packet Tracer, Fortinet',

    cta_mail: 'Get in touch',
    cta_cv: 'Download CV',
    live: 'Available'
  };

  var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-k]'));
  var orig = {};
  nodes.forEach(function (n) { orig[n.getAttribute('data-k')] = n.innerHTML; });

  var picks = Array.prototype.slice.call(document.querySelectorAll('[data-set-lang]'));
  var bit = document.getElementById('langBit');   // phone: the one-bit switch

  function setLang(lang) {
    picks.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-set-lang') === lang ? 'true' : 'false'); });
    if (bit) {
      bit.setAttribute('data-lang', lang);
      bit.querySelector('.lb-cur').textContent = lang.toUpperCase();
      bit.setAttribute('aria-label', lang === 'en' ? 'Language: English. Switch to Italian' : 'Lingua: italiano. Passa all’inglese');
    }
    document.documentElement.setAttribute('lang', lang);
  }

  function apply(lang, replay) {
    nodes.forEach(function (n) {
      var k = n.getAttribute('data-k');
      if (lang === 'en') { if (EN[k] != null) n.innerHTML = EN[k]; }
      else { n.innerHTML = orig[k]; }
    });
    setLang(lang);
    try { localStorage.setItem('ldc-lang', lang); } catch (e) {}
    if (replay) window.dispatchEvent(new Event('ldc:lang'));
  }

  var saved = 'it';
  try { saved = localStorage.getItem('ldc-lang') || 'it'; } catch (e) {}
  if (saved === 'en') apply('en', true);
  else setLang('it');

  // desktop: each button picks its own language; the current one does nothing
  picks.forEach(function (b) {
    b.addEventListener('click', function () {
      var lang = b.getAttribute('data-set-lang');
      if (lang !== document.documentElement.getAttribute('lang')) apply(lang, true);
    });
  });
  // phone: the bit switch flips to the other language
  if (bit) bit.addEventListener('click', function () {
    apply(document.documentElement.getAttribute('lang') === 'en' ? 'it' : 'en', true);
  });
})();
