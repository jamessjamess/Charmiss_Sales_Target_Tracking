/*
 * tests/cr33.test.js — Test ของ CR-33 (Account Master แก้ไขรายรายการ · SKU Planning แยกคอลัมน์ช่วงเวลาขาย / อายุ)
 *
 * รันด้วย Node: node tests/run.js cr33 / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   cr33-1..2 = calc.skuAgeGroup (แหล่งเดียวของตัวกรองอายุและคอลัมน์อายุ) · cr33-3 = ข้อความ (content.js · guide.js)
 *   cr33-4 = จำนวนคู่ค้าต่อหน่วยขาย (units.unitCounts) เท่าจำนวนแถวของตารางเมื่อเลือกหน่วยขายนั้น
 *   cr33-5..7 = คำสั่งแก้ไขรายรายการ (units.command*) · ไม่แก้ค่าที่ส่งเข้า (ยกเลิก = ไม่เปลี่ยน) · ผู้ไม่มีสิทธิ์ถูกปฏิเสธที่ฟังก์ชัน
 *   cr33-8 = Preset คอลัมน์ตามแท็บ + เวอร์ชัน Preset (catalog.ensureVersion)
 *   (บันทึกลง store ทันที + Toast · ปิด Drawer ที่ยังไม่บันทึก = ถามก่อน ตรวจในเบราว์เซอร์ เพราะ core/store.js ไม่โหลดใน Node)
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function D() { return SP.data; }
  function U() { return SP.core.units; }
  function calc() { return SP.core.calc; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function master() { return { products: D().products, listings: D().listings, basePrices: D().basePrices, npdPlans: D().npdPlans }; }
  function data() { var d = {}; Object.keys(D()).forEach(function (k) { d[k] = D()[k]; }); return d; }
  var DIRECTOR = { userId: 'u-director' }, MANAGER = { userId: 'u-sp-anan' }, OFFICER = { userId: 'u-sp-pim' }, PRODUCT = { userId: 'u-product' }, ADMIN = { userId: 'u-admin' };
  var MONTH = '2026-09';

  SP.tests.cr33 = [
    {
      name: 'cr33-1. skuAgeGroup: ทุก SKU ที่ Listing ในทุกหน่วยขายของแผน 2027 ได้กลุ่มเดียว และตรงกับผลการกรองของตัวกรองอายุทุกค่า (ageMatch) · ageBand เท่าเดิม · มีครบ 4 กลุ่ม',
      expected: [0, 0, 0, ['gt2y', 'le1y', 'notStarted', 'y1to2']],
      actual: function () {
        var units = D().targets.years[2027].units;
        var bad = 0, multi = 0, band = 0, seen = {};
        Object.keys(units).forEach(function (ch) {
          units[ch].forEach(function (u) {
            D().listings.filter(function (l) { return l.accountId === u; }).forEach(function (l) {
              var a = calc().salesAge(D(), l.productKey, u, { master: master(), year: 2027 });
              var g = calc().skuAgeGroup(a);
              seen[g] = true;
              var hits = calc().AGE_GROUPS.filter(function (f) { return calc().ageMatch(a, f); });
              if (hits.length !== 1) multi++;
              if (hits[0] !== g) bad++;
              if (calc().ageBand(a) !== (g === 'notStarted' ? null : g)) band++;
            });
          });
        });
        return [bad, multi, band, Object.keys(seen).sort()];
      }
    },
    {
      name: 'cr33-2. SKU ที่ยังไม่เริ่มขาย: NPD 32210 ที่ 7-Eleven (เริ่ม มิ.ย. 2027) · ไม่มีข้อมูลอายุ → notStarted ป้าย "ยังไม่เริ่มขาย" · ตัวกรอง notStarted กรองได้ · 12 / 13 / 24 / 25 เดือน → ≤ 1 ปี · 1–2 ปี · 1–2 ปี · > 2 ปี · asOfMonth ก่อนเดือนเริ่มขาย = notStarted',
      expected: ['notStarted', 'notStarted', 'ยังไม่เริ่มขาย', true, false, ['≤ 1 ปี', '1–2 ปี', '1–2 ปี', '> 2 ปี'], 'notStarted'],
      actual: function () {
        var AG = D().content.pages.skuPlanning.age;
        var npd = calc().salesAge(D(), '32210', 'seven', { master: master(), year: 2027 });
        function ageOf(n) { return { started: true, firstSaleMonth: '2024-01', sellingMonths: n }; }
        return [calc().skuAgeGroup(npd), calc().skuAgeGroup(null), AG.groups[calc().skuAgeGroup(npd)], calc().ageMatch(npd, 'notStarted'), calc().ageMatch(ageOf(5), 'notStarted'),
          [12, 13, 24, 25].map(function (n) { return AG.groups[calc().skuAgeGroup(ageOf(n))]; }), calc().skuAgeGroup(ageOf(30), '2023-12')];
      }
    },
    {
      name: 'cr33-3. ข้อความ: ไม่มี "รหัส TRCLOUD" และ "อายุนาน" ใน content.js / guide.js · ใช้ "รหัสคู่ค้า" · คำศัพท์ รหัสคู่ค้า ในคู่มือ · ป้ายกลุ่มอายุชุดเดียว (4 ป้าย) · ตัวกรองอายุไม่มีชุดป้ายแยก',
      expected: [0, 0, 'รหัสคู่ค้า', 'ค้นหารหัสคู่ค้า / ชื่อ', true, ['gt2y', 'le1y', 'notStarted', 'y1to2'], false],
      actual: function () {
        var txt = JSON.stringify(D().content) + JSON.stringify(D().guide);
        function n(t) { return txt.split(t).length - 1; }
        var P = D().content.pages;
        var AG = P.skuPlanning.age;
        return [n('รหัส TRCLOUD'), n('อายุนาน'), P.salesUnits.columns.trcloudId, P.salesUnits.search,
          D().guide.glossaryGroups.some(function (grp) { return grp.terms.some(function (g) { return g.term === 'รหัสคู่ค้า' && /TRCLOUD/.test(g.meaning); }); }), Object.keys(AG.groups).sort(), 'filters' in AG];
      }
    },
    {
      name: 'cr33-4. จำนวนคู่ค้าต่อหน่วยขาย (units.unitCounts) = จำนวนคู่ค้าที่อยู่ในหน่วยขายนั้น ณ เดือน และผ่านตัวกรองสถานะเดียวกัน (ใช้งาน · ปิดใช้งาน · ทั้งหมด) ทุกหน่วยขาย · 7-Eleven 4 · Beautrium 10 · TT เขต 1 = 42 (CR-35 รวมรหัสซ้ำ 687)',
      expected: [0, [4, 10, 42]],
      actual: function () {
        var d = data();
        var mem = U().membership(d, MONTH), all = U().customers(d);
        var bad = 0;
        ['active', 'inactive', 'all'].forEach(function (st) {
          var c = U().unitCounts(d, MONTH, st);
          U().salesUnits(d, MONTH).forEach(function (u) {
            var rows = all.filter(function (x) { return mem[x.id] === u.id && (st === 'all' || (st === 'active' ? x.active : !x.active)); }).length;
            if ((c.byUnit[u.id] || 0) !== rows) bad++;
          });
        });
        var a = U().unitCounts(d, MONTH, 'active').byUnit;
        return [bad, [a.seven, a.beautrium, a['TT-01']]];
      }
    },
    {
      name: 'cr33-5. บันทึก Drawer หน่วยขาย (Sales Director): หมายเหตุ + ชื่อ → changes.accounts ค่าใหม่ทันที · ข้อมูลที่ส่งเข้าไม่เปลี่ยน (ยกเลิก = ไม่มีผล) · ชื่อซ้ำใน Channel = duplicate · ชื่อว่าง = name · GP เปลี่ยนได้ (สิทธิ์ย่อย GP)',
      expected: ['CR33 note', '7-Eleven Thailand', true, 'duplicate', 'name', 0.41, true],
      actual: function () {
        var d = data();
        var before = JSON.stringify(d.accounts);
        var r = U().commandSaveUnit(d, DIRECTOR, 'seven', { note: 'CR33 note', name: '7-Eleven Thailand' });
        var acc = calc().findById(U().withChanges(d, r.changes).accounts, 'seven');
        var gp = U().commandSaveUnit(d, DIRECTOR, 'seven', { gp: 0.41 });
        return [acc.note, acc.name, JSON.stringify(d.accounts) === before, U().commandSaveUnit(d, DIRECTOR, 'seven', { name: 'watsons' }).error,
          U().commandSaveUnit(d, DIRECTOR, 'seven', { name: '  ' }).error, calc().findById(gp.changes.accounts, 'seven').gp, r.ok && gp.ok];
      }
    },
    {
      name: 'cr33-6. คำสั่งแก้ไขคู่ค้า (Sales Director): ย้าย 2 รายไป EVEANDBOY ตั้งแต่ ต.ค. 2026 · เปลี่ยนสถานะ 1 ราย · ใช้หน่วยขายแนะนำ (ยังไม่จัดสรร → Beautrium) · เพิ่มหน่วยขาย (รหัสระบบสร้าง) · ข้อมูลที่ส่งเข้าไม่เปลี่ยน',
      expected: [['eveandboy', 'eveandboy'], ['beautrium', 'beautrium'], false, 1, 'beautrium', 'U-MT-010', true],
      actual: function () {
        var d = data();
        var snap = JSON.stringify([d.customerAssignments, d.customers, d.accounts]);
        var ids = U().customersIn(d, 'beautrium', MONTH).slice(0, 2).map(function (x) { return x.id; });
        var mv = U().commandMove(d, DIRECTOR, ids, 'eveandboy', '2026-10', { current: MONTH, at: 'x', by: 'test' });
        var d2 = U().withChanges(d, mv.changes);
        var st = U().commandStatus(d, DIRECTOR, [ids[0]], false);
        var sample = U().customersIn(d, null, MONTH, 'mt').filter(function (x) { return calc().suggestSalesUnit(x, U().salesUnits(d, MONTH)) === 'beautrium'; })[0];
        var sg = U().commandSuggest(d, DIRECTOR, [sample.id], '2026-10', { current: MONTH }, MONTH);
        var add = U().commandAddUnit(d, DIRECTOR, 'mt', { name: 'CR33 Unit' }, { id: 'acc-cr33' });
        return [ids.map(function (id) { return U().unitOf(d2, id, '2026-10'); }), ids.map(function (id) { return U().unitOf(d2, id, '2026-09'); }),
          calc().findById(st.changes.customers, ids[0]).active, st.changed, U().unitOf(U().withChanges(d, sg.changes), sample.id, '2026-10'),
          calc().findById(add.changes.accounts, 'acc-cr33').code, JSON.stringify([d.customerAssignments, d.customers, d.accounts]) === snap];
      }
    },
    {
      name: 'cr33-7. ผู้ไม่มีสิทธิ์เรียกคำสั่งแก้ไขไม่ได้ (ตรวจที่ฟังก์ชัน): Sales Manager / Officer / ทีม Product → permission ทุกคำสั่ง · Manager ตั้งค่า Channel ไม่ได้ · ผู้ดูแลระบบทำได้ · canEdit ตรงกับสิทธิ์ salesUnits',
      expected: [['permission', 'permission', 'permission', 'permission', 'permission', 'permission', 'permission'], ['permission', 'permission', 'permission'], [true, true], [false, false, false, true, true]],
      actual: function () {
        var d = data();
        var ids = U().customersIn(d, 'beautrium', MONTH).slice(0, 1).map(function (x) { return x.id; });
        function all(user) {
          return [U().commandMove(d, user, ids, 'eveandboy', '2026-10', {}).error, U().commandStatus(d, user, ids, false).error, U().commandSaveUnit(d, user, 'seven', { note: 'x' }).error,
            U().commandAddUnit(d, user, 'mt', { name: 'x' }).error, U().commandSuggest(d, user, ids, '2026-10', {}, MONTH).error,
            U().commandRemoveUnit(d, user, 'seven', {}).error, U().commandChannels(d, user, d.channels).error];
        }
        var off = all(OFFICER);
        return [off, [all(MANAGER)[0], all(PRODUCT)[1], U().commandChannels(d, MANAGER, d.channels).error],
          [U().commandStatus(d, ADMIN, ids, false).ok, U().commandChannels(d, ADMIN, d.channels).ok],
          [U().canEdit(OFFICER), U().canEdit(MANAGER), U().canEdit(PRODUCT), U().canEdit(DIRECTOR), U().canEdit(ADMIN)]];
      }
    },
    {
      name: 'cr33-8. คอลัมน์ค่าเริ่มต้นตามแท็บ: ทั้งหมด / MT = standard (ประเภท · สถานะ · หน่วยขาย) · TT = territory · ECOM = single (สถานะ · Platform) · ไม่มียอดอ้างอิง / หน่วยขายแนะนำ · เวอร์ชัน Preset ต่าง = ล้าง Preset ของผู้ใช้ 1 ครั้ง · เวอร์ชันเดิม = ไม่ล้าง',
      expected: [['standard', 'standard', 'territory', 'single'], [['kind', 'status', 'unit'], ['status', 'unit']], false, [true, 0, null], false],
      actual: function () {
        var d = data(), CAT = SP.core.catalog, S = D().settings;
        var ids = [null, 'mt', 'tt', 'ecom'].map(function (c) { return U().columnPresetFor(d, c); });
        var cols = function (id) { return S.SALES_UNIT_COLUMN_PRESETS.filter(function (p) { return p.id === id; })[0].columns; };
        var anyRef = S.SALES_UNIT_COLUMN_PRESETS.filter(function (p) { return p.id !== 'full'; }).some(function (p) { return p.columns.indexOf('refL12M') >= 0 || p.columns.indexOf('suggested') >= 0; });
        var old = CAT.savePreset(CAT.setColumns({}, 'u-a', 'salesUnits.mt', ['kind', 'refL12M']), 'u-a', 'salesUnits.mt', 'เดิม', ['refL12M']).all;
        var r = CAT.ensureVersion(old, 'u-a', 'salesUnits.mt', S.SALES_UNIT_COLUMN_VERSION);
        var t = CAT.tableState(r.all, 'u-a', 'salesUnits.mt');
        var again = CAT.ensureVersion(CAT.setColumns(r.all, 'u-a', 'salesUnits.mt', ['kind']), 'u-a', 'salesUnits.mt', S.SALES_UNIT_COLUMN_VERSION);
        return [ids, [cols('standard'), cols('single')], anyRef, [r.reset, t.presets.length, t.columns], again.reset];
      }
    }
  ];
})();
