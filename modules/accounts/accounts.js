/*
 * modules/accounts/accounts.js — Account Master
 *
 * หน้าที่:        ตาราง Account ต่อ Channel (Filter Channel แบบ Dynamic เฉพาะ Channel ที่แบ่งเป้าตาม Account)
 *                 ชื่อ · Channel · GP% · วันที่มีผล · Active · ผู้รับผิดชอบปัจจุบัน · อยู่ในแผนของปี
 *                 เปิดมาเป็นโหมดดู / แก้ไข → แก้ชื่อ GP วันที่มีผล เปิด/ปิดใช้งาน เพิ่ม Account ลบ (ถังขยะ + กล่องยืนยัน) → บันทึก/ยกเลิก
 *                 ลบได้เฉพาะ Account ที่ไม่อยู่ในแผน ไม่มียอดขายย้อนหลัง และไม่เคยมีผู้รับผิดชอบ (นอกนั้นให้ปิดใช้งาน)
 *                 (workflowBar แบบง่าย ไม่มีขั้นอนุมัติ) หน้า Top-down เลือกหน่วยจาก Master นี้เท่านั้น
 * อ่านจาก data/:  channels, content (pages.accounts, labels) + Master ผ่าน store.data()
 * store อ่าน:     app.planYear, plan.<ปี>.topDown (.units), master.accounts, master.salespeople, master.assignments,
 *                 ui.masterChannel, ui.currentMonth
 * store เขียน:    master.accounts (ตอนกด บันทึก), ui.masterChannel
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
    var saved = store.get('master.accounts');
    var draft = clone(saved);
    var editing = false;
    var addOpen = false;
    var channels = SP.data.channels.filter(function (c) { return c.allocationUnit === 'ACCOUNT'; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

    function countDiff() {
      var n = 0;
      draft.forEach(function (a) {
        var o = calc.findById(saved, a.id);
        if (!o || JSON.stringify(o) !== JSON.stringify(a)) n++;
      });
      return n + saved.filter(function (o) { return !calc.findById(draft, o.id); }).length;
    }
    function dirty() { return editing ? countDiff() : 0; }
    C.guardUnsaved(dirty);

    var bar = C.workflowBar({
      simple: true,
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); draw(); },
      onSave: function () { store.set('master.accounts', draft); saved = clone(draft); editing = false; addOpen = false; draw(); },
      onCancel: function () { editing = false; addOpen = false; draft = clone(saved); draw(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    function draw() {
      C.clear(root);
      bar.update();
      var list = editing ? draft : saved;
      var data = store.data();
      data.accounts = list;
      var plan = store.get(store.planKey('topDown'));
      var inPlan = {};
      Object.keys(plan.units || {}).forEach(function (ch) { (plan.units[ch] || []).forEach(function (id) { inPlan[id] = true; }); });
      var filter = store.get('ui.masterChannel');
      if (filter !== 'all' && !calc.findById(channels, filter)) filter = 'all';

      root.appendChild(h('div', { class: 'master-toolbar' },
        C.segmented({
          label: SP.data.content.labels.picker.channel, value: filter,
          options: [{ value: 'all', label: page.filterAll }].concat(channels.map(function (c) { return { value: c.id, label: c.name, title: c.fullName }; })),
          onChange: function (v) { store.set('ui.masterChannel', v); draw(); }
        }),
        editing ? h('button', { type: 'button', class: 'btn btn-sm', 'aria-expanded': addOpen ? 'true' : 'false', onClick: function () { addOpen = !addOpen; draw(); } }, page.addButton) : null,
        h('span', { class: 'master-hint' }, page.ownerHint)));

      var banner = editing ? C.editBanner() : null;
      if (banner) { root.appendChild(banner); banner.update(dirty()); }
      if (editing && addOpen) root.appendChild(addForm(filter));

      var rows = list.filter(function (a) { return filter === 'all' || a.channelId === filter; });
      var table = h('table', { class: 'data-table master-table' + (editing ? ' is-editing' : '') },
        h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, cols.name), h('th', { scope: 'col' }, cols.channel), h('th', { scope: 'col', class: 'num' }, cols.gp),
          h('th', { scope: 'col' }, cols.gpFrom), h('th', { scope: 'col' }, cols.active), h('th', { scope: 'col' }, cols.owner),
          h('th', { scope: 'col' }, fill(cols.inPlan, { year: year })),
          editing ? h('th', { scope: 'col', class: 'master-manage' }, cols.manage) : null)),
        h('tbody', null, rows.length ? rows.map(function (a) { return row(a, data, inPlan); })
          : h('tr', null, h('td', { colspan: editing ? '8' : '7', class: 'master-empty' }, page.empty))));
      root.appendChild(h('div', { class: 'card master-card' }, h('div', { class: 'table-scroll' }, table)));

      function row(a, d, planned) {
        var ch = calc.findById(SP.data.channels, a.channelId);
        var original = calc.findById(saved, a.id);
        function changed(f) { return editing && (!original || original[f] !== a[f]); }
        function mark() { if (banner) banner.update(dirty()); }
        var owner = C.ownerInfo(d, a.id, nowKey);
        var nameCell, gpCell, fromCell, activeCell;
        if (editing) {
          var name = h('input', { type: 'text', class: 'pm-input master-input' + (changed('name') ? ' is-dirty-cell' : ''), value: a.name, 'aria-label': cols.name });
          name.addEventListener('change', function () { if (name.value.trim()) { a.name = name.value.trim(); draw(); } });
          nameCell = name;
          if (ch && ch.hasGP !== false) {
            var gp = h('input', { type: 'number', class: 'pm-input pm-stock' + (changed('gp') ? ' is-dirty-cell' : ''), min: '0', max: '100', step: '0.5', value: String(Math.round((a.gp || 0) * 10000) / 100), 'aria-label': cols.gp + ' ' + a.name });
            gp.addEventListener('change', function () { var v = Number(gp.value); if (!isNaN(v) && v >= 0 && v < 100) { a.gp = v / 100; draw(); } });
            gpCell = h('span', { class: 'num-input' }, gp, h('span', { class: 'num-suffix' }, '%'));
          } else gpCell = h('span', { class: 'muted' }, page.noGP);
          var from = h('input', { type: 'date', class: 'pm-input' + (changed('gpFrom') ? ' is-dirty-cell' : ''), value: a.gpFrom || '', 'aria-label': cols.gpFrom + ' ' + a.name });
          from.addEventListener('change', function () { a.gpFrom = from.value || null; draw(); });
          fromCell = from;
          var box = h('input', { type: 'checkbox', checked: a.active !== false, 'aria-label': cols.active + ' ' + a.name });
          box.addEventListener('change', function () { a.active = box.checked; draw(); });
          activeCell = h('label', { class: 'pm-check' + (changed('active') ? ' is-dirty-cell' : '') }, box);
        } else {
          nameCell = h('strong', null, a.name);
          gpCell = ch && ch.hasGP === false ? h('span', { class: 'muted' }, page.noGP) : F.pct(a.gp || 0, 0);
          fromCell = a.gpFrom ? F.date(a.gpFrom) : '–';
          activeCell = h('span', { class: 'badge ' + (a.active !== false ? 'tag-ok' : 'tag-muted') }, a.active !== false ? page.activeYes : page.activeNo);
        }
        mark();
        return h('tr', { class: a.active === false ? 'is-inactive' : null },
          h('td', null, nameCell),
          h('td', { title: ch ? ch.fullName : '' }, h('span', { class: 'ch-tag', style: ch ? { '--c': C.tokenVar(calc.channelColor(ch)) } : null }, ch ? ch.name : a.channelId)),
          h('td', { class: 'num' }, gpCell),
          h('td', null, fromCell),
          h('td', null, activeCell),
          h('td', { title: owner.title }, h('span', { class: owner.vacant ? 'master-vacant' : null }, owner.name)),
          h('td', null, planned[a.id] ? h('span', { class: 'badge st-existing' }, page.inPlanYes) : ''),
          editing ? h('td', { class: 'master-manage' }, C.trashButton({
            label: page.removeTitle, disabled: !calc.canRemoveUnit(d, a.id, planned), disabledTitle: page.removeBlocked,
            confirmTitle: fill(page.removeConfirm, { name: a.name }),
            onConfirm: function () { draft = draft.filter(function (x) { return x.id !== a.id; }); draw(); }
          })) : null);
      }
    }

    function addForm(filter) {
      var A = page.addFields;
      var name = h('input', { type: 'text', class: 'pm-input', placeholder: A.name, 'aria-label': A.name });
      var chSel = C.select({ label: A.channel, value: filter !== 'all' ? filter : channels[0].id, options: channels.map(function (c) { return { value: c.id, label: c.name + ' · ' + c.fullName }; }), onChange: function () {} });
      var gp = h('input', { type: 'number', class: 'pm-input pm-stock', min: '0', max: '100', step: '0.5', placeholder: A.gp, 'aria-label': A.gp });
      var from = h('input', { type: 'date', class: 'pm-input', 'aria-label': A.gpFrom, title: A.gpFrom });
      var msg = h('span', { class: 'pm-msg', role: 'status' });
      function submit() {
        var n = name.value.trim();
        if (!n) { msg.className = 'pm-msg is-error'; msg.textContent = page.addErrorRequired; return; }
        if (draft.some(function (a) { return a.channelId === chSel.value && a.name.toLowerCase() === n.toLowerCase(); })) { msg.className = 'pm-msg is-error'; msg.textContent = page.addErrorDuplicate; return; }
        draft.push({ id: 'acc-' + Date.now().toString(36), name: n, channelId: chSel.value, active: true, gp: gp.value === '' ? 0 : Math.max(0, Number(gp.value)) / 100, gpFrom: from.value || null });
        store.set('ui.masterChannel', chSel.value);
        addOpen = false;
        draw();
      }
      name.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
      return h('div', { class: 'card pm-add' },
        h('strong', null, page.addTitle),
        h('div', { class: 'pm-add-fields' }, name, chSel, gp, from,
          h('button', { type: 'button', class: 'btn btn-primary btn-sm', onClick: submit }, page.addSubmit),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: function () { addOpen = false; draw(); } }, page.addCancel),
          msg));
    }

    draw();
  }

  SP.modules.accounts = { render: render };
})(window.SP);
