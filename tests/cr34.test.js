/*
 * tests/cr34.test.js — Test ของ CR-34 (ประเภทสินค้าในแผน SKU · เดือนเริ่มขายในคอลัมน์ช่วงเวลาขาย · + เพิ่มสินค้าในแผน · กราฟ Plan Summary)
 *
 * รันด้วย Node: node tests/run.js cr34 / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   cr34-1..2 = calc.planTypeOf ครบ 5 ประเภท (Clearance ใช้สินค้าจำลอง เพราะข้อมูลตัวอย่างไม่มีช่วง Clearance) · ยืนยันคำขอที่หน้าแผน NPD → NPD ยืนยันแล้ว
 *   cr34-3 = calc.planByTypeMonthly รวมทุกประเภท = รวมแผน Net Sales ของหน้า SKU Planning (รายเดือนและทั้งปี) · calc.planDiff
 *   cr34-4 = เดือนเริ่มขาย (setPlanStart · startMonthOptions · requestLaunchMonth · planMasterPreview)
 *   cr34-5 = Dialog เพิ่มสินค้าในแผน (planEdits.candidates · addToPlan · requestNpd) + สิทธิ์ที่ฟังก์ชัน
 *   cr34-6 = นำออกจากแผน: ลบเฉพาะ Listing จาก SKU Planning · ยกเลิกคำขอ NPD
 *   cr34-7 = ตัวเลขเดิม: หน่วยขายที่ไม่มีข้อมูลตัวอย่างใหม่ยอดเท่าเดิม · Watsons / Shopee ยังขาด
 *   cr34-8 = สัดส่วนตามประเภท / กลุ่มสินค้า (planTypeMix · planGroupByType · planClearanceItems) · cr34-9 = ข้อความและ Flag
 *   (หน้าจอ Dialog · ยืนยันก่อนล้างค่า · กราฟ ตรวจในเบราว์เซอร์ เพราะ core/store.js และ Component ไม่โหลดใน Node)
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function D() { return SP.data; }
  function calc() { return SP.core.calc; }
  function PE() { return SP.core.planEdits; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function master() {
    return { products: D().products, listings: D().listings, basePrices: D().basePrices, promoPrices: D().promoPrices, npdPlans: D().npdPlans,
      taxonomy: D().taxonomy, codeCounters: D().codeCounters };
  }
  var YEAR = 2027;
  function seeds(u) { return ((D().planSeeds && D().planSeeds.years) || {})[YEAR] ? D().planSeeds.years[YEAR][u] : null; }
  function planOf(u, m) { return calc().defaultSkuPlan(m || master(), u, YEAR, true, seeds(u)); }
  function gridOf(u, m, plan) { return calc().skuPlanGrid(D(), m || master(), u, plan || planOf(u, m), { year: YEAR, target: 0 }); }
  function allUnits() { var t = D().targets.years[YEAR].units, out = []; Object.keys(t).forEach(function (ch) { t[ch].forEach(function (u) { out.push({ id: u, channelId: ch }); }); }); return out; }
  function withProduct(m, key, patch) {
    var o = {}; Object.keys(m).forEach(function (k) { o[k] = m[k]; });
    o.products = m.products.map(function (p) { if (calc().productKey(p) !== key) return p; var x = clone(p); Object.keys(patch).forEach(function (k) { x[k] = patch[k]; }); return x; });
    return o;
  }
  var OFFICER = { userId: 'u-sp-pim' }, TT_OFFICER = { userId: 'u-tt-01' }, VIEWER = { userId: 'u-viewer' };
  function reqKey(unitId) { return D().products.filter(function (p) { return p.source === 'SALES_REQUEST' && p.request && p.request.unitId === unitId; }).map(function (p) { return calc().productKey(p); })[0]; }

  SP.tests.cr34 = [
    {
      name: 'cr34-1. planTypeOf ครบ 5 ประเภท: 16380 ที่ Watsons = สินค้าเดิม · 53021 (มียอดที่หน่วยขายอื่น ไม่มีที่ Watsons) = Listing ใหม่ · 32210 ที่ 7-Eleven = NPD ยืนยันแล้ว · คำขอจาก Sales ที่ Watsons = ขอ NPD · ช่วง Clearance ทับปีแผน = Clearance · แผนตั้งต้นทุกหน่วยขายมีครบ 4 ประเภท (ไม่รวม Clearance)',
      expected: ['existing', 'newListing', false, true, 'npdConfirmed', 'npdRequest', 'clearance', [true, true, true, true]],
      actual: function () {
        var c = calc(), m = master();
        var others = allUnits().filter(function (u) { return u.id !== 'watsons'; }).some(function (u) { return c.soldInUnit(D().history, u.id, '53021'); });
        var clr = withProduct(m, '16380', { clearance: { fromMonth: '2027-03', toMonth: '2027-06' } });
        var seen = {};
        allUnits().forEach(function (u) { gridOf(u.id).rows.forEach(function (r) { seen[r.planType] = (seen[r.planType] || 0) + 1; }); });
        return [c.planTypeOf(D(), m, '16380', 'watsons', YEAR), c.planTypeOf(D(), m, '53021', 'watsons', YEAR), c.soldInUnit(D().history, 'watsons', '53021'), others,
          c.planTypeOf(D(), m, '32210', 'seven', YEAR), c.planTypeOf(D(), m, reqKey('watsons'), 'watsons', YEAR), c.planTypeOf(D(), clr, '16380', 'watsons', YEAR),
          [seen.existing > 0, seen.newListing >= 2, seen.npdConfirmed >= 1, seen.npdRequest === 2]];
      }
    },
    {
      name: 'cr34-2 (CR-35). ยืนยันคำขอ (catalog.confirmRequest · Request → Planned) → NPD ยืนยันแล้ว · Key เดิม (ID ภายใน) · แผน NPD ของทีม Product (32210) ไม่ใช่คำขอ',
      expected: ['npdRequest', 'npdConfirmed', false, true, false],
      actual: function () {
        var c = calc(), m = master(), key = reqKey('watsons');
        var r = SP.core.catalog.confirmRequest(m, key, {}, { by: 'ทีม Product', at: '2026-09-28T09:00:00Z' });
        var confirmed = {}; Object.keys(m).forEach(function (k) { confirmed[k] = r.master[k] || m[k]; });
        return [c.planTypeOf(D(), m, key, 'watsons', YEAR), c.planTypeOf(D(), confirmed, key, 'watsons', YEAR), c.isNpdRequest(c.findProduct(confirmed.products, key)),
          !!c.findProduct(confirmed.products, key), c.isNpdRequest(c.findProduct(m.products, '32210'))];
      }
    },
    {
      name: 'cr34-3. planByTypeMonthly: ผลรวมทุกประเภทรายเดือน = รวมแผน Net Sales ของหน้า SKU Planning (ทุกหน่วยขาย · ช่วงที่เลือก 1 Channel) · ทั้งปี = สรุปหัวกราฟ · ไม่มี items = สินค้าเดิมทั้งหมด · planDiff ครบ / ขาด / เกิน / ไม่มีเป้าหมาย',
      expected: [true, true, true, true, true, ['ok', 'short', 'over', 'empty']],
      actual: function () {
        var c = calc();
        var units = [], items = [];
        allUnits().forEach(function (u) {
          var g = gridOf(u.id);
          units.push({ id: u.id, channelId: u.channelId, targetM: g.totals.net.map(function (v) { return v * 1.05; }), priorM: g.totals.net, planM: g.totals.net, plan: g.yearTotal.net });
          items = items.concat(c.skuPlanItems(g, u.id, u.channelId));
        });
        function check(list) {
          var rows = c.planByTypeMonthly({ units: list, items: items });
          var monthOk = rows.every(function (r, m) {
            var types = c.sum(c.PLAN_TYPES.map(function (t) { return r[t]; }));
            return Math.abs(types - r.plan) < 0.01 && Math.abs(r.plan - c.sum(list.map(function (u) { return u.planM[m]; }))) < 0.01;
          });
          return monthOk && Math.abs(c.sum(rows.map(function (r) { return r.plan; })) - c.sum(list.map(function (u) { return u.plan; }))) < 0.01;
        }
        var noItems = c.planByTypeMonthly({ units: units });
        return [check(units), check(units.filter(function (u) { return u.channelId === 'mt'; })),
          noItems.every(function (r) { return r.newListing === 0 && r.npdRequest === 0 && Math.abs(r.existing - r.plan) < 0.01; }),
          c.planByTypeMonthly({ units: units, items: items }).some(function (r) { return r.npdRequest > 0 && r.newListing > 0; }),
          Math.abs(c.sum(c.planByTypeMonthly({ units: units, items: items }).map(function (r) { return r.target; })) - c.sum(units.map(function (u) { return c.sum(u.targetM); }))) < 0.01,
          [c.planDiff(1e6, 1.04e6).status, c.planDiff(1e6, 0.9e6).status, c.planDiff(1e6, 1.1e6).status, c.planDiff(0, 5).status]];
      }
    },
    {
      name: 'cr34-4. เดือนเริ่มขาย: เลื่อนช้าลง → เดือนก่อนหน้าเป็น 0 (ถามก่อนล้าง 3 เดือน) · NPD ยืนยันแล้วเลือกก่อนเดือนเปิดตัวไม่ได้ (Tooltip เดือนเปิดตัว) · เดือนเปิดตัวของคำขอ = Listing ที่เริ่มเร็วสุด (สินค้า + แผน NPD) · Listing ของทีม Product ไม่ถูกแก้',
      expected: [[3, 0, 0, 0, 35], [0, 1, 2], ['beforeLaunch', 5, '2027-06'], '2027-04', ['2027-04-01', '2027-04-01', '2027-04-01'], [[], '2024-01']],
      actual: function () {
        var c = calc(), m = master();
        var plan = planOf('watsons');
        var moved = c.setPlanStart(plan, '53021', 3);
        var it = moved.items['53021'];
        var npd = c.startMonthOptions(c.findProduct(m.products, '32210'), 'npdConfirmed', c.listingOf(m.listings, '32210', 'seven'), YEAR, '2027-12');
        var firstOk = npd.months.filter(function (o) { return o.ok; })[0].m;
        var key = reqKey('watsons');
        var extra = m.listings.concat([{ productKey: key, accountId: 'eveandboy', status: 'listed', fromMonth: '2027-04', toMonth: null, addedBy: 'SALES', source: 'skuPlanning' }]);
        var p2 = clone(plan); p2.listingStarts = {}; p2.listingStarts[key] = '2027-04';
        var pv = c.planMasterPreview(m, p2, 'watsons', {});
        var np = c.findProduct(pv.products, key), nn = c.npdPlanOf(pv.npdPlans, key);
        var p3 = clone(plan); p3.listingStarts = { '16380': '2027-05' };
        var pv3 = c.planMasterPreview(m, p3, 'watsons', {});
        return [[it.startMonth, it.qty[0], it.qty[1], it.qty[2], it.qty[3]], c.startClearedMonths(plan.items['53021'], 3),
          [npd.months[0].reason, firstOk, npd.launch], c.requestLaunchMonth(extra, key), [np.launchDate, np.request.launchDate, nn.plannedLaunchDate],
          [pv3.changed, c.listingOf(pv3.listings, '16380', 'watsons').fromMonth]];
      }
    },
    {
      name: 'cr34-5. Dialog: แท็บ 1 ไม่มี SKU ที่อยู่ในแผนแล้ว (สินค้าเดิม / Listing ใหม่เท่านั้น) · แท็บ 2 = NPD ยืนยันแล้ว · เพิ่มแล้วจำนวน 0 + Listing ใหม่รอบันทึก · แท็บ 3 สร้างสินค้า Request (CR-35) ที่มา Sales + ผู้ขอ + เหตุผล · ผู้ไม่มีสิทธิ์ในหน่วยขายนั้นเรียกฟังก์ชันไม่ได้',
      expected: [0, true, true, [true, 0, '2027-03'], 'invalid', ['permission', 'permission'], ['SALES_REQUEST', 'SALES', 'พิมพ์ลดา ใจดี', 'ลูกค้าขอสีใหม่', 'request', 'npdRequest'], ['permission', 'permission']],
      actual: function () {
        var c = calc(), m = master(), pe = PE();
        var plan = planOf('TT-01');
        var ctx = { data: D(), master: m, plan: plan, unitId: 'TT-01', year: YEAR };
        var cs = pe.candidates(ctx);
        var inPlan = cs.existing.filter(function (a) { return plan.items[a.key]; }).length;
        var pick = cs.existing.filter(function (a) { return !a.blocked && !a.listed; })[0];
        var add = pe.addToPlan(ctx, TT_OFFICER, 'tt', 'existing', [pick.key], 2);
        var ad = add.ok ? add.plan.items[pick.key] : null;
        var dup = pe.addToPlan(ctx, TT_OFFICER, 'tt', 'existing', [Object.keys(plan.items)[0]], 0);
        var denied = [pe.addToPlan(ctx, OFFICER, 'tt', 'existing', [pick.key], 0).error, pe.addToPlan(ctx, VIEWER, 'tt', 'existing', [pick.key], 0).error];
        var ref = c.findProduct(m.products, reqKey('watsons'));
        var input = { name: 'ทดสอบ คำขอ', seriesId: ref.seriesId, categoryId: ref.categoryId, subCategoryId: ref.subCategoryId, typeId: ref.typeId, price: 199, startMonth: 5, year: YEAR,
          unitId: 'watsons', unitIds: [], note: '', reason: 'ลูกค้าขอสีใหม่' };
        var r = pe.requestNpd(m, OFFICER, 'mt', input, { by: 'พิมพ์ลดา ใจดี', at: '2026-09-28T09:00:00Z' });
        var n = r.ok ? c.npdPlanOf(r.master.npdPlans, r.key) : {};
        var m2 = r.ok ? { products: r.master.products, npdPlans: r.master.npdPlans, listings: r.master.listings } : m;
        return [inPlan, cs.existing.every(function (a) { return a.type === 'existing' || a.type === 'newListing'; }), cs.npd.every(function (a) { return a.type === 'npdConfirmed' && !plan.items[a.key]; }),
          [add.ok, ad ? c.sum(ad.qty) : null, add.ok ? add.plan.newListings[pick.key] : null], dup.error, denied,
          r.ok ? [r.product.source, n.source, n.requestedBy, r.product.request.reason, c.productStatus(r.product, '2027-01'), c.planTypeOf(D(), m2, r.key, 'watsons', YEAR)] : r,
          [pe.requestNpd(m, VIEWER, 'mt', input, {}).error, pe.requestNpd(m, TT_OFFICER, 'mt', input, {}).error]];
      }
    },
    {
      name: 'cr34-6. นำออกจากแผน: Listing จาก SKU Planning (53021 ที่ Watsons) ถูกลบเมื่อบันทึก เฉพาะหน่วยขายนี้ · Listing ที่ทีม Product สร้าง (16380) ไม่ถูกลบ · คำขอที่ไม่มีหน่วยขายอื่นใช้ → ยกเลิกคำขอ = ไม่มีสินค้า ราคา Listing และแผน NPD ของคำขอ',
      expected: [[false, true, true], [false, true], [[], true, true, 0, 0, 0, 0]],
      actual: function () {
        var c = calc(), m = master(), pe = PE();
        var plan = planOf('watsons');
        var r1 = pe.removeFromPlan(plan, m, 'watsons', '53021', {});
        var pv1 = c.planMasterPreview(m, r1, 'watsons', {});
        var r2 = pe.removeFromPlan(plan, m, 'watsons', '16380', {});
        var pv2 = c.planMasterPreview(m, r2, 'watsons', {});
        var key = reqKey('watsons');
        var r3 = pe.removeFromPlan(plan, m, 'watsons', key, { cancelRequest: true });
        var cut = pe.cancelRequest(m, key);
        function has(list) { return list.filter(function (x) { return (x.productKey || c.productKey(x)) === key; }).length; }
        return [[!!c.listingOf(pv1.listings, '53021', 'watsons'), pv1.listings.some(function (l) { return l.productKey === '53021' && l.accountId !== 'watsons'; }), !r1.items['53021']],
          [!!(r2.dropListings && r2.dropListings['16380']), !!c.listingOf(pv2.listings, '16380', 'watsons')],
          [pe.otherUnitsUsing(m, key, 'watsons'), !!r3.cancelRequests[key], !!r3.dropListings[key], has(cut.products), has(cut.npdPlans), has(cut.listings), has(cut.basePrices)]];
      }
    },
    {
      name: 'cr34-7. ตัวเลขเดิม: หน่วยขายที่ไม่มีข้อมูลตัวอย่างใหม่ (ไม่ใช่ Watsons / Shopee / TT เขต 1) ยอดแผนเท่ากับเมื่อไม่มีข้อมูล CR-34 · 7-Eleven 24,878,087 บาท · Watsons / Shopee ยังขาดเป้าหมาย',
      expected: [0, 24878087, ['short', 'short']],
      actual: function () {
        var c = calc(), m = master(), pe = PE();
        var base = { products: m.products, npdPlans: m.npdPlans, listings: m.listings, basePrices: m.basePrices, promoPrices: m.promoPrices };
        [reqKey('watsons'), reqKey('shopee')].forEach(function (k) { base = pe.cancelRequest(base, k); });
        base.listings = base.listings.filter(function (l) { return !(l.source === 'skuPlanning' && ((l.productKey === '53021' && l.accountId === 'watsons') || (l.productKey === '22010' && l.accountId === 'TT-01'))); });
        var before = {}; Object.keys(m).forEach(function (k) { before[k] = base[k] || m[k]; });
        var diff = allUnits().filter(function (u) { return ['watsons', 'shopee', 'TT-01'].indexOf(u.id) < 0; }).filter(function (u) {
          return Math.round(gridOf(u.id).yearTotal.net) !== Math.round(gridOf(u.id, before).yearTotal.net);
        }).length;
        var y = D().targets.years[YEAR];
        var tree = c.topDown(D(), { total: y.total, channels: y.channels, pct: y.pct, units: y.units }, YEAR);
        var amounts = {}; c.planUnits(tree).forEach(function (u) { amounts[u.id] = u.amount; });
        return [diff, Math.round(gridOf('seven').yearTotal.net), ['watsons', 'shopee'].map(function (u) { return c.remaining(amounts[u], gridOf(u).yearTotal.net).status; })];
      }
    },
    {
      name: 'cr34-8. สัดส่วนตามประเภท: สินค้าเดิมรวม Listing ใหม่ · สินค้าใหม่รวม = Listing ใหม่ + NPD ยืนยันแล้ว + ขอ NPD · ช่องว่าง = เป้าหมาย − สินค้าเดิม (ไม่รวม Listing ใหม่) · Clearance แสดงเฉพาะเมื่อมี · ตามกลุ่มสินค้า ผลรวมส่วน = รวมกลุ่ม เรียงมากไปน้อย ไม่ระบุไว้ท้าย · รายการ Clearance',
      expected: [['existing', 'npdConfirmed', 'npdRequest'], true, true, true, true, true, [1, 0], ['existing', 'npdConfirmed', 'npdRequest', 'clearance']],
      actual: function () {
        var c = calc();
        var items = [];
        allUnits().forEach(function (u) { items = items.concat(c.skuPlanItems(gridOf(u.id), u.id, u.channelId)); });
        var total = c.sum(items.map(function (it) { return c.sum(it.net); }));
        var mx = c.planTypeMix(items, null, total * 1.1);
        var exOnly = c.sum(items.filter(function (it) { return it.planType === 'existing'; }).map(function (it) { return c.sum(it.net); }));
        var nl = c.sum(items.filter(function (it) { return it.planType === 'newListing'; }).map(function (it) { return c.sum(it.net); }));
        var groups = c.planGroupByType(items, null, 'series');
        var sorted = groups.filter(function (g) { return g.key; }).every(function (g, i, a) { return !i || a[i - 1].total >= g.total; }) && groups.every(function (g, i) { return g.key || i === groups.length - 1; });
        var fake = items.slice(0, 1).map(function (it) { var o = clone(it); o.planType = 'clearance'; o.units = it.units.map(function () { return 1; }); return o; });
        var mx2 = c.planTypeMix(items.concat(fake), null, 0);
        return [mx.rows.map(function (r) { return r.type; }), Math.abs(mx.rows[0].value - exOnly - nl) < 0.01, Math.abs(mx.newTotal - (nl + mx.rows[1].value + mx.rows[2].value)) < 0.01,
          Math.abs(mx.gap - (total * 1.1 - exOnly)) < 0.01, groups.every(function (g) { return Math.abs(c.sum(Object.keys(g.parts).map(function (k) { return g.parts[k]; })) - g.total) < 0.01; }), sorted,
          [c.planClearanceItems(items.concat(fake), null).length, c.planClearanceItems(items, null).length],
          mx2.rows.map(function (r) { return r.type; })];
      }
    },
    {
      name: 'cr34-9. ข้อความ: ประเภท 5 แบบใน labels.planTypes ตามลำดับ PLAN_TYPES · จัดกลุ่ม Series | ประเภท | ไม่จัดกลุ่ม · ไม่มีปุ่ม + สร้าง NPD / + เพิ่ม SKU · Dialog 3 แท็บ · Flag npdApproval ยังปิด',
      expected: [['existing', 'newListing', 'npdConfirmed', 'npdRequest', 'clearance'], ['series', 'type', 'none'], [false, false, false], 3, false],
      actual: function () {
        var L = D().content.labels, P = D().content.pages.skuPlanning;
        return [Object.keys(L.planTypes).filter(function (k) { return calc().PLAN_TYPES.indexOf(k) >= 0; }), ['series', 'type', 'none'].filter(function (k) { return P.groupBy[k]; }),
          ['addSku' in P, 'addDrawer' in P, !!(P.npdForm && P.npdForm.button)], Object.keys(P.addPlan.tabs).length, SP.core.features.isOn('npdApproval')];
      }
    }
  ];
})();
