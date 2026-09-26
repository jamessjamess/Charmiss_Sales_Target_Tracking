/*
 * tests/stores.test.js — Test ของ core/stores.js และ calc.performanceByPerson แบบมีร้านค้า (CR-16 ข้อ 7) ไม่ใช้ DOM
 *
 * รันด้วย Node: node tests/run.js stores / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 * ใช้ข้อมูลร้านค้าจริง (data/seed/seed-tt-stores.js ที่ core/stores.js นำเข้าแล้ว) ไม่แก้ข้อมูลต้นฉบับ (ทุกฟังก์ชันคืนสำเนาใหม่)
 *   ร้านที่ย้ายจากอัมพรไปสิริกาญจน์ = 711, 3212, 781 (TT-04 ถึง ก.ค. 2026 → TT-01 ตั้งแต่ ส.ค. 2026)
 *   4487 = เชียงใหม่ ยังไม่จัดสรร ม.ค.–ก.ค. 2026 / 8330 = ไม่ระบุจังหวัด / 2701 = TT-02 (ใช้ทดลองย้ายหลังอนุมัติ)
 * store: ไม่อ่าน ไม่เขียน
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function S() { return SP.core.stores; }
  function calc() { return SP.core.calc; }
  function D() { return SP.data; }
  function store(id) { return D().stores.filter(function (s) { return s.id === id; })[0]; }
  function withData(extra) { var d = {}; Object.keys(D()).forEach(function (k) { d[k] = D()[k]; }); Object.keys(extra).forEach(function (k) { d[k] = extra[k]; }); return d; }
  function ranges(list, id) {
    return list.filter(function (a) { return a.storeId === id; }).sort(function (a, b) { return a.fromMonth < b.fromMonth ? -1 : 1; })
      .map(function (a) { return [a.territoryId, a.fromMonth, a.toMonth]; });
  }
  function ownerName(unitId, key) {
    var id = calc().ownerOf(D().assignments, D().salespeople, unitId, key);
    var p = calc().findById(D().salespeople, id);
    return p ? p.name : null;
  }
  var UNITS = ['TT-01', 'TT-02', 'TT-03', 'TT-04'];

  SP.tests.stores = [
    {
      name: 'st-1. นำเข้า seed → ร้าน 220 · ยังไม่จัดสรร ณ ก.ย. 2026 = 9 · เขต 4 มี 99 ร้าน · ชื่อบุคคลธรรมดาถูกซ่อน 29 ร้าน · ใช้งาน 185 · ไม่ระบุจังหวัด 30',
      expected: [220, 9, 99, 29, true, 185, 30],
      actual: function () {
        var masked = D().stores.filter(function (s) { return s.masked; });
        var sum = S().summary(D(), '2026-09');
        return [D().stores.length, S().storesIn(D(), null, '2026-09').length, S().storesIn(D(), 'TT-04', '2026-09').length, masked.length,
          masked.every(function (s) { return /^ร้านค้า \S+ \(บุคคลธรรมดา\)$/.test(s.name); }), sum.active, sum.noProvince];
      }
    },
    {
      name: 'st-2. territoryOf ร้านที่ย้ายจากอัมพรไปสิริกาญจน์ (3 ร้าน) → ก.ค. 2026 = TT-04 · ส.ค. 2026 = TT-01',
      expected: [['711', '781', '3212'], 'TT-04', 'TT-01', 'อัมพร สีดาเสถียร', 'สิริกาญจน์ ขุนเสนา'],
      actual: function () {
        var moved = D().stores.filter(function (s) { return S().territoryOf(D(), s.id, '2026-07') === 'TT-04' && S().territoryOf(D(), s.id, '2026-08') === 'TT-01'; })
          .map(function (s) { return s.id; }).sort(function (a, b) { return Number(a) - Number(b); });
        return [moved, S().territoryOf(D(), '711', '2026-07'), S().territoryOf(D(), '711', '2026-08'), ownerName('TT-04', '2026-07'), ownerName('TT-01', '2026-08')];
      }
    },
    {
      name: 'st-3. ผู้รับผิดชอบเขต 4: มิ.ย. 2026 = อัมพร · ก.ย. 2026 = กฤษดา (อัมพรลาออก ก.ค. 2026)',
      expected: ['อัมพร สีดาเสถียร', 'กฤษดา นารี', '2026-07'],
      actual: function () { return [ownerName('TT-04', '2026-06'), ownerName('TT-04', '2026-09'), calc().findById(D().salespeople, 'SP-TT-05').endMonth]; }
    },
    {
      name: 'st-4. moveStores เดือนที่ผ่านแล้ว (ส.ค. เมื่อปัจจุบัน ก.ย. 2026) → ไม่ยอมรับ · เดือนถัดไป → ช่วงเดิมปิดที่เดือนปัจจุบัน ช่วงก่อนหน้าคงเดิม',
      expected: ['past', true, [['TT-04', '2026-01', '2026-07'], ['TT-01', '2026-08', '2026-09'], ['TT-02', '2026-10', null]], ['711'], 'TT-01', 'TT-02'],
      actual: function () {
        var past = S().moveStores(D(), ['711'], 'TT-02', '2026-08', { current: '2026-09' });
        var next = S().moveStores(D(), ['711'], 'TT-02', '2026-10', { current: '2026-09', at: '2026-09-20T10:00:00.000Z' });
        var d = withData({ storeAssignments: next.storeAssignments });
        return [past.error, next.ok, ranges(next.storeAssignments, '711'), next.move.storeIds, S().territoryOf(d, '711', '2026-09'), S().territoryOf(d, '711', '2026-10')];
      }
    },
    {
      name: 'st-5. suggestTerritory ร้านเชียงใหม่ที่ยังไม่จัดสรร → TT-01 · จังหวัดที่อยู่หลายเขต (สุรินทร์) หรือไม่ระบุ → null · outOfProvince',
      expected: [null, 'เชียงใหม่', 'TT-01', 'สุรินทร์', null, null, true, false],
      actual: function () {
        var P = D().provinceSuggestions;
        var multi = D().stores.filter(function (s) { return s.province === 'สุรินทร์'; })[0];
        return [S().territoryOf(D(), '4487', '2026-07'), store('4487').province, S().suggestTerritory(store('4487'), P), multi.province,
          S().suggestTerritory(multi, P), S().suggestTerritory(store('8330'), P),
          S().outOfProvince(store('4487'), 'TT-04', P), S().outOfProvince(store('4487'), 'TT-01', P)];
      }
    },
    {
      name: 'st-6. territoryLastYear รวมทุกเขต ปีแผน 2027 = 22,900,000 (±100) · รายเขต 7.79 / 6.59 / 4.27 / 4.24 ล้าน = ยอดขายปีก่อนในหน้าจัดสรรเป้าหมายประจำปี',
      expected: [true, ['7.79', '6.59', '4.27', '4.24'], true],
      actual: function () {
        var each = UNITS.map(function (t) { return S().territoryLastYear(D(), t, 2027); });
        return [Math.abs(calc().sum(each) - 22900000) <= 100, each.map(function (v) { return (v / 1e6).toFixed(2); }),
          UNITS.every(function (t, i) { return calc().unitHistory(D().history, 2026, t) === each[i]; })];
      }
    },
    {
      name: 'st-7. performanceByPerson (ร้านค้า): อัมพร ปี 2026 นับเฉพาะ ม.ค.–ก.ค. ของเขต 4 · กฤษดา นับ ส.ค.–ธ.ค. · ยอด = ร้านที่อยู่ในเขตแต่ละเดือน',
      expected: [[0, 1, 2, 3, 4, 5, 6], ['TT-04'], [7, 8, 9, 10, 11], ['TT-04'], true],
      actual: function () {
        var input = S().performanceInput(D(), 2026);
        var amp = calc().performanceByPerson(D().assignments, D().salespeople, 'SP-TT-05', 2026, {}, { stores: input });
        var kri = calc().performanceByPerson(D().assignments, D().salespeople, 'SP-TT-04', 2026, {}, { stores: input });
        var idx = function (flags) { return flags.map(function (f, i) { return f ? i : -1; }).filter(function (i) { return i >= 0; }); };
        var direct = 0;
        for (var m = 0; m < 7; m++) {
          S().storesIn(D(), 'TT-04', calc().monthKey(2026, m)).forEach(function (s) { direct += S().storeMonthly(D(), s)[m]; });
        }
        return [idx(amp.owned), amp.units.map(function (u) { return u.unitId; }), idx(kri.owned), kri.units.map(function (u) { return u.unitId; }), amp.total === direct];
      }
    },
    {
      name: 'st-8. ย้ายร้านหลังอนุมัติเป้าหมาย 2027 → เป้าหมายเขตไม่เปลี่ยน · ยอดปีก่อนของเขตคงค่า ณ ตอนอนุมัติ · movesAfterApproval(2027) คืนร้านนั้น / ยังไม่อนุมัติ → ยอดปีก่อนคำนวณใหม่',
      expected: [true, true, true, [['2701', 'TT-02', 'TT-04', '2026-10']], true, true],
      actual: function () {
        var approvedAt = '2026-09-10T09:00:00.000Z';
        var res = S().moveStores(D(), ['2701'], 'TT-04', '2026-10', { current: '2026-09', at: '2026-09-20T10:00:00.000Z', by: 'Sales Director' });
        var d = withData({ storeAssignments: res.storeAssignments, storeMoves: [res.move] });
        var targets = D().targets.years[2027];
        var before = calc().unitTarget(calc().topDown(D(), targets, 2027), 'TT-02');
        var frozen = S().applyHistory(d, 2027, approvedAt);
        var draft = S().applyHistory(d, 2027, null);
        var ref = store('2701').salesRef;
        var moves = S().movesAfterApproval(d, 2027, approvedAt);
        return [calc().unitTarget(calc().topDown(frozen, targets, 2027), 'TT-02') === before,
          frozen.history === D().history,
          S().territoryLastYear(d, 'TT-02', 2027, { approvedAt: approvedAt }) === S().territoryLastYear(D(), 'TT-02', 2027),
          moves.map(function (x) { return [x.storeId, x.from, x.to, x.fromMonth]; }),
          calc().unitHistory(draft.history, 2026, 'TT-02') === calc().unitHistory(D().history, 2026, 'TT-02') - ref,
          calc().unitTarget(calc().topDown(draft, targets, 2027), 'TT-02') === before];
      }
    },
    {
      name: 'st-9. ยอดอ้างอิงรายเดือนของร้าน = ยอดอ้างอิง × Seasonality (ผลรวมเท่ายอดอ้างอิง รวมร้านที่ติดลบ) · ยอดรวมทุกร้าน 22,900,000',
      expected: [true, true, 22900000],
      actual: function () {
        var neg = D().stores.filter(function (s) { return s.salesRef < 0; });
        return [D().stores.every(function (s) { return calc().sum(S().storeMonthly(D(), s)) === s.salesRef; }),
          neg.length > 0 && neg.every(function (s) { return S().storeMonthly(D(), s).every(function (v) { return v <= 0; }); }),
          calc().sum(D().stores.map(function (s) { return s.salesRef; }))];
      }
    },
    {
      name: 'st-10. System ID ซ้ำในไฟล์ต้นทาง (8 ID · 9 แถวเพิ่ม) แยก id ภายใน ใช้ช่วงเขตชุดเดียวกัน · ย้อนการย้ายหลายครั้งหลังอนุมัติได้ครบ',
      expected: [8, 9, ['6352', '6352-2', '6352-3'], true, true],
      actual: function () {
        var dup = {};
        D().stores.forEach(function (s) { if (s.duplicates > 1) dup[s.systemId] = (dup[s.systemId] || 0) + 1; });
        var extra = calc().sum(Object.keys(dup).map(function (k) { return dup[k] - 1; }));
        var ids = D().stores.filter(function (s) { return s.systemId === '6352'; }).map(function (s) { return s.id; });
        var sameRanges = ids.every(function (id) { return JSON.stringify(ranges(D().storeAssignments, id).map(function (r) { return r.slice(0); })) === JSON.stringify(ranges(D().storeAssignments, '6352')); });
        var a = S().moveStores(D(), ['711', '781'], 'TT-02', '2026-10', { current: '2026-09', at: '2026-09-20T10:00:00.000Z' });
        var d1 = withData({ storeAssignments: a.storeAssignments, storeMoves: [a.move] });
        var b = S().unassignStores(d1, ['711'], '2026-11', { current: '2026-09', at: '2026-09-21T10:00:00.000Z' });
        var d2 = withData({ storeAssignments: b.storeAssignments, storeMoves: [a.move, b.move] });
        var asOf = S().assignmentsAsOf(d2, '2026-09-15T00:00:00.000Z');
        return [Object.keys(dup).length, extra, ids, sameRanges,
          JSON.stringify(['711', '781'].map(function (id) { return ranges(asOf, id); })) === JSON.stringify(['711', '781'].map(function (id) { return ranges(D().storeAssignments, id); }))];
      }
    }
  ];
})();
