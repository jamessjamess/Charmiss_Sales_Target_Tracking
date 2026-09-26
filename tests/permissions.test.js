/*
 * tests/permissions.test.js — Test ของ core/permissions.js · CR-19 (ทีมขาย สิทธิ์) + CR-21 (สิทธิ์เป็นข้อมูลที่แก้ได้ · ผู้ใช้หลายบทบาท) · ไม่ใช้ DOM
 *
 * รันด้วย Node: node tests/run.js permissions / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   pm-1..11 = Test ของ CR-19 (ปรับตามโครงสิทธิ์ CR-21 และ resource ของ CR-23) / cr21-1..9 = Test ตาม CR-21 ข้อ 7 /
 *   cr25-1..9 = Test ตาม CR-25 ข้อ 5 (เมนูตามบทบาท · หน้าเริ่มต้น · เลขขั้นคงที่ · ค่าตั้งต้นใหม่) — Toast / หน้าไม่มีสิทธิ์ส่วน DOM ตรวจในเบราว์เซอร์
 * ทุก Test ส่งข้อมูลให้ครบใน context (roles · perms · users · teams · month · list) — store: ไม่อ่าน ไม่เขียน
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function P() { return SP.core.permissions; }
  function calc() { return SP.core.calc; }
  var NOW = '2027-03';   // เดือนปัจจุบันจำลองตั้งต้น (DEMO_FORECAST_MONTH = มี.ค. ของปีแผน 2027)
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  // context ตั้งต้น (ค่าใน data/) + ค่าที่ต้องการแทน
  function ctx(extra) {
    var o = { roles: SP.data.roles, perms: P().defaultPerms(), users: SP.data.users, teams: SP.data.teams, month: NOW, list: SP.core.registry.list };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }
  function channelOf(unitId) { var i = calc().unitInfo(SP.data, unitId); return i && i.channel ? i.channel.id : null; }
  function role(type, personId, channelId) { return { type: type, personId: personId || null, channelId: channelId || null }; }
  function can(u, res, extra) { return P().can(u, res, ctx(extra)); }

  // สำเนาตาราง CR-19 ข้อ 3 (แยกจากข้อมูลใน data/permissions.js เพื่อให้ Test จับได้เมื่อค่าตั้งต้นเปลี่ยน) — true = แก้ไข · false = ดู · 'team' = แก้ไขเฉพาะ Channel ในทีม
  //   CR-23: annualTarget แทน topdown.channel · unitTargets แทน topdown.unit + phasing
  var TABLE = {
    annualTarget:        { management: true,  director: false, sales: false,  product: false, supply: false },
    unitTargets:         { management: false, director: true,  sales: false,  product: false, supply: false },
    skuPlan:             { management: false, director: false, sales: 'team', product: false, supply: false },
    summary:             { management: false, director: false, sales: false,  product: false, supply: false },
    productList:         { management: false, director: false, sales: false,  product: true,  supply: false },
    npdPlan:             { management: false, director: false, sales: false,  product: true,  supply: false },
    promotionPrice:      { management: false, director: false, sales: false,  product: true,  supply: false },
    listing:             { management: false, director: false, sales: false,  product: true,  supply: false },
    taxonomy:            { management: false, director: false, sales: false,  product: true,  supply: false },
    'listing.clearance': { management: false, director: false, sales: false,  product: false, supply: true },
    accounts:            { management: false, director: true,  sales: false,  product: false, supply: false },
    territories:         { management: false, director: true,  sales: false,  product: false, supply: false },
    salespeople:         { management: false, director: true,  sales: false,  product: false, supply: false },
    salesTeam:           { management: false, director: true,  sales: false,  product: false, supply: false }
  };

  SP.tests.permissions = [
    {
      name: 'pm-1. Management แก้ Annual Target ได้ · แก้ Sub-channel Allocation ไม่ได้ (ชื่อเดิม topdown.channel / phasing แปลงเป็น resource ใหม่)',
      expected: [true, false, true, false],
      actual: function () {
        var u = role('management');
        return [can(u, 'annualTarget'), can(u, 'unitTargets'), can(u, 'topdown.channel'), can(u, 'phasing')];
      }
    },
    {
      name: 'pm-2. Sales Director แก้ Sub-channel Allocation ได้ · แก้ Annual Target ไม่ได้ · แก้แผน SKU ไม่ได้ (7-Eleven, TT เขต 1)',
      expected: [true, true, false, false, false],
      actual: function () {
        var u = role('director');
        return [can(u, 'unitTargets'), can(u, 'topdown.unit'), can(u, 'annualTarget'),
          can(u, 'skuPlan', { channelId: channelOf('seven') }), can(u, 'skuPlan', { channelId: channelOf('TT-01') })];
      }
    },
    {
      name: 'pm-3. Sales Officer ทีม MT (พิมพ์ลดา) แก้แผน SKU ของ 7-Eleven ได้ · ของ Shopee ไม่ได้',
      expected: ['mt', 'ecom', true, false],
      actual: function () {
        var u = role('officer', 'sp-pim', 'mt');
        return [channelOf('seven'), channelOf('shopee'), can(u, 'skuPlan', { channelId: channelOf('seven') }), can(u, 'skuPlan', { channelId: channelOf('shopee') })];
      }
    },
    {
      name: 'pm-4. กฤษดา (Officer TT) แก้แผน SKU ของ TT เขต 1 ได้ แม้ผู้รับผิดชอบเขตนั้นคือสิริกาญจน์ (สิทธิ์มาจากทีม ไม่ใช่ผู้รับผิดชอบ)',
      expected: ['SP-TT-01', true, true],
      actual: function () {
        var owner = calc().ownerOf(SP.data.assignments, SP.data.salespeople, 'TT-01', NOW);
        return [owner, can(role('officer', 'SP-TT-04', 'tt'), 'skuPlan', { channelId: channelOf('TT-01') }), can(role('officer', 'SP-TT-01', 'tt'), 'skuPlan', { channelId: 'tt' })];
      }
    },
    {
      name: 'pm-5. อัมพร (Officer TT ถึง ก.ค. 2026) → ก.ย. 2026 แก้ไม่ได้ · ถ้ายังเปิดใช้งาน ก.ค. 2026 แก้ได้ (สมาชิกทีมตามช่วงเดือน) · ผู้ใช้ที่ปิดใช้งาน = ไม่มีสิทธิ์',
      expected: [false, true, false, 'NONE'],
      actual: function () {
        var active = { id: 'x', name: 'อัมพร', salesPersonId: 'SP-TT-05', roleIds: ['officer'], active: true };
        return [can(active, 'skuPlan', { channelId: 'tt', month: '2026-09' }), can(active, 'skuPlan', { channelId: 'tt', month: '2026-07' }),
          can(role('officer', 'SP-TT-05', 'tt'), 'skuPlan', { channelId: 'tt', month: '2026-07' }), P().pageLevel(role('officer', 'SP-TT-05', 'tt'), 'summary', ctx())];
      }
    },
    {
      name: 'pm-6. ทีม Product แก้ราคาขายต่อ Account ได้ · แก้ Clearance ไม่ได้ · Supply Chain กลับกัน (หน้า Listing แก้ได้ทั้งคู่คนละส่วน)',
      expected: [['promotionPrice'], true, false, false, true, ['listing', 'listing.clearance'], true, true],
      actual: function () {
        var pr = role('product'), sc = role('supply');
        var mods = P().pageModules('promotionPrice', ctx());
        var lst = P().pageModules('productMaster', ctx());
        return [mods, P().canAny(pr, mods, ctx()), can(pr, 'listing.clearance'), P().canAny(sc, mods, ctx()), can(sc, 'listing.clearance'),
          lst, P().canAny(pr, lst, ctx()), P().canAny(sc, lst, ctx())];
      }
    },
    {
      name: 'pm-8. แปลงบทบาทรุ่นก่อน: Sales Person อนันต์ → ผู้ใช้ Sales Manager · MT / กฤษดา → Sales Officer · TT / Trade Marketing → ทีม Product / ไม่รู้จัก → ค่าตั้งต้น / userId',
      expected: [['u-sp-anan', 'manager', 'mt'], ['u-tt-04', 'officer', 'tt'], 'product', 'director', ['u-sp-mild', 'officer', 'ecom'], 'u-admin'],
      actual: function () {
        var n = function (r) { return P().normalize(r, ctx()); };
        var a = n({ type: 'sales', personId: 'sp-anan' }), b = n({ type: 'sales', personId: 'SP-TT-04' }), c = n({ type: 'officer', personId: 'sp-mild' });
        return [[a.id, a.type, a.channelId], [b.id, b.type, b.channelId], n({ type: 'trade' }).type, n({ type: 'xyz' }).type, [c.id, c.type, c.channelId], n({ userId: 'u-admin' }).id];
      }
    },
    {
      name: 'pm-9. แก้ทีม: เริ่มย้อนหลังไม่ได้ · ซ้อนช่วงไม่ได้ · สิ้นสุดที่เดือนก่อนหน้า = ไม่มีสิทธิ์ตั้งแต่เดือนนี้ · สิ้นสุดย้อนหลังเกินไม่ได้ · นำออกได้เฉพาะที่ยังไม่เริ่ม',
      expected: ['past', 'overlap', true, [true, false], 'past', 'started', [true, false], 3],
      actual: function () {
        var T = SP.data.teams;
        var add = function (m) { return P().addMember(T, 'mt', m, NOW); };
        var past = add({ salesPersonId: 'sp-ton', role: 'OFFICER', fromMonth: '2027-02' }).error;
        var overlap = add({ salesPersonId: 'sp-pim', role: 'MANAGER', fromMonth: '2027-05' }).error;
        var ok = add({ salesPersonId: 'sp-ton', role: 'OFFICER', fromMonth: '2027-04' });
        var ended = P().endMember(T, 'mt', { salesPersonId: 'sp-pim', fromMonth: '2026-01' }, '2027-02', NOW);
        var tooEarly = P().endMember(T, 'mt', { salesPersonId: 'sp-pim', fromMonth: '2026-01' }, '2027-01', NOW).error;
        var started = P().removeMember(T, 'mt', { salesPersonId: 'sp-pim', fromMonth: '2026-01' }, NOW).error;
        var removed = P().removeMember(ok.teams, 'mt', { salesPersonId: 'sp-ton', fromMonth: '2027-04' }, NOW);
        return [past, overlap, ok.ok, [P().isMember(T, 'mt', 'sp-pim', NOW), P().isMember(ended.teams, 'mt', 'sp-pim', NOW)], tooEarly, started,
          [removed.ok, P().isMember(removed.teams, 'mt', 'sp-ton', '2027-06')], P().membersOf(T, 'mt').length];
      }
    },
    {
      name: 'pm-10. คนแรกที่มีสิทธิ์ (ปุ่มสลับ): แผน SKU TT = Manager ทีม TT · จัดสรรเป้าหมายประจำปี = Management · Account = Director · ผู้แก้แผน SKU = Manager / Officer (ทีม) + ผู้ดูแลระบบ · Channel ในทีมขึ้นก่อน',
      expected: [{ userId: 'u-sp-pra', type: 'manager', personId: 'sp-pra', channelId: 'tt' }, 'u-mgmt', 'u-director',
        [['manager', true], ['officer', true], ['admin', false]], ['tt', 'mt', 'ecom'], ['mt', 'tt', 'ecom']],
      actual: function () {
        var tree = { children: [{ id: 'mt' }, { id: 'tt' }, { id: 'ecom' }] };
        return [P().firstEditor(['skuPlan'], ctx({ channelId: 'tt' })), P().firstEditor(['annualTarget'], ctx()).userId,
          P().firstEditor(['accounts'], ctx()).userId, P().editors(['skuPlan'], ctx({ channelId: 'tt' })).map(function (e) { return [e.roleId, e.team]; }),
          P().teamFirst(tree, role('officer', 'SP-TT-04', 'tt'), ctx()).children.map(function (x) { return x.id; }),
          P().teamFirst(tree, role('director'), ctx()).children.map(function (x) { return x.id; })];
      }
    },
    {
      name: 'pm-11. ตัวเลือกมุมมองผู้ใช้ (master.users) จัดกลุ่มตามบทบาทแรก: 16 คนที่เปิดใช้งาน · Management · Director · Manager 3 · Officer 7 · Product · Supply · ผู้ดูรายงาน · ผู้ดูแลระบบ · ผู้ใช้ปัจจุบันที่ปิดใช้งานยังแสดง',
      expected: [16, ['management', 'director'], 3, 7, ['product', 'supply', 'viewer', 'admin'], false, true, 'Sales Officer'],
      actual: function () {
        var list = P().directory(ctx(), null);
        var withCurrent = P().directory(ctx(), { userId: 'u-sp-wit' });
        return [list.length, list.slice(0, 2).map(function (u) { return u.type; }), list.filter(function (u) { return u.type === 'manager'; }).length,
          list.filter(function (u) { return u.type === 'officer'; }).length, list.slice(-4).map(function (u) { return u.type; }),
          list.some(function (u) { return u.userId === 'u-sp-wit'; }), withCurrent.some(function (u) { return u.userId === 'u-sp-wit'; }),
          list.filter(function (u) { return u.userId === 'u-tt-04'; })[0].group];
      }
    },
    // ---------------- CR-21 ข้อ 7 ----------------
    {
      name: 'cr21-1. สิทธิ์แก้ไขตั้งต้นทุกบทบาท × ทุก resource ตรงกับตาราง CR-19 ข้อ 3 (+ ผู้ดูรายงานแก้ไม่ได้ · ผู้ดูแลระบบแก้ได้ทุกรายการยกเว้น Plan Summary (CR-25) · Role Management เห็นเฉพาะผู้ดูแลระบบ · CR-25: หน้าที่เห็นตรวจที่ cr25-*)',
      expected: [[], [], ['summary'], [false, false, false, false, false, false, false, true], true],
      actual: function () {
        var mismatch = [];
        var users = { management: role('management'), director: role('director'), product: role('product'), supply: role('supply') };
        var sales = [role('manager', 'sp-anan', 'mt'), role('officer', 'sp-pim', 'mt')];
        Object.keys(TABLE).forEach(function (m) {
          Object.keys(users).forEach(function (r) {
            [null, 'mt', 'tt'].forEach(function (ch) {
              var got = can(users[r], m, { channelId: ch });
              if (got !== TABLE[m][r]) mismatch.push(m + ' · ' + r + ' · ' + ch + ' → ' + got);
            });
          });
          sales.forEach(function (u) {
            var inTeam = can(u, m, { channelId: 'mt' }), outTeam = can(u, m, { channelId: 'tt' });
            var want = TABLE[m].sales === 'team';
            if (inTeam !== want || outTeam !== false) mismatch.push(m + ' · ' + u.type + ' → ' + inTeam + ' / ' + outTeam);
          });
        });
        var viewerEdits = Object.keys(TABLE).filter(function (m) { return can(role('viewer'), m, { channelId: 'mt' }); });
        var adminMissing = P().resources(SP.core.registry.list).filter(function (r) { return !can(role('admin'), r.id, { channelId: 'tt' }); }).map(function (r) { return r.id; });
        var rm = ['management', 'director', 'manager', 'officer', 'product', 'supply', 'viewer', 'admin'].map(function (r) { return P().pageVisible(role(r), 'roleManagement', ctx()); });
        return [mismatch, viewerEdits, adminMissing, rm, can(role('viewer'), 'export')];
      }
    },
    {
      name: 'cr21-2. ผู้ใช้ 2 บทบาท: ผู้ดูรายงาน (VIEW) + ทีม Product (EDIT) หน้าเดียวกัน → EDIT · Sales Officer (TEAM) + บทบาทที่แก้แผน SKU ทุก Channel (ALL) → ALL (แก้ Shopee ได้แม้ไม่ใช่ทีม)',
      expected: ['EDIT', ['product'], 'TEAM', 'ALL', false, true],
      actual: function () {
        var c = ctx();
        var two = { id: 'x', name: 'x', salesPersonId: null, roleIds: ['viewer', 'product'], active: true };
        var add = P().addRole({ roles: c.roles, perms: c.perms, users: c.users }, 'แผน SKU ทุก Channel', '', null, c.list);
        var perms = P().setCell(add.perms, add.id, 'skuPlan', { level: 'EDIT', scope: 'ALL' });
        var c2 = ctx({ roles: add.roles, perms: perms });
        var one = { id: 'y', name: 'y', salesPersonId: 'sp-pim', roleIds: ['officer'], active: true };
        var both = { id: 'z', name: 'z', salesPersonId: 'sp-pim', roleIds: ['officer', add.id], active: true };
        return [P().access(two, 'productList', c).level, P().access(two, 'productList', c).from, P().access(one, 'skuPlan', c2).scope, P().access(both, 'skuPlan', c2).scope,
          P().can(one, 'skuPlan', ctx({ roles: add.roles, perms: perms, channelId: 'ecom' })), P().can(both, 'skuPlan', ctx({ roles: add.roles, perms: perms, channelId: 'ecom' }))];
      }
    },
    {
      name: 'cr21-3. ตั้งหน้าแผน NPD ของทีม Product เป็น NONE → เมนู (visibleEntries) ไม่แสดงหน้านี้สำหรับทีม Product · บทบาทอื่นยังเห็น · ค่าตั้งต้นทีม Product เห็น',
      expected: [false, true, true, false],
      actual: function () {
        var perms = P().setCell(P().defaultPerms(), 'product', 'npdPlan', { level: 'NONE' });
        var ids = function (u, p) { return P().visibleEntries(SP.core.registry.list, u, ctx({ perms: p })).map(function (e) { return e.id; }); };
        return [ids(role('product'), perms).indexOf('npdPlan') >= 0, ids(role('director'), perms).indexOf('npdPlan') >= 0,
          ids(role('product'), P().defaultPerms()).indexOf('npdPlan') >= 0, P().pageVisible(role('product'), 'npdPlan', ctx({ perms: perms }))];
      }
    },
    {
      name: 'cr21-4. บันทึกโดยทำให้ไม่มีผู้ใช้ที่แก้หน้าบทบาทและสิทธิ์ได้ → ไม่ยอมรับ (ตั้งผู้ดูแลระบบเป็นดู / ปิดใช้งานผู้ดูแลระบบ) · มีผู้ดูแลคนอื่น = ยอมรับ แต่เตือนเมื่อเอาสิทธิ์ของตัวเองออก',
      expected: [[true, null], [false, 'noAdmin'], [false, 'noAdmin'], [true, true]],
      actual: function () {
        var st = { roles: SP.data.roles, perms: P().defaultPerms(), users: SP.data.users };
        var v = function (s, me) { var r = P().validate(s, me || 'u-admin', SP.core.registry.list); return r; };
        var noEdit = { roles: st.roles, perms: P().setCell(st.perms, 'admin', 'roleManagement', { level: 'VIEW' }), users: st.users };
        var off = { roles: st.roles, perms: st.perms, users: copy(st.users).map(function (u) { if (u.id === 'u-admin') u.active = false; return u; }) };
        var other = { roles: st.roles, perms: st.perms, users: copy(st.users).map(function (u) { if (u.id === 'u-director') u.roleIds = ['director', 'admin']; if (u.id === 'u-admin') u.roleIds = ['viewer']; return u; }) };
        var a = v(st), b = v(noEdit), c = v(off), d = v(other);
        return [[a.ok, a.error], [b.ok, b.error], [c.ok, c.error], [d.ok, d.selfLockout]];
      }
    },
    {
      name: 'cr21-5. สิทธิ์ย่อย: หน้าแผน SKU = ดู และสร้าง NPD = อนุญาต → สร้าง NPD ถูกปรับเป็น NONE พร้อมคำแจ้ง · หน้า Listing = ไม่เห็น → Clearance NONE · หน้า Listing = ดู → Clearance แก้ได้ (ไม่ใช่ปุ่มเฉพาะ)',
      expected: [[['officer', 'skuPlan.createNpd', 'EDIT', 'NONE']], 'NONE', [['supply', 'listing.clearance', 'EDIT', 'NONE']], 0],
      actual: function () {
        var p1 = P().setCell(P().defaultPerms(), 'officer', 'skuPlan', { level: 'VIEW' });
        var r1 = P().enforceRules(p1, SP.data.roles, SP.core.registry.list);
        var p2 = P().setCell(P().defaultPerms(), 'supply', 'listing', { level: 'NONE' });
        var r2 = P().enforceRules(p2, SP.data.roles, SP.core.registry.list);
        var r3 = P().enforceRules(P().defaultPerms(), SP.data.roles, SP.core.registry.list);
        var fmt = function (a) { return [a.roleId, a.resId, a.from.level, a.to.level]; };
        return [r1.adjusted.map(fmt), P().cell(r1.perms, SP.data.roles[3], P().resourceById(SP.core.registry.list, 'skuPlan.createNpd')).level, r2.adjusted.map(fmt), r3.adjusted.length];
      }
    },
    {
      name: 'cr21-6. ลบบทบาทตั้งต้น → ไม่ยอมรับ · ลบบทบาทที่สร้างเองแต่มีผู้ใช้ → ไม่ยอมรับ · บทบาทที่สร้างเองไม่มีผู้ใช้ → ลบได้ · ชื่อซ้ำ / ว่าง ไม่ยอมรับ',
      expected: ['system', 'hasUsers', true, 'duplicate', 'name'],
      actual: function () {
        var st = { roles: SP.data.roles, perms: P().defaultPerms(), users: SP.data.users };
        var add = P().addRole(st, 'ทีม Trade', '', null, SP.core.registry.list);
        var withUser = { roles: add.roles, perms: add.perms, users: st.users.concat([{ id: 'u-x', name: 'x', salesPersonId: null, roleIds: [add.id], active: true }]) };
        return [P().removeRole(st, 'officer').error, P().removeRole(withUser, add.id).error, P().removeRole({ roles: add.roles, perms: add.perms, users: st.users }, add.id).ok,
          P().addRole(st, 'sales officer', '', null).error, P().addRole(st, '  ', '', null).error];
      }
    },
    {
      name: 'cr21-7. คัดลอกสิทธิ์จาก Sales Officer ไปบทบาทใหม่ → เมทริกซ์ของบทบาทใหม่เท่ากับ Sales Officer ทุกรายการ · สร้างเอง (ลบได้)',
      expected: [true, false, true],
      actual: function () {
        var st = { roles: SP.data.roles, perms: P().defaultPerms(), users: SP.data.users };
        var add = P().addRole(st, 'Sales Officer (ชั่วคราว)', 'ทดลอง', 'officer', SP.core.registry.list);
        var off = add.roles.filter(function (r) { return r.id === 'officer'; })[0], nw = add.roles.filter(function (r) { return r.id === add.id; })[0];
        var same = P().resources(SP.core.registry.list).every(function (r) { var a = P().cell(add.perms, off, r), b = P().cell(add.perms, nw, r); return a.level === b.level && a.scope === b.scope; });
        return [same, nw.system, add.ok];
      }
    },
    {
      name: 'cr21-8. คืนค่าตั้งต้น → เมทริกซ์กลับเป็นค่าเริ่มต้นทั้งหมด (ทั้งตาราง) · รายบทบาทคืนเฉพาะบทบาทนั้น',
      expected: [3, 0, 1],
      actual: function () {
        var p = P().defaultPerms();
        p = P().setCell(p, 'management', 'unitTargets', { level: 'EDIT' });
        p = P().setCell(p, 'product', 'npdPlan', { level: 'NONE' });
        p = P().setCell(p, 'viewer', 'export', { level: 'NONE' });
        var all = P().resetMatrix(p);
        var one = P().resetMatrix(p, 'management');
        var d = function (x) { return P().diffCells(P().defaultPerms(), x, SP.data.roles, SP.core.registry.list).length; };
        return [d(p), d(all), d(one) - 1];
      }
    },
    {
      name: 'cr21-9. หน้าใหม่ที่เพิ่มใน registry โดยไม่มีสิทธิ์กำหนด → ทุกบทบาทได้ VIEW · ผู้ดูแลระบบได้ EDIT · อยู่ในรายการสิทธิ์อัตโนมัติ (CR-25 คงกฎนี้ตามที่ผู้ใช้เลือก)',
      expected: [true, ['VIEW', 'VIEW', 'VIEW', 'VIEW', 'VIEW', 'VIEW', 'VIEW', 'EDIT']],
      actual: function () {
        var list = SP.core.registry.list.concat([{ id: 'newReport', title: 'รายงานใหม่', path: 'modules/new-report/index.html', group: 'project-info', tour: null, visible: true }]);
        var inList = P().resources(list).some(function (r) { return r.id === 'newReport'; });
        var lv = ['management', 'director', 'manager', 'officer', 'product', 'supply', 'viewer', 'admin'].map(function (r) {
          return P().level(role(r, r === 'manager' ? 'sp-anan' : r === 'officer' ? 'sp-pim' : null), 'newReport', ctx({ list: list }));
        });
        return [inList, lv];
      }
    },
    // ---------------- CR-25 ข้อ 5 ----------------
    {
      name: 'cr25-1. Sales Officer (พิมพ์ลดา): เมนู Sales Planning ขั้น 2 · 3 · 4 · Product Master 4 หน้า (ไม่มีหมวดสินค้าและ Series) · Account Master เฉพาะเขตการขายและร้านค้า · ไม่มี Role Management',
      expected: [['sales-planning', ['phasing', 'skuPlanning', 'summary']], ['product-master', ['productList', 'npdPlan', 'promotionPrice', 'productMaster']],
        ['account-master', ['territories']], ['project-info', ['aboutPrototype']]],
      actual: function () { return menuIds({ userId: 'u-sp-pim' }); }
    },
    {
      name: 'cr25-2. Management: เมนูมีแค่ Sales Planning และเกี่ยวกับ Prototype (ไม่มีหัวกลุ่ม Product Master · Account Master · Role Management)',
      expected: [['sales-planning', ['topDown', 'phasing', 'skuPlanning', 'summary']], ['project-info', ['aboutPrototype']]],
      actual: function () { return menuIds({ userId: 'u-mgmt' }); }
    },
    {
      name: 'cr25-3. ผู้ดูรายงาน: เห็นแค่ Plan Summary และเกี่ยวกับ Prototype · หน้าเริ่มต้น = Plan Summary',
      expected: [[['sales-planning', ['summary']], ['project-info', ['aboutPrototype']]], 'summary'],
      actual: function () { return [menuIds({ userId: 'u-viewer' }), P().homePage({ userId: 'u-viewer' }, ctx())]; }
    },
    {
      name: 'cr25-4. อยู่หน้า Annual Target แล้วสลับเป็น Sales Officer → ไป SKU Planning + ข้อความ Toast · หน้าที่ยังเห็น (Plan Summary) = อยู่หน้าเดิม · หน้า Test (ไม่อยู่ใน registry) = อยู่ต่อ',
      expected: [{ stay: false, pageId: 'skuPlanning' }, 'สลับเป็น Sales Officer · ไปที่ SKU Planning', { stay: true, pageId: 'summary' }, { stay: true, pageId: null }],
      actual: function () {
        var go = P().switchTarget('topDown', { userId: 'u-sp-pim' }, ctx());
        var role = SP.data.roles.filter(function (r) { return r.id === P().normalize({ userId: 'u-sp-pim' }, ctx()).type; })[0];
        var toast = SP.data.content.site.switchToast.replace('{role}', role.name).replace('{page}', SP.data.content.pages[go.pageId].title);
        return [go, toast, P().switchTarget('summary', { userId: 'u-sp-pim' }, ctx()), P().switchTarget(null, { userId: 'u-sp-pim' }, ctx())];
      }
    },
    {
      name: 'cr25-5. Sales Officer ที่ SKU Planning: ขั้นที่ 3/4 (เลขคงที่) · ก่อนหน้า = Sub-channel Allocation · ที่ Sub-channel Allocation ไม่มีก่อนหน้า (ไม่มีทางไป Annual Target) · ขั้นแรกที่เห็น = ขั้นที่ 2',
      expected: [[3, 4, 'phasing', 'summary', 'phasing'], [2, 4, null, 'skuPlanning'], [4, 4, 'skuPlanning', null]],
      actual: function () {
        var R = SP.core.registry;
        var seen = function (e) { return P().pageVisible({ userId: 'u-sp-pim' }, e.id, ctx()); };
        var id = function (e) { return e ? e.id : null; };
        var a = R.step(R.byId('skuPlanning'), seen), b = R.step(R.byId('phasing'), seen), c = R.step(R.byId('summary'), seen);
        return [[a.n, a.total, id(a.prev), id(a.next), id(a.first)], [b.n, b.total, id(b.prev), id(b.next)], [c.n, c.total, id(c.prev), id(c.next)]];
      }
    },
    {
      name: 'cr25-6. ผู้ใช้ 2 บทบาท (Sales Officer + ทีม Product) → เมนูรวมของทั้งสอง · หน้าเริ่มต้นตามบทบาทแรกตามลำดับบทบาท (Sales Officer = SKU Planning ไม่ว่าจะใส่บทบาทลำดับใด)',
      expected: [[['sales-planning', ['phasing', 'skuPlanning', 'summary']], ['product-master', ['productList', 'npdPlan', 'promotionPrice', 'productMaster', 'taxonomy']],
        ['account-master', ['territories']], ['project-info', ['aboutPrototype']]], 'skuPlanning', 'skuPlanning', 'productList'],
      actual: function () {
        var two = { id: 'x', name: 'x', salesPersonId: 'sp-pim', roleIds: ['officer', 'product'], active: true };
        var rev = { id: 'y', name: 'y', salesPersonId: 'sp-pim', roleIds: ['product', 'officer'], active: true };
        // ย้ายทีม Product ขึ้นก่อน Sales Officer ในลำดับบทบาท → หน้าเริ่มต้นเป็นของทีม Product
        var roles = P().reorderRoles(SP.data.roles, 'product', 0);
        return [menuIds(two), P().homePage(two, ctx()), P().homePage(rev, ctx()), P().homePage(two, ctx({ roles: roles }))];
      }
    },
    {
      name: 'cr25-7. หน้าที่ซ่อน: Sales Officer เปิด Annual Target ตรงๆ = ไม่เห็น (ไม่มีสิทธิ์เข้าถึง) → ปุ่มไปหน้าเริ่มต้น SKU Planning · Roles / Users ใช้สิทธิ์ของ Permissions (เห็นเฉพาะผู้ดูแลระบบ) · เกี่ยวกับ Prototype เห็นทุกบทบาท ไม่อยู่ในเมทริกซ์',
      expected: [false, 'skuPlanning', [false, false, false], [true, true, true], true, false, ['roleManagement'], 'roleManagement'],
      actual: function () {
        var off = { userId: 'u-sp-pim' }, adm = { userId: 'u-admin' };
        var rm = ['roleManagement', 'roleRoles', 'roleUsers'];
        var aboutAll = SP.data.roles.every(function (r) { return P().pageVisible(role(r.id), 'aboutPrototype', ctx()); });
        return [P().pageVisible(off, 'topDown', ctx()), P().homePage(off, ctx()), rm.map(function (id) { return P().pageVisible(off, id, ctx()); }), rm.map(function (id) { return P().pageVisible(adm, id, ctx()); }),
          aboutAll, P().resources(SP.core.registry.list).some(function (r) { return r.pageId === 'aboutPrototype' || r.pageId === 'roleRoles' || r.pageId === 'roleUsers'; }),
          P().pageModules('roleUsers', ctx()), P().homePage(adm, ctx())];
      }
    },
    {
      name: 'cr25-8. คืนค่าตั้งต้น → เมทริกซ์ตรงกับตาราง CR-25 ข้อ 3 ทุกช่อง (8 บทบาท × 17 รายการ) · ค่าตั้งต้นใน data/ ตรงกับตาราง',
      expected: [[], [], 136],
      actual: function () {
        var p = P().defaultPerms();
        p = P().setCell(p, 'officer', 'taxonomy', { level: 'EDIT' });
        p = P().setCell(p, 'viewer', 'accounts', { level: 'VIEW' });
        p = P().setCell(p, 'admin', 'summary', { level: 'EDIT' });
        var reset = P().resetMatrix(p);
        var res = P().resources(SP.core.registry.list);
        function check(perms) {
          var bad = [];
          Object.keys(CR25).forEach(function (id) {
            var r = res.filter(function (x) { return x.id === id; })[0];
            CR25_ROLES.forEach(function (roleId, i) {
              var want = CR25_CELL[CR25[id].split(' ')[i]];
              var c = r ? P().cell(perms, SP.data.roles.filter(function (x) { return x.id === roleId; })[0], r) : null;
              if (!c || c.level !== want.level || c.scope !== want.scope) bad.push(id + ' · ' + roleId + ' → ' + (c ? c.level + '/' + c.scope : 'missing'));
            });
          });
          return bad;
        }
        return [check(reset), check(P().defaultPerms()), res.length * CR25_ROLES.length];
      }
    },
    {
      name: 'cr25-9. หน้าเริ่มต้นของทุกบทบาทตามตาราง CR-25 ข้อ 3 (★) · แถวสรุป เห็น n · แก้ไข m หน้า (นับหน้าในเมนูข้าง ไม่นับเกี่ยวกับ Prototype) · หน้าเริ่มต้นที่ตั้งไว้แต่มองไม่เห็น = ขั้นแรกที่เห็น',
      expected: [['topDown', 'phasing', 'skuPlanning', 'skuPlanning', 'productList', 'productList', 'summary', 'roleManagement'],
        [[4, 1], [12, 5], [11, 1], [8, 1], [6, 5], [4, 1], [1, 0], [16, 15]], 'phasing', 'topDown'],
      actual: function () {
        var ids = CR25_ROLES;
        var bad = P().setRoleHome(SP.data.roles, 'officer', 'topDown');   // Sales Officer ไม่เห็น Annual Target
        var stale = SP.data.roles.map(function (r) { var c = JSON.parse(JSON.stringify(r)); delete c.homePageId; return c; });   // master.roles ที่บันทึกก่อน CR-25
        return [ids.map(function (id) { return P().roleHome(id, ctx()); }), ids.map(function (id) { var s = P().roleSummary(id, ctx()); return [s.seen, s.edit]; }),
          P().roleHome('officer', ctx({ roles: bad })), P().roleHome('management', ctx({ roles: stale }))];
      }
    }
  ];

  // CR-25: เมนูข้างของผู้ใช้ → [[group, [pageId]]]
  function menuIds(u) { return P().menuFor(u, ctx()).map(function (g) { return [g.id, g.entries.map(function (e) { return e.id; })]; }); }
  // สำเนาตาราง CR-25 ข้อ 3 (แยกจาก data/permissions.js) — N ไม่เห็น / – · V ดู · E แก้ไข / ✓ · T แก้ไข·ทีม / ✓·ทีม
  var CR25_ROLES = ['management', 'director', 'manager', 'officer', 'product', 'supply', 'viewer', 'admin'];
  var CR25_CELL = { N: { level: 'NONE', scope: 'ALL' }, V: { level: 'VIEW', scope: 'ALL' }, E: { level: 'EDIT', scope: 'ALL' }, T: { level: 'EDIT', scope: 'TEAM' } };
  var CR25 = {
    annualTarget: 'E V N N N N N E', unitTargets: 'V E V V N N N E', skuPlan: 'V V T T N N N E', 'skuPlan.createNpd': 'N N T T N N N E',
    summary: 'V V V V V V V V',
    productList: 'N V V V E V N E', npdPlan: 'N V V V E V N E', promotionPrice: 'N V V V E N N E', listing: 'N V V V E V N E',
    'listing.clearance': 'N V V V V E N E', taxonomy: 'N N N N E N N E',
    accounts: 'N E V N N N N E', territories: 'N E V V N N N E', salespeople: 'N E V N N N N E', salesTeam: 'N E V N N N N E',
    roleManagement: 'N N N N N N N E', 'export': 'E E E E E E E E'
  };
})();
