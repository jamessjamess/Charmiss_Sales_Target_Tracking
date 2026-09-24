/*
 * modules/territories/territories.js — Territory Master: เขตการขาย
 *
 * หน้าที่:        ตารางเขตของ Channel ที่แบ่งเป้าตามเขต (allocationUnit = 'TERRITORY' ตอนนี้คือ TT)
 *                 ชื่อ · Channel · ยอดปีก่อน · Active · ผู้รับผิดชอบปัจจุบัน · อยู่ในแผนของปี
 *                 เป้า ยอดขาย และ History ผูกกับเขต ไม่ผูกกับคน (เปลี่ยนคนดูแลที่หน้าผู้รับผิดชอบ)
 *                 เปิดมาเป็นโหมดดู / แก้ไข → แก้ชื่อ เปิด/ปิดใช้งาน เพิ่มเขต ลบ (ถังขยะ + กล่องยืนยัน) → บันทึก/ยกเลิก (workflowBar แบบง่าย)
 *                 ลบได้เฉพาะเขตที่ไม่อยู่ในแผน ไม่มียอดขายย้อนหลัง และไม่เคยมีผู้รับผิดชอบ (calc.canRemoveUnit)
 * อ่านจาก data/:  channels, history, content (pages.territories, labels) + Master ผ่าน store.data()
 * store อ่าน:     app.planYear, plan.<ปี>.topDown (.units), master.territories, master.salespeople, master.assignments, ui.currentMonth
 * store เขียน:    master.territories (ตอนกด บันทึก)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var store = SP.core.store;
  var h = C.h;
  var fill = C.fill;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function render(root, ctx) {
    var page = ctx.page;
    var cols = page.columns;
    var year = store.year();
    var nowKey = store.currentKey();
    var saved = store.get('master.territories');
    var draft = clone(saved);
    var editing = false;
    var addOpen = false;
    var channels = SP.data.channels.filter(function (c) { return c.allocationUnit === 'TERRITORY'; });

    function dirty() {
      if (!editing) return 0;
      return draft.filter(function (t) { var o = calc.findById(saved, t.id); return !o || JSON.stringify(o) !== JSON.stringify(t); }).length +
        saved.filter(function (o) { return !calc.findById(draft, o.id); }).length;
    }
    C.guardUnsaved(dirty);

    var bar = C.workflowBar({
      simple: true,
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); draw(); },
      onSave: function () { store.set('master.territories', draft); saved = clone(draft); editing = false; addOpen = false; draw(); },
      onCancel: function () { editing = false; addOpen = false; draft = clone(saved); draw(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    function draw() {
      C.clear(root);
      bar.update();
      if (!channels.length) { root.appendChild(C.callout('info', page.empty)); return; }
      var list = editing ? draft : saved;
      var data = store.data();
      data.territories = list;
      var plan = store.get(store.planKey('topDown'));
      var inPlan = {};
      Object.keys(plan.units || {}).forEach(function (ch) { (plan.units[ch] || []).forEach(function (id) { inPlan[id] = true; }); });

      root.appendChild(h('div', { class: 'master-toolbar' },
        editing ? h('button', { type: 'button', class: 'btn btn-sm', 'aria-expanded': addOpen ? 'true' : 'false', onClick: function () { addOpen = !addOpen; draw(); } }, page.addButton) : null,
        h('span', { class: 'master-hint' }, page.ownerHint)));
      var banner = editing ? C.editBanner() : null;
      if (banner) { root.appendChild(banner); banner.update(dirty()); }
      if (editing && addOpen) root.appendChild(addForm());

      var table = h('table', { class: 'data-table master-table' + (editing ? ' is-editing' : '') },
        h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, cols.name), h('th', { scope: 'col' }, cols.channel), h('th', { scope: 'col', class: 'num' }, cols.prior),
          h('th', { scope: 'col' }, cols.active), h('th', { scope: 'col' }, cols.owner), h('th', { scope: 'col' }, fill(cols.inPlan, { year: year })),
          editing ? h('th', { scope: 'col', class: 'master-manage' }, cols.manage) : null)),
        h('tbody', null, list.filter(function (t) { return calc.findById(channels, t.channelId); }).map(function (t) {
          var ch = calc.findById(SP.data.channels, t.channelId);
          var original = calc.findById(saved, t.id);
          function changed(f) { return editing && (!original || original[f] !== t[f]); }
          var owner = C.ownerInfo(data, t.id, nowKey);
          var nameCell, activeCell;
          if (editing) {
            var name = h('input', { type: 'text', class: 'pm-input master-input' + (changed('name') ? ' is-dirty-cell' : ''), value: t.name, 'aria-label': cols.name });
            name.addEventListener('change', function () { if (name.value.trim()) { t.name = name.value.trim(); draw(); } });
            nameCell = name;
            var box = h('input', { type: 'checkbox', checked: t.active !== false, 'aria-label': cols.active + ' ' + t.name });
            box.addEventListener('change', function () { t.active = box.checked; draw(); });
            activeCell = h('label', { class: 'pm-check' + (changed('active') ? ' is-dirty-cell' : '') }, box);
          } else {
            nameCell = h('strong', null, t.name);
            activeCell = h('span', { class: 'badge ' + (t.active !== false ? 'tag-ok' : 'tag-muted') }, t.active !== false ? page.activeYes : page.activeNo);
          }
          return h('tr', { class: t.active === false ? 'is-inactive' : null },
            h('td', null, nameCell),
            h('td', { title: ch.fullName }, h('span', { class: 'ch-tag', style: { '--c': C.tokenVar(calc.channelColor(ch)) } }, ch.name)),
            h('td', { class: 'num' }, F.millionPlain(calc.unitHistory(SP.data.history, year - 1, t.id))),
            h('td', null, activeCell),
            h('td', { title: owner.title }, h('span', { class: owner.vacant ? 'master-vacant' : null }, owner.name)),
            h('td', null, inPlan[t.id] ? h('span', { class: 'badge tag-muted' }, page.inPlanYes) : ''),
            editing ? h('td', { class: 'master-manage' }, C.trashButton({
              label: page.removeTitle, disabled: !calc.canRemoveUnit(data, t.id, inPlan), disabledTitle: page.removeBlocked,
              confirmTitle: fill(page.removeConfirm, { name: t.name }),
              onConfirm: function () { draft = draft.filter(function (x) { return x.id !== t.id; }); draw(); }
            })) : null);
        })));
      root.appendChild(h('div', { class: 'card master-card' }, h('div', { class: 'table-scroll' }, table)));
    }

    function addForm() {
      var A = page.addFields;
      var name = h('input', { type: 'text', class: 'pm-input', placeholder: A.name, 'aria-label': A.name });
      var chSel = C.select({ label: A.channel, value: channels[0].id, options: channels.map(function (c) { return { value: c.id, label: c.name + ' · ' + c.fullName }; }), onChange: function () {} });
      var msg = h('span', { class: 'pm-msg', role: 'status' });
      function submit() {
        var n = name.value.trim();
        if (!n) { msg.className = 'pm-msg is-error'; msg.textContent = page.addErrorRequired; return; }
        draft.push({ id: 'ter-' + Date.now().toString(36), channelId: chSel.value, name: n, active: true });
        addOpen = false;
        draw();
      }
      name.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
      return h('div', { class: 'card pm-add' },
        h('strong', null, page.addTitle),
        h('div', { class: 'pm-add-fields' }, name, chSel,
          h('button', { type: 'button', class: 'btn btn-primary btn-sm', onClick: submit }, page.addSubmit),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: function () { addOpen = false; draw(); } }, page.addCancel),
          msg));
    }

    draw();
  }

  SP.modules.territories = { render: render };
})(window.SP);
