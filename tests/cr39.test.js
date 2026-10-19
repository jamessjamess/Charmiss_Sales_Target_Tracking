/*
 * tests/cr39.test.js — Test ของ CR-39 (Revision เป็นแท็บของ Plan Summary · Module Approval: คำขอ · ขั้นอนุมัติ · ชุดสรุป · ข้อบังคับที่ Store)
 *
 * รันด้วย Node: node tests/run.js cr39 / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   cr39-1..9 ฟังก์ชันล้วน (core/approval.js · calc ส่วนที่ 25 · สิทธิ์ · เมนู) · cr39-20.. (เบราว์เซอร์) ใช้ store จริงแล้วรีเซ็ตกลับเป็นข้อมูลตั้งต้น
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function A() { return SP.core.approval; }
  function R() { return SP.core.revision; }
  function P() { return SP.core.permissions; }
  function calc() { return SP.core.calc; }
  function S() { return SP.core.store; }
  function codes(list) { return list.map(function (s) { return s.status; }); }
  function as(userId) { S().set('ui.role', { userId: userId }); }
  function attempt(fn) { try { fn(); return 'ok'; } catch (e) { return e.approval || (e.revision && e.revision.code) || String(e.message); } }
  function r0(v) { return Math.round(v); }
  function base(extra) {
    var p = { refId: '2027-R2', type: 'revisionLock', by: 'Management', at: '2027-03-25T09:00:00', note: 'พร้อมแล้ว', summary: { total: 1 }, config: { sdConfirm: false }, revStatus: 'draft', blocking: 0 };
    Object.keys(extra || {}).forEach(function (k) { p[k] = extra[k]; });
    return p;
  }

  SP.tests.cr39 = [
    {
      name: 'cr39-1. ขั้นอนุมัติตามตั้งค่า: ค่าเริ่มต้น 2 ขั้น (Management ส่ง → MD · ขั้น Sales Director = skipped) · เปิด sdConfirm = 3 ขั้น (Management → Sales Director → MD) · ตั้งค่าตั้งต้นปิด',
      expected: [[['mgmtSubmit', 'management', 'approved'], ['sdConfirm', 'director', 'skipped'], ['mdLock', 'md', 'current']], ['approved', 'current', 'waiting'], { sdConfirm: false }, 'mdLock'],
      actual: function () {
        var a = A().stepsFor({ sdConfirm: false }, { by: 'x' }), b = A().stepsFor({ sdConfirm: true }, { by: 'x' });
        return [a.map(function (s) { return [s.key, s.role, s.status]; }), codes(b), A().defaultConfig(), A().currentStep({ status: 'pending', steps: a }).key];
      }
    },
    {
      name: 'cr39-2. สร้างคำขอ: ได้เมื่อ Revision เป็นร่าง + 3 ข้อบังคับครบ + มีข้อความ · 1 Revision มีคำขอ pending ได้ 1 รายการ · คำขอใหม่ = pending · id ต่อรอบ',
      expected: ['status', 'checks', 'note', true, 'pending', 'REQ-2027-R2-01', 'REQ-2027-R2-02'],
      actual: function () {
        var T = A().transition;
        var ok = T([], 'create', base());
        var again = T(ok.list, 'create', base());
        var closed = JSON.parse(JSON.stringify(ok.list));
        closed[0].status = 'returned';
        return [T([], 'create', base({ revStatus: 'submitted' })).error, T([], 'create', base({ blocking: 1, failed: ['unitMonthly'] })).error, T([], 'create', base({ note: '  ' })).error,
          ok.ok && ok.req.status === 'pending', again.error, ok.req.id, T(closed, 'create', base()).req.id];
      }
    },
    {
      name: 'cr39-3. วงจรคำขอ: MD ดำเนินการไม่ได้ก่อน Sales Director ยืนยัน · ยืนยันแล้ว MD เป็นขั้นปัจจุบัน · ถอนหลังขั้นถัดไปถูกดำเนินการไม่ได้ · ส่งกลับต้องมีข้อความ · คำขอที่ปิดแล้วแก้ไม่ได้ (เพิ่มความคิดเห็นได้)',
      expected: ['step', ['approved', 'approved', 'current'], 'withdraw', 'note', ['returned', 'ตรวจ MT', ['approved', 'approved', 'returned']], 'closed', 1, ['withdrawn', true], ['approved', 'approved']],
      actual: function () {
        var T = A().transition;
        var c = T([], 'create', base({ config: { sdConfirm: true } }));
        var id = c.req.id;
        var early = T(c.list, 'approve', { id: id }).error;
        var cf = T(c.list, 'confirm', { id: id, by: 'Sales Director' });
        var wd = T(cf.list, 'withdraw', { id: id }).error;
        var nonote = T(cf.list, 'return', { id: id, note: ' ' }).error;
        var rt = T(cf.list, 'return', { id: id, by: 'MD', note: 'ตรวจ MT' });
        var after = T(rt.list, 'approve', { id: id }).error;
        var cm = T(rt.list, 'comment', { id: id, by: 'MD', text: 'ภายหลัง' });
        var d = T([], 'create', base());
        var w = T(d.list, 'withdraw', { id: d.req.id, by: 'Management' });
        var ap = T(d.list, 'approve', { id: d.req.id, by: 'MD' });
        return [early, codes(cf.req.steps), wd, nonote, [rt.req.status, rt.req.returnNote, codes(rt.req.steps)], after, cm.req.comments.length,
          [w.req.status, A().canWithdraw(d.req)], [ap.req.status, ap.req.steps[2].status]];
      }
    },
    {
      name: 'cr39-4. ชุดสรุป (calc.revisionSummary): Total · L12M · การเติบโต · ส่วนต่างจากรอบก่อน · ราย Channel (% ของ Total) · 5 หน่วยขายที่เปลี่ยนมากสุด · ความครบของแผน SKU · กราฟรายเดือน · รอบแรก = ไม่มีส่วนต่าง · ตรวจการเปลี่ยนหลังส่ง',
      expected: [[1300, 1000, 0.3, 100, 0.0833], [['c1', 600, 700, 100, 0.5385], ['c2', 600, 600, 0, 0.4615]], ['u1', 'u3'], { ok: 1, short: 1, over: 1, empty: 0, shortTotal: 100, units: 3 },
        [null, null, 0], [3, 70], [[], ['total', 'channels']]],
      actual: function () {
        function u(id, ch, target, plan) { var m = []; for (var i = 0; i < 12; i++) m.push(target / 12); return { id: id, name: id.toUpperCase(), channelId: ch, target: target, plan: plan, targetM: m }; }
        function inp(seq, t1, t3) {
          var units = [u('u1', 'c1', t1, t1), u('u2', 'c2', 600, 500), u('u3', 'c1', t3, t3 + 50)];
          return { id: 'R' + seq, name: 'R' + seq, planYear: 2027, seq: seq, effectiveMonth: seq === 1 ? '2027-01' : '2027-04', lockBefore: seq === 1 ? 0 : 3,
            total: units[0].target + units[1].target + units[2].target, prior: 1000,
            channels: [{ id: 'c1', name: 'C1', amount: units[0].target + units[2].target }, { id: 'c2', name: 'C2', amount: 600 }], units: units, items: [], clearance: 70 };
        }
        var c = calc();
        var a = inp(1, 300, 300), b = inp(2, 420, 280);
        var s = c.revisionSummary(b, a), first = c.revisionSummary(a, null);
        var changed = JSON.parse(JSON.stringify(s));
        changed.total += 5; changed.channels[0].b += 5;
        return [[s.total, s.prior, Math.round(s.growth * 1e4) / 1e4, s.diff, Math.round(s.pct * 1e4) / 1e4], s.channels.map(function (x) { return [x.id, x.a, x.b, x.diff, Math.round(x.share * 1e4) / 1e4]; }),
          s.topUnits.map(function (x) { return x.id; }), s.sku, [first.diff, first.monthly.a, first.topUnits.length], [s.monthly.lockBefore, s.clearance],
          [c.revisionSummaryChanges(s, JSON.parse(JSON.stringify(s))), c.revisionSummaryChanges(s, changed)]];
      }
    },
    {
      name: 'cr39-5. สิทธิ์ Approval: หน้า ทุกบทบาทดู · Management / Sales Director / MD / ผู้ดูแลระบบแก้ไข · ส่งขออนุมัติ = Management · ยืนยัน = Sales Director · อนุมัติและ Lock = MD · ตั้งค่า = Management + ผู้ดูแลระบบ · ผู้ดูแลระบบทำขั้นแทนไม่ได้',
      expected: [['EDIT', 'EDIT', 'VIEW', 'VIEW', 'VIEW', 'VIEW', 'VIEW', 'EDIT', 'EDIT'], [true, false, false], [false, true, false], [false, false, true], [true, true, false, false], [false, false, false]],
      actual: function () {
        var ids = ['u-mgmt', 'u-director', 'u-sp-anan', 'u-sp-pim', 'u-product', 'u-supply', 'u-viewer', 'u-admin', 'u-md'];
        function u(id) { return P().user({ userId: id }); }
        return [ids.map(function (id) { return P().level(u(id), 'approval'); }),
          ['u-mgmt', 'u-director', 'u-md'].map(function (id) { return A().canStep('mgmtSubmit', u(id)); }),
          ['u-mgmt', 'u-director', 'u-md'].map(function (id) { return A().canStep('sdConfirm', u(id)); }),
          ['u-mgmt', 'u-director', 'u-md'].map(function (id) { return A().canStep('mdLock', u(id)); }),
          ['u-mgmt', 'u-admin', 'u-director', 'u-md'].map(function (id) { return A().canConfig(u(id)); }),
          ['mgmtSubmit', 'sdConfirm', 'mdLock'].map(function (k) { return A().canStep(k, u('u-admin')); })];
      }
    },
    {
      name: 'cr39-6. ย้ายแท็บ: ไม่มีกลุ่มเมนู REVISION · กลุ่ม APPROVAL ต่อจาก Sales Planning · หน้าเดิม Revision List / Compare ซ่อนและใช้สิทธิ์ของ Plan Summary · สิทธิ์เดิมของแท็บคงไว้ (ผู้ดูแลระบบ = ดู) · เปิด Revision อยู่ใต้แท็บ Revision',
      expected: [false, 1, [false, 'summary', false, 'summary'], ['EDIT', 'VIEW', 'VIEW', 'EDIT', 'VIEW'], ['VIEW', 'VIEW', 'VIEW'], ['revisionList', true, false], true],
      actual: function () {
        var reg = SP.core.registry;
        var a = reg.byId('revisionList'), b = reg.byId('revisionCompare');
        function u(id) { return P().user({ userId: id }); }
        var res = P().resources();
        var open = res.filter(function (r) { return r.id === 'revision.open'; })[0];
        return [reg.groups.indexOf('revision') >= 0, reg.groups.indexOf('approval'), [a.visible, a.perm, b.visible, b.perm],
          ['u-mgmt', 'u-director', 'u-viewer', 'u-md', 'u-admin'].map(function (id) { return P().level(u(id), 'revisionList'); }),
          ['u-viewer', 'u-admin', 'u-md'].map(function (id) { return P().level(u(id), 'revisionCompare'); }),
          [open.parent, P().can(u('u-mgmt'), 'revision.open'), P().can(u('u-admin'), 'revision.open')],
          !res.some(function (r) { return r.id === 'revision.submit' || r.id === 'revision.lock'; })];
      }
    },
    {
      name: 'cr39-7. ข้อความ: ไม่มีคำ รอ Lock เหลือใน content.js · สถานะ submitted = รออนุมัติ · ตรวจก่อนส่งขออนุมัติ · ชื่อขั้นอนุมัติ 3 ขั้น',
      expected: [false, 'รออนุมัติ', 'ตรวจก่อนส่งขออนุมัติ:', ['Management ส่งขออนุมัติ', 'Sales Director ยืนยันการจัดสรรหน่วยขายและรายเดือน', 'MD อนุมัติและ Lock']],
      actual: function () {
        var L = SP.data.content.labels;
        return [/รอ Lock/.test(JSON.stringify(SP.data.content)), L.revision.status.submitted, L.revision.card.checks, ['mgmtSubmit', 'sdConfirm', 'mdLock'].map(function (k) { return A().stepLabel(k); })];
      }
    },
    // ======================= เบราว์เซอร์ (store จริง) =======================
    {
      name: 'cr39-20. (เบราว์เซอร์) วงจรค่าเริ่มต้น: Management ส่ง → รออนุมัติและเขียนไม่ได้ → MD อนุมัติ → Snapshot + Lock แล้ว · ประวัติของรอบ สร้าง → ส่งขออนุมัติ → อนุมัติและ Lock · คำขอ approved',
      expected: [true, ['submitted', 'submitted', 'submitted'], [true, 'locked', 'approved'], ['create', 'submit', 'lock'], [0, 0]],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test
        S().reset();
        as('u-mgmt');
        var c = A().create('2027-R1', { note: 'เป้าหมาย 2027 พร้อมให้อนุมัติ' });
        var sub = c.ok && R().get('2027-R1').status === 'submitted';
        var ro = [attempt(function () { R().assertWritable('2027-R1', '2027-05'); }),
          attempt(function () { var v = S().get('plan.2027.topDown'); v.total += 1000; S().set('plan.2027.topDown', v); }),
          attempt(function () { var v = S().get('plan.2027.phasing.watsons'); v.monthPct[5] = 0.3; S().set('plan.2027.phasing.watsons', v); })];
        as('u-md');
        var ap = A().approve(c.req.id, { confirmName: '2027 R1' });
        var out = [sub, ro, [!!R().snapshotOf('2027-R1') && ap.ok, R().get('2027-R1').status, A().get(c.req.id).status],
          R().get('2027-R1').history.map(function (x) { return x.action; }), [A().waitingFor(P().user({ userId: 'u-md' })).length, A().waitingFor(P().user({ userId: 'u-mgmt' })).length]];
        S().reset();
        return out;
      }
    },
    {
      name: 'cr39-21. (เบราว์เซอร์) MD ส่งกลับ (ต้องมีข้อความ) → Revision ร่างและเขียนได้อีกครั้ง · ข้อความแสดงในแถบสถานะ · ส่งใหม่ได้ (คำขอที่ 2) · ถอนคำขอก่อนขั้นถัดไปได้',
      expected: ['note', ['draft', 'returned', 'ตรวจ MT อีกครั้ง', 'ok'], ['REQ-2027-R1-02', 'submitted', null], ['withdrawn', 'draft'], ['create', 'submit', 'return', 'submit', 'withdraw']],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test
        S().reset();
        as('u-mgmt');
        var c = A().create('2027-R1', { note: 'ส่งครั้งแรก' });
        as('u-md');
        var n = A().returnToDraft(c.req.id, { note: '  ' }).error;
        A().returnToDraft(c.req.id, { note: 'ตรวจ MT อีกครั้ง' });
        var w = attempt(function () { var v = S().get('plan.2027.topDown'); v.total += 1000; S().set('plan.2027.topDown', v); });
        var back = [R().get('2027-R1').status, A().get(c.req.id).status, R().get('2027-R1').returnNote, w];
        as('u-mgmt');
        var c2 = A().create('2027-R1', { note: 'ส่งใหม่' });
        var again = [c2.req.id, R().get('2027-R1').status, R().get('2027-R1').returnNote];
        var wd = A().withdraw(c2.req.id);
        var out = [n, back, again, [A().get(c2.req.id).status, R().get('2027-R1').status], R().get('2027-R1').history.map(function (x) { return x.action; })];
        S().reset();
        return out;
      }
    },
    {
      name: 'cr39-22. (เบราว์เซอร์) เปิดขั้น Sales Director: MD ดำเนินการไม่ได้ก่อน Sales Director ยืนยัน · Sales Director ส่งกลับ → ร่าง · ยืนยันแล้ว MD อนุมัติได้ · ถอนหลังยืนยันไม่ได้ · ไทม์ไลน์ 3 ขั้น',
      expected: [['approved', 'current', 'waiting'], 'permission', ['returned', 'draft'], ['approved', 'approved', 'current'], 'permission', ['approved', 'locked', ['approved', 'approved', 'approved']], [1, 0, 0, 1]],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test
        S().reset();
        as('u-admin');
        A().setConfig({ sdConfirm: true });
        as('u-mgmt');
        var c = A().create('2027-R1', { note: 'ขอยืนยัน' });
        var s0 = codes(A().get(c.req.id).steps);
        var waits = [A().waitingFor(P().user({ userId: 'u-director' })).length, A().waitingFor(P().user({ userId: 'u-md' })).length];
        as('u-md');
        var early = A().approve(c.req.id, { confirmName: '2027 R1' }).error;
        as('u-director');
        A().returnToDraft(c.req.id, { note: 'ตรวจรายเดือน TT' });
        var r1 = [A().get(c.req.id).status, R().get('2027-R1').status];
        as('u-mgmt');
        var c2 = A().create('2027-R1', { note: 'ส่งใหม่' });
        as('u-director');
        A().confirm(c2.req.id);
        var s1 = codes(A().get(c2.req.id).steps);
        waits.push(A().waitingFor(P().user({ userId: 'u-director' })).length, A().waitingFor(P().user({ userId: 'u-md' })).length);
        as('u-mgmt');
        var wd = A().withdraw(c2.req.id).error;
        as('u-md');
        A().approve(c2.req.id, { confirmName: '2027 R1' });
        var out = [s0, early, r1, s1, wd, [A().get(c2.req.id).status, R().get('2027-R1').status, codes(A().get(c2.req.id).steps)], waits];
        S().reset();
        return out;
      }
    },
    {
      name: 'cr39-23. (เบราว์เซอร์) กติกาอื่น: สร้างคำขอซ้ำขณะ pending ไม่ได้ · ผู้ดูแลระบบอนุมัติแทนไม่ได้ · เปลี่ยนตั้งค่าไม่กระทบคำขอ pending · Store ปฏิเสธ: ลบคำขอ · แก้คำขอที่ปิดแล้ว · อนุมัติโดยไม่ Lock · เปลี่ยนสถานะรอบตรงๆ',
      expected: ['pending', 'permission', [['approved', 'skipped', 'current'], true], ['remove', 'approve', 'approvalOnly', 'approvalOnly'], ['closed', 'ok', 'permission']],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test
        S().reset();
        as('u-mgmt');
        var c = A().create('2027-R1', { note: 'ส่ง' });
        var dup = A().create('2027-R1', { note: 'ซ้ำ' }).error;
        as('u-admin');
        var adm = A().approve(c.req.id, { confirmName: '2027 R1' }).error;
        A().setConfig({ sdConfirm: true });
        var kept = [codes(A().get(c.req.id).steps), A().config().sdConfirm];
        var key = A().KEY;
        var g = [
          attempt(function () { S().set(key, []); }),
          attempt(function () { var v = S().get(key); v[0].status = 'approved'; v[0].steps[2].status = 'approved'; S().set(key, v); }),
          attempt(function () { var v = S().get('revision.list'); v[0].status = 'locked'; S().set('revision.list', v); }),
          attempt(function () { R().submit('2027-R1', {}); var v = S().get('revision.list'); v[0].status = 'draft'; S().set('revision.list', v); })
        ];
        as('u-md');
        A().approve(c.req.id, { confirmName: '2027 R1' });
        var closed = [attempt(function () { var v = S().get(key); v[0].status = 'pending'; S().set(key, v); }), A().comment(c.req.id, { text: 'อนุมัติแล้ว' }).ok ? 'ok' : 'x'];
        as('u-viewer');
        closed.push(A().comment(c.req.id, { text: 'ผู้ดูรายงาน' }).error);
        S().reset();
        return [dup, adm, kept, g, closed];
      }
    },
    {
      name: 'cr39-24. (เบราว์เซอร์) ชุดสรุปของข้อมูลตัวอย่าง R2 เทียบ R1: Total และราย Channel = Annual Target ของรอบเดียวกัน · ส่วนต่าง = compareRevisions ระดับ Total / Channel · ระหว่างรออนุมัติ ชุดสรุปที่คำนวณใหม่ = ที่เก็บไว้',
      expected: [true, true, [3000000, true], true, [], [4, true, true], [3, '2027-04']],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test
        S().reset();
        R().loadSample();
        var s = R().summary('2027-R2');
        var tree = calc().topDown(R().data('2027-R2'), R().read('topDown', '2027-R2'), 2027);
        var tot = R().compare('2027-R1', '2027-R2', { level: 'total' });
        var chs = R().compare('2027-R1', '2027-R2', { level: 'channel' });
        var chOk = tree.children.every(function (c) { var x = s.channels.filter(function (y) { return y.id === c.id; })[0]; return x && r0(x.b) === r0(c.amount); });
        var diffOk = chs.rows.every(function (r) { var x = s.channels.filter(function (y) { return y.id === r.id; })[0]; return x && r0(x.diff) === r0(r.diff); });
        as('u-mgmt');
        var c = A().create('2027-R2', { note: 'ECOM ปรับขึ้น' });
        var stored = A().get(c.req.id).summary;
        var out = [r0(s.total) === r0(tree.amount), chOk, [r0(s.diff), r0(s.diff) === r0(tot.total.diff)], diffOk, A().summaryChanges(c.req.id),
          [s.topUnits.length, s.topUnits.some(function (u) { return u.id === 'watsons' && r0(u.diff) === -1000000; }), s.topUnits.every(function (u, i, l) { return !i || Math.abs(l[i - 1].diff) >= Math.abs(u.diff); })],
          [stored.monthly.lockBefore, stored.monthly.effectiveMonth]];
        S().reset();
        return out;
      }
    },
    {
      name: 'cr39-25. (เบราว์เซอร์) ข้อมูลตัวอย่าง: R1 มีคำขอ approved 1 รายการ (Management 10 ธ.ค. 2026 · MD 15 ธ.ค. 2026 · ความคิดเห็นจาก MD 1 รายการ) · R2 ร่าง ไม่มีคำขอ · ป้ายเมนูทุกบทบาท = 0',
      expected: [1, ['approved', '2026-12-10T10:00:00', '2026-12-15T10:00:00', 1, true], [null, 'draft'], ['create', 'submit', 'lock'], true],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test
        S().reset();
        R().loadSample();
        var l = A().list();
        var q = A().forRevision('2027-R1');
        var zero = P().usersNow().every(function (u) { return A().waitingFor(P().user({ userId: u.id })).length === 0; });
        var out = [l.length, [q.status, q.createdAt, q.closedAt, q.comments.length, /MD/.test(q.comments[0].by)], [A().forRevision('2027-R2'), R().get('2027-R2').status],
          R().get('2027-R1').history.map(function (x) { return x.action; }), zero];
        S().reset();
        return out;
      }
    },
    {
      name: 'cr39-26. (เบราว์เซอร์) ข้อมูลตั้งต้น: ไม่มีคำขอ · ตั้งค่าขั้นอนุมัติ = ค่าเริ่มต้น · ประวัติ R1 ไม่ว่าง (สร้างจากข้อมูลตั้งต้น) · ตัวเลขเท่าเดิม (Net Sales รวมแผน 111,310,349)',
      expected: [0, { sdConfirm: false }, ['create', '2026-09-01T09:00:00'], 111310349],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test
        S().reset();
        var h = R().get('2027-R1').history[0];
        var rep = SP.core.report.build();
        var out = [A().list().length, A().config(), [h.action, h.at], r0(calc().sum(rep.units.map(function (u) { return u.plan; })))];
        S().reset();
        return out;
      }
    }
  ];
})();
