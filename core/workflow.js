/*
 * core/workflow.js — กฎการอนุมัติต่อขั้น (ที่เดียวทั้งเว็บ)
 *
 * - Pure functions: ไม่แตะ DOM ไม่อ่าน store (store อ่าน/เขียนผ่าน store.workflowStates() / saveWorkflowStates())
 * - ขั้น (step): 'topDown' (ทั้งหน้า unitId = null → 'all') | 'phasing' | 'sku' | 'forecast' (ต่อหน่วยขาย)
 *               | 'baseline' (ล็อกทั้งปี ทำที่หน้ารายงาน) | 'npd' (แผน NPD ต่อสินค้า เก็บใน master.npdPlans[].workflow)
 * - สถานะ: 'draft' ร่าง → 'submitted' รออนุมัติ → 'approved' อนุมัติแล้ว
 *          'returned' ส่งกลับแก้ (ต้องมีเหตุผล) / 'review' ต้องตรวจใหม่ (ขั้นบนอนุมัติใหม่และเป้าของหน่วยเปลี่ยน)
 *          baseline: 'draft' → 'locked'
 * - state = { status, history: [{ action, by, at, note }], snapshot? (ตัวเลขตอนอนุมัติ ใช้ตรวจว่าเป้าเปลี่ยนไหม) }
 * - states (ทั้งปี) = { '<step>.<unitId|all>': state } ไม่มี Key = ร่าง
 * - role = { type: 'management' | 'director' | 'sales' | 'product' | 'supply' | 'trade', personId }
 *   (product = ทีม Product, supply = Supply Chain, trade = Trade Marketing — ผู้แก้ไขหน้า Product Master)
 * - Test อยู่ที่ tests/calc.test.js (ส่วน Workflow)
 */
