/*
 * core/guide.js — ฟังก์ชันล้วนของหน้าคู่มือการใช้งาน สถานการณ์ทดสอบ (UAT) และปุ่ม ? ที่หัวหน้า (CR-28)
 *
 * บทบาทและสิทธิ์ (อ่านจากสิทธิ์จริงผ่าน core/permissions.js · context = { roles, perms, users, teams, list } ไม่ส่ง = ค่าปัจจุบัน):
 *   pageEditors(pageId, context)  → [{ id, name }] บทบาทที่แก้หน้านี้ได้ (ไม่นับบทบาทที่แก้ได้ทุกหน้า เช่น ผู้ดูแลระบบ)
 *   groupEditors(groupId, context) → [{ id, name }] รวมผู้แก้ไขของทุกหน้าในกลุ่มเมนู (การ์ดข้อมูลที่ต้องมีก่อน)
 *   roleRows(context)             → [{ id, name, description, system, users (จำนวนผู้ใช้), everywhere, edit: [pageId], except: [pageId], home }] ตารางบทบาทและหน้าที่
 *                                   CR-31: รวมบทบาทที่สร้างเอง · จำนวนผู้ใช้ = ผู้ใช้ที่มีบทบาทนั้น (context.users ไม่ส่ง = ค่าปัจจุบัน)
 *                                   everywhere = ค่าตั้งต้นแก้ได้ทุกหน้า → except = หน้าที่เห็นแต่แก้ไม่ได้
 * สูตร:  formulaLines(channels) → [{ kind: 'sale' } | { kind: 'net', channel, gpLabel (null = ไม่มีส่วนแบ่ง) }] จาก Channel Master ที่ใช้งาน
 * UAT (ผลเก็บที่ store Key uat.results = { tester, date, active (id ที่กำลังทดสอบ | null), items: { <id>: { steps: [bool], result, note } } }):
 *   uatBlank · uatNormalize · uatItem · uatSetStep · uatSetResult (ไม่ผ่านต้องมีหมายเหตุ → error 'noteRequired') · uatSetMeta ·
 *   uatProgress (ทดสอบแล้ว / ผ่าน / ไม่ผ่าน / ข้าม) · uatStepInfo (ขั้นที่กำลังทำ) · uatStart (มุมมองผู้ใช้ + หน้าแรก + active) ·
 *   uatExportRows (1 แถวต่อสถานการณ์) · keepOnReset (Key ที่รีเซ็ตข้อมูลไม่ล้าง = uat.*)
 * ไม่อ่าน DOM · ไม่เขียน store (คืนค่าใหม่ให้ผู้เรียกบันทึกเอง)
 */
