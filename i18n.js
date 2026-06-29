/* Bilingual IT/EN. Italian is the source of truth in the HTML; this file holds
   only the English overrides keyed by data-k. The fixed toggle flips + persists. */
(function () {
  'use strict';

  var EN = {
    ph_loc: 'ASTI · ITALY',
    role_lab: 'Computer Scientist',
    cl_loc: 'Asti, Italy',
    lab_profilo: 'Profile',
    bio: '<b>AI · Data Science · Cybersecurity.</b> From a Bachelor thesis — a custom supervised Machine Learning model to detect business anomalies — to infrastructure and security. I build <span class="hl" data-sweep>innovative, high-impact</span> solutions, an enthusiast of the Healthcare &amp; Fitness sectors.',
    quote: '"Whether a failure or a success, you will always learn something that helps you <span class="pt">level up.</span>"',
    st_exp: 'Experiences',
    st_yrs: 'Years · since 2020',
    st_tools: 'Technologies',
    st_en: 'English · IELTS',

    lab_exp: 'Experience',
    r0: 'DevOps Consultant',
    rd0: 'Cloud infrastructure management for clients.',
    rd0d: '03/2026 — 07/2026',
    r1: 'Data Analyst &amp; AI Developer',
    r2: 'IT Consultant',
    r3: 'External IT Specialist',
    r4: 'IT Technician',
    r5: 'Social Media Manager',
    rd1: 'Custom ML model training + statistical analysis of business processes.',
    rd2: 'HW/SW, Cybersecurity, network infrastructure and clients management.',
    rd3: 'HW/SW, Cybersecurity and network infrastructure management.',
    rd4: 'HW/SW + infrastructure management and Cybersecurity for public healthcare & hospital networks.',
    rd5: 'Website study & build, design & graphics, social management, brand & online reputation analysis.',

    lab_edu: 'Education',
    e1: 'B.Sc. in Computer Science',
    e2: 'Diploma in Computer Science & Telecommunications',
    ed1: 'Thesis: Training of a supervised learning model to identify, analyze and understand anomalies in business processes, in order to mitigate them and optimize existing processes, increasing their efficiency.',
    ed1b: 'Paket Project: in collaboration with the Italian Red Cross (Asti branch), a food-parcel management system to reduce every kind of waste, standardize the distributed portions, and simplify the work of operators during distribution and of administrators handling the paperwork.',
    ed2: 'Final research project: Wearable and portable devices to improve quality of life through Personal Area Networks, with a focus on healthcare applications (ECG, health monitoring).',

    lab_det: 'Details',
    d_sede: 'Location',
    v_sede: 'Asti, Italy',
    d_lic: 'Licenses',
    v_lic: 'Car B · Motorcycle A2 (EU)',

    lab_lang: 'Languages',
    l_it: 'Italian',
    lv_it: 'Native',
    l_en: 'English',

    lab_skill: 'Skills',
    g_dev: 'Development',
    g_os: 'Systems',
    g_design: 'Design',
    g_net: 'Networking',
    g_net_v: 'ISO/OSI stack · Protocols · Network devices · Cisco Packet Tracer · Fortinet',

    cta_mail: 'Get in touch <span class="ar">↗</span>',
    cta_cv: 'Download CV ↓',
    live: 'Available'
  };

  var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-k]'));
  var orig = {};
  nodes.forEach(function (n) { orig[n.getAttribute('data-k')] = n.innerHTML; });

  function setLang(lang) {
    var fab = document.getElementById('langFab');
    if (fab) fab.setAttribute('data-lang', lang);
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

  var fab = document.getElementById('langFab');
  function toggle() {
    var cur = document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'it';
    apply(cur === 'en' ? 'it' : 'en', true);
  }
  if (fab) {
    fab.addEventListener('click', toggle);
    fab.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  }
})();
