/*
 * core/approval.js — CR-39 Module Approval: คำขออนุมัติ (Flag approval · ใช้คู่กับ Flag revision · ปิด = วงจรของ CR-38 ในแท็บ Revision)
 *
 * คำขอ 1 รายการ = การสรุปและขออนุมัติ Sales Planning ของ 1 Revision (type = 'revisionLock' · มี type รองรับคำขอประเภทอื่นในอนาคต)
 *   request = { id ('REQ-2027-R2-01'), type, refId (id ของ Revision), status: pending | approved | returned | withdrawn,
 *               steps: [{ key, role, status: waiting | current | approved | returned | skipped, actedBy, actedAt, note }],
 *               summary (calc.revisionSummary ตอนส่ง), comments: [{ by, at, text }], note (ข้อความถึงผู้อนุมัติ), createdBy/At, closedBy/At, returnNote }
 * ขั้นอนุมัติ (approvalConfig.revisionLock = { sdConfirm }): mgmtSubmit (Management ส่ง = สร้างคำขอ) → sdConfirm (Sales Director ยืนยัน · ปิด = skipped) → mdLock (MD อนุมัติและ Lock)
 *   ขั้นของคำขอเก็บไว้ในคำขอตอนสร้าง → แก้ตั้งค่ามีผลกับคำขอใหม่เท่านั้น
 * ที่เก็บ (store): approval.requests · approvalConfig.revisionLock (ค่าตั้งต้น data/approvals.js)
 * กติกา (บังคับที่ Store · guardWrite ใน store.set / remove):
 *   สร้างได้เมื่อ Revision เป็นร่างและ 3 ข้อบังคับของการตรวจครบ · 1 Revision มีคำขอ pending ได้ครั้งละ 1 รายการ · คำขอที่ปิดแล้วแก้ไม่ได้ (เพิ่มความคิดเห็นได้) ·
 *   ขั้นเดินหน้าอย่างเดียว · อนุมัติ = Revision ต้อง Lock แล้ว · ส่งกลับ / ถอน = Revision ต้องกลับเป็นร่าง · ลบคำขอไม่ได้ (ยกเว้นรีเซ็ตข้อมูล)
 *   Revision เปลี่ยนสถานะได้เฉพาะผ่านคำขอ (core/revision.js ถาม authorizes) · ดำเนินการขั้นได้เฉพาะผู้มีบทบาทของขั้น + สิทธิ์ย่อย · ผู้ดูแลระบบทำแทนไม่ได้
 * ฟังก์ชันล้วน (Test ใน Node ได้): stepsFor · currentStep · canWithdraw · transition · pendingOf
 */