(function (SP) {
  'use strict';

  function P() { return SP.core.permissions; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function rolesOf(context) {
    var list = (context && context.roles) || P().rolesNow();
    return list.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }
  // ผู้ใช้สมมติที่มีบทบาทเดียว (แบบเดียวกับหน้า Roles)
  function roleUser(roleId) { return { id: null, name: '', salesPersonId: null, roleIds: [roleId], active: true }; }
  function everywhere(role) { return role.defaultLevel === 'EDIT'; }

  //   หน้าที่มีเฉพาะบทบาทแก้ได้ทุกหน้าเป็นผู้แก้ไข (เช่น Role Management) = คืนบทบาทนั้น · ไม่มีผู้แก้ไข = []
  function pageEditors(pageId, context) {
    var all = rolesOf(context).filter(function (r) { return P().pageLevel(roleUser(r.id), pageId, context) === 'EDIT'; });
    var own = all.filter(function (r) { return !everywhere(r); });
    return (own.length ? own : all).map(function (r) { return { id: r.id, name: r.name }; });
  }

  function groupEditors(groupId, context) {
    var list = (context && context.list) || SP.core.registry.list;
    var out = [];
    list.filter(function (e) { return e.group === groupId && !e.open; }).forEach(function (e) {
      pageEditors(e.id, context).forEach(function (r) { if (!out.some(function (x) { return x.id === r.id; })) out.push(r); });
    });
    var order = rolesOf(context).map(function (r) { return r.id; });
    return out.sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); });
  }

  function roleRows(context) {
    var users = (context && context.users) || P().usersNow();
    return rolesOf(context).map(function (r) {
      var u = roleUser(r.id);
      var pages = P().rolePages(r.id, context).filter(function (e) { return !e.open; });
      var edit = pages.filter(function (e) { return P().pageLevel(u, e.id, context) === 'EDIT'; }).map(function (e) { return e.id; });
      var all = everywhere(r);
      return {
        id: r.id, name: r.name, description: r.description || '', system: r.system !== false,
        users: users.filter(function (u) { return (u.roleIds || []).indexOf(r.id) >= 0; }).length,
        everywhere: all, edit: edit,
        except: all ? pages.map(function (e) { return e.id; }).filter(function (id) { return edit.indexOf(id) < 0; }) : [],
        home: P().roleHome(r.id, context)
      };
    });
  }

  function formulaLines(channels) {
    var list = (channels || []).filter(function (c) { return c.active !== false; })
      .slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    return [{ kind: 'sale' }].concat(list.map(function (c) { return { kind: 'net', channel: c.name, gpLabel: c.hasGP === false ? null : (c.gpLabel || null) }; }));
  }

  // ---------------------------------------------------------------------
  // UAT
  // ---------------------------------------------------------------------
  var RESULTS = ['pass', 'fail', 'skip'];
  function uatBlank() { return { tester: '', date: '', active: null, items: {} }; }
  function uatNormalize(r) {
    r = r && typeof r === 'object' ? r : {};
    return { tester: r.tester || '', date: r.date || '', active: r.active || null, items: r.items && typeof r.items === 'object' ? clone(r.items) : {} };
  }
  function uatItem(results, id) {
    var it = uatNormalize(results).items[id] || {};
    return { steps: Array.isArray(it.steps) ? it.steps.map(Boolean) : [], result: RESULTS.indexOf(it.result) >= 0 ? it.result : null, note: it.note || '' };
  }
  function withItem(results, id, fn) {
    var r = uatNormalize(results);
    var it = uatItem(r, id);
    fn(it);
    r.items[id] = it;
    return r;
  }
  function uatSetStep(results, id, index, done) {
    return withItem(results, id, function (it) { for (var i = it.steps.length; i < index; i++) it.steps[i] = false; it.steps[index] = !!done; });
  }
  // result = 'pass' | 'fail' | 'skip' | null (ล้างผล) · ไม่ผ่านต้องมีหมายเหตุ · บันทึกผลของสถานการณ์ที่กำลังทดสอบ = จบการทดสอบ (active = null)
  function uatSetResult(results, id, result, note) {
    var text = note == null ? '' : String(note);
    if (result != null && RESULTS.indexOf(result) < 0) return { ok: false, error: 'invalid', results: uatNormalize(results) };
    if (result === 'fail' && !text.trim()) return { ok: false, error: 'noteRequired', results: uatNormalize(results) };
    var r = withItem(results, id, function (it) { it.result = result || null; it.note = text; });
    if (result && r.active === id) r.active = null;
    return { ok: true, error: null, results: r };
  }
  function uatSetMeta(results, meta) {
    var r = uatNormalize(results);
    if (meta && meta.tester != null) r.tester = String(meta.tester);
    if (meta && meta.date != null) r.date = String(meta.date);
    return r;
  }
  function uatProgress(results, scenarios) {
    var out = { total: (scenarios || []).length, tested: 0, pass: 0, fail: 0, skip: 0 };
    (scenarios || []).forEach(function (s) {
      var res = uatItem(results, s.id).result;
      if (!res) return;
      out.tested++;
      out[res]++;
    });
    return out;
  }
  // ขั้นที่กำลังทำ = ขั้นแรกที่ยังไม่ติ๊ก (ทำครบ = ขั้นสุดท้าย) → { done, total, current }
  function uatStepInfo(results, scenario) {
    var it = uatItem(results, scenario.id);
    var n = (scenario.steps || []).length;
    var done = 0, next = -1;
    for (var i = 0; i < n; i++) { if (it.steps[i]) done++; else if (next < 0) next = i; }
    return { done: done, total: n, current: next < 0 ? n : next + 1 };
  }
  // เริ่มสถานการณ์: มุมมองผู้ใช้ของ scenario.userId (+ Channel ของทีม) · หน้าแรก · หน่วยขายที่เลือกให้ · active = id
  //   → { ok, role (ค่าของ ui.role), pageId, selection, results } | { ok: false } เมื่อไม่พบผู้ใช้
  function uatStart(results, scenario, context) {
    var users = (context && context.users) || P().usersNow();
    var raw = users.filter(function (u) { return u.id === scenario.userId; })[0];
    if (!raw) return { ok: false };
    var role = P().ref(P().normalize(raw, context));
    if (scenario.channelId && !role.channelId) role.channelId = scenario.channelId;
    var r = uatNormalize(results);
    r.active = scenario.id;
    return { ok: true, role: role, pageId: scenario.pageId, selection: scenario.selection ? clone(scenario.selection) : null, results: r };
  }
  // แถวส่งออก 1 แถวต่อสถานการณ์ · labels = { roleOf(scenario) → ป้ายบทบาท, result: { pass, fail, skip, none } }
  function uatExportRows(results, scenarios, labels) {
    var r = uatNormalize(results);
    var L = labels || {};
    var RL = L.result || {};
    return (scenarios || []).map(function (s) {
      var it = uatItem(r, s.id);
      var info = uatStepInfo(r, s);
      return {
        tester: r.tester, date: r.date, id: s.id, title: s.title, role: L.roleOf ? L.roleOf(s) : s.roleId,
        steps: info.done + '/' + info.total, result: it.result ? (RL[it.result] || it.result) : (RL.none || ''), note: it.note
      };
    });
  }
  function keepOnReset(keys) { return (keys || []).filter(function (k) { return /^uat\./.test(k); }); }

  SP.core.guide = {
    pageEditors: pageEditors,
    groupEditors: groupEditors,
    roleRows: roleRows,
    formulaLines: formulaLines,
    UAT_RESULTS: RESULTS,
    uatBlank: uatBlank,
    uatNormalize: uatNormalize,
    uatItem: uatItem,
    uatSetStep: uatSetStep,
    uatSetResult: uatSetResult,
    uatSetMeta: uatSetMeta,
    uatProgress: uatProgress,
    uatStepInfo: uatStepInfo,
    uatStart: uatStart,
    uatExportRows: uatExportRows,
    keepOnReset: keepOnReset
  };
})(window.SP);
