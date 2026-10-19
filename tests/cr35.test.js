/*
 * tests/cr35.test.js — Test ของ CR-35 (Account Master · Sales Person Management · Product Master: วงจรสถานะ · รหัสชั่วคราว · Launch & Listing · Clearance)
 *
 * รันด้วย Node: node tests/run.js cr35 / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   รอบ 1: cr35-1 = สิทธิ์แก้ไข Account Master ทุกผู้ใช้ (คำสั่งตรวจสิทธิ์ในฟังก์ชัน) · cr35-2 = ข้อความอ่านอย่างเดียวจากตารางสิทธิ์ ·
 *          cr35-3 = รหัสคู่ค้าไม่ซ้ำหลังโหลด · ยอดอ้างอิง TT รวมเท่าเดิม · cr35-4 = นำเข้า / สร้างรหัสซ้ำถูกปฏิเสธ (units + ฟังก์ชันที่ store.js ใช้)
 *   รอบ 4: cr35-12 = Launch & Listing (ย้ายสิทธิ์ npdPlan / listing · หน้าเดิมเป็นทางผ่าน) · cr35-13 = ราคา Clearance ลำดับแรก · ช่วงสิ้นสุดว่าง · SKU อื่นราคาเท่าเดิม
 *   (store.js ปฏิเสธรหัสซ้ำตอน set ตรวจในเบราว์เซอร์ เพราะ core/store.js ไม่โหลดใน Node)
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function D() { return SP.data; }
  function U() { return SP.core.units; }
  function P() { return SP.core.permissions; }
  function M() { return SP.core.master; }
  function calc() { return SP.core.calc; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function data() { var d = {}; Object.keys(D()).forEach(function (k) { d[k] = D()[k]; }); return d; }
  var MONTH = '2026-09';

  SP.tests.cr35 = [
    {
      name: 'cr35-1. สิทธิ์แก้ไข Account Master: ทุกผู้ใช้ในมุมมองผู้ใช้ — ผู้ที่ตารางสิทธิ์ให้ แก้ไข (salesUnits) บันทึกหน่วยขาย ย้ายคู่ค้า เปลี่ยนสถานะได้ · ผู้ที่เป็น ดู ถูกปฏิเสธที่ฟังก์ชัน (permission) · ค่าเริ่มต้นแก้ได้ = Sales Director และผู้ดูแลระบบ',
      expected: [0, ['admin', 'director'], true],
      actual: function () {
        var d = data();
        var bad = 0, editorRoles = {};
        var cust = d.customers.filter(function (c) { return c.channelId === 'mt' && c.active; })[0];
        var unit = U().unitOf(d, cust.id, MONTH);
        (D().users || []).filter(function (u) { return u.active !== false; }).forEach(function (u) {
          var raw = { userId: u.id };
          var can = P().level(raw, 'salesUnits') === 'EDIT';
          var r1 = U().commandSaveUnit(d, raw, unit, { note: 'ทดสอบ' });
          var r2 = U().commandMove(d, raw, [cust.id], unit, '2026-10', {});
          var r3 = U().commandStatus(d, raw, [cust.id], false);
          var ok = [r1, r2, r3].every(function (r) { return can ? r.error !== 'permission' : r.ok === false && r.error === 'permission'; });
          if (!ok) bad++;
          if (can) P().user(raw).roleIds.forEach(function (id) { editorRoles[id] = true; });
        });
        return [bad, Object.keys(editorRoles).sort(), U().canEdit({ userId: 'u-director' }) && !U().canEdit({ userId: 'u-sp-anan' })];
      }
    },
    {
      name: 'cr35-2. ข้อความอ่านอย่างเดียวอ่านชื่อบทบาทจากตารางสิทธิ์ (permissions.editors · ไม่ Hardcode): Sales Manager เห็นผู้แก้ไข = Sales Director (ผู้ดูแลระบบไม่แสดงเมื่อมีบทบาทอื่นแก้ได้) · ข้อความอยู่ใน content',
      expected: [['Sales Director'], 'ดูอย่างเดียว · แก้ไขได้โดย {roles}'],
      actual: function () {
        var eds = P().editors(['salesUnits']).filter(function (e) { return !e.everywhere; }).map(function (e) { return e.name; });
        return [eds, D().content.labels.workflow.viewOnlyBy];
      }
    },
    {
      name: 'cr35-3. รหัสคู่ค้าไม่ซ้ำหลังโหลด (ร้านค้า TT + คู่ค้าทุก Channel ทุกสถานะ) · ร้าน TT ที่รหัสซ้ำชื่อเหมือนกันรวมเป็นรายการเดียว 8 รหัส · ยอดอ้างอิงรวมของ TT เท่ายอดตั้งใจของ seed (22,900,000) · 687 เอ็นเอ็น บิวตี้ = ยอด 2 แถวรวมกัน · เขตของแถวแรก',
      expected: [[], 8, 22900000, [33348, 'TT-01'], ['merged']],
      actual: function () {
        var d = data();
        var sum = Math.round(calc().sum(D().stores.map(function (s) { return s.salesRef; })));
        var s687 = D().stores.filter(function (s) { return s.systemId === '687'; });
        var m687 = D().storeCodeMerges.filter(function (m) { return m.code === '687'; })[0];
        return [U().codeConflicts(D().stores, D().customers), D().storeCodeMerges.length, sum,
          [s687.length === 1 ? Math.round(s687[0].salesRef) : null, U().unitOf(d, '687', MONTH)],
          D().storeCodeMerges.map(function (m) { return m.action; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).concat(m687 && m687.rows.length === 2 ? [] : ['?'])];
      }
    },
    {
      name: 'cr35-4. สร้าง / นำเข้าคู่ค้ารหัสซ้ำถูกปฏิเสธ: แถวนำเข้าที่รหัสตรงกับคู่ค้า MT = ไม่นำเข้า (rejected + ชื่อเจ้าของรหัส) · แถวซ้ำในไฟล์เดียวกัน = ไม่นำเข้า · commandImport ที่ทำให้รหัสซ้ำ = error duplicateCode · ฟังก์ชันที่ core/store.js ใช้พบรหัสซ้ำ',
      expected: [[['90001', true]], 1, ['8888'], 'duplicateCode', true, 'รหัสคู่ค้า 90001 มีอยู่แล้ว (ทดสอบ)'],
      actual: function () {
        var d = data();
        var mt = d.customers.filter(function (c) { return c.trcloudId === '90001'; })[0];
        var head = ['System ID', 'ชื่อร้าน', 'ประเภทร้าน', 'ประเภทราคา', 'จังหวัด', 'Export', 'Online', 'สถานะ', 'ยอดอ้างอิง (บาท)', 'เขตการขาย'];
        var table = [['ข้อมูล ณ เดือน', 'ก.ย. 2026'], [], head,
          ['90001', 'ร้านรหัสชน', 'Wholesale', 'Dealer', 'ตาก', '', '', 'ใช้งาน', '', ''],
          ['8888', 'ร้านใหม่ A', 'Wholesale', 'Dealer', 'ตาก', '', '', 'ใช้งาน', '', ''],
          ['8888', 'ร้านใหม่ A ซ้ำ', 'Wholesale', 'Dealer', 'ตาก', '', '', 'ใช้งาน', '', '']];
        var parsed = M().importRows(table, D().storeImport.importColumns);
        var diff = M().importDiff(d, parsed.rows, '2026-10', D().storeImport.importRules);
        var forced = clone(diff);
        forced.added.push({ row: {}, territoryId: null, store: { id: '90001', systemId: '90001', name: 'ทดสอบ', tags: [], active: true, salesRef: 0 } });
        var res = U().commandImport(d, { userId: 'u-director' }, forced, { added: ['8888', '90001'], changed: [], missing: [] }, '2026-10', { at: 'x', by: 'test' });
        var stores2 = D().stores.concat([{ id: '90001', systemId: '90001', name: 'ทดสอบ' }]);
        var dup = U().firstCodeConflict(stores2, D().customers);
        return [diff.rejected.filter(function (r) { return r.code === '90001'; }).map(function (r) { return [r.code, r.name === mt.name]; }),
          diff.rejected.filter(function (r) { return r.code === '8888'; }).length, diff.added.map(function (a) { return a.store.id; }),
          res.error, !!dup && dup.code === '90001', D().content.pages.salesUnits.errors.duplicateCode.replace('{code}', '90001').replace('{name}', 'ทดสอบ')];
      }
    },
    // ---------- รอบ 2: Sales Person Management ----------
    {
      name: 'cr35-5. ตัวเลือกปี (yearPicker): ช่วงปี = ปีเก่าสุดที่มีข้อมูลผู้รับผิดชอบ ถึงปีของ PLAN_HORIZON_END (calc.ownerYears) · เปลี่ยน PLAN_HORIZON_END เป็น 2030-12 = ปีสุดท้าย 2030 โดยไม่แก้โค้ดอื่น · ป้ายปี ข้อมูลจริง / ปีแผน',
      expected: [[2026, 2027], [2026, 2027, 2028, 2029, 2030], ['actual', 'plan']],
      actual: function () {
        var S = D().settings, old = S.PLAN_HORIZON_END;
        var a = calc().ownerYears(D().assignments);
        S.PLAN_HORIZON_END = '2030-12';
        var b;
        try { b = calc().ownerYears(D().assignments); } finally { S.PLAN_HORIZON_END = old; }
        return [a, b, [calc().yearKind(2026), calc().yearKind(2027)]];
      }
    },
    {
      name: 'cr35-6. personMonthlyLoad: ผลรวมแถวบุคคล + ไม่มีผู้รับผิดชอบ ของแต่ละ Channel = ยอด Channel (ผลรวมเป้ารายเดือนของหน่วยขายใน Channel) ทุกเดือน · กลุ่มตาม Channel ของหน่วยขาย · allOwners = ทีม KAM กลาง อยู่กลุ่ม MT (ยอด 0 เพราะหน่วยขายของทีมไม่อยู่ในแผน 2027) · ไม่ส่ง opts = ผลเดิม (ไม่มีแถวยอด 0)',
      expected: [0, true, [true, 0], false],
      actual: function () {
        var c = calc(), d = data();
        var t = D().targets.years[2027].units, values = {}, expect = {};
        Object.keys(t).forEach(function (ch) {
          expect[ch] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          t[ch].forEach(function (u, i) { values[u] = expect[ch].map(function (x, m) { return (i + 1) * 100000 + m * 1000; }); values[u].forEach(function (v, m) { expect[ch][m] += v; }); });
        });
        var load = c.personMonthlyLoad(d, 2027, values, { allOwners: true });
        var bad = 0;
        load.channels.forEach(function (g) {
          for (var m = 0; m < 12; m++) {
            var s = c.sum(g.people.map(function (p) { return p.months[m]; })) + g.vacant.months[m];
            if (Math.abs(s - g.total[m]) > 0.01 || Math.abs(g.total[m] - ((expect[g.channelId] || [])[m] || 0)) > 0.01) bad++;
          }
        });
        var mt = load.channels.filter(function (g) { return g.channelId === 'mt'; })[0];
        var kam = mt.people.filter(function (p) { return p.personId === 'sp-kam'; })[0];
        var plain = c.personMonthlyLoad(d, 2027, values).channels.filter(function (g) { return g.channelId === 'mt'; })[0];
        return [bad, load.channels.every(function (g) { return g.people.every(function (p) { return p.units.every(function (u) { var i = c.unitInfo(d, u.unitId); return i && i.channel.id === g.channelId; }); }); }),
          [!!kam, kam ? kam.total : null], plain.people.some(function (p) { return p.personId === 'sp-kam'; })];
      }
    },
    {
      name: 'cr35-7. ข้อความรอบ 2 อยู่ใน content: หัวตารางมุมมองตามบุคคลเป็นพันบาท · ตัวเลือกปี · แถบโหมดแก้ไข (ต่อท้าย) · ตัดข้อความ แก้ไขได้ในมุมมองตามหน่วยขาย',
      expected: ['เป้าหมายรายเดือน 2027 (พันบาท)', 'ยอดจริง 2026 (พันบาท)', ['ปีแผน', 'ข้อมูลจริง'], 'คลิกแถวเพื่อแก้ไขบุคลากร', false],
      actual: function () {
        var P2 = D().content.pages.people, B = P2.monthly.byPerson, Y = D().content.labels.yearPicker;
        return [B.targetTitle.replace('{year}', 2027), B.actualTitle.replace('{year}', 2026), [Y.plan, Y.actual], P2.listEditHint, 'editNote' in B];
      }
    },
    // ---------- รอบ 3: Product Master ----------
    {
      name: 'cr35-8. วงจรสถานะ 7 แบบ + planTypeOf ตามตาราง 8.1: Request = ขอ NPD · Planned / NPD = NPD ยืนยันแล้ว (32210 ของทีม Product) · Active ที่เคยขาย = สินค้าเดิม / ไม่เคยขาย = Listing ใหม่ · Discontinued ที่เคยขาย = สินค้าเดิม / ไม่เคยขาย = ไม่มีประเภท · Clearance · Delete (ตัวอย่าง isSample) · revenueTypeOf ทุกสถานะ',
      expected: [['request', 'planned', 'new', 'active', 'discontinued', 'clearance', 'delete'],
        ['npdRequest', 'npdConfirmed', 'existing', 'newListing', 'existing', null, 'clearance'], 'delete', true, ['npd', 'npd', 'npd', 'existing', 'existing', 'clearance', null]],
      actual: function () {
        var c = calc(), D2 = D(), m = { products: D2.products, npdPlans: D2.npdPlans };
        var req = D2.products.filter(function (p) { return p.source === 'SALES_REQUEST'; })[0];
        var del = D2.products.filter(function (p) { return p.isSample && p.deletedFrom; })[0];
        var other = ['seven', 'watsons', 'shopee', 'lazada', 'tiktok', 'TT-01'].filter(function (u) { return !c.soldInUnit(D2.history, u, '12040'); })[0];
        var clr = D2.products.map(function (p) { if (c.productKey(p) !== '16380') return p; var x = clone(p); x.clearance = { fromMonth: '2027-03', toMonth: '2027-06' }; return x; });
        return [c.PRODUCT_STATUSES,
          [c.planTypeOf(D2, m, c.productKey(req), req.request.unitId, 2027), c.planTypeOf(D2, m, '32210', 'seven', 2027), c.planTypeOf(D2, m, '16380', 'watsons', 2027),
            c.planTypeOf(D2, m, '53021', 'watsons', 2027), c.planTypeOf(D2, m, '12040', 'eveandboy', 2027), c.planTypeOf(D2, m, '12040', other, 2027),
            c.planTypeOf(D2, { products: clr, npdPlans: D2.npdPlans }, '16380', 'watsons', 2027)],
          c.productStatus(del, '2026-09'), !c.addableSkus({ products: D2.products, listings: D2.listings, basePrices: D2.basePrices, npdPlans: D2.npdPlans }, 'seven', { items: {} }, 2027, D2.history).some(function (a) { return a.product === del; }),
          c.PRODUCT_STATUSES.map(c.revenueTypeOf)];
      }
    },
    {
      name: 'cr35-9. Migration ข้อมูลตัวอย่าง: คำขอ NPD = Status Request รหัสชั่วคราว Watsons NPD-2706-001 · Shopee NPD-2707-002 (ID ภายใน REQ-001 / REQ-002 · ไม่มี Product Code) · สินค้า Planned ของทีม Product คง Product Code (32210 · 34150) ไม่ใช่คำขอ · ไม่มีชื่อสินค้าที่มีคำ (ชื่อชั่วคราว) · ยังไม่เปิดใน TRCLOUD = คำขอเท่านั้น',
      expected: [['NPD-2706-001', 'NPD-2707-002'], ['REQ-001', 'REQ-002'], ['request', 'request'], [false, false, 'planned'], 0, 2],
      actual: function () {
        var c = calc(), P0 = D().products;
        var reqs = P0.filter(c.isRequestProduct);
        var p32 = c.findProduct(P0, '32210'), p34 = c.findProduct(P0, '34150');
        return [reqs.map(c.productCode), reqs.map(c.productKey), reqs.map(function (p) { return c.productStatus(p, '2026-09'); }),
          [c.isRequestProduct(p32), c.isRequestProduct(p34), c.productStatus(p32, '2026-09')],
          P0.filter(function (p) { return /\(ชื่อชั่วคราว\)/.test(p.name); }).length, P0.filter(function (p) { return !SP.core.catalog.inTrcloud(p); }).length];
      }
    },
    {
      name: 'cr35-10. รหัสชั่วคราวคำขอ: สร้างคำขอ = NPD-YYMM-NNN (ลำดับรวมทั้งระบบ) · เลื่อนเดือนเริ่มของ Listing ที่เร็วสุด → YYMM เปลี่ยน NNN คงเดิม · ยืนยัน (catalog.confirmRequest) = Product Code 5 หลักจากตัวสร้างเดิม + tempCode · Key เดิม แผน SKU / Listing / ราคาอยู่ครบ · ยืนยันซ้ำไม่ได้',
      expected: [true, 'NPD-2706-003', 'NPD-2704-003', ['33500', 'NPD-2704-003', 'Glow Tint จริง', 'planned'], [true, true, true], 'notRequest'],
      actual: function () {
        var c = calc(), K = SP.core.catalog, m0 = { products: D().products, basePrices: D().basePrices, listings: D().listings, taxonomy: D().taxonomy, codeCounters: D().codeCounters, npdPlans: D().npdPlans };
        var res = c.createSalesNpd(m0, { name: 'Glow Tint', seriesId: null, typeId: 'type-tint', price: 259, startMonth: 5, year: 2027, unitId: 'seven', unitIds: [] }, { by: 'x', at: 'y' });
        var key = res.key;
        var plan = { items: {} }; plan.items[key] = c.newPlanItem(res.product, 2027, 0, 5); plan.listingStarts = {}; plan.listingStarts[key] = '2027-04';
        var pv = c.planMasterPreview(res.master, plan, 'seven', {});
        var moved = c.findProduct(pv.products, key);
        var m1 = { products: pv.products, listings: pv.listings, npdPlans: pv.npdPlans, basePrices: res.master.basePrices, taxonomy: D().taxonomy, codeCounters: res.master.codeCounters };
        var conf = K.confirmRequest(m1, key, { name: 'Glow Tint จริง' }, { by: 'ทีม Product', at: '2026-09-28T00:00:00Z' });
        var cp = c.findProduct(conf.master.products, key);
        var again = K.confirmRequest(conf.master, key, {}, {});
        return [/^NPD-\d{4}-\d{3}$/.test(c.productCode(res.product)), c.productCode(res.product), c.productCode(moved),
          [cp.trCode, cp.tempCode, cp.name, c.productStatus(cp, '2026-09')],
          [c.productKey(cp) === key, conf.master.listings.some(function (l) { return l.productKey === key; }), conf.master.basePrices.some(function (b) { return b.productKey === key; })], again.error];
      }
    },
    {
      name: 'cr35-11. ความครบถ้วนของคำขอ: ไม่นับรหัส TRCLOUD / Barcode · ฟิลด์จำเป็น ชื่อ · Series · หมวด · Type · RSP · เดือนเริ่มขาย (คำขอที่ไม่มี Series และ RSP = ขาดจำเป็น 2) · สินค้าปกติยังใช้ฟิลด์จำเป็นเดิม',
      expected: [['seriesId', 'rsp'], [], true],
      actual: function () {
        var c = calc();
        var req = D().products.filter(c.isRequestProduct)[0];
        var x = clone(req); x.seriesId = null;
        var a = c.productCompleteness(x, []);
        var b = c.productCompleteness(req, D().basePrices);
        var normal = c.productCompleteness({ trCode: '99999', name: 'x' }, []).missingRequired.indexOf('code') < 0 && c.productCompleteness({ name: 'x' }, []).missingRequired.indexOf('code') >= 0;
        return [a.missingRequired, b.missingRequired, normal];
      }
    },
    {
      name: 'cr35-12. Launch & Listing: สิทธิ์ที่บันทึกไว้ของแผน NPD + Listing เดิม → launchListing ระดับสูงสุดของสองค่า (บทบาทที่ตั้ง launchListing แล้วคงค่าใหม่) · ถามสิทธิ์ด้วยชื่อเดิม = launchListing ทุกผู้ใช้ · ตารางตั้งต้นไม่มี Key เดิม · หน้าเดิมซ่อนจากเมนูและใช้สิทธิ์ launchListing',
      expected: [[{ level: 'EDIT', scope: 'ALL' }, { level: 'EDIT', scope: 'TEAM' }, { level: 'VIEW', scope: 'ALL' }], [false, false], true, 0,
        [[false, 'launchListing'], [false, 'launchListing'], [true, 'product-master']]],
      actual: function () {
        var m = P().migratePerms({
          r1: { npdPlan: { level: 'VIEW', scope: 'ALL' }, listing: { level: 'EDIT', scope: 'ALL' } },
          r2: { npdPlan: { level: 'EDIT', scope: 'TEAM' } },
          r3: { launchListing: { level: 'VIEW', scope: 'ALL' }, npdPlan: { level: 'EDIT', scope: 'ALL' } }
        });
        var same = (D().users || []).every(function (u) {
          var raw = { userId: u.id }, ll = P().level(raw, 'launchListing');
          return P().level(raw, 'npdPlan') === ll && P().level(raw, 'listing') === ll;
        });
        var legacy = 0;
        Object.keys(D().permissions).forEach(function (r) { if (D().permissions[r].npdPlan || D().permissions[r].listing) legacy++; });
        var R = SP.core.registry;
        return [[m.perms.r1.launchListing, m.perms.r2.launchListing, m.perms.r3.launchListing], ['npdPlan' in m.perms.r1, 'listing' in m.perms.r1], same, legacy,
          ['npdPlan', 'productMaster', 'launchListing'].map(function (id) { var e = R.byId(id); return [e.visible !== false, id === 'launchListing' ? e.group : e.perm]; })];
      }
    },
    {
      name: 'cr35-13. ราคา Clearance ลำดับแรก: ในช่วง Clearance ใช้ราคา Clearance แม้มี Promotion Price ของหน่วยขาย · ก่อนช่วงใช้ลำดับเดิม · สิ้นสุดว่าง = จนสินค้าหมด (ปีแผนสุดท้ายยังเป็น Clearance) · เลือกหน่วยขายได้ · ไม่มีราคา Clearance = ลำดับเดิม · SKU อื่นราคาเท่าเดิมทุกตัว · ส่วนลด · SKU ที่เริ่ม Clearance ได้ = Active / Discontinued',
      expected: [[149, 'promoUnit'], [99, 'clearance'], [99, 'clearance'], ['active', 'clearance', 'clearance'], [[149, 'promoUnit'], [99, 'clearance']], [149, 'promoUnit'], 0, 0.25, [true, 118]],   // CR-36: 32090 มีช่วง Clearance ตัวอย่างแล้ว (เริ่มไม่ได้อีก) · CR-37 + Bundle ตัวอย่าง 2 (Active)
      actual: function () {
        var c = calc(), d0 = data();
        function withCl(cl) { var d = data(); d.products = D().products.map(function (p) { if (c.productKey(p) !== '33400') return p; var x = clone(p); x.clearance = cl; return x; }); return d; }
        var d = withCl({ fromMonth: '2027-03', toMonth: null, stockQty: 0, price: 99, unitIds: null, expiry: null, note: null });
        function rp(dd, unit, month) { var r = c.resolvePrice(dd, '33400', unit, month); return [r.price, r.source]; }
        var p = c.findProduct(d.products, '33400');
        var dU = withCl({ fromMonth: '2027-03', toMonth: null, price: 99, unitIds: ['watsons'] });
        var dN = withCl({ fromMonth: '2027-03', toMonth: '2027-06', stockQty: 10 });
        var diff = 0;
        D().products.forEach(function (x) {
          var k = c.productKey(x);
          if (k === '33400') return;
          ['seven', 'watsons', 'shopee'].forEach(function (u) { [0, 5, 11].forEach(function (mm) { if (c.effectivePrice(d, k, u, 2027, mm) !== c.effectivePrice(d0, k, u, 2027, mm)) diff++; }); });
        });
        var now = SP.core.clock.currentMonth();
        var cand = c.clearanceCandidates(D().products, now);
        return [rp(d, 'seven', '2027-02'), rp(d, 'seven', '2027-03'), rp(d, 'seven', '2030-12'),
          [c.productStatus(p, '2027-02'), c.productStatus(p, '2027-03'), c.productStatus(p, '2030-12')],
          [rp(dU, 'seven', '2027-03'), rp(dU, 'watsons', '2027-03')], rp(dN, 'seven', '2027-04'), diff,
          c.clearanceDiscount(200, 150),
          [cand.every(function (x) { var s = c.productStatus(x, now); return s === 'active' || s === 'discontinued'; }), cand.length]];
      }
    }
  ];
})();
