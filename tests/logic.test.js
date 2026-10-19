'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../public/logic.js');

const base = { degree: 'degree', occupation: 'other', period: 'year' };
const check = (o) => L.checkBlueCard(Object.assign({}, base, o));

test('2026 thresholds match the BMI notice of 2 December 2025 (BAnz AT 18.12.2025 B3)', () => {
  const th = L.thresholds(2026);
  assert.equal(th.standard, 50700);
  assert.equal(th.reduced, 45934.20);
  assert.equal(th.age45, 55770);
  // both are percentages of the pension contribution ceiling
  assert.equal(Math.round(th.ceiling * 0.5 * 100) / 100, th.standard);
  assert.equal(Math.round(th.ceiling * 0.453 * 100) / 100, th.reduced);
  assert.equal(L.thresholds(2025).standard, 48300);
  assert.equal(L.thresholds(2025).reduced, 43759.80);
});

test('standard threshold: exactly 50,700 passes, one cent less fails', () => {
  let r = check({ salary: 50700 });
  assert.equal(r.eligible, true); assert.equal(r.track, 'standard'); assert.equal(r.baApproval, false);
  r = check({ salary: 50699.99 });
  assert.equal(r.eligible, false); assert.equal(r.reason, 'salary'); assert.equal(r.gap, 0.01);
  assert.deepEqual(r.alternatives, ['skilled-worker', 'chancenkarte']);
});

test('reduced threshold for shortage occupations, IT and new graduates, with BA approval', () => {
  for (const o of [{ occupation: 'shortage' }, { occupation: 'it' }, { recentGrad: true }]) {
    let r = check(Object.assign({ salary: 45934.20 }, o));
    assert.equal(r.eligible, true, JSON.stringify(o)); assert.equal(r.track, 'reduced'); assert.equal(r.baApproval, true);
    r = check(Object.assign({ salary: 45934.19 }, o));
    assert.equal(r.eligible, false); assert.equal(r.gap, 0.01);
    // above the standard figure no BA approval is needed, even in a shortage occupation
    r = check(Object.assign({ salary: 50700 }, o));
    assert.equal(r.track, 'standard'); assert.equal(r.baApproval, false);
  }
  const r = check({ salary: 46000 });
  assert.equal(r.eligible, false); assert.equal(r.needed, 50700); assert.equal(r.gap, 4700);
});

test('monthly salary is multiplied by 12', () => {
  assert.equal(check({ salary: 4225, period: 'month' }).eligible, true);
  assert.equal(check({ salary: '4.224,99', period: 'month' }).eligible, false);
  assert.equal(check({ salary: 3827.85, period: 'month', occupation: 'shortage' }).track, 'reduced');
});

test('no university degree: no Blue Card, except IT specialists with experience in IT jobs', () => {
  let r = check({ salary: 90000, degree: 'none' });
  assert.equal(r.eligible, false); assert.equal(r.reason, 'no-degree'); assert.deepEqual(r.alternatives, ['chancenkarte']);
  r = check({ salary: 90000, degree: 'vocational' });
  assert.equal(r.reason, 'no-degree'); assert.deepEqual(r.alternatives, ['skilled-worker', 'chancenkarte']);
  r = check({ salary: 45934.20, degree: 'it-experience', occupation: 'it' });
  assert.equal(r.eligible, true); assert.equal(r.track, 'reduced');
  r = check({ salary: 90000, degree: 'it-experience', occupation: 'other' });
  assert.equal(r.eligible, false); assert.equal(r.reason, 'it-experience-not-it');
});

test('recent graduate flag only counts with a degree', () => {
  const r = check({ salary: 46000, degree: 'vocational', recentGrad: true });
  assert.equal(r.reducedApplies, false);
});

test('45+ note for the skilled-worker route below 55 % of the ceiling', () => {
  assert.ok(check({ salary: 40000, age45: true }).alternatives.includes('age45'));
  assert.ok(!check({ salary: 40000 }).alternatives.includes('age45'));
  assert.ok(!check({ salary: 60000, age45: true }).alternatives.includes('age45'));
});

test('incomplete input gives no verdict', () => {
  assert.equal(check({ salary: '' }).complete, false);
  assert.equal(check({ salary: -5 }).complete, false);
  assert.equal(check({ salary: 'abc' }).complete, false);
  assert.equal(L.checkBlueCard({ salary: 60000 }).complete, false);
});

test('parseAmount reads German and English number formats', () => {
  assert.equal(L.parseAmount('50.700'), 50700);
  assert.equal(L.parseAmount('50,700'), 50700);
  assert.equal(L.parseAmount('45.934,20'), 45934.2);
  assert.equal(L.parseAmount('45,934.20'), 45934.2);
  assert.equal(L.parseAmount('€ 4 225'), 4225);
  assert.ok(Number.isNaN(L.parseAmount('12a')));
});

test('Anmeldung deadline is two weeks after moving in', () => {
  assert.equal(L.anmeldungDeadline('2026-10-19'), '2026-11-02');
  assert.equal(L.anmeldungDeadline('2026-12-25'), '2027-01-08');
  assert.equal(L.anmeldungDeadline('2026-02-30'), null);
  assert.equal(L.anmeldungDeadline(''), null);
});
