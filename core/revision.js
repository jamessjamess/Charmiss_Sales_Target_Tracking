/*
 * core/revision.js — CR-38 Revision ของ Sales Planning (Flag revision · ปิด = Phase 1 เดิมทุกฟังก์ชันส่งต่อไปที่ store)
 *
 * Revision = ชุดเป้าหมายและแผนของ 1 ปีแผน 1 รอบ (2027 R1, 2027 R2, …) · สถานะ draft (ร่าง) → submitted (รอ Lock) → locked (Lock แล้ว) · MD ส่งกลับเป็น draft ได้
 *   revision = { id ('2027-R2'), planYear, seq, name, status, effectiveMonth ('YYYY-MM'), basedOn, reason, openedBy/At, submittedBy/At, submitNote,
 *                lockedBy/At, returnNote, history: [{ action: open | submit | withdraw | return | lock, by, at, note }],
 *                base (เดือนที่ล็อก: { before, targets: { <unitId>: [บาท] }, sku: { <unitId>: { <key>: { u, s, n } } } }), lockBefore, snapshotAt }
 * ที่เก็บ (store):
 *   revision.list          รายการ Revision ทุกปี (ค่าตั้งต้น = data/revisions.js defaults: 2027 R1 ร่าง)
 *   revision.snap.<id>     Snapshot ตอน Lock (สร้างครั้งเดียว แก้ไม่ได้): plan (ค่าทั้ง 4 ขั้น) · master (ราคา GP ชื่อ Status สินค้า หน่วยขาย ผู้รับผิดชอบ) ·
 *                          channels · history (ยอดอ้างอิง L12M) · report (core/report.js build = ค่าที่คำนวณแล้วทั้งหมด) · base · checks
 *   plan.<ปี>.*            ข้อมูลของรอบล่าสุดของปี (working) — R1 ใช้ Key เดิม (ข้อมูลตั้งต้นเท่ากับก่อน CR) · เปิดรอบใหม่ = คัดลอกจาก Snapshot ของรอบ Lock ล่าสุด
 *   ui.revision            รอบที่เลือกใน Sales Planning (ใช้ร่วมทุกหน้า) · app.planYear = ปีของรอบที่เลือก
 * อ่านข้อมูลของรอบ (หน้า Sales Planning และ core/report.js): read(suffix) · data() · master() — รอบ Lock แล้ว = จาก Snapshot เท่านั้น · อื่น ๆ = store
 * ห้ามแก้ย้อนหลัง (บังคับที่ store.set / remove ผ่าน guardWrite · ไม่มีบทบาทใดข้ามได้ รวมผู้ดูแลระบบ):
 *   (ก) รอบ locked / submitted แก้ไม่ได้ · Snapshot และรายการของรอบ Lock แก้ไม่ได้ (revision.get คืน Object แช่แข็ง)
 *   (ข) รอบ draft: เดือนก่อน effectiveMonth และเดือนที่ปิดแล้ว (≤ clock.lastClosedMonth) แก้ไม่ได้ · เป้าหมายทั้งปีห้ามต่ำกว่าส่วนที่ล็อก
 *   การเขียนที่ค่าไม่เปลี่ยน (เช่น บันทึกค่าตั้งต้นให้คงที่ตอน Lock) ผ่านได้เสมอ · รีเซ็ตข้อมูล (store.reset) ล้างทั้งหมดได้
 * ฟังก์ชันล้วน (Test ใน Node ได้): writable · lockCount · transition · defaultEffective · effectiveIssue · baseFrom · checksFrom
 * CR-39 (Flag approval): เสนอ / ถอน / Lock / ส่งกลับ ทำผ่านคำขอใน core/approval.js เท่านั้น (authorizes · revisionMoveOk ที่ Store) · logEvent (Sales Director ยืนยัน) ·
 *   summary (calc.revisionSummary ชุดสรุปของคำขอ) · ข้อบังคับห้ามแก้ย้อนหลังและ Snapshot เหมือน CR-38 ทุกข้อ
 */
