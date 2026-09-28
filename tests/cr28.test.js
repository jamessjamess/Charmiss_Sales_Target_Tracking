/*
 * tests/cr28.test.js — Test ของ CR-28 (แท็บติดตามสถานะ · คู่มือการใช้งาน · สถานการณ์ทดสอบ UAT · ปุ่ม ? ที่หัวหน้า)
 *
 * รันด้วย Node: node tests/run.js cr28 / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   cr28-1..8 = Test ตาม CR-28 (ข้อ 6 ใช้ store ของเบราว์เซอร์และคืนค่า store เดิมเสมอ) · cr28-9 = สูตรในคู่มือสร้างจาก Channel Master
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function calc() { return SP.core.calc; }
  function G() { return SP.core.guide; }
  function P() { return SP.core.permissions; }
  function D() { return SP.data.guide; }
  function r4(v) { return Math.round(v * 1e4) / 1e4; }
  // หน่วยขายสมมติ: A ขาด 50% · B เกิน 20% · C ครบ · V ไม่มีผู้รับผิดชอบและขาด 50% · E ขาด 10%
  function rows() {
    return calc().planActions([
      { id: 'A', target: 100000, plan: 50000, vacant: false },
      { id: 'B', target: 100000, plan: 120000, vacant: false },
      { id: 'C', target: 100000, plan: 100000, vacant: false },
      { id: 'V', target: 200000, plan: 100000, vacant: true },
      { id: 'E', target: 1000000, plan: 900000, vacant: false }
    ], { all: true, approval: false, sort: 'pct' });
  }
  function tabCounts(info) { var o = {}; info.tabs.forEach(function (t) { o[t.id] = t.count; }); return o; }

  SP.tests.cr28 = [
    {
      name: 'cr28-1. แท็บตัวกรองติดตามสถานะ: ทั้งหมด 5 · ขาด 3 · เกิน 1 · จัดสรรครบ 1 · ไม่มีผู้รับผิดชอบ 1 · หน่วยที่ไม่มีผู้รับผิดชอบและขาดอยู่ทั้งสองแท็บ · ยังจัดสรรไม่ครบ 4 จาก 5',
      expected: [{ all: 5, short: 3, over: 1, ok: 1, vacant: 1 }, [true, true], 4, 5, ['V']],
      actual: function () {
        var rs = rows();
        var info = calc().actionTabs(rs);
        var v = rs.filter(function (r) { return r.id === 'V'; })[0];
        return [tabCounts(info), [calc().actionTabMatch(v, 'short'), calc().actionTabMatch(v, 'vacant')], info.pending, info.total,
          rs.filter(function (r) { return calc().actionTabMatch(r, 'vacant'); }).map(function (r) { return r.id; })];
      }
    },
    {
      name: 'cr28-2. % ส่วนต่าง = |ส่วนต่าง| ÷ เป้าหมายหน่วยขาย (EVEANDBOY 2.70 ÷ 10.94 ล้าน = 24.7%) · เรียง ไม่มีผู้รับผิดชอบ → % ส่วนต่างมากไปน้อย (ไม่ใช่บาท)',
      expected: [0.2468, '24.7%', ['V', 'A', 'B', 'E', 'C'], [0.5, 0.5, 0.2, 0.1, 0]],
      actual: function () {
        var p = calc().gapPct(calc().remaining(10940000, 8240000));
        var rs = rows();
        return [r4(p), SP.core.format.pct(p, 1), rs.map(function (r) { return r.id; }), rs.map(function (r) { return r4(r.gapPct); })];
      }
    },
    {
      name: 'cr28-3. ตารางบทบาทและหน้าที่สร้างจากสิทธิ์จริง: Sales Director แก้ Sub-channel Allocation ได้ · ตั้งสิทธิ์เป็น ดู แล้วตารางและผู้แก้ไขของหน้าเปลี่ยนตาม · ผู้ดูแลระบบ = ทุกหน้า ยกเว้น Plan Summary',
      expected: [true, false, ['director'], ['admin'], 'topDown', true, ['summary']],
      actual: function () {
        var perms = P().permsNow();
        var changed = P().setCell(perms, 'director', 'unitTargets', { level: 'VIEW' });
        function row(list, id) { return list.filter(function (r) { return r.id === id; })[0]; }
        var before = G().roleRows({ perms: perms });
        var after = G().roleRows({ perms: changed });
        var admin = row(before, 'admin');
        return [row(before, 'director').edit.indexOf('phasing') >= 0, row(after, 'director').edit.indexOf('phasing') >= 0,
          G().pageEditors('phasing', { perms: perms }).map(function (r) { return r.id; }), G().pageEditors('phasing', { perms: changed }).map(function (r) { return r.id; }),
          row(before, 'management').home, admin.everywhere, admin.except];
      }
    },
    {
      name: 'cr28-4. เริ่มสถานการณ์ S4 → มุมมองผู้ใช้ Sales Manager · MT (อนันต์) · เปิด SKU Planning ของ 7-Eleven · สถานการณ์ที่กำลังทดสอบ = S4',
      expected: [true, 'u-sp-anan', 'manager', 'mt', 'skuPlanning', { channel: 'mt', unit: 'seven' }, 'S4', { done: 0, total: 4, current: 1 }],
      actual: function () {
        var s = D().scenarios.filter(function (x) { return x.id === 'S4'; })[0];
        var st = G().uatStart(G().uatBlank(), s);
        return [st.ok, st.role.userId, st.role.type, st.role.channelId, st.pageId, st.selection, st.results.active, G().uatStepInfo(st.results, s)];
      }
    },
    {
      name: 'cr28-5. เลือก ไม่ผ่าน โดยไม่กรอกหมายเหตุ (หรือเว้นวรรค) → บันทึกไม่ได้ · มีหมายเหตุ = บันทึกได้ · บันทึกผลของสถานการณ์ที่กำลังทดสอบ = จบการทดสอบ',
      expected: [[false, 'noteRequired'], [false, 'noteRequired'], [true, 'fail', 'ปุ่มบันทึกไม่ทำงาน', null], [true, 'pass']],
      actual: function () {
        var r = G().uatStart(G().uatBlank(), D().scenarios[0]).results;
        var a = G().uatSetResult(r, 'S1', 'fail', '');
        var b = G().uatSetResult(r, 'S1', 'fail', '   ');
        var c = G().uatSetResult(r, 'S1', 'fail', 'ปุ่มบันทึกไม่ทำงาน');
        var d = G().uatSetResult(r, 'S2', 'pass', '');
        return [[a.ok, a.error], [b.ok, b.error], [c.ok, G().uatItem(c.results, 'S1').result, G().uatItem(c.results, 'S1').note, c.results.active], [d.ok, G().uatItem(d.results, 'S2').result]];
      }
    },
    {
      name: 'cr28-6. รีเซ็ตข้อมูล (layout.resetData) แล้ว uat.results ยังอยู่ แต่ค่าอื่นถูกล้าง · ล้างผลการทดสอบแล้วว่าง (ใช้ store ของเบราว์เซอร์ · document ต้องมี)',
      expected: ['pass', 'ทดสอบ', null, 0, ['uat.results']],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test (Node ข้ามข้อนี้)
        var S = SP.core.store;
        var snap = S.keys().map(function (k) { return [k, S.get(k)]; });
        try {
          S.set('uat.results', { tester: 'ทดสอบ', date: '2026-09-26', active: null, items: { S1: { steps: [true], result: 'pass', note: '' } } });
          S.set('ui.summaryTab', 'status');
          SP.core.layout.resetData();
          var kept = G().uatNormalize(S.get('uat.results'));
          var other = S.get('ui.summaryTab');
          S.set('uat.results', G().uatBlank());
          return [G().uatItem(kept, 'S1').result, kept.tester, other, G().uatProgress(S.get('uat.results'), D().scenarios).tested, G().keepOnReset(['ui.role', 'uat.results', 'plan.2027.topDown'])];
        } finally {
          S.reset();
          snap.forEach(function (kv) { S.set(kv[0], kv[1]); });
        }
      }
    },
    {
      name: 'cr28-7. ส่งออกผลการทดสอบ: 10 แถว (1 แถวต่อสถานการณ์ · CR-32 เพิ่ม S10) · คอลัมน์ ผู้ทดสอบ · วันที่ · รหัส · ชื่อ · บทบาท · ขั้นตอนที่ทำ (x/y) · ผล · หมายเหตุ',
      expected: [10, ['tester', 'date', 'id', 'title', 'role', 'steps', 'result', 'note'], ['ก', '2026-09-26', 'S1', 'ตั้งเป้าหมายประจำปี', 'management', '2/4', 'ผ่าน', ''], 'ยังไม่ทดสอบ'],
      actual: function () {
        var r = G().uatSetMeta(G().uatBlank(), { tester: 'ก', date: '2026-09-26' });
        r = G().uatSetStep(r, 'S1', 0, true);
        r = G().uatSetStep(r, 'S1', 2, true);
        r = G().uatSetResult(r, 'S1', 'pass', '').results;
        var labels = { result: { pass: 'ผ่าน', fail: 'ไม่ผ่าน', skip: 'ข้าม', none: 'ยังไม่ทดสอบ' } };
        var rows = G().uatExportRows(r, D().scenarios, labels);
        var first = rows[0];
        return [rows.length, Object.keys(first), Object.keys(first).map(function (k) { return first[k]; }), rows[1].result];
      }
    },
    {
      name: 'cr28-8. ปุ่ม ? (pageHelp) มีเนื้อหาครบทุกหน้าในเมนู (ยกเว้นหน้าคู่มือ): หน้านี้ใช้ทำอะไร + ขั้นตอนหลัก 1–3 ข้อ · สถานการณ์ทดสอบ 10 ข้อชี้หน้าและผู้ใช้ที่มีจริง (CR-32 เพิ่ม S10)',
      expected: [[], 10, [], []],
      actual: function () {
        var pages = D().pages;
        var missing = SP.core.registry.list.filter(function (e) { return e.visible !== false && e.id !== 'aboutPrototype'; }).filter(function (e) {
          var g = pages[e.id];
          return !g || !g.purpose || !g.steps || g.steps.length < 1 || g.steps.length > 3;
        }).map(function (e) { return e.id; });
        var sc = D().scenarios;
        return [missing, sc.length,
          sc.filter(function (s) { return !SP.core.registry.byId(s.pageId); }).map(function (s) { return s.id; }),
          sc.filter(function (s) { return !SP.data.users.some(function (u) { return u.id === s.userId && u.roleIds.indexOf(s.roleId) >= 0; }); }).map(function (s) { return s.id; })];
      }
    },
    {
      name: 'cr28-9. สูตรในคู่มือสร้างจาก Channel Master ที่ใช้งาน (ไม่พิมพ์ชื่อ Channel เอง): Sale Amount + 1 บรรทัดต่อ Channel · Channel ที่ไม่มีส่วนแบ่ง = ไม่มี (1 − …)',
      expected: [['sale', 'net', 'net', 'net'], [['MT', 'GP'], ['TT', null], ['ECOM', 'Platform Fee']]],
      actual: function () {
        var lines = G().formulaLines(SP.data.channels);
        return [lines.map(function (l) { return l.kind; }), lines.slice(1).map(function (l) { return [l.channel, l.gpLabel]; })];
      }
    }
  ];
})();
