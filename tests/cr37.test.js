/*
 * tests/cr37.test.js — Test ของ CR-37 (สินค้าแบบ Bundle: กติกาที่ Store · รหัส · Series · ราคารวมชิ้นส่วน · ความต้องการชิ้นส่วน · ยอดขายไม่นับซ้ำ · Flag bundle)
 *
 * รันด้วย Node: node tests/run.js cr37 / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   cr37-1 กติกา (calc.normalizeBundles ที่ Store ใช้) · cr37-2 (เบราว์เซอร์) store.set ปฏิเสธ / รวมบรรทัดซ้ำ · cr37-3 รหัสขึ้นต้นด้วย 9 ·
 *   cr37-4 bundleSeries · cr37-5 ราคารวมชิ้นส่วนและส่วนลด · cr37-6 componentDemand · cr37-7 ยอดขายไม่นับซ้ำ · cr37-8 Flag bundle ปิด ·
 *   cr37-9 ตัวเลขเดิมของหน่วยขายที่ไม่มี Bundle · cr37-10 ข้อมูลตัวอย่าง · cr37-11 (เบราว์เซอร์) Flag ปิด = Net Sales รวมแผนเท่าก่อน CR
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function D() { return SP.data; }
  function calc() { return SP.core.calc; }
  function FT() { return SP.core.features; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  var YEAR = 2027, MONTH = '2026-09';

  function find(key) { return calc().findProduct(D().products, key); }
  function bundle(key, components, extra) {
    var b = { trCode: key, name: 'Test Bundle ' + key, shortName: 'Test Bundle ' + key, kind: 'bundle', components: components, launchDate: '2026-01-01' };
    Object.keys(extra || {}).forEach(function (k) { b[k] = extra[k]; });
    return b;
  }
  // แผน SKU ตั้งต้นของทุกหน่วยขายในแผนปี 2027 (เหมือนค่าตั้งต้นของ store: plan.<ปี>.sku.<unitId>)
  function plans() {
    var c = calc(), out = {};
    var td = D().targets.years[YEAR];
    Object.keys(td.units).forEach(function (ch) {
      td.units[ch].forEach(function (u) { out[u] = c.defaultSkuPlan(D(), u, YEAR, true, D().planSeeds.years[YEAR][u]); });
    });
    return out;
  }
  function grid(unitId, plan) { return calc().skuPlanGrid(D(), D(), unitId, plan, { year: YEAR, mode: 'initial' }); }

  SP.tests.cr37 = [
    {
      name: 'cr37-1. กติกา Bundle (calc.normalizeBundles · ฟังก์ชันที่ store.set ใช้): ชิ้นส่วนรวม < 2 · Bundle ซ้อน Bundle · ชิ้นส่วน Request · ชิ้นส่วน Delete = ปฏิเสธ · skuId ซ้ำรวมเป็นบรรทัดเดียว · ระบบกำหนดหมวดสินค้าและ Series',
      expected: ['minQty', 'nested', 'status', 'status', [[{ skuId: '12130', qty: 2 }], 'cat-set-bundle', 'sub-bundle', 'type-bundle', 'ser-charming-lab']],
      actual: function () {
        var c = calc(), ps = D().products;
        var req = ps.filter(function (p) { return c.productStatus(p, MONTH) === 'request'; })[0];
        var del = ps.filter(function (p) { return c.productStatus(p, MONTH) === 'delete'; })[0];
        function code(b) { var r = c.normalizeBundles(ps.concat([b]), ps, MONTH); return r.ok ? 'ok' : r.error.code; }
        var merged = c.normalizeBundles(ps.concat([bundle('99990', [{ skuId: '12130', qty: 1 }, { skuId: '12130', qty: 1 }])]), ps, MONTH);
        var m = c.findProduct(merged.products, '99990');
        return [code(bundle('99990', [{ skuId: '12130', qty: 1 }])), code(bundle('99990', [{ skuId: '90100', qty: 1 }, { skuId: '12130', qty: 1 }])),
          code(bundle('99990', [{ skuId: c.productKey(req), qty: 1 }, { skuId: '12130', qty: 1 }])), code(bundle('99990', [{ skuId: c.productKey(del), qty: 1 }, { skuId: '12130', qty: 1 }])),
          [m.components, m.categoryId, m.subCategoryId, m.typeId, m.seriesId]];
      }
    },
    {
      name: 'cr37-2. (เบราว์เซอร์) store.set("master.products") ปฏิเสธ Bundle ผิดกติกาพร้อมข้อความ (ข้อมูลเดิมไม่เปลี่ยน) · Bundle ที่ skuId ซ้ำบันทึกเป็นบรรทัดเดียว',
      expected: [true, 'Bundle 99990 ต้องมีชิ้นส่วนรวมอย่างน้อย 2 ชิ้น', true, [{ skuId: '12140', qty: 3 }]],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store ของหน้า Test (document. · Node ข้ามข้อนี้) แล้วคืนค่าเดิม
        var store = SP.core.store, c = calc();
        var had = store.isSet('master.products'), before = store.get('master.products');
        var msg = null;
        try { store.set('master.products', before.concat([bundle('99990', [{ skuId: '12130', qty: 1 }])])); } catch (e) { msg = e.message; }
        var unchanged = JSON.stringify(store.get('master.products')) === JSON.stringify(before);
        store.set('master.products', before.concat([bundle('99990', [{ skuId: '12140', qty: 2 }, { skuId: '12140', qty: 1 }])]));
        var saved = c.findProduct(store.get('master.products'), '99990').components;
        if (had) store.set('master.products', before); else store.remove('master.products');
        return [msg != null, msg, unchanged, saved];
      }
    },
    {
      name: 'cr37-3. Product Code ของ Bundle ใหม่ = ตัวสร้างรหัสเดิม เลขนำหน้า Type Bundle (90) ต่อจาก 90200 → 90210 · ขึ้นต้นด้วย 9 · ไม่ซ้ำกับสินค้าเดิม',
      expected: ['90', '90210', true, true],
      actual: function () {
        var cat = SP.core.catalog;
        var r = cat.nextCode(D().products, D().taxonomy, 'type-bundle', D().codeCounters);
        return [cat.typePrefix(D().taxonomy, 'type-bundle'), r.code, r.code.charAt(0) === '9', !calc().findProduct(D().products, r.code)];
      }
    },
    {
      name: 'cr37-4. bundleSeries: 90100 (12130 × 2) = Charming Lab · 90200 (12130 + 12140) = Charming Lab · ชิ้นส่วนต่าง Series = Mix Series · ทีม Product แก้ Series เอง (seriesManual) ใช้ค่าที่แก้',
      expected: ['Charming Lab', 'Charming Lab', 'Mix Series', 'ser-charming-color'],
      actual: function () {
        var c = calc(), ps = D().products, ser = D().taxonomy.series;
        function name(id) { var s = c.findById(ser, id); return s ? s.name : id; }
        var other = ps.filter(function (p) { return !c.isBundle(p) && p.seriesId && p.seriesId !== 'ser-charming-lab' && c.productStatus(p, MONTH) === 'active'; })[0];
        var mix = bundle('99990', [{ skuId: '12130', qty: 1 }, { skuId: c.productKey(other), qty: 1 }]);
        var manual = c.normalizeBundles(ps.concat([bundle('99991', [{ skuId: '12130', qty: 2 }], { seriesManual: true, seriesId: 'ser-charming-color' })]), ps, MONTH);
        return [name(c.bundleSeries(find('90100'), ps)), name(c.bundleSeries(find('90200'), ps)), name(c.bundleSeries(mix, ps)), c.findProduct(manual.products, '99991').seriesId];
      }
    },
    {
      name: 'cr37-5. ราคา: ราคารวมชิ้นส่วน 90100 = 59 × 2 = 118 · RSP Bundle 109 · ส่วนลด = 1 − 109 ÷ 118 · TT Dealer ของ Bundle = สัดส่วนเดียวกับ 12130 (109 × 35 ÷ 59 = 65) · ราคาที่หน่วยขายใช้ลำดับราคาเดิม',
      expected: [118, 109, 0.0763, 65, [118, 109]],
      actual: function () {
        var c = calc(), b = find('90100');
        return [c.bundleComponentPrice(D(), b, 'RSP', '2027-03'), c.bundlePrice(D(), b, 'RSP', '2027-03'), Math.round(c.bundleDiscount(D(), b, 'RSP', '2027-03') * 10000) / 10000,
          c.basePriceAt(D().basePrices, '90100', 'TT_DEALER', '2027-03'),
          [c.bundleComponentPrice(D(), b, null, '2027-03', 'watsons'), c.resolvePrice(D(), '90100', 'watsons', '2027-03').price]];
      }
    },
    {
      name: 'cr37-6. componentDemand: 12130 มี.ค. 2027 ผ่าน Bundle = 150 × 2 (90100 Watsons) + 200 × 1 (90200 Shopee) = 500 · ม.ค. = 300 (Shopee เริ่ม มี.ค.) · รวม = ขายเดี่ยว + ผ่าน Bundle ทุกเดือน · 12140 ผ่าน Bundle มี.ค. = 200 · แยกราย Bundle',
      expected: [500, 300, true, 200, [['90100', 2, 300], ['90200', 1, 200]], ['12130', '12140']],
      actual: function () {
        var c = calc();
        var rows = c.componentDemand({ data: D(), master: D(), plans: plans(), year: YEAR });
        var a = rows.filter(function (r) { return r.key === '12130'; })[0], b = rows.filter(function (r) { return r.key === '12140'; })[0];
        var ok = rows.every(function (r) { return r.total.every(function (t, m) { return t === r.direct[m] + r.viaBundle[m]; }) && r.sum.total === r.sum.direct + r.sum.viaBundle; });
        return [a.viaBundle[2], a.viaBundle[0], ok && a.direct[2] > 0, b.viaBundle[2], a.bundles.map(function (x) { return [x.key, x.qty, x.units[2]]; }), rows.map(function (r) { return r.key; })];
      }
    },
    {
      name: 'cr37-7. ยอดขายไม่นับซ้ำ: Net Sales รวมแผนของ Watsons = Σ Net Sales ทุกแถวรวม Bundle · ส่วนที่เพิ่มจาก Flag ปิด = Net Sales ของแถว Bundle พอดี (ไม่บวกยอดชิ้นส่วน) · แถวรวมชิ้นนับ 1 ชุด = 1',
      expected: [true, true, true, 1800],
      actual: function () {
        var c = calc(), p = plans().watsons;
        var on = grid('watsons', p);
        var off = FT().withFlags({ bundle: false }, function () { return grid('watsons', p); });
        var b = on.rows.filter(function (r) { return r.key === '90100'; })[0];
        var rowSum = c.sum(on.rows.map(function (r) { return r.total.net; }));
        return [Math.abs(rowSum - on.yearTotal.net) < 0.01, Math.abs(on.yearTotal.net - off.yearTotal.net - b.total.net) < 0.01,
          on.yearTotal.units - off.yearTotal.units === b.total.units, b.total.units];
      }
    },
    {
      name: 'cr37-8. Flag bundle ปิด: แผน SKU ไม่มีแถว Bundle และยอดรวมไม่นับ Bundle · รายการเพิ่มสินค้าในแผนไม่มี Bundle · เปิด = มีแถว 90100 ที่ Watsons · ข้อมูล Bundle ยังอยู่',
      expected: [[false, true], true, [true, false], true],
      actual: function () {
        var c = calc(), p = plans();
        var offRows = FT().withFlags({ bundle: false }, function () { return grid('watsons', p.watsons).rows.some(function (r) { return c.isBundle(r.product); }); });
        var onRows = grid('watsons', p.watsons).rows.some(function (r) { return r.key === '90100'; });
        var shopee = clone(p.shopee); delete shopee.items['90200'];
        var addOn = c.addableSkus(D(), 'shopee', shopee, YEAR).some(function (x) { return x.key === '90200'; });
        var addOff = FT().withFlags({ bundle: false }, function () { return c.addableSkus(D(), 'shopee', shopee, YEAR).some(function (x) { return c.isBundle(x.product); }); });
        return [[offRows, onRows], FT().isOn('bundle'), [addOn, addOff], !!p.watsons.items['90100'] && !!find('90100')];
      }
    },
    {
      name: 'cr37-9. ตัวเลขเดิม: หน่วยขายที่ไม่มี Bundle ตัวอย่าง (8 หน่วยขายในแผน ยกเว้น Watsons · Shopee) Net Sales รวมแผนเท่ากับเมื่อไม่มี Bundle · Watsons และ Shopee ยังต่ำกว่าเป้าหมาย (ขาด)',
      expected: [8, true, [true, true]],
      actual: function () {
        var c = calc(), p = plans();
        var tree = c.topDown(D(), D().targets.years[YEAR], YEAR);
        var others = Object.keys(p).filter(function (u) { return u !== 'watsons' && u !== 'shopee'; });
        var same = others.every(function (u) {
          var on = grid(u, p[u]).yearTotal.net;
          var off = FT().withFlags({ bundle: false }, function () { return grid(u, p[u]).yearTotal.net; });
          return on === off;
        });
        function target(u) { var out = null; tree.children.forEach(function (ch) { ch.children.forEach(function (x) { if (x.id === u) out = x.amount; }); }); return out; }
        return [others.length, same, ['watsons', 'shopee'].map(function (u) { return grid(u, p[u]).yearTotal.net < target(u); })];
      }
    },
    {
      name: 'cr37-10. ข้อมูลตัวอย่าง: 90100 / 90200 เป็น Bundle (isSample) Status Active · หมวด Set & Bundle · Listing Watsons ตั้งแต่ ม.ค. 2027 / Shopee ตั้งแต่ มี.ค. 2027 · แผน 150 / 200 ชุดต่อเดือน · Shopee ม.ค.–ก.พ. ล็อก',
      expected: [[true, true], ['active', 'active'], ['cat-set-bundle', 'cat-set-bundle'], [['watsons', '2027-01'], ['shopee', '2027-03']], [150, 200], [0, 0], [2, 2]],
      actual: function () {
        var c = calc(), p = plans();
        var a = find('90100'), b = find('90200');
        var la = D().listings.filter(function (l) { return l.productKey === '90100'; }), lb = D().listings.filter(function (l) { return l.productKey === '90200'; });
        var gs = grid('shopee', p.shopee).rows.filter(function (r) { return r.key === '90200'; })[0];
        var gw = grid('watsons', p.watsons).rows.filter(function (r) { return r.key === '90100'; })[0];
        return [[a.isSample && c.isBundle(a), b.isSample && c.isBundle(b)], [c.productStatus(a, MONTH), c.productStatus(b, MONTH)], [a.categoryId, b.categoryId],
          [[la[0].accountId, la[0].fromMonth], [lb[0].accountId, lb[0].fromMonth]], [gw.cells[5].units, gs.cells[5].units], [gs.cells[0].units, gs.cells[1].units],
          [c.bundleQty(a), c.bundleQty(b)]];
      }
    },
    {
      name: 'cr37-11. (เบราว์เซอร์) Flag bundle ปิด: Net Sales รวมแผนทุกหน่วยขาย (ข้อมูลตั้งต้น · report.build) เท่ากับก่อน CR-37 111,046,508 บาท',
      expected: [111046508],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test (Node ข้ามข้อนี้)
        var c = calc();
        var total = FT().withFlags({ bundle: false }, function () { return c.sum(SP.core.report.build().units.map(function (u) { return u.plan; })); });
        return [Math.round(total)];
      }
    }
  ];
})();