(function (SP) {
  'use strict';

  var KEY = 'revision.list';
  var SNAP = 'revision.snap.';
  var STATUSES = ['draft', 'submitted', 'locked'];

  function calc() { return SP.core.calc; }
  function clock() { return SP.core.clock; }
  function store() { return SP.core.store; }
  function texts() { return (SP.data.content && SP.data.content.labels && SP.data.content.labels.revision) || {}; }
  function cfg() { return SP.data.revisions || {}; }
  function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function fill(t, vars) { return String(t == null ? '' : t).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : ''; }); }
  function deepFreeze(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.keys(o).forEach(function (k) { deepFreeze(o[k]); }); }
    return o;
  }
  function enabled() { var F = SP.core.features; return !!F && F.isOn('revision'); }

  // =====================================================================
  // ฟังก์ชันล้วน
  // =====================================================================
  function idOf(year, seq) { return year + '-R' + seq; }
  function nameOf(year, seq) { return fill(texts().name || '{year} R{seq}', { year: year, seq: seq }); }
  function firstMonth(year) { return year + '-01'; }
  function ym(year, m) { return year + '-' + (m < 9 ? '0' : '') + (m + 1); }   // m 0–11

  // จำนวนเดือนแรกของปีแผนที่ปิดแล้ว (≤ เดือนปิดล่าสุด) → 0–12
  function closedCount(year, lastClosed) {
    var lc = String(lastClosed || clock().lastClosedMonth());
    var y = Number(lc.slice(0, 4)), m = Number(lc.slice(5, 7));
    return y < year ? 0 : y > year ? 12 : m;
  }
  // index ของเดือนที่มีผลในปีแผน → 0–12
  function effectiveIndex(rev) {
    var e = String(rev.effectiveMonth || firstMonth(rev.planYear));
    var y = Number(e.slice(0, 4));
    return y < rev.planYear ? 0 : y > rev.planYear ? 12 : Number(e.slice(5, 7)) - 1;
  }
  // จำนวนเดือนแรกที่ล็อกของรอบ (ก่อนเดือนที่มีผล หรือปิดแล้ว) · รอบ Lock แล้วใช้ค่าตอน Lock (lockBefore)
  function lockCount(rev, lastClosed) {
    if (!rev) return 0;
    if (rev.status === 'locked' && rev.lockBefore != null) return rev.lockBefore;
    return Math.max(effectiveIndex(rev), closedCount(rev.planYear, lastClosed));
  }
  // เขียนค่าของรอบนี้ (month = 'YYYY-MM' · ไม่ระบุ = ระดับทั้งปี) ได้หรือไม่ → { ok, code: null | 'locked' | 'submitted' | 'beforeEffective' | 'closed', month }
  function writable(rev, month, lastClosed) {
    if (!rev) return { ok: true, code: null, month: null };
    if (rev.status === 'locked') return { ok: false, code: 'locked', month: null };
    if (rev.status === 'submitted') return { ok: false, code: 'submitted', month: null };
    if (month == null) return { ok: true, code: null, month: null };
    var mk = String(month).slice(0, 7);
    var lc = String(lastClosed || clock().lastClosedMonth());
    if (mk < String(rev.effectiveMonth || firstMonth(rev.planYear))) return { ok: false, code: 'beforeEffective', month: mk };
    if (mk <= lc) return { ok: false, code: 'closed', month: mk };
    return { ok: true, code: null, month: null };
  }
  function errorText(rev, res, extra) {
    var E = texts().errors || {};
    var vars = { name: rev ? rev.name : '', month: res.month ? clock().label(res.month) : '' };
    Object.keys(extra || {}).forEach(function (k) { if (k !== 'month') vars[k] = extra[k]; });
    return fill(E[res.code] || res.code, vars);
  }
  function fail(rev, code, extra) {
    var res = { ok: false, code: code, month: extra && extra.month || null };
    var e = new Error(errorText(rev, res, extra));
    e.revision = { code: code, id: rev ? rev.id : null, month: res.month };
    return e;
  }

  function byYear(list, year) { return (list || []).filter(function (r) { return r.planYear === year; }).sort(function (a, b) { return a.seq - b.seq; }); }
  function latest(list, year) { var l = byYear(list, year); return l[l.length - 1] || null; }
  function openOf(list, year) { return byYear(list, year).filter(function (r) { return r.status !== 'locked'; })[0] || null; }
  function lastLocked(list, year) { return byYear(list, year).filter(function (r) { return r.status === 'locked'; }).pop() || null; }
  function find(list, id) { return (list || []).filter(function (r) { return r.id === id; })[0] || null; }
  function years(list) { var y = []; (list || []).forEach(function (r) { if (y.indexOf(r.planYear) < 0) y.push(r.planYear); }); return y.sort(); }

  // เดือนที่มีผลตั้งต้นของรอบใหม่ = เดือนถัดจากเดือนปัจจุบัน แต่ไม่ก่อนเดือนแรกของปีแผน (ระบบจริงกำหนดเป็นเดือนถัดไปเสมอ · Prototype เลือกได้)
  function defaultEffective(year, current) {
    var next = clock().addMonths(String(current || clock().currentMonth()), 1);
    var f = firstMonth(year);
    return next > f ? next : f;
  }
  // เดือนที่มีผลใช้ได้หรือไม่ → null | 'effective' (ต้องอยู่ในปีแผนและหลังเดือนปิดล่าสุด)
  function effectiveIssue(year, month, lastClosed) {
    var mk = String(month || '');
    var mo = Number(mk.slice(5, 7));
    if (!/^\d{4}-\d{2}$/.test(mk) || Number(mk.slice(0, 4)) !== year || mo < 1 || mo > 12) return 'effective';
    if (mk <= String(lastClosed || clock().lastClosedMonth())) return 'effective';
    return null;
  }

  function blank(year, seq, extra) {
    var r = { id: idOf(year, seq), planYear: year, seq: seq, name: nameOf(year, seq), status: 'draft', effectiveMonth: firstMonth(year), basedOn: null,
      reason: '', openedBy: '', openedAt: '', submittedBy: null, submittedAt: null, submitNote: null, lockedBy: null, lockedAt: null, returnNote: null,
      history: [], base: null, lockBefore: null, snapshotAt: null };
    Object.keys(extra || {}).forEach(function (k) { r[k] = extra[k]; });
    return r;
  }
  // รายการตั้งต้น (data/revisions.js defaults) = R1 ร่างของปีที่ระบุ มีผลเดือนแรกของปี
  //   CR-39: ประวัติเริ่มด้วย create (สร้างจากข้อมูลตั้งต้น · วันที่ = defaults[].createdAt) ประวัติจึงไม่ว่าง
  function defaultList() {
    return (cfg().defaults || []).map(function (d) {
      return blank(d.planYear, 1, { openedAt: d.createdAt || '', history: [{ action: 'create', by: '', at: d.createdAt || '', note: '' }] });
    });
  }

  // เปลี่ยนสถานะ 1 ครั้ง (ไม่ตรวจสิทธิ์ · ผู้เรียกตรวจ) → { ok, list, rev, error: null | 'open' | 'reason' | 'effective' | 'missing' | 'status' | 'checks' | 'confirmName' | 'note' }
  //   open:     p = { year, effectiveMonth (R1 = เดือนแรกของปีเสมอ), reason (บังคับ), by, at, base, lastClosed }
  //   submit:   p = { id, by, at, note, checks: { blocking (จำนวนข้อบังคับที่ยังไม่ครบ), failed: [ชื่อ] } } · withdraw: p = { id, by, at }
  //   lock:     p = { id, by, at, confirmName (ต้องตรงชื่อรอบ), snapshotAt, lockBefore } · return: p = { id, by, at, note (บังคับ) }
  function transition(list, action, p) {
    p = p || {};
    var out = copy(list || []);
    function err(code, extra) { return { ok: false, list: list, rev: null, error: code, info: extra || null }; }
    function ev(r, act, note) { r.history.push({ action: act, by: p.by || '', at: p.at || '', note: note || '' }); }
    if (action === 'open') {
      var year = Number(p.year);
      if (openOf(out, year)) return err('open');
      if (!String(p.reason || '').trim()) return err('reason');
      var prev = latest(out, year);
      var seq = prev ? prev.seq + 1 : 1;
      var eff = seq === 1 ? firstMonth(year) : String(p.effectiveMonth || defaultEffective(year));
      if (seq > 1 && effectiveIssue(year, eff, p.lastClosed)) return err('effective');
      var locked = lastLocked(out, year);
      var nr = blank(year, seq, { effectiveMonth: eff, basedOn: locked ? locked.id : null, reason: String(p.reason).trim(), openedBy: p.by || '', openedAt: p.at || '', base: p.base || null });
      ev(nr, 'open', nr.reason);
      out.push(nr);
      return { ok: true, list: out, rev: nr, error: null };
    }
    var r = find(out, p.id);
    if (!r) return err('missing');
    if (action === 'submit') {
      if (r.status !== 'draft') return err('status');
      if (p.checks && p.checks.blocking > 0) return err('checks', p.checks.failed || []);
      r.status = 'submitted'; r.submittedBy = p.by || ''; r.submittedAt = p.at || ''; r.submitNote = p.note || ''; r.returnNote = null;
      ev(r, 'submit', p.note);
    } else if (action === 'withdraw') {
      if (r.status !== 'submitted') return err('status');
      r.status = 'draft';
      ev(r, 'withdraw', p.note);
    } else if (action === 'lock') {
      if (r.status !== 'submitted') return err('status');
      if (String(p.confirmName || '').trim() !== r.name) return err('confirmName');
      r.status = 'locked'; r.lockedBy = p.by || ''; r.lockedAt = p.at || '';
      r.snapshotAt = p.snapshotAt || p.at || ''; r.lockBefore = p.lockBefore != null ? p.lockBefore : lockCount(r, p.lastClosed);
      ev(r, 'lock', p.note);
    } else if (action === 'return') {
      if (r.status !== 'submitted') return err('status');
      if (!String(p.note || '').trim()) return err('note');
      r.status = 'draft'; r.returnNote = String(p.note).trim();
      ev(r, 'return', r.returnNote);
    } else {
      return err('status');
    }
    return { ok: true, list: out, rev: r, error: null };
  }

  // ค่าของเดือนล็อกจากรายงานของรอบก่อน (core/report.js build · Snapshot.report) → base | null (ไม่มีเดือนล็อก)
  function baseFrom(report, before) {
    if (!before || !report) return null;
    var base = { before: before, targets: {}, sku: {} };
    (report.units || []).forEach(function (u) { base.targets[u.id] = (u.targetM || []).slice(0, before).map(function (v) { return Number(v) || 0; }); });
    (report.skuItems || []).forEach(function (it) {
      var u = (it.units || []).slice(0, before);
      if (!u.some(function (v) { return v; })) return;
      var bu = base.sku[it.unitId] || (base.sku[it.unitId] = {});
      bu[it.key] = { u: u.map(Number), s: (it.sale || []).slice(0, before).map(Number), n: (it.net || []).slice(0, before).map(Number) };
    });
    return base;
  }
  // ตรวจก่อนเสนอ Lock (ใช้ผลตรวจความครบถ้วนเดิมของแต่ละขั้น) · tree = calc.topDown · phasingRem = { <unitId>: สถานะคงเหลือรายเดือน } · skuRem = { <unitId>: สถานะแผนเทียบเป้า }
  //   → { items: [{ key, ok, n, page, warn }], blocking, failed: [key] } · 3 ข้อแรกบังคับ · แผน SKU ครบเป้า = คำเตือน
  function checksFrom(tree, phasingRem, skuRem) {
    var chBad = (tree.children || []).filter(function (c) { return !c.remaining || c.remaining.status !== 'ok'; }).length;
    var units = calc().planUnits(tree);
    var unitBad = units.filter(function (u) { return u.amount > 0 && (phasingRem || {})[u.id] !== 'ok'; }).length;
    var skuBad = units.filter(function (u) { return u.amount > 0 && (skuRem || {})[u.id] !== 'ok'; }).length;
    var items = [
      { key: 'totalChannel', ok: !!(tree.children && tree.children.length) && tree.remaining.status === 'ok', n: 0, page: 'topDown', warn: false },
      { key: 'channelUnits', ok: !!(tree.children && tree.children.length) && chBad === 0, n: chBad, page: 'phasing', warn: false },
      { key: 'unitMonthly', ok: units.length > 0 && unitBad === 0, n: unitBad, page: 'phasing', warn: false },
      { key: 'skuPlan', ok: skuBad === 0, n: skuBad, page: 'skuPlanning', warn: true }
    ];
    var failed = items.filter(function (x) { return !x.ok && !x.warn; }).map(function (x) { return x.key; });
    return { items: items, blocking: failed.length, failed: failed };
  }

  // =====================================================================
  // ส่วนที่ใช้ store
  // =====================================================================
  function rawList() { var l = store().get(KEY); return Array.isArray(l) ? l : defaultList(); }
  function list(year) { var l = rawList(); return deepFreeze(year != null ? byYear(l, Number(year)) : l); }
  function rev(id) { return find(rawList(), id || selectedId()); }

  // Snapshot แช่แข็ง (เก็บไว้ต่อการโหลดหน้า · ตรวจกับ snapshotAt ของรอบ)
  var snapCache = {};
  function snapshotOf(id) {
    var r = find(rawList(), id);
    if (!r || r.status !== 'locked') return null;
    var c = snapCache[id];
    if (c && c.at === r.snapshotAt) return c.snap;
    var s = store().get(SNAP + id);
    if (!s) return null;
    snapCache[id] = { at: r.snapshotAt, snap: deepFreeze(s), json: null };
    return snapCache[id].snap;
  }
  // Revision แบบแช่แข็ง (รอบ Lock แล้วมี snapshot) — แก้ Object ที่ได้ไม่มีผลกับข้อมูล
  function get(id) {
    var r = find(rawList(), id);
    if (!r) return null;
    var out = copy(r);
    if (r.status === 'locked') out.snapshot = snapshotOf(id);
    return deepFreeze(out);
  }

  function defaultIdFor(l, year) {
    var o = openOf(l, year) || lastLocked(l, year) || latest(l, year) || l[l.length - 1];
    return o ? o.id : null;
  }
  // รอบที่เลือก (ui.revision · ไม่มี = รอบร่าง / รอ Lock ของปีที่เลือก → รอบ Lock ล่าสุด)
  function selectedId() {
    if (!enabled()) return null;
    var l = rawList();
    var sel = store().get('ui.revision');
    if (sel && find(l, sel)) return sel;
    return defaultIdFor(l, store().year());
  }
  function current() { var id = selectedId(); return id ? get(id) : null; }
  function select(id) {
    var r = find(rawList(), id);
    if (!r) return false;
    store().set('ui.revision', id);
    if (SP.data.settings.PLAN_YEARS.indexOf(r.planYear) >= 0) store().set('app.planYear', r.planYear);
    return true;
  }
  function working(year) { return latest(rawList(), Number(year)); }
  function yearOf(id) { var r = find(rawList(), id); return r ? r.planYear : store().year(); }
  // ข้อความอ่านอย่างเดียวของรอบที่เลือก (null = แก้ได้ตามสิทธิ์)
  function readOnlyReason(id) {
    if (!enabled()) return null;
    var r = rev(id);
    if (!r || r.status === 'draft') return null;
    return errorText(r, { code: r.status, month: null });
  }

  // Key ที่เขียนได้ของรอบ (ข้อมูลของรอบล่าสุดของปีอยู่ที่ plan.<ปี>.*)
  function planKey(suffix, id) { return 'plan.' + (enabled() && rev(id) ? rev(id).planYear : store().year()) + '.' + suffix; }
  // อ่านข้อมูลของรอบ: รอบ Lock = จาก Snapshot (ไม่มี Key = ค่าตั้งต้น) · อื่น = store
  function read(suffix, id) {
    if (!enabled()) return store().get(store().planKey(suffix));
    var r = rev(id);
    if (r && r.status === 'locked') {
      var s = snapshotOf(r.id);
      if (s && s.plan) return s.plan[suffix] !== undefined ? copy(s.plan[suffix]) : store().getDefault('plan.' + r.planYear + '.' + suffix);
    }
    return store().get('plan.' + (r ? r.planYear : store().year()) + '.' + suffix);
  }
  function snapJson(id) {
    var s = snapshotOf(id);
    if (!s) return null;
    var c = snapCache[id];
    if (!c.json) c.json = JSON.stringify({ master: s.master, channels: s.channels, history: s.history });
    return c.json;
  }
  // SP.data ของรอบ (ส่งให้ calc) · รอบ Lock = Master / Channel / ยอดอ้างอิงจาก Snapshot (สำเนาใหม่ทุกครั้ง)
  function data(id) {
    if (!enabled()) return store().data();
    var r = rev(id);
    var j = r && r.status === 'locked' ? snapJson(r.id) : null;
    if (!j) return store().data();
    var s = JSON.parse(j);
    var d = {};
    Object.keys(SP.data).forEach(function (k) { d[k] = SP.data[k]; });
    Object.keys(s.master || {}).forEach(function (k) { d[k] = s.master[k]; });
    if (s.channels) d.channels = s.channels;
    if (s.history) d.history = s.history;
    return d;
  }
  function master(id) {
    if (!enabled()) return store().master();
    var r = rev(id);
    var j = r && r.status === 'locked' ? snapJson(r.id) : null;
    if (!j) return store().master();
    var m = store().master();
    var s = JSON.parse(j).master || {};
    Object.keys(s).forEach(function (k) { m[k] = s[k]; });
    return m;
  }

  // เดือนที่ล็อกของรอบ → 0–12 (ไม่เปิด Flag = 0)
  function lockIdx(id) { return enabled() && rev(id) ? lockCount(rev(id)) : 0; }
  // เป้ารายเดือนที่ล็อกของหน่วยขาย → [12 | null] | null (ไม่มีเดือนล็อก)
  function lockedTargets(unitId, id) {
    var r = enabled() ? rev(id) : null;
    var b = r && r.base;
    if (!b || !b.before) return null;
    var vals = (b.targets || {})[unitId] || [];
    var out = [];
    for (var m = 0; m < 12; m++) out.push(m < b.before ? Number(vals[m] || 0) : null);
    return out;
  }
  function lockedTargetMap(r) {
    var out = {};
    var b = r && r.base;
    if (!b || !b.before) return out;
    Object.keys(b.targets || {}).forEach(function (u) { out[u] = lockedTargets(u, r.id); });
    return out;
  }
  // เป้ารายเดือนของหน่วยขายในรอบนี้ (calc.revisionPhasing · ไม่มีเดือนล็อก = phasingTotals เดิม)
  function phasing(unitId, annual, monthPct, id) { return calc().revisionPhasing(annual, monthPct || [], lockedTargets(unitId, id)); }
  // Net Sales รวมแผน SKU ของหน่วยขายในรอบนี้ (เดือนล็อก = ค่าของรอบก่อน) · d / m = data / master ที่มีอยู่แล้ว (ไม่ส่ง = ของรอบ)
  function planNet(unitId, d, m, id) {
    var r = rev(id);
    return calc().skuPlanGrid(d || data(id), m || master(id), unitId, read('sku.' + unitId, id), { year: r ? r.planYear : store().year(), mode: 'initial', revisionLock: gridLock(unitId, id) }).yearTotal.net;
  }
  // ค่าของแผน SKU ในเดือนล็อก (skuPlanGrid opts.revisionLock) → { before, items } | null
  function gridLock(unitId, id) {
    var r = enabled() ? rev(id) : null;
    var b = r && r.base;
    if (!b || !b.before) return null;
    return { before: b.before, items: (b.sku || {})[unitId] || {} };
  }

  // ---------------------------------------------------------------------
  // ข้อบังคับห้ามแก้ย้อนหลัง (store.set / store.remove เรียกก่อนเขียน · โยน Error พร้อมข้อความของ content)
  // ---------------------------------------------------------------------
  function same(a, b) { return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b); }
  function guardWrite(key, value, prev, wasSet) {
    if (!enabled()) return;
    if (key === KEY) { guardList(value); return; }
    if (key.indexOf(SNAP) === 0) { if (wasSet) throw fail(find(rawList(), key.slice(SNAP.length)), 'snapshot'); return; }
    var m = /^plan\.(\d{4})\.(.+)$/.exec(key);
    if (!m) return;
    var year = Number(m[1]), suffix = m[2];
    if (/^workflow\./.test(suffix) || suffix === 'baselineVersions') return;   // Phase 2 เดิม (Flag ปิด)
    var w = latest(rawList(), year);
    if (!w || same(value, prev)) return;
    var res = writable(w, null);
    if (!res.ok) throw fail(w, res.code);
    var L = lockCount(w);
    if (!L) return;
    if (suffix === 'topDown') { guardTopDown(w, value); return; }
    var pm = /^phasing\.(.+)$/.exec(suffix);
    if (pm) { guardShares(w, pm[1], value, prev, L); return; }
    var sm = /^sku\.(.+)$/.exec(suffix);
    if (sm) guardSku(w, sm[1], value, prev, L);
  }
  function monthFail(w, m) {
    var mk = ym(w.planYear, m);
    return fail(w, mk < String(w.effectiveMonth) ? 'beforeEffective' : 'closed', { month: mk });
  }
  function guardList(next) {
    var prevList = rawList();
    prevList.forEach(function (r) {
      // CR-39: Flag approval = สถานะของรอบเปลี่ยนได้เฉพาะผ่านคำขออนุมัติ (core/approval.js revisionMoveOk)
      var n = find(next || [], r.id);
      if (n && approvalOn() && !SP.core.approval.revisionMoveOk(r.id, r.status, n.status)) throw fail(r, 'approvalOnly');
      if (r.status !== 'locked') return;
      if (!same(n, r)) throw fail(r, 'locked');
    });
  }
  function guardTopDown(w, value) {
    if (!value) throw fail(w, 'removeLocked', { label: w.name });
    var tree = calc().topDown(store().data(), value, w.planYear);
    var issues = calc().lockedTargetIssues(tree, lockedTargetMap(w));
    if (!issues.length) return;
    var x = issues[0];
    var b = w.base || {};
    throw fail(w, 'belowLocked', { label: x.name || texts().total || '', range: clock().label(ym(w.planYear, 0), true) + '–' + clock().label(ym(w.planYear, Math.max(0, (b.before || 1) - 1)), true),
      amount: SP.core.format ? SP.core.format.baht(x.locked) : String(Math.round(x.locked)) });
  }
  function guardShares(w, unitId, value, prev, L) {
    var b = w.base || {};
    if (value === undefined) {
      if ((b.targets || {})[unitId] && b.targets[unitId].some(function (v) { return v; })) throw fail(w, 'removeLocked', { label: unitId });
      return;
    }
    var a = (prev && prev.monthPct) || [], n = (value && value.monthPct) || [];
    for (var m = 0; m < L; m++) if (Math.abs((a[m] || 0) - (n[m] || 0)) > 1e-12) throw monthFail(w, m);
  }
  function guardSku(w, unitId, value, prev, L) {
    var b = ((w.base || {}).sku || {})[unitId] || {};
    var ni = (value && value.items) || {}, oi = (prev && prev.items) || {};
    var keys = {};
    Object.keys(ni).concat(Object.keys(oi)).forEach(function (k) { keys[k] = true; });
    Object.keys(keys).forEach(function (k) {
      var o = oi[k], n = ni[k];
      if (!n && b[k] && b[k].u.some(function (v) { return v; })) throw fail(w, 'removeLocked', { label: k });
      for (var m = 0; m < L; m++) {
        var oq = o && o.qty ? Number(o.qty[m] || 0) : 0, nq = n && n.qty ? Number(n.qty[m] || 0) : 0;
        var oo = !!(o && o.overrides && o.overrides[m]), no = !!(n && n.overrides && n.overrides[m]);
        if (oq !== nq || oo !== no) throw monthFail(w, m);
      }
    });
  }
  // ตรวจว่าเขียนค่าของรอบ / เดือนนี้ได้ (CR-38 ข้อ 1.3) → true | โยน Error
  function assertWritable(revisionId, month) {
    var r = find(rawList(), revisionId);
    var res = writable(r, month);
    if (!res.ok) throw fail(r, res.code, { month: res.month });
    return true;
  }

  // ---------------------------------------------------------------------
  // วงจรสถานะ (ตรวจสิทธิ์จาก core/permissions.js · ทุกครั้งบันทึก history)
  // ---------------------------------------------------------------------
  var NEED = { open: 'revision.open', submit: 'revision.submit', withdraw: 'revision.submit', lock: 'revision.lock', 'return': 'revision.lock' };
  function byName(p) { return p && p.by ? p.by : SP.core.components && SP.core.components.roleName ? SP.core.components.roleName(store().role()) : ''; }
  function approvalOn() { return enabled() && !!SP.core.approval && SP.core.approval.enabled(); }
  function allowed(action, p, id) {
    if (p && p.system) return true;   // ข้อมูลตัวอย่าง (loadSample)
    // CR-39: Flag approval = เสนอ / ถอน / Lock / ส่งกลับ / ยืนยัน ได้เฉพาะจากคำขอที่กำลังดำเนินการ (core/approval.js ตรวจบทบาทและสิทธิ์ของขั้นแล้ว)
    if (action !== 'open' && approvalOn()) return SP.core.approval.authorizes(id, action);
    var P = SP.core.permissions;
    return !P || P.can(P.user(), NEED[action]);
  }
  function result(res) { return res.ok ? { ok: true, rev: res.rev, error: null } : { ok: false, rev: null, error: res.error, info: res.info }; }
  function canAct(action, id) { return enabled() && allowed(action, null, id) && (action === 'open' ? true : !!find(rawList(), id)); }

  // ข้อมูลของรอบ (ค่าทั้ง 4 ขั้น) จาก Key ของรอบล่าสุดของปี
  function planData(year) {
    var S = store();
    var td = S.get('plan.' + year + '.topDown');
    var out = { topDown: td };
    var notes = S.get('plan.' + year + '.unitNotes');
    if (notes !== undefined) out.unitNotes = notes;
    (td.channels || []).forEach(function (ch) {
      ((td.units || {})[ch] || []).forEach(function (u) {
        out['phasing.' + u] = S.get('plan.' + year + '.phasing.' + u);
        out['sku.' + u] = S.get('plan.' + year + '.sku.' + u);
      });
    });
    return out;
  }
  // บันทึกค่าทุก Key ของรอบให้คงที่ (ค่าตั้งต้นที่คำนวณจาก Master ไม่เปลี่ยนตาม Master หลัง Lock)
  function materialize(year, values) {
    var S = store();
    Object.keys(values).forEach(function (k) { S.set('plan.' + year + '.' + k, values[k]); });
  }
  var MASTER_KEYS = ['products', 'listings', 'taxonomy', 'basePrices', 'promoPrices', 'npdPlans', 'accounts', 'territories', 'salespeople', 'assignments', 'customers', 'customerAssignments'];
  function makeSnapshot(r, p) {
    var S = store();
    var d = S.data(), m = S.master();
    var mm = {};
    MASTER_KEYS.forEach(function (k) { mm[k] = m[k]; });
    var report = SP.core.report.build({ revisionId: r.id, live: true });
    // CR-41: ยอดขายของรอบเก็บเดือนปัจจุบันตอน Lock (history.asOfMonth · calc.refClock) → ยอดอ้างอิงของรอบนี้ไม่เปลี่ยนตามนาฬิกาภายหลัง
    var hist = {};
    Object.keys(d.history || {}).forEach(function (k) { hist[k] = d.history[k]; });
    hist.asOfMonth = SP.core.clock.currentMonth();
    return {
      id: r.id, at: p.at, by: p.by, plan: planData(r.planYear), master: mm, channels: copy(SP.data.channels), history: hist,
      report: report, base: r.base || null, lockBefore: lockCount(r), checks: checks(r.id)
    };
  }

  function open(p) {
    p = p || {};
    if (!enabled()) return { ok: false, error: 'status' };
    if (!allowed('open', p)) return { ok: false, error: 'permission' };
    var year = Number(p.year || store().year());
    var l = rawList();
    if (openOf(l, year)) return { ok: false, error: 'open' };
    var prevLocked = lastLocked(l, year);
    var seq = (latest(l, year) || { seq: 0 }).seq + 1;
    var eff = seq === 1 ? firstMonth(year) : String(p.effectiveMonth || defaultEffective(year));
    var before = lockCount({ planYear: year, effectiveMonth: eff, status: 'draft' });
    var snap = prevLocked ? snapshotOf(prevLocked.id) : null;
    var base = before ? baseFrom(snap ? snap.report : SP.core.report.build({ revisionId: (latest(l, year) || {}).id, live: true }), before) : null;
    var res = transition(l, 'open', { year: year, effectiveMonth: eff, reason: p.reason, by: byName(p), at: p.at || SP.core.clock.now(), base: base });
    if (!res.ok) return result(res);
    store().set(KEY, res.list);
    // R2 ขึ้นไป: คัดลอกค่าทั้ง 4 ขั้นจาก Snapshot ของรอบ Lock ล่าสุด
    if (snap && snap.plan) materialize(year, copy(snap.plan));
    select(res.rev.id);
    return result(res);
  }
  function submit(id, p) {
    p = p || {};
    if (!allowed('submit', p, id)) return { ok: false, error: 'permission' };
    var ck = checks(id);
    var res = transition(rawList(), 'submit', { id: id, by: byName(p), at: p.at || SP.core.clock.now(), note: p.note, checks: ck });
    if (res.ok) store().set(KEY, res.list);
    return result(res);
  }
  function withdraw(id, p) {
    p = p || {};
    if (!allowed('withdraw', p, id)) return { ok: false, error: 'permission' };
    var res = transition(rawList(), 'withdraw', { id: id, by: byName(p), at: p.at || SP.core.clock.now(), note: p.note });
    if (res.ok) store().set(KEY, res.list);
    return result(res);
  }
  function returnToDraft(id, p) {
    p = p || {};
    if (!allowed('return', p, id)) return { ok: false, error: 'permission' };
    var res = transition(rawList(), 'return', { id: id, by: byName(p), at: p.at || SP.core.clock.now(), note: p.note });
    if (res.ok) store().set(KEY, res.list);
    return result(res);
  }
  // Lock: ตรวจก่อน (ชื่อรอบ · สถานะ) → Snapshot → บันทึกค่าทุก Key ให้คงที่ → Lock แล้ว
  function lock(id, p) {
    p = p || {};
    if (!allowed('lock', p, id)) return { ok: false, error: 'permission' };
    var by = byName(p), at = p.at || SP.core.clock.now();
    var dry = transition(rawList(), 'lock', { id: id, by: by, at: at, confirmName: p.confirmName });
    if (!dry.ok) return result(dry);
    var r = find(rawList(), id);
    var snap = makeSnapshot(r, { by: by, at: at });
    materialize(r.planYear, snap.plan);
    store().set(SNAP + id, snap);
    var res = transition(rawList(), 'lock', { id: id, by: by, at: at, confirmName: p.confirmName, snapshotAt: at, lockBefore: snap.lockBefore });
    if (res.ok) store().set(KEY, res.list);
    return result(res);
  }

  // CR-39: บันทึกเหตุการณ์ในประวัติของรอบที่ไม่เปลี่ยนสถานะ (Sales Director ยืนยัน · ผ่านคำขอเท่านั้น) · ev = { action, by, at, note }
  function logEvent(id, ev, p) {
    p = p || {};
    if (!allowed(ev && ev.action, p, id)) return { ok: false, error: 'permission' };
    var l = copy(rawList());
    var r = find(l, id);
    if (!r) return { ok: false, error: 'missing' };
    if (r.status === 'locked') return { ok: false, error: 'status' };
    r.history.push({ action: ev.action, by: ev.by || byName(p), at: ev.at || SP.core.clock.now(), note: ev.note || '' });
    store().set(KEY, l);
    return { ok: true, rev: r, error: null };
  }

  // ตรวจก่อนเสนอ Lock ของรอบ (CR-38 ข้อ 3.3)
  function checks(id) {
    var r = find(rawList(), id || selectedId());
    if (!r) return { items: [], blocking: 0, failed: [] };
    var c = calc();
    var d = data(r.id);
    var tree = c.topDown(d, read('topDown', r.id), r.planYear);
    var phRem = {}, skuRem = {};
    var rep = r.status === 'locked' && snapshotOf(r.id) ? snapshotOf(r.id).report : SP.core.report.build({ revisionId: r.id, live: true });
    c.planUnits(tree).forEach(function (u) { phRem[u.id] = phasing(u.id, u.amount, (read('phasing.' + u.id, r.id) || {}).monthPct, r.id).remaining.status; });
    (rep.units || []).forEach(function (u) { skuRem[u.id] = c.remaining(u.target, u.plan).status; });
    return checksFrom(tree, phRem, skuRem);
  }

  // ข้อมูลของการ์ดสถานะรอบ (Revision List · Plan Summary แท็บติดตามสถานะ) → { rev, total, base, baseTotal, diff, pct, checks, lockN } | null
  //   base = รอบที่ใช้เป็นฐาน (basedOn) · Total ของรอบ Lock = จาก Snapshot
  function totalOf(r) {
    if (!r) return null;
    var s = r.status === 'locked' ? snapshotOf(r.id) : null;
    if (s && s.report) return s.report.total.amount;
    return calc().topDown(data(r.id), read('topDown', r.id), r.planYear).amount;
  }
  function overview(id) {
    var r = find(rawList(), id || selectedId());
    if (!r) return null;
    var base = r.basedOn ? find(rawList(), r.basedOn) : null;
    var total = totalOf(r), baseTotal = base ? totalOf(base) : null;
    var s = r.status === 'locked' ? snapshotOf(r.id) : null;
    return deepFreeze({ rev: copy(r), total: total, base: base ? copy(base) : null, baseTotal: baseTotal, diff: baseTotal != null ? total - baseTotal : null,
      pct: baseTotal ? (total - baseTotal) / baseTotal : null, checks: s && s.checks ? copy(s.checks) : checks(r.id), lockN: lockCount(r) });
  }

  // ข้อมูลสำหรับ Revision Compare (calc.compareRevisions) — รอบ Lock = Snapshot.report · อื่น = core/report.js build ของรอบนั้น
  //   เป้าหมาย: หน่วยขาย = targetM (บาท Net Sales) · Sale Amount = calc.saleFromNet ด้วย GP ของหน่วยขาย · Channel / Total = ผลรวมของหน่วยขาย
  //   แผน SKU = report.skuItems (ชิ้น · Sale Amount · Net Sales รายเดือน)
  function dataset(id) {
    var r = find(rawList(), id);
    if (!r) return null;
    var c = calc();
    var s = r.status === 'locked' ? snapshotOf(id) : null;
    var rep = s && s.report ? s.report : SP.core.report.build({ revisionId: id, live: true });
    var d = data(id);
    function saleOf(v, u) { var info = c.unitInfo(d, u); var x = c.saleFromNet(v, c.gpOf(d, u), info && info.channel ? info.channel.hasGP !== false : true); return x == null ? 0 : x; }
    var units = (rep.units || []).map(function (u) {
      var net = (u.targetM || []).map(function (v) { return Number(v) || 0; });
      return { id: u.id, name: u.name, channelId: u.channelId, annual: Number(u.target) || 0, saleAnnual: saleOf(Number(u.target) || 0, u.id), net: net, sale: net.map(function (v) { return saleOf(v, u.id); }) };
    });
    var channels = (rep.channels || []).map(function (ch) {
      var mine = units.filter(function (u) { return u.channelId === ch.id; });
      var net = c.sum ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (m) { return c.sum(mine.map(function (u) { return u.net[m]; })); }) : [];
      var sale = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (m) { return c.sum(mine.map(function (u) { return u.sale[m]; })); });
      return { id: ch.id, name: ch.name, color: ch.color, annual: Number(ch.amount) || 0, saleAnnual: c.sum(mine.map(function (u) { return u.saleAnnual; })), net: net, sale: sale };
    });
    var months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    var seriesNames = {};
    (((master(id) || {}).taxonomy || {}).series || []).forEach(function (x) { seriesNames[x.id] = x.name; });
    return {
      id: r.id, name: r.name, planYear: r.planYear, seq: r.seq, status: r.status, effectiveMonth: r.effectiveMonth, lockBefore: lockCount(r),
      total: { annual: Number(rep.total.amount) || 0, saleAnnual: c.sum(channels.map(function (x) { return x.saleAnnual; })),
        net: months.map(function (m) { return c.sum(channels.map(function (x) { return x.net[m]; })); }), sale: months.map(function (m) { return c.sum(channels.map(function (x) { return x.sale[m]; })); }) },
      channels: channels, units: units, items: rep.skuItems || [], seriesNames: seriesNames
    };
  }
  // CR-41: ยอดจริงของปีแผนในรูปแบบเดียวกับ dataset (ตัวเลือก B = ยอดจริง ของ Revision Compare รายเดือน · หน่วยขายตามรอบ refId)
  //   หน่วยขาย = calc.actualMonthly ของข้อมูลปัจจุบัน (เดือนที่ยังไม่ปิด = 0 · closed = [12 bool]) · annual = ยอดจริงสะสม
  //   Channel / Total = ยอดจริงของทุกหน่วยใน Master ของ Channel (รวมหน่วยที่ไม่อยู่ในแผน · ยอดขายจริงไม่ขึ้นกับแผน)
  var ACTUAL = 'actual';
  function actualDataset(refId) {
    var ref = dataset(refId);
    if (!ref) return null;
    var c = calc(), d = store().data(), K = SP.core.clock;
    var months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    var closed = months.map(function (m) { return K.isClosed(ref.planYear, m); });
    function saleOf(v, u) { var info = c.unitInfo(d, u); var x = c.saleFromNet(v, c.gpOf(d, u), info && info.channel ? info.channel.hasGP !== false : true); return x == null ? 0 : x; }
    function unitActual(id, name, channelId) {
      var net = c.actualMonthly(d, id, ref.planYear).map(function (v, m) { return closed[m] ? v || 0 : 0; });
      var sale = net.map(function (v) { return saleOf(v, id); });
      return { id: id, name: name, channelId: channelId, annual: c.sum(net), saleAnnual: c.sum(sale), net: net, sale: sale };
    }
    var units = ref.units.map(function (u) { return unitActual(u.id, u.name, u.channelId); });
    var channels = ref.channels.map(function (ch) {
      var mine = c.unitsOfChannel(d, ch.id).map(function (u) { return unitActual(u.id, u.name, ch.id); });
      var net = months.map(function (m) { return c.sum(mine.map(function (u) { return u.net[m]; })); });
      var sale = months.map(function (m) { return c.sum(mine.map(function (u) { return u.sale[m]; })); });
      return { id: ch.id, name: ch.name, color: ch.color, annual: c.sum(net), saleAnnual: c.sum(sale), net: net, sale: sale };
    });
    return {
      id: ACTUAL, name: ACTUAL, planYear: ref.planYear, seq: 0, status: ACTUAL, effectiveMonth: null, lockBefore: 0, closed: closed,
      total: { annual: c.sum(channels.map(function (x) { return x.annual; })), saleAnnual: c.sum(channels.map(function (x) { return x.saleAnnual; })),
        net: months.map(function (m) { return c.sum(channels.map(function (x) { return x.net[m]; })); }), sale: months.map(function (m) { return c.sum(channels.map(function (x) { return x.sale[m]; })); }) },
      channels: channels, units: units, items: [], seriesNames: {}
    };
  }
  // เปรียบเทียบ 2 รอบ (CR-38 ข้อ 5.4 · ชื่อใน CR = SP.calc.compareRevisions(aId, bId, opts)) → ผลของ calc.compareRevisions
  //   CR-41: bId = 'actual' → ยอดจริงของปีแผนของรอบ A (actualDataset · ใช้กับระดับ Total / Channel / หน่วยขาย)
  function compare(aId, bId, opts) { return calc().compareRevisions(dataset(aId), bId === ACTUAL ? actualDataset(aId) : dataset(bId), opts); }

  // CR-39 ชุดสรุปของคำขออนุมัติ (ชื่อใน CR = SP.calc.revisionSummary(revisionId, compareToId)) → calc.revisionSummary
  //   รอบ Lock = Snapshot.report + Master ของ Snapshot · อื่น = report.build ของรอบ · Clearance = calc.clearancePlanMonthly (ไม่นับในเป้าหมาย)
  function summaryInput(id) {
    var r = find(rawList(), id);
    if (!r) return null;
    var c = calc();
    var s = r.status === 'locked' ? snapshotOf(id) : null;
    var rep = s && s.report ? s.report : SP.core.report.build({ revisionId: id, live: true });
    var ids = (rep.units || []).map(function (u) { return u.id; });
    var clearance = c.sum(c.clearancePlanMonthly(data(id), { year: r.planYear, unitIds: ids }).map(function (x) { return x.netSales; }));
    return { id: r.id, name: r.name, planYear: r.planYear, seq: r.seq, effectiveMonth: r.effectiveMonth, lockBefore: lockCount(r),
      total: rep.total.amount, prior: rep.total.prior, channels: rep.channels || [], units: rep.units || [], items: rep.skuItems || [], clearance: clearance };
  }
  // รอบก่อนของรอบนี้ (basedOn · ไม่มี = ลำดับก่อนหน้าของปีเดียวกัน)
  function previousOf(id) {
    var l = rawList(), r = find(l, id);
    if (!r) return null;
    return (r.basedOn ? find(l, r.basedOn) : null) || byYear(l, r.planYear).filter(function (x) { return x.seq === r.seq - 1; })[0] || null;
  }
  function summary(id, compareToId) {
    var r = find(rawList(), id);
    if (!r) return null;
    var pid = compareToId !== undefined ? compareToId : ((previousOf(id) || {}).id || null);
    return calc().revisionSummary(summaryInput(id), pid ? summaryInput(pid) : null);
  }

  // ---------------------------------------------------------------------
  // CR-41: Lock รอบแรกของปี (สถานการณ์ Demo S2 · core/scenario.js) ด้วยฟังก์ชันจริง — Snapshot จริง ไม่เขียนเอง
  //   spec = { submit: { userId, at, note }, comments: [{ userId, at, text }], approve: { userId, at, note } } (data/scenarios.js build.r1)
  //   Flag approval เปิด = ส่งขออนุมัติ → ความคิดเห็น → อนุมัติและ Lock ผ่านคำขอ (CR-39) · ปิด = เสนอ Lock + Lock (CR-38)
  // ---------------------------------------------------------------------
  function userName(userId) { var C = SP.core.components; return C && C.roleName ? C.roleName({ userId: userId }) : userId; }
  function lockFirstRound(year, spec) {
    spec = spec || {};
    var r1 = latest(rawList(), year);
    if (!r1) return { ok: false, error: 'missing' };
    var sb = spec.submit || {}, ap = spec.approve || {};
    if (approvalOn()) {
      return SP.core.approval.sampleApproved(r1.id, { submitBy: userName(sb.userId), submitAt: sb.at, submitNote: sb.note, approveBy: userName(ap.userId), approveAt: ap.at, approveNote: ap.note || '',
        comments: (spec.comments || []).map(function (c) { return { by: userName(c.userId), at: c.at, text: c.text }; }) });
    }
    var s1 = submit(r1.id, { by: userName(sb.userId), at: sb.at, note: sb.note, system: true });
    if (!s1.ok) return s1;
    return lock(r1.id, { by: userName(ap.userId), at: ap.at, confirmName: r1.name, system: true });
  }

  // ---------------------------------------------------------------------
  // ข้อมูลตัวอย่าง Revision สำหรับ Test (CR-41 ไม่มีในเมนูแล้ว — หน้าจอใช้สถานการณ์ Demo S2 แทน)
  //   ล้าง store → 2027 R1 Lock (คำขอของ R1 จาก data/scenarios.js) → เปิด 2027 R2 มีผล เม.ย. (data/revisions.js sample.r2) → ปรับ Total / ECOM / Watsons
  // ---------------------------------------------------------------------
  function loadSample() {
    var S = store();
    var cf = cfg().sample || {};
    var year = cf.year;
    S.reset();
    var withR1 = ((SP.data.scenarios && SP.data.scenarios.list) || []).filter(function (s) { return s.build && s.build.r1; })[0];
    var l1 = lockFirstRound(year, withR1 ? withR1.build.r1 : null);
    if (!l1.ok) return l1;
    var c2 = cf.r2 || {};
    var o2 = open({ year: year, effectiveMonth: c2.effectiveMonth, reason: c2.reason, by: userName(c2.userId), at: c2.at, system: true });
    if (!o2.ok) return o2;
    var c = calc();
    var key = 'plan.' + year + '.topDown';
    var td = S.get(key);
    var tree = c.topDown(S.data(), td, year);
    var total = Number(c2.total || tree.amount);
    var next = copy(td);
    var newUnits = {};
    tree.children.forEach(function (ch) {
      var delta = (c2.channelDelta || {})[ch.id] || 0;
      var amt = ch.amount + delta;
      next.pct[ch.id] = total ? amt / total : 0;
      var ud = (c2.unitDelta || {})[ch.id];
      ch.children.forEach(function (u) {
        var ua = ud ? u.amount + (ud[u.id] || 0) : ch.amount ? u.amount * amt / ch.amount : 0;
        next.pct[u.id] = amt ? ua / amt : 0;
        newUnits[u.id] = { before: u.amount, after: ua };
      });
    });
    next.total = total;
    S.set(key, next);
    Object.keys(newUnits).forEach(function (u) {
      var x = newUnits[u];
      if (Math.abs(x.after - x.before) < 0.5) return;
      var pk = 'plan.' + year + '.phasing.' + u;
      var ph = S.get(pk);
      S.set(pk, { monthPct: c.fillOpenMonths(x.after, ph.monthPct, lockedTargets(u, o2.rev.id)), edited: true });
    });
    select(o2.rev.id);
    return { ok: true, rev: o2.rev, error: null };
  }

  SP.core.revision = {
    STATUSES: STATUSES,
    enabled: enabled,
    // ฟังก์ชันล้วน
    idOf: idOf, nameOf: nameOf, closedCount: closedCount, effectiveIndex: effectiveIndex, lockCount: lockCount, writable: writable,
    defaultEffective: defaultEffective, effectiveIssue: effectiveIssue, defaultList: defaultList, transition: transition, baseFrom: baseFrom, checksFrom: checksFrom,
    byYear: byYear, latest: latest, openOf: openOf, lastLocked: lastLocked, find: find, years: years,
    // store
    list: list, get: get, current: current, selectedId: selectedId, select: select, working: working, yearOf: yearOf, readOnlyReason: readOnlyReason,
    planKey: planKey, read: read, data: data, master: master, lockIdx: lockIdx, lockedTargets: lockedTargets, lockedMap: function (id) { return enabled() ? lockedTargetMap(rev(id)) : {}; },
    phasing: phasing, gridLock: gridLock, planNet: planNet,
    guardWrite: guardWrite, assertWritable: assertWritable, errorText: errorText, canAct: canAct,
    overview: overview, totalOf: totalOf, dataset: dataset, actualDataset: actualDataset, ACTUAL: ACTUAL, compare: compare, summary: summary, previousOf: previousOf, approvalOn: approvalOn,
    open: open, submit: submit, withdraw: withdraw, returnToDraft: returnToDraft, lock: lock, lockFirstRound: lockFirstRound, logEvent: logEvent, checks: checks, snapshotOf: snapshotOf, loadSample: loadSample
  };
})(window.SP);
