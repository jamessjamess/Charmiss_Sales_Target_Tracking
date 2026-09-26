/*
 * modules/territories/territories.js — Account Master · เขตการขายและร้านค้า (CR-16 แทนหน้าเขตการขายเดิม)
 *
 * หน้าที่:        จัดสรรร้านค้าของ Channel ที่แบ่งเป้าตามเขต (ตอนนี้คือ TT) ให้เขตการขายและผู้รับผิดชอบ ตามช่วงเดือน
 *                 แถวหัวข้อ: ข้อมูล ณ เดือน [▾] (components.monthPicker ค่าเริ่มต้น = เดือนปัจจุบันของข้อมูลร้านค้า stores.currentMonth)
 *                 · ส่งออก ▾ · แก้ไข (workflowBar แบบง่าย ทุกบทบาทแก้ได้)
 *                 บรรทัดสรุป: ร้านค้า · ใช้งาน · ยังไม่จัดสรร ⚠ · อยู่นอกจังหวัดของเขต · ไม่ระบุจังหวัด (กดแล้วกรอง)
 *                 ซ้าย: แผงเขตการขาย (ทั้งหมด · ยังไม่จัดสรร · แต่ละเขต: ผู้รับผิดชอบ ณ เดือนที่เลือก · จำนวนร้านตามตัวกรองสถานะ ·
 *                 สัดส่วนยอดอ้างอิงใน Channel · บรรทัดเล็กเมื่อเปลี่ยนผู้รับผิดชอบในปีนั้น / แก้ไข: ⋯ โอนทั้งเขต · แก้จังหวัดแนะนำ ·
 *                 เปลี่ยนชื่อ · ปิดใช้งาน + เพิ่มเขต + วางร้านที่ลากมาเพื่อย้าย)
 *                 ขวา: ตัวกรอง (ค้นหา · ประเภทร้าน · ประเภทราคา · จังหวัด · สถานะ · Export/Online · ข้อมูล) + Chip ตัวกรอง (CR-15) ·
 *                 ตารางร้านค้า เรียงได้ทุกคอลัมน์ (ค่าเริ่มต้นยอดอ้างอิงมากไปน้อย) · แถวสรุปท้ายตาราง / คลิกแถว → Drawer ข้อมูลร้าน + Timeline 12 เดือน
 *                 แก้ไข: Checkbox / ลากวาง → ย้ายไปเขต… · นำออกจากเขต · จัดสรรตามเขตแนะนำ (กล่องยืนยันสรุปก่อนทุกครั้ง)
 *                 แก้ draft จนกด บันทึก / ยกเลิก = ทิ้ง / การย้ายเก็บ move (เวลา + ช่วงเดิม) ให้ stores.movesAfterApproval
 *                 กฎทั้งหมดจาก core/stores.js (territoryOf, moveStores, suggestTerritory, outOfProvince …) + calc.setOwner (โอนทั้งเขต
 *                 ฟังก์ชันเดียวกับหน้าผู้รับผิดชอบ) — Module ไม่คำนวณเขต จังหวัดแนะนำ หรือผู้รับผิดชอบเอง
 * อ่านจาก data/:  channels, settings, targets, content (pages.territories, labels) + Master ผ่าน store.data()
 * store อ่าน:     master.stores, master.storeAssignments, master.storeMoves, master.provinceSuggestions, master.territories,
 *                 master.salespeople, master.assignments, plan.<ปี>.workflow.topDown.all (ทุกปีใน PLAN_YEARS), ui.role
 * store เขียน:    master.storeAssignments, master.storeMoves, master.provinceSuggestions, master.territories, master.assignments (ตอนกด บันทึก)
 *                 ตัวกรอง เดือนที่เลือก การเรียง และแถวที่เลือกเป็นตัวแปรใน Module (ไม่เก็บ)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var store = SP.core.store;
  var S = SP.core.stores;
  var h = C.h;
  var fill = C.fill;

  var NONE = '__none';
  var filters = defaultFilters();
  var sort = { key: 'salesRef', dir: -1 };
  var panelSel = 'all';            // 'all' | 'unassigned' | territoryId

  function defaultFilters() { return { q: '', storeType: [], priceType: [], province: [], status: 'active', channels: [], data: [] }; }
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function shortName(t) { return t ? String(t.name).split(' · ')[0] : ''; }
  function firstName(name) { return String(name || '').split(' ')[0]; }
  function thai(a, b) { return String(a).localeCompare(String(b), 'th'); }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var base = store.data();
    var channels = SP.data.channels.filter(function (c) { return (base.storeChannels || []).indexOf(c.id) >= 0; });
    if (!channels.length || !(base.stores || []).length) { root.appendChild(C.callout('info', page.empty)); return; }
    var channel = channels[0];
    var nowKey = S.currentMonth(base);
    var refYear = SP.data.settings.DEFAULT_PLAN_YEAR - 1;
    var firstKey = (base.storeAssignments || []).reduce(function (m, a) { return !m || a.fromMonth < m ? a.fromMonth : m; }, null) || nowKey;
    var lastKey = calc.monthKey(Math.max.apply(null, SP.data.settings.PLAN_YEARS), 11);
    var months = S.monthsBetween(firstKey < nowKey ? firstKey : nowKey, lastKey);
    var futureMonths = S.monthsBetween(nowKey, lastKey);
    var month = nowKey;
    var saved = snapshot();
    var draft = clone(saved);
    var editing = false;
    var selected = {};
    var drawerStore = null, drawerYear = null;

    function snapshot() {
      return {
        storeAssignments: store.get('master.storeAssignments'), storeMoves: store.get('master.storeMoves'),
        provinceSuggestions: store.get('master.provinceSuggestions'), territories: store.get('master.territories'), assignments: store.get('master.assignments')
      };
    }
    function cur() { return editing ? draft : saved; }
    function dataOf(c) {
      var d = {};
      Object.keys(base).forEach(function (k) { d[k] = base[k]; });
      Object.keys(c).forEach(function (k) { d[k] = c[k]; });
      return d;
    }
    function data() { return dataOf(cur()); }
    function terrs(d) { return S.storeTerritories(d); }
    function terr(d, id) { return calc.findById(d.territories, id); }
    function activeSuggestions(d) {
      var out = {};
      terrs(d).forEach(function (t) { if (t.active !== false) out[t.id] = d.provinceSuggestions[t.id] || []; });
      return out;
    }
    function ownerName(d, unitId, key) {
      var o = C.ownerInfo(d, unitId, key);
      return o.vacant && o.name === L.owner.none ? page.panel.noOwner : o.name;
    }
    function roleName() { return C.roleName(store.role()); }

    // ---------- รายการที่ยังไม่บันทึก ----------
    function dirty() {
      if (!editing) return 0;
      var n = S.changedStores(saved.storeAssignments, draft.storeAssignments).length;
      n += draft.territories.filter(function (t) { var o = calc.findById(saved.territories, t.id); return !o || !same(o, t); }).length;
      var units = {};
      saved.assignments.concat(draft.assignments).forEach(function (a) { units[a.unitId] = true; });
      n += Object.keys(units).filter(function (u) {
        return !same(calc.unitAssignments(saved.assignments, u), calc.unitAssignments(draft.assignments, u));
      }).length;
      n += Object.keys(draft.provinceSuggestions).filter(function (t) { return !same((saved.provinceSuggestions[t] || []).slice().sort(), draft.provinceSuggestions[t].slice().sort()); }).length;
      return n;
    }
    C.guardUnsaved(dirty);

    // ---------- แถวหัวข้อ: ข้อมูล ณ เดือน · ส่งออก · แก้ไข ----------
    var picker = C.monthPicker({
      label: page.month.label, tip: page.month.tip, value: month, months: months, current: nowKey, currentLabel: page.month.current,
      onChange: function (k) { month = k; draw(); if (drawerStore) drawDrawer(); }
    });
    var exportBtn = C.exportButton({ unsaved: dirty, build: exportSpec });
    var bar = C.workflowBar({
      simple: true, extra: exportBtn,
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); selected = {}; draw(); },
      onSave: save,
      onCancel: function () { editing = false; draft = clone(saved); selected = {}; draw(); if (drawerStore) drawDrawer(); }
    });
    if (ctx.intro) {
      var h1 = ctx.intro.querySelector('h1');
      ctx.intro.insertBefore(picker, h1 ? h1.nextSibling : ctx.intro.firstChild);
      ctx.intro.appendChild(bar);
    }

    function save() {
      var keys = { storeAssignments: 'master.storeAssignments', storeMoves: 'master.storeMoves', provinceSuggestions: 'master.provinceSuggestions',
        territories: 'master.territories', assignments: 'master.assignments' };
      Object.keys(keys).forEach(function (k) { if (!same(saved[k], draft[k])) store.set(keys[k], draft[k]); });
      saved = clone(draft);
      editing = false;
      selected = {};
      draw();
      if (drawerStore) drawDrawer();
    }

    // ---------- แถวของตาราง ----------
    function statusOk(s) { return filters.status === 'all' || (filters.status === 'active' ? s.active !== false : s.active === false); }
    function inPanel(s, t) { return panelSel === 'all' || (panelSel === 'unassigned' ? !t : t === panelSel); }
    function rowsOf(d, mem) {
      var P = d.provinceSuggestions;
      var q = filters.q.trim().toLowerCase();
      var year = Number(month.slice(0, 4));
      var rows = d.stores.filter(function (s) {
        var t = mem[s.id];
        if (!inPanel(s, t) || !statusOk(s)) return false;
        if (q && String(s.systemId).toLowerCase().indexOf(q) < 0 && String(s.name).toLowerCase().indexOf(q) < 0) return false;
        if (filters.storeType.length && filters.storeType.indexOf(s.storeType || NONE) < 0) return false;
        if (filters.priceType.length && filters.priceType.indexOf(s.priceType || NONE) < 0) return false;
        if (filters.province.length) {
          var ps = S.provincesOf(s);
          if (!(ps.length ? ps : [NONE]).some(function (p) { return filters.province.indexOf(p) >= 0; })) return false;
        }
        if (filters.channels.length && !filters.channels.some(function (c) { return c === 'export' ? s.hasExport : s.hasOnline; })) return false;
        if (filters.data.length && !filters.data.some(function (k) {
          if (k === 'outside') return !!t && S.outOfProvince(s, t, P);
          if (k === 'noProvince') return !S.provincesOf(s).length;
          return S.movedInYear(d, s.id, year);
        })) return false;
        return true;
      });
      var sug = activeSuggestions(d);
      var val = {
        id: function (s) { return Number(s.systemId) * 10 + (s.id === s.systemId ? 0 : Number(s.id.split('-').pop()) || 0); },
        name: function (s) { return s.name; }, storeType: function (s) { return s.storeType || ''; }, priceType: function (s) { return s.priceType || ''; },
        province: function (s) { return s.province || ''; }, export: function (s) { return s.hasExport ? 1 : 0; }, online: function (s) { return s.hasOnline ? 1 : 0; },
        status: function (s) { return s.active !== false ? 0 : 1; }, salesRef: function (s) { return s.salesRef || 0; },
        territory: function (s) { return mem[s.id] ? shortName(terr(d, mem[s.id])) : '~'; },
        suggested: function (s) { var g = S.suggestTerritory(s, sug); return g ? shortName(terr(d, g)) : '~'; }
      }[sort.key];
      rows.sort(function (a, b) {
        var x = val(a), y = val(b);
        var c = typeof x === 'number' && typeof y === 'number' ? x - y : thai(x, y);
        return c * sort.dir || (b.salesRef || 0) - (a.salesRef || 0) || thai(a.systemId, b.systemId);
      });
      return rows;
    }

    // =====================================================================
    function draw() {
      C.clear(root);
      bar.update();
      var d = data();
      var mem = S.membership(d, month);
      if (panelSel !== 'all' && panelSel !== 'unassigned' && !terr(d, panelSel)) panelSel = 'all';
      root.appendChild(summaryLine(d));
      if (editing) { var banner = C.editBanner(); root.appendChild(banner); banner.update(dirty()); }
      var rows = rowsOf(d, mem);
      Object.keys(selected).forEach(function (id) { if (!rows.some(function (s) { return s.id === id; })) delete selected[id]; });
      root.appendChild(h('div', { class: 'card fit-card tr-card' + (editing ? ' is-editing' : '') },
        h('div', { class: 'tr-layout' }, panel(d, mem), tablePane(d, mem, rows))));
    }

    // ---------- บรรทัดสรุป ----------
    function summaryLine(d) {
      var P = page.summary;
      var s = S.summary(d, month);
      function item(text, tip, cls, onClick) {
        return onClick ? h('button', { type: 'button', class: 'link-btn tr-sum-item ' + (cls || ''), title: tip, onClick: onClick }, text)
          : h('span', { class: 'tr-sum-item ' + (cls || ''), title: tip }, text);
      }
      var parts = [
        item(fill(P.stores, { n: F.number(s.total) })),
        item(fill(P.active, { n: F.number(s.active) }), P.activeTip),
        item([fill(P.unassigned, { n: F.number(s.unassigned) }), s.unassigned ? ' ⚠' : ''].join(''), P.unassignedTip, s.unassigned ? 'text-short' : null,
          function () { panelSel = 'unassigned'; draw(); }),
        item(fill(P.outside, { n: F.number(s.outOfProvince) }), P.outsideTip, s.outOfProvince ? 'text-over' : null,
          function () { filters.data = ['outside']; draw(); }),
        item(fill(P.noProvince, { n: F.number(s.noProvince) }), P.noProvinceTip, null,
          function () { filters.data = ['noProvince']; draw(); })
      ];
      var out = [];
      parts.forEach(function (p, i) { if (i) out.push(h('span', { class: 'tr-sum-sep', 'aria-hidden': 'true' }, '·')); out.push(p); });
      return h('p', { class: 'tr-summary' }, out);
    }

    // =====================================================================
    // แผงเขตการขาย
    // =====================================================================
    function panel(d, mem) {
      var P = page.panel;
      var year = Number(month.slice(0, 4));
      var totalRef = calc.sum(d.stores.map(function (s) { return s.salesRef || 0; }));
      var count = { all: 0, unassigned: 0 }, ref = {};
      d.stores.forEach(function (s) {
        var t = mem[s.id];
        if (t) ref[t] = (ref[t] || 0) + (s.salesRef || 0);
        if (!statusOk(s)) return;
        count.all++;
        if (t) count[t] = (count[t] || 0) + 1; else count.unassigned++;
      });
      var statusName = page.filters.statusOptions[filters.status];
      function select(key) { return function () { panelSel = key; draw(); }; }
      function head(key, label, n, cls) {
        return h('li', { class: 'tr-item tr-item-simple' + (panelSel === key ? ' is-selected' : '') + (cls ? ' ' + cls : '') },
          h('button', { type: 'button', class: 'tr-item-main', 'aria-pressed': panelSel === key ? 'true' : 'false', onClick: select(key), title: fill(P.countTip, { status: statusName }) },
            h('span', { class: 'tr-item-name' }, label), h('span', { class: 'tr-item-count' }, F.number(n))));
      }
      var list = h('ul', { class: 'tr-list' },
        head('all', P.all, count.all),
        head('unassigned', P.unassigned, count.unassigned, count.unassigned ? 'is-danger' : null),
        h('li', { class: 'tr-sep', role: 'separator' }),
        terrs(d).map(function (t) { return territoryItem(d, t, count[t.id] || 0, ref[t.id] || 0, totalRef, year, statusName); }));
      return h('aside', { class: 'tr-panel', 'aria-label': P.title },
        h('h2', { class: 'tr-panel-title' }, P.title),
        h('div', { class: 'tr-panel-scroll' }, list),
        editing ? h('div', { class: 'tr-panel-foot' },
          h('button', { type: 'button', class: 'btn btn-secondary btn-sm tr-add', onClick: addTerritory }, P.add),
          h('span', { class: 'tr-hint' }, P.dropHint)) : h('p', { class: 'tr-hint tr-panel-note' }, P.ownerNote));
    }

    function territoryItem(d, t, n, ref, totalRef, year, statusName) {
      var P = page.panel;
      var o = C.ownerInfo(d, t.id, month);
      var segs = calc.ownerSegments(d.assignments, d.salespeople, t.id, year);
      var m = Number(month.slice(5, 7)) - 1;
      var idx = -1;
      segs.forEach(function (s, i) { if (s.from <= m && m <= s.to) idx = i; });
      var notes = [];
      var prev = segs[idx - 1], next = segs[idx + 1];
      var person = function (s) { return C.personName(d.salespeople, s.personId || s.assignedId); };
      if (prev && (prev.personId || prev.assignedId)) notes.push(fill(P.until, { name: firstName(person(prev)), month: F.date(calc.monthKey(year, prev.to)) }));
      if (next && (next.personId || next.assignedId)) notes.push(fill(P.from, { name: firstName(person(next)), month: F.date(calc.monthKey(year, next.from)) }));
      var share = totalRef ? ref / totalRef : 0;
      var inactive = t.active === false;
      var li = h('li', { class: 'tr-item' + (panelSel === t.id ? ' is-selected' : '') + (inactive ? ' is-inactive' : ''), dataset: { territory: t.id } },
        h('button', { type: 'button', class: 'tr-item-main', 'aria-pressed': panelSel === t.id ? 'true' : 'false', onClick: function () { panelSel = t.id; draw(); } },
          h('span', { class: 'tr-item-name', title: t.name }, t.name, inactive ? h('span', { class: 'badge tag-muted tr-inactive' }, P.inactive) : null),
          h('span', { class: 'tr-item-meta' },
            h('span', { class: 'tr-item-owner' + (o.vacant ? ' text-short' : ''), title: o.title }, o.vacant ? P.noOwner : o.name),
            h('span', { class: 'tr-item-count', title: fill(P.countTip, { status: statusName }) }, fill(P.count, { n: F.number(n) })),
            h('span', { class: 'tr-item-share', title: fill(P.shareTip, { channel: channel.name }) }, F.pct(share, 0))),
          notes.length ? h('span', { class: 'tr-item-note' }, notes.join(' · ')) : null),
        editing ? C.menuButton(function () { return territoryMenu(d, t); }, P.more + ' ' + t.name, { className: 'tr-more' }) : null);
      if (editing && !inactive) {
        li.addEventListener('dragover', function (e) { if (dragIds) { e.preventDefault(); li.classList.add('is-drop'); } });
        li.addEventListener('dragleave', function () { li.classList.remove('is-drop'); });
        li.addEventListener('drop', function (e) { e.preventDefault(); li.classList.remove('is-drop'); var ids = dragIds; dragIds = null; if (ids && ids.length) moveDialog(ids, t.id); });
      }
      return li;
    }

    function territoryMenu(d, t) {
      var P = page.panel;
      var busy = cur().storeAssignments.some(function (a) { return a.territoryId === t.id && (a.toMonth == null || a.toMonth >= nowKey); });
      return [
        { label: P.transfer, onClick: function () { transferDialog(t.id); }, disabled: t.active === false },
        { label: P.provinces, onClick: function () { provincesDialog(t.id); } },
        { label: P.rename, onClick: function () { renameTerritory(t.id); } },
        t.active === false ? { label: P.activate, onClick: function () { setActive(t.id, true); } }
          : { label: P.deactivate, disabled: busy, title: busy ? P.deactivateBlocked : null, onClick: function () { confirmDeactivate(t.id); } }
      ];
    }

    // =====================================================================
    // ตารางร้านค้า
    // =====================================================================
    var dragIds = null;
    function tablePane(d, mem, rows) {
      var Cl = page.columns, T = page.tips;
      var P = activeSuggestions(d);
      var showTerritory = panelSel === 'all';
      var sel = panelSel === 'all' || panelSel === 'unassigned' ? null : terr(d, panelSel);
      var title = sel ? fill(page.tableTitle.territory, { name: sel.name }) : page.tableTitle[panelSel];
      var cols = [
        { key: 'id', label: Cl.id }, { key: 'name', label: Cl.name }, { key: 'storeType', label: Cl.storeType }, { key: 'priceType', label: Cl.priceType },
        { key: 'province', label: Cl.province }, { key: 'export', label: Cl.export, cls: 'tr-mark-col', tip: T.export },
        { key: 'online', label: Cl.online, cls: 'tr-mark-col', tip: T.online }, { key: 'status', label: Cl.status },
        { key: 'salesRef', label: Cl.salesRef, cls: 'num', tip: fill(T.salesRef, { year: refYear }) }
      ];
      if (showTerritory) cols.push({ key: 'territory', label: Cl.territory });
      cols.push({ key: 'suggested', label: Cl.suggested, tip: T.suggested });
      var all = rows.length > 0 && rows.every(function (s) { return selected[s.id]; });
      var headBox = editing ? h('input', { type: 'checkbox', checked: all, 'aria-label': Cl.selectAll, title: Cl.selectAll, onChange: function (e) {
        rows.forEach(function (s) { if (e.target.checked) selected[s.id] = true; else delete selected[s.id]; });
        draw();
      } }) : null;
      var thead = h('thead', null, h('tr', null,
        editing ? h('th', { scope: 'col', class: 'tr-check' }, headBox) : null,
        cols.map(function (c) {
          var on = sort.key === c.key;
          return h('th', { scope: 'col', class: (c.cls || '') + (on ? ' is-sorted' : ''), 'aria-sort': on ? (sort.dir > 0 ? 'ascending' : 'descending') : null },
            h('button', { type: 'button', class: 'tr-sort', title: c.tip || fill(T.sort, { name: c.label }), onClick: function () {
              if (sort.key === c.key) sort.dir = -sort.dir; else { sort.key = c.key; sort.dir = c.key === 'salesRef' ? -1 : 1; }
              draw();
            } }, c.label, h('span', { class: 'tr-sort-mark', 'aria-hidden': 'true' }, on ? (sort.dir > 0 ? '▲' : '▼') : '')));
        })));
      var body = h('tbody');
      if (!rows.length) body.appendChild(h('tr', null, h('td', { class: 'grid-empty', colspan: String(cols.length + (editing ? 1 : 0)) }, page.emptyRows)));
      rows.forEach(function (s) { body.appendChild(storeRow(d, mem, s, P, showTerritory)); });
      var total = calc.sum(rows.map(function (s) { return s.salesRef || 0; }));
      var tfoot = h('tfoot', null, h('tr', null,
        h('td', { colspan: String(cols.length + (editing ? 1 : 0)) }, fill(page.footer, { n: F.number(rows.length), amount: F.baht(total) }))));
      var table = h('table', { class: 'data-grid tr-table' + (editing ? ' is-editing' : '') }, thead, body, tfoot);
      return h('section', { class: 'tr-main' },
        h('div', { class: 'tr-main-head' }, h('h2', { class: 'tr-main-title', title: title }, title)),
        toolbar(d),
        chips(),
        h('div', { class: 'fit-scroll tr-scroll' }, table),
        editing ? selectionBar(d, mem) : null);
    }

    function storeRow(d, mem, s, P, showTerritory) {
      var T = page.tips;
      var t = mem[s.id];
      var sug = S.suggestTerritory(s, P);
      var outside = !!t && S.outOfProvince(s, t, P);
      var sugText = !t ? (sug ? shortName(terr(d, sug)) : '–') : sug && sug !== t ? shortName(terr(d, sug)) : '';
      var yes = function (on, tip) { return on ? h('span', { class: 'tr-mark', title: tip, 'aria-label': T.has }, '●') : ''; };
      var tr = h('tr', { class: 'is-clickable' + (s.active === false ? ' is-inactive' : '') + (selected[s.id] ? ' is-selected' : ''), dataset: { store: s.id }, draggable: editing ? 'true' : null },
        editing ? h('td', { class: 'tr-check' }, h('input', { type: 'checkbox', checked: !!selected[s.id], 'aria-label': page.columns.select + ' ' + s.systemId, onChange: function (e) {
          if (e.target.checked) selected[s.id] = true; else delete selected[s.id];
          draw();
        } })) : null,
        h('td', { class: 'tr-id' }, s.systemId, s.duplicates > 1 ? h('span', { class: 'badge tag-warn tr-dup', title: fill(T.duplicateTip, { n: s.duplicates }) }, T.duplicate) : null),
        h('td', { class: 'tr-name' }, h('span', { class: 'tr-name-text', title: s.name }, s.name), s.masked ? C.privacyMark(T.masked) : null),
        h('td', { title: s.storeType || '' }, h('span', { class: 'tr-type' }, s.storeType || '–')),
        h('td', null, s.priceType || '–'),
        h('td', { class: 'tr-province' }, h('span', { class: 'tr-province-text', title: s.province || '' }, s.province ? s.province.split(',').join(', ') : '–'),
          outside ? h('span', { class: 'badge tag-warn tr-outside', title: fill(T.outsideTip, { territory: terr(d, t).name }) }, T.outside) : null),
        h('td', { class: 'tr-mark-col' }, yes(s.hasExport, T.export)),
        h('td', { class: 'tr-mark-col' }, yes(s.hasOnline, T.online)),
        h('td', null, h('span', { class: 'badge ' + (s.active !== false ? 'tag-ok' : 'tag-muted') }, s.active !== false ? page.status.active : page.status.cancelled)),
        h('td', { class: 'num' }, F.baht(s.salesRef || 0)),
        showTerritory ? h('td', { class: t ? null : 'text-short', title: t ? terr(d, t).name : null }, t ? shortName(terr(d, t)) : page.unassignedCell) : null,
        h('td', { class: 'tr-sug', title: sug ? terr(d, sug).name : null }, sugText));
      tr.addEventListener('click', function (e) {
        if (e.target.closest('input, button, label')) return;
        drawerStore = s.id;
        drawerYear = Number(month.slice(0, 4));
        drawDrawer();
        drawerCtl.open();
      });
      if (editing) {
        tr.addEventListener('dragstart', function (e) {
          dragIds = selected[s.id] ? Object.keys(selected) : [s.id];
          try { e.dataTransfer.setData('text/plain', dragIds.join(',')); e.dataTransfer.effectAllowed = 'move'; } catch (x) { /* ignore */ }
          root.classList.add('is-dragging');
        });
        tr.addEventListener('dragend', function () { root.classList.remove('is-dragging'); setTimeout(function () { dragIds = null; }, 0); });
      }
      return tr;
    }

    // ---------- ตัวกรอง ----------
    function toolbar(d) {
      var X = page.filters;
      function opts(values, labelOf) { return values.map(function (v) { return { value: v, label: labelOf ? labelOf(v) : v }; }); }
      function uniq(fn) {
        var seen = {}, out = [];
        d.stores.forEach(function (s) { (fn(s) || [NONE]).forEach(function (v) { if (!seen[v]) { seen[v] = true; out.push(v); } }); });
        return out.sort(function (a, b) { return a === NONE ? 1 : b === NONE ? -1 : thai(a, b); });
      }
      var noneLabel = function (v) { return v === NONE ? X.none : v; };
      function multi(key, label, options) {
        return C.multiSelect({ label: label, allLabel: X.all, selected: X.selected, clear: X.clear, empty: X.empty, search: options.length > 8 ? X.find : null,
          options: options, value: filters[key], onChange: function (v) { filters[key] = v; draw(); } });
      }
      var search = h('input', { type: 'search', class: 'search-input tr-search', placeholder: page.search, 'aria-label': page.search, value: filters.q });
      var timer = null;
      search.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          filters.q = search.value;
          var pos = search.selectionStart;
          draw();
          var next = root.querySelector('.tr-search');
          if (next) { next.focus(); try { next.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } }
        }, 200);
      });
      var statusSel = C.select({ label: X.status, value: filters.status, className: 'tr-status',
        options: ['active', 'cancelled', 'all'].map(function (v) { return { value: v, label: X.status + ': ' + X.statusOptions[v] }; }),
        onChange: function (v) { filters.status = v; draw(); } });
      return h('div', { class: 'tool-row tr-toolbar' },
        search,
        multi('storeType', X.storeType, opts(uniq(function (s) { return s.storeType ? [s.storeType] : null; }), noneLabel)),
        multi('priceType', X.priceType, opts(uniq(function (s) { return s.priceType ? [s.priceType] : null; }), noneLabel)),
        multi('province', X.province, opts(uniq(function (s) { var p = S.provincesOf(s); return p.length ? p : null; }), noneLabel)),
        statusSel,
        multi('channels', X.channels, ['export', 'online'].map(function (v) { return { value: v, label: X.channelOptions[v] }; })),
        multi('data', X.data, ['outside', 'noProvince', 'moved'].map(function (v) { return { value: v, label: X.dataOptions[v] }; })));
    }

    function chips() {
      var X = page.filters;
      var items = [];
      if (filters.q.trim()) items.push({ label: fill(X.chipSearch, { q: filters.q.trim() }), onRemove: function () { filters.q = ''; draw(); } });
      function add(key, label, labelOf) {
        filters[key].forEach(function (v) {
          items.push({ label: fill(X.chip, { label: label, value: labelOf(v) }), onRemove: function () { filters[key] = filters[key].filter(function (x) { return x !== v; }); draw(); } });
        });
      }
      var noneLabel = function (v) { return v === NONE ? X.none : v; };
      add('storeType', X.storeType, noneLabel);
      add('priceType', X.priceType, noneLabel);
      add('province', X.province, noneLabel);
      if (filters.status !== 'active') items.push({ label: fill(X.chip, { label: X.status, value: X.statusOptions[filters.status] }), onRemove: function () { filters.status = 'active'; draw(); } });
      add('channels', X.channels, function (v) { return X.channelOptions[v]; });
      add('data', X.data, function (v) { return X.dataOptions[v]; });
      return C.filterChips(items, function () { filters = defaultFilters(); draw(); });
    }

    // ---------- แถบแถวที่เลือก (โหมดแก้ไข) ----------
    function selectionBar(d, mem) {
      var X = page.selection;
      var ids = Object.keys(selected);
      if (!ids.length) return null;
      var list = ids.map(function (id) { return calc.findById(d.stores, id); }).filter(Boolean);
      var amount = calc.sum(list.map(function (s) { return s.salesRef || 0; }));
      var P = activeSuggestions(d);
      var assigned = list.filter(function (s) { return mem[s.id]; }).length;
      var suggestable = list.filter(function (s) { return !mem[s.id] && S.suggestTerritory(s, P); }).length;
      var showSuggest = panelSel === 'unassigned' || list.some(function (s) { return !mem[s.id]; });
      return h('div', { class: 'tr-selection', role: 'status' },
        h('span', { class: 'tr-selection-text' }, fill(X.text, { n: F.number(list.length), amount: F.millionPlain(amount) })),
        h('button', { type: 'button', class: 'btn btn-primary btn-sm tr-move', onClick: function () { moveDialog(ids, null); } }, X.move),
        h('button', { type: 'button', class: 'btn btn-secondary btn-sm tr-unassign', disabled: !assigned, title: assigned ? null : X.noneAssigned, onClick: function () { unassignDialog(ids); } }, X.unassign),
        showSuggest ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm tr-suggest', disabled: !suggestable, title: suggestable ? null : X.noneSuggested, onClick: function () { suggestDialog(ids); } }, X.suggest) : null,
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm tr-clear-sel', onClick: function () { selected = {}; draw(); } }, X.clear));
    }

    // =====================================================================
    // กล่องยืนยันการจัดสรร
    // =====================================================================
    function monthSelect(value, onChange) {
      return C.select({ label: page.move.fromMonth, value: value, className: 'tr-dlg-month',
        options: futureMonths.map(function (k) { return { value: k, label: F.date(k) + (k === nowKey ? ' (' + page.month.current + ')' : '') }; }), onChange: onChange });
    }
    function field(label, control) { return h('label', { class: 'tr-dlg-field' }, h('span', { class: 'field-label' }, label), control); }

    // ข้อความผลต่อเป้าหมายของปีแผนที่การย้ายมีผล (อนุมัติแล้ว = คำเตือน / ยังไม่อนุมัติ = ยอดปีก่อนคำนวณใหม่)
    function yearNotes(fromKey, amount) {
      var M = page.move;
      var out = [];
      SP.data.settings.PLAN_YEARS.forEach(function (y) {
        if (fromKey > calc.monthKey(y, 11)) return;
        var at = S.approvedAt(store.workflowStates(y)['topDown.all']);
        if (at) out.push(h('li', { class: 'tr-dlg-warn' }, fill(M.approved, { year: y, amount: F.baht(amount) })));
        else if (SP.data.targets.years[y] && fromKey <= calc.monthKey(y, 0)) out.push(h('li', { class: 'tr-dlg-info' }, fill(M.draftYear, { year: y, prior: y - 1 })));
      });
      return out;
    }

    function apply(res) {
      if (!res.ok || !res.move) return false;
      draft.storeAssignments = res.storeAssignments;
      draft.storeMoves = draft.storeMoves.concat([res.move]);
      return true;
    }
    function stamp() { return { current: nowKey, at: new Date().toISOString(), by: roleName() }; }

    function moveDialog(ids, target) {
      var M = page.move;
      var d = dataOf(draft);
      var P = activeSuggestions(d);
      var options = terrs(d).filter(function (t) { return t.active !== false; });
      if (!options.length) return;
      var fromKey = calc.addMonths(nowKey, 1);
      if (futureMonths.indexOf(fromKey) < 0) fromKey = nowKey;
      var to = target || (options.filter(function (t) { return t.id !== panelSel; })[0] || options[0]).id;
      var targetSel = C.select({ label: M.target, value: to, className: 'tr-dlg-target', options: options.map(function (t) { return { value: t.id, label: t.name }; }),
        onChange: function (v) { to = v; refresh(); } });
      var monthSel = monthSelect(fromKey, function (v) { fromKey = v; refresh(); });
      var summary = h('ul', { class: 'dlg-lines tr-dlg-lines' });
      function refresh() {
        Array.prototype.forEach.call(targetSel.options, function (o) { o.textContent = fill(M.targetOption, { name: terr(d, o.value).name, owner: ownerName(d, o.value, fromKey) }); });
        C.clear(summary);
        var res = S.moveStores(d, ids, to, fromKey, {});
        var moved = res.moved.map(function (id) { return calc.findById(d.stores, id); });
        if (!moved.length) { summary.appendChild(h('li', null, M.noChange)); return; }
        var amount = calc.sum(moved.map(function (s) { return s.salesRef || 0; }));
        summary.appendChild(h('li', null, fill(M.count, { n: F.number(moved.length), amount: F.baht(amount) })));
        var groups = {};
        moved.forEach(function (s) { var f = S.territoryOf(d, s.id, fromKey) || ''; groups[f] = (groups[f] || 0) + 1; });
        Object.keys(groups).forEach(function (f) {
          summary.appendChild(h('li', null, fill(M.fromTo, {
            from: f ? terr(d, f).name : page.unassignedCell, fromOwner: f ? ownerName(d, f, fromKey) : '–',
            to: terr(d, to).name, toOwner: ownerName(d, to, fromKey), n: F.number(groups[f])
          })));
        });
        var outside = moved.filter(function (s) { return S.outOfProvince(s, to, P); }).length;
        if (outside) summary.appendChild(h('li', { class: 'tr-dlg-info' }, fill(M.outside, { n: F.number(outside) })));
        yearNotes(fromKey, amount).forEach(function (n) { summary.appendChild(n); });
      }
      refresh();
      C.dialog({
        title: M.title, wide: true, confirmLabel: M.confirm,
        body: h('div', { class: 'tr-dlg' }, h('div', { class: 'tr-dlg-fields' }, field(M.target, targetSel), field(M.fromMonth, monthSel)),
          h('p', { class: 'tr-hint' }, fill(M.pastNote, { month: F.date(nowKey) })), summary)
      }).then(function (r) {
        if (!r.ok) return;
        if (apply(S.moveStores(dataOf(draft), ids, to, fromKey, stamp()))) { selected = {}; draw(); }
      });
    }

    function unassignDialog(ids) {
      var U = page.unassign;
      var d = dataOf(draft);
      var fromKey = futureMonths.indexOf(calc.addMonths(nowKey, 1)) >= 0 ? calc.addMonths(nowKey, 1) : nowKey;
      var monthSel = monthSelect(fromKey, function (v) { fromKey = v; refresh(); });
      var summary = h('ul', { class: 'dlg-lines tr-dlg-lines' });
      function refresh() {
        C.clear(summary);
        var res = S.unassignStores(d, ids, fromKey, {});
        var moved = res.moved.map(function (id) { return calc.findById(d.stores, id); });
        if (!moved.length) { summary.appendChild(h('li', null, page.move.noChange)); return; }
        var amount = calc.sum(moved.map(function (s) { return s.salesRef || 0; }));
        summary.appendChild(h('li', null, fill(U.count, { n: F.number(moved.length), amount: F.baht(amount) })));
        var groups = {};
        moved.forEach(function (s) { var f = S.territoryOf(d, s.id, fromKey); if (f) groups[f] = (groups[f] || 0) + 1; });
        Object.keys(groups).forEach(function (f) { summary.appendChild(h('li', null, fill(U.from, { from: terr(d, f).name, owner: ownerName(d, f, fromKey), n: F.number(groups[f]) }))); });
        yearNotes(fromKey, amount).forEach(function (n) { summary.appendChild(n); });
      }
      refresh();
      C.dialog({
        title: U.title, confirmLabel: U.confirm, wide: true,
        body: h('div', { class: 'tr-dlg' }, h('p', { class: 'dlg-text' }, U.text), h('div', { class: 'tr-dlg-fields' }, field(page.move.fromMonth, monthSel)), summary)
      }).then(function (r) {
        if (!r.ok) return;
        if (apply(S.unassignStores(dataOf(draft), ids, fromKey, stamp()))) { selected = {}; draw(); }
      });
    }

    function suggestDialog(ids) {
      var G = page.suggest;
      var d = dataOf(draft);
      var P = activeSuggestions(d);
      var mem = S.membership(d, month);
      var groups = {}, skipped = 0;
      ids.forEach(function (id) {
        var s = calc.findById(d.stores, id);
        if (!s || mem[id]) return;
        var t = S.suggestTerritory(s, P);
        if (t) (groups[t] = groups[t] || []).push(s); else skipped++;
      });
      var fromKey = futureMonths.indexOf(calc.addMonths(nowKey, 1)) >= 0 ? calc.addMonths(nowKey, 1) : nowKey;
      var monthSel = monthSelect(fromKey, function (v) { fromKey = v; refresh(); });
      var summary = h('ul', { class: 'dlg-lines tr-dlg-lines' });
      function refresh() {
        C.clear(summary);
        var amount = 0;
        Object.keys(groups).forEach(function (t) {
          var a = calc.sum(groups[t].map(function (s) { return s.salesRef || 0; }));
          amount += a;
          summary.appendChild(h('li', null, fill(G.item, { name: terr(d, t).name, owner: ownerName(d, t, fromKey), n: F.number(groups[t].length), amount: F.baht(a) })));
        });
        if (skipped) summary.appendChild(h('li', { class: 'tr-dlg-info' }, fill(G.skipped, { n: F.number(skipped) })));
        yearNotes(fromKey, amount).forEach(function (n) { summary.appendChild(n); });
      }
      refresh();
      C.dialog({
        title: G.title, confirmLabel: G.confirm, wide: true,
        body: h('div', { class: 'tr-dlg' }, h('div', { class: 'tr-dlg-fields' }, field(page.move.fromMonth, monthSel)), summary)
      }).then(function (r) {
        if (!r.ok) return;
        var changed = false;
        Object.keys(groups).forEach(function (t) {
          var ids2 = groups[t].map(function (s) { return s.id; });
          if (apply(S.moveStores(dataOf(draft), ids2, t, fromKey, stamp()))) changed = true;
        });
        if (changed) { selected = {}; draw(); }
      });
    }

    // โอนทั้งเขต: เปลี่ยนผู้รับผิดชอบของเขต (calc.setOwner ฟังก์ชันเดียวกับหน้าผู้รับผิดชอบ) ร้านค้าไม่ย้าย
    function transferDialog(tid) {
      var X = page.transfer;
      var d = dataOf(draft);
      var t = terr(d, tid);
      var fromKey = futureMonths.indexOf(calc.addMonths(nowKey, 1)) >= 0 ? calc.addMonths(nowKey, 1) : nowKey;
      var personId = null, backdate = false;
      var wrap = h('div', { class: 'tr-dlg' });
      var err = h('p', { class: 'dlg-error', role: 'alert', hidden: true });
      function people() { return calc.eligiblePeople(d.salespeople, t.channelId, fromKey); }
      // ผู้รับผิดชอบเดิมที่ลาออกก่อนเดือนที่มีผล → ช่วงที่เขตว่าง + รับย้อนหลังได้ตั้งแต่เดือนถัดจากเดือนลาออก (เฉพาะเดือนที่ยังไม่ผ่าน)
      function gap() {
        var prevKey = calc.addMonths(fromKey, -1);
        var a = calc.assignmentAt(d.assignments, tid, prevKey) || calc.assignmentAt(d.assignments, tid, nowKey);
        var p = a && a.salesPersonId ? calc.findById(d.salespeople, a.salesPersonId) : null;
        if (!p || !p.endMonth || p.endMonth >= prevKey) return null;
        var start = calc.addMonths(p.endMonth, 1);
        return { person: p, from: start, to: prevKey, backFrom: start < nowKey ? nowKey : start };
      }
      function build() {
        C.clear(wrap);
        var list = people();
        if (!list.some(function (p) { return p.id === personId; })) personId = list.length ? list[0].id : null;
        var owner = calc.ownerOf(d.assignments, d.salespeople, tid, calc.addMonths(fromKey, -1));
        if (personId === owner && list.length > 1) personId = list.filter(function (p) { return p.id !== owner; })[0].id;
        wrap.appendChild(h('p', { class: 'dlg-text' }, fill(X.current, { month: F.date(month), name: ownerName(d, tid, month) })));
        var fields = h('div', { class: 'tr-dlg-fields' },
          field(X.person, list.length ? C.select({ label: X.person, value: personId, className: 'tr-dlg-person', options: list.map(function (p) { return { value: p.id, label: p.name }; }),
            onChange: function (v) { personId = v; build(); } }) : h('span', { class: 'text-short' }, X.noPeople)),
          field(X.fromMonth, monthSelect(fromKey, function (v) { fromKey = v; build(); })));
        wrap.appendChild(fields);
        var g = gap();
        if (g) {
          wrap.appendChild(h('p', { class: 'tr-dlg-warn' }, fill(X.gap, { from: F.date(g.from), to: F.date(g.to), name: g.person.name, month: F.date(g.person.endMonth) })));
          if (g.backFrom <= g.to && personId) {
            var box = h('input', { type: 'checkbox', checked: backdate, class: 'tr-dlg-backdate', onChange: function (e) { backdate = e.target.checked; } });
            wrap.appendChild(h('label', { class: 'tr-dlg-check' }, box, fill(X.backdate, { name: C.personName(d.salespeople, personId), month: F.date(g.backFrom) })));
            wrap.appendChild(h('p', { class: 'tr-hint' }, X.backdateNote));
          }
        }
        wrap.appendChild(h('p', { class: 'tr-hint' }, X.note));
        wrap.appendChild(err);
      }
      build();
      function ask() {
        return C.dialog({ title: fill(X.title, { name: t.name }), confirmLabel: X.confirm, wide: true, body: wrap }).then(function (r) {
          if (!r.ok || !personId) return;
          if (personId === calc.ownerOf(d.assignments, d.salespeople, tid, fromKey)) { err.textContent = X.same; err.hidden = false; return ask(); }
          var g = gap();
          var start = backdate && g && g.backFrom <= g.to ? g.backFrom : fromKey;
          var res = calc.setOwner(draft.assignments, tid, personId, start, null, nowKey);
          if (!res.ok) { err.textContent = X.errors[res.error] || X.errors.range; err.hidden = false; return ask(); }
          draft.assignments = res.list;
          draw();
        });
      }
      ask();
    }

    function provincesDialog(tid) {
      var X = page.provinces;
      var d = dataOf(draft);
      var t = terr(d, tid);
      var chosen = (draft.provinceSuggestions[tid] || []).slice();
      var all = {};
      Object.keys(d.provinceSuggestions).forEach(function (k) { (d.provinceSuggestions[k] || []).forEach(function (p) { all[p] = true; }); });
      d.stores.forEach(function (s) { S.provincesOf(s).forEach(function (p) { all[p] = true; }); });
      var names = Object.keys(all).sort(thai);
      var search = h('input', { type: 'search', class: 'ss-search', placeholder: X.search, 'aria-label': X.search });
      var count = h('p', { class: 'tr-hint' });
      var list = h('ul', { class: 'tr-prov-list' });
      function others(p) {
        return terrs(d).filter(function (x) { return x.id !== tid && (d.provinceSuggestions[x.id] || []).indexOf(p) >= 0; }).map(shortName);
      }
      function renderList() {
        var q = search.value.trim();
        C.clear(list);
        names.filter(function (p) { return !q || p.indexOf(q) >= 0; }).forEach(function (p) {
          var box = h('input', { type: 'checkbox', checked: chosen.indexOf(p) >= 0, 'aria-label': p, onChange: function (e) {
            chosen = chosen.filter(function (x) { return x !== p; });
            if (e.target.checked) chosen.push(p);
            count.textContent = fill(X.count, { n: chosen.length });
          } });
          var o = others(p);
          list.appendChild(h('li', null, h('label', { class: 'series-option' }, box, h('span', { class: 'series-name' }, p),
            o.length ? h('span', { class: 'tr-prov-also' }, fill(X.also, { names: o.join(', ') })) : null)));
        });
        count.textContent = fill(X.count, { n: chosen.length });
      }
      search.addEventListener('input', renderList);
      renderList();
      C.dialog({ title: fill(X.title, { name: t.name }), confirmLabel: X.confirm, wide: true,
        body: h('div', { class: 'tr-dlg' }, h('p', { class: 'dlg-text' }, X.hint), search, count, list) }).then(function (r) {
        if (!r.ok) return;
        draft.provinceSuggestions = clone(draft.provinceSuggestions);
        draft.provinceSuggestions[tid] = names.filter(function (p) { return chosen.indexOf(p) >= 0; });
        draw();
      });
    }

    function validName(tid) {
      var R = page.rename;
      return function (v) {
        if (!v) return R.empty;
        var dup = draft.territories.some(function (x) { return x.id !== tid && String(x.name).trim().toLowerCase() === v.toLowerCase(); });
        return dup ? R.duplicate : null;
      };
    }
    function renameTerritory(tid) {
      var t = calc.findById(draft.territories, tid);
      C.promptText({ title: page.rename.title, label: page.rename.label, value: t.name, validate: validName(tid) }).then(function (r) {
        if (!r.ok || r.value === t.name) return;
        t.name = r.value;
        draw();
      });
    }
    function addTerritory() {
      C.promptText({ title: page.add.title, label: page.add.label, hint: page.add.hint, validate: validName(null) }).then(function (r) {
        if (!r.ok) return;
        var id = S.nextTerritoryId(dataOf(draft), channel.id);
        draft.territories.push({ id: id, channelId: channel.id, name: r.value, active: true });
        draft.provinceSuggestions = clone(draft.provinceSuggestions);
        draft.provinceSuggestions[id] = [];
        panelSel = id;
        draw();
      });
    }
    function setActive(tid, on) {
      var t = calc.findById(draft.territories, tid);
      t.active = on;
      draw();
    }
    function confirmDeactivate(tid) {
      var t = calc.findById(draft.territories, tid);
      C.dialog({ title: fill(page.deactivate.title, { name: t.name }), lines: page.deactivate.lines, confirmLabel: page.panel.deactivate, danger: true })
        .then(function (r) { if (r.ok) setActive(tid, false); });
    }

    // =====================================================================
    // Drawer ข้อมูลร้าน + Timeline 12 เดือน
    // =====================================================================
    var drawerCtl = C.drawer({ label: page.drawer.label, className: 'tr-drawer', onClose: function () { drawerStore = null; } });
    function drawDrawer() {
      var R = page.drawer;
      var d = data();
      var s = calc.findById(d.stores, drawerStore);
      if (!s) { drawerCtl.close(); return; }
      var P = activeSuggestions(d);
      var t = S.territoryOf(d, s.id, month);
      var sug = S.suggestTerritory(s, P);
      C.clear(drawerCtl.head);
      C.clear(drawerCtl.body);
      drawerCtl.head.appendChild(h('div', { class: 'tr-d-head' },
        h('h2', { class: 'tr-d-title' }, s.name, s.masked ? C.privacyMark(page.tips.masked) : null),
        h('div', { class: 'tr-d-meta' }, h('span', null, s.systemId),
          s.duplicates > 1 ? h('span', { class: 'badge tag-warn', title: fill(page.tips.duplicateTip, { n: s.duplicates }) }, page.tips.duplicate) : null,
          h('span', { class: 'badge ' + (s.active !== false ? 'tag-ok' : 'tag-muted') }, s.active !== false ? page.status.active : page.status.cancelled))));
      function row(label, value) { return h('div', { class: 'tr-d-field' }, h('span', { class: 'tr-d-label' }, label), h('span', { class: 'tr-d-value' }, value)); }
      var Fd = R.fields;
      var outside = !!t && S.outOfProvince(s, t, P);
      drawerCtl.body.appendChild(h('section', { class: 'tr-d-section' }, h('h3', null, R.info),
        h('div', { class: 'tr-d-grid' },
          row(Fd.id, s.systemId), row(Fd.storeType, s.storeType || '–'), row(Fd.tags, (s.tags || []).join(', ') || '–'), row(Fd.priceType, s.priceType || '–'),
          row(Fd.province, [s.province ? s.province.split(',').join(', ') : '–', outside ? h('span', { class: 'badge tag-warn tr-outside', title: fill(page.tips.outsideTip, { territory: terr(d, t).name }) }, page.tips.outside) : null]),
          row(Fd.channels, [s.hasExport ? page.filters.channelOptions.export : null, s.hasOnline ? page.filters.channelOptions.online : null].filter(Boolean).join(' · ') || '–'),
          row(fill(Fd.territory, { month: F.date(month) }), t ? terr(d, t).name + ' · ' + ownerName(d, t, month) : page.unassignedCell),
          row(Fd.suggested, sug ? terr(d, sug).name : '–'),
          row(Fd.salesRef, F.baht(s.salesRef || 0)))));
      // Timeline
      var years = [];
      months.forEach(function (k) { var y = Number(k.slice(0, 4)); if (years.indexOf(y) < 0) years.push(y); });
      var y = drawerYear || Number(month.slice(0, 4));
      var line = S.timeline(d, s.id, y);
      var refM = S.storeMonthly(d, s);
      function segments(fn) {
        var out = [];
        for (var m = 0; m < 12; m++) {
          var v = fn(m), last = out[out.length - 1];
          if (last && last.key === v.key) last.span++; else out.push({ key: v.key, text: v.text, title: v.title, cls: v.cls, style: v.style, span: 1 });
        }
        return out;
      }
      var terrSegs = segments(function (m) {
        var id = line[m];
        return { key: id || '', text: id ? shortName(terr(d, id)) : R.none, title: id ? terr(d, id).name : page.unassignedCell, cls: id ? null : 'is-empty' };
      });
      var ownerSegs = segments(function (m) {
        var id = line[m];
        var key = calc.monthKey(y, m);
        var pid = id ? calc.ownerOf(d.assignments, d.salespeople, id, key) : null;
        if (!id) return { key: '', text: R.none, cls: 'is-empty' };
        if (!pid) return { key: 'vacant', text: R.vacant, title: page.panel.noOwner, cls: 'owner-seg is-vacant' };
        var name = C.personName(d.salespeople, pid);
        return { key: pid, text: firstName(name), title: name, style: { '--seg': C.tokenVar(C.personColor(d.salespeople, pid)) }, cls: 'owner-seg' };
      });
      function cellsOf(segs, cls) {
        return segs.map(function (g) {
          var style = { gridColumn: 'span ' + g.span };
          Object.keys(g.style || {}).forEach(function (k) { style[k] = g.style[k]; });
          return h('div', { class: 'tr-tl-seg ' + cls + ' ' + (g.cls || ''), style: style, title: g.title || g.text }, h('span', null, g.text));
        });
      }
      var yi = years.indexOf(y);
      drawerCtl.body.appendChild(h('section', { class: 'tr-d-section' },
        h('div', { class: 'tr-d-hist-head' }, h('h3', null, R.history + ' ' + y),
          h('span', { class: 'tr-d-years' },
            h('button', { type: 'button', class: 'icon-btn', disabled: yi <= 0, title: R.prevYear, 'aria-label': R.prevYear, onClick: function () { drawerYear = years[yi - 1]; drawDrawer(); } }, '‹'),
            h('button', { type: 'button', class: 'icon-btn', disabled: yi < 0 || yi >= years.length - 1, title: R.nextYear, 'aria-label': R.nextYear, onClick: function () { drawerYear = years[yi + 1]; drawDrawer(); } }, '›'))),
        h('div', { class: 'tr-tl' },
          h('span', { class: 'tr-tl-label' }), F.MONTHS.map(function (n, m) { return h('span', { class: 'tr-tl-month' + (calc.monthKey(y, m) === month ? ' is-current' : '') }, n); }),
          h('span', { class: 'tr-tl-label' }, R.rows.territory), h('div', { class: 'tr-tl-row' }, cellsOf(terrSegs, 'is-territory')),
          h('span', { class: 'tr-tl-label' }, R.rows.owner), h('div', { class: 'tr-tl-row' }, cellsOf(ownerSegs, 'is-owner')),
          h('span', { class: 'tr-tl-label' }, R.rows.ref), refM.map(function (v) { return h('span', { class: 'tr-tl-ref num' }, F.number(v)); })),
        h('p', { class: 'tr-hint' }, fill(R.refNote, { channel: channel.name }))));
    }

    // =====================================================================
    // ส่งออก (ตารางตามตัวกรองที่แสดง)
    // =====================================================================
    function exportSpec(source) {
      var Cl = page.columns, X = SP.data.content.labels.exporting, E = page.exportHeader;
      var d = dataOf(source === 'draft' && editing ? draft : saved);
      var mem = S.membership(d, month);
      var P = activeSuggestions(d);
      var rows = rowsOf(d, mem);
      var name = function (id) { var t = terr(d, id); return t ? t.name : ''; };
      var chipText = [];
      if (filters.q.trim()) chipText.push(filters.q.trim());
      ['storeType', 'priceType', 'province', 'channels', 'data'].forEach(function (k) { if (filters[k].length) chipText.push(page.filters[k] + ': ' + filters[k].join(', ')); });
      chipText.push(page.filters.status + ': ' + page.filters.statusOptions[filters.status]);
      var view = panelSel === 'all' || panelSel === 'unassigned' ? page.tableTitle[panelSel] : fill(page.tableTitle.territory, { name: name(panelSel) });
      var columns = [
        { key: 'id', label: Cl.id, value: function (s) { return s.systemId; }, width: 10 },
        { key: 'name', label: Cl.name, width: 36 },
        { key: 'storeType', label: Cl.storeType, value: function (s) { return s.storeType || ''; }, width: 20 },
        { key: 'priceType', label: Cl.priceType, value: function (s) { return s.priceType || ''; }, width: 12 },
        { key: 'province', label: Cl.province, value: function (s) { return s.province || ''; }, width: 16 },
        { key: 'export', label: Cl.export, value: function (s) { return s.hasExport ? page.exportColumns.yes : ''; }, width: 8 },
        { key: 'online', label: Cl.online, value: function (s) { return s.hasOnline ? page.exportColumns.yes : ''; }, width: 8 },
        { key: 'status', label: Cl.status, value: function (s) { return s.active !== false ? page.status.active : page.status.cancelled; }, width: 12 },
        { key: 'salesRef', label: Cl.salesRef, type: 'money', value: function (s) { return s.salesRef || 0; }, width: 16 },
        { key: 'territory', label: Cl.territory, value: function (s) { return mem[s.id] ? name(mem[s.id]) : page.unassignedCell; }, width: 30 },
        { key: 'owner', label: Cl.owner, value: function (s) { return mem[s.id] ? ownerName(d, mem[s.id], month) : ''; }, width: 20 },
        { key: 'suggested', label: Cl.suggested, value: function (s) { var g = S.suggestTerritory(s, P); return g ? name(g) : ''; }, width: 30 },
        { key: 'outside', label: page.exportColumns.outside, value: function (s) { return mem[s.id] && S.outOfProvince(s, mem[s.id], P) ? page.exportColumns.yes : ''; }, width: 12 }
      ];
      var st = C.exportStamp('draft');
      return {
        filename: fill(page.exportFile, { channel: C.fileSafe(channel.name), month: month, date: st.date }),
        sheets: [{
          name: page.exportSheet,
          header: [[E.month, F.date(month)], [E.view, view], [E.filters, chipText.join(' · ') || E.noFilters], [X.headerAt, F.dateTime(new Date().toISOString())], [X.headerRole, roleName()]],
          columns: columns, rows: rows
        }]
      };
    }

    draw();
  }

  SP.modules.territories = { render: render };
})(window.SP);
