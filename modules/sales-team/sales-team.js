/*
 * modules/sales-team/sales-team.js — Account Master · ทีมขาย (CR-19)
 *
 * หน้าที่:        การ์ดต่อ Channel: Channel · จำนวนหน่วยขายใน Master (unitLabel) · Sales Manager · Sales Officer (ช่วงเดือน + สิ้นสุดแล้ว / เริ่ม …)
 *                 สมาชิกทีม ณ เดือนปัจจุบันจำลอง = ผู้มีสิทธิ์แก้ไขแผนยอดขายราย SKU ของ Channel (core/permissions.js)
 *                 โหมดแก้ไข (Sales Director ตามตารางสิทธิ์ accountMaster): + เพิ่มสมาชิก (Sales Person Master + บทบาท + เดือนเริ่ม ≥ เดือนปัจจุบัน) ·
 *                 สิ้นสุดการเป็นสมาชิก (เลือกเดือนสุดท้าย ≥ เดือนก่อนหน้าเดือนปัจจุบัน) · นำออก (เฉพาะสมาชิกที่เริ่มเดือนนี้หรือหลังจากนี้) — แก้เดือนที่ผ่านไปแล้วไม่ได้
 *                 กฎทั้งหมดอยู่ที่ permissions.addMember / endMember / removeMember / ลิงก์ไปหน้าผู้รับผิดชอบ (กำหนดผู้รับผิดชอบรายหน่วยขาย)
 *                 ค่าที่แก้อยู่ใน draft จนกด บันทึก (workflowBar แบบง่าย) → มีผลกับสิทธิ์ในหน้าวางแผน SKU ทันที
 * อ่านจาก data/:  channels, teams (ค่าตั้งต้น), content (pages.salesTeam, labels) + Master ผ่าน store.data()
 * store อ่าน:     master.teams, master.salespeople, master.accounts, master.territories, ui.currentMonth (store.currentKey()), ui.role
 * store เขียน:    master.teams (ตอนกด บันทึก)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var P = SP.core.permissions;
  var store = SP.core.store;
  var h = C.h;
  var fill = C.fill;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var month = store.currentKey();
    var saved = P.teamsNow();
    var draft = clone(saved);
    var editing = false;

    function cur() { return editing ? draft : saved; }
    function people() { return store.get('master.salespeople'); }
    function personName(id) { var p = calc.findById(people(), id); return p ? p.name : id; }
    function monthText(key) { return F.date(key); }
    function dirty() { return editing ? countDiff() : 0; }
    function key(m) { return m.salesPersonId + '|' + m.fromMonth; }
    function countDiff() {
      var n = 0;
      SP.data.channels.forEach(function (ch) {
        var a = members(saved, ch.id), b = members(draft, ch.id);
        b.forEach(function (m) { var o = a.filter(function (x) { return key(x) === key(m); })[0]; if (!o || o.toMonth !== m.toMonth || o.role !== m.role) n++; });
        a.forEach(function (o) { if (!b.some(function (m) { return key(m) === key(o); })) n++; });
      });
      return n;
    }
    function members(teams, channelId) { var t = (teams || []).filter(function (x) { return x.channelId === channelId; })[0]; return t ? t.members : []; }
    C.guardUnsaved(dirty);

    var bar = C.workflowBar({
      simple: true,
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); draw(); },
      onSave: function () { store.set('master.teams', draft); saved = clone(draft); editing = false; draw(); },
      onCancel: function () { editing = false; draft = clone(saved); draw(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    // Channel ที่แสดง = เปิดใช้งาน หรือมีทีมอยู่แล้ว (ตามลำดับใน Channel Master)
    function channels() {
      return SP.data.channels.filter(function (c) { return c.active !== false || members(cur(), c.id).length; })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    }

    function draw() {
      C.clear(root);
      bar.update();
      var S = page;
      root.appendChild(h('p', { class: 'master-hint st-note' }, fill(S.note, { month: monthText(month) }), ' · ',
        h('a', { href: SP.core.paths.to(SP.core.registry.byId('salespeople').path) }, S.ownerLink)));
      if (editing) { var b = C.editBanner(); b.update(dirty()); root.appendChild(b); }
      var data = store.data();
      root.appendChild(h('div', { class: 'st-grid' }, channels().map(function (ch) { return card(ch, data); })));
    }

    function card(ch, data) {
      var S = page;
      var list = members(cur(), ch.id);
      var units = calc.unitsOfChannel(data, ch.id, true).length;
      var body = ['MANAGER', 'OFFICER'].map(function (role) {
        var rows = list.filter(function (m) { return m.role === role; });
        return h('section', { class: 'st-role' },
          h('h3', { class: 'st-role-title' }, S.roles[role], h('span', { class: 'muted' }, ' · ' + rows.filter(function (m) { return active(m); }).length)),
          rows.length ? h('ul', { class: 'st-members' }, rows.map(function (m) { return memberRow(ch, m); })) : h('p', { class: 'muted small' }, S.empty));
      });
      return h('section', { class: 'card st-card', style: { '--c': C.tokenVar(calc.channelColor(ch)) } },
        h('header', { class: 'st-card-head' },
          h('span', { class: 'ch-tag' }, ch.name),
          h('span', { class: 'st-ch-name' }, ch.fullName),
          h('span', { class: 'st-units muted' }, fill(S.units, { n: F.number(units), unit: ch.unitLabel }))),
        list.length ? null : h('p', { class: 'st-empty text-short' }, S.emptyTeam),
        body,
        editing ? h('div', { class: 'st-actions' }, h('button', { type: 'button', class: 'btn btn-sm btn-secondary st-add', onClick: function () { openAdd(ch); } }, S.add)) : null);
    }

    function active(m) { return m.fromMonth <= month && (!m.toMonth || month <= m.toMonth); }
    function ended(m) { return !!m.toMonth && m.toMonth < month; }
    function future(m) { return m.fromMonth > month; }
    function removable(m) { return m.fromMonth >= month; }   // ยังไม่มีเดือนที่ผ่านไปแล้ว (เริ่มเดือนนี้หรือหลังจากนี้)

    function memberRow(ch, m) {
      var S = page;
      var period = m.toMonth ? fill(S.period.range, { from: monthText(m.fromMonth), to: monthText(m.toMonth) }) : fill(S.period.since, { from: monthText(m.fromMonth) });
      var tag = ended(m) ? h('span', { class: 'badge tag-muted' }, S.status.ended) : future(m) ? h('span', { class: 'badge tag-warn' }, fill(S.status.future, { from: monthText(m.fromMonth) })) : null;
      var o = members(saved, ch.id).filter(function (x) { return key(x) === key(m); })[0];
      var changed = editing && (!o || o.toMonth !== m.toMonth);
      var tools = null;
      if (editing && !ended(m)) {
        tools = h('span', { class: 'st-tools' },
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm st-end', onClick: function () { openEnd(ch, m); } }, S.end),
          removable(m) ? C.trashButton({
            label: S.remove, confirmTitle: fill(S.removeConfirm, { name: personName(m.salesPersonId), channel: ch.name }),
            lines: [fill(S.removeLine, { from: monthText(m.fromMonth) })],
            onConfirm: function () { applyResult(P.removeMember(draft, ch.id, m, month)); }
          }) : null);
      }
      return h('li', { class: 'st-member' + (ended(m) ? ' is-ended' : '') + (changed ? ' is-dirty-row' : '') },
        h('span', { class: 'st-name' }, personName(m.salesPersonId)),
        h('span', { class: 'st-period muted' }, period), tag, tools);
    }

    function errorText(res, name) { return fill(page.errors[res.error] || res.error, { name: name || '' }); }
    function applyResult(res) {
      if (!res.ok) { window.alert(errorText(res)); return; }
      draft = res.teams;
      draw();
    }

    // เดือนที่เลือกได้: start … start + 23 (ไม่มีเดือนที่ผ่านไปแล้ว)
    function monthOptions(start, n) {
      var out = [];
      for (var i = 0; i < (n || 24); i++) { var k = P.addMonths(start, i); out.push({ value: k, label: monthText(k) }); }
      return out;
    }

    function openAdd(ch, prev, err) {
      var S = page;
      prev = prev || {};
      var eligible = people().filter(function (p) { return calc.employedIn(p, month); })
        .sort(function (a, b) { return (a.channelId === ch.id ? 0 : 1) - (b.channelId === ch.id ? 0 : 1) || a.name.localeCompare(b.name, 'th'); });
      var person = C.select({ label: S.fields.person, value: prev.salesPersonId || '', className: 'st-person',
        options: [{ value: '', label: S.personPlaceholder }].concat(eligible.map(function (p) {
          var pc = p.channelId ? calc.findById(SP.data.channels, p.channelId) : null;
          return { value: p.id, label: p.name + (pc ? ' · ' + pc.name : '') };
        })), onChange: function () {} });
      var role = C.select({ label: S.fields.role, value: prev.role || 'OFFICER', className: 'st-role-select',
        options: ['MANAGER', 'OFFICER'].map(function (r) { return { value: r, label: S.roles[r] }; }), onChange: function () {} });
      var from = C.select({ label: S.fields.from, value: prev.fromMonth || month, className: 'st-from', options: monthOptions(month), onChange: function () {} });
      var body = h('div', { class: 'st-form' },
        h('label', { class: 'pd-field' }, h('span', { class: 'field-label' }, S.fields.person), person),
        h('label', { class: 'pd-field' }, h('span', { class: 'field-label' }, S.fields.role), role),
        h('label', { class: 'pd-field' }, h('span', { class: 'field-label' }, S.fields.from), from),
        h('p', { class: 'muted small' }, S.personHint),
        err ? h('p', { class: 'dlg-error st-error', role: 'alert' }, err) : null);
      C.dialog({ title: fill(S.addTitle, { channel: ch.name }), body: body, confirmLabel: S.add.replace(/^\+\s*/, '') }).then(function (r) {
        if (!r.ok) return;
        var m = { salesPersonId: person.value, role: role.value, fromMonth: from.value, toMonth: null };
        var res = P.addMember(draft, ch.id, m, month);
        if (!res.ok) { openAdd(ch, m, errorText(res, personName(m.salesPersonId))); return; }
        draft = res.teams;
        draw();
      });
    }

    function openEnd(ch, m, err) {
      var S = page;
      var prevMonth = P.addMonths(month, -1);
      var start = m.fromMonth > prevMonth ? m.fromMonth : prevMonth;
      var to = C.select({ label: S.fields.to, value: m.toMonth && m.toMonth >= start ? m.toMonth : start, className: 'st-to', options: monthOptions(start), onChange: function () {} });
      var body = h('div', { class: 'st-form' },
        h('label', { class: 'pd-field' }, h('span', { class: 'field-label' }, S.fields.to), to),
        h('p', { class: 'muted small' }, fill(S.endHint, { prev: monthText(prevMonth), month: monthText(month) })),
        err ? h('p', { class: 'dlg-error st-error', role: 'alert' }, err) : null);
      C.dialog({ title: fill(S.endTitle, { name: personName(m.salesPersonId), channel: ch.name }), body: body, confirmLabel: S.end }).then(function (r) {
        if (!r.ok) return;
        var res = P.endMember(draft, ch.id, m, to.value, month);
        if (!res.ok) { openEnd(ch, m, errorText(res)); return; }
        draft = res.teams;
        draw();
      });
    }

    draw();
  }

  SP.modules.salesTeam = { render: render };
})(window.SP);