(function (SP) {
  'use strict';

  var EDITABLE = ['draft', 'returned', 'review'];
  var LOCKABLE_STEPS = ['topDown', 'phasing', 'sku'];

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  function key(step, unitId) { return step + '.' + (unitId || 'all'); }

  function stateOf(states, step, unitId) {
    var s = states && states[key(step, unitId)];
    return s ? s : { status: 'draft', history: [] };
  }

  function isEditable(state) { return EDITABLE.indexOf(state.status) >= 0; }

  // ---------------------------------------------------------------------
  // ใครส่ง / ใครอนุมัติ
  //   Top-down: Sales Director ส่ง → Management อนุมัติ
  //   Phasing / SKU / Forecast: Sales Person ที่รับผิดชอบหน่วยนั้น (ownerId) ส่ง → Sales Director อนุมัติ
  //     หน่วยที่ว่าง (ownerId = null) → Sales Director ส่งแทน
  //   Baseline: Sales Director ล็อก / NPD: ทีม Product ส่ง → Sales Director อนุมัติ
  // ---------------------------------------------------------------------
  function isSubmitter(role, step, ownerId) {
    if (!role) return false;
    if (step === 'topDown') return role.type === 'director';
    if (step === 'npd') return role.type === 'product';
    if (step === 'baseline') return false;
    if (!ownerId) return role.type === 'director';
    return role.type === 'sales' && role.personId === ownerId;
  }

  function isApprover(role, step) {
    if (!role) return false;
    if (step === 'topDown') return role.type === 'management';
    return role.type === 'director';
  }

  // ปุ่มที่แสดงตามสถานะและบทบาท
  // context = { step, ownerId, editing (อยู่ในโหมดแก้ไข), locked (ล็อก Baseline แล้ว) }
  // → ['edit', 'submit'] | ['save', 'cancel'] | ['recall'] | ['approve', 'return'] | ['reopen'] | []
  function allowedActions(state, role, context) {
    context = context || {};
    var step = context.step;
    if (context.editing) return ['save', 'cancel'];
    if (context.locked && LOCKABLE_STEPS.indexOf(step) >= 0) return [];
    var out = [];
    var submitter = isSubmitter(role, step, context.ownerId);
    var approver = isApprover(role, step);
    if (isEditable(state)) {
      if (submitter) out.push('edit', 'submit');
    } else if (state.status === 'submitted') {
      if (submitter) out.push('recall');
      if (approver) out.push('approve', 'return');
    } else if (state.status === 'approved') {
      if (approver) out.push('reopen');
    }
    return out;
  }

  // ผู้จัดทำ (ผู้ส่ง) ของขั้นนี้ → role (Top-down = Sales Director / หน่วยที่ว่าง = Sales Director / นอกนั้น = ผู้รับผิดชอบหน่วย)
  function submitterRole(step, ownerId) {
    if (step === 'npd') return { type: 'product', personId: null };
    if (step === 'topDown' || !ownerId) return { type: 'director', personId: null };
    return { type: 'sales', personId: ownerId };
  }

  function approverRole(step) { return { type: step === 'topDown' ? 'management' : 'director', personId: null }; }

  // สิ่งที่ workflowBar แสดงสำหรับบทบาทนี้ (ตัดสินจาก allowedActions)
  // context = { step, ownerId, ownerName, editing, locked }
  // → { kind, actions, preparer, preparerName, approver, switchTo }
  //   kind = 'actions'  มีปุ่มให้กด
  //        | 'readOnly' บทบาทนี้แก้ไข/ส่งไม่ได้ → "อ่านอย่างเดียว · ผู้จัดทำคือ …" + ปุ่มสลับมุมมอง (switchTo)
  //                     ฉบับร่าง → สลับเป็นผู้จัดทำ / รออนุมัติ (บทบาทนี้ไม่ใช่ผู้อนุมัติ) → สลับเป็นผู้อนุมัติ
  //        | 'waiting'  บทบาทนี้เป็นผู้อนุมัติ แต่ผู้จัดทำยังไม่ส่ง → "รอผู้จัดทำส่งอนุมัติ" + ปุ่มสลับเป็นผู้จัดทำ
  //        | 'none'     ไม่มีอะไรต้องทำ (อนุมัติแล้ว หรือล็อก Baseline แล้ว)
  function viewState(state, role, context) {
    context = context || {};
    var actions = allowedActions(state, role, context);
    var preparer = submitterRole(context.step, context.ownerId);
    var approver = approverRole(context.step);
    var out = { kind: 'none', actions: actions, preparer: preparer, preparerName: context.ownerName || null, approver: approver, switchTo: null };
    if (actions.length) { out.kind = 'actions'; return out; }
    if (context.locked && LOCKABLE_STEPS.indexOf(context.step) >= 0) return out;
    if (isEditable(state)) {
      out.kind = isApprover(role, context.step) ? 'waiting' : 'readOnly';
      out.switchTo = preparer;
    } else if (state.status === 'submitted') {
      out.kind = 'readOnly';
      out.switchTo = approver;
    }
    return out;
  }

  // หน้า Master (workflowBar แบบง่าย แก้ไข/บันทึก/ยกเลิก ไม่มีขั้นอนุมัติ) editRoles = [ประเภทบทบาทที่แก้ได้]
  // ไม่ระบุ editRoles = ทุกบทบาทแก้ได้ (Account Master ในเดโม) → { kind: 'actions' | 'readOnly', switchTo }
  function masterViewState(role, editRoles) {
    if (!editRoles || !editRoles.length || (role && editRoles.indexOf(role.type) >= 0)) return { kind: 'actions', switchTo: null };
    return { kind: 'readOnly', switchTo: { type: editRoles[0], personId: null } };
  }

  function canEditMaster(role, editRoles) { return masterViewState(role, editRoles).kind === 'actions'; }

  // เปลี่ยนสถานะ 1 ครั้ง payload = { by, at, note, snapshot }
  // → { ok: true, state } | { ok: false, error: 'invalid' | 'noteRequired' }
  var MOVES = {
    submit: { from: EDITABLE, to: 'submitted' },
    recall: { from: ['submitted'], to: 'draft' },
    approve: { from: ['submitted'], to: 'approved' },
    'return': { from: ['submitted'], to: 'returned' },
    reopen: { from: ['approved'], to: 'draft' },
    lock: { from: ['draft'], to: 'locked' }
  };

  function transition(state, action, payload) {
    payload = payload || {};
    var move = MOVES[action];
    var current = state || { status: 'draft', history: [] };
    if (!move || move.from.indexOf(current.status) < 0) return { ok: false, error: 'invalid' };
    var note = payload.note == null ? '' : String(payload.note).trim();
    if (action === 'return' && !note) return { ok: false, error: 'noteRequired' };
    var next = clone(current);
    next.history = (next.history || []).concat([{ action: action, by: payload.by || '', at: payload.at || '', note: note }]);
    next.status = move.to;
    if (action === 'approve' && payload.snapshot !== undefined) {
      next.prevSnapshot = current.snapshot === undefined ? null : clone(current.snapshot);
      next.snapshot = clone(payload.snapshot);
    }
    if (action === 'lock' && payload.snapshot !== undefined) next.snapshot = clone(payload.snapshot);
    return { ok: true, state: next };
  }

  // ส่งอนุมัติได้หรือไม่ (year ไว้ให้ตรงกับ Key ของปี — ข้อมูลที่ใช้ตัดสินส่งมาใน facts)
  // facts = { states (ของปีนั้น), remaining: 'ok' | 'short' | 'over', baselineLocked }
  //   Top-down / Phasing: Remaining ต้องครบ (±1 บาท) ทั้งขาดและเกินส่งไม่ได้
  //   SKU: ต้องไม่ขาดเป้า (แผนเกินเป้าส่งได้) และ Phasing ของหน่วยนั้นต้องอนุมัติแล้ว
  //   Phasing: Top-down ต้องอนุมัติแล้ว / Forecast: ต้องล็อก Baseline แล้ว (ไม่บังคับ Remaining)
  // → { ok, reason: null | 'upstream' | 'remaining' | 'baseline' }
  function canSubmit(step, unitId, year, facts) {
    facts = facts || {};
    var states = facts.states || {};
    // NPD: ต้องมีวันเปิดตัวและหน่วยขายที่วางแผนอย่างน้อย 1 รายการ (facts.ready)
    if (step === 'npd') return facts.ready ? { ok: true, reason: null } : { ok: false, reason: 'incomplete' };
    if (step === 'phasing' && stateOf(states, 'topDown').status !== 'approved') return { ok: false, reason: 'upstream' };
    if (step === 'sku' && stateOf(states, 'phasing', unitId).status !== 'approved') return { ok: false, reason: 'upstream' };
    if (step === 'forecast') return facts.baselineLocked ? { ok: true, reason: null } : { ok: false, reason: 'baseline' };
    if (step === 'sku') return facts.remaining === 'short' ? { ok: false, reason: 'remaining' } : { ok: true, reason: null };
    if (facts.remaining !== 'ok') return { ok: false, reason: 'remaining' };
    return { ok: true, reason: null };
  }

  // หน่วยที่ตัวเลขเปลี่ยนเทียบ snapshot ครั้งก่อน (ต่างกันเกิน 1 บาท) prev = null → ไม่มีครั้งก่อน = ไม่นับว่าเปลี่ยน
  // snapshot = { <unitId>: ตัวเลข | [12 ตัวเลข] }
  function changedUnits(prev, next) {
    if (!prev || !next) return [];
    var ids = {};
    Object.keys(prev).concat(Object.keys(next)).forEach(function (k) { ids[k] = true; });
    return Object.keys(ids).filter(function (id) {
      var a = [].concat(prev[id] == null ? [] : prev[id]);
      var b = [].concat(next[id] == null ? [] : next[id]);
      if (a.length !== b.length) return true;
      for (var i = 0; i < a.length; i++) if (Math.abs((a[i] || 0) - (b[i] || 0)) > 1) return true;
      return false;
    });
  }

  // ขั้นล่างที่อนุมัติแล้วของหน่วยที่เป้าเปลี่ยน → 'review' (ต้องตรวจใหม่) หน่วยอื่นไม่เปลี่ยน
  //   step = ขั้นบนที่เพิ่งอนุมัติ: 'topDown' → phasing + sku / 'phasing' → sku
  function invalidateDownstream(states, step, unitIds, payload) {
    payload = payload || {};
    var below = step === 'topDown' ? ['phasing', 'sku'] : step === 'phasing' ? ['sku'] : [];
    var out = clone(states || {});
    (unitIds || []).forEach(function (u) {
      below.forEach(function (b) {
        var k = key(b, u);
        var s = out[k];
        if (!s || s.status !== 'approved') return;
        s.status = 'review';
        s.history = (s.history || []).concat([{ action: 'invalidate', by: payload.by || '', at: payload.at || '', note: payload.note || '' }]);
      });
    });
    return out;
  }

  // ขั้นที่อนุมัติแล้วของหน่วยที่ระบุ → 'review' (เช่น เลื่อนวันเปิดตัว NPD หลังอนุมัติ → แผน SKU ของหน่วยที่วางแผน)
  function reviewUnits(states, step, unitIds, payload) {
    payload = payload || {};
    var out = clone(states || {});
    (unitIds || []).forEach(function (u) {
      var s = out[key(step, u)];
      if (!s || s.status !== 'approved') return;
      s.status = 'review';
      s.history = (s.history || []).concat([{ action: 'invalidate', by: payload.by || '', at: payload.at || '', note: payload.note || '' }]);
    });
    return out;
  }

  // สถานะกลับเป็นฉบับร่างโดยระบบ (เช่น เลื่อนวันเปิดตัว NPD หลังอนุมัติ) — ไม่ใช่ action ของผู้ใช้
  function resetToDraft(state, payload) {
    payload = payload || {};
    var next = clone(state || { status: 'draft', history: [] });
    if (next.status === 'draft') return next;
    next.status = 'draft';
    next.history = (next.history || []).concat([{ action: 'invalidate', by: payload.by || '', at: payload.at || '', note: payload.note || '' }]);
    return next;
  }

  // ทำ action ทั้งชุด: เปลี่ยนสถานะ + (อนุมัติ) หาหน่วยที่เป้าเปลี่ยนแล้วให้ขั้นล่างเป็น "ต้องตรวจใหม่"
  // req = { step, unitId, action, by, at, note, snapshot, invalidateNote }
  // → { ok, error, states, changed: [unitId] }
  function applyAction(states, req) {
    var k = key(req.step, req.unitId);
    var res = transition(stateOf(states, req.step, req.unitId), req.action, req);
    if (!res.ok) return { ok: false, error: res.error, states: states, changed: [] };
    var out = clone(states || {});
    out[k] = res.state;
    var changed = [];
    if (req.action === 'approve' && (req.step === 'topDown' || req.step === 'phasing')) {
      changed = changedUnits(res.state.prevSnapshot, res.state.snapshot);
      out = invalidateDownstream(out, req.step, changed, { by: req.by, at: req.at, note: req.invalidateNote });
    }
    return { ok: true, error: null, states: out, changed: changed };
  }

  // ล็อก Baseline ได้เมื่อ Top-down และแผน SKU ของทุกหน่วยในแผนอนุมัติแล้ว → { ok, pending: [unitId], topDown }
  function canLock(states, unitIds) {
    var pending = (unitIds || []).filter(function (u) { return stateOf(states, 'sku', u).status !== 'approved'; });
    var topDown = stateOf(states, 'topDown').status === 'approved';
    return { ok: topDown && pending.length === 0 && (unitIds || []).length > 0, pending: pending, topDown: topDown };
  }

  function isLocked(states) { return stateOf(states, 'baseline').status === 'locked'; }

  // เหตุการณ์ล่าสุดของสถานะนั้น (ผู้ส่ง/ผู้อนุมัติ + เวลา) → { action, by, at, note } | null
  function lastEvent(state) {
    var h = (state && state.history) || [];
    return h.length ? h[h.length - 1] : null;
  }

  SP.core.workflow = {
    EDITABLE: EDITABLE,
    key: key,
    stateOf: stateOf,
    isEditable: isEditable,
    isSubmitter: isSubmitter,
    isApprover: isApprover,
    allowedActions: allowedActions,
    submitterRole: submitterRole,
    approverRole: approverRole,
    viewState: viewState,
    masterViewState: masterViewState,
    canEditMaster: canEditMaster,
    transition: transition,
    reviewUnits: reviewUnits,
    resetToDraft: resetToDraft,
    canSubmit: canSubmit,
    changedUnits: changedUnits,
    invalidateDownstream: invalidateDownstream,
    applyAction: applyAction,
    canLock: canLock,
    isLocked: isLocked,
    lastEvent: lastEvent
  };
})(window.SP);
