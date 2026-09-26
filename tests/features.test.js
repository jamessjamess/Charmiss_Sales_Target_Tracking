/*
 * tests/features.test.js — Test ของ Feature Flags (CR-17 ข้อ 3) · core/features.js + calc.planActions (approval: false)
 *
 * รันด้วย Node: node tests/run.js features / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 *   ft-1..4 = Test ตาม CR (ft-4 เปิด Flag ทั้งหมดชั่วคราวแล้วรัน Test เดิมของ Workflow / Baseline / Re-forecast จาก tests/calc.test.js แล้วคืนค่า)
 *   ft-5 = workflowBar ที่สร้างจริง (ใช้ DOM → เปิด tests/calc.test.html)
 * store: ไม่เขียน (ft-5 อ่านบทบาทจำลองที่ตั้งอยู่)
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function FT() { return SP.core.features; }
  function W() { return SP.core.workflow; }
  function calc() { return SP.core.calc; }
  var ALL_ON = { approvalWorkflow: true, baseline: true, reforecast: true, sellIn: true, npdApproval: true, promotionCalendar: true };
  var EDIT = ['edit', 'save', 'cancel'];
  var DIRECTOR = { type: 'director', personId: null }, MANAGEMENT = { type: 'management', personId: null };
  function subset(list) { return list.every(function (a) { return EDIT.indexOf(a) >= 0; }); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  SP.tests.features = [
    {
      name: 'ft-1. Flag ตั้งต้น: approvalWorkflow ปิด → ปุ่มของ workflowBar เหลือเฉพาะ edit · save · cancel (ทุกสถานะ ทุกบทบาท) / เปิด Flag → ปุ่มเดิมครบ',
      expected: [false, ['edit'], ['save', 'cancel'], [], true, ['edit', 'submit'], ['approve', 'return']],
      actual: function () {
        var draft = { status: 'draft', history: [] }, submitted = { status: 'submitted', history: [] }, approved = { status: 'approved', history: [] };
        var cases = [];
        [draft, submitted, approved, { status: 'returned', history: [] }, { status: 'review', history: [] }].forEach(function (st) {
          [DIRECTOR, MANAGEMENT].forEach(function (r) {
            ['topDown', 'phasing', 'sku'].forEach(function (step) {
              [false, true].forEach(function (editing) { cases.push(FT().visibleActions(W().allowedActions(st, r, { step: step, editing: editing }))); });
            });
          });
        });
        return [FT().isOn('approvalWorkflow'),
          FT().visibleActions(W().allowedActions(draft, DIRECTOR, { step: 'topDown' })),
          FT().visibleActions(W().allowedActions(draft, DIRECTOR, { step: 'topDown', editing: true })),
          FT().visibleActions(W().allowedActions(submitted, MANAGEMENT, { step: 'topDown' })),
          cases.every(subset),
          FT().withFlags(ALL_ON, function () { return FT().visibleActions(W().allowedActions(draft, DIRECTOR, { step: 'topDown' })); }),
          FT().withFlags(ALL_ON, function () { return FT().visibleActions(W().allowedActions(submitted, MANAGEMENT, { step: 'topDown' })); })];
      }
    },
    {
      name: 'ft-2. หน้าวางแผน SKU ไม่มี Re-forecast: โหมดที่ใช้ = initial แม้เลือกปรับแผนไว้และล็อกแล้ว → cellState ทุกเดือนแก้ได้ ยกเว้นล็อก 0 / เปิด Flag → ปรับแผนกลับมา',
      expected: ['initial', true, 12, 0, 'reforecast', 3],
      actual: function () {
        var mode = FT().planMode('reforecast', true);
        var sources = ['manual', 'system', 'clearance', 'override'];
        var editable = 0;
        for (var m = 0; m < 12; m++) if (calc().cellState(mode, m, 2, 'system').editable) editable++;
        var locked = 0;
        for (var n = 0; n < 12; n++) if (calc().cellState(mode, n, 2, 'locked').editable) locked++;
        var allSources = sources.every(function (s) { for (var i = 0; i < 12; i++) if (!calc().cellState(mode, i, 2, s).editable) return false; return true; });
        return FT().withFlags(ALL_ON, function () {
          var on = FT().planMode('reforecast', true);
          var actual = 0;
          for (var i = 0; i < 12; i++) if (calc().cellState(on, i, 2, 'system').reason === 'actual') actual++;
          return [mode, allSources, editable, locked, on, actual];
        });
      }
    },
    {
      name: 'ft-3. ตัวนับรายการที่ต้องดำเนินการ (ไม่มีขั้นอนุมัติ) นับเฉพาะหน่วยขายที่ส่วนต่างไม่เป็น 0 หรือไม่มีผู้รับผิดชอบ · การดำเนินการถัดไป = กำหนดผู้รับผิดชอบ / ปิดส่วนต่าง / –',
      expected: [['c', 'e', 'd'], ['assignOwner', 'closeGap', 'closeGap'], 3, [null, null], 5],
      actual: function () {
        var units = [
          { id: 'a', target: 1000, plan: 1000, phasing: 'draft', sku: 'draft', vacant: false },        // จัดสรรครบ สถานะฉบับร่าง → ไม่นับ
          { id: 'b', target: 1000, plan: 1000.4, phasing: 'returned', sku: 'submitted', vacant: false }, // ±1 บาท สถานะส่งกลับ → ไม่นับ
          { id: 'c', target: 1000, plan: 1000, phasing: 'approved', sku: 'approved', vacant: true },   // ไม่มีผู้รับผิดชอบ → นับ
          { id: 'd', target: 1000, plan: 1200, phasing: 'approved', sku: 'approved', vacant: false },  // เกิน → นับ
          { id: 'e', target: 5000, plan: 2000, phasing: 'submitted', sku: 'draft', vacant: false }     // ขาด → นับ (ส่วนต่างมากกว่า d)
        ];
        var list = calc().planActions(units, { topDown: 'draft', approval: false });
        var all = calc().planActions(units, { topDown: 'draft', approval: false, all: true });
        return [list.map(function (r) { return r.id; }), list.map(function (r) { return r.next; }), list.length,
          all.filter(function (r) { return !r.issue; }).map(function (r) { return r.next; }), all.length];
      }
    },
    {
      name: 'ft-4. เปิด Flag ทั้งหมดชั่วคราว → Test เดิมของ Workflow / Baseline / Re-forecast ใน tests/calc.test.js ผ่านเหมือนเดิม และคืนค่า Flag หลังทดสอบ',
      expected: [true, [], false, false],
      actual: function () {
        var re = /^wf|^sku-[26]\.|โหมดปรับแผน|^Forecast|Baseline|^v5-4\.|^cr12-[78]\./;
        var browser = typeof document !== 'undefined';
        var cases = (SP.tests.calc || []).filter(function (c) {
          return re.test(c.name) && (browser || !/SP\.core\.charts|document\.|SP\.core\.components/.test(String(c.actual)));
        });
        var failed = FT().withFlags(ALL_ON, function () {
          return cases.filter(function (c) {
            try { return !same(c.actual(), c.expected); } catch (e) { return true; }
          }).map(function (c) { return c.name; });
        });
        return [cases.length >= 12, failed, FT().isOn('approvalWorkflow'), FT().isOn('reforecast')];
      }
    },
    {
      name: 'ft-5. workflowBar ที่สร้างจริง (ปิด Flag): ไม่มีป้ายสถานะ ไม่มีประวัติ ▾ ปุ่มเหลือ แก้ไข / บันทึก / ยกเลิก (+ ปุ่มสลับมุมมอง) · แผน NPD ไม่แสดงอะไร / เปิด Flag → มีป้ายสถานะและประวัติ',
      expected: [0, 0, true, 0, 1, 1],
      actual: function () {
        var C = SP.core.components;
        var opts = { step: 'topDown', unitId: null, year: 2027, getState: function () { return { status: 'submitted', history: [] }; }, editing: function () { return false; },
          onEdit: function () {}, onSave: function () {}, onCancel: function () {} };
        var bar = C.workflowBar(opts);
        var buttons = [].map.call(bar.querySelectorAll('button'), function (b) { return b.className; });
        var ok = buttons.every(function (c) { return /wf-(edit|save|cancel|switch)\b/.test(c); }) && subset(bar.actions);
        var npd = C.workflowBar({ step: 'npd', getState: function () { return { status: 'draft', history: [] }; }, editing: function () { return false; }, onAction: function () { return { ok: true }; } });
        var on = FT().withFlags(ALL_ON, function () { return C.workflowBar(opts); });
        return [bar.querySelectorAll('.wf-badge').length, bar.querySelectorAll('.wf-history-btn').length, ok, npd.querySelectorAll('button, .wf-badge').length,
          on.querySelectorAll('.wf-badge').length, on.querySelectorAll('.wf-history-btn').length];
      }
    }
  ];
})();
