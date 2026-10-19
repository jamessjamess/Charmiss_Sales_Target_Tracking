/*
 * tests/cr41.test.js — Test ของ CR-41 (นาฬิกากลางตามสถานการณ์ Demo · S1 = ระบบเดิม · ไม่มีเดือน / ปีเขียนตายตัว)
 *
 * รันด้วย Node: node tests/run.js cr41 / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   node: true = อ่านไฟล์ในโฟลเดอร์ด้วย SP.testFiles (มีเฉพาะ tests/run.js) — หน้า Test บนเบราว์เซอร์ข้ามข้อเหล่านี้
 *   ข้อมูลตั้งต้น = สถานการณ์ S1 (ไม่มี sessionStorage ใน Node) · S2 ใช้ clock.withScenario('S2') ชั่วคราว
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function D() { return SP.data; }
  function K() { return SP.core.clock; }
  function calc() { return SP.core.calc; }
  function F() { return SP.testFiles; }
  function SC() { return SP.core.scenario; }
  // กติกาเดิมของ S1 (ก่อน CR-41): ม.ค.–ส.ค. = ยอดจริงปี 2026 · ก.ย.–ธ.ค. = ยอดจริงปี 2025 · ปี 2026 มียอดจริง 8 เดือน
  function oldUnitRef(H, unitId) {
    var out = [];
    for (var m = 0; m < 12; m++) {
      var y = m < 8 ? 2026 : 2025;
      var yr = H.years[y], row = yr && yr.monthly[unitId];
      var n = yr && yr.actualMonths != null ? yr.actualMonths : 12;
      out.push(row && m < n ? (row[m] || 0) : null);
    }
    return out;
  }
  function oldSkuRef(H, unitId, key) {
    function q(y) { var s = H.years[y] && H.years[y].skuQty && H.years[y].skuQty[unitId]; return (s && s[key]) || null; }
    var latest = q(2026), older = q(2025);
    if (!latest && !older) return null;
    var out = [];
    for (var m = 0; m < 12; m++) {
      var y = m < 8 ? 2026 : 2025, src = y === 2026 ? latest : older;
      out.push(src ? (src[m] || 0) : (latest && y !== 2026 ? (latest[m] || 0) : 0));
    }
    return out;
  }
  // ค่าสีที่เขียนตรงไม่เกี่ยว · ที่นี่ = เดือน / ปีที่เขียนตายตัว (ข้อ 1.3) ในโค้ดหน้าจอและข้อความ (ไม่นับบรรทัดคำอธิบาย)
  var HARD_RE = /2026-09|ก\.ย\. 2026|ส\.ค\. 26|DEMO_CURRENT_MONTH/;
  function codeOf(line) { var t = line.trim(); return /^(\/\/|\*|\/\*)/.test(t) ? '' : line.replace(/\s\/\/\s.*$/, ''); }

  SP.tests.cr41 = [
    {
      name: 'cr41-1. นาฬิกากลาง S1 (ค่าตั้งต้น): เดือนปัจจุบัน ก.ย. 2026 · เดือนปิดล่าสุด ส.ค. 2026 · ข้อมูล ณ 30 ก.ย. 2026 · L12M ก.ย. 2025 – ส.ค. 2026 · ปีแผน 2027 · สิ้นสุดแผน ธ.ค. 2027',
      expected: ['S1', '2026-09', '2026-08', '2026-09-30', { from: '2025-09', to: '2026-08' }, 2027, '2027-12'],
      actual: function () { return [K().scenarioId(), K().currentMonth(), K().lastClosedMonth(), K().asOfDate(), K().l12mRange(), K().planYear(), K().horizonEnd()]; }
    },
    {
      name: 'cr41-2. นาฬิกากลาง S2 (clock.withScenario): เดือนปัจจุบัน ก.พ. 2027 · เดือนปิดล่าสุด ม.ค. 2027 · ข้อมูล ณ 26 ก.พ. 2027 · L12M ก.พ. 2026 – ม.ค. 2027 · ปีแผน 2027 · สิ้นสุดแผนเท่าเดิม · กลับ S1 หลังจบ',
      expected: [['S2', '2027-02', '2027-01', '2027-02-26', { from: '2026-02', to: '2027-01' }, 2027, '2027-12'], 'S1'],
      actual: function () {
        var s2 = K().withScenario('S2', function () { return [K().scenarioId(), K().currentMonth(), K().lastClosedMonth(), K().asOfDate(), K().l12mRange(), K().planYear(), K().horizonEnd()]; });
        return [s2, K().scenarioId()];
      }
    },
    {
      name: 'cr41-3. ยอดอ้างอิงรายเดือนแบบทั่วไป = ปีล่าสุดที่เดือนนั้นปิดแล้ว: S1 ม.ค.–ส.ค. 2026 · ก.ย.–ธ.ค. 2025 / S2 ม.ค. 2027 · ก.พ.–ธ.ค. 2026 · เดือนที่ยังไม่ปิดไม่ใช้',
      expected: [[2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2025, 2025, 2025, 2025], [2027, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026], [true, false, false]],
      actual: function () {
        var ys = function () { var o = []; for (var m = 0; m < 12; m++) o.push(K().referenceYear(m)); return o; };
        return [ys(), K().withScenario('S2', ys), [K().isClosed(2026, 7), K().isClosed(2026, 8), K().isClosed(2027, 0)]];
      }
    },
    {
      name: 'cr41-4. S1 = ระบบเดิม: ยอดอ้างอิงตามกติกาใหม่ได้ค่าเดิมทุกหน่วยขาย (21 หน่วย) และทุก SKU × หน่วยขาย · ผลรวม 12 เดือน = L12M',
      expected: [[], [], true, true],
      actual: function () {
        var H = D().history, badU = [], badS = [], n = 0, sumOk = true;
        calc().allUnits(D()).forEach(function (u) {
          var now = calc().referenceMonthly(D(), u.id).map(function (r) { return r.value; });
          if (JSON.stringify(now) !== JSON.stringify(oldUnitRef(H, u.id))) badU.push(u.id);
          var v = calc().referenceValues(calc().referenceMonthly(D(), u.id));
          if (v && Math.abs(calc().sum(v) - calc().l12m(D(), u.id)) > 1e-6) sumOk = false;
        });
        var seen = {};
        Object.keys(H.years).forEach(function (y) {
          var q = H.years[y].skuQty || {};
          Object.keys(q).forEach(function (uid) { Object.keys(q[uid]).forEach(function (k) { seen[uid + '|' + k] = [uid, k]; }); });
        });
        Object.keys(seen).forEach(function (uk) {
          var p = seen[uk], r = calc().skuReference(H, p[0], p[1]);
          n++;
          if (JSON.stringify(r ? r.monthly : null) !== JSON.stringify(oldSkuRef(H, p[0], p[1]))) badS.push(uk);
        });
        return [badU, badS.slice(0, 5), n > 500, sumOk];
      }
    },
    {
      name: 'cr41-5. เวลาที่ประทับในการกระทำ = วันที่ของสถานการณ์ + เวลาจริง (clock.now · S1 30 ก.ย. 2026 · S2 26 ก.พ. 2027) · วันที่ในชื่อไฟล์ส่งออก = วันที่ของสถานการณ์',
      expected: ['2026-09-30T', 19, '2027-02-26T'],
      actual: function () {
        var a = K().now();
        return [a.slice(0, 11), a.length, K().withScenario('S2', function () { return K().now().slice(0, 11); })];
      }
    },
    {
      name: 'cr41-6. เดือนที่มีผลของ Revision = เดือนถัดจากเดือนปัจจุบันเสมอ (ไม่ก่อนเดือนแรกของปีแผน): S1 = ม.ค. 2027 · S2 = มี.ค. 2027 · เดือนที่ปิดแล้วเป็นเดือนที่มีผลไม่ได้',
      expected: ['2027-01', '2027-03', true, false],
      actual: function () {
        var R = SP.core.revision;
        return [R.defaultEffective(2027), K().withScenario('S2', function () { return R.defaultEffective(2027); }),
          K().withScenario('S2', function () { return !!R.effectiveIssue(2027, '2027-01'); }), !!R.effectiveIssue(2027, '2027-01')];
      }
    },
    {
      name: 'cr41-7. (Node) ไม่มีเดือน / ปีเขียนตายตัวตามข้อ 1.3 (2026-09 · ก.ย. 2026 · ส.ค. 26 · DEMO_CURRENT_MONTH) ในโค้ดหน้าจอ (modules/ · core/) และ content.js · guide.js · settings.js',
      node: true,
      expected: [],
      actual: function () {
        var files = F().list('modules', ['.js']).concat(F().list('core', ['.js']), ['data/content.js', 'data/guide.js', 'data/settings.js']);
        var out = [];
        files.forEach(function (f) {
          F().read(f).split(/\r?\n/).forEach(function (line, i) { if (HARD_RE.test(codeOf(line))) out.push(f + ':' + (i + 1)); });
        });
        return out;
      }
    },
    {
      name: 'cr41-8. S2 ยอดจริงตัวอย่าง (scenario.buildSample): ก.ย. 2026 – ม.ค. 2027 · คำนวณซ้ำได้ค่าเดิมทุกครั้ง (ไม่สุ่ม) · ทำเครื่องหมาย isSample รายเดือน · ปี 2026 มียอดจริงครบ 12 เดือน · ปี 2027 = 1 เดือน · ไม่แก้ข้อมูลเดิม',
      expected: [['2026-09', '2026-10', '2026-11', '2026-12', '2027-01'], true, [false, false, false, false, false, false, false, false, true, true, true, true], [true, false], [12, 1], [8, false]],
      actual: function () {
        var sc = SC().find('S2');
        var a = SC().buildSample(D(), sc), b = SC().buildSample(D(), sc);
        var y26 = a.history.years[2026], y27 = a.history.years[2027];
        return [a.months, JSON.stringify(a.history) === JSON.stringify(b.history) && JSON.stringify(a.actuals) === JSON.stringify(b.actuals), y26.sample, y27.sample.slice(0, 2),
          [y26.actualMonths, y27.actualMonths], [D().history.years[2026].actualMonths, !!D().history.years[2027]]];
      }
    },
    {
      name: 'cr41-9. S2 L12M = ก.พ. 2026 – ม.ค. 2027 = ผลรวมยอดจริง (รวมยอดตัวอย่าง) ช่วงนั้น · ยอดอ้างอิง ม.ค. มาจากปี 2027 · ก.พ.–ธ.ค. จากปี 2026 · นาฬิกา S1 ไม่ใช้ยอดตัวอย่าง (L12M เท่าเดิม)',
      expected: [{ from: '2026-02', to: '2027-01' }, true, [2027, 2026, 2026], true, true],
      actual: function () {
        var res = SC().buildSample(D(), SC().find('S2'));
        var d2 = {};
        Object.keys(D()).forEach(function (k) { d2[k] = D()[k]; });
        d2.history = res.history;
        var H = res.history.years;
        var direct = calc().sum(H[2026].monthly.seven.slice(1)) + H[2027].monthly.seven[0];
        var s2 = K().withScenario('S2', function () {
          var ref = calc().referenceMonthly(d2, 'seven');
          return [K().l12mRange(), Math.abs(calc().l12m(d2, 'seven') - direct) < 1e-6, [ref[0].sourceYear, ref[1].sourceYear, ref[11].sourceYear], ref[0].value === H[2027].monthly.seven[0]];
        });
        return s2.concat([calc().l12m(d2, 'seven') === calc().l12m(D(), 'seven')]);
      }
    },
    {
      name: 'cr41-10. สูตรยอดตัวอย่าง: ก.ย. 2026 = ยอด ก.ย. 2025 × (1 + การเติบโตของ Channel = เป้าหมาย 2027 เทียบ L12M ใน S1) · ม.ค. 2027 = แผน R1 ของ ม.ค. × ตัวคูณ (MT 0.95 · ECOM 1.12) ระดับ SKU และ Net Sales ของหน่วย · ตัวคูณอยู่ใน data/scenarios.js',
      expected: [true, true, true, true, true, { mt: 0.95, tt: 1, ecom: 1.12 }],
      actual: function () {
        var sc = SC().find('S2'), res = SC().buildSample(D(), sc), H = res.history.years;
        var base = K().withScenario('S1', function () {
          var t = D().targets.years[2027];
          var tree = calc().topDown(D(), { total: t.total, channels: t.channels.slice(), pct: JSON.parse(JSON.stringify(t.pct)), units: JSON.parse(JSON.stringify(t.units)) }, 2027);
          var g = {}, amt = {};
          tree.children.forEach(function (ch) { g[ch.id] = ch.amount / ch.prior - 1; ch.children.forEach(function (u) { amt[u.id] = u.amount; }); });
          function grid(u) { var seeds = D().planSeeds.years[2027][u]; return calc().skuPlanGrid(D(), D(), u, calc().defaultSkuPlan(D(), u, 2027, true, seeds), { year: 2027, mode: 'initial', target: amt[u] }); }
          return { g: g, seven: grid('seven'), shopee: grid('shopee') };
        });
        var sepOk = H[2026].monthly.seven[8] === Math.round(D().history.years[2025].monthly.seven[8] * (1 + base.g.mt));
        var q25 = D().history.years[2025].skuQty.seven, k = Object.keys(q25).filter(function (x) { return q25[x][8] > 0 && H[2026].skuQty.seven[x][8] > 0; })[0];
        var skuSepOk = !!k && H[2026].skuQty.seven[k][8] === Math.round(q25[k][8] * (1 + base.g.mt));
        var r7 = base.seven.rows.filter(function (r) { return r.cells[0].units > 0; })[0];
        var janSku = !!r7 && H[2027].skuQty.seven[r7.key][0] === Math.round(r7.cells[0].units * 0.95);
        var janNet = H[2027].monthly.seven[0] === Math.round(base.seven.totals.net[0] * 0.95) && H[2027].monthly.shopee[0] === Math.round(base.shopee.totals.net[0] * 1.12);
        var act = res.actuals.years[2027].seven[r7.key][0] === H[2027].skuQty.seven[r7.key][0];
        return [sepOk, skuSepOk, janSku, janNet, act, sc.build.planFactor];
      }
    },
    {
      name: 'cr41-11. ยอดจริงของปีแผน (calc.actualMonthly · actualToDate): S1 ยังไม่มีเดือนที่ปิดในปีแผน (null) · S2 = ม.ค. 2027 (ยอดจริงตัวอย่าง) รายหน่วย / Channel / Total · เดือนที่ยังไม่ปิด = null · ยอดจริงรายชิ้นของ SKU (actualSkuUnits)',
      expected: [null, [1, '2027-01', '2027-01'], true, true, [true, null], true, null],
      actual: function () {
        var res = SC().buildSample(D(), SC().find('S2'));
        var d2 = {};
        Object.keys(D()).forEach(function (k) { d2[k] = D()[k]; });
        d2.history = res.history;
        var H = res.history.years;
        var s1 = calc().actualToDate(D(), 'mt', 2027);
        return [s1].concat(K().withScenario('S2', function () {
          var a = calc().actualToDate(d2, 'mt', 2027);
          var mtUnits = calc().unitsOfChannel(d2, 'mt').map(function (u) { return u.id; });
          var direct = calc().sum(mtUnits.map(function (u) { return (H[2027].monthly[u] || [])[0] || 0; }));
          var tot = calc().actualMonthly(d2, null, 2027);
          var chSum = calc().sum(['mt', 'tt', 'ecom'].map(function (c) { return calc().actualMonthly(d2, c, 2027)[0]; }));
          var k = Object.keys(H[2027].skuQty.seven)[0];
          return [[a.months, a.from, a.to], a.value === direct, Math.abs(tot[0] - chSum) < 1e-6, [tot[0] > 0, tot[1]],
            calc().actualSkuUnits(d2.history, 'seven', k, 2027, 0) === H[2027].skuQty.seven[k][0], calc().actualSkuUnits(d2.history, 'seven', k, 2027, 1)];
        }));
      }
    },
    {
      name: 'cr41-20. (เบราว์เซอร์) S1 = ระบบเดิม: Net Sales รวมแผน 111,310,349 · เป้าหมายรวม 120 ล้าน · ผู้รับผิดชอบในรายงาน ณ เดือนปัจจุบันของนาฬิกา (EVEANDBOY = วิทยา สมใจ ณ ก.ย. 2026)',
      expected: [111310349, 120000000, 'วิทยา สมใจ'],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test (Node ข้ามข้อนี้)
        SP.core.store.reset();
        var rep = SP.core.report.build();
        var eve = rep.units.filter(function (u) { return u.id === 'eveandboy'; })[0];
        var out = [Math.round(calc().sum(rep.units.map(function (u) { return u.plan; }))), rep.total.amount, eve && eve.owner ? eve.owner.name : null];
        SP.core.store.reset();
        return out;
      }
    }
    ,{
      name: 'cr41-21. (เบราว์เซอร์) โหลด S2: R1 Lock แล้วพร้อม Snapshot · คำขอของ R1 approved (ส่ง 10 ธ.ค. 2026 · ความคิดเห็นของ MD · อนุมัติ 15 ธ.ค. 2026) · ประวัติ สร้าง → ส่ง → อนุมัติและ Lock · ไม่มี R2 · ตั้งค่าขั้นอนุมัติตั้งต้น · ตัวเลขของ R1 = S1 · หน้าแรก Plan Summary แท็บ Revision · สลับกลับ S1 = ข้อมูลตั้งต้น',
      expected: [[true, 'summary#revision', 'S2'], ['locked', true], 1, [['approved', '2026-12-10', 'เป้าหมายปี 2027 ฉบับแรก', ['อนุมัติ ติดตาม ECOM รายไตรมาส']]], ['create', 'submit', 'lock'], { sdConfirm: false }, true, [true, 'S1', 'draft', 1, 0]],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test (Node ข้ามข้อนี้)
        var S = SP.core.store, R = SP.core.revision, A = SP.core.approval;
        S.reset();
        var s1 = SP.core.report.build().units.map(function (u) { return [u.id, Math.round(u.target), Math.round(u.plan), u.planM.map(Math.round)]; });
        var res = SC().load('S2');
        var r1 = R.get('2027-R1');
        var rep = SP.core.report.build({ revisionId: '2027-R1' }).units.map(function (u) { return [u.id, Math.round(u.target), Math.round(u.plan), u.planM.map(Math.round)]; });
        var out = [[res.ok, res.home + '#' + res.homeTab, K().scenarioId()], [r1.status, !!R.snapshotOf('2027-R1')], R.list().length,
          A.list().map(function (q) { return [q.status, String(q.createdAt).slice(0, 10), q.note, (q.comments || []).map(function (c) { return c.text; })]; }),
          r1.history.map(function (x) { return x.action; }), A.config(), JSON.stringify(rep) === JSON.stringify(s1)];
        var back = SC().load('S1');
        out.push([back.ok, K().scenarioId(), R.get('2027-R1').status, R.list().length, A.list().length]);
        S.reset();
        return out;
      }
    },
    {
      name: 'cr41-22. (เบราว์เซอร์) S2 เดินครบ 7 ขั้นด้วยฟังก์ชัน: Management เปิด R2 มีผล มี.ค. 2027 · ม.ค.–ก.พ. เขียนไม่ได้ · ปรับ Total / Channel (ECOM +4 ล้าน · MT −1 ล้าน) · Sales Director จัดสรรรายเดือน มี.ค.–ธ.ค. · Sales ปรับแผน SKU และเพิ่มสินค้า · ส่งขออนุมัติ · MD อนุมัติและ Lock → R2 Lock แล้ว · compareRevisions ม.ค.–ก.พ. ส่วนต่าง 0',
      expected: ['2027-R2', '2027-03', ['beforeEffective', 'beforeEffective', 'ok'], ['ok', 'ok', 'ok'], [true, true], true, true, ['locked', 'approved'], [0, 0], 3000000],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test (Node ข้ามข้อนี้)
        var S = SP.core.store, R = SP.core.revision, A = SP.core.approval, P = SP.core.permissions, c = calc();
        function as(uid) { S.set('ui.role', { userId: uid }); }
        function attempt(fn) { try { fn(); return 'ok'; } catch (e) { return e.approval || (e.revision && e.revision.code) || String(e.message); } }
        SC().load('S2');
        as('u-mgmt');
        var o = R.open({ year: 2027, reason: 'ECOM โตกว่าเป้า MT ต่ำกว่าเป้า' });
        var id = o.rev.id;
        var w = ['2027-01', '2027-02', '2027-03'].map(function (k) { return attempt(function () { R.assertWritable(id, k); }); });
        // 2) Total / Channel
        var key = 'plan.2027.topDown', td = S.get(key), tree = c.topDown(S.data(), td, 2027);
        var total = tree.amount + 3000000, next = JSON.parse(JSON.stringify(td)), after = {};
        tree.children.forEach(function (ch) {
          var amt = ch.amount + (ch.id === 'ecom' ? 4000000 : ch.id === 'mt' ? -1000000 : 0);
          next.pct[ch.id] = amt / total;
          ch.children.forEach(function (u) { after[u.id] = ch.amount ? u.amount * amt / ch.amount : 0; });
        });
        next.total = total;
        var s2 = attempt(function () { S.set(key, next); });
        // 3) Sales Director: รายเดือน มี.ค.–ธ.ค. ของทุกหน่วยที่เป้าเปลี่ยน
        as('u-director');
        var s3 = attempt(function () {
          Object.keys(after).forEach(function (u) {
            var pk = 'plan.2027.phasing.' + u, ph = S.get(pk);
            S.set(pk, { monthPct: c.fillOpenMonths(after[u], ph.monthPct, R.lockedTargets(u, id)), edited: true });
          });
        });
        // 4) Sales: ปรับแผน SKU (พ.ค.) และเพิ่มสินค้าในแผน (Watsons)
        as('u-sp-pim');
        var sk = 'plan.2027.sku.watsons', plan = JSON.parse(JSON.stringify(S.get(sk)));
        var k0 = Object.keys(plan.items)[0];
        plan.items[k0].qty[4] = (plan.items[k0].qty[4] || 0) + 50; plan.items[k0].overrides[4] = true;
        var ctx = { data: S.data(), master: S.master(), plan: plan, unitId: 'watsons', year: 2027 };
        var pick = SP.core.planEdits.candidates(ctx).existing.filter(function (a) { return !a.blocked && !plan.items[a.key]; })[0];
        var add = pick ? SP.core.planEdits.addToPlan(ctx, P.user(), 'mt', 'existing', [pick.key], 3) : { ok: false };
        var s4 = add.ok ? attempt(function () { S.set(sk, add.plan); }) : 'add';
        // 5) Management ส่งขออนุมัติ · 6) MD อนุมัติและ Lock
        as('u-mgmt');
        var cr = A.create(id, { note: 'ปรับเป้า R2 ตามยอดจริง ม.ค.' });
        as('u-md');
        var ap = cr.ok ? A.approve(cr.req.id, { confirmName: o.rev.name }) : { ok: false };
        // 7) เปรียบเทียบ R1 กับ R2
        var cmp = R.compare('2027-R1', id, { level: 'unit', view: 'month' });
        var janFeb = [0, 1].map(function (m) { return Math.round(cmp.rows.reduce(function (s, r) { return s + Math.abs(r.dM[m]); }, 0)); });
        var out = [id, o.rev.effectiveMonth, w, [s2, s3, s4], [!!pick, add.ok], cr.ok, ap.ok, [R.get(id).status, cr.ok ? A.get(cr.req.id).status : null], janFeb,
          Math.round(R.compare('2027-R1', id, { level: 'total' }).total.diff)];
        S.reset();
        return out;
      }
    },
    {
      name: 'cr41-23. (เบราว์เซอร์) เริ่มสถานการณ์นี้ใหม่ใน S2 (หลังเปิด R2): R1 Lock แล้ว · ไม่มี R2 · คงมุมมองผู้ใช้ · สลับ S2 → S1 ได้ข้อมูล S1 ตั้งต้น (Net Sales รวมแผน 111,310,349)',
      expected: [['locked', 1, 'S2', 'u-mgmt'], ['S1', 'draft', 1, 111310349]],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test (Node ข้ามข้อนี้)
        var S = SP.core.store, R = SP.core.revision;
        S.reset();
        S.set('ui.role', { userId: 'u-mgmt' });
        SC().load('S2');
        R.open({ year: 2027, reason: 'ทดสอบ' });
        SC().load(K().scenarioId());
        var a = [R.get('2027-R1').status, R.list().length, K().scenarioId(), S.get('ui.role').userId];
        SC().load('S1');
        var rep = SP.core.report.build();
        var b = [K().scenarioId(), R.get('2027-R1').status, R.list().length, Math.round(calc().sum(rep.units.map(function (u) { return u.plan; })))];
        S.reset();
        return [a, b];
      }
    }
    ,{
      name: 'cr41-24. (เบราว์เซอร์) Revision Compare B = ยอดจริง (S2 · รายเดือน): ยอดจริงเฉพาะเดือนที่ปิดแล้ว (ม.ค. 2027) · เดือนอื่น 0 และ closed = false · ระดับ Channel ผลรวม = Total · บรรทัด จริง <ค่า> ต่ำกว่าเป้า = แดง สูงกว่า = เขียว + ข้อความยอดจริงตัวอย่าง',
      expected: [[true, false], true, true, [0, 0], ['actual-line text-short', 'จริง 90'], ['actual-line text-ok', true]],
      actual: function () {
        // เบราว์เซอร์เท่านั้น: ใช้ SP.core.store และ document. ของหน้า Test (Node ข้ามข้อนี้)
        var S = SP.core.store, R = SP.core.revision;
        var keep = SP.data.history;
        try {
          SP.data.history = SC().buildSample(D(), SC().find('S2')).history;
          SC().load('S2');
          var ds = R.actualDataset('2027-R1');
          var cmp = R.compare('2027-R1', R.ACTUAL, { level: 'channel', view: 'month' });
          var live = S.data();
          var jan = calc().sum(['mt', 'tt', 'ecom'].map(function (c) { return calc().actualMonthly(live, c, 2027)[0]; }));
          var lowL = SP.core.components.actualLine(90, 100, { format: SP.core.format.units });
          var hiL = SP.core.components.actualLine(120, 100, { sample: true });
          var out = [[ds.closed[0], ds.closed[1]], Math.abs(cmp.total.bM[0] - jan) < 1, Math.abs(ds.total.net[0] - jan) < 1, [cmp.total.bM[1], cmp.total.bM[11]],
            [lowL.className, lowL.textContent], [hiL.className, /ยอดจริงตัวอย่าง/.test(hiL.title)]];
          S.reset();
          return out;
        } finally { SP.data.history = keep; }
      }
    }
  ];
})();
