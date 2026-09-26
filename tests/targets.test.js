/*
 * tests/targets.test.js — Test ของ CR-23 (Annual Target · Sub-channel Allocation · ยอดขายย้อนหลัง 3 ปี · สิทธิ์ใหม่) · ไม่ใช้ DOM
 *
 * รันด้วย Node: node tests/run.js targets / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   cr23-1..8 = Test ตาม CR-23 ข้อ 6 — ข้อมูลตั้งต้นจาก data/ (ปีแผน 2027 · targets.years[2027]) store: ไม่อ่าน ไม่เขียน
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  var YEAR = 2027;
  function D() { return SP.data; }
  function calc() { return SP.core.calc; }
  function P() { return SP.core.permissions; }
  function plan() { return JSON.parse(JSON.stringify(D().targets.years[YEAR])); }
  function tree(p) { return calc().topDown(D(), p || plan(), YEAR); }
  function mil(v) { return v == null ? null : Math.round(v / 1e4) / 100; }
  function ctx(extra) {
    var o = { roles: SP.data.roles, perms: P().defaultPerms(), users: SP.data.users, teams: SP.data.teams, month: '2027-03', list: SP.core.registry.list };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }
  function role(type) { return { type: type, personId: null, channelId: null }; }

  SP.tests.targets = [
    {
      name: 'cr23-1. salesHistory(MT, 3 ปีก่อนปีแผน) คืน 3 ค่า (ล้านบาท 2024 · 2025 · 2026) · ปีคำนวณจากปีแผน (2028 → 2025–2027 · ปี 2027 ยังไม่มียอด = null)',
      expected: [[2024, 2025, 2026], [43.03, 46.97, 51.7], [2025, 2026, 2027], [46.97, 51.7, null], [21.27, 29.67, 38.6], [23.02, 22.67, 22.9]],
      actual: function () {
        var y27 = calc().historyYears(YEAR), y28 = calc().historyYears(2028);
        return [y27, calc().salesHistory(D(), 'mt', y27).map(mil), y28, calc().salesHistory(D(), 'mt', y28).map(mil),
          calc().salesHistory(D(), 'ecom', y27).map(mil), calc().salesHistory(D(), 'tt', y27).map(mil)];
      }
    },
    {
      name: 'cr23-2. แท่งเป้าหมายเทียบปีก่อนใช้สเกลจริงร่วมทั้งตาราง (60 ล้าน) · ขีด = ยอดขายฐาน (CR-24 L12M ของ MT 56.83 ล้าน → แท่ง 90.0% ขีด 94.7%)',
      expected: [60000000, 0.9, 0.9471, true],
      actual: function () {
        var t = tree();
        var vals = [];
        t.children.forEach(function (c) { vals.push(c.amount, c.prior); });
        var max = calc().niceScaleMax(vals);
        var mt = calc().findById(t.children, 'mt');
        var v = calc().vsLastYear(mt.amount, mt.prior, max);
        return [max, Math.round(v.bar * 1e4) / 1e4, Math.round(v.tick * 1e4) / 1e4, calc().l12m(D(), 'mt') === mt.prior];
      }
    },
    {
      name: 'cr23-3. Annual Target ไม่มีแถวหน่วยขาย (Channel 3 + Total + คงเหลือ) · Sub-channel Allocation ของ MT มี 3 หน่วยขาย % ใน Channel รวม 100% + คงเหลือใน MT จัดสรรครบ',
      expected: [['channel', 'channel', 'channel', 'total', 'remaining'], ['seven', 'watsons', 'eveandboy'], 1, 'ok'],
      actual: function () {
        var t = tree();
        var annual = calc().topDownRows(t, { level: 'channel' }).map(function (r) { return r.kind; });
        var mt = calc().topDownRows(t, { channelId: 'mt' });
        var units = mt.filter(function (r) { return r.kind === 'unit'; });
        var sum = Math.round(calc().sum(units.map(function (r) { return r.pctInChannel; })) * 1e6) / 1e6;
        return [annual, units.map(function (r) { return r.unitId; }), sum, mt[mt.length - 1].status];
      }
    },
    {
      name: 'cr23-4. Management แก้ Annual Target ได้ · แก้ Sub-channel Allocation ไม่ได้ · Sales Director กลับกัน (หน้าไหนแก้ไม่ได้ = ดู)',
      expected: [[true, false], [false, true], ['EDIT', 'VIEW'], ['VIEW', 'EDIT'], ['annualTarget'], ['unitTargets']],
      actual: function () {
        var m = role('management'), d = role('director');
        return [[P().can(m, 'annualTarget', ctx()), P().can(m, 'unitTargets', ctx())],
          [P().can(d, 'annualTarget', ctx()), P().can(d, 'unitTargets', ctx())],
          [P().pageLevel(m, 'topDown', ctx()), P().pageLevel(m, 'phasing', ctx())],
          [P().pageLevel(d, 'topDown', ctx()), P().pageLevel(d, 'phasing', ctx())],
          P().stepModules('topDown'), P().stepModules('phasing')];
      }
    },
    {
      name: 'cr23-5. แปลงสิทธิ์เดิม: topdown.unit = VIEW · phasing = EDIT → unitTargets = EDIT · topdown.channel → annualTarget · ลบ Key เดิม',
      expected: [{ unitTargets: { level: 'EDIT', scope: 'ALL' } }, { level: 'EDIT', scope: 'ALL' }, ['annualTarget', 'export'], true, false],
      actual: function () {
        var m = P().migratePerms({
          director: { 'topdown.unit': { level: 'VIEW', scope: 'ALL' }, phasing: { level: 'EDIT', scope: 'ALL' } },
          management: { 'topdown.channel': { level: 'EDIT', scope: 'ALL' }, export: { level: 'EDIT', scope: 'ALL' } }
        });
        var again = P().migratePerms(m.perms);
        return [m.perms.director, m.perms.management.annualTarget, Object.keys(m.perms.management).sort(), m.changed, again.changed];
      }
    },
    {
      name: 'cr23-6. Management เปลี่ยนเป้า MT 54,000,000 → 60,000,000 → 7-Eleven (41%) = 24,600,000 · Audit การเปลี่ยนเป้าหมาย Channel · บรรทัดแจ้งแสดงจนกว่าจะกดปิด',
      expected: [54000000, 60000000, 24600000, [['mt', 54000000, 60000000]], [54000000, 60000000], null],
      actual: function () {
        var before = tree();
        var p = plan();
        p.pct.mt = 0.5;
        var after = tree(p);
        var mt = calc().findById(after.children, 'mt');
        var seven = calc().findById(mt.children, 'seven');
        var audit = calc().channelTargetAudit(before, after, { by: 'Management · วรวุฒิ ธนากร', at: '2027-03-01T09:00:00.000Z', year: YEAR });
        var change = calc().channelTargetChange(audit, 'mt', YEAR, null);
        var dismissed = calc().channelTargetChange(audit, 'mt', YEAR, '2027-03-01T09:00:00.000Z');
        return [calc().findById(before.children, 'mt').amount, mt.amount, Math.round(seven.amount),
          audit.map(function (e) { return [e.key, e.oldValue, e.newValue]; }), [change.oldValue, change.newValue], dismissed];
      }
    },
    {
      name: 'cr23-7. Channel ที่เป้าหมายเป็น 0 → Sub-channel Allocation ของ Channel นั้นแก้ไขไม่ได้ (noTarget) · Channel ที่มีเป้าหมายแก้ได้',
      expected: ['noTarget', null, 'noChannel'],
      actual: function () {
        var p = plan();
        p.pct.tt = 0;
        var t = tree(p);
        return [calc().unitAllocationBlock(t, 'tt'), calc().unitAllocationBlock(t, 'mt'), calc().unitAllocationBlock(t, 'export')];
      }
    },
    {
      name: 'cr23-8. ชื่อหน้าทั้ง 4 ขั้น (เมนู · หัวข้อ · ค่าสำรองใน registry) เป็นภาษาอังกฤษ · Tooltip ชื่อหน้าเป็นภาษาไทย',
      expected: [
        ['Annual Target', 'Sub-channel Allocation', 'SKU Planning', 'Plan Summary'],
        ['Annual Target', 'Sub-channel Allocation', 'SKU Planning', 'Plan Summary'],
        ['Annual Target', 'Sub-channel Allocation', 'SKU Planning', 'Plan Summary'],
        ['กำหนดเป้าหมายประจำปี', 'จัดสรรเป้าหมายหน่วยขาย', 'วางแผนยอดขายราย SKU', 'รายงานสรุปแผน']
      ],
      actual: function () {
        var tour = SP.core.registry.tour();
        var pages = SP.data.content.pages;
        return [tour.map(function (e) { return pages[e.id].title; }), tour.map(function (e) { return pages[e.id].short; }),
          tour.map(function (e) { return e.title; }), tour.map(function (e) { return pages[e.id].titleTip; })];
      }
    }
  ];
})();
