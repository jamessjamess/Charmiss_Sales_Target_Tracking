/*
 * tests/cr32.test.js — Test ของ CR-32 (Account Master · Sales Person Management)
 *
 * รันด้วย Node: node tests/run.js cr32 / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   รอบ 1: cr32-1..8 = ค่าคงที่สุดแผน · Seed คู่ค้า (ยอด L12M · ID หน่วยขายเดิม · 1 หน่วยขายต่อเดือน) · suggestSalesUnit
 *   (การล้างข้อมูลรุ่นเก่า + ข้อความแจ้ง 1 ครั้ง ตรวจในเบราว์เซอร์ เพราะ core/store.js ไม่โหลดใน Node)
 *   รอบ 2: cr32-9..14 = Permissions (key ใหม่ · Migration สูงสุดของ key เดิม) · ย้ายคู่ค้าทุก Channel · ข้อมูลที่ต้องตรวจของ Account Master · dataCheck (DOM)
 *   รอบ 3: cr32-15..19 = ผู้ใช้–บุคลากร 1:1 (person.userId) · สิทธิ์ของผู้ใช้ตัวอย่างเท่าเดิม · ข้อมูลที่ต้องตรวจของ Sales Person Management · บทบาทตั้งต้นของบัญชีใหม่
 *   รอบ 4: cr32-20..25 = การแทนที่ผู้รับผิดชอบ (4.4) · personMonthlyLoad · UAT S10
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function D() { return SP.data; }
  function U() { return SP.core.units; }
  function C() { return SP.core.calc; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function units() { return U().salesUnits(D(), '2026-09'); }
  function cust(name, channelId, extra) { var c = { name: name, channelId: channelId, kind: 'branch' }; Object.keys(extra || {}).forEach(function (k) { c[k] = extra[k]; }); return c; }

  SP.tests.cr32 = [
    {
      name: 'cr32-1. PLAN_HORIZON_END = 2027-12 ที่ settings ที่เดียว · clock.horizonEnd · ปุ่มปี = ปีของเดือนปัจจุบัน ถึงปีสุดแผน (2026 · 2027) · เปลี่ยนเป็น 2028-06 → 2026–2028',
      expected: ['2027-12', '2027-12', [2026, 2027], [2026, 2027, 2028]],
      actual: function () {
        var S = D().settings, K = SP.core.clock;
        var a = [S.PLAN_HORIZON_END, K.horizonEnd(), K.horizonYears()];
        var old = S.PLAN_HORIZON_END;
        S.PLAN_HORIZON_END = '2028-06';
        try { a.push(K.horizonYears()); } finally { S.PLAN_HORIZON_END = old; }
        return a;
      }
    },
    {
      name: 'cr32-2. Seed: ผลรวมยอดอ้างอิงของคู่ค้าที่จัดสรร = ยอด L12M ของหน่วยขายทุก Account / Platform (ไม่มียอด = 0) · เขต TT = ยอดขายปี 2026 ของเขต (ร้าน ณ ม.ค. 2027) · สาขาที่ยังไม่จัดสรรไม่นับ',
      expected: [[], [], 3],
      actual: function () {
        var bad = [];
        D().accounts.forEach(function (a) {
          var s = C().sum(U().customersIn(D(), a.id, '2026-09').map(function (c) { return c.refL12M; }));
          if (s !== (C().l12m(D(), a.id) || 0)) bad.push(a.id + ':' + s);
        });
        var badTt = [];
        D().territories.forEach(function (t) {
          var s = C().sum(U().customersIn(D(), t.id, '2027-01').map(function (c) { return c.refL12M; }));
          var h = C().sum(D().history.years[2026].monthly[t.id]);
          if (s !== h) badTt.push(t.id + ':' + s + '/' + h);
        });
        return [bad, badTt, U().customersIn(D(), null, '2026-09', 'mt').length];
      }
    },
    {
      name: 'cr32-3. ID หน่วยขายเดิมอยู่ครบ (Account · Platform · เขต TT) รหัสไม่เปลี่ยน: EVEANDBOY U-MT-003 · Beautrium U-MT-004 · Shopee U-ECOM-001 · TT-01',
      expected: [true, 21, ['U-MT-003', 'U-MT-004', 'U-ECOM-001', 'TT-01']],
      actual: function () {
        var list = units();
        var ids = list.map(function (u) { return u.id; });
        var old = D().accounts.map(function (a) { return a.id; }).concat(D().territories.map(function (t) { return t.id; }));
        function code(id) { return list.filter(function (u) { return u.id === id; })[0].code; }
        return [old.every(function (id) { return ids.indexOf(id) >= 0; }), ids.length, [code('eveandboy'), code('beautrium'), code('shopee'), code('TT-01')]];
      }
    },
    {
      name: 'cr32-4. คู่ค้าอยู่ได้ไม่เกิน 1 หน่วยขายต่อเดือน และอยู่ใน Channel เดียวกัน: Seed ถูกต้อง · ตัวอย่างช่วงทับกัน → overlap · ย้ายสาขา MT ไป Platform ECOM → channel',
      expected: [[], ['overlap'], ['channel']],
      actual: function () {
        var d = { accounts: D().accounts, territories: D().territories, channels: D().channels, stores: D().stores, storeAssignments: D().storeAssignments,
          storeChannels: D().storeChannels, provinceSuggestions: D().provinceSuggestions, customers: D().customers, customerAssignments: D().customerAssignments };
        var ok = U().validate(d);
        var d2 = clone(d); d2.customerAssignments.push({ customerId: '3107', salesUnitId: 'eveandboy', fromMonth: '2026-06', toMonth: null });
        var d3 = clone(d); d3.customerAssignments = d3.customerAssignments.map(function (a) { return a.customerId === '3107' ? { customerId: '3107', salesUnitId: 'shopee', fromMonth: a.fromMonth, toMonth: null } : a; });
        function types(list) { return list.filter(function (x) { return x.customerId === '3107'; }).map(function (x) { return x.type; }); }
        return [ok, types(U().validate(d2)), types(U().validate(d3))];
      }
    },
    {
      name: 'cr32-5. suggestSalesUnit: BEAUTRIUM_… → Beautrium · EVEANDBOY_… → EVEANDBOY · ตัวพิมพ์เล็ก → ได้เหมือนกัน · คำนำหน้าไม่ตรง / ไม่มี _ → null · ECOM → null',
      expected: ['beautrium', 'eveandboy', 'beautrium', 'seven', null, null, null],
      actual: function () {
        var u = units();
        return [C().suggestSalesUnit(cust('BEAUTRIUM_สาขาตัวอย่างใหม่ 1', 'mt'), u), C().suggestSalesUnit(cust('EVEANDBOY_สาขาตัวอย่างใหม่ 1', 'mt'), u),
          C().suggestSalesUnit(cust('beautrium_สาขาใหม่', 'mt'), u), C().suggestSalesUnit(cust('7ELEVEN_สาขาตัวอย่าง 2', 'mt'), u),
          C().suggestSalesUnit(cust('NEWACCOUNT_สาขาตัวอย่าง 1', 'mt'), u), C().suggestSalesUnit(cust('BEAUTRIUM (บริษัท บิวเทรี่ยม จำกัด 00026)', 'mt'), u),
          C().suggestSalesUnit(cust('Shopee', 'ecom', { kind: 'platform' }), u)];
      }
    },
    {
      name: 'cr32-6. suggestSalesUnit ของร้านค้า TT ได้ผลเท่ากับเขตแนะนำเดิม (stores.suggestTerritory) ทั้ง 211 ร้าน (CR-35 รวมรหัสซ้ำ) · มีคำแนะนำ 152 ร้าน',
      expected: [211, 0, 152],
      actual: function () {
        var u = units();
        var tt = U().customers(D()).filter(function (c) { return c.kind === 'store'; });
        var diff = tt.filter(function (c) {
          var s = D().stores.filter(function (x) { return x.id === c.id; })[0];
          return C().suggestSalesUnit(c, u) !== SP.core.stores.suggestTerritory(s, D().provinceSuggestions);
        }).length;
        return [tt.length, diff, tt.filter(function (c) { return C().suggestSalesUnit(c, u); }).length];
      }
    },
    {
      name: 'cr32-7. Seed สาขา MT: Beautrium 10 (สำนักงานใหญ่ 5% · คลังสินค้า 20% · สาขาลดหลั่น) · EVEANDBOY 10 (Tax ID สาขาต่างจากสำนักงานใหญ่) · Account อื่น 4 รายการ isSample · ECOM Platform ละ 1',
      expected: [[10, 74600, 298400, true], [10, '0445559000295', '0107569000187'], [4, 4, 4, 4, 4, 4, 4], true, [5, '95001', 'platform']],
      actual: function () {
        function inU(id) { return U().customersIn(D(), id, '2026-09'); }
        var b = inU('beautrium'), e = inU('eveandboy');
        var branches = b.filter(function (c) { return c.kind === 'branch' && !c.warehouse; }).map(function (c) { return c.refL12M; });
        var desc = branches.every(function (v, i) { return i === 0 || v <= branches[i - 1]; });
        var others = ['seven', 'watsons', 'cjexpress', 'konvy', 'lotuss', 'tsuruha', 'mrdiy'];
        var samples = others.every(function (id) { return inU(id).every(function (c) { return c.isSample && Number(c.trcloudId) >= 90001; }); });
        var ecom = U().customers(D()).filter(function (c) { return c.channelId === 'ecom'; });
        return [[b.length, b.filter(function (c) { return c.kind === 'headOffice'; })[0].refL12M, b.filter(function (c) { return c.warehouse; })[0].refL12M, desc],
          [e.length, e.filter(function (c) { return c.kind === 'headOffice'; })[0].taxId, e.filter(function (c) { return c.kind === 'branch'; })[0].taxId],
          others.map(function (id) { return inU(id).length; }), samples, [ecom.length, ecom[0].trcloudId, ecom[0].kind]];
      }
    },
    {
      name: 'cr32-8. คู่ค้าโครงเดียวทุก Channel: ร้าน TT ใช้ System ID เป็นรหัส TRCLOUD · ประเภทคู่ค้า TRCLOUD = ประเภทร้าน · ร้านบุคคลธรรมดายังซ่อนชื่อ (26 ร้าน · CR-35 รวมรหัสซ้ำ) · ข้อความแจ้งโหลดข้อมูลใหม่อยู่ใน content',
      expected: [['1889', 'Wholesale', 'store', 179145], 26, true],
      actual: function () {
        var all = U().customers(D());
        var s = all.filter(function (c) { return c.id === '1889'; })[0];
        return [[s.trcloudId, s.trcloudType, s.kind, s.refL12M], all.filter(function (c) { return c.masked; }).length, !!D().content.site.dataVersionToast];
      }
    },
    {
      name: 'cr32-9. Permissions: หน้า Account & Platform / เขตและร้านค้า (TT) เดิมไม่มีแถวในเมทริกซ์ · มี Account Master + GP + ตั้งค่า Channel · หน้าเดิมซ่อนและใช้สิทธิ์ salesUnits',
      expected: [false, false, true, true, true, [false, 'salesUnits'], [false, 'salesUnits'], true],
      actual: function () {
        var P = SP.core.permissions, R = SP.core.registry;
        var ids = P.resources(R.list).map(function (r) { return r.id; });
        var a = R.byId('accounts'), t = R.byId('territories');
        return [ids.indexOf('accounts') >= 0, ids.indexOf('territories') >= 0, ids.indexOf('salesUnits') >= 0, ids.indexOf('salesUnits.gp') >= 0, ids.indexOf('salesUnits.channelSettings') >= 0,
          [a.visible, a.perm], [t.visible, t.perm], R.byId('salesUnits').visible];
      }
    },
    {
      name: 'cr32-10. Migration สิทธิ์ที่บันทึกไว้: salesUnits = ระดับสูงสุดของ accounts / territories เดิม (แก้ไข > ดู > ไม่เห็น) · สิทธิ์ย่อย GP / ตั้งค่า Channel ย้ายค่าเดิม · ลบ Key เดิม',
      expected: [['EDIT', 'VIEW', 'VIEW', 'NONE'], ['VIEW', 'EDIT'], false, false],
      actual: function () {
        var P = SP.core.permissions;
        var old = {
          director: { accounts: { level: 'VIEW', scope: 'ALL' }, territories: { level: 'EDIT', scope: 'ALL' }, 'accounts.gp': { level: 'VIEW', scope: 'ALL' }, 'accounts.channelSettings': { level: 'EDIT', scope: 'ALL' } },
          manager: { accounts: { level: 'VIEW', scope: 'ALL' }, territories: { level: 'NONE', scope: 'ALL' } },
          officer: { territories: { level: 'VIEW', scope: 'ALL' } },
          viewer: { accounts: { level: 'NONE', scope: 'ALL' }, territories: { level: 'NONE', scope: 'ALL' } }
        };
        var m = P.migratePerms(old).perms;
        return [['director', 'manager', 'officer', 'viewer'].map(function (r) { return m[r].salesUnits.level; }),
          [m.director['salesUnits.gp'].level, m.director['salesUnits.channelSettings'].level], 'accounts' in m.director, 'territories' in m.officer];
      }
    },
    {
      name: 'cr32-11. ค่าตั้งต้นของ salesUnits = สูงสุดของ 2 หน้าเดิม: Sales Director แก้ไข · Sales Manager ดู · Sales Officer ดู · ผู้ดูแลระบบแก้ไข · บทบาทอื่นไม่เห็น · GP แก้ได้เฉพาะ Director / ผู้ดูแลระบบ',
      expected: [['NONE', 'EDIT', 'VIEW', 'VIEW', 'NONE', 'NONE', 'NONE', 'EDIT'], ['NONE', 'EDIT', 'VIEW', 'NONE', 'NONE', 'NONE', 'NONE', 'EDIT']],
      actual: function () {
        var P = SP.core.permissions;
        var roles = ['management', 'director', 'manager', 'officer', 'product', 'supply', 'viewer', 'admin'];
        function u(r) { return { id: null, name: '', salesPersonId: null, roleIds: [r], active: true }; }
        return [roles.map(function (r) { return P.level(u(r), 'salesUnits'); }), roles.map(function (r) { return P.level(u(r), 'salesUnits.gp'); })];
      }
    },
    {
      name: 'cr32-12. ย้ายคู่ค้าทุก Channel ด้วยกลไกช่วงเดือนเดิม: สาขา Beautrium → EVEANDBOY ตั้งแต่ ต.ค. 2026 (ช่วงเดิมปิด ก.ย.) · ย้ายไปต่าง Channel ไม่ยอมรับ · เดือนที่ผ่านแล้วไม่ยอมรับ · ร้าน TT ใช้ storeAssignments + move เดิม',
      expected: [true, ['beautrium', 'eveandboy'], 'channel', 'past', [true, true]],
      actual: function () {
        var U = SP.core.units, d = SP.data;
        var r = U.moveCustomers(d, ['3107'], 'eveandboy', '2026-10', { current: '2026-09' });
        var d2 = {}; Object.keys(d).forEach(function (k) { d2[k] = d[k]; }); d2.customerAssignments = r.customerAssignments;
        var tt = U.moveCustomers(d, ['1889'], 'TT-01', '2026-10', { current: '2026-09', at: '2026-09-01T00:00:00Z', by: 'test' });
        return [r.ok, [U.unitOf(d2, '3107', '2026-09'), U.unitOf(d2, '3107', '2026-10')], U.moveCustomers(d, ['3107'], 'shopee', '2026-10', {}).error,
          U.moveCustomers(d, ['3107'], 'eveandboy', '2026-08', { current: '2026-09' }).error, [tt.ok && tt.storeAssignments !== d.storeAssignments, !!(tt.move && tt.move.storeIds.indexOf('1889') >= 0)]];
      }
    },
    {
      name: 'cr32-13. ข้อมูลที่ต้องตรวจของ Account Master ณ ก.ย. 2026: ยังไม่จัดสรร (TT + สาขาทดสอบ 3) · ไม่มีผู้รับผิดชอบ = MR.DIY · คำนำหน้าชี้หน่วยอื่น (หลังย้ายสาขา) · เกณฑ์เดิมของเขต (CR-35 ไม่มีเกณฑ์ System ID ซ้ำ) · หน่วยขายไม่มีคู่ค้า',
      expected: [[3, ['mrdiy'], 0, 13, false, 0], true, [['3108', 'beautrium']], ['konvy']],
      actual: function () {
        var U = SP.core.units, M = SP.core.master, d = SP.data;
        function g(k, key) { return k.groups.filter(function (x) { return x.key === key; })[0].items; }
        var k = U.checks(d, '2026-09');
        var tt = M.territoryChecks(d, '2026-09');
        var ttUn = g(k, 'unassigned').filter(function (x) { return x.channelId === 'tt'; }).length;
        var moved = U.moveCustomers(d, ['3108'], 'eveandboy', '2026-09', {});
        var d2 = {}; Object.keys(d).forEach(function (x) { d2[x] = d[x]; }); d2.customerAssignments = moved.customerAssignments;
        var none = U.moveCustomers(d, ['90013', '90014', '90015', '90016'], null, '2026-09', {});
        var d3 = {}; Object.keys(d).forEach(function (x) { d3[x] = d[x]; }); d3.customerAssignments = none.customerAssignments;
        return [[g(k, 'unassigned').filter(function (x) { return x.channelId === 'mt'; }).length, g(k, 'noOwner').map(function (x) { return x.id; }), g(k, 'prefix').length,
          g(k, 'noProvince').length, k.groups.some(function (x) { return x.key === 'duplicate'; }), g(k, 'noCustomers').length], ttUn === tt.unassigned.length,
          g(U.checks(d2, '2026-09'), 'prefix').map(function (x) { return [x.id, x.suggested]; }), g(U.checks(d3, '2026-09'), 'noCustomers').map(function (x) { return x.id; })];
      }
    },
    {
      name: 'cr32-14. dataCheck: มีรายการ = Chip เหลือง ข้อมูลที่ต้องตรวจ (n) · ไม่มี = เทา ข้อมูลครบ · Popover จัดกลุ่ม <เกณฑ์> (n) + ปุ่ม ไปที่รายการ · ท้าย = เกณฑ์ที่ตรวจ (แสดงแม้ n = 0)',
      expected: ['ข้อมูลที่ต้องตรวจ (3)', true, 'ข้อมูลครบ', false],
      actual: function () {
        var C = SP.core.components;
        var a = C.dataCheck({ title: 'x', groups: [{ key: 'a', label: 'ก', items: [{ text: '1', go: function () {} }, { text: '2', go: function () {} }] }, { key: 'b', label: 'ข', items: [{ text: '3', go: function () {} }] }], criteria: ['ก', 'ข'] });
        var b = C.dataCheck({ title: 'x', groups: [], criteria: ['ก', 'ข'] });
        return [a.textContent, a.classList.contains('has-issues'), b.textContent, b.classList.contains('has-issues') || typeof document === 'undefined'];
      }
    },
    {
      name: 'cr32-15. ผูกผู้ใช้กับบุคลากร 1:1 (person.userId): ผูกได้ · ผู้ใช้ที่ผูกคนอื่นแล้ว → taken · บุคลากรประเภททีมผูกไม่ได้ → team · ยกเลิกการผูกได้ · ผู้ใช้ไม่มี salesPersonId แล้ว',
      expected: [['sp-pim', 'u-sp-pim'], true, 'taken', 'team', [true, null], 0],
      actual: function () {
        var P = SP.core.permissions, people = SP.data.salespeople;
        var free = JSON.parse(JSON.stringify(people)).map(function (p) { if (p.id === 'sp-ton') p.userId = null; return p; });
        var r1 = P.linkUser(free, 'sp-ton', 'u-sp-ton');
        var off = P.linkUser(people, 'sp-pim', null);
        return [[P.personOfUser(people, 'u-sp-pim'), P.userOfPerson(people, 'sp-pim')], r1.ok && P.personOfUser(r1.people, 'u-sp-ton') === 'sp-ton',
          P.linkUser(people, 'sp-ton', 'u-sp-pim').error, P.linkUser(people, 'sp-kam', 'u-viewer').error, [off.ok, P.personOfUser(off.people, 'u-sp-pim')],
          SP.data.users.filter(function (u) { return 'salesPersonId' in u; }).length];
      }
    },
    {
      name: 'cr32-16. สิทธิ์ของผู้ใช้ตัวอย่างทุกคน (18) เหมือนก่อน CR: อ่านทีมผ่าน person.userId ได้ผลเท่ากับการผูกแบบเดิม (salesPersonId) ทุกช่องและทุก Channel ของแผน SKU',
      expected: [18, 0, 12],
      actual: function () {
        var P = SP.core.permissions, D = SP.data;
        var legacy = {};
        Object.keys(D.personUsers).forEach(function (pid) { legacy[D.personUsers[pid]] = pid; });
        var ctx = { month: '2027-03' };
        function sig(u) {
          var n = P.normalize(u, ctx);
          return [n.personId, n.channelId, P.effectiveRows(u, ctx).map(function (r) { return r.res.id + r.level + r.scope; }).join(),
            D.channels.map(function (ch) { return P.can(n, 'edit', { module: 'skuPlan', channelId: ch.id }, ctx) ? 1 : 0; }).join()].join('|');
        }
        var diff = D.users.filter(function (u) {
          var old = JSON.parse(JSON.stringify(u)); old.salesPersonId = legacy[u.id] || null;
          return sig(u) !== sig(old);
        }).length;
        return [D.users.length, diff, D.users.filter(function (u) { return P.normalize(u, ctx).personId; }).length];
      }
    },
    {
      name: 'cr32-17. ข้อมูลที่ต้องตรวจของ Sales Person Management (ก.ย. 2026 – สุดแผน ธ.ค. 2027): MR.DIY ไม่มีผู้รับผิดชอบ (เกณฑ์เดียวกับ Account Master) · ผู้รับผิดชอบจะสิ้นสุดแต่ไม่มีคนรับช่วง (ไม่นับซ้ำข้อ 1) · Sales Officer ไม่ได้ดูแลหน่วยใด · สิ้นสุดแล้วแต่บัญชียังใช้งาน',
      expected: [[['mrdiy'], [], [], []], true, [[], ['eveandboy'], [], []], [['mrdiy'], [], ['sp-new'], ['SP-TT-05']]],
      actual: function () {
        var U = SP.core.units, D = SP.data;
        function keys(k) { return k.groups.map(function (g) { return g.items.map(function (x) { return x.id; }).filter(function (id) { return id === 'mrdiy' || id === 'eveandboy' || id === 'sp-new' || id === 'SP-TT-05'; }); }); }
        var base = U.personChecks(D, '2026-09', '2027-12');
        var suc = U.checks(D, '2026-09').groups.filter(function (g) { return g.key === 'noOwner'; })[0].items.map(function (x) { return x.id; });
        var d2 = {}; Object.keys(D).forEach(function (k) { d2[k] = D[k]; });
        d2.assignments = D.assignments.filter(function (a) { return !(a.unitId === 'eveandboy' && a.salesPersonId === 'sp-pim'); }).concat([{ unitId: 'mrdiy', salesPersonId: 'sp-kam', fromMonth: '2026-01', toMonth: null }]);
        var d3 = {}; Object.keys(D).forEach(function (k) { d3[k] = D[k]; });
        d3.salespeople = D.salespeople.concat([{ id: 'sp-new', name: 'ทดสอบ', channelId: 'mt', startMonth: '2026-09', endMonth: null, userId: null }]);
        d3.teams = JSON.parse(JSON.stringify(D.teams)); d3.teams.filter(function (t) { return t.channelId === 'mt'; })[0].members.push({ salesPersonId: 'sp-new', role: 'OFFICER', fromMonth: '2026-09', toMonth: null });
        d3.users = D.users.map(function (u) { var c = JSON.parse(JSON.stringify(u)); if (c.id === 'u-tt-05') c.active = true; return c; });
        return [keys(base), suc.indexOf('mrdiy') >= 0, keys(U.personChecks(d2, '2026-09', '2027-12')), keys(U.personChecks(d3, '2026-09', '2027-12'))];
      }
    },
    {
      name: 'cr32-18. บัญชีผู้ใช้ใหม่จากหน้า Sales Person Management: บทบาทตั้งต้นตามบทบาทในทีม (Sales Manager → manager · Sales Officer → officer · ไม่มีทีม = ไม่มี)',
      expected: [['manager'], ['officer'], ['officer'], []],
      actual: function () {
        var P = SP.core.permissions, T = SP.data.teams;
        return [P.defaultRolesFor(T, 'sp-anan', '2026-09'), P.defaultRolesFor(T, 'sp-pim', '2026-09'), P.defaultRolesFor(T, 'SP-TT-01', '2026-09'), P.defaultRolesFor(T, 'sp-kam', '2026-09')];
      }
    },
    {
      name: 'cr32-19. หน้า Sales Person Management: ชื่อใหม่ · ไม่มีคำอธิบายใต้หัวข้อ · สถานะค่าเริ่มต้น ใช้งาน (ตัวเลือกแรก) · ข้อความไม่มี Emoji',
      expected: ['Sales Person Management', false, 'active', false],
      actual: function () {
        var p = SP.data.content.pages.people;
        return [SP.core.registry.byId('people').title, 'lead' in p, Object.keys(p.statusOptions)[0], /[\u{1F300}-\u{1FAFF}]/u.test(JSON.stringify(p))];
      }
    },
    {
      name: 'cr32-20. การแทนที่ (4.4): Q จบภายในช่วงที่เลือก → ไม่ถาม · Q ไม่กำหนดเดือนสุดท้าย (null) → ถาม · แทนที่ถึงสุดแผน ธ.ค. 2027 · หลังจากนั้นของ Q = ก.ค. – ธ.ค. 2027',
      expected: [false, false, [true, 'sp-pim', '2027-12', '2027-07', '2027-12']],
      actual: function () {
        var c = SP.core.calc;
        var A = [{ unitId: 'A', salesPersonId: 'Q', fromMonth: '2027-01', toMonth: '2027-05' }];
        var B = [{ unitId: 'A', salesPersonId: 'Q', fromMonth: '2027-01', toMonth: '2027-06' }];
        var r = c.ownerReplace(SP.data.assignments, 'eveandboy', 'sp-anan', '2027-06', '2027-06', '2027-12');
        return [c.ownerReplace(A, 'A', 'P', '2027-03', '2027-06', '2027-12').ask, c.ownerReplace(B, 'A', 'P', '2027-03', '2027-06', '2027-12').ask,
          [r.ask, r.current, r.replaceEnd, r.after.from, r.after.to]];
      }
    },
    {
      name: 'cr32-21. แทนที่ช่วงที่เหลือ: Q มีเดือนสุดท้ายก่อนสุดแผนและมีคนต่อคิว → P ถึงเดือนสุดท้ายเดิมของ Q ไม่ทับคนถัดไป · ข้ามปีตามข้อมูลจริง · เฉพาะช่วงที่เลือก = แบ่ง Q ก่อนและหลังเหมือนเดิม',
      expected: [['2027-09', 'Q:2027-01-2027-02|P:2027-03-2027-09|R:2027-10-'], ['2027-06', 'Q:2026-10-2026-10|P:2026-11-2027-06'], 'Q:2027-01-2027-02|P:2027-03-2027-04|Q:2027-05-2027-09|R:2027-10-'],
      actual: function () {
        var c = SP.core.calc;
        function txt(list) { return c.unitAssignments(list, 'A').map(function (a) { return a.salesPersonId + ':' + a.fromMonth + '-' + (a.toMonth || ''); }).join('|'); }
        var L = [{ unitId: 'A', salesPersonId: 'Q', fromMonth: '2027-01', toMonth: '2027-09' }, { unitId: 'A', salesPersonId: 'R', fromMonth: '2027-10', toMonth: null }];
        var r = c.ownerReplace(L, 'A', 'P', '2027-03', '2027-04', '2027-12');
        var X = [{ unitId: 'A', salesPersonId: 'Q', fromMonth: '2026-10', toMonth: '2027-06' }];
        var r2 = c.ownerReplace(X, 'A', 'P', '2026-11', '2026-12', '2027-12');
        return [[r.replaceEnd, txt(c.setOwner(L, 'A', 'P', '2027-03', r.replaceEnd, null).list)], [r2.replaceEnd, txt(c.setOwner(X, 'A', 'P', '2026-11', r2.replaceEnd, null).list)],
          txt(c.setOwner(L, 'A', 'P', '2027-03', '2027-04', null).list)];
      }
    },
    {
      name: 'cr32-22. ติ๊ก สิ้นสุดในหน่วยขายอื่นด้วย: พิมพ์ลดาสิ้นสุด พ.ค. 2027 → Watsons ไม่มีผู้รับผิดชอบตั้งแต่ มิ.ย. (ไม่ใส่อนันต์ให้อัตโนมัติ) · ขึ้นในข้อมูลที่ต้องตรวจทันที (ผู้รับผิดชอบจะสิ้นสุดแต่ไม่มีคนรับช่วง)',
      expected: [null, 'sp-anan', '2027-05', ['watsons']],
      actual: function () {
        var c = SP.core.calc, M = SP.core.master, U = SP.core.units, D = SP.data;
        var plan = c.ownerReplace(D.assignments, 'eveandboy', 'sp-anan', '2027-06', '2027-06', '2027-12');
        var list = c.setOwner(D.assignments, 'eveandboy', 'sp-anan', '2027-06', plan.replaceEnd, '2026-09').list;
        var st = { people: D.salespeople, teams: D.teams, assignments: list };
        var hand = {};
        M.endPreview(st, 'sp-pim', '2027-05').forEach(function (x) { hand[x.unitId] = null; });
        var res = M.endResponsibility(st, 'sp-pim', '2027-05', hand, '2026-09');
        var d = {}; Object.keys(D).forEach(function (k) { d[k] = D[k]; });
        d.salespeople = res.state.people; d.teams = res.state.teams; d.assignments = res.state.assignments;
        var k = U.personChecks(d, '2026-09', '2027-12');
        return [c.ownerOf(d.assignments, d.salespeople, 'watsons', '2027-06'), c.ownerOf(d.assignments, d.salespeople, 'eveandboy', '2027-06'),
          c.findById(d.salespeople, 'sp-pim').endMonth, k.groups.filter(function (g) { return g.key === 'handover'; })[0].items.map(function (x) { return x.id; })];
      }
    },
    {
      name: 'cr32-23. personMonthlyLoad: ผลรวมแถวบุคคล + ไม่มีผู้รับผิดชอบ = ยอด Channel ทุกเดือนทุก Channel · MR.DIY อยู่ในแถวไม่มีผู้รับผิดชอบ · แถวลูกมีค่าเฉพาะเดือนที่รับผิดชอบ',
      expected: [0, true, [null, null, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]],
      actual: function () {
        var c = SP.core.calc, D = SP.data;
        var values = {};
        c.allUnits(D).forEach(function (u, i) { values[u.id] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (m) { return (i + 1) * 1000 + m; }); });
        var load = c.personMonthlyLoad(D, 2027, values);
        var bad = 0;
        load.channels.forEach(function (g) {
          for (var m = 0; m < 12; m++) {
            var s = g.vacant.months[m] + g.people.reduce(function (t, p) { return t + p.months[m]; }, 0);
            if (Math.abs(s - g.total[m]) > 1e-6) bad++;
          }
        });
        var mt = load.channels.filter(function (g) { return g.channelId === 'mt'; })[0];
        var pim = mt.people.filter(function (p) { return p.personId === 'sp-pim'; })[0];
        var eve = pim.units.filter(function (u) { return u.unitId === 'eveandboy'; })[0];
        return [bad, mt.vacant.units.some(function (u) { return u.unitId === 'mrdiy'; }), eve.months.map(function (v) { return v == null ? null : 1; })];
      }
    },
    {
      name: 'cr32-24. UAT S10: เปลี่ยนผู้รับผิดชอบ EVEANDBOY เป็นอนันต์ตั้งแต่ มิ.ย. 2027 แบบแทนที่ช่วงที่เหลือ → อนันต์ มิ.ย.–ธ.ค. 2027 · ข้อมูลที่ต้องตรวจไม่เพิ่ม · มุมมองตามบุคคลของอนันต์มีเป้า EVEANDBOY ตั้งแต่ มิ.ย.',
      expected: [['sp-pim', 'sp-anan', 'sp-anan'], 1, [null, null, null, null, null, 1, 1, 1, 1, 1, 1, 1]],   // CR-36 ตัดสถานการณ์ S10 (UAT) ออกจากคู่มือ
      actual: function () {
        var c = SP.core.calc, U = SP.core.units, D = SP.data;
        var plan = c.ownerReplace(D.assignments, 'eveandboy', 'sp-anan', '2027-06', '2027-06', SP.core.clock.horizonEnd());
        var list = c.setOwner(D.assignments, 'eveandboy', 'sp-anan', '2027-06', plan.replaceEnd, '2026-09').list;
        var d = {}; Object.keys(D).forEach(function (k) { d[k] = D[k]; }); d.assignments = list;
        var values = {}; c.allUnits(D).forEach(function (u) { values[u.id] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]; });
        var mt = c.personMonthlyLoad(d, 2027, values).channels.filter(function (g) { return g.channelId === 'mt'; })[0];
        var anan = mt.people.filter(function (p) { return p.personId === 'sp-anan'; })[0];
        var eve = anan.units.filter(function (u) { return u.unitId === 'eveandboy'; })[0];
        return [['2027-05', '2027-06', '2027-12'].map(function (k) { return c.ownerOf(list, D.salespeople, 'eveandboy', k); }), U.personChecks(d, '2026-09', '2027-12').total,
          eve.months.map(function (v) { return v == null ? null : 1; })];
      }
    }
  ];
})();