(function (SP) {
  'use strict';

  var KEY = 'approval.requests';
  var CFG_KEY = 'approvalConfig.revisionLock';
  var TYPES = ['revisionLock'];
  var STATUSES = ['pending', 'approved', 'returned', 'withdrawn'];
  var STEP_KEYS = ['mgmtSubmit', 'sdConfirm', 'mdLock'];
  var STEP_ROLE = { mgmtSubmit: 'management', sdConfirm: 'director', mdLock: 'md' };
  var STEP_PERM = { mgmtSubmit: 'approval.submit', sdConfirm: 'approval.sdConfirm', mdLock: 'approval.mdLock' };

  function store() { return SP.core.store; }
  function rev() { return SP.core.revision; }
  function texts() { return (SP.data.content && SP.data.content.labels && SP.data.content.labels.approval) || {}; }
  function cfgData() { return SP.data.approvals || {}; }
  function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function same(a, b) { return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b); }
  function fill(t, vars) { return String(t == null ? '' : t).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : ''; }); }
  function enabled() { var F = SP.core.features; return !!F && F.isOn('approval') && !!rev() && rev().enabled(); }

  // ---------------------------------------------------------------------
  // ฟังก์ชันล้วน
  // ---------------------------------------------------------------------
  function defaultConfig() { return normConfig(((cfgData().config || {}).revisionLock) || {}); }
  function normConfig(c) { return { sdConfirm: !!(c && c.sdConfirm) }; }
  // ขั้นของคำขอใหม่ตามตั้งค่า: Management ส่ง (ผ่านแล้ว) → Sales Director ยืนยัน (ปิด = skipped) → MD
  function stepsFor(config, p) {
    var c = normConfig(config);
    p = p || {};
    return [
      { key: 'mgmtSubmit', role: STEP_ROLE.mgmtSubmit, status: 'approved', actedBy: p.by || '', actedAt: p.at || '', note: p.note || '' },
      { key: 'sdConfirm', role: STEP_ROLE.sdConfirm, status: c.sdConfirm ? 'current' : 'skipped', actedBy: null, actedAt: null, note: null },
      { key: 'mdLock', role: STEP_ROLE.mdLock, status: c.sdConfirm ? 'waiting' : 'current', actedBy: null, actedAt: null, note: null }
    ];
  }
  function currentStep(req) {
    if (!req || req.status !== 'pending') return null;
    return (req.steps || []).filter(function (s) { return s.status === 'current'; })[0] || null;
  }
  // ถอนได้ก่อนขั้นถัดไปจากผู้ส่งถูกดำเนินการ
  function canWithdraw(req) {
    return !!req && req.status === 'pending' && !(req.steps || []).some(function (s) { return s.key !== 'mgmtSubmit' && (s.status === 'approved' || s.status === 'returned'); });
  }
  function find(list, id) { return (list || []).filter(function (r) { return r.id === id; })[0] || null; }
  function pendingOf(list, refId) { return (list || []).filter(function (r) { return r.refId === refId && r.status === 'pending'; })[0] || null; }
  function ofRef(list, refId) { return (list || []).filter(function (r) { return r.refId === refId; }); }
  function latestOf(list, refId) { var l = ofRef(list, refId); return l[l.length - 1] || null; }
  function nextId(list, refId) { var n = ofRef(list, refId).length + 1; return 'REQ-' + refId + '-' + (n < 10 ? '0' : '') + n; }

  // เปลี่ยนสถานะคำขอ 1 ครั้ง (ไม่ตรวจสิทธิ์ · ผู้เรียกตรวจ) → { ok, list, req, error: null | 'type' | 'status' | 'pending' | 'checks' | 'note' | 'missing' | 'closed' | 'step' | 'withdraw' | 'text' | 'action' }
  //   create:   p = { refId, type, by, at, note (บังคับ), summary, config, revStatus (ต้องเป็น draft), blocking, failed, id }
  //   confirm (sdConfirm) · approve (mdLock) · return (note บังคับ) · withdraw: p = { id, by, at, note }
  //   comment:  p = { id, by, at, text (บังคับ) } — เพิ่มได้ทุกสถานะ
  function transition(list, action, p) {
    p = p || {};
    var out = copy(list || []);
    function err(code, info) { return { ok: false, list: list, req: null, error: code, info: info || null }; }
    function done(r) { return { ok: true, list: out, req: r, error: null }; }
    if (action === 'create') {
      var type = p.type || 'revisionLock';
      if (TYPES.indexOf(type) < 0) return err('type');
      if (pendingOf(out, p.refId)) return err('pending');
      if (p.revStatus !== 'draft') return err('status');
      if (p.blocking > 0) return err('checks', p.failed || []);
      var note = String(p.note || '').trim();
      if (!note) return err('note');
      var req = { id: p.id || nextId(out, p.refId), type: type, refId: p.refId, status: 'pending', steps: stepsFor(p.config, { by: p.by, at: p.at, note: note }),
        summary: p.summary || null, comments: [], note: note, createdBy: p.by || '', createdAt: p.at || '', closedBy: null, closedAt: null, returnNote: null };
      out.push(req);
      return done(req);
    }
    var r = find(out, p.id);
    if (!r) return err('missing');
    if (action === 'comment') {
      var text = String(p.text || '').trim();
      if (!text) return err('text');
      r.comments = (r.comments || []).concat([{ by: p.by || '', at: p.at || '', text: text }]);
      return done(r);
    }
    if (r.status !== 'pending') return err('closed');
    var cur = currentStep(r);
    if (action === 'withdraw') {
      if (!canWithdraw(r)) return err('withdraw');
      r.status = 'withdrawn'; r.closedBy = p.by || ''; r.closedAt = p.at || '';
      if (cur) cur.status = 'waiting';
      return done(r);
    }
    if (!cur) return err('step');
    function act(st, note2) { cur.status = st; cur.actedBy = p.by || ''; cur.actedAt = p.at || ''; cur.note = note2 || ''; }
    if (action === 'confirm') {
      if (cur.key !== 'sdConfirm') return err('step');
      act('approved', p.note);
      var nx = (r.steps || []).filter(function (s) { return s.status === 'waiting'; })[0];
      if (nx) nx.status = 'current';
      return done(r);
    }
    if (action === 'approve') {
      if (cur.key !== 'mdLock') return err('step');
      act('approved', p.note);
      r.status = 'approved'; r.closedBy = p.by || ''; r.closedAt = p.at || '';
      return done(r);
    }
    if (action === 'return') {
      var rn = String(p.note || '').trim();
      if (!rn) return err('note');
      act('returned', rn);
      r.status = 'returned'; r.returnNote = rn; r.closedBy = p.by || ''; r.closedAt = p.at || '';
      return done(r);
    }
    return err('action');
  }

  // ---------------------------------------------------------------------
  // ส่วนที่ใช้ store
  // ---------------------------------------------------------------------
  function rawList() { var l = store().get(KEY); return Array.isArray(l) ? l : []; }
  function list() { return copy(rawList()); }
  function get(id) { return copy(find(rawList(), id)); }
  function config() { var c = store().get(CFG_KEY); return c ? normConfig(c) : defaultConfig(); }
  function forRevision(refId) { return copy(latestOf(rawList(), refId)); }
  function pendingFor(refId) { return copy(pendingOf(rawList(), refId)); }

  function P() { return SP.core.permissions; }
  function userOf(u) { return u || (P() ? P().user() : { roleIds: [] }); }
  function hasRole(u, role) { return (u.roleIds || []).indexOf(role) >= 0; }
  // ดำเนินการขั้นได้ = มีบทบาทของขั้น + สิทธิ์ย่อยของขั้น (ผู้ดูแลระบบไม่มีบทบาทของขั้น → ทำแทนไม่ได้)
  function canStep(stepKey, u) {
    u = userOf(u);
    return enabled() && hasRole(u, STEP_ROLE[stepKey]) && (!P() || P().can(u, STEP_PERM[stepKey]));
  }
  function canConfig(u) { return enabled() && (!P() || P().can(userOf(u), 'approval.config')); }
  function canComment(u) { return enabled() && (!P() || P().can(userOf(u), 'approval')); }
  // คำสั่งที่ผู้ใช้ทำได้กับคำขอนี้ตอนนี้
  function canAct(action, req, u) {
    if (!enabled() || !req) return false;
    var cur = currentStep(req);
    if (action === 'withdraw') return canWithdraw(req) && canStep('mgmtSubmit', u);
    if (action === 'confirm') return !!cur && cur.key === 'sdConfirm' && canStep('sdConfirm', u);
    if (action === 'approve') return !!cur && cur.key === 'mdLock' && canStep('mdLock', u);
    if (action === 'return') return !!cur && cur.key !== 'mgmtSubmit' && canStep(cur.key, u);
    if (action === 'comment') return canComment(u);
    return false;
  }
  // คำขอที่รอผู้ใช้ดำเนินการ (ป้ายเมนู · แท็บ รอฉันดำเนินการ) = ขั้นปัจจุบันเป็นขั้นที่ผู้ใช้ทำได้
  function waitingFor(u) {
    u = userOf(u);
    if (!enabled()) return [];
    return copy(rawList().filter(function (r) { var s = currentStep(r); return s && canStep(s.key, u); }));
  }
  function stepLabel(key) { return ((texts().steps || {})[key] || {}).label || key; }

  function errorText(res, extra) {
    var E = texts().errors || {};
    var R = (SP.data.content && SP.data.content.labels && SP.data.content.labels.revision) || {};
    var items = ((res && res.info) || []).map(function (k) { return (R.checks || {})[k] || k; }).join(' · ');
    return fill(E[res && res.error] || (R.errors || {})[res && res.error] || (res && res.error), Object.assign({ items: items }, extra || {}));
  }
  function fail(code, extra) { var e = new Error(fill((texts().errors || {})[code] || code, extra)); e.approval = code; return e; }

  // คำสั่งของคำขอที่กำลังทำ (core/revision.js ถามเพื่อยอมให้เปลี่ยนสถานะของรอบ · ทำแบบ synchronous ภายในฟังก์ชันของไฟล์นี้เท่านั้น)
  var inFlight = null;
  function authorizes(refId, action) { return !!inFlight && inFlight.refId === refId && inFlight.action === action; }
  function through(refId, action, fn) {
    inFlight = { refId: refId, action: action };
    try { return fn(); } finally { inFlight = null; }
  }

  function byName(p) { return p && p.by ? p.by : SP.core.components && SP.core.components.roleName ? SP.core.components.roleName(store().role()) : ''; }
  function nowIso(p) { return p && p.at ? p.at : SP.core.clock.now(); }
  function result(res) { return res.ok ? { ok: true, req: res.req, error: null } : { ok: false, req: null, error: res.error, info: res.info }; }

  // ส่งขออนุมัติ (Management · ปุ่มในแท็บ Revision ของ Plan Summary): สร้างคำขอ (ชุดสรุปตอนส่ง) → Revision รออนุมัติ
  function create(refId, p) {
    p = p || {};
    if (!enabled()) return { ok: false, error: 'disabled' };
    if (!p.system && !canStep('mgmtSubmit')) return { ok: false, error: 'permission' };
    var R = rev();
    var r = R.find(R.list(), refId);
    if (!r) return { ok: false, error: 'missing' };
    var ck = R.checks(refId);
    var by = byName(p), at = nowIso(p);
    var res = transition(rawList(), 'create', { refId: refId, type: 'revisionLock', by: by, at: at, note: p.note, summary: R.summary(refId), config: config(),
      revStatus: r.status, blocking: ck.blocking, failed: ck.failed });
    if (!res.ok) return result(res);
    // ตรวจวงจรของรอบก่อนเขียน (สถานะ · ข้อบังคับ) แล้วจึงบันทึกคำขอ → รอบเป็น รออนุมัติ
    var dry = R.transition(R.list(), 'submit', { id: refId, by: by, at: at, note: p.note, checks: ck });
    if (!dry.ok) return { ok: false, error: dry.error, info: dry.info };
    store().set(KEY, res.list);
    var s = through(refId, 'submit', function () { return R.submit(refId, { by: by, at: at, note: String(p.note || '').trim(), system: p.system }); });
    if (!s.ok) return { ok: false, error: s.error, info: s.info };
    return result(res);
  }
  // คำสั่งของขั้นปัจจุบัน: เปลี่ยนสถานะของรอบก่อน (ถ้ามี) แล้วบันทึกคำขอ
  function step(action, id, p) {
    p = p || {};
    if (!enabled()) return { ok: false, error: 'disabled' };
    var req = find(rawList(), id);
    if (!req) return { ok: false, error: 'missing' };
    if (!p.system && !canAct(action, req)) return { ok: false, error: 'permission' };
    var by = byName(p), at = nowIso(p);
    var res = transition(rawList(), action, { id: id, by: by, at: at, note: p.note, text: p.text });
    if (!res.ok) return result(res);
    var R = rev();
    var refId = req.refId;
    var r2 = { ok: true };
    if (action === 'approve') r2 = through(refId, 'lock', function () { return R.lock(refId, { by: by, at: at, confirmName: p.confirmName, note: p.note, system: p.system }); });
    else if (action === 'return') r2 = through(refId, 'return', function () { return R.returnToDraft(refId, { by: by, at: at, note: p.note, system: p.system }); });
    else if (action === 'withdraw') r2 = through(refId, 'withdraw', function () { return R.withdraw(refId, { by: by, at: at, note: p.note, system: p.system }); });
    else if (action === 'confirm') r2 = through(refId, 'confirm', function () { return R.logEvent(refId, { action: 'confirm', by: by, at: at, note: p.note || '' }, { system: p.system }); });
    if (!r2.ok) return { ok: false, error: r2.error, info: r2.info };
    store().set(KEY, res.list);
    return result(res);
  }
  function confirm(id, p) { return step('confirm', id, p); }
  function approve(id, p) { return step('approve', id, p); }
  function returnToDraft(id, p) { return step('return', id, p); }
  function withdraw(id, p) { return step('withdraw', id, p); }
  function comment(id, p) {
    p = p || {};
    if (!enabled()) return { ok: false, error: 'disabled' };
    if (!p.system && !canComment()) return { ok: false, error: 'permission' };
    var res = transition(rawList(), 'comment', { id: id, by: byName(p), at: nowIso(p), text: p.text });
    if (res.ok) store().set(KEY, res.list);
    return result(res);
  }
  // ตั้งค่าขั้นอนุมัติ (Management · ผู้ดูแลระบบ) — มีผลกับคำขอใหม่เท่านั้น
  function setConfig(next, p) {
    if (!enabled()) return { ok: false, error: 'disabled' };
    if (!(p && p.system) && !canConfig()) return { ok: false, error: 'permission' };
    store().set(CFG_KEY, normConfig(next));
    return { ok: true, config: config(), error: null };
  }
  // ชุดสรุปที่คำนวณใหม่ต่างจากที่เก็บตอนส่ง → [ส่วนที่ต่าง] ([] = เหมือนกัน · แถบเตือน ข้อมูลเปลี่ยนหลังส่งขออนุมัติ)
  function summaryChanges(id) {
    var req = find(rawList(), id);
    if (!req || !req.summary) return [];
    return SP.core.calc.revisionSummaryChanges(req.summary, rev().summary(req.refId, req.summary.compareTo));
  }

  // ---------------------------------------------------------------------
  // ข้อบังคับที่ Store (store.set / remove เรียกก่อนเขียน · โยน Error พร้อมข้อความของ content)
  // ---------------------------------------------------------------------
  function revStatusOf(refId) { var R = rev(); var r = R ? R.find(R.list(), refId) : null; return r ? r.status : null; }
  var STEP_MOVES = { waiting: ['waiting', 'current'], current: ['current', 'approved', 'returned', 'waiting'], approved: ['approved'], returned: ['returned'], skipped: ['skipped'] };
  function checkNew(n) {
    if (n.status !== 'pending' || TYPES.indexOf(n.type) < 0) throw fail('status');
    if (revStatusOf(n.refId) !== 'draft') throw fail('status');
    var st = n.steps || [];
    if (st.map(function (s) { return s.key; }).join() !== STEP_KEYS.join() || st[0].status !== 'approved') throw fail('steps');
    if (st.filter(function (s) { return s.status === 'current'; }).length !== 1) throw fail('steps');
    if (st.some(function (s) { return s.role !== STEP_ROLE[s.key]; })) throw fail('steps');
  }
  function checkExisting(o, n) {
    ['type', 'refId', 'createdBy', 'createdAt', 'note', 'summary'].forEach(function (k) { if (!same(n[k], o[k])) throw fail('immutable'); });
    var oc = o.comments || [], nc = n.comments || [];
    if (nc.length < oc.length || !same(nc.slice(0, oc.length), oc)) throw fail('immutable');
    function core(x) { var c = copy(x); delete c.comments; return c; }
    if (o.status !== 'pending') { if (!same(core(n), core(o))) throw fail('closed', { id: o.id }); return; }
    var os = o.steps || [], ns = n.steps || [];
    if (os.map(function (s) { return s.key + ':' + s.role; }).join() !== ns.map(function (s) { return s.key + ':' + s.role; }).join()) throw fail('steps');
    os.forEach(function (s, i) {
      if ((STEP_MOVES[s.status] || []).indexOf(ns[i].status) < 0) throw fail('steps');
      if (s.status !== 'current' && s.status !== 'waiting' && !same(ns[i], s)) throw fail('steps');
    });
    var rs = revStatusOf(o.refId);
    if (n.status === 'pending') {
      if (ns.filter(function (s) { return s.status === 'current'; }).length !== 1 || ns.some(function (s) { return s.status === 'returned'; })) throw fail('steps');
    } else if (n.status === 'approved') {
      if (!ns.every(function (s) { return s.status === 'approved' || s.status === 'skipped'; }) || rs !== 'locked') throw fail('approve');
    } else if (n.status === 'returned') {
      if (!ns.some(function (s) { return s.status === 'returned'; }) || rs !== 'draft' || !String(n.returnNote || '').trim()) throw fail('return');
    } else if (n.status === 'withdrawn') {
      if (!canWithdraw(o) || rs !== 'draft') throw fail('withdraw');
    } else throw fail('status');
  }
  function guardWrite(key, value, prev) {
    if (!enabled()) return;
    if (key === CFG_KEY) return;   // ตั้งค่า: ขั้นของคำขอที่มีอยู่เก็บไว้ในคำขอ จึงไม่กระทบคำขอ pending
    if (key !== KEY) return;
    var next = Array.isArray(value) ? value : [];
    var before = Array.isArray(prev) ? prev : [];
    before.forEach(function (o) {
      var n = find(next, o.id);
      if (!n) throw fail('remove');
      checkExisting(o, n);
    });
    next.forEach(function (n) { if (!find(before, n.id)) checkNew(n); });
    var seen = {};
    next.forEach(function (r) {
      if (r.status !== 'pending') return;
      if (seen[r.refId]) throw fail('pending');
      seen[r.refId] = true;
    });
  }
  // core/revision.js เรียกตอนรายการรอบเปลี่ยนสถานะ (Flag approval): เปลี่ยนได้เฉพาะเมื่อมีคำขอที่ตรงกัน
  //   draft → submitted = มีคำขอ pending · submitted → locked = ขั้นปัจจุบัน mdLock · submitted → draft = ขั้นปัจจุบันส่งกลับได้ หรือยังถอนได้
  function revisionMoveOk(refId, from, to) {
    if (!enabled() || from === to) return true;
    // ต้องมาจากคำสั่งของคำขอที่กำลังทำ (เขียนรายการรอบตรงๆ ไม่ได้ · เช่น Lock โดยไม่มี Snapshot)
    if (!inFlight || inFlight.refId !== refId) return false;
    var req = pendingOf(rawList(), refId);
    if (from === 'draft' && to === 'submitted') return !!req;
    if (from === 'submitted' && to === 'locked') { var c = currentStep(req); return !!c && c.key === 'mdLock'; }
    if (from === 'submitted' && to === 'draft') { var c2 = currentStep(req); return !!req && ((!!c2 && c2.key !== 'mgmtSubmit') || canWithdraw(req)); }
    return false;
  }

  // ข้อมูลตัวอย่าง: คำขอของรอบที่ระบุ ส่ง → MD อนุมัติ + ความคิดเห็น (core/revision.js loadSample · ข้อมูล data/approvals.js sample)
  function sampleApproved(refId, s) {
    s = s || {};
    var cr = create(refId, { by: s.submitBy, at: s.submitAt, note: s.submitNote, system: true });
    if (!cr.ok) return cr;
    (s.comments || []).forEach(function (c) { comment(cr.req.id, { by: c.by, at: c.at, text: c.text, system: true }); });
    var name = rev().find(rev().list(), refId).name;
    return approve(cr.req.id, { by: s.approveBy, at: s.approveAt, note: s.approveNote || '', confirmName: name, system: true });
  }

  SP.core.approval = {
    KEY: KEY, CFG_KEY: CFG_KEY, TYPES: TYPES, STATUSES: STATUSES, STEP_KEYS: STEP_KEYS, STEP_ROLE: STEP_ROLE, STEP_PERM: STEP_PERM,
    enabled: enabled,
    // ฟังก์ชันล้วน
    defaultConfig: defaultConfig, stepsFor: stepsFor, currentStep: currentStep, canWithdraw: canWithdraw, transition: transition, pendingOf: pendingOf, find: find,
    // store
    list: list, get: get, config: config, forRevision: forRevision, pendingFor: pendingFor, canStep: canStep, canConfig: canConfig, canComment: canComment, canAct: canAct,
    waitingFor: waitingFor, stepLabel: stepLabel, errorText: errorText, authorizes: authorizes, guardWrite: guardWrite, revisionMoveOk: revisionMoveOk,
    create: create, confirm: confirm, approve: approve, returnToDraft: returnToDraft, withdraw: withdraw, comment: comment, setConfig: setConfig, summaryChanges: summaryChanges,
    sampleApproved: sampleApproved
  };
})(window.SP);
