/*
 * core/features.js — Feature Flags (CR-17) ที่เดียวที่อ่าน settings.FEATURES
 *
 *   isOn(name)                 → true | false (ชื่อที่ไม่รู้จัก = false)
 *                                approvalWorkflow · baseline · reforecast · sellIn · npdApproval
 *   all()                      → { <name>: bool } ค่าปัจจุบันทั้งหมด (รวมค่าที่ override)
 *   withFlags(values, fn)      → รัน fn ขณะตั้งค่า Flag ชั่วคราว แล้วคืนค่าเดิมเสมอ (ใช้ใน Test) → ผลของ fn
 *   visibleActions(actions)    → ปุ่มของ workflowBar ที่แสดงได้: ปิด approvalWorkflow = เหลือเฉพาะ edit · save · cancel
 *   stepOn(step)               → ขั้นนี้มี Workflow หรือไม่ (npd ใช้ npdApproval · forecast ต้องเปิด reforecast ด้วย · อื่นๆ ใช้ approvalWorkflow)
 *   locked(isLocked)           → ถือว่าล็อก Baseline หรือไม่ (ปิด baseline = ไม่ล็อกเสมอ) isLocked = ผลของ workflow.isLocked
 *   planMode(stored, locked)   → โหมดของหน้าวางแผน SKU: เปิด reforecast + ล็อกแล้ว + เลือกปรับแผน = 'reforecast' / นอกนั้น 'initial'
 * Phase 1 (Flow ใหม่) ปิดทุก Flag: โค้ดและ Test ของ Workflow / Baseline / Re-forecast ยังอยู่ เปิดกลับได้ใน Phase 2
 * โหลดหลัง data/settings.js ก่อนไฟล์ core/ อื่น (calc ใช้ตอนรันได้) / store: ไม่อ่าน ไม่เขียน
 */
(function (SP) {
  'use strict';

  var EDIT_ACTIONS = ['edit', 'save', 'cancel'];
  var overrides = null;

  function flags() { return (SP.data.settings && SP.data.settings.FEATURES) || {}; }

  function isOn(name) {
    if (overrides && Object.prototype.hasOwnProperty.call(overrides, name)) return !!overrides[name];
    return !!flags()[name];
  }

  function all() {
    var out = {};
    Object.keys(flags()).forEach(function (k) { out[k] = isOn(k); });
    return out;
  }

  function withFlags(values, fn) {
    var prev = overrides;
    var next = {};
    Object.keys(prev || {}).forEach(function (k) { next[k] = prev[k]; });
    Object.keys(values || {}).forEach(function (k) { next[k] = !!values[k]; });
    overrides = next;
    try { return fn(); } finally { overrides = prev; }
  }

  function visibleActions(actions) {
    if (isOn('approvalWorkflow')) return (actions || []).slice();
    return (actions || []).filter(function (a) { return EDIT_ACTIONS.indexOf(a) >= 0; });
  }

  function stepOn(step) {
    if (step === 'npd') return isOn('npdApproval');
    if (step === 'forecast') return isOn('reforecast') && isOn('approvalWorkflow');
    if (step === 'baseline') return isOn('baseline');
    return isOn('approvalWorkflow');
  }

  function locked(isLocked) { return isOn('baseline') && !!isLocked; }

  function planMode(stored, isLockedNow) { return isOn('reforecast') && locked(isLockedNow) && stored === 'reforecast' ? 'reforecast' : 'initial'; }

  SP.core.features = { isOn: isOn, all: all, withFlags: withFlags, visibleActions: visibleActions, stepOn: stepOn, locked: locked, planMode: planMode };
})(window.SP);
