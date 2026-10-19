/*
 * tests/cr38.test.js — Test ของ CR-38 (Revision: วงจรสถานะ · ห้ามแก้ย้อนหลัง · เดือนที่ล็อก · Snapshot · ข้อมูลตั้งต้น / ตัวอย่าง)
 *
 * รันด้วย Node: node tests/run.js cr38 / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   cr38-1..9 ฟังก์ชันล้วน (core/revision.js · calc ส่วนที่ 24) · cr38-20.. (เบราว์เซอร์) ใช้ store จริงแล้วรีเซ็ตกลับเป็นข้อมูลตั้งต้น
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function D() { return SP.data; }
  function calc() { return SP.core.calc; }
  function R() { return SP.core.revision; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  var YEAR = 2027, LC = '2026-08';
  function rev(status, eff, extra) {
    var r = R().defaultList()[0];
    r.status = status; r.effectiveMonth = eff || '2027-01';
    Object.keys(extra || {}).forEach(function (k) { r[k] = extra[k]; });
    return r;
  }
  function plans() {
    var c = calc(), out = {}, td = D().targets.years[YEAR];
    Object.keys(td.units).forEach(function (ch) { td.units[ch].forEach(function (u) { out[u] = c.defaultSkuPlan(D(), u, YEAR, true, D().planSeeds.years[YEAR][u]); }); });
    return out;
  }
  // ---------- เบราว์เซอร์: store จริง (ทุกข้อรีเซ็ตกลับเป็นข้อมูลตั้งต้นเมื่อจบ) ----------
  function S() { return SP.core.store; }
  function users() { return (SP.core.permissions.usersNow ? SP.core.permissions.usersNow() : D().users).filter(function (u) { return u.active !== false; }); }
  function attempt(fn) { try { fn(); return 'ok'; } catch (e) { return e.revision ? e.revision.code : String(e.message); } }
  function bump(key, fn) { var v = S().get(key); fn(v); S().set(key, v); }
  // CR-39: เปิด Module Approval = ส่งรอบเป็นรออนุมัติผ่านคำขอ (core/approval.js) · ปิด = วงจรของ CR-38
  function submitRev(id) { var A = SP.core.approval; return A && A.enabled() ? A.create(id, { system: true, note: 'Test' }) : R().submit(id, { system: true }); }
  // CR-39: วงจรของ CR-38 (ปุ่มในแท็บ Revision) ทดสอบโดยปิด Flag approval ชั่วคราว
  function withoutApproval(fn) { var F = SP.data.settings.FEATURES, was = F.approval; F.approval = false; try { return fn(); } finally { F.approval = was; } }
  function unit(rep, id) { return rep.units.filter(function (u) { return u.id === id; })[0]; }
  function r0(v) { return Math.round(v); }

  SP.tests.cr38 = [
    {
      name: 'cr38-1. writable: Lock แล้ว = locked · รอ Lock = submitted · ร่าง: เดือนก่อนเดือนที่มีผล = beforeEffective · เดือนที่ปิดแล้ว = closed · เดือนที่เปิด / ทั้งปี = แก้ได้',
      expected: ['locked', 'submitted', 'beforeEffective', null, null, 'closed', null],
      actual: function () {
        var W = R().writable;
        return [W(rev('locked'), '2027-06', LC).code, W(rev('submitted'), '2027-06', LC).code, W(rev('draft', '2027-04'), '2027-03', LC).code,
          W(rev('draft', '2027-04'), '2027-04', LC).code, W(rev('draft', '2027-04'), null, LC).code,
          W({ planYear: 2026, status: 'draft', effectiveMonth: '2026-01' }, '2026-08', LC).code, W({ planYear: 2026, status: 'draft', effectiveMonth: '2026-01' }, '2026-09', LC).code];
      }
    },
    {
      name: 'cr38-2. เดือนที่ล็อก: 2027 R1 = 0 (ทุกเดือนแก้ได้) · มีผล เม.ย. = 3 · ปี 2026 (ปิดถึง ส.ค.) = 8 · ปิดทั้งปี = 12 · รอบ Lock ใช้ค่าตอน Lock',
      expected: [0, 3, 8, 12, 5],
      actual: function () {
        var L = R().lockCount;
        return [L(rev('draft'), LC), L(rev('draft', '2027-04'), LC), L({ planYear: 2026, status: 'draft', effectiveMonth: '2026-01' }, LC), L({ planYear: 2025, status: 'draft', effectiveMonth: '2025-01' }, LC),
          L(rev('locked', '2027-04', { lockBefore: 5 }), LC)];
      }
    },
    {
      name: 'cr38-3. วงจรสถานะ: เปิดรอบใหม่ได้เมื่อไม่มีรอบเปิดอยู่ · เหตุผลบังคับ · เดือนที่มีผลต้องอยู่ในปีและหลังเดือนปิด · เสนอ Lock ไม่ได้ถ้า 3 ข้อแรกไม่ครบ · ส่งกลับต้องมีข้อความ · Lock ต้องพิมพ์ชื่อรอบ · history ครบ',
      expected: ['open', 'reason', 'effective', 'effective', 'checks', 'note', 'confirmName', ['2027-R2', 'draft', '2027-04', '2027-R1'], ['open', 'submit', 'return', 'submit', 'lock'], 'locked'],
      actual: function () {
        var T = R().transition;
        var l0 = R().defaultList();
        var a = T(l0, 'open', { year: YEAR, reason: 'x', effectiveMonth: '2027-04', lastClosed: LC }).error;   // R1 ยังเป็นร่าง
        var l1 = T(l0, 'submit', { id: '2027-R1', checks: { blocking: 0 } }).list;
        l1 = T(l1, 'lock', { id: '2027-R1', confirmName: '2027 R1' }).list;
        var b = T(l1, 'open', { year: YEAR, reason: ' ', effectiveMonth: '2027-04', lastClosed: LC }).error;
        var c = T(l1, 'open', { year: YEAR, reason: 'x', effectiveMonth: '2028-01', lastClosed: LC }).error;
        var d = T(l1, 'open', { year: YEAR, reason: 'x', effectiveMonth: '2027-02', lastClosed: '2027-02' }).error;
        var o = T(l1, 'open', { year: YEAR, reason: 'ECOM', effectiveMonth: '2027-04', lastClosed: LC, by: 'M', at: 't1' });
        var l2 = o.list;
        var e = T(l2, 'submit', { id: '2027-R2', checks: { blocking: 1, failed: ['unitMonthly'] } }).error;
        l2 = T(l2, 'submit', { id: '2027-R2', checks: { blocking: 0 } }).list;
        var f = T(l2, 'return', { id: '2027-R2', note: '' }).error;
        l2 = T(l2, 'return', { id: '2027-R2', note: 'ลด MT' }).list;
        l2 = T(l2, 'submit', { id: '2027-R2', checks: { blocking: 0 } }).list;
        var g = T(l2, 'lock', { id: '2027-R2', confirmName: '2027 R1' }).error;
        l2 = T(l2, 'lock', { id: '2027-R2', confirmName: '2027 R2' }).list;
        var r2 = R().find(l2, '2027-R2');
        return [a, b, c, d, e, f, g, [o.rev.id, o.rev.status, o.rev.effectiveMonth, o.rev.basedOn], r2.history.map(function (x) { return x.action; }), r2.status];
      }
    },
    {
      name: 'cr38-4. เดือนที่มีผลตั้งต้น = เดือนถัดจากเดือนปัจจุบันแต่ไม่ก่อนเดือนแรกของปีแผน · เลือกเดือนที่ ≤ เดือนปิดล่าสุดไม่ได้',
      expected: ['2027-01', '2027-04', null, 'effective', 'effective'],
      actual: function () {
        var R0 = R();
        return [R0.defaultEffective(2027, '2026-09'), R0.defaultEffective(2027, '2027-03'), R0.effectiveIssue(2027, '2027-04', LC), R0.effectiveIssue(2026, '2026-08', LC), R0.effectiveIssue(2027, '2027-13', LC)];
      }
    },
    {
      name: 'cr38-5. revisionPhasing: ไม่มีเดือนล็อก = phasingTotals เดิมทุกค่า · มีเดือนล็อก = บาทของรอบก่อน · เดือนเปิด = เป้า × % · fillOpenMonths กระจายส่วนต่างเฉพาะเดือนเปิด (คงเหลือ 0 · % เดือนล็อกคงเดิม)',
      expected: [true, [100, 200, 300], true, 'ok', true, true],
      actual: function () {
        var c = calc();
        var pct = [0.05, 0.05, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.05, 0.05, 0.1];
        var a = c.phasingTotals(1200, pct), b = c.revisionPhasing(1200, pct, null);
        var locked = [100, 200, 300, null, null, null, null, null, null, null, null, null];
        var x = c.revisionPhasing(1500, pct, locked);
        var open = x.amounts.slice(3).every(function (v, i) { return Math.abs(v - 1500 * pct[i + 3]) < 1e-9; });
        var filled = c.fillOpenMonths(1500, pct, locked);
        var y = c.revisionPhasing(1500, filled, locked);
        var ratio = filled[4] / filled[3];
        return [JSON.stringify(a.amounts) === JSON.stringify(b.amounts) && a.remaining.status === b.remaining.status, x.amounts.slice(0, 3), open, y.remaining.status,
          JSON.stringify(filled.slice(0, 3)) === JSON.stringify(pct.slice(0, 3)), Math.abs(ratio - pct[4] / pct[3]) < 1e-9];
      }
    },
    {
      name: 'cr38-6. เป้าหมายห้ามต่ำกว่าส่วนที่ล็อก: Total · Channel · หน่วยขาย (calc.lockedTargetIssues) · เป้าหมายเท่าเดิม = ไม่มีปัญหา',
      expected: [0, ['unit', 'channel', 'total']],
      actual: function () {
        var c = calc();
        var td = clone(D().targets.years[YEAR]);
        var tree = c.topDown(D(), td, YEAR);
        var locked = {};
        c.planUnits(tree).forEach(function (u) { locked[u.id] = [u.amount * 0.1, u.amount * 0.1, u.amount * 0.1, null, null, null, null, null, null, null, null, null]; });
        var ok = c.lockedTargetIssues(tree, locked).length;
        td.total = 30000000;
        var bad = c.lockedTargetIssues(c.topDown(D(), td, YEAR), locked).map(function (x) { return x.level; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
        return [ok, bad];
      }
    },
    {
      name: 'cr38-7. skuPlanGrid opts.revisionLock: เดือนล็อก = ชิ้น / Sale Amount / Net Sales ของรอบก่อน อ่านอย่างเดียว (revision) · เดือนเปิดเท่าเดิม · ไม่ส่ง = ผลเดิมทุกค่า · keepLockedMonths คงค่าเดือนล็อก',
      expected: [true, [5, 'revision', false], true, [true, true]],
      actual: function () {
        var c = calc(), p = plans().watsons;
        var g0 = c.skuPlanGrid(D(), D(), 'watsons', p, { year: YEAR, mode: 'initial' });
        var g1 = c.skuPlanGrid(D(), D(), 'watsons', p, { year: YEAR, mode: 'initial', revisionLock: null });
        var key = g0.rows[0].key;
        var items = {}; items[key] = { u: [5, 5, 5], s: [50, 50, 50], n: [40, 40, 40] };
        var g2 = c.skuPlanGrid(D(), D(), 'watsons', p, { year: YEAR, mode: 'initial', revisionLock: { before: 3, items: items } });
        var r = g2.rows[0], r0 = g0.rows[0];
        var sameOpen = r.cells.slice(3).every(function (x, i) { return x.units === r0.cells[i + 3].units && x.net === r0.cells[i + 3].net; });
        var next = clone(p); next.items[key].qty[0] = 999; next.items[key].qty[6] = 777;
        var kept = c.keepLockedMonths(next, p, 3).items[key];
        return [JSON.stringify(g0.yearTotal) === JSON.stringify(g1.yearTotal), [r.cells[1].units, r.cells[1].state.reason, r.cells[1].state.editable], sameOpen && r.cells[2].net === 40,
          [kept.qty[0] === (p.items[key].qty[0] || 0), kept.qty[6] === 777]];
      }
    },
    {
      name: 'cr38-8. ค่าเดือนล็อกจากรายงานของรอบก่อน (baseFrom) · ตรวจก่อนเสนอ Lock (checksFrom): 3 ข้อบังคับ + แผน SKU เป็นคำเตือน',
      expected: [[2, [100, 200], 1, [3, 4]], [['totalChannel', true], ['channelUnits', true], ['unitMonthly', false], ['skuPlan', false]], 1, ['unitMonthly']],
      actual: function () {
        var rep = { units: [{ id: 'a', targetM: [100, 200, 300] }], skuItems: [{ unitId: 'a', key: 'k1', units: [3, 4, 5], sale: [1, 1, 1], net: [1, 1, 1] }, { unitId: 'a', key: 'k2', units: [0, 0, 9], sale: [0, 0, 1], net: [0, 0, 1] }] };
        var b = R().baseFrom(rep, 2);
        var tree = calc().topDown(D(), D().targets.years[YEAR], YEAR);
        var ph = {}, sku = {};
        calc().planUnits(tree).forEach(function (u, i) { ph[u.id] = i === 0 ? 'short' : 'ok'; sku[u.id] = 'short'; });
        var ck = R().checksFrom(tree, ph, sku);
        return [[b.before, b.targets.a, Object.keys(b.sku.a).length, b.sku.a.k1.u], ck.items.map(function (x) { return [x.key, x.ok]; }), ck.blocking, ck.failed];
      }
    },
    {
      name: 'cr38-9. บทบาท MD: ดู Sales Planning และ Revision · Lock / ส่งกลับได้คนเดียว · Management เปิด / เสนอ Lock ได้ · ผู้ดูแลระบบ Lock ไม่ได้ · มีผู้ใช้ MD ในมุมมองผู้ใช้',
      expected: [[true, true, true, false], [true, false], [false, false, true], [false, false], true, 'approval'],   // CR-39 หน้าเริ่มต้นของ MD = Approval · แท็บ Revision ของผู้ดูแลระบบ = ดู
      actual: function () {
        var P = SP.core.permissions;
        function can(userId, res) { return P.can({ userId: userId }, res); }
        return [[P.pageVisible({ userId: 'u-md' }, 'summary'), P.pageVisible({ userId: 'u-md' }, 'revisionList'), can('u-md', 'revision.lock'), can('u-md', 'skuPlan')],
          [can('u-mgmt', 'revision.open'), can('u-mgmt', 'revision.lock')], [can('u-admin', 'revision.lock'), can('u-admin', 'revisionList'), P.pageVisible({ userId: 'u-viewer' }, 'revisionCompare')],
          [can('u-director', 'revision.submit'), can('u-director', 'revision.lock')], P.directory(null, null).some(function (u) { return u.userId === 'u-md'; }), P.homePage({ userId: 'u-md' })];
      }
    },
    {
      name: 'cr38-10. compareRevisions: A = B แล้วส่วนต่างเป็น 0 ทุกแถว · ส่วนต่างรวมทุกระดับเป้าหมาย = ส่วนต่างของ Total · เดือนก่อนเดือนที่มีผล ส่วนต่าง = 0 · จำนวนชิ้นใช้เฉพาะ Series / SKU · เรียง |ส่วนต่าง|',
      expected: [true, [270, 270, 270], [0, 0, 0], 3, 'net', ['u2', 'u1'], [true, 7]],
      actual: function () {
        function ds(seq, amounts, eff, lockBefore) {
          var units = [{ id: 'u1', name: 'U1', channelId: 'c1', annual: amounts[0] * 12, saleAnnual: 0, net: [], sale: [] }, { id: 'u2', name: 'U2', channelId: 'c2', annual: amounts[1] * 12, saleAnnual: 0, net: [], sale: [] }];
          units.forEach(function (u, i) { for (var m = 0; m < 12; m++) { var v = m < 3 ? 100 : amounts[i]; u.net.push(v); u.sale.push(v * 1.2); } u.annual = calc().sum(u.net); });
          var ch = units.map(function (u) { return { id: u.channelId, name: u.channelId, annual: u.annual, saleAnnual: 0, net: u.net, sale: u.sale }; });
          return { id: 'R' + seq, name: 'R' + seq, planYear: YEAR, seq: seq, effectiveMonth: eff, lockBefore: lockBefore,
            total: { annual: ch[0].annual + ch[1].annual, saleAnnual: 0, net: ch[0].net.map(function (v, m) { return v + ch[1].net[m]; }), sale: [] }, channels: ch, units: units,
            items: [{ key: 'k1', name: 'K1', unitId: 'u1', channelId: 'c1', seriesId: 's1', units: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], sale: [], net: [] }], seriesNames: { s1: 'S1' } };
        }
        var c = calc();
        var a = ds(1, [100, 100], '2027-01', 0), b = ds(2, [110, 120], '2027-04', 3);
        var same = c.compareRevisions(a, a, { level: 'unit' }).rows.every(function (r) { return r.diff === 0 && r.dM.every(function (v) { return v === 0; }); });
        var tot = c.compareRevisions(a, b, { level: 'total' }).total.diff;
        var ch = c.compareRevisions(a, b, { level: 'channel' }).total.diff, un = c.compareRevisions(a, b, { level: 'unit' }).total.diff;
        var mon = c.compareRevisions(a, b, { level: 'unit', view: 'month' });
        var units = c.compareRevisions(a, b, { level: 'channel', metric: 'units' });
        var sku = c.compareRevisions(a, b, { level: 'sku', metric: 'units', filter: { channelId: 'c1' } });
        return [same, [tot, ch, un], mon.total.dM.slice(0, 3), mon.lockBefore, units.metric, c.compareRevisions(a, b, { level: 'unit' }).rows.map(function (r) { return r.id; }), [sku.metric === 'units', sku.rows.length + 6]];
      }
    },
    // ======================= เบราว์เซอร์ (store จริง) =======================
    {
      name: 'cr38-20. (เบราว์เซอร์) ข้อมูลตั้งต้น: มีรอบเดียว 2027 R1 ร่าง · ทุกเดือนแก้ได้ · Net Sales รวมแผนเท่าก่อน CR (111,310,349) · เป้าหมายรวม 120 ล้าน',
      expected: [['2027-R1:draft:2027-01'], 12, 111310349, 120000000, 'ok'],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test (Node ข้ามข้อนี้)
        S().reset();
        var l = R().list().map(function (r) { return r.id + ':' + r.status + ':' + r.effectiveMonth; });
        var n = 0;
        for (var m = 0; m < 12; m++) { try { R().assertWritable('2027-R1', calc().monthKey(YEAR, m)); n++; } catch (e) { /* นับเฉพาะที่แก้ได้ */ } }
        var rep = SP.core.report.build();
        var w = attempt(function () { bump('plan.2027.sku.watsons', function (v) { var k = Object.keys(v.items)[0]; v.items[k].qty[0] = 7; v.items[k].overrides[0] = true; }); });
        S().reset();
        return [l, n, r0(calc().sum(rep.units.map(function (u) { return u.plan; }))), rep.total.amount, w];
      }
    },
    {
      name: 'cr38-21. (เบราว์เซอร์) ข้อมูลตัวอย่าง: R1 Lock แล้ว (MD · 15 ธ.ค. 2026) · R2 ร่างมีผล เม.ย. 2027 · Total 123 ล้าน · ม.ค.–มี.ค. ทุกหน่วยขาย / Channel / Total เท่ากับ R1 · แผน SKU ทุกเดือนเท่า R1 · R2 คัดลอกค่าทั้งหมดจาก R1',
      expected: [['2027-R1:locked', '2027-R2:draft'], ['2026-12-15T10:00:00', true], ['2027-04', 3, 'ECOM โตเกินคาดไตรมาสแรก', '2027-R1'], 123000000, true, true, true, [true, true]],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test
        S().reset();
        R().loadSample();
        var r1 = R().get('2027-R1'), r2 = R().get('2027-R2');
        var rep1 = r1.snapshot.report, rep2 = SP.core.report.build({ revisionId: '2027-R2', live: true });
        var c = calc();
        var unitsEq = rep1.units.every(function (u) { var v = unit(rep2, u.id); return [0, 1, 2].every(function (m) { return Math.abs(v.targetM[m] - u.targetM[m]) < 0.01; }); });
        function chMonth(rep, ch, m) { return c.sum(rep.units.filter(function (u) { return u.channelId === ch; }).map(function (u) { return u.targetM[m]; })); }
        var chEq = rep1.channels.every(function (ch) { return [0, 1, 2].every(function (m) { return Math.abs(chMonth(rep1, ch.id, m) - chMonth(rep2, ch.id, m)) < 0.01; }); });
        var plan1 = rep1.units.map(function (u) { return u.planM.map(r0); }), plan2 = rep1.units.map(function (u) { return unit(rep2, u.id).planM.map(r0); });
        var copied = JSON.stringify(r1.snapshot.plan['sku.watsons']) === JSON.stringify(S().get('plan.2027.sku.watsons'));
        var balanced = ['watsons', 'shopee', 'lazada', 'tiktok'].every(function (id) { var u = unit(rep2, id); return Math.abs(c.sum(u.targetM) - u.target) < 1; });
        var out = [R().list().map(function (r) { return r.id + ':' + r.status; }), [r1.lockedAt, /MD/.test(r1.lockedBy)], [r2.effectiveMonth, r2.base.before, r2.reason, r2.basedOn], rep2.total.amount,
          unitsEq && chEq, JSON.stringify(plan1) === JSON.stringify(plan2), balanced, [copied, R().selectedId() === '2027-R2']];
        S().reset();
        return out;
      }
    },
    {
      name: 'cr38-22. (เบราว์เซอร์) ห้ามแก้ย้อนหลังทุกบทบาท (รวมผู้ดูแลระบบ · บังคับที่ Store): รอบ Lock (รายการ · Snapshot) · เดือนก่อนเดือนที่มีผล (หน่วยขาย × เดือน · SKU × เดือน) · เป้าต่ำกว่าส่วนที่ล็อก = ปฏิเสธ · เดือนที่เปิดแก้ได้ · รอ Lock = ปฏิเสธทุกค่า',
      expected: [true, ['submitted', 'submitted', 'submitted', 'submitted']],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test
        S().reset();
        R().loadSample();
        var all = users().every(function (u) {
          S().set('ui.role', { userId: u.id });
          var res = [
            attempt(function () { bump('revision.list', function (v) { v[0].reason = 'x'; }); }),
            attempt(function () { bump('revision.snap.2027-R1', function (v) { v.report.total.amount = 1; }); }),
            attempt(function () { bump('plan.2027.phasing.watsons', function (v) { v.monthPct[0] = 0.5; }); }),
            attempt(function () { bump('plan.2027.sku.watsons', function (v) { var k = Object.keys(v.items)[0]; v.items[k].qty[2] = 999; v.items[k].overrides[2] = true; }); }),
            attempt(function () { bump('plan.2027.topDown', function (v) { v.total = 1000000; }); }),
            attempt(function () { R().assertWritable('2027-R1', '2027-06'); }),
            attempt(function () { R().assertWritable('2027-R2', '2027-02'); })
          ];
          return res.join() === 'locked,snapshot,beforeEffective,beforeEffective,belowLocked,locked,beforeEffective';
        });
        S().set('ui.role', { userId: 'u-admin' });
        var open = attempt(function () { bump('plan.2027.sku.watsons', function (v) { var k = Object.keys(v.items)[0]; v.items[k].qty[6] = 321; v.items[k].overrides[6] = true; }); });
        submitRev('2027-R2');
        var sub = [
          attempt(function () { bump('plan.2027.sku.watsons', function (v) { var k = Object.keys(v.items)[0]; v.items[k].qty[8] = 1; v.items[k].overrides[8] = true; }); }),
          attempt(function () { bump('plan.2027.topDown', function (v) { v.total = 124000000; }); }),
          attempt(function () { bump('plan.2027.phasing.shopee', function (v) { v.monthPct[9] = 0.2; }); }),
          attempt(function () { R().assertWritable('2027-R2', '2027-10'); })
        ];
        S().reset();
        return [all && open === 'ok', sub];
      }
    },
    {
      name: 'cr38-23. (เบราว์เซอร์) Snapshot: แก้ RSP · GP · ชื่อสินค้า · Status สินค้าใน Master หลัง Lock R1 แล้ว ตัวเลขของ R1 (รายงาน · แผน SKU · ชื่อสินค้า) ไม่เปลี่ยน · Object ของรอบ Lock แก้ไม่มีผล',
      expected: [true, true, true, true, ['locked', 120000000]],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test
        S().reset();
        R().loadSample();
        R().select('2027-R1');
        var c = calc();
        var before = SP.core.report.current().report;
        var g0 = c.skuPlanGrid(R().data(), R().master(), 'watsons', R().read('sku.watsons'), { year: YEAR, mode: 'initial', revisionLock: R().gridLock('watsons') });
        var key = g0.rows[0].key;
        var name0 = c.findProduct(R().master().products, key).name;
        var bp = S().get('master.basePrices');
        bp.push({ productKey: key, priceType: 'RSP', effectiveMonth: '2026-10', price: 999, by: 't', at: 't' });
        S().set('master.basePrices', bp);
        var acc = S().get('master.accounts');
        acc.forEach(function (a) { if (a.id === 'watsons') a.gp = 0.9; });
        S().set('master.accounts', acc);
        var ps = S().get('master.products');
        ps.forEach(function (p) { if (c.productKey(p) === key) { p.name = 'เปลี่ยนชื่อ'; p.discontinueMonth = '2026-10'; } });
        S().set('master.products', ps);
        var after = SP.core.report.current().report;
        var g1 = c.skuPlanGrid(R().data(), R().master(), 'watsons', R().read('sku.watsons'), { year: YEAR, mode: 'initial', revisionLock: R().gridLock('watsons') });
        var fr = R().get('2027-R1');
        try { fr.status = 'draft'; fr.snapshot.report.total.amount = 1; } catch (e) { /* Frozen (strict mode โยน Error) */ }
        var out = [JSON.stringify(before) === JSON.stringify(after), Math.abs(g0.yearTotal.net - g1.yearTotal.net) < 0.01, c.findProduct(R().master().products, key).name === name0,
          c.findProduct(S().get('master.products'), key).name === 'เปลี่ยนชื่อ', [R().get('2027-R1').status, R().get('2027-R1').snapshot.report.total.amount]];
        S().reset();
        return out;
      }
    },
    {
      name: 'cr38-24. (เบราว์เซอร์ · CR-39 ปิด Flag approval) วงจรสถานะตามสิทธิ์: Management เสนอ Lock R2 ได้ · Lock ไม่ได้ (สิทธิ์) · MD พิมพ์ชื่อผิด = Lock ไม่ได้ · MD ส่งกลับต้องมีข้อความ · MD Lock ได้ · เปิด R3 ได้หลัง Lock · history ครบทุกขั้น',
      expected: ['permission', 'permission', 'note', 'confirmName', [true, 'locked'], ['open', 'submit', 'return', 'submit', 'lock'], ['2027-R3', 'draft', '2027-06'], 'open'],
      actual: function () { return withoutApproval(function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test
        S().reset();
        R().loadSample();
        S().set('ui.role', { userId: 'u-director' });
        var a = R().submit('2027-R2').error;
        S().set('ui.role', { userId: 'u-mgmt' });
        R().submit('2027-R2', { note: 'พร้อม' });
        var b = R().lock('2027-R2', { confirmName: '2027 R2' }).error;
        S().set('ui.role', { userId: 'u-md' });
        var cnote = R().returnToDraft('2027-R2', { note: ' ' }).error;
        R().returnToDraft('2027-R2', { note: 'ตรวจ MT อีกครั้ง' });
        S().set('ui.role', { userId: 'u-mgmt' });
        R().submit('2027-R2');
        S().set('ui.role', { userId: 'u-md' });
        var d = R().lock('2027-R2', { confirmName: '2027 R' }).error;
        var e = R().lock('2027-R2', { confirmName: '2027 R2' });
        S().set('ui.role', { userId: 'u-mgmt' });
        var f = R().open({ year: YEAR, effectiveMonth: '2027-06', reason: 'ทดสอบ' });
        var g = R().open({ year: YEAR, effectiveMonth: '2027-07', reason: 'ซ้ำ' }).error;
        var out = [a, b, cnote, d, [e.ok, R().get('2027-R2').status], R().get('2027-R2').history.map(function (x) { return x.action; }), [f.rev.id, f.rev.status, f.rev.effectiveMonth], g];
        S().reset();
        return out;
      }); }
    }
    ,{
      name: 'cr38-25. (เบราว์เซอร์) compareRevisions R1 กับ R2 (ข้อมูลตัวอย่าง): Total +3,000,000 · ส่วนต่างรวม Channel / หน่วยขาย = Total · ม.ค.–มี.ค. ส่วนต่าง 0 ทุกระดับ (รวม SKU) · แผน SKU ไม่เปลี่ยน · A = B = 0 · เดือนล็อก 3',
      expected: [3000000, [3000000, 3000000], [true, true, true], [0, 0], true, 3],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test
        S().reset();
        R().loadSample();
        var C2 = function (lv, o) { var x = { level: lv, view: 'month' }; Object.keys(o || {}).forEach(function (k) { x[k] = o[k]; }); return R().compare('2027-R1', '2027-R2', x); };
        var tot = R().compare('2027-R1', '2027-R2', { level: 'total' }).total.diff;
        var ch = R().compare('2027-R1', '2027-R2', { level: 'channel' }).total.diff, un = R().compare('2027-R1', '2027-R2', { level: 'unit' }).total.diff;
        function zero3(res) { return res.rows.every(function (r) { return r.dM.slice(0, 3).every(function (v) { return Math.abs(v) < 0.01; }); }); }
        var locked = [zero3(C2('channel')), zero3(C2('unit')), zero3(C2('sku', { filter: { unitId: 'watsons' } }))];
        var plan = [r0(R().compare('2027-R1', '2027-R2', { level: 'series' }).total.diff), r0(R().compare('2027-R1', '2027-R2', { level: 'sku', metric: 'units', filter: { channelId: 'ecom' } }).total.diff)];
        var same = R().compare('2027-R2', '2027-R2', { level: 'unit', view: 'month' }).rows.every(function (r) { return Math.abs(r.diff) < 0.01; });
        var lb = C2('channel').lockBefore;
        S().reset();
        return [r0(tot), [r0(ch), r0(un)], locked, plan, same, lb];
      }
    }
  ];
})();
