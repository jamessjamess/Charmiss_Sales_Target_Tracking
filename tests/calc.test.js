/*
 * tests/calc.test.js — Test ของ core/calc.js, core/workflow.js (และ format.js บางส่วน)
 *
 * เปิด tests/calc.test.html ในเบราว์เซอร์เพื่อดูผลผ่าน/ไม่ผ่านบนหน้าจอ
 * Test 1–6 ตรงกับ PROMPT_concept-prototype.md ส่วนที่ 6 ที่เหลือเป็น Business Rules เพิ่มเติม และ Test ของแต่ละ CR
 * อ่านจาก data/: settings, channels, accounts, territories, salespeople, assignments, products, listings, pricing,
 *               targets, history, actuals
 * store: ไม่อ่าน ไม่เขียน
 */
(function (SP) {
  'use strict';

  var calc = SP.core.calc;
  var W = SP.core.workflow;
  var F = SP.core.format;
  var D = SP.data;
  var YEAR = D.settings.DEFAULT_PLAN_YEAR;
  var PRIOR = D.history.years[YEAR - 1].monthly;
  var GRID = { year: YEAR };

  function round2(n) { return Math.round(n * 100) / 100; }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function sku(id) { return D.products.filter(function (p) { return p.sku === id; })[0]; }
  var MASTER = { products: D.products, listings: D.listings };
  function plan(accountId) { return calc.defaultSkuPlan(MASTER, accountId, YEAR, true); }
  function row(grid, id) { return grid.rows.filter(function (r) { return r.product.sku === id; })[0]; }
  function range(a, b) { var out = []; for (var i = a; i <= b; i++) out.push(i); return out; }
  function show(v) { return typeof v === 'string' ? v : JSON.stringify(v); }

  var CASES = [
    {
      name: '1. 100 ชิ้น × 50 บาท GP 45% → ก่อน VAT 5,000 / Net Sales 2,750 / รวม VAT 5,350',
      expected: [5000, 2750, 5350],
      actual: function () {
        var c = calc.chain({ units: 100, price: 50, gp: 0.45, includesVat: false });
        return [round2(c.sellOutExVat), round2(c.netSales), round2(c.sellOutIncVat)];
      }
    },
    {
      name: '2. Net Sales 100 GP 45% → ก่อน VAT 181.82 / รวม VAT 194.55',
      expected: [181.82, 194.55],
      actual: function () {
        var r = calc.reverseChain(100, 0.45);
        return [round2(r.sellOutExVat), round2(r.sellOutIncVat)];
      }
    },
    {
      name: '3. Clearance 1,000 ชิ้น 3 เดือน → 333 / 333 / 334',
      expected: [333, 333, 334],
      actual: function () { return calc.clearanceSplit(1000, 3); }
    },
    {
      name: '4. Promo 10 จาก 30 วัน ราคาปกติ 100 Promo 70 → 90',
      expected: 90,
      actual: function () { return round2(calc.effectivePrice(100, [{ days: 10, price: 70 }], 30)); }
    },
    {
      name: '5a. Remaining: เป้า 10,000 แบ่งแล้ว 9,500 → 500 (5%) ยังจัดสรรไม่ครบ',
      expected: [500, 0.05, 'short'],
      actual: function () { var r = calc.remaining(10000, 9500); return [r.amount, round2(r.pct), r.status]; }
    },
    {
      name: '5b. Remaining: เป้า 10,000 แบ่งแล้ว 10,300 → −300 เกินเป้า',
      expected: [-300, 'over'],
      actual: function () { var r = calc.remaining(10000, 10300); return [r.amount, r.status]; }
    },
    {
      name: '6. Seasonality Index 12 เดือนเฉลี่ยเท่ากับ 1.0 (ทุก Sub-channel ในข้อมูลตัวอย่าง)',
      expected: true,
      actual: function () {
        return Object.keys(PRIOR).every(function (id) {
          var si = calc.seasonalityIndex(PRIOR[id]);
          return Math.abs(calc.sum(si) / 12 - 1) < 1e-9;
        });
      }
    },
    // ---------------- Change Request: Top-down v2 (PROMPT_change_top-down-v2.md ข้อ 5 และ 7) ----------------
    {
      name: 'v2-5a. เป้าชั้นบน 54,000,000 กรอก 40% → 21,600,000',
      expected: 21600000,
      actual: function () { return round2(calc.amountFromPct(54000000, 0.40)); }
    },
    {
      name: 'v2-5b. เป้าชั้นบน 54,000,000 กรอก 18,900,000 → 35.00%',
      expected: '35.00%',
      actual: function () { return F.pct(calc.pctFromAmount(54000000, 18900000), 2); }
    },
    {
      name: 'v2-5c. เก็บ 40% แล้วเปลี่ยนเป้าชั้นบนเป็น 60,000,000 → 24,000,000',
      expected: 24000000,
      actual: function () {
        var stored = calc.pctFromAmount(54000000, calc.amountFromPct(54000000, 0.40));
        return round2(calc.amountFromPct(60000000, stored));
      }
    },
    {
      name: 'v2-7a. เป้า 54,000,000 ปีก่อน 48,000,000 → Growth 12.50%',
      expected: '+12.50%',
      actual: function () { return F.signedPct(calc.growth(54000000, 48000000), 2); }
    },
    {
      name: 'v2-7b. ปีก่อน 3 Account = 10, 30, 60 → สัดส่วน 10%, 30%, 60%',
      expected: [0.1, 0.3, 0.6],
      actual: function () { return calc.priorShares([10, 30, 60]).map(round2); }
    },
    {
      name: 'v2: Account ไม่มียอดปีก่อน → Growth null (แสดง "ใหม่") และได้สัดส่วนปีก่อน 0%',
      expected: [null, [0.25, 0.75, 0]],
      actual: function () { return [calc.growth(1000, null), calc.priorShares([10, 30, null]).map(round2)]; }
    },
    {
      name: 'v2: เป้าชั้นบนเป็น 0 แล้วกรอกบาท → % = 0 (ไม่หารด้วย 0)',
      expected: 0,
      actual: function () { return calc.pctFromAmount(0, 5000); }
    },
    {
      name: 'v2: Top-down 2027 — Growth มีทั้งบวกและติดลบ และ History ของ Channel รวม Account ที่ไม่อยู่ในแผน',
      expected: [true, true, true],
      actual: function () {
        var t = calc.topDown(D, D.targets.years[YEAR], YEAR);
        var g = [t.growth].concat(t.children.map(function (c) { return c.growth; }));
        t.children.forEach(function (c) { c.children.forEach(function (a) { g.push(a.growth); }); });
        var mt = t.children[0];
        var planned = calc.sum(mt.children.map(function (a) { return a.prior; }));
        return [g.some(function (x) { return x > 0; }), g.some(function (x) { return x < 0; }), mt.prior > planned];
      }
    },
    {
      name: 'v2: ปีที่ไม่มีข้อมูลตั้งต้น (2028) — ไม่มียอดปีก่อน Phasing เท่ากัน 12 เดือน',
      expected: [null, true],
      actual: function () {
        var t = calc.topDown(D, { total: 0, pct: {}, channels: D.targets.defaultChannels, units: D.targets.defaultUnits }, 2028);
        var shares = calc.defaultPhasing(D, 2028, 'shopee');
        return [t.prior, shares.every(function (s) { return Math.abs(s - 1 / 12) < 1e-12; })];
      }
    },
    {
      name: 'v2: รายการ "+ เพิ่ม Account" = Account ที่ active ใน Channel และยังไม่อยู่ในแผน',
      expected: ['beautrium', 'cjexpress', 'konvy', 'lotuss', 'tsuruha', 'mrdiy'],
      actual: function () { return calc.availableUnits(D, D.targets.years[YEAR], 'mt').map(function (a) { return a.id; }); }
    },
    // ---------------- Change Request: Phasing v2 (PROMPT_change_phasing-v2.md ข้อ 5) ----------------
    {
      name: 'ph-5a. เป้าทั้งปี 18,900,000 เดือนละ 10% → 1,890,000',
      expected: 1890000,
      actual: function () { return round2(calc.phasingTotals(18900000, [0.1]).amounts[0]); }
    },
    {
      name: 'ph-5b. เป้าทั้งปี 18,900,000 กรอก 2,000,000 → 10.58%',
      expected: '10.58%',
      actual: function () { return F.pct(calc.pctFromAmount(18900000, 2000000), 2); }
    },
    {
      name: 'ph-5c. ผลรวม % รายเดือน 98% → Remaining 2% (378,000 บาท) ยังจัดสรรไม่ครบ',
      expected: [0.98, 378000, 0.02, 'short'],
      actual: function () {
        var pct = [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.09, 0.09];
        var t = calc.phasingTotals(18900000, pct);
        return [round2(t.pctSum), Math.round(t.remaining.amount), round2(t.remaining.pct), t.remaining.status];
      }
    },
    {
      name: 'ph-5d. ยอดปีก่อนรายเดือน [1, 1, 2] → สัดส่วน 25%, 25%, 50%',
      expected: [0.25, 0.25, 0.5],
      actual: function () { return calc.seasonalityShares([1, 1, 2]); }
    },
    {
      name: 'ph-5e. Account ไม่มีข้อมูลปีก่อน (MR.DIY) → ได้สัดส่วนของ Channel MT',
      expected: [true, 'channel', true],
      actual: function () {
        var own = calc.defaultPhasing(D, YEAR, 'mrdiy');
        var ch = calc.seasonalityShares(calc.channelMonthly(D, YEAR - 1, 'mt'));
        return [calc.priorMonthly(D.history, YEAR, 'mrdiy') === null, calc.phasingBasis(D, YEAR, 'mrdiy').source, !calc.sharesDiffer(own, ch)];
      }
    },
    {
      name: 'ph: ค่าตั้งต้นของ Account ที่มีข้อมูล = สัดส่วนยอดปีก่อนของ Account นั้น และไม่นับว่า "แก้แล้ว"',
      expected: ['account', false, true],
      actual: function () {
        var d = calc.defaultPhasing(D, YEAR, 'shopee');
        var changed = d.slice(); changed[5] += 0.01;
        return [calc.phasingBasis(D, YEAR, 'shopee').source, calc.sharesDiffer(d, calc.seasonalityShares(PRIOR.shopee)), calc.sharesDiffer(d, changed)];
      }
    },
    {
      name: 'ph: เก็บ % รายเดือนไว้ แล้วเป้าทั้งปีเปลี่ยน → บาทรายเดือนปรับตาม % เดิม',
      expected: [1890000, 2100000],
      actual: function () { return [calc.phasingTotals(18900000, [0.1]).amounts[0], calc.phasingTotals(21000000, [0.1]).amounts[0]].map(round2); }
    },
    {
      name: 'ph: Sales Person ที่กำหนดให้หน่วยใน MT ได้ (มี.ค. 2027) = ทำงานอยู่ + Channel MT หรือดูแลทุก Channel (ไม่มีคนที่ลาออก)',
      expected: ['sp-anan', 'sp-pim', 'sp-kam'],
      actual: function () { return calc.eligiblePeople(D.salespeople, 'mt', '2027-03').map(function (p) { return p.id; }); }
    },
    // ---------------- Business Rules เพิ่มเติม ----------------
    {
      name: 'Remaining ภายใน ±1 บาท ถือว่าครบ',
      expected: ['ok', 'ok', 'short'],
      actual: function () { return [calc.remaining(10000, 9999).status, calc.remaining(10000, 10001).status, calc.remaining(10000, 9998.5).status]; }
    },
    {
      name: 'ราคารวม VAT: 100 ชิ้น × 53.50 → ก่อน VAT 5,000',
      expected: 5000,
      actual: function () { return round2(calc.sellOutExVat(100, 53.5, true)); }
    },
    {
      name: 'Promo ตามวันที่: SKU C ใน Shopee เดือน มิ.ย. ราคาเฉลี่ย 90',
      expected: 90,
      actual: function () {
        var segs = calc.promoSegments(D.pricing.promotions, 'C', 'shopee', YEAR, 5);
        return round2(calc.effectivePrice(D.pricing.priceList.C, segs, calc.daysInMonth(YEAR, 5)));
      }
    },
    {
      name: 'Promo คร่อมเดือน 25 พ.ค.–5 มิ.ย. → พ.ค. 7 วัน / มิ.ย. 5 วัน',
      expected: [7, 5],
      actual: function () { return [calc.overlapDays('2027-05-25', '2027-06-05', 2027, 4), calc.overlapDays('2027-05-25', '2027-06-05', 2027, 5)]; }
    },
    {
      name: 'Top-down ตั้งต้น: Total ครบ / MT ยังจัดสรรไม่ครบ / TT เกินเป้า / ECOM ครบ',
      expected: ['ok', 'short', 'over', 'ok'],
      actual: function () {
        var t = calc.topDown(D, D.targets.years[YEAR], YEAR);
        return [t.remaining.status].concat(t.children.map(function (c) { return c.remaining.status; }));
      }
    },
    {
      name: 'Phasing ตั้งต้น: สัดส่วน 12 เดือนรวมเป็น 100%',
      expected: true,
      actual: function () { return Math.abs(calc.sum(calc.seasonalityShares(PRIOR.shopee)) - 1) < 1e-9; }
    },
    {
      name: 'Status SKU A (ขายวันแรก เม.ย.): มี.ค. ยังไม่วางขาย / เม.ย.–มิ.ย. NPD / ก.ค. Existing',
      expected: ['upcoming', 'npd', 'npd', 'npd', 'existing'],
      actual: function () { return [2, 3, 4, 5, 6].map(function (m) { return calc.skuStatus(sku('A'), m, YEAR); }); }
    },
    {
      name: 'Status SKU D: ก.พ. Existing / มี.ค.–พ.ค. Clearance / มิ.ย. เลิกขาย',
      expected: ['existing', 'clearance', 'clearance', 'clearance', 'ended'],
      actual: function () { return [1, 2, 3, 4, 5].map(function (m) { return calc.skuStatus(sku('D'), m, YEAR); }); }
    },
    {
      name: 'วิธีเติมยอด SKU A (เริ่มขายใน Shopee = เม.ย.): มี.ค. ล็อก / เม.ย. กรอกเอง / ธ.ค. กรอกเอง (พ้น NPD แล้วยังกรอกเอง)',
      expected: ['locked', 'manual', 'manual'],
      actual: function () {
        var a = sku('A');
        return [2, 3, 11].map(function (m) { return calc.cellSource(a, m, YEAR, false, calc.earliestStartMonth(a, YEAR)); });
      }
    },
    {
      name: 'วิธีเติมยอด SKU F (Existing) ใน Shopee เริ่ม ธ.ค.: พ.ย. ล็อก / ธ.ค. กรอกเอง เพราะยังไม่มี Run-rate',
      expected: ['existing', 'locked', 'manual'],
      actual: function () {
        var f = sku('F');
        return [calc.skuStatus(f, 11, YEAR), calc.cellSource(f, 10, YEAR, false, 11), calc.cellSource(f, 11, YEAR, false, 11)];
      }
    },
    {
      name: 'แผนตั้งต้น Shopee = SKU ที่ Listing และขายอยู่ (B C D E F) ไม่มี NPD (A, G ต้องเพิ่มเอง)',
      expected: ['B', 'C', 'D', 'E', 'F'],
      actual: function () { return Object.keys(plan('shopee').items).sort(); }
    },
    {
      name: 'SKU Grid Shopee: SKU D ม.ค. ระบบเติม / มี.ค.–พ.ค. Clearance 333/333/334 (Stock 8,000 ÷ 8 Account) / มิ.ย. ล็อก 0',
      expected: ['system', 1000, 'clearance', 333, 333, 334, 'locked', 0],
      actual: function () {
        var d = row(calc.skuPlanGrid(D, MASTER, 'shopee', plan('shopee'), GRID), 'D').cells;
        return [d[0].source, calc.clearanceStockFor(sku('D'), D.listings, 'shopee'), d[2].source, d[2].units, d[3].units, d[4].units, d[5].source, d[5].units];
      }
    },
    {
      name: 'SKU Grid: ระบบเติม = Run-rate × Seasonality Index (SKU B Shopee เดือน พ.ย.)',
      expected: true,
      actual: function () {
        var g = calc.skuPlanGrid(D, MASTER, 'shopee', plan('shopee'), GRID);
        return row(g, 'B').cells[10].units === Math.round(D.history.runRate.B.shopee * g.si[10]);
      }
    },
    {
      name: 'SKU Grid: Override ช่องระบบเติม → ใช้ค่าที่กรอก / ไม่ Override → ค่าระบบ',
      expected: [500, true, false],
      actual: function () {
        var pl = plan('shopee');
        pl.items.B.qty[4] = 500; pl.items.B.overrides[4] = true;
        var c = row(calc.skuPlanGrid(D, MASTER, 'shopee', pl, GRID), 'B').cells;
        return [c[4].units, c[4].override, c[5].override];
      }
    },
    {
      name: 'SKU Grid: ผลรวม Plan รายเดือน = ผลรวมของทุก SKU',
      expected: true,
      actual: function () {
        var pl = plan('watsons');
        pl.items.A = calc.newPlanItem(sku('A'), YEAR, 800);
        var g = calc.skuPlanGrid(D, MASTER, 'watsons', pl, GRID);
        return g.totals.net.every(function (t, m) {
          return Math.abs(t - calc.sum(g.rows.map(function (r) { return r.cells[m].net; }))) < 1e-6;
        });
      }
    },
    // ---------------- Change Request: SKU v2 (PROMPT_change_sku-v2.md ข้อ 3) ----------------
    {
      name: 'sku-1. cellState โหมดสร้างแผนครั้งแรก: ทุกเดือนแก้ได้ ยกเว้นช่องล็อก 0',
      expected: [true, true, true, false],
      actual: function () {
        var all = range(0, 11).every(function (m) { return calc.cellState('initial', m, 2, 'manual').editable; });
        var sys = range(0, 11).every(function (m) { return calc.cellState('initial', m, 2, 'system').editable; });
        var cl = calc.cellState('initial', 3, 2, 'clearance').editable;
        return [all, sys, cl, calc.cellState('initial', 5, 2, 'locked').editable];
      }
    },
    {
      name: 'sku-2. cellState โหมดปรับแผน เดือนปัจจุบัน มี.ค.: ม.ค.–มี.ค. Actual / เม.ย.–มิ.ย. ล็อก / ก.ค.–ธ.ค. แก้ได้',
      expected: 'actual,actual,actual,frozen,frozen,frozen,open,open,open,open,open,open|false,false,false,false,false,false,true,true,true,true,true,true',
      actual: function () {
        var st = range(0, 11).map(function (m) { return calc.cellState('reforecast', m, 2, 'system'); });
        return st.map(function (x) { return x.reason; }).join(',') + '|' + st.map(function (x) { return x.editable; }).join(',');
      }
    },
    {
      name: 'sku-3. NPD เริ่มขายใน Account เดือน พ.ค.: ม.ค.–เม.ย. = ล็อก 0 / พ.ค. = กรอกเอง',
      expected: ['locked', 'locked', 'locked', 'locked', 'manual'],
      actual: function () { return range(0, 4).map(function (m) { return calc.cellSource(sku('A'), m, YEAR, false, 4); }); }
    },
    {
      name: 'sku-4. เลือกเดือนเริ่มขายใน Account ก่อน Launch Date (SKU A เม.ย.) → ไม่ยอมรับ',
      expected: [false, false, true, true],
      actual: function () { var a = sku('A'); return [0, 2, 3, 11].map(function (m) { return calc.validStartMonth(a, m, YEAR); }); }
    },
    {
      name: 'sku-5. Status: Launch 15 เม.ย. 2027 → เม.ย.–มิ.ย. NPD, ก.ค. Existing / มี Clearance มี.ค.–พ.ค. → Clearance มาก่อน',
      expected: ['npd', 'npd', 'npd', 'existing', 'clearance', 'clearance', 'clearance', 'npd'],
      actual: function () {
        var t = { sku: 'T', launchDate: '2027-04-15', discontinueMonth: null, clearance: null };
        var tc = { sku: 'T', launchDate: '2027-04-15', discontinueMonth: null, clearance: { fromMonth: '2027-03', toMonth: '2027-05', stockQty: 300 } };
        return [3, 4, 5, 6].map(function (m) { return calc.skuStatus(t, m, YEAR); })
          .concat([2, 3, 4, 5].map(function (m) { return calc.skuStatus(tc, m, YEAR); }));
      }
    },
    {
      name: 'sku-6. ลบ SKU ในโหมดปรับแผน เดือนปัจจุบัน มี.ค. → ก.ค.–ธ.ค. = 0 และ ม.ค.–มิ.ย. คงเดิม (Baseline ไม่เปลี่ยน)',
      expected: [true, true, true, true],
      actual: function () {
        var opts = { year: YEAR, mode: 'reforecast', currentMonth: 2 };
        var pl = plan('shopee');
        var before = row(calc.skuPlanGrid(D, MASTER, 'shopee', pl, opts), 'B').cells.map(function (c) { return c.units; });
        var stopped = calc.stopPlanItem(pl.items.B, 2);
        var after = row(calc.skuPlanGrid(D, MASTER, 'shopee', { items: { B: stopped } }, opts), 'B').cells.map(function (c) { return c.units; });
        return [
          range(6, 11).every(function (m) { return after[m] === 0; }),
          range(0, 5).every(function (m) { return after[m] === before[m] && before[m] > 0; }),
          stopped.stopped === true,
          pl.items.B.stopped === false && pl.items.B.overrides.every(function (o) { return !o; })
        ];
      }
    },
    {
      name: 'sku-7. SKU ที่ไม่ได้ Listing ใน Account ไม่อยู่ในรายการเพิ่ม SKU (7-Eleven ไม่มี A, Watsons ไม่มี G แต่มี A)',
      expected: [[], ['A']],
      actual: function () {
        return [calc.availableSkus(MASTER, 'seven', plan('seven'), YEAR).map(function (x) { return x.product.sku; }),
          calc.availableSkus(MASTER, 'watsons', plan('watsons'), YEAR).map(function (x) { return x.product.sku; })];
      }
    },
    {
      name: 'sku: ติ๊ก Listing SKU G ใน Watsons → เพิ่มได้ และเป็น NPD (เริ่มขาย ต.ค.)',
      expected: [['A', 'G'], 'npd', 9],
      actual: function () {
        var m = { products: D.products, listings: D.listings.concat([{ sku: 'G', accountId: 'watsons' }]) };
        var av = calc.availableSkus(m, 'watsons', plan('watsons'), YEAR);
        return [av.map(function (x) { return x.product.sku; }), av[1].status, calc.newPlanItem(sku('G'), YEAR, 0).startMonth];
      }
    },
    {
      name: 'sku: โหมดปรับแผน เดือน Actual ใช้ยอดจริงจาก data/actuals.js',
      expected: true,
      actual: function () {
        var c = row(calc.skuPlanGrid(D, MASTER, 'shopee', plan('shopee'), { year: YEAR, mode: 'reforecast', currentMonth: 2 }), 'B').cells;
        return c[0].units === D.actuals.years[YEAR].shopee.B[0] && c[2].units === D.actuals.years[YEAR].shopee.B[2] && c[3].units === c[3].planned;
      }
    },
    // ---------------- Change Request: v3 Channel Master + Workflow (PROMPT_change_approval-topdown-v3.md ข้อ 1, 3.7) ----------------
    {
      name: 'v3: Channel จาก Master — แผน 2027 มี 3 Channel / "+ เพิ่ม Channel" เหลือ Export / เพิ่มแล้ว 4 Channel สีถัดไป',
      expected: [['mt', 'tt', 'ecom'], ['export'], 4, '--ch-4', null, '--ch-6'],
      actual: function () {
        var pl = JSON.parse(JSON.stringify(D.targets.years[YEAR]));
        var before = calc.topDown(D, pl, YEAR).children.map(function (c) { return c.id; });
        var avail = calc.availableChannels(D, pl).map(function (c) { return c.id; });
        pl.channels.push('export'); pl.units.export = ['exp-kh'];
        var t = calc.topDown(D, pl, YEAR);
        var ex = t.children[3];
        return [before, avail, t.children.length, ex.color, ex.prior, calc.channelColor({ order: 6 })];
      }
    },
    {
      name: 'v3/v4: TT แบ่งเป้าตามเขต (TERRITORY) — 5 เขตใน Master, "+ เพิ่มเขต" เหลือเขต 4 และ 5, GP = 0 (hasGP false)',
      expected: [['tt-north', 'tt-northeast', 'tt-central', 'tt-east', 'tt-south'], ['tt-east', 'tt-south'], 0, 0.2],
      actual: function () {
        return [calc.unitsOfChannel(D, 'tt').map(function (u) { return u.id; }),
          calc.availableUnits(D, D.targets.years[YEAR], 'tt').map(function (u) { return u.id; }),
          calc.gpOf(D, 'tt-north'), calc.gpOf(D, 'shopee')];
      }
    },
    {
      name: 'v4: History ปีก่อนของ TT ผูกกับเขต — ยอด Channel TT = รวม 5 เขต',
      expected: true,
      actual: function () {
        var sumUnits = calc.sum(calc.unitsOfChannel(D, 'tt').map(function (u) { return calc.unitHistory(D.history, YEAR - 1, u.id) || 0; }));
        return calc.channelHistory(D, YEAR - 1, 'tt') === sumUnits && calc.unitHistory(D.history, YEAR - 1, 'tt-north') > 0;
      }
    },
    {
      name: 'wf-1. ร่าง + Sales Director (Top-down) → แก้ไข, ส่งอนุมัติ',
      expected: ['edit', 'submit'],
      actual: function () { return W.allowedActions({ status: 'draft', history: [] }, { type: 'director' }, { step: 'topDown' }); }
    },
    {
      name: 'wf-2. รออนุมัติ + Management (Top-down) → อนุมัติ, ส่งกลับแก้',
      expected: ['approve', 'return'],
      actual: function () { return W.allowedActions({ status: 'submitted', history: [] }, { type: 'management' }, { step: 'topDown' }); }
    },
    {
      name: 'wf-3. ส่งกลับแก้โดยไม่มีเหตุผล → ไม่ยอมรับ / มีเหตุผล → ส่งกลับแก้',
      expected: [false, 'noteRequired', true, 'returned'],
      actual: function () {
        var s = { status: 'submitted', history: [] };
        var bad = W.transition(s, 'return', { by: 'Management', note: '  ' });
        var good = W.transition(s, 'return', { by: 'Management', note: 'MT ยังไม่ครบ' });
        return [bad.ok, bad.error, good.ok, good.state.status];
      }
    },
    {
      name: 'wf-4. Phasing ของหน่วยส่งอนุมัติขณะ Top-down ยังไม่อนุมัติ → ไม่ยอมรับ',
      expected: [false, 'upstream', true],
      actual: function () {
        var a = W.canSubmit('phasing', 'shopee', YEAR, { states: { 'topDown.all': { status: 'submitted', history: [] } }, remaining: 'ok' });
        var b = W.canSubmit('phasing', 'shopee', YEAR, { states: { 'topDown.all': { status: 'approved', history: [] } }, remaining: 'ok' });
        return [a.ok, a.reason, b.ok];
      }
    },
    {
      name: 'wf-5. Remaining ไม่ครบ → ส่งอนุมัติไม่ได้ (Top-down ขาดหรือเกิน / SKU ขาดเป้า)',
      expected: [false, false, 'remaining', false, true],
      actual: function () {
        var ok = { 'phasing.shopee': { status: 'approved', history: [] } };
        return [W.canSubmit('topDown', null, YEAR, { remaining: 'short' }).ok,
          W.canSubmit('topDown', null, YEAR, { remaining: 'over' }).ok,
          W.canSubmit('topDown', null, YEAR, { remaining: 'over' }).reason,
          W.canSubmit('sku', 'shopee', YEAR, { states: ok, remaining: 'short' }).ok,
          W.canSubmit('sku', 'shopee', YEAR, { states: ok, remaining: 'over' }).ok];
      }
    },
    {
      name: 'wf-6. Top-down อนุมัติใหม่และเป้าหน่วย A เปลี่ยน → Phasing และ SKU ของ A เป็นต้องตรวจใหม่ หน่วยอื่นไม่เปลี่ยน',
      expected: ['review', 'review', 'approved', 'approved', ['A']],
      actual: function () {
        var ap = { status: 'approved', history: [] };
        var st = { 'topDown.all': { status: 'submitted', history: [] }, 'phasing.A': ap, 'sku.A': ap, 'phasing.B': ap, 'sku.B': ap };
        var r1 = W.applyAction(st, { step: 'topDown', action: 'approve', by: 'Management', snapshot: { A: 1000, B: 2000 } });
        var r2 = W.applyAction(r1.states, { step: 'topDown', action: 'reopen', by: 'Management' });
        var r3 = W.applyAction(r2.states, { step: 'topDown', action: 'submit', by: 'Sales Director' });
        var r4 = W.applyAction(r3.states, { step: 'topDown', action: 'approve', by: 'Management', snapshot: { A: 1500, B: 2000 } });
        var s = r4.states;
        return [s['phasing.A'].status, s['sku.A'].status, s['phasing.B'].status, s['sku.B'].status, r4.changed];
      }
    },
    {
      name: 'wf: ผู้ส่ง Phasing = ผู้รับผิดชอบหน่วย (หน่วยว่าง → Sales Director ส่งแทน) / หลังล็อก Baseline ไม่มีปุ่ม',
      expected: [['edit', 'submit'], [], ['edit', 'submit'], [], ['reopen']],
      actual: function () {
        var d = { status: 'draft', history: [] };
        return [W.allowedActions(d, { type: 'sales', personId: 'sp-mild' }, { step: 'phasing', ownerId: 'sp-mild' }),
          W.allowedActions(d, { type: 'sales', personId: 'sp-ton' }, { step: 'phasing', ownerId: 'sp-mild' }),
          W.allowedActions(d, { type: 'director' }, { step: 'phasing', ownerId: null }),
          W.allowedActions({ status: 'approved', history: [] }, { type: 'director' }, { step: 'phasing', ownerId: 'sp-mild', locked: true }),
          W.allowedActions({ status: 'approved', history: [] }, { type: 'director' }, { step: 'phasing', ownerId: 'sp-mild' })];
      }
    },
    {
      name: 'wf: ล็อก Baseline ได้เมื่อ Top-down และแผน SKU ทุกหน่วยอนุมัติแล้ว',
      expected: [false, ['B'], true],
      actual: function () {
        var ap = { status: 'approved', history: [] };
        var st = { 'topDown.all': ap, 'sku.A': ap, 'sku.B': { status: 'submitted', history: [] } };
        var a = W.canLock(st, ['A', 'B']);
        st['sku.B'] = ap;
        return [a.ok, a.pending, W.canLock(st, ['A', 'B']).ok];
      }
    },
    // ---------------- Change Request: v4 ผู้รับผิดชอบตามช่วงเวลา (PROMPT_change_v4.md ข้อ 1.4) ----------------
    {
      name: 'as-1. หน่วย A: X ม.ค.–มิ.ย., Y ก.ค.–ธ.ค. → ownerOf(A, พ.ค.) = X / ownerOf(A, ส.ค.) = Y',
      expected: ['X', 'Y'],
      actual: function () {
        var people = [{ id: 'X', startMonth: '2020-01', endMonth: null }, { id: 'Y', startMonth: '2020-01', endMonth: null }];
        var list = [{ unitId: 'A', salesPersonId: 'X', fromMonth: '2027-01', toMonth: '2027-06' }, { unitId: 'A', salesPersonId: 'Y', fromMonth: '2027-07', toMonth: null }];
        return [calc.ownerOf(list, people, 'A', '2027-05'), calc.ownerOf(list, people, 'A', '2027-08')];
      }
    },
    {
      name: 'as-2. performanceByPerson(X) รวมเฉพาะ ม.ค.–มิ.ย. ของหน่วย A (เป้าเดือนละ 100 → 600)',
      expected: [600, 600, 'true,true,true,true,true,true,false,false,false,false,false,false'],
      actual: function () {
        var people = [{ id: 'X', startMonth: '2020-01', endMonth: null }, { id: 'Y', startMonth: '2020-01', endMonth: null }];
        var list = [{ unitId: 'A', salesPersonId: 'X', fromMonth: '2027-01', toMonth: '2027-06' }, { unitId: 'A', salesPersonId: 'Y', fromMonth: '2027-07', toMonth: null }];
        var values = { A: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100], B: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50] };
        var x = calc.performanceByPerson(list, people, 'X', YEAR, values);
        var y = calc.performanceByPerson(list, people, 'Y', YEAR, values);
        return [x.total, y.total, x.owned.join(',')];
      }
    },
    {
      name: 'as-3. ช่วงเวลาทับกัน → ไม่ยอมรับ',
      expected: [1, 0],
      actual: function () {
        var overlap = [{ unitId: 'A', salesPersonId: 'X', fromMonth: '2027-01', toMonth: '2027-06' }, { unitId: 'A', salesPersonId: 'Y', fromMonth: '2027-05', toMonth: null }];
        return [calc.validateAssignments(overlap).length, calc.validateAssignments(D.assignments).length];
      }
    },
    {
      name: 'as-4. แก้ assignment ของเดือนที่ผ่านแล้ว (เดือนปัจจุบัน มี.ค.) → ไม่ยอมรับ / ตั้งแต่ มี.ค. ได้',
      expected: [false, 'past', true],
      actual: function () {
        var a = calc.setOwner(D.assignments, 'shopee', 'sp-ton', '2027-02', null, '2027-03');
        var b = calc.setOwner(D.assignments, 'shopee', 'sp-ton', '2027-03', null, '2027-03');
        return [a.ok, a.error, b.ok];
      }
    },
    {
      name: 'as-5. X endMonth = มิ.ย. แต่ยังผูกถึง ธ.ค. → ก.ค.–ธ.ค. นับเป็นว่าง และมี Alert',
      expected: ['X', null, null, 'resigned', [6, 7, 8, 9, 10, 11]],
      actual: function () {
        var people = [{ id: 'X', startMonth: '2020-01', endMonth: '2027-06' }];
        var list = [{ unitId: 'A', salesPersonId: 'X', fromMonth: '2027-01', toMonth: null }];
        var alerts = calc.assignmentAlerts(list, people, ['A'], YEAR);
        return [calc.ownerOf(list, people, 'A', '2027-06'), calc.ownerOf(list, people, 'A', '2027-07'), calc.ownerOf(list, people, 'A', '2027-12'),
          alerts[0].type, alerts[0].months];
      }
    },
    {
      name: 'as-6. เปลี่ยนผู้รับผิดชอบแล้ว Target Baseline และ Forecast ของหน่วยไม่เปลี่ยน',
      expected: [true, true, 'sp-ton'],
      actual: function () {
        var data2 = {}; Object.keys(D).forEach(function (k) { data2[k] = D[k]; });
        data2.assignments = calc.setOwner(D.assignments, 'shopee', 'sp-ton', '2027-07', null, '2027-03').list;
        function targets(d) {
          var t = calc.topDown(d, D.targets.years[YEAR], YEAR);
          return calc.phasingTotals(calc.unitTarget(t, 'shopee'), calc.defaultPhasing(d, YEAR, 'shopee')).amounts;
        }
        function forecast(d) {
          var m = { products: D.products, listings: D.listings };
          return calc.skuPlanGrid(d, m, 'shopee', plan('shopee'), { year: YEAR, mode: 'reforecast', currentMonth: 2 }).totals.net;
        }
        return [same(targets(D), targets(data2)), same(forecast(D), forecast(data2)), calc.ownerOf(data2.assignments, D.salespeople, 'shopee', '2027-08')];
      }
    },
    {
      name: 'as: setOwner ตัดช่วงเดิมและรวมช่วงติดกัน — Shopee มิลิน ม.ค. 2026–มิ.ย. 2027 / ต้นกล้า ก.ค. 2027 เป็นต้นไป',
      expected: [[['sp-mild', '2026-01', '2027-06'], ['sp-ton', '2027-07', null]], 0],
      actual: function () {
        var list = calc.setOwner(D.assignments, 'shopee', 'sp-ton', '2027-07', null, '2027-03').list;
        return [calc.unitAssignments(list, 'shopee').map(function (a) { return [a.salesPersonId, a.fromMonth, a.toMonth]; }), calc.validateAssignments(list).length];
      }
    },
    {
      name: 'as: ข้อมูลตั้งต้น — EVEANDBOY เปลี่ยนคน มี.ค. / TT เขต 3 ว่างทั้งปี (Alert) / บันทึกลาออกย้อนหลังไม่ได้',
      expected: [['sp-wit', 'sp-pim'], 'vacant', 12, 'past'],
      actual: function () {
        var alerts = calc.assignmentAlerts(D.assignments, D.salespeople, ['tt-central', 'shopee'], YEAR);
        return [[calc.ownerOf(D.assignments, D.salespeople, 'eveandboy', '2027-02'), calc.ownerOf(D.assignments, D.salespeople, 'eveandboy', '2027-03')],
          alerts[0].type, alerts[0].months.length, calc.setEndMonth(D.salespeople, 'sp-korn', '2027-01', '2027-03').error];
      }
    },
    // ---------------- Change Request: v4 คำอธิบายการคำนวณ (PROMPT_change_v4.md ข้อ 3.4) ----------------
    {
      name: 'cx-1. cellBreakdown 100 ชิ้น × 50 บาท GP 45% → 5,000.00 / 2,750.00 / 5,350.00',
      expected: ['5,000.00', '2,750.00', '5,350.00'],
      actual: function () {
        var b = calc.cellBreakdown(100, 50, 0.45, false);
        return [F.baht(b.sellOutExVat, 2), F.baht(b.netSales, 2), F.baht(b.sellOutIncVat, 2)];
      }
    },
    {
      name: 'cx-2. Split ของ Sell-out ก่อน VAT 5,000 GP 45% → Net Sales 2,750 (51.4%) · GP 2,250 (42.1%) · VAT 350 (6.5%) รวม 5,350',
      expected: [['net', 2750, '51.4%'], ['gp', 2250, '42.1%'], ['vat', 350, '6.5%'], 5350],
      actual: function () {
        var sp = calc.moneySplit(5000, 0.45, true);
        return sp.parts.map(function (p) { return [p.key, round2(p.value), F.pct(p.share)]; }).concat([round2(sp.total)]);
      }
    },
    {
      name: 'cx-3. Channel ที่ hasGP = false → Split ไม่มีส่วน GP (Net Sales = Sell-out ก่อน VAT)',
      expected: [['net', 'vat'], 5000],
      actual: function () {
        var sp = calc.moneySplit(5000, 0.45, false);
        return [sp.parts.map(function (p) { return p.key; }), round2(sp.parts[0].value)];
      }
    },
    {
      name: 'cx: Tooltip ตรงกับช่องในตาราง (SKU B Shopee เม.ย.) และช่องล็อกบอกเหตุผล (SKU A ม.ค.–มี.ค. = ยังไม่วางขาย)',
      expected: [true, 'upcoming'],
      actual: function () {
        var pl = plan('shopee');
        pl.items.A = calc.newPlanItem(sku('A'), YEAR, 1200);
        var g = calc.skuPlanGrid(D, MASTER, 'shopee', pl, GRID);
        var c = row(g, 'B').cells[3];
        var b = calc.cellBreakdown(c.units, c.price, g.gp, g.includesVat);
        return [Math.abs(b.netSales - c.net) < 1e-9 && Math.abs(b.sellOutExVat - c.sellOut) < 1e-9, row(g, 'A').cells[0].lockReason];
      }
    },
    // ---------------- Change Request: v4 Series (PROMPT_change_v4.md ข้อ 3.1) ----------------
    {
      name: 'series: รายการ Series พร้อมจำนวน SKU / Summer Launch 2027 ที่ Listing ใน Shopee แต่ยังไม่อยู่ในแผน = A, H',
      expected: [['Summer Launch 2027', 2], ['Core', 3], ['A', 'H']],
      actual: function () {
        var list = calc.seriesList(D.products);
        var miss = calc.availableSkus(MASTER, 'shopee', plan('shopee'), YEAR).filter(function (a) { return calc.inSeries(a.product, ['Summer Launch 2027']); });
        return [[list[0].value, list[0].count], [list[1].value, list[1].count], miss.map(function (a) { return a.product.sku; })];
      }
    },
    {
      name: 'series: รวม Series ที่เลือก ≤ รวมทั้งหน่วย และ Remaining เทียบกับเป้าทั้งหน่วย',
      expected: true,
      actual: function () {
        var g = calc.skuPlanGrid(D, MASTER, 'shopee', plan('shopee'), GRID);
        var core = calc.sumRows(g.rows.filter(function (r) { return calc.inSeries(r.product, ['Core']); }));
        return core.year.net < g.yearTotal.net && core.year.net > 0;
      }
    },
    {
      name: 'Forecast (ตอนนี้ มิ.ย.): พ.ค. ผ่านไป / มิ.ย. ปัจจุบัน / ก.ค.–ก.ย. ล็อก / ต.ค. ปรับได้',
      expected: ['past', 'current', 'locked', 'locked', 'locked', 'open'],
      actual: function () { return [4, 5, 6, 7, 8, 9].map(function (m) { return calc.monthWindow(5, m, 3); }); }
    },
    {
      name: 'format: −300 / 5.0% / 120.00 ล้าน / 181.82',
      expected: ['−300', '5.0%', '120.00 ล้าน', '181.82'],
      actual: function () { return [F.baht(-300), F.pct(0.05), F.million(120000000), F.baht(181.8181, 2)]; }
    },
    // ---------------- Change Request: v5 UX/UI Review (PROMPT_change_v5_ux-review.md ข้อ 8) ----------------
    {
      name: 'v5-1. สถานะคงเหลือ: 500 → ขาด / −300 → เกิน / 0.5 → จัดสรรครบ / เป้าหมายชั้นบน 0 → ยังไม่กำหนด',
      expected: ['ขาด', 'เกิน', 'จัดสรรครบ', 'ยังไม่กำหนด'],
      actual: function () {
        var A = D.content.labels.alert;
        return [calc.remaining(1500, 1000), calc.remaining(1000, 1300), calc.remaining(1000, 999.5), calc.remaining(0, 0)]
          .map(function (r) { return A[r.status]; });
      }
    },
    {
      name: 'v5-2. การเติบโต: เป้าหมาย 0 → – / ไม่มียอดปีก่อน → ใหม่ / 110 เทียบ 100 → +10.0%',
      expected: ['–', 'ใหม่', '+10.0%'],
      actual: function () {
        var N = D.content.labels.growthNew;
        return [F.growth(calc.growth(0, 100), N), F.growth(calc.growth(100, 0), N), F.growth(calc.growth(110, 100), N)];
      }
    },
    {
      name: 'v5-3. กระจายตามสัดส่วนปัจจุบัน: 40%, 35%, 20% (รวม 95%) → 42.11%, 36.84%, 21.05% (รวม 100%)',
      expected: [42.11, 36.84, 21.05, 100],
      actual: function () {
        var n = calc.normalizeShares([0.40, 0.35, 0.20]);
        return n.map(function (v) { return round2(v * 100); }).concat([round2(calc.sum(n) * 100)]);
      }
    },
    {
      name: 'v5-4. workflowBar บทบาทไม่มีสิทธิ์ → readOnly พร้อมชื่อผู้จัดทำ + สลับเป็นผู้จัดทำ / ผู้อนุมัติก่อนส่ง → waiting',
      expected: [['readOnly', 'มิลิน แก้วใส', 'sales', 'sp-mild'], ['waiting', 'sales'], ['actions', ['edit', 'submit']]],
      actual: function () {
        var ctx = { step: 'phasing', ownerId: 'sp-mild', ownerName: 'มิลิน แก้วใส' };
        var draft = { status: 'draft', history: [] };
        var a = W.viewState(draft, { type: 'management', personId: null }, ctx);
        var b = W.viewState(draft, { type: 'director', personId: null }, ctx);
        var c = W.viewState(draft, { type: 'sales', personId: 'sp-mild' }, ctx);
        return [[a.kind, a.preparerName, a.switchTo.type, a.switchTo.personId], [b.kind, b.switchTo.type], [c.kind, c.actions]];
      }
    },
    {
      name: 'v5-5. รายงาน: ผลรวมแผนตาม Status และตาม Series (Top 8 + อื่นๆ) = แผน Bottom-up รวม',
      expected: [true, true],
      actual: function () {
        var t = calc.topDown(D, D.targets.years[YEAR], YEAR);
        var rows = [], total = 0;
        calc.planUnits(t).forEach(function (u) {
          var g = calc.skuPlanGrid(D, MASTER, u.id, calc.defaultSkuPlan(MASTER, u.id, YEAR, true, D.planSeeds.years[YEAR][u.id]), GRID);
          rows = rows.concat(g.rows);
          total += g.yearTotal.net;
        });
        function sumOf(list) { return calc.sum(list.map(function (x) { return x.value; })); }
        return [Math.abs(sumOf(calc.planMix(rows, 'status')) - total) < 1e-6, Math.abs(sumOf(calc.planMix(rows, 'series', 8)) - total) < 1e-6];
      }
    },
    {
      name: 'v5: ข้อมูลตั้งต้น — Total 120 ล้าน ยอดขายปีก่อน 110–115 ล้าน / แผนรวมต่างจากเป้าไม่เกิน ±5% / มีขาด เกิน และจัดสรรครบ',
      expected: [120000000, true, true, true, true, true],
      actual: function () {
        var t = calc.topDown(D, D.targets.years[YEAR], YEAR);
        var status = {}, plan = 0;
        calc.planUnits(t).forEach(function (u) {
          var g = calc.skuPlanGrid(D, MASTER, u.id, calc.defaultSkuPlan(MASTER, u.id, YEAR, true, D.planSeeds.years[YEAR][u.id]), GRID);
          plan += g.yearTotal.net;
          status[calc.remaining(u.amount, g.yearTotal.net).status] = true;
        });
        return [t.amount, t.prior >= 110e6 && t.prior <= 115e6, Math.abs(plan / t.amount - 1) <= 0.05, !!status.short, !!status.over, !!status.ok];
      }
    },
    {
      name: 'v5: ลบ Account / เขตได้เฉพาะรายการที่ไม่อยู่ในแผน ไม่มียอดขายย้อนหลัง และไม่เคยมีผู้รับผิดชอบ',
      expected: [false, false, true],
      actual: function () {
        var inPlan = { shopee: true };
        return [calc.canRemoveUnit(D, 'shopee', inPlan), calc.canRemoveUnit(D, 'tt-south', {}), calc.canRemoveUnit(D, 'new-account', {})];
      }
    }
  ];

  function run() {
    return CASES.map(function (c) {
      var actual, error = null;
      try { actual = c.actual(); } catch (e) { error = e; }
      return { name: c.name, expected: c.expected, actual: error ? String(error) : actual, pass: !error && same(actual, c.expected) };
    });
  }

  function render(root) {
    var C = SP.core.components, h = C.h;
    var results = run();
    var passed = results.filter(function (r) { return r.pass; }).length;
    var ok = passed === results.length;
    root.appendChild(h('div', { class: 'page-intro' }, h('h1', null, 'Test สูตรคำนวณและ Workflow (core/calc.js, core/workflow.js)')));
    root.appendChild(h('p', { class: 'test-summary ' + (ok ? 'is-pass' : 'is-fail') },
      (ok ? '✓ ผ่านทั้งหมด ' : '✗ ไม่ผ่าน ') + passed + ' / ' + results.length));
    var table = C.table([
      { label: 'Test', key: 'name' },
      { label: 'คาดหวัง', render: function (r) { return show(r.expected); } },
      { label: 'ได้จริง', render: function (r) { return show(r.actual); } },
      { label: 'ผล', className: 'test-result', render: function (r) { return r.pass ? '✓ ผ่าน' : '✗ ไม่ผ่าน'; } }
    ], results);
    Array.prototype.forEach.call(table.querySelectorAll('tbody tr'), function (tr, i) {
      tr.className = 'test-row ' + (results[i].pass ? 'is-pass' : 'is-fail');
    });
    root.appendChild(table);
  }

  SP.modules.calcTest = { run: run, render: render };
})(window.SP);
