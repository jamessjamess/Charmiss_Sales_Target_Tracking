/*
 * tests/l12m.test.js — Test ของ CR-24 (เดือนปัจจุบันกลาง core/clock.js · ยอดขาย L12M · ยอดอ้างอิงรายเดือน · กราฟแท่งซ้อน)
 *
 * รันด้วย Node: node tests/run.js l12m / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   cr24-1..9 = Test ตาม CR-24 ข้อ 5 — ข้อมูลตั้งต้นจาก data/ (DEMO_CURRENT_MONTH 2026-09 · ปีแผน 2027) store: ไม่อ่าน ไม่เขียน
 *   cr24-4 เปลี่ยน settings.DEMO_CURRENT_MONTH ชั่วคราวแล้วคืนค่าเสมอ / cr24-9 ใช้ SP.core.charts (เบราว์เซอร์เท่านั้น)
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  var YEAR = 2027;
  function D() { return SP.data; }
  function calc() { return SP.core.calc; }
  function K() { return SP.core.clock; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function sum(a) { return a.reduce(function (s, v) { return s + (v || 0); }, 0); }
  function r4(v) { return Math.round(v * 1e4) / 1e4; }
  function withClock(month, fn) {
    var S = SP.data.settings, old = S.DEMO_CURRENT_MONTH;
    S.DEMO_CURRENT_MONTH = month;
    try { return fn(); } finally { S.DEMO_CURRENT_MONTH = old; }
  }
  var MASTER = null;
  function master() { return MASTER || (MASTER = { products: D().products, listings: D().listings, priceList: D().priceList, npdPlans: D().npdPlans }); }

  SP.tests.l12m = [
    {
      name: 'cr24-1. เดือนปัจจุบันกลาง: currentMonth = 2026-09 · lastClosedMonth = 2026-08 · L12M = ก.ย. 2025 – ส.ค. 2026',
      expected: ['2026-09', '2026-08', { from: '2025-09', to: '2026-08' }, 'ก.ย. 25 – ส.ค. 26', [2024, 2025]],
      actual: function () { return [K().currentMonth(), K().lastClosedMonth(), K().l12mRange(), K().rangeLabel(true), K().fullYears()]; }
    },
    {
      name: 'cr24-2. l12m(7-Eleven) = ยอดจริง ก.ย.–ธ.ค. 2025 + ม.ค.–ส.ค. 2026',
      expected: [24878381, true],
      actual: function () {
        var H = D().history.years;
        var direct = sum(H[2025].monthly.seven.slice(8)) + sum(H[2026].monthly.seven.slice(0, 8));
        var v = calc().l12m(D(), 'seven');
        return [v, v === direct];
      }
    },
    {
      name: 'cr24-3. referenceMonthly(7-Eleven): เดือน 1–8 ใช้ปี 2026 · เดือน 9–12 ใช้ปี 2025 · ผลรวม = l12m (หน่วยขายและ Channel)',
      expected: [[2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2025, 2025, 2025, 2025], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], true, true],
      actual: function () {
        var ref = calc().referenceMonthly(D(), 'seven', YEAR);
        var ch = calc().referenceMonthly(D(), 'mt', YEAR);
        return [ref.map(function (r) { return r.sourceYear; }), ref.map(function (r) { return r.month; }),
          sum(ref.map(function (r) { return r.value; })) === calc().l12m(D(), 'seven'),
          Math.abs(sum(ch.map(function (r) { return r.value; })) - calc().l12m(D(), 'mt')) < 1e-6];
      }
    },
    {
      name: 'cr24-4. DEMO_CURRENT_MONTH = 2026-12 → เดือน 1–11 ใช้ปี 2026 · เดือน 12 ใช้ปี 2025 · L12M = ธ.ค. 2025 – พ.ย. 2026 (ข้อมูลสมมติ ยอดจริง 11 เดือน)',
      expected: [[2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2025], { from: '2025-12', to: '2026-11' }, 'ธ.ค. 2025 – พ.ย. 2026', 1178, '2026-09'],
      actual: function () {
        var m25 = [], m26 = [];
        for (var i = 0; i < 12; i++) { m25.push(i + 1); m26.push(101 + i); }
        var data = { channels: D().channels, history: { years: { 2025: { actualMonths: 12, monthly: { x: m25 } }, 2026: { actualMonths: 11, monthly: { x: m26 } } } } };
        var out = withClock('2026-12', function () {
          return [calc().referenceMonthly(data, 'x', YEAR).map(function (r) { return r.sourceYear; }), K().l12mRange(), K().rangeLabel(false), calc().l12m(data, 'x')];
        });
        return out.concat([K().currentMonth()]);
      }
    },
    {
      name: 'cr24-5. การเติบโตของ Channel = เป้าหมาย 2027 ÷ L12M − 1 (MT −5.0% · TT +5.2% · ECOM +20.8%)',
      expected: [[true, true, true], [-0.0498, 0.0516, 0.2078]],
      actual: function () {
        var t = calc().topDown(D(), clone(D().targets.years[YEAR]), YEAR);
        return [t.children.map(function (c) { var l = calc().l12m(D(), c.id); return c.prior === l && Math.abs(c.growth - (c.amount / l - 1)) < 1e-12; }),
          t.children.map(function (c) { return r4(c.growth); })];
      }
    },
    {
      name: 'cr24-6. ค่าตั้งต้นสัดส่วนรายเดือนของทุกหน่วยขายในแผนรวมกัน = 100% · 7-Eleven = ยอดอ้างอิง ÷ L12M',
      expected: [true, true],
      actual: function () {
        var units = D().targets.years[YEAR].units;
        var ids = Object.keys(units).reduce(function (a, ch) { return a.concat(units[ch]); }, []);
        var allOne = ids.length > 0 && ids.every(function (id) { return Math.abs(sum(calc().defaultPhasing(D(), YEAR, id)) - 1) < 1e-9; });
        var ref = calc().referenceValues(calc().referenceMonthly(D(), 'seven', YEAR)), l = calc().l12m(D(), 'seven');
        var ph = calc().defaultPhasing(D(), YEAR, 'seven');
        return [allOne, ph.every(function (v, m) { return Math.abs(v - ref[m] / l) < 1e-12; })];
      }
    },
    {
      name: 'cr24-7. SKU ที่ไม่มียอดจริงปี 2025 (12130 ที่ 7-Eleven) → เดือน 9–12 ใช้ค่าปี 2026 และติดเครื่องหมาย (lyEstimated) ในตาราง SKU',
      expected: [true, [2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026],
        [false, false, false, false, false, false, false, false, true, true, true, true], true, true],
      actual: function () {
        var H = D().history, key = '12130';
        var ref = calc().skuReference(H, 'seven', key);
        var g = calc().skuPlanGrid(D(), master(), 'seven', calc().defaultSkuPlan(master(), 'seven', YEAR, true), { year: YEAR, target: 0 });
        var row = g.rows.filter(function (r) { return r.key === key; })[0];
        var raw = H.years[2026].skuQty.seven[key];
        return [calc().skuHistory(H, 2025, 'seven', key) == null, ref.sourceYears, ref.estimated,
          row.cells.every(function (c, m) { return c.lyEstimated === (m >= 8) && c.ly === raw[m]; }),
          row.cells.every(function (c, m) { return c.lyYear === 2026; })];
      }
    },
    {
      name: 'cr24-8. ประมาณการปี 2026 (ก.ย.–ธ.ค.) ไม่ถูกใช้ใน l12m และ referenceMonthly (แก้ค่าประมาณการแล้วผลไม่เปลี่ยน)',
      expected: [true, true, [null, null, null, null]],
      actual: function () {
        var h = clone(D().history);
        h.years[2026].monthly.seven = h.years[2026].monthly.seven.map(function (v, m) { return m >= 8 ? 1e12 : v; });
        var d2 = { channels: D().channels, history: h };
        var a = calc().referenceMonthly(D(), 'seven', YEAR), b = calc().referenceMonthly(d2, 'seven', YEAR);
        // ม.ค. 2027 ยังไม่เกิด → ปี 2026 เดือน 9–12 ไม่มียอดจริง (null) แม้มีค่าประมาณการ
        var late = withClock('2027-01', function () { return calc().referenceMonthly(d2, 'seven', YEAR).slice(8).map(function (r) { return r.value; }); });
        return [calc().l12m(d2, 'seven') === calc().l12m(D(), 'seven'), JSON.stringify(a) === JSON.stringify(b), late];
      }
    },
    {
      name: 'cr24-9. กราฟแท่งซ้อน (charts.stackedColumns): ผลรวมแต่ละแท่ง = ยอดรวมของปีนั้น · แกนเริ่มที่ 0 · ค่าสูงสุดเผื่อ ≥ 10%',
      expected: [true, 0, true, 4],
      actual: function () {
        var t = calc().topDown(D(), clone(D().targets.years[YEAR]), YEAR);
        var years = K().fullYears();
        var cols = years.map(function (y, i) {
          return { id: String(y), label: String(y), parts: t.children.map(function (c) { return { id: c.id, value: calc().salesHistory(D(), c.id, years)[i], colorToken: '--c-td' }; }) };
        }).concat([{ id: 'l12m', label: 'L12M', parts: t.children.map(function (c) { return { id: c.id, value: c.prior, colorToken: '--c-td' }; }) },
          { id: 'target', label: 'T', emphasize: true, parts: t.children.map(function (c) { return { id: c.id, value: c.amount, colorToken: '--c-td' }; }) }]);
        var el = SP.core.charts.stackedColumns({ columns: cols });
        var expect = cols.map(function (c) { return sum(c.parts.map(function (p) { return p.value; })); });
        var info = el.info;
        return [info.totals.every(function (v, i) { return Math.abs(v - expect[i]) < 1e-6; }), info.ticks[0], info.top >= Math.max.apply(null, expect) * 1.1 - 1e-6,
          el.querySelectorAll('.scol-stack').length];
      }
    }
  ];
})();
