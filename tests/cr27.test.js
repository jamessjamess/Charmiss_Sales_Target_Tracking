/*
 * tests/cr27.test.js — Test ของ CR-27 (ปรับความเรียบร้อย Sales Planning 4 หน้า: ค่าตั้งต้นเป้าหมาย · ยอด SKU ปี 2025 · ช่วงเวลาขาย · อายุการขาย
 *   · แผน SKU ในหน้า Sub-channel · รูปแบบรายเดือนของ Channel · เป้าหมายเทียบแผนรายผู้รับผิดชอบ)
 *
 * รันด้วย Node: node tests/run.js cr27 / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   cr27-1..9 = Test ตาม CR-27 · cr27-10 = แท่งเป้าหมายเทียบแผนบนหน้าจอ (SP.core.charts · เบราว์เซอร์เท่านั้น)
 *   เดือนปิดล่าสุด = ส.ค. 2026 (settings.DEMO_CURRENT_MONTH 2026-09) · ข้อมูลตั้งต้นจาก data/ · store: ไม่อ่าน ไม่เขียน
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  var YEAR = 2027;
  function D() { return SP.data; }
  function calc() { return SP.core.calc; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function sum(a) { return a.reduce(function (s, v) { return s + (v || 0); }, 0); }
  function r4(v) { return Math.round(v * 1e4) / 1e4; }
  function master() { return { products: D().products, listings: D().listings, basePrices: D().basePrices, npdPlans: D().npdPlans }; }
  function tree() { return calc().topDown(D(), clone(D().targets.years[YEAR]), YEAR); }
  // Net Sales ต่อชิ้นของ SKU ในหน่วยขาย (สูตรเดียวกับ core/seed.js: ราคาตามวันที่มีผล + GP ของหน่วย)
  function perPiece(key, unit, year, m) {
    var det = calc().pricingDetail(D(), key, unit, year, m);
    return calc().chain({ units: 1, price: det.price, gp: det.gp }).netSales || 0;
  }
  // ข้อมูลสมมติ 1 หน่วยขาย 1 SKU (ยอดจริงปี 2026 ถึง ส.ค. · เดือนเริ่มขายตาม skuStart)
  function synth(pattern, start) {
    return { settings: D().settings, channels: [], accounts: [], territories: [],
      history: { years: { 2026: { actualMonths: 8, monthly: {}, skuQty: { u1: { K1: pattern } } } }, skuStart: { K1: start } } };
  }
  function ageOf(n) { return { started: true, sellingMonths: n, noSale: false }; }

  SP.tests.cr27 = [
    {
      name: 'cr27-1. ค่าตั้งต้นเป้าหมาย 2027: ทุก Channel โตกว่า L12M · % ของ Total ของ Channel รวม 100% · % ในแต่ละ Channel รวม 100%',
      expected: [[true, true, true], 1, [1, 1, 1]],
      actual: function () {
        var t = tree();
        return [t.children.map(function (c) { return c.prior > 0 && c.amount > c.prior; }), r4(sum(t.children.map(function (c) { return c.pct; }))),
          t.children.map(function (c) { return r4(sum(c.children.map(function (u) { return u.pct; }))); })];
      }
    },
    {
      name: 'cr27-2. % ตั้งต้นของหน่วยขาย = roundShares(L12M ของหน่วยขาย) = ผลของปุ่ม "เติมตามสัดส่วน L12M" (เป็น % เต็ม)',
      expected: [true, true, true],
      actual: function () {
        var t = tree();
        var same = t.children.every(function (c) {
          var btn = calc().roundShares(c.children.map(function (u) { return u.prior; }));
          var l12 = calc().roundShares(c.children.map(function (u) { return calc().l12m(D(), u.id); }));
          return c.children.every(function (u, i) { return Math.abs(u.pct - btn[i]) < 1e-9 && btn[i] === l12[i]; });
        });
        var whole = t.children.every(function (c) { return c.children.every(function (u) { return Math.abs(u.pct * 100 - Math.round(u.pct * 100)) < 1e-9; }); });
        var sums = t.children.every(function (c) { return Math.abs(sum(calc().roundShares(c.children.map(function (u) { return u.prior; }))) - 1) < 1e-9; });
        return [same, whole, sums];
      }
    },
    {
      name: 'cr27-3. ยอด SKU ปี 2025 (seed.priorSkuQty): ผลรวม Net Sales ของ SKU รายเดือน = ยอดหน่วยขายรายเดือน (คลาดได้ไม่เกิน 1 ชิ้น × ราคา ต่อ SKU) · สร้างซ้ำได้ผลเดิม',
      expected: [true, true, true],
      actual: function () {
        var H = D().history, y25 = H.years[2025], units = Object.keys(y25.skuQty);
        var ok = units.length > 0 && units.every(function (u) {
          var target = y25.monthly[u];
          if (!target) return true;
          for (var m = 0; m < 12; m++) {
            var total = 0, tol = 1;
            Object.keys(y25.skuQty[u]).forEach(function (k) {
              var per = perPiece(k, u, 2025, m) || perPiece(k, u, 2026, m);
              total += (y25.skuQty[u][k][m] || 0) * per;
              tol += per;
            });
            if ((target[m] || 0) > 0 && Math.abs(total - target[m]) > tol) return false;
          }
          return true;
        });
        var h2 = clone(H);
        delete h2.years[2025].skuQty;
        SP.core.seed.priorSkuQty(D(), h2, H.skuStart);
        var h3 = clone(H);
        delete h3.years[2025].skuQty;
        SP.core.seed.priorSkuQty(D(), h3, H.skuStart);
        return [ok, JSON.stringify(h2.years[2025].skuQty) === JSON.stringify(y25.skuQty), JSON.stringify(h2.years[2025].skuQty) === JSON.stringify(h3.years[2025].skuQty)];
      }
    },
    {
      name: 'cr27-4. 7-Eleven: Net Sales ของแผน SKU ตั้งต้น ≈ L12M (ต่างไม่เกิน 1%) · คงเหลือรายเดือน (เป้าหมาย − แผน) เครื่องหมายเดียวกันทุกเดือน · ไม่มีเดือนประมาณการ',
      expected: [true, true, false],
      actual: function () {
        var plan = calc().defaultSkuPlan(master(), 'seven', YEAR, true);
        var g = calc().skuPlanGrid(D(), master(), 'seven', plan, { year: YEAR, mode: 'initial' });
        var l = calc().l12m(D(), 'seven');
        var unit = tree().children.filter(function (c) { return c.id === 'mt'; })[0].children.filter(function (u) { return u.id === 'seven'; })[0];
        var target = calc().phasingTotals(unit.amount, calc().defaultPhasing(D(), YEAR, 'seven')).amounts;
        var rem = target.map(function (t, m) { return t - g.totals.net[m]; });
        var signs = rem.map(function (v) { return v > 0 ? 1 : v < 0 ? -1 : 0; });
        var est = g.rows.some(function (r) { return r.cells.some(function (c) { return c.lyEstimated; }); });
        return [Math.abs(g.yearTotal.net / l - 1) <= 0.01, signs.every(function (s) { return s === signs[0]; }), est];
      }
    },
    {
      name: 'cr27-5. ช่วงเวลาขาย: ขายล่าสุด ส.ค. 26 (เดือนปิดล่าสุด) → "มี.ค. 23 – ปัจจุบัน" · ขายล่าสุด พ.ค. 26 → "มี.ค. 23 – พ.ค. 26" + ไม่มียอด 3 เดือน',
      expected: [[true, '2026-08', 'มี.ค. 23 – ปัจจุบัน'], [false, '2026-05', 'มี.ค. 23 – พ.ค. 26', true, 3, 'ไม่มียอด 3 ด.']],
      actual: function () {
        var AG = D().content.pages.skuPlanning.age, K = SP.core.clock, fill = function (t, v) { return String(t).replace(/\{(\w+)\}/g, function (_, k) { return v[k]; }); };
        function range(a) { return fill(AG.range, { from: K.label(a.firstSaleMonth, true), to: a.current ? AG.present : K.label(a.lastSaleMonth, true) }); }
        var a = calc().salesAge(synth([5, 5, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0], '2023-03'), 'K1', 'u1', { channel: false });
        var b = calc().salesAge(synth([5, 5, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0], '2023-03'), 'K1', 'u1', { channel: false });
        return [[a.current, a.lastSaleMonth, range(a)], [b.current, b.lastSaleMonth, range(b), b.noSale, b.monthsSinceLastSale, fill(AG.noSaleBadge, { n: b.monthsSinceLastSale })]];
      }
    },
    {
      name: 'cr27-6. ช่วงอายุการขาย: 12 เดือน → ≤ 1 ปี · 13 และ 24 → 1–2 ปี · 25 → > 2 ปี (อายุนาน) · ใช้ร่วมกับช่อง "ไม่มียอด ≥ 3 เดือน" ได้',
      expected: [['le1y', 'y1to2', 'y1to2', 'gt2y'], [false, false, false, true], [true, false, true, false], [true, true, false]],
      actual: function () {
        var ages = [12, 13, 24, 25].map(ageOf);
        var real = calc().salesAge(synth([5, 5, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0], '2024-08'), 'K1', 'u1', { channel: false });   // 25 เดือน
        var quiet = { started: true, sellingMonths: 20, noSale: true };
        return [ages.map(calc().ageBand), [12, 13, 24].map(function (n) { var a = ageOf(n); a.long = n > D().settings.AGING_LONG_MONTHS; return a.long; }).concat([real.long]),
          [calc().ageMatch(quiet, 'y1to2', true), calc().ageMatch(ageOf(20), 'y1to2', true), calc().ageMatch(ageOf(20), 'y1to2', false), calc().ageMatch(quiet, 'gt2y', true)],
          [calc().ageMatch(quiet, '', true), calc().ageMatch(ageOf(5), '', false), calc().ageMatch(ageOf(5), '', true)]];
      }
    },
    {
      name: 'cr27-7. คอลัมน์ "แผน SKU" หน้า Sub-channel = calc.skuPlanNet = Net Sales ทั้งปีของหน้า SKU Planning = ผลรวมแถวแผน (Pivot)',
      expected: [true, true, true],
      actual: function () {
        var plan = calc().defaultSkuPlan(master(), 'watsons', YEAR, true);
        var net = calc().skuPlanNet(D(), master(), 'watsons', plan, YEAR);
        var g = calc().skuPlanGrid(D(), master(), 'watsons', plan, { year: YEAR, mode: 'initial' });
        var items = calc().skuPlanItems(g, 'watsons', 'mt');
        return [net > 0, net === g.yearTotal.net, Math.abs(sum(items.map(function (it) { return sum(it.net); })) - net) < 1e-6];
      }
    },
    {
      name: 'cr27-8. ปุ่ม "ใช้รูปแบบของ Channel" = สัดส่วนยอดอ้างอิงรวมของทั้ง Channel (รวม 100% · เท่ากับผลรวมยอดอ้างอิงของทุกหน่วยขายใน Channel รวมหน่วยที่ไม่ได้อยู่ในแผน)',
      expected: [[true, true, true], [true, true, true]],
      actual: function () {
        var chs = D().targets.years[YEAR].channels;
        return [chs.map(function (ch) { var s = calc().channelMonthShares(D(), ch); return !!s && s.length === 12 && Math.abs(sum(s) - 1) < 1e-9; }),
          chs.map(function (ch) {
            var s = calc().channelMonthShares(D(), ch);
            var m = [];
            var us = calc().unitsOfChannel(D(), ch).map(function (u) { return calc().referenceValues(calc().referenceMonthly(D(), u.id, YEAR)) || []; });
            for (var i = 0; i < 12; i++) m.push(sum(us.map(function (v) { return v[i]; })));
            var t = sum(m);
            return s.every(function (v, i) { return Math.abs(v - m[i] / t) < 1e-9; });
          })];
      }
    },
    {
      name: 'cr27-9. เป้าหมายเทียบแผนรายผู้รับผิดชอบ (calc.targetPlanBars): เรียงตามเป้าหมายมากไปน้อย · สเกลร่วมเริ่มที่ 0 ≥ ค่ามากสุด · แถวเป้าหมายสูงสุดยาวที่สุด · สีตามสถานะ',
      expected: [['B', 'C', 'A'], 25000000, [0.96, 0.6, 0.4], [0.8, 0.6, 0.44], ['short', 'ok', 'over'], true],
      actual: function () {
        var b = calc().targetPlanBars([{ name: 'A', target: 10000000, plan: 11000000 }, { name: 'B', target: 24000000, plan: 20000000 }, { name: 'C', target: 15000000, plan: 15000000 }]);
        var longest = b.rows.every(function (r) { return r.bar <= b.rows[0].bar; });
        return [b.rows.map(function (r) { return r.name; }), b.scaleMax, b.rows.map(function (r) { return r4(r.bar); }), b.rows.map(function (r) { return r4(r.tick); }),
          b.rows.map(function (r) { return r.status; }), longest];
      }
    },
    {
      name: 'cr27-10. แท่งเป้าหมายเทียบแผนบนหน้าจอ: ความยาว = เป้าหมาย ÷ สเกลร่วม · ขีด = แผน · แกนเริ่มที่ 0 · แผน 0 ไม่มีป้าย "ใหม่"',
      expected: ['80%', '66.667%', '0', 0, 'ข้อความ'],
      actual: function () {
        var ch = SP.core.charts;
        var el = ch.vsLastYearBar(24000000, 20000000, 30000000, { colorToken: '--status-short', newTag: false, title: 'ข้อความ' });
        var zero = ch.vsLastYearBar(5000000, 0, 30000000, { newTag: false });
        var axis = ch.vsLastYearAxis(30000000);
        return [el.querySelector('.vly-bar').style.width, el.querySelector('.vly-tick').style.left, axis.firstChild.textContent,
          zero.querySelectorAll('.vly-new').length, el.title];
      }
    }
  ];
})();
