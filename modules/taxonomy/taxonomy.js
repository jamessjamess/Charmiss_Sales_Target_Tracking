/*
 * modules/taxonomy/taxonomy.js — หมวดสินค้าและ Series (Product Master)
 *
 * หน้าที่:        2 แท็บ: หมวดสินค้า (Category → Sub Category → Type) | Series (Series → Sub Series)
 *                 ตาราง Tree พับได้: ชื่อ · ระดับ · จำนวน SKU · การใช้งาน · ลำดับ
 *                 เปิดมาเป็นโหมดดู / แก้ไข (ทีม Product) → เพิ่มรายการย่อย, แก้ชื่อ, ปิดใช้งาน, เลื่อนขึ้น/ลง, ลบ → บันทึก/ยกเลิก
 *                 ห้ามลบรายการที่มี SKU ใช้อยู่หรือมีรายการย่อย (กล่องแจ้งบอกจำนวน) ให้ปิดใช้งานแทน (calc.removeTaxonomyNode)
 *                 รายการที่ปิดใช้งานเลือกใหม่ในฟอร์มสินค้าไม่ได้ แต่สินค้าเดิมยังแสดงชื่อได้ / บันทึกแล้วเขียน Audit log
 * อ่านจาก data/:  content (pages.taxonomy, labels) + Master ผ่าน store.master() (taxonomy, products)
 * store อ่าน:     master.taxonomy, master.products, ui.role
 * store เขียน:    master.taxonomy และ master.audit (ตอนกด บันทึก)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var calc = SP.core.calc;
  var store = SP.core.store;
  var h = C.h;
  var fill = C.fill;

  var kind = 'category';
  var collapsed = {};

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var saved = store.get('master.taxonomy');
    var draft = clone(saved);
    var editing = false;
    var focusId = null;

    function diffCount() {
      var n = 0;
      ['category', 'series'].forEach(function (k) {
        draft[k].forEach(function (d) { var o = calc.findById(saved[k], d.id); if (!o || JSON.stringify(o) !== JSON.stringify(d)) n++; });
        n += saved[k].filter(function (o) { return !calc.findById(draft[k], o.id); }).length;
      });
      return n;
    }
    function dirty() { return editing ? diffCount() : 0; }
    C.guardUnsaved(dirty);

    var bar = C.workflowBar({
      simple: true, editRoles: ['product'],
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); draw(); },
      onSave: function () {
        var by = L.roles[store.role().type] || '', at = new Date().toISOString();
        var entries = [];
        ['category', 'series'].forEach(function (k) {
          draft[k].forEach(function (d) { entries = entries.concat(calc.auditDiff('taxonomy', d.id, calc.findById(saved[k], d.id), d, { by: by, at: at })); });
          saved[k].forEach(function (o) { if (!calc.findById(draft[k], o.id)) entries = entries.concat(calc.auditDiff('taxonomy', o.id, o, null, { by: by, at: at })); });
        });
        store.set('master.taxonomy', draft);
        store.appendAudit(entries);
        saved = clone(draft);
        editing = false;
        draw();
      },
      onCancel: function () { editing = false; draft = clone(saved); draw(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    function draw() {
      C.clear(root);
      bar.update();
      var tax = editing ? draft : saved;
      var products = store.get('master.products');
      var levels = calc.TAX_LEVELS[kind];

      root.appendChild(h('div', { class: 'tool-row' },
        C.segmented({
          label: page.title, value: kind,
          options: ['category', 'series'].map(function (k) { return { value: k, label: page.tabs[k] }; }),
          onChange: function (v) { kind = v; draw(); }
        }),
        h('span', { class: 'master-hint' }, fill(page.hint, { levels: levels.map(function (l) { return page.levels[l]; }).join(' → ') })),
        editing ? h('span', { class: 'tool-right' }, h('button', { type: 'button', class: 'btn btn-sm btn-secondary tx-add-root', onClick: function () { add(null); } }, page.addRoot[kind])) : null));

      var banner = editing ? C.editBanner() : null;
      if (banner) { root.appendChild(banner); banner.update(dirty()); }

      var rows = calc.taxonomyTree(tax, kind);
      var hiddenBy = {};
      var body = h('tbody');
      rows.forEach(function (r) {
        var n = r.node;
        var parentHidden = n.parentId && (collapsed[n.parentId] || hiddenBy[n.parentId]);
        if (parentHidden) { hiddenBy[n.id] = true; return; }
        body.appendChild(rowOf(r, tax, products));
      });
      if (!rows.length) body.appendChild(h('tr', null, h('td', { class: 'grid-empty', colspan: editing ? '6' : '5' }, page.empty)));

      var C2 = page.columns;
      var table = h('table', { class: 'data-grid tx-table' + (editing ? ' is-editing' : '') },
        h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, C2.name), h('th', { scope: 'col' }, C2.level), h('th', { scope: 'col', class: 'num' }, C2.count),
          h('th', { scope: 'col' }, C2.active), h('th', { scope: 'col', class: 'num' }, C2.order),
          editing ? h('th', { scope: 'col', class: 'manage' }, C2.manage) : null)),
        body);
      root.appendChild(h('div', { class: 'card fit-card' }, h('div', { class: 'fit-scroll' }, table)));

      if (focusId) {
        var inp = root.querySelector('input[data-node="' + focusId + '"]');
        if (inp) { inp.focus(); inp.select(); }
        focusId = null;
      }
      if (banner) banner.update(dirty());
    }

    function rowOf(r, tax, products) {
      var n = r.node;
      var original = calc.findById(saved[kind], n.id);
      var kids = calc.taxonomyChildren(tax, kind, n.id).length;
      var used = calc.taxonomyUsage(products, n);
      var levels = calc.TAX_LEVELS[kind];
      var canAddChild = levels.indexOf(n.level) < levels.length - 1;
      function changed(f) { return editing && (!original || original[f] !== n[f]); }
      var toggle = kids ? h('button', {
        type: 'button', class: 'tree-toggle', 'aria-expanded': collapsed[n.id] ? 'false' : 'true', title: page.collapseTitle,
        onClick: function () { collapsed[n.id] = !collapsed[n.id]; draw(); }
      }, collapsed[n.id] ? '▸' : '▾') : h('span', { class: 'tree-toggle', 'aria-hidden': 'true' });

      var nameCell;
      if (editing) {
        var input = h('input', { type: 'text', class: 'pm-input master-input' + (changed('name') ? ' is-dirty-cell' : ''), value: n.name, 'aria-label': page.columns.name, dataset: { node: n.id } });
        input.addEventListener('change', function () {
          var v = input.value.trim();
          if (!v) { input.value = n.name; return; }
          findDraft(n.id).name = v;
          draw();
        });
        nameCell = input;
      } else {
        nameCell = h('span', { class: r.depth === 0 ? 'tx-name tx-root' : 'tx-name' }, n.name);
      }
      var activeCell;
      if (editing) {
        var box = h('input', { type: 'checkbox', checked: n.active !== false, 'aria-label': page.columns.active + ' ' + n.name });
        box.addEventListener('change', function () { findDraft(n.id).active = box.checked; draw(); });
        activeCell = h('label', { class: 'pm-check' + (changed('active') ? ' is-dirty-cell' : '') }, box);
      } else {
        activeCell = h('span', { class: 'badge ' + (n.active !== false ? 'tag-ok' : 'tag-muted') }, n.active !== false ? page.activeYes : page.activeNo);
      }

      var manage = null;
      if (editing) {
        var sib = calc.taxonomyChildren(tax, kind, n.parentId);
        var idx = sib.map(function (x) { return x.id; }).indexOf(n.id);
        manage = h('td', { class: 'manage' }, h('span', { class: 'manage-group' },
          canAddChild ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm tx-add-child', title: fill(page.addChildTitle, { level: page.levels[levels[levels.indexOf(n.level) + 1]], name: n.name }), onClick: function () { add(n.id); } },
            fill(page.addChild, { level: page.levels[levels[levels.indexOf(n.level) + 1]] })) : null,
          h('button', { type: 'button', class: 'icon-btn tx-up', title: page.moveUp, 'aria-label': page.moveUp, disabled: idx <= 0, onClick: function () { draft = calc.moveTaxonomyNode(draft, kind, n.id, -1); draw(); } }, '↑'),
          h('button', { type: 'button', class: 'icon-btn tx-down', title: page.moveDown, 'aria-label': page.moveDown, disabled: idx >= sib.length - 1, onClick: function () { draft = calc.moveTaxonomyNode(draft, kind, n.id, 1); draw(); } }, '↓'),
          h('button', {
            type: 'button', class: 'icon-btn trash-btn tx-remove', title: page.removeTitle, 'aria-label': page.removeTitle + ' ' + n.name,
            onClick: function () { remove(n); }
          }, C.icon('trash'))));
      }
      return h('tr', { class: n.active === false ? 'is-inactive' : null },
        h('td', { style: { paddingLeft: 'calc(' + r.depth + ' * var(--sp-5) + var(--sp-2))' } }, h('span', { class: 'tx-cell' }, toggle, nameCell)),
        h('td', null, h('span', { class: 'level-tag' }, page.levels[n.level])),
        h('td', { class: 'num' }, String(used)),
        h('td', null, activeCell),
        h('td', { class: 'num' }, String(n.order)),
        manage);
    }

    function findDraft(id) { return calc.findById(draft[kind], id); }

    function add(parentId) {
      var id = (kind === 'category' ? 'cat-' : 'ser-') + Date.now().toString(36);
      var levels = calc.TAX_LEVELS[kind];
      var parent = parentId ? findDraft(parentId) : null;
      var level = parent ? levels[levels.indexOf(parent.level) + 1] : levels[0];
      var res = calc.addTaxonomyNode(draft, kind, parentId, fill(page.newName, { level: page.levels[level] }), id);
      if (!res.ok) return;
      draft = res.taxonomy;
      if (parentId) collapsed[parentId] = false;
      focusId = id;
      draw();
    }

    function remove(n) {
      var res = calc.removeTaxonomyNode(draft, store.get('master.products'), kind, n.id);
      if (!res.ok) {
        C.dialog({
          title: fill(page.cannotRemove, { name: n.name }),
          lines: [res.error === 'inUse' ? fill(page.inUseLine, { n: res.count }) : fill(page.hasChildrenLine, { n: res.count }), page.useInactive],
          confirmLabel: page.deactivate
        }).then(function (r) { if (r.ok) { findDraft(n.id).active = false; draw(); } });
        return;
      }
      C.dialog({ title: fill(page.removeConfirm, { name: n.name }), confirmLabel: page.removeTitle, danger: true })
        .then(function (r) { if (r.ok) { draft = res.taxonomy; draw(); } });
    }

    draw();
  }

  SP.modules.taxonomy = { render: render };
})(window.SP);
