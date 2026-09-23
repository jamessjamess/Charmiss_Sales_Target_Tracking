/*
 * modules/salespeople/salespeople.js — ผู้รับผิดชอบ (Sales Person และผู้รับผิดชอบ Account / เขตการขายรายเดือน)
 *
 * หน้าที่:        บน: Alert หน่วยที่ว่าง หรือยังผูกกับคนที่ลาออก (calc.assignmentAlerts)
 *                 ซ้าย: รายชื่อ Sales Person (ชื่อ · Channel · เริ่มงาน · ลาออก · สถานะ) + บันทึกการลาออก + เพิ่มคน
 *                       + ลบ (ถังขยะ + กล่องยืนยัน เฉพาะคนที่ไม่มีประวัติผู้รับผิดชอบ)
 *                 ขวา: Timeline ผู้รับผิดชอบ แถว = หน่วยในแผนของปี (จัดกลุ่มตาม Channel) คอลัมน์ = 12 เดือน
 *                      โหมดแก้ไข: คลิกเดือนแรกและเดือนสุดท้ายของหน่วยเดียวกัน แล้วเลือกคน (calc.setOwner)
 *                      เดือนก่อนเดือนปัจจุบันจำลองเป็นประวัติ แก้ไม่ได้
 *                 ล่าง: Performance รายคน (calc.personPerformance ← performanceByPerson) รวมคนที่ลาออกแล้ว
 *                 เปลี่ยนผู้รับผิดชอบไม่แก้ Target หรือ Forecast (ตัวเลขผูกกับหน่วย)
 *                 เปิดมาเป็นโหมดดู / แก้ไข → บันทึก/ยกเลิก (workflowBar แบบง่าย)
 * อ่านจาก data/:  channels, history, actuals, pricing, content (pages.salespeople, labels) + Master ผ่าน store.data()
 * store อ่าน:     app.planYear, plan.<ปี>.topDown, plan.<ปี>.phasing.<unitId> (Target Baseline รายเดือน),
 *                 master.salespeople, master.assignments, master.products, ui.currentMonth
 * store เขียน:    master.salespeople, master.assignments (ตอนกด บันทึก), ui.currentMonth
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

  // [true, true, false, true] → 'ม.ค.–ก.พ., เม.ย.'
  function monthsText(flags) {
    var out = [], start = null;
    for (var m = 0; m <= 12; m++) {
      if (m < 12 && flags[m]) { if (start == null) start = m; }
      else if (start != null) { out.push(F.monthRange(start, m - 1)); start = null; }
    }
    return out.join(', ');
  }
  function listText(months) { var f = []; for (var i = 0; i < 12; i++) f.push(months.indexOf(i) >= 0); return monthsText(f); }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var PC = page.peopleColumns;
    var year = store.year();
    var saved = { people: store.get('master.salespeople'), assignments: store.get('master.assignments') };
    var draft = clone(saved);
    var editing = false;
    var sel = null;          // { unitId, from, to } ช่วงเดือนที่เลือกใน Timeline
    var resignFor = null;    // id ของคนที่กำลังบันทึกการลาออก
    var addOpen = false;
    var message = null;

    function dirty() {
      if (!editing) return 0;
      var n = 0;
      draft.people.forEach(function (p) { var o = calc.findById(saved.people, p.id); if (!o || JSON.stringify(o) !== JSON.stringify(p)) n++; });
      n += saved.people.filter(function (o) { return !calc.findById(draft.people, o.id); }).length;
      var units = {};
      draft.assignments.concat(saved.assignments).forEach(function (a) { units[a.unitId] = true; });
      Object.keys(units).forEach(function (u) {
        if (JSON.stringify(calc.unitAssignments(draft.assignments, u)) !== JSON.stringify(calc.unitAssignments(saved.assignments, u))) n++;
      });
      return n;
    }
    C.guardUnsaved(dirty);

    var bar = C.workflowBar({
      simple: true,
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); sel = null; resignFor = null; message = null; draw(); },
      onSave: function () {
        store.set('master.salespeople', draft.people);
        store.set('master.assignments', draft.assignments);
        saved = clone(draft);
        editing = false; sel = null; resignFor = null; addOpen = false; message = null;
        draw();
      },
      onCancel: function () { editing = false; draft = clone(saved); sel = null; resignFor = null; addOpen = false; message = null; draw(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    function draw() {
      C.clear(root);
      bar.update();
      var current = Number(store.get('ui.currentMonth')) || 0;
      var nowKey = calc.monthKey(year, current);
      var cur = editing ? draft : saved;
      var data = store.data();
      data.salespeople = cur.people;
      data.assignments = cur.assignments;
      var tree = calc.topDown(data, store.get(store.planKey('topDown')), year);
      var units = calc.planUnits(tree);
      var unitIds = units.map(function (u) { return u.id; });

      // ---------- เดือนปัจจุบันจำลอง ----------
      root.appendChild(h('div', { class: 'master-toolbar' },
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.currentMonthLabel),
          C.select({
            label: page.currentMonthLabel, value: String(current),
            options: F.MONTHS.map(function (m, i) { return { value: String(i), label: F.monthYear(i, year) }; }),
            onChange: function (v) { store.set('ui.currentMonth', Number(v)); sel = null; draw(); }
          })),
        h('span', { class: 'master-hint' }, page.assignNote)));

      var banner = editing ? C.editBanner() : null;
      if (banner) { root.appendChild(banner); banner.update(dirty()); }

      // ---------- Alert ----------
      var alerts = calc.assignmentAlerts(cur.assignments, cur.people, unitIds, year);
      root.appendChild(h('section', { class: 'card sp-alerts' + (alerts.length ? ' has-alerts' : '') },
        h('strong', { class: 'sp-alerts-title' }, alerts.length ? page.alertsTitle : '✓ ' + page.noAlerts),
        alerts.length ? h('ul', { class: 'sp-alert-list' }, alerts.map(function (a) {
          var u = calc.findById(units, a.unitId);
          var text = a.type === 'vacant'
            ? fill(page.alertVacant, { unit: u.name, months: listText(a.months) })
            : fill(page.alertResigned, { unit: u.name, name: C.personName(cur.people, a.personId), months: listText(a.months) });
          return h('li', { class: 'badge ' + (a.type === 'vacant' ? 'tag-danger' : 'tag-warn') }, text);
        })) : null));

      if (message) root.appendChild(h('p', { class: 'pm-msg is-error', role: 'alert' }, message));

      var layout = h('div', { class: 'sp-layout' });
      layout.appendChild(peopleCard(cur, nowKey));
      layout.appendChild(timelineCard(cur, data, tree, current, nowKey));
      root.appendChild(layout);
      root.appendChild(performanceCard(cur, data, tree, current));
    }

    // ---------- ซ้าย: รายชื่อ Sales Person ----------
    function peopleCard(cur, nowKey) {
      var rows = cur.people.map(function (p) {
        var ch = calc.findById(SP.data.channels, p.channelId);
        var st = calc.personStatus(p, nowKey);
        var stText = fill(L.personStatus[st], { month: F.date(st === 'future' ? p.startMonth : p.endMonth) });
        var original = calc.findById(saved.people, p.id);
        var action = null;
        if (editing && st !== 'resigned') {
          if (resignFor === p.id) {
            var input = h('input', { type: 'month', class: 'pm-input pm-month', min: nowKey, value: p.endMonth || nowKey, 'aria-label': page.resignLabel + ' ' + p.name });
            action = h('span', { class: 'sp-resign' },
              h('span', { class: 'field-label' }, page.resignLabel), input,
              h('button', { type: 'button', class: 'btn btn-primary btn-sm', onClick: function () {
                var res = calc.setEndMonth(draft.people, p.id, input.value, nowKey);
                if (!res.ok) { message = page.resignErrors[res.error]; draw(); return; }
                draft.people = res.people; resignFor = null; message = null; draw();
              } }, page.resignApply),
              h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: function () { resignFor = null; draw(); } }, page.resignCancel));
          } else {
            action = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: function () { resignFor = p.id; message = null; draw(); } }, page.resignButton);
          }
        }
        return h('tr', { class: st === 'resigned' ? 'is-inactive' : null },
          h('td', null, h('span', { class: 'sp-person' }, h('span', { class: 'sp-person-dot', style: { '--seg': C.tokenVar(C.personColor(cur.people, p.id)) } }), h('strong', null, p.name))),
          h('td', null, ch ? h('span', { class: 'ch-tag', style: { '--c': C.tokenVar(calc.channelColor(ch)) } }, ch.name) : page.allChannels),
          h('td', null, F.date(p.startMonth)),
          h('td', { class: editing && original && original.endMonth !== p.endMonth ? 'is-dirty-cell' : null }, p.endMonth ? F.date(p.endMonth) : '–'),
          h('td', null, h('span', { class: 'badge ' + (st === 'active' ? 'tag-ok' : st === 'resigned' ? 'tag-muted' : 'tag-warn') }, stText), action ? h('div', { class: 'sp-person-action' }, action) : null),
          editing ? h('td', { class: 'master-manage' }, C.trashButton({
            label: page.removeTitle,
            disabled: cur.assignments.some(function (a) { return a.salesPersonId === p.id; }), disabledTitle: page.removeBlocked,
            confirmTitle: fill(page.removeConfirm, { name: p.name }),
            onConfirm: function () { draft.people = draft.people.filter(function (x) { return x.id !== p.id; }); draw(); }
          })) : null);
      });
      return h('section', { class: 'card sp-people' },
        h('div', { class: 'sp-card-head' }, h('h2', null, page.peopleTitle),
          editing ? h('button', { type: 'button', class: 'btn btn-sm', onClick: function () { addOpen = !addOpen; draw(); } }, page.addPerson) : null),
        editing && addOpen ? addPersonForm() : null,
        h('div', { class: 'table-scroll' }, h('table', { class: 'data-table master-table sp-people-table' },
          h('thead', null, h('tr', null, h('th', null, PC.name), h('th', null, PC.channel), h('th', null, PC.start), h('th', null, PC.end), h('th', null, PC.status),
            editing ? h('th', { class: 'master-manage' }, PC.manage) : null)),
          h('tbody', null, rows))));
    }

    function addPersonForm() {
      var A = page.addFields;
      var name = h('input', { type: 'text', class: 'pm-input', placeholder: A.name, 'aria-label': A.name });
      var chSel = C.select({
        label: A.channel, value: SP.data.channels[0].id, onChange: function () {},
        options: SP.data.channels.map(function (c) { return { value: c.id, label: c.name }; }).concat([{ value: '', label: page.allChannels }])
      });
      var start = h('input', { type: 'month', class: 'pm-input pm-month', 'aria-label': A.start, title: A.start });
      var msg = h('span', { class: 'pm-msg', role: 'status' });
      return h('div', { class: 'pm-add-fields sp-add' }, name, chSel, start,
        h('button', { type: 'button', class: 'btn btn-primary btn-sm', onClick: function () {
          if (!name.value.trim() || !start.value) { msg.className = 'pm-msg is-error'; msg.textContent = page.addErrorRequired; return; }
          draft.people.push({ id: 'sp-' + Date.now().toString(36), name: name.value.trim(), channelId: chSel.value || null, startMonth: start.value, endMonth: null });
          addOpen = false;
          draw();
        } }, page.addSubmit), msg);
    }

    // ---------- ขวา: Timeline ผู้รับผิดชอบ ----------
    function timelineCard(cur, data, tree, current, nowKey) {
      var head = h('tr', null, h('th', { class: 'tl-unit', scope: 'col' }, page.timelineUnit),
        F.MONTHS.map(function (m, i) { return h('th', { scope: 'col', class: 'tl-month' + (i < current ? ' is-past' : i === current ? ' is-current' : ''), title: i < current ? page.pastTitle : null }, m); }));
      var body = h('tbody');
      tree.children.forEach(function (ch) {
        body.appendChild(h('tr', { class: 'tl-group', style: { '--c': C.tokenVar(ch.color) } }, h('th', { colspan: '13', scope: 'rowgroup' }, ch.name + ' · ' + ch.fullName)));
        ch.children.forEach(function (u) {
          var tr = h('tr', { class: 'tl-row', style: { '--c': C.tokenVar(ch.color) } }, h('th', { class: 'tl-unit', scope: 'row', title: C.ownerInfo(data, u.id, nowKey).title }, u.name));
          if (!editing) {
            C.ownerStrip(data, u.id, year, { tag: 'td' }).forEach(function (td) { tr.appendChild(td); });
          } else {
            var months = calc.ownerMonths(data.assignments, data.salespeople, u.id, year);
            months.forEach(function (o, m) {
              var picked = sel && sel.unitId === u.id && m >= Math.min(sel.from, sel.to) && m <= Math.max(sel.from, sel.to);
              var name = o.state === 'owner' ? C.personName(data.salespeople, o.personId) : o.state === 'resigned' ? fill(L.owner.resigned, { name: C.personName(data.salespeople, o.assignedId) }) : L.owner.none;
              var prev = m > 0 ? months[m - 1] : null;
              var startSeg = !prev || prev.personId !== o.personId || prev.state !== o.state;
              var td = h('td', {
                class: 'owner-seg tl-cell is-' + o.state + (m < current ? ' is-past' : '') + (picked ? ' is-picked' : '') + (startSeg ? ' is-start' : ''),
                style: o.state === 'owner' ? { '--seg': C.tokenVar(C.personColor(data.salespeople, o.personId)) } : null,
                title: (m < current ? page.pastTitle + ' · ' : '') + name + ' · ' + F.monthYear(m, year),
                tabindex: m < current ? null : '0', role: m < current ? null : 'button'
              }, startSeg ? h('span', { class: 'owner-name' }, name) : null);
              if (m >= current) {
                var pick = function () {
                  if (!sel || sel.unitId !== u.id) sel = { unitId: u.id, from: m, to: m };
                  else sel.to = m;
                  message = null;
                  draw();
                };
                td.addEventListener('click', pick);
                td.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
              }
              tr.appendChild(td);
            });
          }
          body.appendChild(tr);
        });
      });

      return h('section', { class: 'card sp-timeline' },
        h('div', { class: 'sp-card-head' }, h('h2', null, fill(page.timelineTitle, { year: year })),
          editing ? h('span', { class: 'master-hint' }, page.timelineHint) : null),
        editing && sel ? assignBar(cur, data, tree) : null,
        h('div', { class: 'table-scroll' }, h('table', { class: 'tl-table' + (editing ? ' is-editing' : '') }, h('thead', null, head), body)));
    }

    function assignBar(cur, data, tree) {
      var u = calc.findById(calc.planUnits(tree), sel.unitId);
      var from = Math.min(sel.from, sel.to), to = Math.max(sel.from, sel.to);
      var people = calc.eligiblePeople(cur.people, u.channel.id, calc.monthKey(year, from));
      var person = C.select({
        label: page.assignPerson, value: '', onChange: function () {},
        options: [{ value: '', label: page.assignVacant }].concat(people.map(function (p) { return { value: p.id, label: p.name }; }))
      });
      return h('div', { class: 'sp-assign' },
        h('strong', null, fill(page.assignFor, { unit: u.name, months: F.monthRange(from, to) + ' ' + year })),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.assignPerson), person),
        h('button', { type: 'button', class: 'btn btn-primary btn-sm', onClick: function () {
          // ถึง ธ.ค. = ต่อไปเรื่อยๆ (toMonth = null)
          var res = calc.setOwner(draft.assignments, u.id, person.value || null, calc.monthKey(year, from), to === 11 ? null : calc.monthKey(year, to), store.currentKey());
          if (!res.ok) { message = page.assignErrors[res.error]; draw(); return; }
          draft.assignments = res.list;
          sel = null;
          message = null;
          draw();
        } }, page.assignApply),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: function () { sel = null; draw(); } }, page.assignClear));
    }

    // ---------- ล่าง: Performance รายคน ----------
    function performanceCard(cur, data, tree, current) {
      var master = store.master();
      var targets = {}, actuals = {};
      calc.planUnits(tree).forEach(function (u) {
        targets[u.id] = calc.phasingTotals(u.amount, store.get(store.planKey('phasing.' + u.id)).monthPct).amounts;
        actuals[u.id] = calc.actualNetByUnit(data, master, u.id, year, current);
      });
      var nameOf = {};
      calc.planUnits(tree).forEach(function (u) { nameOf[u.id] = u.name; });
      var monthName = F.monthYear(current, year);
      var nowKey = calc.monthKey(year, current);
      var rows = cur.people.map(function (p) { return { person: p, perf: calc.personPerformance(cur.assignments, cur.people, p.id, year, targets, actuals, current) }; })
        .filter(function (r) { return r.perf.owned.some(Boolean); });
      var PF = page.perfColumns;
      return h('section', { class: 'card sp-perf' },
        h('h2', null, fill(page.perfTitle, { year: year })),
        rows.length ? C.table([
          { label: PF.name, render: function (r) {
            var st = calc.personStatus(r.person, nowKey);
            return [h('strong', null, r.person.name), r.person.endMonth ? h('span', { class: 'badge ' + (st === 'resigned' ? 'tag-muted' : 'tag-warn') + ' sp-perf-tag' }, fill(L.personStatus.resigned, { month: F.date(r.person.endMonth) })) : null];
          } },
          { label: PF.months, render: function (r) { return monthsText(r.perf.owned); } },
          { label: PF.units, render: function (r) { return r.perf.units.map(function (id) { return nameOf[id]; }).join(', '); } },
          { label: PF.target, className: 'num', render: function (r) { return F.baht(r.perf.target); } },
          { label: fill(PF.targetToDate, { month: monthName }), className: 'num', render: function (r) { return F.baht(r.perf.targetToDate); } },
          { label: fill(PF.actual, { month: monthName }), className: 'num', render: function (r) { return F.baht(r.perf.actualToDate); } },
          { label: PF.achievement, className: 'num', render: function (r) {
            var a = r.perf.achievement;
            return a == null ? '–' : h('span', { class: 'growth ' + (a >= 1 ? 'is-pos' : 'is-neg') }, F.pct(a, 1));
          } }
        ], rows, { className: 'sp-perf-table' }) : h('p', { class: 'muted' }, page.perfEmpty),
        h('p', { class: 'muted small' }, page.perfNote));
    }

    draw();
  }

  SP.modules.salespeople = { render: render };
})(window.SP);
