/*
 * modules/taxonomy/taxonomy.js — หมวดสินค้าและ Series (Product Master) — CR-15 มุมมองแบบคอลัมน์
 *
 * หน้าที่:        แท็บ หมวดสินค้า | Series | ตารางไขว้ (จำแท็บและรายการที่เลือกที่ ui.taxonomySelection)
 *                 แถบตัวกรอง (ใช้ร่วมกันทั้ง 3 แท็บ จำที่ ui.taxonomyFilters): ค้นหาชื่อ (ผลลัพธ์พร้อมเส้นทาง) · Category → Sub Category ·
 *                 Series → Sub Series (components.categoryFilter) · สถานะ · ข้อมูล + Chip ตัวกรองที่ใช้อยู่ (components.filterChips)
 *                 หมวดสินค้า / Series: คอลัมน์ต่อระดับ (Category · Sub Category · Type | Series · Sub Series) เลื่อนภายในคอลัมน์ +
 *                 แผงรายละเอียด (จอแคบกว่า 1280px = Drawer ด้านขวา) / คีย์บอร์ด ↑↓ ← → F2
 *                 ตัวกรองข้ามมิติ = นับเฉพาะ SKU ที่ตรง (x / y) ซ่อนรายการที่ได้ 0 / ตารางไขว้ Series × หมวดสินค้า (อ่านอย่างเดียว กดช่อง = รายการสินค้า)
 *                 เปิดมาเป็นโหมดดู / แก้ไข (ทีม Product, workflowBar แบบง่าย): เพิ่ม (แถวใหม่ช่องว่าง) · เปลี่ยนชื่อในแถว · ลากจัดลำดับ
 *                 ภายในรายการแม่เดียวกัน · แผงรายละเอียด: ย้ายไปอยู่ใต้… · ย้าย SKU ไป… · รวมกับ… · เปิด/ปิดใช้งาน · ลบ (เฉพาะไม่มี SKU
 *                 และไม่มีรายการย่อย) · วันเริ่ม / วันสิ้นสุดของ Series → บันทึก / ยกเลิก (แก้สำเนา ไม่เขียน store จนกดบันทึก)
 *                 กฎทั้งหมดจาก core/taxonomy.js (Pure functions)
 * อ่านจาก data/:  settings (TAXONOMY_SKU_LIST_MAX), content (pages.taxonomy, labels) + Master ผ่าน store (taxonomy, products)
 * store อ่าน:     master.taxonomy, master.products, ui.taxonomySelection, ui.taxonomyFilters, ui.role, ui.currentMonth
 * store เขียน:    master.taxonomy, master.products และ master.audit (ตอนกด บันทึก) / ui.taxonomySelection, ui.taxonomyFilters /
 *                 ui.productFilterHandoff (ก่อนเปิดหน้ารายการสินค้าที่กรองตามรายการนั้น — หน้ารายการสินค้าอ่านแล้วลบ)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var calc = SP.core.calc;
  var store = SP.core.store;
  var h = C.h;
  var fill = C.fill;

  var TABS = ['category', 'series', 'cross'];
  var DEFAULT_FILTERS = { category: [], subCategory: [], series: [], subSeries: [], status: 'active', data: 'all', showZero: false };
  var ID_PREFIX = { CATEGORY: 'cat-', SUB_CATEGORY: 'sub-', TYPE: 'type-', SERIES: 'ser-', SUB_SERIES: 'subser-' };

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var X = L.taxonomy;
    var T = SP.core.taxonomy;
    var today = store.today();
    var saved = { tax: store.get('master.taxonomy'), products: store.get('master.products') };
    var draft = null;
    var editing = false;
    var sel = normalizeSel(store.get('ui.taxonomySelection'));
    var filters = normalizeFilters(store.get('ui.taxonomyFilters'));
    // ui ชั่วคราวของหน้า: แถวที่กำลังเปลี่ยนชื่อ / แถวใหม่ / ข้อความผิดพลาดของช่องกรอก / ค้นหา / Drawer / รายการที่ต้องโฟกัส / ตารางไขว้ที่กาง / ลาก
    var ui = { rename: null, adding: null, error: null, q: '', detailOpen: false, focus: null, open: { rows: {}, cols: {} }, drag: null };

    function normalizeSel(s) {
      s = s || {};
      return { tab: TABS.indexOf(s.tab) >= 0 ? s.tab : 'category', category: (s.category || []).slice(), series: (s.series || []).slice() };
    }
    function normalizeFilters(f) {
      var out = clone(DEFAULT_FILTERS);
      Object.keys(out).forEach(function (k) { if (f && f[k] != null) out[k] = clone(f[k]); });
      return out;
    }
    function persistSel() { store.set('ui.taxonomySelection', sel); }
    function persistFilters() { store.set('ui.taxonomyFilters', filters); }
    function cur() { return editing ? draft : saved; }
    function tabKind() { return sel.tab === 'series' ? 'series' : 'category'; }
    function levelName(level) { return X.levels[level]; }
    function filterArgs() { return { category: filters.category, subCategory: filters.subCategory, series: filters.series, subSeries: filters.subSeries, status: filters.status, data: filters.data, showZero: filters.showZero }; }
    function anyFilter() {
      return filters.category.length || filters.subCategory.length || filters.series.length || filters.subSeries.length || filters.status !== 'active' || filters.data !== 'all';
    }

    // ---------- สิ่งที่ยังไม่บันทึก ----------
    function nodeDirty(kind, id) {
      if (!editing) return false;
      var a = byId(draft.tax[kind], id), b = byId(saved.tax[kind], id);
      return !b || JSON.stringify(a) !== JSON.stringify(b);
    }
    function diffCount() {
      if (!editing) return 0;
      var n = 0;
      ['category', 'series'].forEach(function (k) {
        draft.tax[k].forEach(function (d) { if (nodeDirty(k, d.id)) n++; });
        n += saved.tax[k].filter(function (o) { return !byId(draft.tax[k], o.id); }).length;
      });
      draft.products.forEach(function (p) {
        var o = calc.findProduct(saved.products, calc.productKey(p));
        if (o && JSON.stringify(o) !== JSON.stringify(p)) n++;
      });
      return n;
    }
    C.guardUnsaved(diffCount);

    var bar = C.workflowBar({
      simple: true,
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); ui.rename = ui.adding = ui.error = null; draw(); },
      onSave: save,
      onCancel: function () { editing = false; draft = null; ui.rename = ui.adding = ui.error = null; draw(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    function save() {
      var by = C.roleName(store.role()), at = new Date().toISOString();
      var entries = [];
      ['category', 'series'].forEach(function (k) {
        draft.tax[k].forEach(function (d) { if (nodeDirty(k, d.id)) entries = entries.concat(calc.auditDiff('taxonomy', d.id, byId(saved.tax[k], d.id), d, { by: by, at: at })); });
        saved.tax[k].forEach(function (o) { if (!byId(draft.tax[k], o.id)) entries = entries.concat(calc.auditDiff('taxonomy', o.id, o, null, { by: by, at: at })); });
      });
      draft.products.forEach(function (p) {
        var key = calc.productKey(p);
        var o = calc.findProduct(saved.products, key);
        if (!o || JSON.stringify(o) === JSON.stringify(p)) return;
        p.updatedAt = at;
        entries = entries.concat(calc.auditDiff('product', key, o, p, { by: by, at: at }));
      });
      store.set('master.taxonomy', draft.tax);
      store.set('master.products', draft.products);
      store.appendAudit(entries);
      saved = clone(draft);
      draft = null;
      editing = false;
      ui.rename = ui.adding = ui.error = null;
      draw();
    }

    // ---------- เปิดหน้ารายการสินค้าที่กรองแล้ว (หน้ารายการสินค้าอ่าน ui.productFilterHandoff ครั้งเดียวแล้วลบ) ----------
    function openProducts(handoff) {
      if (diffCount() && !C.confirmDiscard(diffCount())) return;
      C.guardUnsaved(null);
      store.set('ui.productFilterHandoff', handoff);
      location.href = SP.core.paths.to(SP.core.registry.byId('productList').path);
    }

    // =====================================================================
    function draw() {
      var active = document.activeElement;
      var searchFocused = active && active.classList && active.classList.contains('tx-search');
      C.clear(root);
      bar.update();
      var tax = cur().tax, products = cur().products;
      root.appendChild(h('div', { class: 'tool-row tx-tabs' }, C.segmented({
        label: page.tabLabel, value: sel.tab,
        options: TABS.map(function (k) { return { value: k, label: page.tabs[k] }; }),
        onChange: function (v) { sel.tab = v; persistSel(); ui.rename = ui.adding = ui.error = null; draw(); }
      })));
      if (editing) { var banner = C.editBanner(); root.appendChild(banner); banner.update(diffCount()); }
      root.appendChild(filterBar(tax, products));
      var chips = chipsOf(tax);
      if (chips) root.appendChild(chips);
      root.appendChild(h('div', { class: 'card fit-card tx-card' }, sel.tab === 'cross' ? crossView(tax, products) : columnsView(tax, products)));
      // โฟกัสหลังวาดใหม่: ช่องกรอก (เพิ่ม / เปลี่ยนชื่อ) → รายการที่เลือก → ช่องค้นหา
      var inp = root.querySelector('.tx-input');
      if (inp) { inp.focus(); if (ui.rename) inp.select(); }
      else if (ui.focus) { var el = root.querySelector('.tx-item[data-id="' + ui.focus + '"]'); if (el) el.focus(); }
      else if (searchFocused) { var s = root.querySelector('.tx-search'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }
      ui.focus = null;
    }

    // ---------- แถบตัวกรอง ----------
    function filterBar(tax, products) {
      var catF = C.categoryFilter({
        tax: tax, kind: 'category', levels: ['CATEGORY', 'SUB_CATEGORY'], value: { CATEGORY: filters.category, SUB_CATEGORY: filters.subCategory },
        onChange: function (v) { filters.category = v.CATEGORY || []; filters.subCategory = v.SUB_CATEGORY || []; persistFilters(); draw(); }
      });
      var serF = C.categoryFilter({
        tax: tax, kind: 'series', levels: ['SERIES', 'SUB_SERIES'], value: { SERIES: filters.series, SUB_SERIES: filters.subSeries },
        onChange: function (v) { filters.series = v.SERIES || []; filters.subSeries = v.SUB_SERIES || []; persistFilters(); draw(); }
      });
      function sel2(label, key, keys, texts) {
        return h('label', { class: 'tx-sel' }, h('span', { class: 'field-label' }, label), C.select({
          label: label, value: filters[key], className: 'tx-select',
          options: keys.map(function (k) { return { value: k, label: texts[k] }; }),
          onChange: function (v) { filters[key] = v; persistFilters(); draw(); }
        }));
      }
      var kind = tabKind();
      var crossActive = sel.tab !== 'cross' && (kind === 'category' ? filters.series.length || filters.subSeries.length : filters.category.length || filters.subCategory.length);
      return h('div', { class: 'tool-row tx-filters' },
        searchBox(tax),
        catF, serF,
        sel2(page.status.label, 'status', ['active', 'inactive', 'all'], page.status),
        sel2(page.data.label, 'data', ['all', 'noSku', 'dupParent', 'expired'], page.data),
        crossActive ? h('label', { class: 'tx-check' }, h('input', { type: 'checkbox', checked: filters.showZero, onChange: function (e) { filters.showZero = e.target.checked; persistFilters(); draw(); } }), page.showZero) : null,
        anyFilter() ? h('button', { type: 'button', class: 'link-btn tx-clear', onClick: clearFilters }, X.filter.clearAll) : null);
    }
    function clearFilters() { filters = clone(DEFAULT_FILTERS); persistFilters(); draw(); }

    // ค้นหาชื่อทุกระดับทั้งสองมิติ ผลลัพธ์พร้อมเส้นทาง คลิก → เลือกรายการนั้นในคอลัมน์ (เปลี่ยนแท็บตามมิติ)
    function searchBox(tax) {
      var input = h('input', { type: 'search', class: 'search-input tx-search', placeholder: page.searchPlaceholder, 'aria-label': page.searchPlaceholder, value: ui.q, autocomplete: 'off' });
      var panel = h('ul', { class: 'tx-search-results', role: 'listbox', hidden: true });
      function results() { return T.search(tax, input.value).slice(0, 40); }
      function show() {
        C.clear(panel);
        if (!input.value.trim()) { panel.hidden = true; return; }
        var res = results();
        panel.hidden = false;
        if (!res.length) { panel.appendChild(h('li', { class: 'tx-search-empty' }, page.searchEmpty)); return; }
        res.forEach(function (r) {
          panel.appendChild(h('li', { role: 'option' }, h('button', {
            type: 'button', class: 'tx-search-item', onMousedown: function (e) { e.preventDefault(); pick(r); }
          }, h('span', { class: 'tx-search-name' }, r.node.name), h('span', { class: 'tx-search-path' }, page.dims[r.kind] + ' · ' + r.path.join(' › ')))));
        });
      }
      function pick(r) {
        ui.q = '';
        sel.tab = r.kind;
        sel[r.kind] = T.pathOf(tax, r.kind, r.node.id).map(function (n) { return n.id; });
        // รายการที่ตัวกรองซ่อนอยู่ → ล้างตัวกรองให้เห็นรายการที่ค้นพบ
        if (!T.filterTree(tax, r.kind, filterArgs(), cur().products, today).show[r.node.id]) {
          filters = clone(DEFAULT_FILTERS);
          if (r.node.active === false) filters.status = 'all';
          persistFilters();
        }
        persistSel();
        ui.detailOpen = true;
        ui.focus = r.node.id;
        draw();
      }
      input.addEventListener('input', function () { ui.q = input.value; show(); });
      input.addEventListener('focus', show);
      input.addEventListener('blur', function () { setTimeout(function () { panel.hidden = true; }, 150); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { input.value = ''; ui.q = ''; panel.hidden = true; }
        if (e.key === 'Enter') { var res = results(); if (res.length) pick(res[0]); }
      });
      if (ui.q) setTimeout(show, 0);
      return h('div', { class: 'tx-search-wrap' }, input, panel);
    }

    // Chip ของตัวกรองที่ใช้อยู่ (กด × เอาออก) + ล้างตัวกรอง
    function chipsOf(tax) {
      var items = [];
      function add(key, kind, level) {
        filters[key].forEach(function (id) {
          var n = T.find(tax, kind, id);
          items.push({ label: levelName(level) + ': ' + (n ? n.name : id), onRemove: function () { filters[key] = filters[key].filter(function (x) { return x !== id; }); persistFilters(); draw(); } });
        });
      }
      add('category', 'category', 'CATEGORY');
      add('subCategory', 'category', 'SUB_CATEGORY');
      add('series', 'series', 'SERIES');
      add('subSeries', 'series', 'SUB_SERIES');
      if (filters.status !== 'active') items.push({ label: fill(page.chipStatus, { v: page.status[filters.status] }), onRemove: function () { filters.status = 'active'; persistFilters(); draw(); } });
      if (filters.data !== 'all') items.push({ label: fill(page.chipData, { v: page.data[filters.data] }), onRemove: function () { filters.data = 'all'; persistFilters(); draw(); } });
      return C.filterChips(items, clearFilters);
    }

    // =====================================================================
    // มุมมองแบบคอลัมน์ (หมวดสินค้า 3 ระดับ | Series 2 ระดับ) + แผงรายละเอียด
    // =====================================================================
    function columnsView(tax, products) {
      var kind = tabKind();
      var levels = T.LEVELS[kind];
      var ft = T.filterTree(tax, kind, filterArgs(), products, today);
      // เส้นทางที่เลือก: ตัดรายการที่ไม่มีแล้ว ไม่แสดงตามตัวกรอง หรือไม่ต่อเนื่องออก
      var path = [];
      (sel[kind] || []).some(function (id, i) {
        var n = T.find(tax, kind, id);
        if (!n || !ft.show[id] || (n.parentId || null) !== (i ? path[i - 1] : null)) return true;
        path.push(id);
        return false;
      });
      sel[kind] = path;
      var note = ft.cross ? crossNote(kind, tax) : null;
      var wrap = h('div', { class: 'tx-browser tx-' + kind });
      levels.forEach(function (level, i) { wrap.appendChild(column(kind, level, i, path, tax, products, ft, i === 0 ? note : null)); });
      wrap.appendChild(detailPanel(kind, path[path.length - 1] || null, tax, products, ft));
      return wrap;
    }

    function crossNote(kind, tax) {
      var other = kind === 'category' ? 'series' : 'category';
      var ids = other === 'series' ? filters.series.concat(filters.subSeries) : filters.category.concat(filters.subCategory);
      var names = ids.map(function (id) { var n = T.find(tax, other, id); return n ? n.name : null; }).filter(Boolean);
      return fill(page.crossNote, { dim: page.dims[other], names: names.join(', ') });
    }

    function select(kind, i, id, path) {
      sel[kind] = path.slice(0, i).concat([id]);
      persistSel();
      ui.detailOpen = true;
      ui.focus = id;
      if (ui.rename && ui.rename.id !== id) ui.rename = null;
      draw();
    }

    function column(kind, level, i, path, tax, products, ft, note) {
      var levels = T.LEVELS[kind];
      var parentId = i ? path[i - 1] || null : null;
      var needParent = i > 0 && !parentId;
      var items = needParent ? [] : T.children(tax, kind, parentId).filter(function (n) { return ft.show[n.id]; });
      var hasNext = i < levels.length - 1;
      var ul = h('ul', { class: 'tx-list', role: 'listbox', 'aria-label': levelName(level) });
      items.forEach(function (n) { ul.appendChild(item(kind, n, i, path, tax, products, ft, hasNext, items)); });
      var adding = editing && ui.adding && ui.adding.kind === kind && ui.adding.i === i;
      if (adding) ul.appendChild(inputRow(kind, level, '', function (v) { return commitAdd(kind, level, i, parentId, path, v); }));
      if (!items.length && !adding) {
        ul.appendChild(h('li', { class: 'tx-empty' }, needParent ? fill(page.pickParent, { level: levelName(levels[i - 1]) })
          : anyFilter() ? page.emptyFiltered : page.emptyColumn));
      }
      ul.addEventListener('keydown', function (e) { keyNav(e, kind, i, path, tax, ft, items); });
      var foot = editing ? h('div', { class: 'tx-col-foot' }, h('button', {
        type: 'button', class: 'btn btn-ghost btn-sm tx-add', dataset: { level: level }, disabled: needParent,
        title: needParent ? fill(page.addDisabled, { level: levelName(levels[i - 1]) }) : null,
        onClick: function () { ui.adding = { kind: kind, i: i }; ui.rename = null; ui.error = null; draw(); }
      }, fill(page.add, { level: levelName(level) }))) : null;
      return h('section', { class: 'tx-col', dataset: { level: level } },
        h('div', { class: 'tx-col-head' },
          h('span', { class: 'tx-col-title' }, fill(page.columnHead, { level: levelName(level), n: items.length })),
          note ? h('span', { class: 'tx-col-note', title: note }, note) : null),
        h('div', { class: 'tx-col-scroll' }, ul),
        foot);
    }

    function warningsOf(kind, n, tax, count) {
      var out = [];
      var parent = n.parentId ? T.find(tax, kind, n.parentId) : null;
      if (parent && T.norm(parent.name) === T.norm(n.name)) out.push(fill(page.warn.dupParent, { parent: parent.name }));
      if (!count.total) out.push(page.warn.noSku);
      if (kind === 'series' && T.seriesEnded(n, today)) out.push(fill(page.warn.expired, { date: SP.core.format.date(n.endDate) }));
      var twin = T.children(tax, kind, n.id).filter(function (k) { return T.norm(k.name) === T.norm(n.name); })[0];
      if (twin) out.push(fill(page.warn.childDup, { name: twin.name }));
      return out;
    }

    function item(kind, n, i, path, tax, products, ft, hasNext, siblings) {
      if (editing && ui.rename && ui.rename.kind === kind && ui.rename.id === n.id) {
        return inputRow(kind, n.level, n.name, function (v) { return commitRename(kind, n, v); });
      }
      var c = ft.count[n.id];
      var kids = T.children(tax, kind, n.id).length;
      var warns = warningsOf(kind, n, tax, c).filter(function (w) { return w.indexOf(page.warn.expired.split(' (')[0]) < 0; });
      var here = path[i] === n.id;
      var last = here && path.length === i + 1;
      var li = h('li', {
        class: 'tx-item' + (here ? (last ? ' is-selected' : ' is-path') : '') + (n.active === false ? ' is-inactive' : '') + (ft.match[n.id] ? '' : ' is-context'),
        role: 'option', 'aria-selected': last ? 'true' : 'false', tabindex: here || (!path[i] && siblings[0] === n) ? '0' : '-1', dataset: { id: n.id },
        title: editing ? page.renameTip : null, draggable: editing ? 'true' : null
      },
        editing ? h('span', { class: 'tx-drag', title: page.dragTip, 'aria-hidden': 'true' }, '⋮⋮') : null,
        h('span', { class: 'tx-name' }, n.name),
        nodeDirty(kind, n.id) ? h('span', { class: 'tx-dirty', title: page.dirtyTip, 'aria-label': page.dirtyTip }) : null,
        warns.length ? h('span', { class: 'tx-warn', title: warns.join(' · '), 'aria-label': warns.join(' · ') }, '⚠') : null,
        n.active === false ? h('span', { class: 'badge tag-muted tx-tag' }, page.inactiveTag) : null,
        kind === 'series' && T.seriesEnded(n, today) ? h('span', { class: 'badge tag-warn tx-tag' }, page.endedTag) : null,
        h('span', { class: 'tx-count', title: ft.cross ? fill(page.countTip, { x: c.filtered, y: c.total }) : fill(page.countTipAll, { n: c.total }) },
          ft.cross ? c.filtered + ' / ' + c.total : String(c.total)),
        hasNext ? h('span', { class: 'tx-chev', 'aria-hidden': 'true' }, kids ? '›' : '') : null);
      li.addEventListener('click', function () { select(kind, i, n.id, path); });
      if (editing) {
        li.addEventListener('dblclick', function () { startRename(kind, n.id); });
        // ลากจัดลำดับ: วางได้เฉพาะรายการที่มีรายการแม่เดียวกัน (core/taxonomy.reorderNode ไม่ยอมรับข้ามรายการแม่)
        li.addEventListener('dragstart', function (e) { ui.drag = { kind: kind, id: n.id, parentId: n.parentId || null }; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', n.id); } catch (x) { /* ignore */ } });
        li.addEventListener('dragend', function () { ui.drag = null; clearDrop(); });
        li.addEventListener('dragover', function (e) {
          var d = ui.drag;
          if (!d || d.kind !== kind || d.id === n.id || d.parentId !== (n.parentId || null)) return;
          e.preventDefault();
          var r = li.getBoundingClientRect();
          clearDrop();
          li.classList.add(e.clientY > r.top + r.height / 2 ? 'drop-after' : 'drop-before');
        });
        li.addEventListener('dragleave', function () { li.classList.remove('drop-before', 'drop-after'); });
        li.addEventListener('drop', function (e) {
          var d = ui.drag;
          if (!d) return;
          e.preventDefault();
          var after = li.classList.contains('drop-after');
          var res = T.reorderNode(draft.tax, kind, d.id, n.id, after);
          ui.drag = null;
          if (res.ok) { draft.tax = res.taxonomy; ui.focus = d.id; }
          draw();
        });
      }
      return li;
    }
    function clearDrop() { Array.prototype.forEach.call(root.querySelectorAll('.drop-before, .drop-after'), function (x) { x.classList.remove('drop-before', 'drop-after'); }); }

    // แถวช่องกรอก (เพิ่ม / เปลี่ยนชื่อ): Enter = บันทึก · Esc = ยกเลิก · ไม่มีชื่อตั้งต้น (Placeholder = ชื่อระดับ)
    function inputRow(kind, level, value, commit) {
      var input = h('input', { type: 'text', class: 'tx-input', value: value, placeholder: fill(page.placeholder, { level: levelName(level) }), 'aria-label': fill(page.placeholder, { level: levelName(level) }) });
      function cancel() { ui.adding = null; ui.rename = null; ui.error = null; draw(); }
      input.addEventListener('keydown', function (e) {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); commit(input.value); }
        else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      });
      input.addEventListener('blur', function () {
        setTimeout(function () {
          if (!input.isConnected) return;
          if (!input.value.trim() || input.value.trim() === value) cancel();
        }, 120);
      });
      return h('li', { class: 'tx-item is-input' }, h('span', { class: 'tx-input-wrap' }, input,
        ui.error ? h('span', { class: 'tx-input-error', role: 'alert' }, ui.error) : null));
    }
    function startRename(kind, id) { if (!editing) return; ui.rename = { kind: kind, id: id }; ui.adding = null; ui.error = null; draw(); }
    function commitRename(kind, n, v) {
      if (v.trim() === n.name) { ui.rename = null; ui.error = null; draw(); return; }
      var res = T.renameNode(draft.tax, kind, n.id, v);
      if (!res.ok) { ui.error = page.nameErrors[res.error] || res.error; draw(); return; }
      draft.tax = res.taxonomy;
      ui.rename = null; ui.error = null; ui.focus = n.id;
      draw();
    }
    function commitAdd(kind, level, i, parentId, path, v) {
      var id = ID_PREFIX[level] + Date.now().toString(36);
      var res = T.addNode(draft.tax, kind, parentId, v, id);
      if (!res.ok) { ui.error = page.nameErrors[res.error] || res.error; draw(); return; }
      draft.tax = res.taxonomy;
      ui.adding = null; ui.error = null;
      sel[kind] = path.slice(0, i).concat([id]);
      persistSel();
      ui.focus = id;
      draw();
    }

    // คีย์บอร์ด: ↑↓ เลื่อนในคอลัมน์ · → เข้าคอลัมน์ย่อย · ← กลับคอลัมน์แม่ · F2 เปลี่ยนชื่อ (โหมดแก้ไข)
    function keyNav(e, kind, i, path, tax, ft, items) {
      var li = e.target.closest ? e.target.closest('.tx-item[data-id]') : null;
      if (!li) return;
      var id = li.dataset.id;
      var idx = items.map(function (n) { return n.id; }).indexOf(id);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var next = items[idx + (e.key === 'ArrowDown' ? 1 : -1)];
        if (next) select(kind, i, next.id, path);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        var kids = T.children(tax, kind, id).filter(function (n) { return ft.show[n.id]; });
        if (kids.length) select(kind, i + 1, kids[0].id, path.slice(0, i).concat([id]));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (i > 0) { sel[kind] = path.slice(0, i); persistSel(); ui.focus = path[i - 1]; draw(); }
      } else if (e.key === 'F2' && editing) {
        e.preventDefault();
        startRename(kind, id);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select(kind, i, id, path);
      }
    }

    // ---------- แผงรายละเอียด ----------
    function detailPanel(kind, id, tax, products, ft) {
      var D2 = page.detail;
      var n = id ? T.find(tax, kind, id) : null;
      var panel = h('aside', { class: 'tx-detail' + (ui.detailOpen && n ? ' is-open' : ''), 'aria-label': D2.label });
      if (!n) { panel.appendChild(h('p', { class: 'tx-detail-empty' }, D2.empty)); return panel; }
      var path = T.pathOf(tax, kind, id);
      var c = ft.count[id] || T.countSkus(n, products, ft.cross);
      var own = T.productsOf(n, products);
      var list = ft.cross ? own.filter(function (p) { return T.matches(p, ft.cross); }) : own;
      var max = SP.data.settings.TAXONOMY_SKU_LIST_MAX || 10;
      var warns = warningsOf(kind, n, tax, c);
      var kids = T.descendants(tax, kind, id);
      var ended = kind === 'series' && T.seriesEnded(n, today);

      panel.appendChild(h('button', { type: 'button', class: 'icon-btn tx-detail-close', title: D2.close, 'aria-label': D2.close, onClick: function () { ui.detailOpen = false; draw(); } }, '×'));
      panel.appendChild(h('div', { class: 'tx-detail-head' },
        h('h2', { class: 'tx-detail-name' }, n.name, nodeDirty(kind, id) ? h('span', { class: 'tx-dirty', title: page.dirtyTip }) : null),
        h('p', { class: 'tx-detail-path' }, path.map(function (a) { return a.name; }).join(' › ') + ' · ' + levelName(n.level))));

      // สถานะใช้งาน (โหมดแก้ไข = สวิตช์)
      var statusText = n.active === false ? D2.inactive : D2.active;
      panel.appendChild(h('div', { class: 'tx-detail-row' }, h('span', { class: 'field-label' }, D2.status),
        editing ? h('label', { class: 'tx-switch', title: D2.switchTip },
          h('input', { type: 'checkbox', role: 'switch', checked: n.active !== false, 'aria-label': D2.switchTip, onChange: function (e) { toggleActive(kind, n, e.target.checked); } }),
          h('span', { class: 'tx-switch-track', 'aria-hidden': 'true' }), h('span', null, statusText))
          : h('span', { class: 'badge ' + (n.active === false ? 'tag-muted' : 'tag-ok') }, statusText),
        ended ? h('span', { class: 'badge tag-warn' }, page.endedTag) : null));

      // วันเริ่ม / วันสิ้นสุดของ Series (ไม่บังคับ)
      if (n.level === 'SERIES') panel.appendChild(periodBlock(n));

      // SKU
      var skuBox = h('div', { class: 'tx-detail-skus' },
        h('div', { class: 'tx-detail-row' }, h('strong', null, fill(D2.skuCount, { n: c.total })),
          ft.cross ? h('span', { class: 'tx-detail-sub' }, fill(D2.skuFiltered, { n: c.filtered })) : null));
      if (list.length) {
        skuBox.appendChild(h('ul', { class: 'tx-sku-list' }, list.slice(0, max).map(function (p) {
          return h('li', null, h('span', { class: 'tx-sku-name', title: p.name }, calc.displayName(p)), h('span', { class: 'tx-sku-code' }, calc.productKey(p)));
        })));
        if (list.length > max) skuBox.appendChild(h('p', { class: 'tx-detail-sub' }, fill(D2.skuMore, { n: list.length - max })));
        skuBox.appendChild(h('button', {
          type: 'button', class: 'link-btn tx-open-products',
          onClick: function () {
            openProducts(kind === 'category'
              ? { node: n.id, level: n.level, series: ft.cross ? filters.series.concat(filters.subSeries) : null }
              : { series: [n.id], node: ft.cross ? crossNodeOf(tax) : null, level: ft.cross ? crossLevelOf(tax) : null });
          }
        }, D2.openProducts));
      } else {
        skuBox.appendChild(h('p', { class: 'tx-detail-sub' }, D2.noSku));
      }
      panel.appendChild(skuBox);

      if (warns.length) {
        panel.appendChild(h('div', { class: 'tx-detail-warn' }, h('span', { class: 'field-label' }, D2.warnings),
          h('ul', null, warns.map(function (w) { return h('li', null, '⚠ ', w); }))));
      }
      if (editing) panel.appendChild(actionsBlock(kind, n, tax, products, own, kids));
      return panel;
    }
    // ตัวกรองหมวดสินค้าที่ส่งต่อไปหน้ารายการสินค้า (แท็บ Series + กรองหมวดสินค้า 1 รายการ)
    function crossNodeOf(tax) {
      var ids = filters.subCategory.length ? filters.subCategory : filters.category;
      return ids.length === 1 ? ids[0] : null;
    }
    function crossLevelOf(tax) {
      var id = crossNodeOf(tax);
      var n = id ? T.find(tax, 'category', id) : null;
      return n ? n.level : null;
    }

    function periodBlock(n) {
      var D2 = page.detail;
      function field(key, label) {
        var v = n[key] || '';
        return h('label', { class: 'tx-date' }, h('span', { class: 'field-label' }, label),
          editing ? h('input', {
            type: 'date', class: 'tx-date-input', value: v, 'aria-label': label,
            onChange: function (e) { var node = T.find(draft.tax, 'series', n.id); node[key] = e.target.value || null; draw(); }
          }) : h('span', { class: 'tx-date-value' }, v ? SP.core.format.date(v) : D2.noDate));
      }
      return h('div', { class: 'tx-detail-period' }, h('span', { class: 'field-label' }, D2.period),
        h('div', { class: 'tx-date-row' }, field('startDate', D2.start), field('endDate', D2.end)),
        editing ? h('span', { class: 'tx-detail-sub' }, D2.periodNote) : null);
    }

    function toggleActive(kind, n, on) {
      var kids = T.descendants(draft.tax, kind, n.id).filter(function (d) { return d.active !== false; });
      if (on || !kids.length) { draft.tax = T.setActive(draft.tax, kind, n.id, on, false); draw(); return; }
      var Dg = page.dialogs.deactivate;
      C.choiceDialog({
        title: fill(Dg.title, { name: n.name }), lines: [fill(Dg.lines[0], { n: kids.length })],
        choices: [{ value: 'only', label: Dg.only }, { value: 'all', label: Dg.all, primary: true }]
      }).then(function (v) {
        if (v) draft.tax = T.setActive(draft.tax, kind, n.id, false, v === 'all');
        draw();
      });
    }

    // ---------- การดำเนินการ (โหมดแก้ไข) ----------
    function actionsBlock(kind, n, tax, products, own, kids) {
      var A = page.actions, AT = page.actionTips;
      var levels = T.LEVELS[kind];
      var li = levels.indexOf(n.level);
      function btn(label, cls, disabledTip, onClick, danger) {
        return h('button', { type: 'button', class: 'btn btn-sm ' + (danger ? 'btn-danger' : 'btn-secondary') + ' ' + cls, disabled: !!disabledTip, title: disabledTip || null, onClick: onClick }, label);
      }
      var sameLevel = T.LEVELS[kind] && cur().tax[kind].filter(function (x) { return x.level === n.level && x.id !== n.id && x.active !== false; });
      var parents = li > 0 ? cur().tax[kind].filter(function (x) { return x.level === levels[li - 1] && x.id !== n.parentId; }) : [];
      var directKids = T.children(tax, kind, n.id).length;
      var removeTip = own.length ? fill(AT.removeHasSku, { n: own.length }) : directKids ? fill(AT.removeHasChildren, { n: directKids }) : null;
      return h('div', { class: 'tx-actions' },
        btn(A.rename, 'tx-act-rename', null, function () { startRename(kind, n.id); }),
        btn(A.move, 'tx-act-move', li === 0 ? AT.moveTop : !parents.length ? AT.noTargets : null, function () { moveDialog(kind, n, parents); }),
        btn(A.moveSkus, 'tx-act-skus', !own.length ? AT.noSkus : !sameLevel.length ? AT.noTargets : null, function () { moveSkusDialog(kind, n, own, sameLevel); }),
        btn(A.merge, 'tx-act-merge', !sameLevel.length ? AT.noTargets : null, function () { mergeDialog(kind, n, own, sameLevel); }),
        btn(A.remove, 'tx-act-remove', removeTip, function () { removeNode(kind, n); }, true));
    }

    function pathText(kind, id) { return T.pathOf(cur().tax, kind, id).map(function (a) { return a.name; }).join(' › '); }
    function targetSelect(kind, list, value, onChange, disabledOf) {
      return C.select({
        label: page.dialogs.target, value: value, className: 'tx-target',
        options: list.map(function (x) {
          var dis = disabledOf ? disabledOf(x) : false;
          return { value: x.id, label: dis ? fill(page.dialogs.dupTarget, { path: pathText(kind, x.id), name: dis }) : pathText(kind, x.id), disabled: !!dis };
        }),
        onChange: onChange
      });
    }
    // ระดับย่อยของ SKU ที่ย้ายจะว่างเมื่อปลายทางมีรายการย่อยที่ใช้งานอยู่ไม่เท่ากับ 1 (core/taxonomy.moveSkus)
    function unassignedNote(kind, targetId) {
      var t = T.find(cur().tax, kind, targetId);
      var levels = T.LEVELS[kind];
      var next = levels[levels.indexOf(t.level) + 1];
      if (!next) return null;
      return T.children(cur().tax, kind, t.id, true).length === 1 ? null : fill(page.dialogs.unassigned, { level: levelName(next) });
    }

    function moveDialog(kind, n, parents) {
      var Dg = page.dialogs.move;
      var ok = parents.filter(function (p) { return T.validateName(n.name, T.children(cur().tax, kind, p.id)).ok; });
      var target = ok.length ? ok[0].id : null;
      var body = h('label', { class: 'tx-dlg-field' }, h('span', { class: 'field-label' }, page.dialogs.target),
        targetSelect(kind, parents, target, function (v) { target = v; }, function (p) { return T.validateName(n.name, T.children(cur().tax, kind, p.id)).ok ? false : n.name; }));
      var skuCount = T.productsOf(n, draft.products).length;
      C.dialog({ title: fill(Dg.title, { name: n.name }), lines: [Dg.lines[0], fill(Dg.lines[1], { n: skuCount })], body: body, confirmLabel: Dg.confirm })
        .then(function (r) {
          if (!r.ok || !target) return;
          var res = T.moveNode(draft.tax, kind, n.id, target, draft.products);
          if (!res.ok) { alertError(res.error, n.name); return; }
          draft.tax = res.taxonomy;
          draft.products = res.products;
          sel[kind] = T.pathOf(draft.tax, kind, n.id).map(function (a) { return a.id; });
          persistSel();
          ui.focus = n.id;
          draw();
        });
    }

    function moveSkusDialog(kind, n, own, targets) {
      var Dg = page.dialogs.moveSkus;
      var target = targets[0].id;
      var picked = {};
      own.forEach(function (p) { picked[calc.productKey(p)] = true; });
      var summary = h('p', { class: 'tx-dlg-summary' });
      var note = h('p', { class: 'tx-dlg-note' });
      function refresh() {
        var n2 = Object.keys(picked).filter(function (k) { return picked[k]; }).length;
        summary.textContent = n2 ? fill(Dg.summary, { n: n2 }) : Dg.none;
        var u = unassignedNote(kind, target);
        note.textContent = u || '';
        note.hidden = !u;
      }
      var all = h('input', { type: 'checkbox', checked: true, onChange: function (e) {
        own.forEach(function (p) { picked[calc.productKey(p)] = e.target.checked; });
        Array.prototype.forEach.call(listEl.querySelectorAll('input'), function (b) { b.checked = e.target.checked; });
        refresh();
      } });
      var listEl = h('ul', { class: 'tx-dlg-skus' }, own.map(function (p) {
        var key = calc.productKey(p);
        return h('li', null, h('label', null, h('input', { type: 'checkbox', checked: true, onChange: function (e) { picked[key] = e.target.checked; refresh(); } }),
          h('span', { class: 'tx-sku-name' }, calc.displayName(p)), h('span', { class: 'tx-sku-code' }, key)));
      }));
      var body = h('div', { class: 'tx-dlg' },
        h('label', { class: 'tx-dlg-field' }, h('span', { class: 'field-label' }, page.dialogs.target), targetSelect(kind, targets, target, function (v) { target = v; refresh(); })),
        h('div', { class: 'tx-dlg-pick' }, h('span', { class: 'field-label' }, Dg.pick), h('label', { class: 'tx-dlg-all' }, all, Dg.all)),
        listEl, summary, note);
      refresh();
      C.dialog({ title: fill(Dg.title, { name: n.name }), body: body, confirmLabel: Dg.confirm, wide: true })
        .then(function (r) {
          if (!r.ok) return;
          var keys = Object.keys(picked).filter(function (k) { return picked[k]; });
          if (!keys.length) return;
          var res = T.moveSkus(draft.products, n.id, target, keys, draft.tax);
          if (!res.ok) { alertError(res.error, n.name); return; }
          draft.products = res.products;
          draw();
        });
    }

    function mergeDialog(kind, n, own, targets) {
      var Dg = page.dialogs.merge;
      var target = targets[0].id;
      var note = h('p', { class: 'tx-dlg-note' });
      function refresh() { var u = unassignedNote(kind, target); note.textContent = u || ''; note.hidden = !u; }
      var body = h('div', { class: 'tx-dlg' }, h('label', { class: 'tx-dlg-field' }, h('span', { class: 'field-label' }, page.dialogs.target),
        targetSelect(kind, targets, target, function (v) { target = v; refresh(); })), note);
      refresh();
      C.dialog({ title: fill(Dg.title, { name: n.name }), lines: [fill(Dg.lines[0], { n: own.length }), fill(Dg.lines[1], { name: n.name })], body: body, confirmLabel: Dg.confirm })
        .then(function (r) {
          if (!r.ok) return;
          var res = T.mergeNodes(draft.tax, draft.products, n.id, target);
          if (!res.ok) { alertError(res.error, n.name); return; }
          draft.tax = res.taxonomy;
          draft.products = res.products;
          sel[kind] = T.pathOf(draft.tax, kind, target).map(function (a) { return a.id; });
          persistSel();
          ui.focus = target;
          draw();
        });
    }

    function removeNode(kind, n) {
      var Dg = page.dialogs.remove;
      if (!T.canDelete(n, draft.products, draft.tax)) return;
      C.dialog({ title: fill(Dg.title, { name: n.name }), lines: Dg.lines, confirmLabel: Dg.confirm, danger: true }).then(function (r) {
        if (!r.ok) return;
        draft.tax = clone(draft.tax);
        draft.tax[kind] = draft.tax[kind].filter(function (x) { return x.id !== n.id; });
        sel[kind] = (sel[kind] || []).filter(function (x) { return x !== n.id; });
        persistSel();
        draw();
      });
    }

    function alertError(code, name) {
      var E = page.dialogs.errors;
      C.dialog({ title: fill(E[code] || code, { name: name }), confirmLabel: L.dialog.close });
    }

    // =====================================================================
    // ตารางไขว้ Series × หมวดสินค้า (อ่านอย่างเดียว) — กางเป็น Sub Series / Sub Category ได้ / กดช่อง = รายการสินค้าที่กรองแล้ว
    // =====================================================================
    function crossView(tax, products) {
      var Q = page.cross;
      var args = filterArgs();
      var fc = T.filterTree(tax, 'category', args, products, today);
      var fs = T.filterTree(tax, 'series', args, products, today);
      var catX = T.crossFilterOf(tax, 'category', filters.category.concat(filters.subCategory));
      var serX = T.crossFilterOf(tax, 'series', filters.series.concat(filters.subSeries));
      var prods = products.filter(function (p) {
        return T.matches(p, catX) && T.matches(p, serX) && fc.show[p.categoryId] && fs.show[p.seriesId];
      });
      var tabs = {};
      function tab(rowDim, colDim) { var k = rowDim + '|' + colDim; return tabs[k] || (tabs[k] = T.crossTab(prods, rowDim, colDim, tax)); }
      var cols = [];
      T.children(tax, 'category', null).filter(function (n) { return fc.show[n.id]; }).forEach(function (c) {
        var subs = T.children(tax, 'category', c.id).filter(function (n) { return fc.show[n.id]; });
        cols.push({ node: c, dim: 'category', subs: subs.length });
        if (ui.open.cols[c.id]) subs.forEach(function (s) { cols.push({ node: s, dim: 'subCategory', parentId: c.id }); });
      });
      var rows = [];
      T.children(tax, 'series', null).filter(function (n) { return fs.show[n.id]; }).forEach(function (s) {
        var subs = T.children(tax, 'series', s.id).filter(function (n) { return fs.show[n.id]; });
        rows.push({ node: s, dim: 'series', subs: subs.length });
        if (ui.open.rows[s.id]) subs.forEach(function (x) { rows.push({ node: x, dim: 'subSeries', parentId: s.id }); });
      });
      function cell(r, c) { var t = tab(r.dim, c.dim); var row = byId(t.rows, r.node.id); return row ? row.cells[c.node.id] || 0 : 0; }
      var max = 0;
      rows.forEach(function (r) { cols.forEach(function (c) { max = Math.max(max, cell(r, c)); }); });
      function toggle(kind2, id) { ui.open[kind2][id] = !ui.open[kind2][id]; draw(); }
      function head(label, item2, kind2) {
        var open = ui.open[kind2][item2.node.id];
        return item2.subs ? h('button', {
          type: 'button', class: 'tx-x-toggle', 'aria-expanded': open ? 'true' : 'false', title: fill(open ? Q.collapse : Q.expand, { name: item2.node.name }),
          onClick: function () { toggle(kind2, item2.node.id); }
        }, (open ? '▾ ' : '▸ ') + label) : h('span', null, label);
      }
      var base = tab('series', 'category');
      var thead = h('thead', null, h('tr', null,
        h('th', { scope: 'col', class: 'tx-x-corner' }, Q.corner),
        cols.map(function (c) {
          return h('th', { scope: 'col', class: 'num tx-x-col' + (c.dim === 'subCategory' ? ' is-sub' : '') }, c.dim === 'subCategory' ? c.node.name : head(c.node.name, c, 'cols'));
        }),
        h('th', { scope: 'col', class: 'num tx-x-total' }, Q.total)));
      var tbody = h('tbody', null, rows.map(function (r) {
        var rowTotal = (byId(tab(r.dim, 'category').rows, r.node.id) || {}).total || 0;
        return h('tr', { class: r.dim === 'subSeries' ? 'is-sub' : null },
          h('th', { scope: 'row', class: 'tx-x-row' }, r.dim === 'subSeries' ? r.node.name : head(r.node.name, r, 'rows')),
          cols.map(function (c) {
            var n = cell(r, c);
            if (!n) return h('td', { class: 'num tx-x-cell is-zero' });
            // ความเข้มสีตามจำนวน (สีเดียว) ส่งเป็นร้อยละของสีหลัก 8–60% ให้ CSS ผสมกับพื้น
            var k = max ? n / max : 0;
            return h('td', { class: 'num tx-x-cell' + (c.dim === 'subCategory' ? ' is-sub' : '') + (k >= 0.6 ? ' is-strong' : ''), style: { '--k': Math.round(8 + k * 52) + '%' } },
              h('button', {
                type: 'button', class: 'tx-x-btn', title: fill(Q.cellTip, { row: r.node.name, col: c.node.name, n: n }),
                onClick: function () { openProducts({ node: c.node.id, level: c.node.level, series: [r.node.id] }); }
              }, String(n)));
          }),
          h('td', { class: 'num tx-x-total' }, rowTotal ? String(rowTotal) : ''));
      }));
      var tfoot = h('tfoot', null, h('tr', null,
        h('th', { scope: 'row', class: 'tx-x-row' }, Q.total),
        cols.map(function (c) { var col = byId(tab('series', c.dim).cols, c.node.id); return h('td', { class: 'num tx-x-total' }, col && col.total ? String(col.total) : ''); }),
        h('td', { class: 'num tx-x-total tx-x-grand' }, String(base.total))));
      return h('div', { class: 'tx-cross' },
        h('p', { class: 'tx-cross-note' }, Q.note),
        rows.length && cols.length ? h('div', { class: 'fit-scroll tx-cross-scroll' }, h('table', { class: 'data-grid tx-x-table' }, thead, tbody, tfoot))
          : h('p', { class: 'tx-detail-empty' }, Q.empty));
    }

    draw();
  }

  SP.modules.taxonomy = { render: render };
})(window.SP);
