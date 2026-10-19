/* UI for the Germany expat toolkit. Logic lives in logic.js, texts in i18n.js.
   Everything the user enters is kept in localStorage under one key; nothing is sent anywhere. */
(function () {
  'use strict';
  var L = window.GermanyExpat;
  var I = window.GX_I18N;
  var CFG = window.GX_CONFIG || {};
  var SITE = CFG.siteBase || '';
  var KEY = 'hmsk-germany-expat-v1';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var state = load();
  var lang = pickLang();
  var today = L.todayISO();

  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    if (!s || typeof s !== 'object') s = {};
    if (!s.bc || typeof s.bc !== 'object') s.bc = {};
    if (!s.done || typeof s.done !== 'object') s.done = {};
    if (!L.isISODate(s.moveIn)) s.moveIn = '';
    return s;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: works without saving */ }
  }
  function pickLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'de' || q === 'en') return q;
    if (state.lang === 'de' || state.lang === 'en') return state.lang;
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    return /^de\b/i.test(nav) ? 'de' : 'en';
  }
  function t(key, vars) {
    var s = I[lang][key];
    if (s === undefined) s = I.en[key];
    if (vars && typeof s === 'string') Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function eur(n) {
    var cents = Math.round(n * 100) % 100 !== 0;
    return new Intl.NumberFormat(t('locale'), { style: 'currency', currency: 'EUR', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 }).format(n);
  }
  function fmtDate(iso) {
    var p = iso.split('-');
    return new Intl.DateTimeFormat(t('locale'), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])));
  }
  function fmtShort(iso) {
    var p = iso.split('-');
    return new Intl.DateTimeFormat(t('locale'), { day: 'numeric', month: 'short', timeZone: 'UTC' })
      .format(new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])));
  }
  function link(href) { return SITE + href; }

  // ---------- static texts ----------
  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t('title');
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
    $('#lnkHome').href = link(t('home_href'));
    $('#lnkImprint').href = link(t('imprint_href'));
    $('#lnkImprint').textContent = t('imprint');
    $('#lnkPrivacy').href = link(t('privacy_href'));
    $('#lnkPrivacy').textContent = t('privacy');
    $('#salary').placeholder = lang === 'de' ? '50.700' : '50,700';
    // these lists contain trusted markup from i18n.js only (<b>)
    $('#anDocs').innerHTML = t('an_docs').map(function (s) { return '<li>' + s + '</li>'; }).join('');
    $('#anSteps').innerHTML = t('an_steps').map(function (s) { return '<li>' + s + '</li>'; }).join('');
    $('#anGet').innerHTML = t('an_get').map(function (s) { return '<li>' + s + '</li>'; }).join('');
    $('#sourcesList').innerHTML = t('src').map(function (s) {
      return '<li><a href="' + esc(s[1]) + '" rel="noopener" target="_blank">' + esc(s[0]) + '</a><span class="src-url">' + esc(s[1]) + '</span></li>';
    }).join('');
  }

  // ---------- 1. Blue Card ----------
  function readForm() {
    var f = $('#bcForm');
    var r = function (n) { var el = $('input[name="' + n + '"]:checked', f); return el ? el.value : undefined; };
    return {
      salary: $('#salary').value, period: $('#period').value,
      degree: r('degree'), occupation: r('occupation'),
      recentGrad: $('#recentGrad').checked, age45: $('#age45').checked,
    };
  }
  function fillForm() {
    var b = state.bc;
    $('#salary').value = b.salary || '';
    $('#period').value = b.period === 'month' ? 'month' : 'year';
    $$('#bcForm input[type=radio]').forEach(function (inp) { inp.checked = b[inp.name] === inp.value; });
    $('#recentGrad').checked = !!b.recentGrad;
    $('#age45').checked = !!b.age45;
  }
  function renderBlueCard() {
    var input = readForm();
    var r = L.checkBlueCard(input);
    var th = r.thresholds, y = th.year;
    var body = $('#bcBody');
    if (!r.complete) {
      body.innerHTML = '<p class="dim">' + esc(t('bc_pending')) + '</p>' + thresholdTable(r, false);
      return;
    }
    var v, cls = 'verdict';
    if (r.eligible) v = t(r.track === 'standard' ? 'v_yes_std' : 'v_yes_red', { y: y });
    else {
      cls += ' verdict--no';
      v = r.reason === 'salary' ? t('v_no_salary', { gap: eur(r.gap) }) : r.reason === 'no-degree' ? t('v_no_degree') : t('v_no_itexp');
    }
    var html = '<p class="' + cls + '">' + esc(v) + '</p>' + thresholdTable(r, true);
    if (r.eligible) {
      html += '<p>' + esc(r.baApproval ? t('r_ba') : t('r_std_note')) + '</p>';
      html += '<p class="dim">' + esc(t('r_next')) + '</p>';
    }
    if (r.alternatives.length) {
      html += '<h3 class="h2">' + esc(t('alt_h')) + '</h3><ul class="alt">';
      r.alternatives.forEach(function (a) {
        var k = a === 'skilled-worker' ? 'alt_skilled' : a === 'chancenkarte' ? 'alt_chance' : 'alt_age45';
        html += '<li>' + t(k, { a: esc(eur(th.age45)) }) + '</li>';
      });
      html += '</ul>';
    }
    html += '<div class="upd"><p>' + esc(t('upd_line')) + '</p><a class="btn btn--line" href="' + esc(link(t('contact_href'))) + '">' + esc(t('upd_btn')) + '</a></div>';
    body.innerHTML = html;
  }
  function thresholdTable(r, withYours) {
    var th = r.thresholds, y = th.year;
    var row = function (label, n, on) {
      return '<dt>' + esc(label) + '</dt><dd' + (on ? ' class="on"' : '') + '>' + esc(eur(n)) +
        '<small>' + esc(t('r_month', { m: eur(Math.round(n / 12 * 100) / 100) })) + '</small></dd>';
    };
    var html = '<dl class="kv2">';
    if (withYours) html += row(t('r_yours'), r.annual, r.eligible);
    var appliesStd = !withYours || !r.reducedApplies;
    html += row(t('r_std', { y: y }), th.standard, withYours && appliesStd);
    html += row(t('r_red', { y: y }), th.reduced, withYours && !appliesStd);
    return html + '</dl>';
  }
  function onFormChange() {
    var input = readForm();
    state.bc = input;
    save();
    renderBlueCard();
  }

  // ---------- 2. Anmeldung + 3. Checklist ----------
  function renderDeadline() {
    var el = $('#anDeadline');
    var d = L.anmeldungDeadline(state.moveIn);
    el.className = 'deadline';
    if (!d) { el.textContent = ''; return; }
    if (d < today) { el.className += ' deadline--late'; el.textContent = t('an_deadline_past', { d: fmtDate(d) }); }
    else el.textContent = t('an_deadline', { d: fmtDate(d) });
  }
  function items() {
    return t('items').slice().sort(function (a, b) { return a.day - b.day; });
  }
  function renderChecklist() {
    var list = items();
    var html = list.map(function (it) {
      var done = !!state.done[it.id];
      var due, late = false;
      if (state.moveIn) {
        var d = L.addDays(state.moveIn, it.day);
        late = !done && d < today;
        due = (late ? t('cl_overdue') + ' · ' : '') + t('cl_due', { d: fmtShort(d) });
      } else due = t('cl_due_day', { n: it.day });
      var id = 'cl-' + it.id;
      return '<li class="cl__item' + (done ? ' cl__item--done' : '') + '">' +
        '<div class="cl__row"><input type="checkbox" id="' + id + '" data-id="' + esc(it.id) + '"' + (done ? ' checked' : '') + '>' +
        '<div class="cl__main"><label class="cl__t" for="' + id + '">' + esc(it.t) + '</label>' +
        '<span class="cl__term">' + esc(it.term) + '</span>' +
        '<details><summary>' + esc(t('cl_more')) + '</summary><p>' + esc(it.d) + '</p></details></div>' +
        '<span class="cl__due' + (late ? ' cl__due--late' : '') + '">' + esc(due) + '</span></div></li>';
    }).join('');
    $('#clList').innerHTML = html;
    renderProgress(list);
  }
  function renderProgress(list) {
    list = list || items();
    var n = list.filter(function (it) { return state.done[it.id]; }).length;
    $('#clProgress').textContent = t('cl_progress', { n: n, t: list.length });
    $('#clBar').style.width = Math.round(n / list.length * 100) + '%';
  }

  // ---------- wiring ----------
  function renderAll() {
    applyLang();
    renderBlueCard();
    renderDeadline();
    renderChecklist();
  }

  $('#bcForm').addEventListener('input', onFormChange);
  $('#bcForm').addEventListener('change', onFormChange);
  $('#moveIn').addEventListener('change', function () {
    state.moveIn = L.isISODate(this.value) ? this.value : '';
    save();
    renderDeadline();
    renderChecklist();
  });
  $('#clList').addEventListener('change', function (e) {
    var id = e.target && e.target.getAttribute('data-id');
    if (!id) return;
    if (e.target.checked) state.done[id] = true; else delete state.done[id];
    save();
    e.target.closest('.cl__item').classList.toggle('cl__item--done', e.target.checked);
    renderChecklist();
    var el = document.getElementById('cl-' + id);
    if (el) el.focus();
  });
  $('#clReset').addEventListener('click', function () {
    if (!confirm(t('cl_reset_confirm'))) return;
    state.done = {}; state.moveIn = '';
    $('#moveIn').value = '';
    save();
    renderDeadline();
    renderChecklist();
  });
  $('#clPrint').addEventListener('click', function () {
    $$('.cl details').forEach(function (d) { d.open = true; });
    window.print();
  });
  $$('.lang button').forEach(function (b) {
    b.addEventListener('click', function () {
      lang = b.getAttribute('data-lang');
      state.lang = lang;
      save();
      var u = new URL(location.href);
      if (lang === 'de') u.searchParams.set('lang', 'de'); else u.searchParams.delete('lang');
      history.replaceState(null, '', u.toString());
      renderAll();
    });
  });

  fillForm();
  $('#moveIn').value = state.moveIn;
  renderAll();
})();
