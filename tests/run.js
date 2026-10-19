/*
 * tests/run.js — รัน Test ด้วย Node โดยไม่ต้องเปิดเบราว์เซอร์ (CR-15 · ไม่ต้องติดตั้ง package)
 *
 *   node tests/run.js              รันทุกชุด
 *   node tests/run.js taxonomy     รันเฉพาะชุดที่ระบุ (taxonomy · calc · stores · features · permissions · targets · l12m · aging · cr27 · cr28 · cr29 · cr30 · cr31 · cr32 · cr33 · cr34 · cr35 · cr36 · cr37 · cr38 · cr39 · cr40 · cr41)
 *   CR-40: Test ที่มี node: true อ่านไฟล์ในโฟลเดอร์ผ่าน SP.testFiles (รันเฉพาะใน Node · หน้า Test บนเบราว์เซอร์ข้าม)
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
var SUITES = { taxonomy: 'tests/taxonomy.test.js', calc: 'tests/calc.test.js', stores: 'tests/stores.test.js', features: 'tests/features.test.js', permissions: 'tests/permissions.test.js', targets: 'tests/targets.test.js', l12m: 'tests/l12m.test.js', aging: 'tests/aging.test.js', cr27: 'tests/cr27.test.js', cr28: 'tests/cr28.test.js', cr29: 'tests/cr29.test.js', cr30: 'tests/cr30.test.js', cr31: 'tests/cr31.test.js', cr32: 'tests/cr32.test.js', cr33: 'tests/cr33.test.js', cr34: 'tests/cr34.test.js', cr35: 'tests/cr35.test.js', cr36: 'tests/cr36.test.js', cr37: 'tests/cr37.test.js', cr38: 'tests/cr38.test.js', cr39: 'tests/cr39.test.js', cr40: 'tests/cr40.test.js', cr41: 'tests/cr41.test.js' };
var SKIP_FILES = ['core/paths.js', 'core/store.js', 'core/components.js', 'core/charts.js', 'core/report.js', 'core/layout.js'];

function loaderFiles() {
  var src = fs.readFileSync(path.join(ROOT, 'core/loader.js'), 'utf8');
  var start = src.indexOf('var FILES = [');
  var block = src.slice(start, src.indexOf('];', start));
  return block.match(/'[^']+'/g).map(function (s) { return s.slice(1, -1); });
}

// CR-40: อ่านไฟล์ในโฟลเดอร์สำหรับ Test ที่ตรวจข้อความในโค้ด (case.node = true · หน้า Test บนเบราว์เซอร์ข้ามข้อเหล่านี้)
//   read(rel) → ข้อความ · list(dir, exts) → Path แบบ Relative (คั่นด้วย /) ของไฟล์ทุกชั้นที่ลงท้ายด้วยนามสกุลที่ระบุ
var testFiles = {
  read: function (rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); },
  list: function (dir, exts) {
    var out = [];
    (function walk(rel) {
      fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }).forEach(function (d) {
        var p = rel + '/' + d.name;
        if (d.isDirectory()) walk(p);
        else if (!exts || exts.some(function (x) { return d.name.slice(-x.length) === x; })) out.push(p);
      });
    })(dir);
    return out.sort();
  }
};

function loadApp() {
  var ctx = { console: console };
  ctx.window = ctx;
  ctx.window.SP = { core: {}, data: {}, modules: {}, tests: {}, testFiles: testFiles };
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
