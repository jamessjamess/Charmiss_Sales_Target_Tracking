/*
 * tests/run.js — รัน Test ด้วย Node โดยไม่ต้องเปิดเบราว์เซอร์ (CR-15 · ไม่ต้องติดตั้ง package)
 *
 *   node tests/run.js              รันทุกชุด
 *   node tests/run.js taxonomy     รันเฉพาะชุดที่ระบุ (taxonomy · calc · stores · features · permissions · targets · l12m)
 * โหลดไฟล์ Test ทุกชุดเสมอ (features ft-4 รัน Test เดิมของชุด calc) แต่รายงานเฉพาะชุดที่ระบุ
 *
 * โหลดไฟล์ core/ และ data/ ตามลำดับใน core/loader.js (FILES) ลง vm ที่มี window จำลอง (ไม่มี DOM)
 *   ข้ามไฟล์ที่ต้องใช้ DOM หรือ sessionStorage (paths, store, components, charts, report, layout) — CR-21 โหลด registry (รายการสิทธิ์สร้างจากหน้า)
 *   Test ที่เรียก SP.core.charts หรือ document ข้าม (นับเป็น "ต้องใช้เบราว์เซอร์") → เปิด tests/calc.test.html เพื่อรันครบ
 * จบด้วย exit code 1 เมื่อมี Test ไม่ผ่าน
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var SUITES = { taxonomy: 'tests/taxonomy.test.js', calc: 'tests/calc.test.js', stores: 'tests/stores.test.js', features: 'tests/features.test.js', permissions: 'tests/permissions.test.js', targets: 'tests/targets.test.js', l12m: 'tests/l12m.test.js' };
var SKIP_FILES = ['core/paths.js', 'core/store.js', 'core/components.js', 'core/charts.js', 'core/report.js', 'core/layout.js'];

function loaderFiles() {
  var src = fs.readFileSync(path.join(ROOT, 'core/loader.js'), 'utf8');
  var start = src.indexOf('var FILES = [');
  var block = src.slice(start, src.indexOf('];', start));
  return block.match(/'[^']+'/g).map(function (s) { return s.slice(1, -1); });
}

function loadApp() {
  var ctx = { console: console };
  ctx.window = ctx;
  ctx.window.SP = { core: {}, data: {}, modules: {}, tests: {} };
  vm.createContext(ctx);
  loaderFiles().filter(function (f) { return SKIP_FILES.indexOf(f) < 0; }).forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  });
  return ctx;
}

function needsBrowser(c) { return /SP\.core\.charts|document\.|SP\.core\.components/.test(String(c.actual)); }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

var names = process.argv.slice(2);
if (!names.length) names = Object.keys(SUITES);
var unknown = names.filter(function (n) { return !SUITES[n]; });
if (unknown.length) { console.error('ไม่รู้จักชุด Test: ' + unknown.join(', ') + ' (มี: ' + Object.keys(SUITES).join(', ') + ')'); process.exit(2); }

var ctx = loadApp();
var totalFail = 0;
Object.keys(SUITES).forEach(function (name) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, SUITES[name]), 'utf8'), ctx, { filename: SUITES[name] });
});
names.forEach(function (name) {
  var cases = ctx.window.SP.tests[name] || [];
  var pass = 0, fail = [], skip = 0;
  cases.forEach(function (c) {
    if (needsBrowser(c)) { skip++; return; }
    var actual, error = null;
    try { actual = c.actual(); } catch (e) { error = e; }
    if (!error && same(actual, c.expected)) pass++;
    else fail.push({ name: c.name, expected: c.expected, actual: error ? String(error) : actual });
  });
  totalFail += fail.length;
  console.log((fail.length ? '✗ ' : '✓ ') + name + ': ผ่าน ' + pass + ' / ' + (cases.length - skip) +
    (skip ? ' · ต้องใช้เบราว์เซอร์ ' + skip + ' (tests/calc.test.html)' : ''));
  fail.forEach(function (f) {
    console.log('  ✗ ' + f.name);
    console.log('    คาดหวัง ' + JSON.stringify(f.expected));
    console.log('    ได้จริง ' + JSON.stringify(f.actual));
  });
});
process.exit(totalFail ? 1 : 0);
