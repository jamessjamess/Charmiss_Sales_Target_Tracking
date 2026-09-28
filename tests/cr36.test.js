/*
 * tests/cr36.test.js — Test ของ CR-36 (กราฟการเติบโตแนวตั้ง · Product List: หมวดแบบลำดับชั้น · จัดกลุ่ม · Product Year · แท็บ Product Level ·
 *   Launch & Listing: KPI · listedNotPlanned · แผน Clearance · Partner List · คู่มือไม่มี UAT)
 *
 * รันด้วย Node: node tests/run.js cr36 / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   cr36-1 ผลรวม Waterfall · cr36-2 productYear · cr36-3 หมวดแบบลำดับชั้น + จัดกลุ่ม Product Level · cr36-4 สิทธิ์ Product Level ·
 *   cr36-5 KPI Launch & Listing · cr36-6 listedNotPlanned = ข้อความแจ้งใน SKU Planning · cr36-7 Net Sales แผน Clearance ·
 *   cr36-8 แผน Clearance ไม่เปลี่ยนแผน / คงเหลือ + เดือน Clearance ล็อกที่ฟังก์ชัน · cr36-9 คงเหลือสต็อก 3 กรณี · cr36-10 คู่มือ · cr36-11 Partner List ·
 *   cr36-12 (เบราว์เซอร์) Net Sales รวมแผนทุกหน่วยขายเท่าก่อน CR · cr36-13 (เบราว์เซอร์) Waterfall แนวตั้ง
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function D() { return SP.data; }
  function calc() { return SP.core.calc; }
  function P() { return SP.core.permissions; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function data() { var d = {}; Object.keys(D()).forEach(function (k) { d[k] = D()[k]; }); return d; }
  function r2(v) { return Math.round(v * 100) / 100; }
  var YEAR = 2027, MONTH = '2026-09';

  SP.tests.cr36 = [
    {
      name: 'cr36-1. ที่มาการเติบโต: ยอดขาย L12M + ส่วนต่างทุก Channel = Total Target (ล้านบาท ปัด 2 ตำแหน่ง) · 114.42 + 0.77 + 1.18 + 3.63 = 120.00',
      expected: [114.42, [0.77, 1.18, 3.63], 120, true],
      actual: function () {
        var c = calc();
        var w = c.growthWaterfall(c.topDown(D(), D().targets.years[YEAR], YEAR));
        var sum = w.start + c.sum(w.steps.map(function (s) { return s.delta; }));
        return [r2(w.start / 1e6), w.steps.map(function (s) { return r2(s.delta / 1e6); }), r2(w.end / 1e6), r2(sum / 1e6) === r2(w.end / 1e6)];
      }
    },
    {
      name: 'cr36-2. productYear: มี Listing = ปีของเดือนเริ่ม Listing แรก (12130 2024 · 32210 2027 · 53021 2025) · ไม่มี Listing แต่มียอด = ปีของยอดแรก (32090 2025) · ไม่มีทั้งสอง = null (22110)',
      expected: [2024, 2027, 2025, 2025, null],
      actual: function () {
        var c = calc();
        return ['12130', '32210', '53021', '32090', '22110'].map(function (k) { return c.productYear(c.findProduct(D().products, k), D().listings, D().history); });
      }
    },
    {
      name: 'cr36-3. ตัวกรองหมวดสินค้า: Category ไม่มีคำนำหน้า · Sub Category "- " · Type "-- " · ชื่อที่แสดงเมื่อเลือกไม่มีเครื่องหมาย · จัดกลุ่ม Product Level 3 ชั้น ผลรวม SKU ทุกกลุ่ม = จำนวนแถว · ทุกเกณฑ์รวมครบ',
      expected: [['Face', '- Base', '-- Cushion'], [0, 1, 2], 'Cushion', [true, true, true], true],
      actual: function () {
        var c = calc(), tax = D().taxonomy;
        var o = c.categoryOptions(tax);
        var rows = D().products.filter(function (p) { return c.productStatus(p, MONTH) !== 'delete'; });
        var lv = c.groupItems(rows, c.productGroupLevels('level', { tax: tax, labels: { none: '-' } }));
        var deep = lv[0].groups[0].groups[0];
        var all = ['category', 'subCategory', 'type', 'series', 'status', 'year'].every(function (by) {
          var g = c.groupItems(rows, c.productGroupLevels(by, { tax: tax, statusOf: function (p) { return c.productStatus(p, MONTH); }, yearOf: function (p) { return c.productYear(p, D().listings, D().history); }, labels: { none: '-', noYear: '-', status: {} } }));
          return c.groupTotal(g) === rows.length;
        });
        return [o.slice(0, 3).map(function (x) { return x.text; }), o.slice(0, 3).map(function (x) { return x.depth; }), o[2].name,
          [c.groupTotal(lv) === rows.length, !!deep.items, lv[0].groups.every(function (g) { return !!g.groups; })], all && c.productGroupLevels('none', {}) === null];
      }
    },
    {
      name: 'cr36-4. Product Level = ส่วนของหน้า Product List (key เดิม taxonomy · ค่าสิทธิ์เดิม: ทีม Product / ผู้ดูแลระบบ แก้ไข · บทบาทอื่นไม่เห็น) · หน้า Category & Series เดิมซ่อน (perm productList) · เมนู Product Master 3 หน้า',
      expected: [['productList', 'taxonomy'], ['EDIT', 'NONE', 'NONE', 'EDIT'], [false, 'productList'], ['productList', 'launchListing', 'promotionPrice']],
      actual: function () {
        var list = SP.core.registry.list;
        var res = P().resources(list).filter(function (r) { return r.pageId === 'productList'; }).map(function (r) { return r.id; });
        var lv = ['product', 'director', 'supply', 'admin'].map(function (r) { return P().level({ id: 'x', roleIds: [r], active: true }, 'taxonomy'); });
        var t = SP.core.registry.byId('taxonomy');
        var menu = P().visibleEntries(list, { id: 'x', roleIds: ['product'], active: true }).filter(function (e) { return e.group === 'product-master' && e.visible !== false; }).map(function (e) { return e.id; });
        return [res, lv, [t.visible !== false, t.perm], menu];
      }
    },
    {
      name: 'cr36-5. KPI Launch & Listing: สินค้าในแผน NPD แยก Status ณ เดือนปัจจุบัน = จำนวน Planned / NPD / Request ของสินค้าใน Store (ทุกสินค้า Planned · NPD · Request มีแผน NPD)',
      expected: [[5, 0, 2], [5, 0, 2]],
      actual: function () {
        var c = calc();
        function n(list, s) { return list.filter(function (p) { return p && c.productStatus(p, MONTH) === s; }).length; }
        var inNpd = D().npdPlans.map(function (x) { return c.findProduct(D().products, x.productKey); });
        return [['planned', 'new', 'request'].map(function (s) { return n(inNpd, s); }), ['planned', 'new', 'request'].map(function (s) { return n(D().products, s); })];
      }
    },
    {
      name: 'cr36-6. listedNotPlanned: หน่วยขายที่มี Listing ในปีแผนแต่แผน SKU ไม่มีแถวสินค้า (แผนว่าง = ทุกหน่วยที่ Listing · มีแถวแล้ว = ไม่นับ) · ตัวเลขเดียวกับข้อความแจ้งใน SKU Planning ของหน่วยขายเดียวกัน',
      expected: [true, true, true],
      actual: function () {
        var c = calc(), d = data();
        var m = { products: d.products, listings: d.listings, basePrices: d.basePrices, npdPlans: d.npdPlans, taxonomy: d.taxonomy };
        var key = '34150';
        var listed = d.listings.filter(function (l) { return l.productKey === key && c.listedInYear(d.listings, key, l.accountId, YEAR); }).map(function (l) { return l.accountId; });
        var empty = c.listedNotPlanned(m, {}, key, YEAR);
        var plans = {};
        listed.forEach(function (u) { plans[u] = { items: {} }; });
        plans[listed[0]].items[key] = c.newPlanItem(c.findProduct(d.products, key), YEAR, 0, 5);
        var some = c.listedNotPlanned(m, plans, key, YEAR);
        // SKU Planning (หน่วยขายแรก · แผนว่าง): จำนวน NPD ที่ Listing แล้วแต่ยังไม่อยู่ในแผน = จำนวนแผน NPD ที่ listedNotPlanned มีหน่วยขายนี้
        var u = listed[1] || listed[0];
        var pl = {}; pl[u] = { items: {} };
        var notice = SP.core.planEdits.candidates({ data: d, master: m, plan: pl[u], unitId: u, year: YEAR }).npd.filter(function (a) { return !a.blocked && c.listedNotPlanned(m, pl, a.key, YEAR).indexOf(u) >= 0; }).length;
        var chip = d.npdPlans.filter(function (n) { var p = c.findProduct(d.products, n.productKey); return p && c.planTypeOf(d, m, n.productKey, u, YEAR) === 'npdConfirmed' && c.listedNotPlanned(m, pl, n.productKey, YEAR).indexOf(u) >= 0; }).length;
        return [empty.length === listed.length && listed.length > 0, some.length === listed.length - 1 && some.indexOf(listed[0]) < 0, notice === chip && notice > 0];
      }
    },
    {
      name: 'cr36-7. clearancePlanMonthly: 32090 Watsons ม.ค. 2027 125 ชิ้น × ราคา Clearance 79 ÷ 1.07 × (1 − GP 45%) · TT เขต 1 ไม่มี GP · ต่อ Channel / รวม · เดือนนอกช่วง (พ.ค.) = 0',
      expected: [[125, 5075.93], [125, 9228.97], [125, 9228.97], [250, 14304.91], [0, 0]],
      actual: function () {
        var c = calc(), d = data();
        function x(r) { return [r.units, r2(r.netSales)]; }
        return [x(c.clearancePlanMonthly(d, { year: YEAR, productKey: '32090', unitId: 'watsons' })[0]), x(c.clearancePlanMonthly(d, { year: YEAR, productKey: '32090', unitId: 'TT-01' })[0]),
          x(c.clearancePlanMonthly(d, { year: YEAR, channelId: 'tt' })[0]), x(c.clearancePlanMonthly(d, { year: YEAR })[0]), x(c.clearancePlanMonthly(d, { year: YEAR })[4])];
      }
    },
    {
      name: 'cr36-8. แผน Clearance ไม่นับในแผน SKU: เพิ่ม / ลบแผน Clearance แล้วรวมแผน · คงเหลือของหน่วยขายเท่าเดิม · เดือน Clearance ในแผน SKU อ่านอย่างเดียว (applyWrites ไม่เขียน) · ค่าเดิมคงไว้และล้างได้',
      expected: [true, [false, 'clearance', 0], true, [7, 0]],
      actual: function () {
        var c = calc(), d = data();
        var p0 = D().products.filter(function (p) { return c.productStatus(p, MONTH) === 'active'; })[0];
        var key = c.productKey(p0);
        var master = { products: d.products, listings: d.listings.concat([{ productKey: key, accountId: 'seven', status: 'listed', fromMonth: '2024-01', toMonth: null }]), basePrices: d.basePrices, npdPlans: d.npdPlans, taxonomy: d.taxonomy };
        var plan = { items: {} };
        plan.items[key] = c.newPlanItem(p0, YEAR, 0);
        plan.items[key].qty = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
        function withCl(cl) { var dd = data(); var mm = clone(master); mm.products = master.products.map(function (p) { if (c.productKey(p) !== key) return p; var q = clone(p); q.clearance = cl; return q; }); dd.products = mm.products; return { d: dd, m: mm }; }
        var a = withCl({ fromMonth: '2027-03', toMonth: '2027-05', stockQty: 500, price: 49, unitIds: ['seven'], plan: { seven: { '2027-03': 100, '2027-04': 100 } } });
        var b = withCl({ fromMonth: '2027-03', toMonth: '2027-05', stockQty: 500, price: 49, unitIds: ['seven'], plan: null });
        var ga = c.skuPlanGrid(a.d, a.m, 'seven', plan, { year: YEAR }), gb = c.skuPlanGrid(b.d, b.m, 'seven', plan, { year: YEAR });
        var same = JSON.stringify(ga.totals) === JSON.stringify(gb.totals) && c.remaining(1000000, ga.yearTotal.net).amount === c.remaining(1000000, gb.yearTotal.net).amount;
        var cell = ga.rows.filter(function (r) { return r.key === key; })[0].cells[2];
        var wrote = c.applyWrites(plan, ga, [{ key: key, m: 2, qty: 99 }]);
        // ค่าเดิมก่อน CR-36 (Override) ในเดือน Clearance คงไว้ · ล้างค่าได้
        var kept = clone(plan); kept.items[key].overrides = {}; kept.items[key].overrides[3] = true; kept.items[key].qty[3] = 7;
        var gk = c.skuPlanGrid(a.d, a.m, 'seven', kept, { year: YEAR });
        var cleared = c.clearClearanceCells(kept, gk);
        var gc = c.skuPlanGrid(a.d, a.m, 'seven', cleared, { year: YEAR });
        return [same, [cell.state.editable, cell.state.reason, cell.units], wrote.items[key].qty[2] === 10,
          [gk.rows.filter(function (r) { return r.key === key; })[0].cells[3].units, gc.rows.filter(function (r) { return r.key === key; })[0].cells[3].units]];
      }
    },
    {
      name: 'cr36-9. คงเหลือสต็อก = สต็อก − แผนระบาย: 1,200 − 1,000 = 200 ยังระบายไม่หมด · 1,000 − 1,000 = ครบ · 800 − 1,000 = เกินสต็อก · กระจายเท่ากันทุกเดือน (ปัดลง เศษเดือนสุดท้าย)',
      expected: [['left', 200], ['ok', 0], ['over', -200], [1201, 0, 'ok', [150, 151]]],
      actual: function () {
        var c = calc();
        var cl = c.findProduct(D().products, '32090').clearance;
        function s(stock) { var x = clone(cl); x.stockQty = stock; var r = c.clearanceStockState(x); return [r.status, r.remaining]; }
        var y = clone(cl); y.stockQty = 1201;
        y.plan = c.clearanceDistribute(y, ['watsons', 'TT-01'], c.clearanceMonths(y, YEAR));
        var st = c.clearanceStockState(y);
        return [s(1200), s(1000), s(800), [st.planned, st.remaining, st.status, [y.plan.watsons['2027-01'], y.plan['TT-01']['2027-04']]]];
      }
    },
    {
      name: 'cr36-10. คู่มือ: ไม่มีคำ UAT และสถานการณ์ทดสอบใน content.js / guide.js · แท็บ 2 แท็บ · ชื่อหน้าทุกจุดมาจากเมนู ({page_<id>} ไม่มีหน้าที่ไม่รู้จัก · ไม่พิมพ์ชื่อหน้าเอง) · ไม่มีชื่อหน้าเก่า',
      expected: [0, false, ['overview', 'glossary'], { unknown: [], typed: [] }, 0, true],
      actual: function () {
        var txt = JSON.stringify(D().content) + JSON.stringify(D().guide);
        var old = ['Category & Series', 'Sales Unit & Customer', 'แผนการเปิดตัวสินค้าใหม่ (NPD) หน้า', 'หน้า Account Master'].filter(function (t) { return JSON.stringify(D().guide).indexOf(t) >= 0; }).length;
        return [txt.split('UAT').length - 1, 'scenarios' in D().guide, Object.keys(D().content.pages.aboutPrototype.tabs), SP.core.guide.textIssues(D().guide), old,
          !('uatBlank' in SP.core.guide) && !('keepOnReset' in SP.core.guide)];
      }
    },
    {
      name: 'cr36-11. Partner List: ชื่อหน้า · เมนู · สิทธิ์ · ไฟล์ส่งออก (id salesUnits · หัวกลุ่ม Account Master คงเดิม)',
      expected: ['Partner List', 'Partner List', 'Partner List', true, 'Account Master'],
      actual: function () {
        var pg = D().content.pages.salesUnits;
        var lab = (D().permissionResources.pages.salesUnits || []).filter(function (r) { return r.main; })[0].label;
        return [pg.title, SP.core.registry.byId('salesUnits').title, lab, /^Partner-List_/.test(pg.exportFile), D().content.site.groups['account-master']];
      }
    },
    {
      name: 'cr36-12. (เบราว์เซอร์) Net Sales รวมแผนทุกหน่วยขาย (ข้อมูลตั้งต้น) เท่ากับก่อน CR 111,046,508 บาท (ก่อน CR-36 ไม่มีสินค้าที่มีช่วง Clearance · 32090 ไม่อยู่ในแผน SKU · แผน Clearance ไม่นับ)',
      expected: [111046508, true],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test (Node ข้ามข้อนี้) · ตัวเลขเดียวกับ Plan Summary (report.build)
        var rep = SP.core.report.build(), c = calc();
        var total = c.sum(rep.units.map(function (u) { return u.plan; }));
        var clearanceRows = (rep.skuItems || []).filter(function (it) { return it.planType === 'clearance' && c.sum(it.units || []) > 0; }).length;
        return [Math.round(total), clearanceRows === 0];
      }
    },
    {
      name: 'cr36-13. (เบราว์เซอร์) Waterfall แนวตั้ง: 5 แท่ง · แกนเริ่ม 100 ล้าน (สัญลักษณ์ตัดแกน) · ปลาย 120 ล้าน · เส้นประ 4 เส้น · ค่าบนแท่ง',
      expected: [5, 100000000, 120000000, true, 4, ['114.42', '+0.77', '+1.18', '+3.63', '120.00']],
      actual: function () {
        var c = calc(), F = SP.core.format;
        var w = c.growthWaterfall(c.topDown(D(), D().targets.years[YEAR], YEAR));
        function mb(v) { return F.millionPlain(v, 2); }
        var el = SP.core.charts.waterfallColumns({ start: { label: 'L12M', value: w.start }, end: { label: 'Total', value: w.end },
          steps: w.steps.map(function (s) { return { id: s.id, label: s.name, value: s.delta }; }), format: mb, signed: function (v) { return (v < 0 ? '−' : '+') + mb(Math.abs(v)); }, axisNote: function () { return 'x'; } });
        return [el.querySelectorAll('.wfv-col').length, el.info.start, el.info.end, !!el.querySelector('.wfv-break'), el.querySelectorAll('.wfv-link').length,
          Array.prototype.map.call(el.querySelectorAll('.wfv-value'), function (x) { return x.textContent; })];
      }
    }
  ];
})();
