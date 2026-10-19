/*
 * core/guide.js — ฟังก์ชันล้วนของหน้าคู่มือการใช้งานและปุ่ม ? ที่หัวหน้า (CR-28 · CR-36 ตัดสถานการณ์ทดสอบ UAT ออกทั้งหมด)
 *
 * บทบาทและสิทธิ์ (อ่านจากสิทธิ์จริงผ่าน core/permissions.js · context = { roles, perms, users, teams, list } ไม่ส่ง = ค่าปัจจุบัน):
 *   pageEditors(pageId, context)  → [{ id, name }] บทบาทที่แก้หน้านี้ได้ (ไม่นับบทบาทที่แก้ได้ทุกหน้า เช่น ผู้ดูแลระบบ)
 *   groupEditors(groupId, context) → [{ id, name }] รวมผู้แก้ไขของทุกหน้าในกลุ่มเมนู (การ์ดข้อมูลที่ต้องมีก่อน)
 *   roleRows(context)             → [{ id, name, description, system, users (จำนวนผู้ใช้), everywhere, edit: [pageId], except: [pageId], home }] ตารางบทบาทและหน้าที่
 *                                   CR-31: รวมบทบาทที่สร้างเอง · จำนวนผู้ใช้ = ผู้ใช้ที่มีบทบาทนั้น (context.users ไม่ส่ง = ค่าปัจจุบัน)
 *                                   everywhere = ค่าตั้งต้นแก้ได้ทุกหน้า → except = หน้าที่เห็นแต่แก้ไม่ได้
 * สูตร:  formulaLines(channels) → [{ kind: 'sale' } | { kind: 'net', channel, gpLabel (null = ไม่มีส่วนแบ่ง) }] จาก Channel Master ที่ใช้งาน
 * CR-36 ชื่อหน้าในข้อความคู่มือ: textVars(context) → { page_<id>: ชื่อหน้าจากเมนู } (ห้ามพิมพ์ชื่อหน้าใน data/guide.js) ·
 *   textIssues(guide, context) → { unknown: [placeholder ที่ไม่มีหน้า], typed: [ชื่อหน้าที่พิมพ์เอง] } (ใช้ใน Test)
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
  // CR-36 ชื่อหน้าในข้อความคู่มือ = ชื่อจริงจากเมนู ({page_<id>})
  // ---------------------------------------------------------------------
  function titleOf(e, pages) { return (pages[e.id] && pages[e.id].title) || e.title; }
  function textVars(context) {
    var list = (context && context.list) || SP.core.registry.list;
    var pages = (context && context.pages) || (SP.data.content && SP.data.content.pages) || {};
    var out = {};
    list.forEach(function (e) { out['page_' + e.id] = SP.core.layout && !context ? SP.core.layout.pageLabel(e.id) : titleOf(e, pages); });
    out.npdMonths = String(SP.data.settings.NPD_MONTHS);
    return out;
  }
  // ข้อความทั้งหมดของคู่มือ (แบนเป็นรายการ) → ตรวจ placeholder ที่ไม่มีหน้า และชื่อหน้าในเมนูที่พิมพ์เองแทน placeholder
  function textIssues(guide, context) {
    var list = (context && context.list) || SP.core.registry.list;
    var pages = (context && context.pages) || SP.data.content.pages;
    var texts = [];
    (function walk(v) { if (typeof v === 'string') texts.push(v); else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { walk(v[k]); }); })(guide);
    var ids = list.map(function (e) { return e.id; });
    var unknown = [], typed = [];
    texts.forEach(function (t) {
      (t.match(/\{page_(\w+)\}/g) || []).forEach(function (m) { var id = m.slice(6, -1); if (ids.indexOf(id) < 0 && unknown.indexOf(id) < 0) unknown.push(id); });
    });
    // CR-37: ชื่อหน้าที่เป็นคำศัพท์ด้วย (guide.conceptTerms เช่น Bundle = ประเภทสินค้า) พิมพ์เป็นคำศัพท์ได้
    var terms = (guide && guide.conceptTerms) || [];
    list.filter(function (e) { return e.visible !== false && e.group && e.id !== 'aboutPrototype'; }).forEach(function (e) {
      var name = titleOf(e, pages);
      if (terms.indexOf(name) >= 0) return;
      if (texts.some(function (t) { return t.indexOf(name) >= 0; }) && typed.indexOf(name) < 0) typed.push(name);
    });
    return { unknown: unknown, typed: typed };
  }

  SP.core.guide = {
    pageEditors: pageEditors,
    groupEditors: groupEditors,
    roleRows: roleRows,
    formulaLines: formulaLines,
    textVars: textVars,
    textIssues: textIssues
    // CR-36: ตัดฟังก์ชัน UAT (uatBlank · uatNormalize · uatItem · uatSetStep · uatSetResult · uatSetMeta · uatProgress · uatStepInfo · uatStart · uatExportRows · keepOnReset)
  };
})(window.SP);
