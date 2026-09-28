/*
 * tests/cr28.test.js — Test ของ CR-28 (แท็บติดตามสถานะ · คู่มือการใช้งาน · CR-36 ตัด Test ของสถานการณ์ทดสอบ UAT (cr28-4..7 เดิม) · ปุ่ม ? ที่หัวหน้า)
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
      name: 'cr28-8. ปุ่ม ? (pageHelp) มีเนื้อหาครบทุกหน้าในเมนู (ยกเว้นหน้าคู่มือ): หน้านี้ใช้ทำอะไร + ขั้นตอนหลัก 1–3 ข้อ · สถานการณ์ทดสอบ 13 ข้อชี้หน้าและผู้ใช้ที่มีจริง (CR-32 เพิ่ม S10 · CR-34 เพิ่ม S11 · CR-35 เพิ่ม S12 S13)',
      expected: [[], 0],   // CR-36 ตัดสถานการณ์ทดสอบ (UAT) ออกจากคู่มือ
      actual: function () {
        var pages = D().pages;
        var missing = SP.core.registry.list.filter(function (e) { return e.visible !== false && e.id !== 'aboutPrototype'; }).filter(function (e) {
          var g = pages[e.id];
          return !g || !g.purpose || !g.steps || g.steps.length < 1 || g.steps.length > 3;
        }).map(function (e) { return e.id; });
        return [missing, (D().scenarios || []).length];
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
