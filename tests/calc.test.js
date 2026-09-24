/*
 * tests/calc.test.js — Test ของ core/calc.js, core/workflow.js (และ format.js บางส่วน)
 *
 * เปิด tests/calc.test.html ในเบราว์เซอร์เพื่อดูผลผ่าน/ไม่ผ่านบนหน้าจอ
 * Test 1–6 ตรงกับ PROMPT_concept-prototype.md ส่วนที่ 6 ที่เหลือเป็น Business Rules เพิ่มเติม และ Test ของแต่ละ CR
 * อ่านจาก data/: settings, channels, accounts, territories, salespeople, assignments, taxonomy, products, listings,
 *               pricing (priceList), promotions, npd, targets, history, actuals, plan-seeds, content + core/export.js
 *               สินค้า ราคา Listing และยอดขายปีก่อนราย SKU เป็นข้อมูลจริงที่ core/seed.js นำเข้าจาก data/seed/ (CR-11)
 *               Test ของกฎที่ข้อมูลจริงไม่มีตัวอย่าง (Clearance, Sub Series) ใช้สินค้าสมมติในแต่ละ Test
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
  var TREE = calc.topDown(D, D.targets.years[YEAR], YEAR);
  // เป้าหมายทั้งปีของหน่วย (ใช้หาการเติบโต g ของค่าตั้งต้นแบบยอดปีก่อน × การเติบโต)
  function target(unitId) { return calc.unitTarget(TREE, unitId); }
  function GRID(unitId, extra) {
    var o = { year: YEAR, target: target(unitId) };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }

  function round2(n) { return Math.round(n * 100) / 100; }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  var MASTER = { products: D.products, listings: D.listings, priceList: D.priceList, npdPlans: D.npdPlans };
  function sku(key) { return calc.findProduct(D.products, key); }
  function plan(unitId) { return calc.defaultSkuPlan(MASTER, unitId, YEAR, true); }
  function row(grid, key) { return grid.rows.filter(function (r) { return r.key === key; })[0]; }
  function keys(list) { return list.map(function (x) { return x.key; }); }
  function withData(extra) { var d = {}; Object.keys(D).forEach(function (k) { d[k] = D[k]; }); Object.keys(extra).forEach(function (k) { d[k] = extra[k]; }); return d; }
  // สินค้าที่ใช้ใน Test (productKey จากข้อมูลจริง data/seed/)
  //   NPD_A, NPD_C = สินค้าใหม่ปี 2027 (เปิดตัว 1 มิ.ย.) แผน NPD อนุมัติแล้ว / NPD_B = รออนุมัติ
  //   CUSHION = 12130 Matte All Day Cushion 5g -01 (7-Eleven + EVEANDBOY) / TINT = 33390 Juicy Pop Tint 01 (Mid-year Sale ที่ Shopee)
  //   TINT02 = 33400 (ราคาเฉพาะ 7-Eleven 149) / OLD = 12040 (เลิกขาย ก.ย. 2026) / BROW = 25011 (Campaign Existing → ไม่มี Series)
  var NPD_A = 'NPD_2027Q2_01', NPD_B = 'NPD_2027Q2_02', NPD_C = 'NPD_2027Q2_03', CUSHION = '12130', CUSHION2 = '12140', TINT = '33390',
    TINT02 = '33400', OLD = '12040', BROW = '25011';
  // สินค้าสมมติที่มีช่วง Clearance (ข้อมูลจริงยังไม่มี) → Master ที่เพิ่มสินค้านี้และ Listing 8 หน่วย
  var CLEAR_UNITS = ['seven', 'watsons', 'eveandboy', 'tt-north', 'tt-northeast', 'tt-central', 'shopee', 'lazada'];
  function clearProduct() {
    var p = JSON.parse(JSON.stringify(sku(CUSHION)));
    p.trCode = 'T9'; p.launchDate = '2022-09-01'; p.discontinueMonth = '2027-05';
    p.clearance = { fromMonth: '2027-03', toMonth: '2027-05', stockQty: 8000 };
    return p;
  }
  function clearMaster() {
    return { products: D.products.concat([clearProduct()]), listings: D.listings.concat(CLEAR_UNITS.map(function (u) { return { productKey: 'T9', accountId: u }; })),
      priceList: D.priceList.concat([{ productKey: 'T9', priceType: 'RSP', channelId: null, accountId: null, price: 100, effectiveFrom: '2022-09-01', effectiveTo: null }]), npdPlans: D.npdPlans };
  }
  // Net Sales ปีก่อนของหน่วยจากยอดขายราย SKU (ราคาปีก่อน × (1 − GP))
  function lyNet(unitId) {
    var q = D.history.years[YEAR - 1].skuQty[unitId], t = 0;
    Object.keys(q).forEach(function (k) {
      for (var m = 0; m < 12; m++) {
        if (!q[k][m]) continue;
        var d = calc.pricingDetail(D, k, unitId, YEAR - 1, m);
        t += calc.chain({ units: q[k][m], price: d.price, gp: d.gp }).netSales;
      }
    });
    return t;
  }
  function uniq(list) { return list.filter(function (x, i) { return list.indexOf(x) === i; }); }
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
      actual: function () { return round2(calc.averagePrice(100, [{ days: 10, price: 70 }], 30)); }
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
      name: 'v2: Top-down 2027 — การเติบโตทุกชั้นคำนวณจากยอดปีก่อน (ตัวเลขจริง) และ History ของ Channel รวม Account ที่ไม่อยู่ในแผน',
      expected: [true, true],
      actual: function () {
        var t = calc.topDown(D, D.targets.years[YEAR], YEAR);
        var g = [t.growth].concat(t.children.map(function (c) { return c.growth; }));
        t.children.forEach(function (c) { c.children.forEach(function (a) { g.push(a.growth); }); });
        var mt = t.children[0];
        var planned = calc.sum(mt.children.map(function (a) { return a.prior; }));
        return [g.every(function (x) { return typeof x === 'number' && isFinite(x); }), mt.prior > planned];
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
      name: 'v2: รายการ "+ Account" = Account ที่ active ใน Channel และยังไม่อยู่ในแผน / ECOM: Platform ที่ปิดใช้งานไม่อยู่ในรายการ',
      expected: [['beautrium', 'cjexpress', 'konvy', 'lotuss', 'tsuruha', 'mrdiy'], []],
      actual: function () {
        return [calc.availableUnits(D, D.targets.years[YEAR], 'mt').map(function (a) { return a.id; }),
          calc.availableUnits(D, D.targets.years[YEAR], 'ecom').map(function (a) { return a.id; })];
      }
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
      name: 'Promo ตามวันที่: Juicy Pop Tint 01 (33390) ใน Shopee เดือน มิ.ย. (Mid-year Sale 139 บาท 10 วัน จาก RSP 199) ราคาเฉลี่ย 179',
      expected: 179,
      actual: function () { return round2(calc.effectivePrice(D, TINT, 'shopee', YEAR, 5)); }
    },
    {
      name: 'Promo คร่อมเดือน 25 พ.ค.–5 มิ.ย. → พ.ค. 7 วัน / มิ.ย. 5 วัน',
      expected: [7, 5],
      actual: function () { return [calc.overlapDays('2027-05-25', '2027-06-05', 2027, 4), calc.overlapDays('2027-05-25', '2027-06-05', 2027, 5)]; }
    },
    {
      name: 'Top-down ตั้งต้น (สัดส่วนตามยอดปีก่อน): Total และทุก Channel จัดสรรครบ',
      expected: ['ok', 'ok', 'ok', 'ok'],
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
      name: 'Status NPD_2027Q2_01 (เริ่มขาย 1 มิ.ย.): พ.ค. Planned / มิ.ย.–ส.ค. New / ก.ย. Active',
      expected: ['planned', 'new', 'new', 'new', 'active'],
      actual: function () { return [4, 5, 6, 7, 8].map(function (m) { return calc.statusAt(sku(NPD_A), YEAR, m); }); }
    },
    {
      name: 'Status สินค้าสมมติที่มี Clearance มี.ค.–พ.ค. และเลิกขาย พ.ค.: ก.พ. Active / มี.ค.–พ.ค. Clearance / มิ.ย. Discontinued',
      expected: ['active', 'clearance', 'clearance', 'clearance', 'discontinued'],
      actual: function () { return [1, 2, 3, 4, 5].map(function (m) { return calc.statusAt(clearProduct(), YEAR, m); }); }
    },
    {
      name: 'วิธีเติมยอด NPD_2027Q2_01 (เริ่มขายในหน่วย = มิ.ย.): พ.ค. ล็อก / มิ.ย. กรอกเอง / ธ.ค. กรอกเอง (พ้น New แล้วยังกรอกเอง)',
      expected: ['locked', 'manual', 'manual'],
      actual: function () {
        var a = sku(NPD_A);
        return [4, 5, 11].map(function (m) { return calc.cellSource(a, m, YEAR, false, calc.earliestStartMonth(a, YEAR)); });
      }
    },
    {
      name: 'วิธีเติมยอด 12130 (Active) เริ่ม ธ.ค. ในหน่วยที่ไม่มียอดปีก่อน: พ.ย. ล็อก / ธ.ค. กรอกเอง',
      expected: ['active', 'locked', 'manual'],
      actual: function () {
        var f = sku(CUSHION);
        return [calc.statusAt(f, YEAR, 11), calc.cellSource(f, 10, YEAR, false, 11), calc.cellSource(f, 11, YEAR, false, 11)];
      }
    },
    {
      name: 'แผนตั้งต้น EVEANDBOY: มีสินค้าที่ขายอยู่ + NPD ที่อนุมัติแล้ว / ไม่มี NPD ที่ยังไม่อนุมัติ, สินค้าขาดข้อมูลจำเป็น (Existing), สินค้าที่ไม่ใช่ SALE, สินค้าเลิกขายแล้ว',
      expected: [true, true, false, false, false, false],
      actual: function () {
        var k = Object.keys(plan('eveandboy').items);
        return [[CUSHION, TINT, TINT02].every(function (x) { return k.indexOf(x) >= 0; }), [NPD_A, NPD_C].every(function (x) { return k.indexOf(x) >= 0; }),
          k.indexOf(NPD_B) >= 0, k.indexOf(BROW) >= 0, k.some(function (x) { return sku(x).itemType !== 'SALE'; }), k.indexOf(OLD) >= 0];
      }
    },
    {
      name: 'SKU Grid Shopee (สินค้าสมมติ Clearance): ม.ค. กรอกเอง (ไม่มียอดปีก่อน) / มี.ค.–พ.ค. Clearance 333/333/334 (Stock 8,000 ÷ 8 หน่วย) / มิ.ย. ล็อก 0',
      expected: ['manual', 1000, 'clearance', 333, 333, 334, 'locked', 0],
      actual: function () {
        var m = clearMaster();
        var pl = plan('shopee'); pl.items.T9 = calc.newPlanItem(clearProduct(), YEAR, 0);
        var d = row(calc.skuPlanGrid(D, m, 'shopee', pl, GRID('shopee')), 'T9').cells;
        return [d[0].source, calc.clearanceStockFor(clearProduct(), m.listings, 'shopee'), d[2].source, d[2].units, d[3].units, d[4].units, d[5].source, d[5].units];
      }
    },
    {
      name: 'SKU Grid วิธี Run-rate × Seasonality (เลือกได้ต่อหน่วยขาย): 12130 Shopee เดือน พ.ย. = Run-rate × Seasonality Index',
      expected: [true, 'system', 'runRate'],
      actual: function () {
        var pl = plan('shopee'); pl.method = 'runRate';
        var g = calc.skuPlanGrid(D, MASTER, 'shopee', pl, GRID('shopee'));
        var c = row(g, CUSHION).cells[10];
        return [c.units === Math.round(D.history.runRate[CUSHION].shopee * g.si[10]), c.source, g.method];
      }
    },
    {
      name: 'SKU Grid: Override ช่องระบบเติม → ใช้ค่าที่กรอก / ไม่ Override → ค่าระบบ',
      expected: [500, true, false],
      actual: function () {
        var pl = plan('shopee');
        pl.items[CUSHION].qty[4] = 500; pl.items[CUSHION].overrides[4] = true;
        var c = row(calc.skuPlanGrid(D, MASTER, 'shopee', pl, GRID('shopee')), CUSHION).cells;
        return [c[4].units, c[4].override, c[5].override];
      }
    },
    {
      name: 'SKU Grid: ผลรวม Plan รายเดือน = ผลรวมของทุก SKU',
      expected: true,
      actual: function () {
        var pl = plan('watsons');
        pl.items[NPD_A] = calc.newPlanItem(sku(NPD_A), YEAR, 800);
        var g = calc.skuPlanGrid(D, MASTER, 'watsons', pl, GRID('watsons'));
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
      name: 'sku-3. NPD เริ่มขายในหน่วยเดือน ก.ค.: เม.ย.–มิ.ย. = ล็อก 0 / ก.ค.–ส.ค. = กรอกเอง',
      expected: ['locked', 'locked', 'locked', 'manual', 'manual'],
      actual: function () { return range(3, 7).map(function (m) { return calc.cellSource(sku(NPD_A), m, YEAR, false, 6); }); }
    },
    {
      name: 'sku-4. เลือกเดือนเริ่มขายในหน่วยก่อน Launch Date (NPD_2027Q2_01 มิ.ย.) → ไม่ยอมรับ',
      expected: [false, false, true, true],
      actual: function () { var a = sku(NPD_A); return [0, 4, 5, 11].map(function (m) { return calc.validStartMonth(a, m, YEAR); }); }
    },
    {
      name: 'sku-6. ลบ SKU ในโหมดปรับแผน เดือนปัจจุบัน มี.ค. → ก.ค.–ธ.ค. = 0 และ ม.ค.–มิ.ย. คงเดิม (Baseline ไม่เปลี่ยน)',
      expected: [true, true, true, true],
      actual: function () {
        var opts = GRID('shopee', { mode: 'reforecast', currentMonth: 2 });
        var pl = plan('shopee');
        var before = row(calc.skuPlanGrid(D, MASTER, 'shopee', pl, opts), CUSHION).cells.map(function (c) { return c.units; });
        var stopped = calc.stopPlanItem(pl.items[CUSHION], 2);
        var one = {}; one[CUSHION] = stopped;
        var after = row(calc.skuPlanGrid(D, MASTER, 'shopee', { items: one }, opts), CUSHION).cells.map(function (c) { return c.units; });
        return [
          range(6, 11).every(function (m) { return after[m] === 0; }),
          range(0, 5).every(function (m) { return after[m] === before[m] && before[m] > 0; }),
          stopped.stopped === true,
          pl.items[CUSHION].stopped === false && pl.items[CUSHION].overrides.every(function (o) { return !o; })
        ];
      }
    },
    {
      name: 'sku-7. รายการเพิ่ม SKU: 7-Eleven = NPD ที่ยังไม่อนุมัติ / EVEANDBOY: 5 SKU ที่ขาด Series แสดงแต่เลือกไม่ได้ / สินค้าเลิกขายไม่อยู่ในรายการ',
      expected: [[NPD_B], [null], 5, ['incomplete'], ['["seriesId"]'], false],
      actual: function () {
        var seven = calc.availableSkus(MASTER, 'seven', plan('seven'), YEAR);
        var eab = calc.availableSkus(MASTER, 'eveandboy', plan('eveandboy'), YEAR);
        var blocked = eab.filter(function (x) { return x.blocked; });
        return [keys(seven), seven.map(function (x) { return x.blocked; }), blocked.length, uniq(blocked.map(function (x) { return x.blocked; })),
          uniq(blocked.map(function (x) { return JSON.stringify(x.missing); })), eab.some(function (x) { return x.key === OLD; })];
      }
    },
    {
      name: 'sku: ติ๊ก Listing NPD_2027Q2_02 ใน Watsons → เพิ่มได้ เป็นสินค้าใหม่ของปีแผน และเริ่มขาย มิ.ย.',
      expected: [true, true, null, 5],
      actual: function () {
        var m = { products: D.products, listings: D.listings.concat([{ productKey: NPD_B, accountId: 'watsons' }]), priceList: D.priceList, npdPlans: D.npdPlans };
        var av = calc.availableSkus(m, 'watsons', plan('watsons'), YEAR).filter(function (x) { return x.key === NPD_B; })[0];
        return [!!av, av.npd, av.blocked, calc.newPlanItem(sku(NPD_B), YEAR, 0).startMonth];
      }
    },
    {
      name: 'sku: โหมดปรับแผน เดือน Actual ใช้ยอดจริงจาก data/actuals.js',
      expected: true,
      actual: function () {
        var c = row(calc.skuPlanGrid(D, MASTER, 'shopee', plan('shopee'), GRID('shopee', { mode: 'reforecast', currentMonth: 2 })), CUSHION).cells;
        return c[0].units === D.actuals.years[YEAR].shopee[CUSHION][0] && c[2].units === D.actuals.years[YEAR].shopee[CUSHION][2] && c[3].units === c[3].planned;
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
          return calc.skuPlanGrid(d, MASTER, 'shopee', plan('shopee'), GRID('shopee', { mode: 'reforecast', currentMonth: 2 })).totals.net;
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
      name: 'cx: Tooltip ตรงกับช่องในตาราง (12130 EVEANDBOY เม.ย.) และช่องล็อกบอกเหตุผล (NPD_2027Q2_01 ม.ค.–พ.ค. = Planned)',
      expected: [true, 'planned'],
      actual: function () {
        var pl = plan('eveandboy');
        var g = calc.skuPlanGrid(D, MASTER, 'eveandboy', pl, GRID('eveandboy'));
        var c = row(g, CUSHION).cells[3];
        var b = calc.cellBreakdown(c.units, c.price, c.gp, g.includesVat);
        return [Math.abs(b.netSales - c.net) < 1e-9 && Math.abs(b.sellOutExVat - c.sellOut) < 1e-9, row(g, NPD_A).cells[0].lockReason];
      }
    },
    // ---------------- Change Request: v4 Series (PROMPT_change_v4.md ข้อ 3.1) ----------------
    {
      name: 'series: รายการ Series จาก Campaign ใน Excel ตามลำดับที่พบ / Sanrio Blooming Heart ที่ Listing ใน EVEANDBOY แต่ยังไม่อยู่ในแผน = NPD ที่รออนุมัติ',
      expected: [['ser-charming-lab', 0], ['ser-charming-color', 0], [NPD_B]],
      actual: function () {
        var list = calc.seriesList(D.taxonomy, D.products);
        var miss = calc.availableSkus(MASTER, 'eveandboy', plan('eveandboy'), YEAR).filter(function (a) { return calc.inSeries(a.product, ['ser-sanrio-blooming-heart']); });
        return [[list[0].value, list[0].depth], [list[1].value, list[1].depth], keys(miss)];
      }
    },
    {
      name: 'series: เลือก Series = รวม Sub Series ทั้งหมด / เลือก Sub Series = เฉพาะ Sub Series นั้น / รวม Series ≤ รวมทั้งหน่วย',
      expected: [true, true, false, true],
      actual: function () {
        var g = calc.skuPlanGrid(D, MASTER, 'eveandboy', plan('eveandboy'), GRID('eveandboy'));
        var lab = calc.sumRows(g.rows.filter(function (r) { return calc.inSeries(r.product, ['ser-charming-lab']); }));
        var a = { seriesId: 'S1', subSeriesId: 'S1a' }, b = { seriesId: 'S1', subSeriesId: null };
        return [calc.inSeries(a, ['S1']), calc.inSeries(a, ['S1a']), calc.inSeries(b, ['S1a']), lab.year.net < g.yearTotal.net && lab.year.net > 0];
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
      name: 'v5-5. รายงาน: ผลรวมแผนตาม Status, ตาม Series (Top 8 + อื่นๆ) และตาม Category = แผน Bottom-up รวม',
      expected: [true, true, true],
      actual: function () {
        var t = calc.topDown(D, D.targets.years[YEAR], YEAR);
        var rows = [], total = 0;
        calc.planUnits(t).forEach(function (u) {
          var g = calc.skuPlanGrid(D, MASTER, u.id, calc.defaultSkuPlan(MASTER, u.id, YEAR, true, D.planSeeds.years[YEAR][u.id]), GRID(u.id));
          rows = rows.concat(g.rows);
          total += g.yearTotal.net;
        });
        function sumOf(list) { return calc.sum(list.map(function (x) { return x.value; })); }
        return [Math.abs(sumOf(calc.planMix(rows, 'status')) - total) < 1e-6, Math.abs(sumOf(calc.planMix(rows, 'series', 8)) - total) < 1e-6,
          Math.abs(sumOf(calc.planMix(rows, 'category', 8)) - total) < 1e-6];
      }
    },
    {
      name: 'v5 + CR-11: ข้อมูลตั้งต้น — Total 120 ล้าน ยอดขายปีก่อน 110–115 ล้าน / แผนรวมต่างจากเป้าไม่เกิน ±5% / มีขาด เกิน และจัดสรรครบ',
      expected: [120000000, true, true, true, true, true],
      actual: function () {
        var t = calc.topDown(D, D.targets.years[YEAR], YEAR);
        var status = {}, plan = 0;
        calc.planUnits(t).forEach(function (u) {
          var g = calc.skuPlanGrid(D, MASTER, u.id, calc.defaultSkuPlan(MASTER, u.id, YEAR, true, D.planSeeds.years[YEAR][u.id]), GRID(u.id));
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
    },
    // ---------------- Change Request: v6 Product Master (PROMPT_change_v6_product-master.md ข้อ 9) ----------------
    {
      name: 'v6-1. productStatus: เริ่มขาย 15 เม.ย. 2027 → มี.ค. Planned, เม.ย.–มิ.ย. New, ก.ค. Active / Clearance มี.ค.–พ.ค. มาก่อน / หลัง discontinueMonth = Discontinued',
      expected: ['planned', 'new', 'new', 'new', 'active', 'clearance', 'clearance', 'clearance', 'new', 'discontinued'],
      actual: function () {
        var t = { trCode: 'T1', launchDate: '2027-04-15', discontinueMonth: null, clearance: null };
        var tc = { trCode: 'T2', launchDate: '2027-04-15', discontinueMonth: '2027-08', clearance: { fromMonth: '2027-03', toMonth: '2027-05', stockQty: 300 } };
        return ['2027-03', '2027-04', '2027-05', '2027-06', '2027-07'].map(function (k) { return calc.productStatus(t, k); })
          .concat(['2027-03', '2027-04', '2027-05', '2027-06', '2027-09'].map(function (k) { return calc.productStatus(tc, k); }));
      }
    },
    {
      name: 'v6-2. productCompleteness: ขาด Series และรูป → missingRequired = [Series], missingRecommended = [รูป]',
      expected: [['Series'], ['รูป'], false],
      actual: function () {
        var p = JSON.parse(JSON.stringify(sku(CUSHION)));
        p.barcode = '8859580712130'; p.internalCode = 'CM-12130'; p.subSeriesId = 'S1a';
        p.seriesId = null; p.image = null;
        var c = calc.productCompleteness(p, D.priceList);
        var names = D.content.labels.productFields;
        return [c.missingRequired.map(function (f) { return names[f]; }), c.missingRecommended.map(function (f) { return names[f]; }), c.complete];
      }
    },
    {
      name: 'v6-3. ราคาตามวันที่มีผล: RSP 100 ถึง 31 พ.ค. / 110 ตั้งแต่ 1 มิ.ย. → มิ.ย. = 110, พ.ค. = 100 และราคาใหม่ปิดช่วงของราคาเดิม',
      expected: [110, 100, '2027-05-31', 'date'],
      actual: function () {
        var list = [{ productKey: 'T1', priceType: 'RSP', channelId: null, price: 100, effectiveFrom: '2027-01-01', effectiveTo: null }];
        var res = calc.addPrice(list, { productKey: 'T1', priceType: 'RSP', channelId: null, price: 110, effectiveFrom: '2027-06-01' });
        var d = withData({ priceList: res.list, promotions: [] });
        var bad = calc.addPrice(res.list, { productKey: 'T1', priceType: 'RSP', channelId: null, price: 120, effectiveFrom: '2027-03-01' });
        return [calc.pricingDetail(d, 'T1', 'shopee', YEAR, 5).rsp, calc.pricingDetail(d, 'T1', 'shopee', YEAR, 4).rsp, res.list[0].effectiveTo, bad.error];
      }
    },
    {
      name: 'v6-4. effectivePrice: RSP 100 · Promotion 70 วันที่ 1–10 มิ.ย. (10 จาก 30 วัน) → 90',
      expected: 90,
      actual: function () {
        var d = withData({
          priceList: [{ productKey: 'T1', priceType: 'RSP', channelId: null, price: 100, effectiveFrom: '2027-01-01', effectiveTo: null }],
          promotions: [{ id: 'x1', name: 'P', productKey: 'T1', accountIds: ['shopee'], startDate: '2027-06-01', endDate: '2027-06-10', mode: 'PRICE', value: 70, promoGpPct: null, status: 'CONFIRMED' }]
        });
        return round2(calc.effectivePrice(d, 'T1', 'shopee', YEAR, 5));
      }
    },
    {
      name: 'v6-5. Promotion ส่วนลด 20% บน RSP 100 → 80',
      expected: [80, 80],
      actual: function () {
        var promo = { id: 'x2', name: 'D', productKey: 'T1', accountIds: ['shopee'], startDate: '2027-06-01', endDate: '2027-06-30', mode: 'DISCOUNT_PCT', value: 0.2, promoGpPct: null, status: 'CONFIRMED' };
        var d = withData({ priceList: [{ productKey: 'T1', priceType: 'RSP', channelId: null, price: 100, effectiveFrom: '2027-01-01', effectiveTo: null }], promotions: [promo] });
        return [calc.promoPrice(promo, 100), round2(calc.effectivePrice(d, 'T1', 'shopee', YEAR, 5))];
      }
    },
    {
      name: 'v6-6b. คัดลอก Promotion ไปเดือนถัดไป: ทั้งเดือน → ทั้งเดือนถัดไป / 15–31 ม.ค. → 15–28 ก.พ.',
      expected: [['2027-07-01', '2027-07-31'], ['2027-02-15', '2027-02-28'], ['2028-01-01', '2028-01-31']],
      actual: function () {
        var a = calc.shiftPromotion({ startDate: '2027-06-01', endDate: '2027-06-30' }, 1);
        var b = calc.shiftPromotion({ startDate: '2027-01-15', endDate: '2027-01-31' }, 1);
        var c = calc.shiftPromotion({ startDate: '2027-12-01', endDate: '2027-12-31' }, 1);
        return [[a.startDate, a.endDate], [b.startDate, b.endDate], [c.startDate, c.endDate]];
      }
    },
    {
      name: 'v6-6. Promotion ซ้อนกันใน SKU × Account เดียวกัน → ไม่ยอมรับ (บอกชื่อ Promotion ที่ชน) / คนละ Account → ยอมรับ',
      expected: [false, 'overlap', ['Mid-year Sale'], true],
      actual: function () {
        var p = { id: 'new', name: 'ใหม่', productKey: TINT, accountIds: ['shopee'], startDate: '2027-06-05', endDate: '2027-06-20', mode: 'PRICE', value: 149, status: 'DRAFT' };
        var v = calc.validatePromotion(D.promotions, p, 199);
        var ok = calc.validatePromotion(D.promotions, { id: 'new2', name: 'ใหม่', productKey: TINT, accountIds: ['tiktok'], startDate: '2027-06-05', endDate: '2027-06-20', mode: 'PRICE', value: 149, status: 'DRAFT' }, 199);
        return [v.ok, v.errors[0].code, v.errors[0].names, ok.ok];
      }
    },
    {
      name: 'v6-7. Promotion ฉบับร่างไม่มีผลต่อ effectivePrice',
      expected: [100, 1],
      actual: function () {
        var d = withData({
          priceList: [{ productKey: 'T1', priceType: 'RSP', channelId: null, price: 100, effectiveFrom: '2027-01-01', effectiveTo: null }],
          promotions: [{ id: 'x3', name: 'Draft', productKey: 'T1', accountIds: ['shopee'], startDate: '2027-06-01', endDate: '2027-06-10', mode: 'PRICE', value: 70, promoGpPct: null, status: 'DRAFT' }]
        });
        var det = calc.pricingDetail(d, 'T1', 'shopee', YEAR, 5);
        return [round2(det.price), det.drafts.length];
      }
    },
    {
      name: 'v6-8. ผูกรหัสจริง NPD_2027Q2_01 → 11050: Listing, ราคา, Promotion, แผน NPD และแผน SKU อ้าง 11050 / TR Code ซ้ำ → ไม่ยอมรับ',
      expected: [true, true, true, true, true, true, 'NPD_2027Q2_01', 'duplicate'],
      actual: function () {
        var m = { products: D.products, listings: D.listings, priceList: D.priceList, promotions: D.promotions, npdPlans: D.npdPlans };
        var res = calc.bindTrCode(m, NPD_A, '11050');
        var o = res.master;
        function none(list) { return list.every(function (r) { return r.productKey !== NPD_A; }) && list.some(function (r) { return r.productKey === '11050'; }); }
        var pl = plan('watsons'); pl.items[NPD_A] = calc.newPlanItem(sku(NPD_A), YEAR, 100);
        var moved = calc.renamePlanKey(pl, NPD_A, '11050');
        var p = calc.findProduct(o.products, '11050');
        return [res.ok, none(o.listings), none(o.priceList), none(o.promotions), none(o.npdPlans), !!moved.items['11050'] && !moved.items[NPD_A],
          p.tempCode, calc.bindTrCode(m, NPD_B, CUSHION).error];
      }
    },
    {
      name: 'v6-9. ลบหมวดสินค้าที่มี SKU ใช้อยู่ → ไม่ยอมรับ (บอกจำนวน SKU) / รายการใหม่ที่ไม่มี SKU → ลบได้',
      expected: [false, 'inUse', true, true],
      actual: function () {
        var r = calc.removeTaxonomyNode(D.taxonomy, D.products, 'category', 'type-cushion');
        var added = calc.addTaxonomyNode(D.taxonomy, 'category', 'sub-skin-toner', 'Toner Mist', 'type-toner-mist');
        var rm = calc.removeTaxonomyNode(added.taxonomy, D.products, 'category', 'type-toner-mist');
        return [r.ok, r.error, r.count > 0, rm.ok && added.node.level === 'TYPE'];
      }
    },
    {
      name: 'v6-10. แผน NPD อนุมัติแล้ว → Listing ของหน่วยที่วางแผนถูกตั้งค่า และเดือนเริ่มขายเป็นค่าเริ่มต้นในแผน SKU (NPD_2027Q2_02 EVEANDBOY ก.ค.)',
      expected: [true, true, 6, '2027-06-01'],
      actual: function () {
        var np = JSON.parse(JSON.stringify(D.npdPlans));
        var h = np.filter(function (n) { return n.productKey === NPD_B; })[0];
        h.workflow = { status: 'approved', history: [] };
        var applied = calc.applyNpdApproval({ products: D.products, listings: D.listings.filter(function (l) { return l.productKey !== NPD_B; }) }, h);
        var m = { products: applied.products, listings: applied.listings, priceList: D.priceList, npdPlans: np };
        var pl = calc.defaultSkuPlan(m, 'eveandboy', YEAR, true);
        return [calc.isListed(applied.listings, NPD_B, 'eveandboy'), !!pl.items[NPD_B], pl.items[NPD_B].startMonth, calc.findProduct(applied.products, NPD_B).launchDate];
      }
    },
    {
      name: 'v6-11. แก้ Promotion หลังล็อก Baseline → Net Sales ของ Baseline (Snapshot) ไม่เปลี่ยน / Forecast เปลี่ยน',
      expected: [true, true],
      actual: function () {
        var snapshot = { priceList: D.priceList, promotions: D.promotions.filter(function (p) { return p.status === 'CONFIRMED'; }), gp: { shopee: calc.gpOf(D, 'shopee') } };
        var pl = plan('shopee');
        var before = calc.skuPlanGrid(D, MASTER, 'shopee', pl, GRID('shopee', { snapshot: snapshot })).yearTotal.net;
        var promo = { id: 'late', name: 'หลังล็อก', productKey: CUSHION, accountIds: ['shopee'], startDate: '2027-08-01', endDate: '2027-08-31', mode: 'DISCOUNT_PCT', value: 0.3, promoGpPct: null, status: 'CONFIRMED' };
        var d2 = withData({ promotions: D.promotions.concat([promo]) });
        var baseline = calc.skuPlanGrid(d2, MASTER, 'shopee', pl, GRID('shopee', { snapshot: snapshot })).yearTotal.net;
        var live = calc.skuPlanGrid(d2, MASTER, 'shopee', pl, GRID('shopee', { mode: 'reforecast', currentMonth: 2 })).yearTotal.net;
        var liveBefore = calc.skuPlanGrid(D, MASTER, 'shopee', pl, GRID('shopee', { mode: 'reforecast', currentMonth: 2 })).yearTotal.net;
        return [Math.abs(before - baseline) < 1e-6, live < liveBefore - 1];
      }
    },
    {
      name: 'v6-12. ส่งออก CSV มี BOM และมีเฉพาะคอลัมน์ที่แสดง',
      expected: [true, 'รหัส,ชื่อสินค้า', '12130,Charmiss Matte All Day Acne Cushion SPF50 PA++++ 01 Ivory 5g', 3],
      actual: function () {
        var cols = [{ key: 'code', label: 'รหัส', value: function (p) { return calc.productKey(p); } }, { key: 'name', label: 'ชื่อสินค้า' }];
        var csv = SP.core['export'].toCsv([sku(CUSHION), sku(CUSHION2)], cols);
        var lines = csv.slice(1).replace(/\r\n$/, '').split('\r\n');
        return [csv.charAt(0) === '\uFEFF', lines[0], lines[1], lines.length];
      }
    },
    // ---------------- Change Request: v7 Top-down (PROMPT_change_v7_top-down.md ข้อ 7) ----------------
    {
      name: 'v7-1. % ของ Total ของหน่วยขาย: Channel 25% × หน่วย 40% → 10.00%',
      expected: '10.00%',
      actual: function () { return F.pct(calc.pctOfTotal(0.4, 0.25), 2); }
    },
    {
      name: 'v7-2. แก้เป้าหมาย 12,000,000 ของหน่วยขายใน Channel เป้าหมาย 30,000,000 → % ใน Channel = 40.00%',
      expected: '40.00%',
      actual: function () { return F.pct(calc.pctFromAmount(30000000, 12000000), 2); }
    },
    {
      name: 'v7-3. Waterfall: ปีก่อน MT 51.7 / TT 22.9 / ECOM 38.6 · เป้าหมาย 60 / 30 / 30 → +8.3 / +7.1 / −8.6 รวม +6.8 · แท่งสุดท้าย 120.0',
      expected: [[8.3, 7.1, -8.6], 6.8, 120],
      actual: function () {
        var tree = { prior: 113.2, amount: 120, remaining: { amount: 0 }, children: [
          { id: 'mt', name: 'MT', prior: 51.7, amount: 60 }, { id: 'tt', name: 'TT', prior: 22.9, amount: 30 }, { id: 'ecom', name: 'ECOM', prior: 38.6, amount: 30 }] };
        var w = calc.growthWaterfall(tree);
        var deltas = w.steps.map(function (s) { return Math.round(s.delta * 10) / 10; });
        var total = Math.round(calc.sum(w.steps.map(function (s) { return s.delta; })) * 10) / 10;
        return [deltas, total, Math.round((w.start + calc.sum(w.steps.map(function (s) { return s.delta; }))) * 10) / 10];
      }
    },
    {
      name: 'v7-4. การเติบโต: 120,000,000 เทียบ 113,200,000 → +6.0% (+6,800,000)',
      expected: ['+6.0%', '+6,800,000'],
      actual: function () {
        return [F.growth(calc.growth(120000000, 113200000), 'ใหม่'), F.signedBaht(calc.growthAmount(120000000, 113200000))];
      }
    },
    {
      name: 'v7-5. unitLabel: ECOM → Platform และปุ่ม "+ Platform" / TT → เขตการขาย / gpLabel ECOM = ค่าธรรมเนียม Platform',
      expected: ['Platform', '+ Platform', 'เขตการขาย', 'ค่าธรรมเนียม Platform'],
      actual: function () {
        var ecom = calc.findById(D.channels, 'ecom'), tt = calc.findById(D.channels, 'tt');
        return [ecom.unitLabel, D.content.labels.addUnitButton.replace('{unit}', ecom.unitLabel), tt.unitLabel, ecom.gpLabel];
      }
    },
    {
      name: 'v7-6. ส่งออก CSV หน้า Top-down: มี BOM / จำนวนแถว = Channel + หน่วยขาย + Total + คงเหลือ / % เป็นทศนิยม',
      expected: [true, 3 + 9 + 1 + 4, 3 + 9 + 1 + 4 + 1, '0.45'],
      actual: function () {
        var t = calc.topDown(D, D.targets.years[YEAR], YEAR);
        var rows = calc.topDownRows(t);
        var csv = SP.core['export'].toCsv(rows, [{ key: 'channel', label: 'Channel' }, { key: 'pctOfTotal', label: '% ของ Total', type: 'pct' }]);
        var lines = csv.slice(1).replace(/\r\n$/, '').split('\r\n');
        return [csv.charAt(0) === '\uFEFF', rows.length, lines.length, lines[1].split(',')[1]];
      }
    },
    // ---------------- CR-10 ข้อ 3.4 (ฉบับแก้ไข): แท่งเป้าหมายเทียบปีก่อน สเกลจริงเดียวกันทั้งตาราง ----------------
    {
      name: 'cr10-1. niceScaleMax([54,000,000, 51,700,000, 24,000,000, 22,140,000, …]) → 60,000,000',
      expected: 60000000,
      actual: function () { return SP.core.charts.niceScaleMax([54000000, 51700000, 24000000, 22140000, 22900000, 19800000, 42000000, 38600000]); }
    },
    {
      name: 'cr10-2. vsLastYearBar(54,000,000, 51,700,000, 60,000,000) → แท่ง 90.0% · ขีด 86.2%',
      expected: ['90.0%', '86.2%', '90%', '86.167%'],
      actual: function () {
        var el = SP.core.charts.vsLastYearBar(54000000, 51700000, 60000000);
        return [F.pct(el.info.bar, 1), F.pct(el.info.tick, 1), el.querySelector('.vly-bar').style.width, el.querySelector('.vly-tick').style.left];
      }
    },
    {
      name: 'cr10-3. vsLastYearBar(22,140,000, 19,800,000, 60,000,000) → แท่ง 36.9% · ขีด 33.0% (สั้นกว่าแท่ง MT)',
      expected: ['36.9%', '33.0%', true],
      actual: function () {
        var r = SP.core.charts.vsLastYearBar(22140000, 19800000, 60000000).info;
        var mt = SP.core.charts.vsLastYearBar(54000000, 51700000, 60000000).info;
        return [F.pct(r.bar, 1), F.pct(r.tick, 1), r.bar < mt.bar];
      }
    },
    {
      name: 'cr10-4. vsLastYearBar(24,000,000, 22,900,000, 60,000,000) → แท่ง 40.0% (TT สั้นกว่า MT ตามสัดส่วนจริง 24 : 54)',
      expected: ['40.0%', true],
      actual: function () {
        var tt = SP.core.charts.vsLastYearBar(24000000, 22900000, 60000000).info;
        var mt = SP.core.charts.vsLastYearBar(54000000, 51700000, 60000000).info;
        return [F.pct(tt.bar, 1), Math.abs(tt.bar / mt.bar - 24 / 54) < 1e-9];
      }
    },
    {
      name: 'cr10-5. niceScaleMax([18,000,000, 12,000,000]) → 20,000,000 (ค่าสูงสุดน้อยกว่า 30 ล้าน ปัดขั้นละ 5 ล้าน)',
      expected: 20000000,
      actual: function () { return SP.core.charts.niceScaleMax([18000000, 12000000]); }
    },
    {
      name: 'cr10-6. ไม่มียอดปีก่อน → มีแท่ง ไม่มีขีด ป้าย "ใหม่" / เป้าหมาย 0 → ไม่มีแท่ง มีเฉพาะขีด',
      expected: [true, 1, 0, 'ใหม่', 0, 1],
      actual: function () {
        var el = SP.core.charts.vsLastYearBar(5000000, null, 60000000);
        var zero = SP.core.charts.vsLastYearBar(0, 1000000, 60000000);
        return [el.info.isNew, el.querySelectorAll('.vly-bar').length, el.querySelectorAll('.vly-tick').length, el.querySelector('.vly-new').textContent,
          zero.querySelectorAll('.vly-bar').length, zero.querySelectorAll('.vly-tick').length];
      }
    },
    {
      name: 'v7-7. ค่าตั้งต้นตามสัดส่วนปีก่อน: 7.7 / 8.7 / 6.5 → 34% / 38% / 28% (รวม 100%) และตรงกับแผนตั้งต้นของ TT',
      expected: [[0.34, 0.38, 0.28], 1, [0.34, 0.38, 0.28]],
      actual: function () {
        var r = calc.roundShares([7.7, 8.7, 6.5]);
        var pct = D.targets.years[YEAR].pct;
        return [r, round2(calc.sum(r)), ['tt-north', 'tt-northeast', 'tt-central'].map(function (u) { return pct[u]; })];
      }
    },
    // ---------------- CR-11: สินค้าจริง + ค่าตั้งต้นของแผน + เครื่องมือช่วยกรอก (docs/change-requests/CR-11_sku-planning-ux.md ข้อ 4) ----------------
    {
      name: 'cr11-1. ค่าตั้งต้น ยอดปีก่อน × การเติบโต: เป้าหมาย 22,140,000 · ยอดปีก่อน 19,800,000 (g = 1.1182) · SKU 12130 ม.ค. ปีก่อน 14,925 → 16,689',
      expected: ['1.1182', 14925, 16689, 16689, 'system'],
      actual: function () {
        var ly = calc.skuHistory(D.history, YEAR - 1, 'seven', CUSHION);
        var c = row(calc.skuPlanGrid(D, MASTER, 'seven', plan('seven'), GRID('seven')), CUSHION).cells[0];
        return [F.number(calc.growthFactor(22140000, 19800000), 4), ly[0], calc.defaultPlanQty('lastYear', { monthly: ly }, 22140000, 19800000)[0], c.units, c.source];
      }
    },
    {
      name: 'cr11-2. SKU ที่ Discontinued ก่อนปีแผน (12040 เลิกขาย ก.ย. 2026) → ค่าตั้งต้น 0 ทุกเดือน (ล็อก) และไม่อยู่ในรายการเพิ่ม SKU แม้ติ๊ก Listing',
      expected: [true, true, false, false],
      actual: function () {
        var m = { products: D.products, listings: D.listings.concat([{ productKey: OLD, accountId: 'eveandboy' }]), priceList: D.priceList, npdPlans: D.npdPlans };
        var pl = plan('eveandboy'); pl.items[OLD] = calc.newPlanItem(sku(OLD), YEAR, 0);
        var cells = row(calc.skuPlanGrid(D, m, 'eveandboy', pl, GRID('eveandboy')), OLD).cells;
        return [cells.every(function (c) { return c.units === 0; }), cells.every(function (c) { return c.source === 'locked'; }),
          calc.availableSkus(m, 'eveandboy', plan('eveandboy'), YEAR).some(function (a) { return a.key === OLD; }), !!calc.defaultSkuPlan(m, 'eveandboy', YEAR, true).items[OLD]];
      }
    },
    {
      name: 'cr11-3. distributeAnnual(400, [1, 1, 2]) → 100 / 100 / 200 และ distributeAnnual(100, [1, 1, 1]) → ผลรวม = 100',
      expected: [[100, 100, 200], 100],
      actual: function () { return [calc.distributeAnnual(400, [1, 1, 2]), calc.sum(calc.distributeAnnual(100, [1, 1, 1]))]; }
    },
    {
      name: 'cr11-4. closeGap: คงเหลือ 1,000 บาท · A Net Sales 3,000 · B 7,000 → A +300 · B +700 บาท (แปลงเป็นชิ้นด้วย Net Sales ต่อชิ้น) / ปัดแล้วคงเหลือไม่เกิน ±1 ชิ้น × ราคาต่อชิ้น',
      expected: [[300, 700], [10, 10], 0, true],
      actual: function () {
        var a = calc.closeGap(1000, [{ key: 'A', net: 3000, unitNet: 30, units: 100 }, { key: 'B', net: 7000, unitNet: 70, units: 100 }]);
        var b = calc.closeGap(1000, [{ key: 'A', net: 3000, unitNet: 33, units: 100 }, { key: 'B', net: 7000, unitNet: 71.5, units: 100 }]);
        return [a.rows.map(function (x) { return round2(x.addNet); }), a.rows.map(function (x) { return x.addUnits; }), round2(a.residual), Math.abs(b.residual) <= 71.5];
      }
    },
    {
      name: 'cr11-5. ราคาเฉพาะ Account: 33400 ที่ 7-Eleven → 149 · ที่ EVEANDBOY → 199 (ลำดับ Promotion → ราคาเฉพาะ Account → ราคาทั่วไป)',
      expected: [149, 199, 149, 199, 129],
      actual: function () {
        var promo = { id: 'x', name: 'P', productKey: TINT02, accountIds: ['seven'], startDate: '2027-01-01', endDate: '2027-01-31', mode: 'PRICE', value: 129, promoGpPct: null, status: 'CONFIRMED' };
        return [round2(calc.effectivePrice(D, TINT02, 'seven', YEAR, 1)), round2(calc.effectivePrice(D, TINT02, 'eveandboy', YEAR, 1)),
          calc.rspOn(D.priceList, TINT02, '2027-02-01', 'mt', 'seven'), calc.rspOn(D.priceList, TINT02, '2027-02-01', 'mt'),
          round2(calc.effectivePrice(withData({ promotions: [promo] }), TINT02, 'seven', YEAR, 0))];
      }
    },
    {
      name: 'cr11-6. แสดงชื่อ: CHARMISS JUICY POP TINT → Juicy Pop Tint (ตัด Charmiss และแปลง Title Case) · มี shortName ใช้ shortName',
      expected: ['Juicy Pop Tint', 'Juicy Pop Tint 02', 'You Make Me Blush Liquid 04', 'CHARMISS YOU MAKE ME BLUSH LIQUID BLUSH ON 04 FAITH LOVE'],
      actual: function () {
        return [calc.displayName({ name: 'CHARMISS JUICY POP TINT' }), calc.displayName({ name: 'x', shortName: 'Juicy Pop Tint 02' }),
          calc.displayName(sku('16370')), sku('16370').name];
      }
    },
    {
      name: 'cr11-7. SKU Series Existing → series ว่าง และ productCompleteness คืน missingRequired มี Series (5 SKU ที่ขาด Series / ไม่มี Series ชื่อ Existing)',
      expected: [null, true, 5, false],
      actual: function () {
        return [sku(BROW).seriesId, calc.productCompleteness(sku(BROW), D.priceList).missingRequired.indexOf('seriesId') >= 0,
          D.products.filter(function (p) { return !p.seriesId; }).length, D.taxonomy.series.some(function (s) { return s.name === 'Existing'; })];
      }
    },
    {
      name: 'cr11-8. นำเข้า seed แล้ว Net Sales ปีก่อนรวมของ 7-Eleven = 19,800,000 (±100) และ EVEANDBOY = 9,900,000 (±100) / ราย SKU ของ EVEANDBOY ใน seed ต่างไม่เกิน 0.01% (ปัดจำนวนชิ้นใน Excel) / สินค้าจริง 117 + ชั่วคราว 3',
      expected: [true, true, true, true, 117, 3],
      actual: function () {
        return [Math.abs(lyNet('seven') - 19800000) <= 100, Math.abs(calc.unitHistory(D.history, YEAR - 1, 'seven') - 19800000) <= 100,
          Math.abs(calc.unitHistory(D.history, YEAR - 1, 'eveandboy') - 9900000) <= 100, Math.abs(lyNet('eveandboy') / 9900000 - 1) < 0.0001,
          D.products.filter(function (p) { return p.trCode; }).length, D.products.filter(function (p) { return !p.trCode && p.tempCode; }).length];
      }
    },
    {
      name: 'cr11-9. Ctrl+V ช่วง 3×4 จาก Excel ที่ครอบช่องล็อก → ช่องล็อกไม่เปลี่ยน ช่องอื่นได้ค่าตามตำแหน่ง (และ applyWrites ข้ามช่องล็อกของแผนจริง)',
      expected: [11, false, 7, 12, 0, 60, 'manual'],
      actual: function () {
        var m = calc.parseTsv('1\t2\t3\t4\r\n5\t6\t7\t8\r\n9\t10\t11\t12\r\n');
        var w = calc.pasteCells(m, 0, 0, function (r, c) { return { key: 'K' + r, m: c, editable: !(r === 1 && c === 1) }; });
        function at(k, c) { return w.filter(function (x) { return x.key === k && x.m === c; })[0]; }
        var pl = plan('eveandboy');
        var g = calc.skuPlanGrid(D, MASTER, 'eveandboy', pl, GRID('eveandboy'));
        var out = calc.applyWrites(pl, g, [{ key: NPD_A, m: 0, qty: 50 }, { key: NPD_A, m: 6, qty: 60 }]);
        var g2 = calc.skuPlanGrid(D, MASTER, 'eveandboy', out, GRID('eveandboy'));
        return [w.length, !!at('K1', 1), at('K1', 2).qty, at('K2', 3).qty, row(g2, NPD_A).cells[0].units, row(g2, NPD_A).cells[6].units, row(g2, NPD_A).cells[6].source];
      }
    },
    {
      name: 'cr11: กรอกยอดทั้งปี 700 ของ NPD ที่เริ่มขาย มิ.ย. → กระจาย มิ.ย.–ธ.ค. ตาม Seasonality (ผลรวม 700) เดือนที่ล็อกไม่ถูกแตะ / ปรับ +10% ปัดเป็นจำนวนเต็ม',
      expected: [700, 0, 7, 110],
      actual: function () {
        var g = calc.skuPlanGrid(D, MASTER, 'eveandboy', plan('eveandboy'), GRID('eveandboy'));
        var w = calc.annualWrites(row(g, NPD_A), 700, g.si);
        var s = calc.scaleRows([{ key: 'X', cells: [{ m: 0, units: 100, state: { editable: true } }, { m: 1, units: 100, state: { editable: false } }] }], 0.1);
        return [calc.sum(w.map(function (x) { return x.qty; })), w.filter(function (x) { return x.m < 5; }).length, w.length, s.length === 1 ? s[0].qty : -1];
      }
    },
    {
      name: 'cr11: ▲/▼ เมื่อต่างจากเดือนเดียวกันปีก่อนเกิน ±50% / Chip Status เดียว (Clearance > New > Discontinued ระหว่างปี)',
      expected: ['up', 'down', null, 'up', null, 'new', null, 'clearance'],
      actual: function () {
        return [calc.anomalyMark(160, 100), calc.anomalyMark(40, 100), calc.anomalyMark(140, 100), calc.anomalyMark(10, 0), calc.anomalyMark(10, null),
          calc.primaryStatus(sku(NPD_A), YEAR), calc.primaryStatus(sku(CUSHION), YEAR), calc.primaryStatus(clearProduct(), YEAR)];
      }
    },
    {
      name: 'cr11: ปิดส่วนต่างทั้งปีของ EVEANDBOY (ทุกแถวที่มีค่า) → คงเหลือหลังปรับ |x| ≤ 1,000 บาท และเปลี่ยนเฉพาะช่องที่แก้ไขได้',
      expected: [true, true, true],
      actual: function () {
        var pl = plan('eveandboy');
        var g = calc.skuPlanGrid(D, MASTER, 'eveandboy', pl, GRID('eveandboy'));
        var targets = calc.phasingTotals(target('eveandboy'), calc.defaultPhasing(D, YEAR, 'eveandboy')).amounts;
        var keysAll = g.rows.filter(function (r) { return r.total.units > 0; }).map(function (r) { return r.key; });
        var res = calc.closeGapWrites(g, targets, range(0, 11), keysAll);
        var g2 = calc.skuPlanGrid(D, MASTER, 'eveandboy', calc.applyWrites(pl, g, res.writes), GRID('eveandboy'));
        var rem = calc.sum(targets) - g2.yearTotal.net;
        return [res.before > 1000000, Math.abs(rem) <= 1000, res.writes.every(function (w) { return row(g, w.key).cells[w.m].state.editable; })];
      }
    },
    // ---------------- CR-12: รายงานสรุปแผน (docs/change-requests/CR-12_summary-report.md ข้อ 4) ----------------
    {
      name: 'cr12-1. axisStart([113.2M, 120M, 115.5M, 116.6M]) → 100,000,000 (ค่าต่ำสุด ≥ 50 ล้าน ปัดลงขั้นละ 50 ล้าน)',
      expected: [100000000, 100000000],
      actual: function () { var v = [113200000, 120000000, 115500000, 116600000]; return [SP.core.charts.axisStart(v), calc.axisStart(v)]; }
    },
    {
      name: 'cr12-2. axisStart([245M, 260M]) → 200,000,000 (ค่าต่ำสุด ≥ 200 ล้าน ปัดลงขั้นละ 100 ล้าน)',
      expected: 200000000,
      actual: function () { return SP.core.charts.axisStart([245000000, 260000000]); }
    },
    {
      name: 'cr12-3. axisStart([40M, 45M]) → 0 (ค่าต่ำสุดน้อยกว่า 50 ล้าน เริ่มที่ 0)',
      expected: 0,
      actual: function () { return SP.core.charts.axisStart([40000000, 45000000]); }
    },
    {
      name: 'cr12-4. axisStart([100M, 120M]) → 100,000,000 (เลขกลมพอดีไม่ถูกปัดลงอีกขั้น)',
      expected: 100000000,
      actual: function () { return SP.core.charts.axisStart([100000000, 120000000]); }
    },
    {
      name: 'cr12-5. niceScaleMax([12.9M, 12.7M, 11.9M], { headroom: 0.10 }) → 15,000,000 (ขั้นละ 2.5 ล้าน 6 เส้น) / ไม่ส่ง opts = กฎตาราง CR-10 เดิม',
      expected: [15000000, 2500000, 7, 20000000],
      actual: function () {
        var v = [12900000, 12700000, 11900000];
        var ax = calc.niceAxis(0, 12900000 * 1.1);
        return [SP.core.charts.niceScaleMax(v, { headroom: 0.10 }), ax.step, ax.ticks.length, SP.core.charts.niceScaleMax([18000000, 12000000])];
      }
    },
    {
      name: 'cr12-6. Waterfall ข้อมูลตั้งต้น: แกนเริ่ม 100 ล้าน (สัญลักษณ์ตัดแกน + ข้อความ) · แท่งยอดปี 2026 และ Total Target เริ่มจุดเดียวกัน (ขอบซ้ายของแกน) · ปลายแกน 120 ล้าน',
      expected: [100000000, 120000000, '0%', '0%', '66%', true, 'แกนเริ่มที่ 100 ล้านบาท'],
      actual: function () {
        var wf = calc.growthWaterfall(TREE);
        var el = SP.core.charts.waterfall({
          start: { label: 'LY', value: wf.start }, end: { label: 'Total', value: wf.end },
          steps: wf.steps.map(function (s) { return { id: s.id, label: s.name, value: s.delta }; }),
          format: String, signed: String,
          axisNote: function (lo) { return SP.core.components.fill(SP.data.content.pages.summary.wfAxis, { value: F.number(lo / 1e6, 0) }); }
        });
        var bars = el.querySelectorAll('.wfc-row.is-total .wfc-bar');
        return [el.info.start, el.info.end, bars[0].style.left, bars[1].style.left, bars[0].style.width, !!el.querySelector('.wfc-break'), el.querySelector('.wfc-axis').textContent];
      }
    },
    {
      name: 'cr12-7. เลขฉบับ: ล็อกครั้งแรก → 2027-BL-01 · ปลดล็อก (ต้องมีเหตุผล) แล้วล็อกใหม่ → 2027-BL-02 · ยังไม่ล็อก / ปลดล็อกอยู่ → 2027-DRAFT',
      expected: ['2027-DRAFT', '2027-BL-01', 'noteRequired', '2027-DRAFT', '2027-BL-02', [1, 2]],
      actual: function () {
        var states = {}, versions = [];
        var draft = W.baselineVersion(versions, 2027, W.isLocked(states)).code;
        states = W.applyAction(states, { step: 'baseline', action: 'lock', by: 'Sales Director', at: '2026-11-15T07:30:00.000Z' }).states;
        versions = W.addBaselineVersion(versions, 2027, { by: 'Sales Director', at: '2026-11-15T07:30:00.000Z' });
        var first = W.baselineVersion(versions, 2027, W.isLocked(states)).code;
        var noNote = W.applyAction(states, { step: 'baseline', action: 'unlock', by: 'Sales Director', at: 'x' }).error;
        states = W.applyAction(states, { step: 'baseline', action: 'unlock', by: 'Sales Director', at: 'x', note: 'ปรับเป้า TT' }).states;
        var reopened = W.baselineVersion(versions, 2027, W.isLocked(states)).code;
        states = W.applyAction(states, { step: 'baseline', action: 'lock', by: 'Sales Director', at: 'y' }).states;
        versions = W.addBaselineVersion(versions, 2027, { by: 'Sales Director', at: 'y' });
        return [draft, first, noNote, reopened, W.baselineVersion(versions, 2027, W.isLocked(states)).code, versions.map(function (v) { return v.no; })];
      }
    },
    {
      name: 'cr12-8. รายการที่ต้องดำเนินการ: ไม่มีผู้รับผิดชอบอยู่แถวแรก → ส่งกลับแก้ไข → ส่วนต่างมากไปน้อย → ยังไม่ส่ง / จัดสรรครบและอนุมัติครบไม่แสดง / ข้อมูลตั้งต้น: TT เขต 3 แถวแรก ครบ 9 หน่วยขาย',
      expected: [['c', 'd', 'e', 'b', 'f'], ['assignOwner', 'fixSku', 'closeGap', 'submitSku', 'waitDirector'], 'tt-central', 9],
      actual: function () {
        var list = calc.planActions([
          { id: 'a', target: 1000, plan: 1000, phasing: 'approved', sku: 'approved', vacant: false },
          { id: 'b', target: 1000, plan: 1000, phasing: 'approved', sku: 'draft', vacant: false },
          { id: 'c', target: 1000, plan: 1000, phasing: 'approved', sku: 'approved', vacant: true },
          { id: 'd', target: 1000, plan: 990, phasing: 'approved', sku: 'returned', vacant: false },
          { id: 'e', target: 5000, plan: 2000, phasing: 'approved', sku: 'draft', vacant: false },
          { id: 'f', target: 1000, plan: 1000, phasing: 'approved', sku: 'submitted', vacant: false }
        ], { topDown: 'approved', locked: false });
        var units = calc.planUnits(TREE).map(function (u) {
          var g = calc.skuPlanGrid(D, MASTER, u.id, calc.defaultSkuPlan(MASTER, u.id, YEAR, true, D.planSeeds.years[YEAR][u.id]), GRID(u.id));
          return { id: u.id, target: u.amount, plan: g.yearTotal.net, phasing: 'draft', sku: 'draft', vacant: !calc.ownerOf(D.assignments, D.salespeople, u.id, calc.monthKey(YEAR, D.settings.DEMO_FORECAST_MONTH)) };
        });
        var real = calc.planActions(units, { topDown: 'draft', locked: false });
        return [list.map(function (r) { return r.id; }), list.map(function (r) { return r.next; }), real[0].id, real.length];
      }
    },
    {
      name: 'cr12-9. % ของ Total ของ 7-Eleven: 22,140,000 ÷ 120,000,000 → 18.45% (เท่ากับ % ใน Channel × % ของ Total ของ Channel)',
      expected: ['18.45%', true],
      actual: function () {
        var seven = calc.planUnits(TREE).filter(function (u) { return u.id === 'seven'; })[0];
        var pct = calc.pctFromAmount(TREE.amount, seven.amount);
        var node = TREE.children[0].children.filter(function (u) { return u.id === 'seven'; })[0];
        return [F.pct(pct, 2), Math.abs(pct - node.pctOfTotal) < 1e-12];
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
