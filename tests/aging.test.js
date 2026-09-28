/*
 * tests/aging.test.js — Test ของ CR-26 (อายุการขายของ SKU × หน่วยขาย · ประวัติย้อนหลังจาก seed · Pivot แผนราย SKU) · ไม่ใช้ DOM
 *
 * รันด้วย Node: node tests/run.js aging / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   cr26-1..9 = Test ตาม CR-26 · cr26-10 = การเรียงและตัวกรองอายุ
 *   เดือนปิดล่าสุด = ส.ค. 2026 (settings.DEMO_CURRENT_MONTH 2026-09) · ข้อมูลตั้งต้นจาก data/ · store: ไม่อ่าน ไม่เขียน
 *   core/report.js ต้องใช้ store จึงไม่โหลดใน Node → ข้อ 6–9 ทดสอบ calc.pivotPlan บนแถวแผนชุดเดียวกับ report (calc.skuPlanItems ของทุกหน่วยขาย)
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  var YEAR = 2027;
  function D() { return SP.data; }
  function calc() { return SP.core.calc; }
  function sum(a) { return a.reduce(function (s, v) { return s + (v || 0); }, 0); }
  function near(a, b) { return Math.abs(a - b) < 1e-6; }
  function master() { return { products: D().products, listings: D().listings, basePrices: D().basePrices, npdPlans: D().npdPlans }; }
  // ข้อมูลสมมติ 1 หน่วยขาย 1 SKU (ยอดจริงปี 2026 ถึง ส.ค. · เดือนเริ่มขายตาม skuStart)
  function synth(pattern, start) {
    return { settings: D().settings, channels: [], accounts: [], territories: [],
      history: { years: { 2026: { actualMonths: 8, monthly: {}, skuQty: { u1: { K1: pattern } } } }, skuStart: { K1: start } } };
  }
  function fill12(v) { var a = []; for (var i = 0; i < 12; i++) a.push(v); return a; }
  // แถวแผนของทุกหน่วยขายในแผนปี 2027 (แผนตั้งต้นของ SKU) → { items, total (ผลรวม Net Sales ของทุกหน่วย = แผน Bottom-up รวม) }
  var ITEMS = null;
  function planItems() {
    if (ITEMS) return ITEMS;
    var units = D().targets.years[YEAR].units;
    var items = [], total = 0;
    Object.keys(units).forEach(function (ch) {
      units[ch].forEach(function (u) {
        var g = calc().skuPlanGrid(D(), master(), u, calc().defaultSkuPlan(master(), u, YEAR, true), { year: YEAR, target: 0 });
        total += g.yearTotal.net;
        items = items.concat(calc().skuPlanItems(g, u, ch));
      });
    });
    ITEMS = { items: items, total: total };
    return ITEMS;
  }
  function pivot(extra) {
    var o = { rows: 'series', cols: 'channel', value: 'net', show: 'value', taxonomy: D().taxonomy, channels: D().targets.years[YEAR].channels };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return calc().pivotPlan(planItems().items, o);
  }
  function leaves(nodes) { return nodes.reduce(function (a, n) { return a.concat(n.kind === 'sku' ? [n] : leaves(n.children)); }, []); }

  SP.tests.aging = [
    {
      name: 'cr26-1. salesAge: เริ่มขาย มี.ค. 2023 ขายล่าสุด ส.ค. 2026 (เดือนปิดล่าสุด) → sellingMonths 42 · monthsSinceLastSale 0 · อายุนาน (≥ 36)',
      expected: ['2023-03', '2026-08', 42, 0, true, false],
      actual: function () {
        var a = calc().salesAge(synth(fill12(5), '2023-03'), 'K1', 'u1', { channel: false });
        return [a.firstSaleMonth, a.lastSaleMonth, a.sellingMonths, a.monthsSinceLastSale, a.long, a.noSale];
      }
    },
    {
      name: 'cr26-2. ขายล่าสุด พ.ค. 2026 (ยอดเป็น 0 ตั้งแต่ มิ.ย.) → monthsSinceLastSale 3 → ป้าย ไม่มียอด 3 ด.',
      expected: ['2026-05', 3, true, 'ไม่มียอด 3 ด.'],
      actual: function () {
        var p = fill12(5).map(function (v, m) { return m >= 5 ? 0 : v; });
        var a = calc().salesAge(synth(p, '2024-01'), 'K1', 'u1', { channel: false });
        return [a.lastSaleMonth, a.monthsSinceLastSale, a.noSale, SP.data.content.pages.skuPlanning.age.noSaleBadge.replace('{n}', a.monthsSinceLastSale)];
      }
    },
    {
      name: 'cr26-3. SKU New ที่เริ่มขาย มิ.ย. 2027 (32210) → ยังไม่เริ่มขาย · เดือนเริ่มขายตามแผน 2027-06',
      expected: [false, '2027-06', null, false],
      actual: function () {
        var a = calc().salesAge(D(), '32210', 'seven', { master: master(), year: YEAR });
        return [a.started, a.plannedStart, a.firstSaleMonth, a.noSale];
      }
    },
    {
      name: 'cr26-4. firstSaleMonthInChannel ≤ firstSaleMonth ของทุกหน่วยขายใน Channel ที่มียอดจริง (SKU ที่ขายใน 7-Eleven × หน่วยขาย MT) และ ≤ ของหน่วยขายนี้เสมอ',
      expected: [true, true],
      actual: function () {
        var keys = Object.keys(D().history.years[2026].skuQty.seven);
        var units = calc().unitsOfChannel(D(), 'mt').map(function (u) { return u.id; });
        var checked = 0;
        var ok = keys.every(function (k) {
          var ch = calc().salesAge(D(), k, 'seven', { master: master(), year: YEAR }).firstSaleMonthInChannel;
          return units.every(function (u) {
            var a = calc().salesAge(D(), k, u, { master: master(), year: YEAR, channel: false });
            if (!a.started || !a.firstSaleMonth || (a.source !== 'history' && u !== 'seven')) return true;
            checked++;
            return ch <= a.firstSaleMonth;
          });
        });
        return [ok, checked > 10];
      }
    },
    {
      name: 'cr26-5. ประวัติย้อนหลังจาก seed กำหนดตายตัว: สร้างซ้ำได้ค่าเดิม (117 SKU) · NPD-2025 เริ่ม ต.ค. 2025 · Active ตาม TR Code (12070 → พ.ย. 2022) · ยอดปี 2025 = รูปแบบปี 2026',
      expected: [true, true, 117, '2025-10', '2022-11', true, true],
      actual: function () {
        var seed = D()[D().productImport.seed];
        var a = SP.core.seed.startMonths(seed.products, D().settings), b = SP.core.seed.startMonths(seed.products, D().settings);
        var npd = seed.products.filter(function (p) { return p.sourceStatus === 'NPD-2025'; })[0];
        var H = D().history;
        var bf1 = calc().skuBackfill(H, 'seven', '12070', 2025), bf2 = calc().skuBackfill(H, 'seven', '12070', 2025);
        return [JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a) === JSON.stringify(H.skuStart), Object.keys(a).length, a[npd.trCode], a['12070'],
          JSON.stringify(bf1) === JSON.stringify(bf2) && JSON.stringify(bf1) === JSON.stringify(H.years[2026].skuQty.seven['12070']),
          JSON.stringify(calc().skuBackfill(H, 'seven', '12070', 2022)) === JSON.stringify(H.years[2026].skuQty.seven['12070'].map(function (v, m) { return m >= 10 ? v : 0; }))];
      }
    },
    {
      name: 'cr26-6. pivotPlan แถว Series × คอลัมน์ Channel ค่า Net Sales → ผลรวมทั้งตาราง = แผน Bottom-up รวม (ผลรวม Net Sales ของทุกหน่วยขาย) · คอลัมน์ = MT · TT · ECOM',
      expected: [true, ['mt', 'tt', 'ecom'], true],
      actual: function () {
        var pv = pivot();
        var colSum = sum(pv.total.values);
        return [near(pv.total.total, planItems().total), pv.cols.map(function (c) { return c.id; }), near(colSum, pv.total.total)];
      }
    },
    {
      name: 'cr26-7. pivotPlan คอลัมน์ เดือน: ผลรวมแถวต่อ SKU = ผลรวมทั้งปีของ SKU นั้น (ทุกหน่วยขาย) · 12 คอลัมน์ · ไตรมาส 4 คอลัมน์ผลรวมเท่ากัน',
      expected: [12, true, 4, true],
      actual: function () {
        var pv = pivot({ cols: 'month' });
        var all = planItems().items;
        var ok = leaves(pv.rows).every(function (n) {
          var annual = sum(all.filter(function (it) { return it.key === n.id; }).map(function (it) { return sum(it.net); }));
          return near(sum(n.values), annual) && near(n.total, annual);
        });
        var q = pivot({ cols: 'quarter' });
        return [pv.cols.length, ok, q.cols.length, near(q.total.total, pv.total.total)];
      }
    },
    {
      name: 'cr26-8. แสดงเป็น % ของแถว: ผลรวมแต่ละแถว (ที่ไม่เป็น 0) = 100% · % ของคอลัมน์: ผลรวมระดับบนสุดของแต่ละคอลัมน์ = 100%',
      expected: [true, true],
      actual: function () {
        var pv = pivot({ show: 'rowPct', cols: 'unit', units: [] });
        function rowsOf(nodes) { return nodes.reduce(function (a, n) { return a.concat([n], rowsOf(n.children)); }, []); }
        var okRow = rowsOf(pv.rows).filter(function (n) { return n.total; }).every(function (n) { return Math.abs(sum(n.show) - 1) < 1e-9 && n.showTotal === 1; });
        var pc = pivot({ show: 'colPct' });
        var okCol = pc.cols.every(function (c, i) { return Math.abs(sum(pc.rows.map(function (n) { return n.show[i]; })) - 1) < 1e-9; });
        return [okRow, okCol];
      }
    },
    {
      name: 'cr26-9. กรอง Series แล้วผลรวม = ผลรวมเฉพาะ SKU ของ Series นั้น · เหลือแถวระดับบนแถวเดียว',
      expected: [true, 1, true],
      actual: function () {
        var s = D().taxonomy.series.filter(function (x) { return /Sanrio/.test(x.name); })[0];
        var pv = pivot({ filters: { series: [s.id] } });
        var want = sum(planItems().items.filter(function (it) { return it.seriesId === s.id; }).map(function (it) { return sum(it.net); }));
        return [near(pv.total.total, want), pv.rows.length, want > 0];
      }
    },
    {
      name: 'cr26-10. เรียงตามอายุการขาย / ไม่มียอดนานที่สุด / เริ่มขายล่าสุด (ยังไม่เริ่มขายอยู่บนสุด) · ตัวกรองอายุ',
      expected: [['A', 'B', 'C'], ['B', 'A', 'C'], ['C', 'B', 'A'], [['B'], ['A'], ['C']]],
      actual: function () {
        var ages = {
          A: { started: true, sellingMonths: 40, monthsSinceLastSale: 1, firstSaleMonth: '2023-05', long: true, noSale: false, recent: false },
          B: { started: true, sellingMonths: 20, monthsSinceLastSale: 6, firstSaleMonth: '2024-10', long: false, noSale: true, recent: false },
          C: { started: false, sellingMonths: 0, monthsSinceLastSale: null, firstSaleMonth: null, plannedStart: '2027-06', long: false, noSale: false, recent: false }
        };
        var rows = ['A', 'B', 'C'].map(function (k) { return { key: k, product: { name: k } }; });
        var vals = {};
        Object.keys(ages).forEach(function (k) { vals[k] = { value: 0, age: ages[k] }; });
        var ids = function (by) { return calc().sortPlanRows(rows, by, vals).map(function (r) { return r.key; }); };
        var f = function (flt) { return rows.filter(function (r) { return calc().ageMatch(ages[r.key], flt); }).map(function (r) { return r.key; }); };
        ages.C.recent = false;
        var recentAge = JSON.parse(JSON.stringify(ages)); recentAge.C = { started: true, recent: true };
        return [ids('age'), ids('noSale'), ids('recent'), [f('noSale'), f('long'), rows.filter(function (r) { return calc().ageMatch(recentAge[r.key], 'recent'); }).map(function (r) { return r.key; })]];
      }
    }
  ];
})();
