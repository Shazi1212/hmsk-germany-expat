/* Germany expat toolkit: EU Blue Card salary check and checklist helpers.
   No DOM access here, so the same file runs in the browser (window.GermanyExpat)
   and in Node for the tests (module.exports).

   Legal basis (as of October 2026):
   - § 18g AufenthG (Blaue Karte EU). Minimum salaries for 2026 from the notice of the
     Bundesministerium des Innern of 2 December 2025, BAnz AT 18.12.2025 B3:
     standard 50 % of the pension contribution ceiling = 50,700 EUR a year,
     reduced 45.3 % (shortage occupations § 18g Abs. 1 Satz 2, new graduates and
     IT specialists without a degree § 18g Abs. 2) = 45,934.20 EUR a year.
   - Reduced threshold: the Federal Employment Agency (BA) must approve (§ 39 AufenthG).
   - § 18 Abs. 2 Nr. 5 AufenthG: first permit as a skilled worker at 45 or older needs
     55 % of the ceiling (2026: 55,770 EUR) or proof of adequate pension provision.
   - § 17 BMG: register within two weeks of moving in. */
(function (root) {
  'use strict';

  // Beitragsbemessungsgrenze (allgemeine Rentenversicherung), per year, and the Blue Card figures derived from it.
  var YEARS = {
    2025: { ceiling: 96600, standard: 48300, reduced: 43759.80 },
    2026: { ceiling: 101400, standard: 50700, reduced: 45934.20 },
  };
  var CURRENT_YEAR = 2026;

  var DEGREES = ['degree', 'it-experience', 'vocational', 'none'];
  var OCCUPATIONS = ['it', 'shortage', 'other'];

  function cents(x) { return Math.round(x * 100); }

  function thresholds(year) {
    var y = YEARS[year] || YEARS[CURRENT_YEAR];
    return {
      year: YEARS[year] ? year : CURRENT_YEAR,
      standard: y.standard,
      reduced: y.reduced,
      age45: Math.round(y.ceiling * 0.55 * 100) / 100,
      ceiling: y.ceiling,
    };
  }

  // Accepts "50.700", "50,700", "50700,50", "4 225" etc. Returns a number or NaN.
  function parseAmount(s) {
    if (typeof s === 'number') return s;
    s = String(s || '').trim().replace(/[€\s']/g, '');
    if (!s) return NaN;
    var lastDot = s.lastIndexOf('.'), lastComma = s.lastIndexOf(',');
    var dec = Math.max(lastDot, lastComma);
    // a separator followed by exactly 1 or 2 digits at the end is the decimal mark
    if (dec !== -1 && /^\d{1,2}$/.test(s.slice(dec + 1))) {
      s = s.slice(0, dec).replace(/[.,]/g, '') + '.' + s.slice(dec + 1);
    } else {
      s = s.replace(/[.,]/g, '');
    }
    return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  }

  /* checkBlueCard(input) -> {
       complete: bool,
       annual: number | null,            gross salary per year
       eligible: bool,
       track: 'standard' | 'reduced' | null,
       baApproval: bool,                 Federal Employment Agency approval needed (reduced track)
       reason: 'ok' | 'no-degree' | 'it-experience-not-it' | 'salary' | null,
       reducedApplies: bool,             occupation, new graduate or IT experience allows the lower figure
       needed: number,                   the threshold that applies to this person
       gap: number,                      missing euros per year (0 when eligible)
       alternatives: ['skilled-worker' | 'chancenkarte' | 'age45'],
       thresholds: {...}
     }
     input: { salary, period: 'year'|'month', degree, occupation, recentGrad: bool, age45: bool, year } */
  function checkBlueCard(input) {
    input = input || {};
    var th = thresholds(input.year || CURRENT_YEAR);
    var amount = parseAmount(input.salary);
    var degree = DEGREES.indexOf(input.degree) !== -1 ? input.degree : null;
    var occ = OCCUPATIONS.indexOf(input.occupation) !== -1 ? input.occupation : null;
    var out = {
      complete: false, annual: null, eligible: false, track: null, baApproval: false, reason: null,
      reducedApplies: false, needed: th.standard, gap: 0, alternatives: [], thresholds: th,
    };
    if (!(amount > 0) || !degree || !occ) return out;
    out.complete = true;
    out.annual = input.period === 'month' ? Math.round(amount * 12 * 100) / 100 : amount;

    var recentGrad = !!input.recentGrad && degree === 'degree';
    out.reducedApplies = occ !== 'other' || recentGrad || degree === 'it-experience';
    out.needed = out.reducedApplies ? th.reduced : th.standard;

    if (degree === 'none' || degree === 'vocational') {
      out.reason = 'no-degree';
    } else if (degree === 'it-experience' && occ !== 'it') {
      out.reason = 'it-experience-not-it';
      out.reducedApplies = false;
      out.needed = th.standard;
    } else if (cents(out.annual) >= cents(th.standard)) {
      out.eligible = true; out.track = 'standard'; out.reason = 'ok';
    } else if (out.reducedApplies && cents(out.annual) >= cents(th.reduced)) {
      out.eligible = true; out.track = 'reduced'; out.baApproval = true; out.reason = 'ok';
    } else {
      out.reason = 'salary';
    }
    if (!out.eligible && out.reason === 'salary') out.gap = (cents(out.needed) - cents(out.annual)) / 100;

    // Alternatives: shown when the Blue Card does not fit.
    if (!out.eligible) {
      if (degree === 'degree' || degree === 'vocational') out.alternatives.push('skilled-worker');
      out.alternatives.push('chancenkarte');
    }
    // The 45+ rule is for the skilled-worker permits (§ 18a, § 18b), not for the Blue Card.
    if (input.age45 && out.alternatives.indexOf('skilled-worker') !== -1 && cents(out.annual) < cents(th.age45)) {
      out.alternatives.push('age45');
    }
    return out;
  }

  // ---------- dates for the checklist ----------
  function addDays(iso, n) {
    var p = String(iso).split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  function isISODate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
    return addDays(s, 0) === s;
  }
  // § 17 Abs. 1 BMG: within two weeks after moving in.
  function anmeldungDeadline(moveInISO) { return isISODate(moveInISO) ? addDays(moveInISO, 14) : null; }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  var api = {
    YEARS: YEARS, CURRENT_YEAR: CURRENT_YEAR, DEGREES: DEGREES, OCCUPATIONS: OCCUPATIONS,
    thresholds: thresholds, parseAmount: parseAmount, checkBlueCard: checkBlueCard,
    addDays: addDays, isISODate: isISODate, anmeldungDeadline: anmeldungDeadline, todayISO: todayISO,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GermanyExpat = api;
})(typeof window !== 'undefined' ? window : this);
