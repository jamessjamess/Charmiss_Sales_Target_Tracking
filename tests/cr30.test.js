/*
 * tests/cr30.test.js — Test ของ CR-30 (Product Master ทั้ง Module)
 *
 * รันด้วย Node: node tests/run.js cr30 / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   cr30-1..14 = Test ตาม CR-30 ครบ 14 ข้อ (รอบ 1 = ข้อ 1 · 2 · 3 · 12 · 13 · 14 · รอบ 3 = ข้อ 8 · 9 · 10 Listing และ NPD แบบไตรมาส) · ข้อมูลตั้งต้นจาก data/ · store: ไม่อ่าน ไม่เขียน
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function CAT() { return SP.core.catalog; }
  function calc() { return SP.core.calc; }
  function D() { return SP.data; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function data(extra) {
    var d = {};
    Object.keys(D()).forEach(function (k) { d[k] = D()[k]; });
    Object.keys(extra || {}).forEach(function (k) { d[k] = extra[k]; });
    return d;
  }
  function product(typeId, code) {
    return { trCode: code, barcode: '', name: 'Test', categoryId: null, subCategoryId: null, typeId: typeId, seriesId: null, subSeriesId: null, image: null, launchDate: '2027-06-01', inTrcloud: false };
  }

  SP.tests.cr30 = [
    {
      name: 'cr30-1. สร้างสินค้า Type Cushion → Product Code = รหัสสูงสุดของกลุ่ม 12 (12240) + 10 = 12250 · สร้างซ้ำได้ 12260 · ลบสินค้าแล้วเลขไม่กลับมาใช้ · Type ไม่มีเลขนำหน้า (Highlighter) → สร้างไม่ได้ · ไม่เลือก Type → type',
      expected: ['12', 12240, '12250', '12260', '12270', 'prefix', 'type', '17'],
      actual: function () {
        var list = clone(D().products), counters = clone(D().codeCounters);
        var a = CAT().nextCode(list, D().taxonomy, 'type-cushion', counters);
        list.push(product('type-cushion', a.code)); counters = CAT().takeCode(counters, a.code);
        var b = CAT().nextCode(list, D().taxonomy, 'type-cushion', counters);
        list.push(product('type-cushion', b.code)); counters = CAT().takeCode(counters, b.code);
        list = list.filter(function (p) { return p.trCode !== b.code; });
        var c = CAT().nextCode(list, D().taxonomy, 'type-cushion', counters);
        return [CAT().typePrefix(D().taxonomy, 'type-cushion'), CAT().groupMax(D().products, '12', {}), a.code, b.code, c.code,
          CAT().nextCode(list, D().taxonomy, 'type-highlighter', counters).error, CAT().nextCode(list, D().taxonomy, null, counters).error,
          CAT().typePrefix(D().taxonomy, 'type-lip-stick')];
      }
    },
    {
      name: 'cr30-2. ไม่มีช่องแก้ Product Code และไม่มีปุ่มผูกรหัสจริง: ไม่มีข้อความผูกรหัส / ใช้รหัสชั่วคราว · ไม่มี calc.nextTempCode · ฟอร์มแสดงรหัสพร้อมกุญแจ (codeLocked)',
      expected: [false, false, false, true, true],
      actual: function () {
        var page = D().content.pages.productList;
        return [!!page.bind, !!page.general.useTemp, typeof calc().nextTempCode === 'function', !!page.general.codeLocked, !!page.create.codePreview];
      }
    },
    {
      name: 'cr30-3. NPD_2027Q2_01 ถูกแปลงเป็นรหัสระบบ 32210 · แผน SKU ตั้งต้น (ยอดจริง / ค่าตั้งต้น) Listing ราคา และแผน NPD อ้างรหัสใหม่ครบ · ใน TRCLOUD = ยังไม่เปิด',
      expected: ['32210', 2, true, true, 'npd-01', true, false, 0],
      actual: function () {
        var code = D().codeMigration.NPD_2027Q2_01;
        var p = calc().findProduct(D().products, code);
        var old = JSON.stringify([D().listings, D().basePrices, D().promoPrices, D().npdPlans, D().actuals, D().planSeeds]).indexOf('NPD_2027Q2_01');
        return [code, D().listings.filter(function (l) { return l.productKey === code; }).length,
          calc().rspAt(D().basePrices, code, '2027-06') === 199, !!D().actuals.years[2027].seven[code],
          (D().npdPlans.filter(function (n) { return n.productKey === code; })[0] || {}).id, !!p && !p.tempCode, CAT().inTrcloud(p), old < 0 ? 0 : 1];
      }
    },
    {
      name: 'cr30-4. resolvePrice: มี Promotion ระดับหน่วยขาย → ใช้ค่านั้น · มีแค่ระดับ Channel → ใช้ Channel · ไม่มี → RSP (MT · 33390 = 199) / TT Dealer (TT · 12070 = 160 ไม่ใช่ RSP 229)',
      expected: [[99, 'promoUnit'], [120, 'promoChannel'], [199, 'base', 'RSP'], [160, 'base', 'TT_DEALER']],
      actual: function () {
        var pp = calc().setPromoPrice([], '33390', 'mt', 'seven', '2027-05', 99);
        pp = calc().setPromoPrice(pp, '33390', 'mt', null, '2027-05', 120);
        var d = data({ promoPrices: pp });
        var a = calc().resolvePrice(d, '33390', 'seven', '2027-05'), b = calc().resolvePrice(d, '33390', 'eveandboy', '2027-05');
        var c = calc().resolvePrice(d, '33390', 'eveandboy', '2027-06'), t = calc().resolvePrice(d, '12070', 'TT-01', '2027-05');
        return [[a.price, a.source], [b.price, b.source], [c.price, c.source, c.priceType], [t.price, t.source, t.priceType]];
      }
    },
    {
      name: 'cr30-5. ราคาหลัก: RSP 199 มีผล 2024-01 และ 219 มีผล 2027-04 → มี.ค. 2027 = 199 · เม.ย. 2027 = 219 · ประวัติเรียงเดือนล่าสุดก่อน',
      expected: [199, 219, 219, ['2027-04', '2024-01']],
      actual: function () {
        var list = calc().setBasePrice(clone(D().basePrices), { productKey: '33390', priceType: 'RSP', effectiveMonth: '2027-04', price: 219 }).list;
        return [calc().basePriceAt(list, '33390', 'RSP', '2027-03'), calc().basePriceAt(list, '33390', 'RSP', '2027-04'), calc().basePriceAt(list, '33390', 'RSP', '2027-12'),
          calc().basePriceHistory(list, '33390', 'RSP').map(function (r) { return r.effectiveMonth; })];
      }
    },
    {
      name: 'cr30-6. ย้ายข้อมูล: 33400 ที่ 7-Eleven ทุกเดือนปี 2027 = 149 จาก Promotion Price ระดับหน่วยขาย (ราคาต่อ Account เดิม) · RSP ยังเป็น 199 · ไม่มีราคาต่อ Account แล้ว',
      expected: [true, true, 199, false],
      actual: function () {
        var ok = true, src = true;
        for (var m = 0; m < 12; m++) {
          var r = calc().resolvePrice(D(), '33400', 'seven', calc().monthKey(2027, m));
          ok = ok && r.price === 149; src = src && r.source === 'promoUnit';
        }
        return [ok, src, calc().rspAt(D().basePrices, '33400', '2027-06'), 'accountPrices' in D() && (D().accountPrices || []).length > 0];
      }
    },
    {
      name: 'cr30-7. สิทธิ์: Sales Officer ทีม MT (พิมพ์ลดา) แก้ Promotion Price ของ MT ได้ · ของ ECOM ไม่ได้ · แก้ราคาหลักไม่ได้ · ทีม Product แก้ราคาหลักได้ · แก้ Promotion Price ไม่ได้',
      expected: [true, false, false, true, false],
      actual: function () {
        var P = SP.core.permissions;
        var c = { roles: D().roles, perms: P.defaultPerms(), users: D().users, teams: D().teams, month: '2026-09', list: SP.core.registry.list };
        function ctx(ch) { var o = clone(c); o.roles = c.roles; o.users = c.users; o.teams = c.teams; o.list = c.list; o.channelId = ch; return o; }
        var officer = { type: 'officer', personId: 'sp-pim', channelId: 'mt' }, product = { type: 'product' };
        return [P.can(officer, 'prices.promo', ctx('mt')), P.can(officer, 'prices.promo', ctx('ecom')), P.can(officer, 'prices.base', ctx(null)),
          P.can(product, 'prices.base', ctx(null)), P.can(product, 'prices.promo', ctx('mt'))];
      }
    },
    {
      name: 'cr30-8. Listing: 12130 ที่ 7-Eleven วางขาย ม.ค. 24 – ถอด มิ.ย. 27 → SKU Planning ก.ค.–ธ.ค. 2027 ล็อก 0 (ถอดแล้ว) · ม.ค.–มิ.ย. ไม่ล็อก · แผนเดิมหลังเดือนถอด 84,684 ชิ้น · เสนอขาย (11012 ตั้งแต่ มี.ค. 27) ไม่อยู่ในแผนตั้งต้น แต่เพิ่มเข้าแผนได้พร้อมป้าย · ก่อน มี.ค. ล็อก',
      expected: [[0, 0, 0, 0, 0, 0], ['delisted', 'delisted', 'delisted', 'delisted', 'delisted', 'delisted'], false, 84684, false, true, 'offered', ['beforeListing', 'beforeListing', null]],
      actual: function () {
        function M(ls) { return { products: D().products, listings: ls, basePrices: D().basePrices, promoPrices: D().promoPrices, npdPlans: D().npdPlans }; }
        function rowOf(g, k) { return g.rows.filter(function (r) { return r.key === k; })[0]; }
        var base = calc().defaultSkuPlan(M(D().listings), 'seven', 2027, true);
        var before = calc().skuPlanGrid(D(), M(D().listings), 'seven', base, { year: 2027, target: 0 });
        var ls = calc().setListing(D().listings, '12130', 'seven', { status: 'delisted', fromMonth: '2024-01', toMonth: '2027-06' });
        var cells = rowOf(calc().skuPlanGrid(D(), M(ls), 'seven', base, { year: 2027, target: 0 }), '12130').cells;
        var off = calc().setListing(D().listings, '11012', 'seven', { status: 'offered', fromMonth: '2027-03' });
        var plan = calc().defaultSkuPlan(M(off), 'seven', 2027, true);
        var inDefault = '11012' in plan.items;
        var add = calc().addableSkus(M(off), 'seven', plan, 2027).filter(function (x) { return x.key === '11012'; })[0];
        plan.items['11012'] = calc().newPlanItem(calc().findProduct(D().products, '11012'), 2027, 10);
        var r = rowOf(calc().skuPlanGrid(D(), M(off), 'seven', plan, { year: 2027, target: 0 }), '11012');
        return [cells.slice(6).map(function (c) { return c.units; }), cells.slice(6).map(function (c) { return c.lockReason; }), cells.slice(0, 6).some(function (c) { return c.source === 'locked'; }),
          Math.round(calc().plannedAfter(before, '12130', 2027, '2027-06').units), inDefault, !!(add && add.offered), r.listingStatus,
          r.cells.slice(0, 3).map(function (c) { return c.lockReason || null; })];
      }
    },
    {
      name: 'cr30-9. ความครอบคลุม 33390 ใน MT ณ ก.ย. 2026 = 5/9 (หน่วยขายที่ใช้งานใน Channel · ไม่นับ 12 หน่วยข้าม Channel) · เสนอขายไม่นับ · ถอดก่อนเดือนที่ดูไม่นับ → 4/9',
      expected: [[5, 9], 12, [4, 9]],
      actual: function () {
        var units = calc().unitsOfChannel(D(), 'mt', true);
        var c = calc().listingCoverage(D().listings, '33390', units, '2026-09');
        var ls = calc().setListing(D().listings, '33390', 'seven', { status: 'offered', fromMonth: '2026-01' });
        ls = calc().setListing(ls, '33390', 'watsons', { status: 'delisted', fromMonth: '2024-01', toMonth: '2026-08' });
        var c2 = calc().listingCoverage(ls, '33390', units, '2026-09');
        return [[c.listed, c.total], calc().listedAccounts(D().listings, '33390').length, [c2.listed, c2.total]];
      }
    },
    {
      name: 'cr30-10. NPD แบบไตรมาส Q2 2028 (22110) → เดือนเปิดตัวยังไม่ยืนยัน (เม.ย.–มิ.ย. 2028) · Status Planned (ก.ย. 2026 · มี.ค. 2028) · SKU Planning ล็อก ม.ค.–มี.ค. 2028 + ป้าย · ไม่ขาดข้อมูลจำเป็นเรื่องเดือนเปิดตัว · ระบุเดือน พ.ค. แล้ว เม.ย. = Planned',
      expected: [['2028-04', '2028-06', false], 'planned', 'planned', 'new', ['planned', 'planned', 'planned', null], '2028-Q2', true, 'planned'],
      actual: function () {
        var n = calc().findById(D().npdPlans, 'npd-04');
        var l = calc().npdLaunch(n);
        var applied = calc().applyNpdApproval({ products: D().products, listings: D().listings }, n);
        var p = calc().findProduct(applied.products, n.productKey);
        var m = { products: applied.products, listings: applied.listings, basePrices: D().basePrices, promoPrices: D().promoPrices, npdPlans: D().npdPlans };
        var plan = calc().defaultSkuPlan(m, 'watsons', 2028, true);
        if (!plan.items[n.productKey]) plan.items[n.productKey] = calc().newPlanItem(p, 2028, 10);
        var r = calc().skuPlanGrid(D(), m, 'watsons', plan, { year: 2028, target: 0 }).rows.filter(function (x) { return x.key === n.productKey; })[0];
        var fixed = clone(n); fixed.plannedLaunchDate = '2028-05-01'; fixed.launchQuarter = null;
        var p2 = calc().findProduct(calc().applyNpdApproval({ products: D().products, listings: D().listings }, fixed).products, n.productKey);
        return [[l.from, l.to, l.confirmed], calc().productStatus(p, '2026-09'), calc().productStatus(p, '2028-03'), calc().productStatus(p, '2028-05'),
          r.cells.slice(0, 4).map(function (c) { return c.lockReason || null; }), r.quarterLaunch,
          calc().productCompleteness(p, D().basePrices).missingRequired.indexOf('launchDate') < 0, calc().productStatus(p2, '2028-04')];
      }
    },
    {
      name: 'cr30-11. Timeline 18 เดือนตั้งแต่ ก.ย. 2026 = ก.ย. 2026 – ก.พ. 2028 · มีเดือน ม.ค. (เส้นแบ่งปี) 2 จุด · NPD เปิดตัว ก.พ. 2028 อยู่ในช่วง · ขั้นงานต่อกันจากเดือนเป้าหมาย · ขั้นที่เลยเป้าหมาย',
      expected: ['2026-09', '2028-02', ['2027-01', '2028-01'], true, [['concept', '2026-09', '2026-10'], ['production', '2026-11', '2027-08']], ['concept']],
      actual: function () {
        var ms = calc().monthSpan('2026-09', 18);
        var n5 = calc().findById(D().npdPlans, 'npd-05');
        var segs = calc().npdStageSegments(n5).slice(1, 3).map(function (s) { return [s.stage, s.from, s.to]; });
        return [ms[0], ms[17], ms.filter(function (k) { return k.slice(5) === '01'; }), ms.indexOf(calc().npdLaunch(n5).month) >= 0, segs,
          calc().npdOverdue(calc().findById(D().npdPlans, 'npd-02'), '2026-09')];
      }
    },
    {
      name: 'cr30-12. Preset คอลัมน์: บันทึก Preset ของผู้ใช้ A แล้วสลับเป็นผู้ใช้ B ไม่เห็น Preset ของ A · ค่าเริ่มต้นของ A ใช้ตอนเปิดใหม่ · คืนค่าตั้งต้น = Preset ระบบแรก',
      expected: [['standard', 'price', 'completeness', 'u1'], ['standard', 'price', 'completeness'], ['code2', 'rsp'], ['image', 'status'], ['image', 'status']],
      actual: function () {
        var sys = [{ id: 'standard', columns: ['image', 'status'] }, { id: 'price', columns: ['rsp'] }, { id: 'completeness', columns: ['completeness'] }];
        var saved = CAT().savePreset({}, 'u-a', 'productList', 'ของฉัน', ['code2', 'rsp']);
        var all = CAT().setDefaultPreset(saved.all, 'u-a', 'productList', saved.id);
        var reset = CAT().resetColumns(all, 'u-a', 'productList');
        return [CAT().presetsFor(all, 'u-a', 'productList', sys).map(function (p) { return p.id; }),
          CAT().presetsFor(all, 'u-b', 'productList', sys).map(function (p) { return p.id; }),
          CAT().currentColumns(all, 'u-a', 'productList', sys), CAT().currentColumns(all, 'u-b', 'productList', sys), CAT().currentColumns(reset, 'u-a', 'productList', sys)];
      }
    },
    {
      name: 'cr30-13. ความครบถ้วน: SKU ที่ไม่มี Sub Series ไม่อยู่ใน ขาดข้อมูลที่ควรมี (ควรมี = Barcode · รูปสินค้า) · ขาด Barcode = ขาดที่ควรมี · จำเป็นไม่มี Item Type',
      expected: ['ok', 'recommended', ['barcode'], false],
      actual: function () {
        var p = clone(calc().findProduct(D().products, '12130'));
        p.subSeriesId = null; p.barcode = '8859580712130'; p.image = 'data:image/png;base64,AA==';
        var q = clone(p); q.barcode = '';
        var c = calc().productCompleteness(q, D().basePrices);
        return [calc().productCompleteness(p, D().basePrices).level, c.level, c.missingRecommended, (D().settings.PRODUCT_REQUIRED || []).indexOf('itemType') >= 0];
      }
    },
    {
      name: 'cr30-14. ไม่มีคำ TR Code · Internal Code · Item Type · รหัสชั่วคราว ในข้อความหน้าจอ (content.js · guide.js) · Status New แสดงเป็น NPD · สินค้าไม่มีฟิลด์ itemType / internalCode',
      expected: [0, 0, 0, 0, 'NPD', 0],
      actual: function () {
        var txt = JSON.stringify(D().content) + JSON.stringify(D().guide);
        function n(t) { return txt.split(t).length - 1; }
        return [n('TR Code'), n('Internal Code'), n('Item Type'), n('รหัสชั่วคราว'), D().content.labels.status['new'],
          D().products.filter(function (p) { return 'itemType' in p || 'internalCode' in p; }).length];
      }
    }
  ];
})();
