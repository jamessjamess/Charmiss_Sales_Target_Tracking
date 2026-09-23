/*
 * modules/product-master/product-master.js — Product Master · Listing
 *
 * หน้าที่:        ข้อมูลสินค้าของทีม Product: วันเริ่มขาย, Listing ต่อหน่วยแบ่งเป้า (Checkbox), เดือนเลิกขาย
 *                 และ Clearance ของ Supply Chain / เพิ่ม SKU ใหม่เพื่อเดโม NPD
 *                 Channel ตามแผนของปี (Dynamic) → คอลัมน์ Listing = หน่วยของ Channel นั้น (Account หรือเขต)
 *                 Filter Series (components.seriesFilter ตัวเดียวกับหน้าวางแผน SKU) + ค้นหา + Filter Status
 *                 แผง "กฎ Status และวิธีเติมยอด" แบบพับได้ (components.rulesPanel)
 *                 เปิดมาเป็นโหมดดู / แก้ไข → บันทึก/ยกเลิก (workflowBar แบบง่าย ไม่มีขั้นอนุมัติ)
 *                 โหมดแก้ไข: คอลัมน์จัดการ = ถังขยะ + กล่องยืนยัน (ลบได้เฉพาะ SKU ที่ยังไม่มี Listing)
 *                 Status คำนวณจาก calc.skuStatus ตัวเดียวกับหน้าวางแผน SKU
 * อ่านจาก data/:  channels, settings, content (pages.productMaster, labels) + Master ผ่าน store.data()
 * store อ่าน:     app.planYear (Channel ในแผน และ Status ของปีแผน), plan.<ปี>.topDown (.channels), master.products,
 *                 master.listings, master.accounts, master.territories, ui.productMaster.channel, ui.seriesFilter
 * store เขียน:    master.products, master.listings (ตอนกด บันทึก ไม่แยกตามปี), ui.productMaster.channel, ui.seriesFilter
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var store = SP.core.store;
  var h = C.h;
  var fill = C.fill;

  var query = '';
  var statusFilter = '';

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function statusBadges(product, year) {
    var segs = calc.statusSegments(product, year).filter(function (s) { return s.status === 'npd' || s.status === 'clearance'; });
    var out = segs.map(function (s) { return C.statusBadge(s.status, F.monthRange(s.from, s.to)); });
    if (!out.length) out.push(C.statusBadge(calc.planYearStatus(product, year)));
    return out;
  }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var cols = page.columns;
    var year = store.year();
    var data = store.data();
    var editing = false;
    var addOpen = false;
    var justAdded = null;
    var saved = { products: store.get('master.products'), listings: store.get('master.listings') };
    var draft = clone(saved);

    function dirty() { return editing ? (JSON.stringify(draft) !== JSON.stringify(saved) ? countDiff() : 0) : 0; }
    function countDiff() {
      var n = 0;
      draft.products.forEach(function (p) {
        var o = saved.products.filter(function (x) { return x.sku === p.sku; })[0];
        if (!o || JSON.stringify(o) !== JSON.stringify(p)) n++;
      });
      n += saved.products.filter(function (o) { return !draft.products.some(function (p) { return p.sku === o.sku; }); }).length;
      var key = function (l) { return l.sku + '|' + l.accountId; };
      var a = draft.listings.map(key), b = saved.listings.map(key);
      n += a.filter(function (k) { return b.indexOf(k) < 0; }).length + b.filter(function (k) { return a.indexOf(k) < 0; }).length;
      return n || 1;
    }
    C.guardUnsaved(dirty);

    var bar = C.workflowBar({
      simple: true,
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); draw(); },
      onSave: function () {
        store.set('master.products', draft.products);
        store.set('master.listings', draft.listings);
        saved = clone(draft);
        editing = false;
        addOpen = false;
        draw();
      },
      onCancel: function () { editing = false; addOpen = false; draft = clone(saved); justAdded = null; draw(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    function draw() {
      C.clear(root);
      bar.update();
      var planChannels = (store.get(store.planKey('topDown')).channels || []).map(function (id) { return calc.findById(SP.data.channels, id); }).filter(Boolean);
      var ch = calc.findById(planChannels, store.get('ui.productMaster.channel')) || planChannels[0] || null;
      var current = editing ? draft : saved;
      var seriesOptions = calc.seriesList(current.products);
      var series = (store.get('ui.seriesFilter') || []).filter(function (s) { return seriesOptions.some(function (o) { return o.value === s; }); });

      // ---------- แถบเครื่องมือ ----------
      var search = h('input', { type: 'search', class: 'pm-search', placeholder: page.searchPlaceholder, 'aria-label': page.searchPlaceholder, value: query });
      search.addEventListener('input', function () { query = search.value; renderTable(); });
      var statusOptions = [{ value: '', label: page.statusAll }].concat(['npd', 'existing', 'clearance', 'ended', 'upcoming'].map(function (s) {
        return { value: s, label: L.status[s] };
      }));
      root.appendChild(h('div', { class: 'pm-toolbar' },
        ch ? C.segmented({
          label: L.picker.channel, value: ch.id,
          options: planChannels.map(function (c) { return { value: c.id, label: c.name, title: c.fullName }; }),
          onChange: function (v) { store.set('ui.productMaster.channel', v); draw(); }
        }) : null,
        C.seriesFilter({ options: seriesOptions, value: series, onChange: function (v) { store.set('ui.seriesFilter', v); draw(); } }),
        search,
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.statusFilter),
          C.select({ label: page.statusFilter, value: statusFilter, options: statusOptions, onChange: function (v) { statusFilter = v; renderTable(); } })),
        editing ? h('button', { type: 'button', class: 'btn btn-sm pm-add-toggle', 'aria-expanded': addOpen ? 'true' : 'false', onClick: function () { addOpen = !addOpen; draw(); } }, page.addSku) : null));

      if (editing) root.appendChild(C.editBanner());
      if (editing && addOpen) root.appendChild(addForm());
      if (justAdded && editing) root.appendChild(C.callout('info', null, page.addedNote));

      root.appendChild(C.rulesPanel());

      var tableSlot = h('div', { class: 'card pm-card' });
      root.appendChild(tableSlot);
      var banner = root.querySelector('.edit-banner');
      if (banner) banner.update(dirty());

      // ---------- ตาราง 1 แถวต่อ SKU ----------
      function renderTable() {
        var products = current.products;
        var listings = current.listings;
        var units = ch ? calc.unitsOfChannel(data, ch.id, true) : [];
        var q = query.trim().toLowerCase();
        var shown = products.filter(function (p) {
          var text = (p.sku + ' ' + p.name + ' ' + (p.series || '')).toLowerCase();
          return (!q || text.indexOf(q) >= 0) && (!statusFilter || calc.planYearStatus(p, year) === statusFilter) && calc.inSeries(p, series);
        });

        var thead = h('thead', null, h('tr', null,
          h('th', { class: 'pm-sku', scope: 'col' }, cols.sku),
          h('th', { scope: 'col' }, cols.launch),
          h('th', { scope: 'col' }, cols.status + ' ' + year),
          units.length ? units.map(function (u) { return h('th', { class: 'pm-acc', scope: 'col', title: u.name }, u.name); })
            : h('th', { class: 'pm-acc' }, page.noUnits),
          h('th', { scope: 'col', class: 'pm-cl-head' }, cols.clearance, ' ', h('span', { class: 'history-tag' }, page.clearanceOwner)),
          h('th', { scope: 'col' }, cols.discontinue),
          editing ? h('th', { scope: 'col', class: 'master-manage' }, cols.manage) : null));
        var listingHead = h('tr', { class: 'pm-group-head' },
          h('th', { class: 'pm-sku' }), h('th'), h('th'),
          h('th', { class: 'pm-acc-group', colspan: String(Math.max(1, units.length)) },
            fill(cols.listing, { unitType: ch ? ' ' + (L.unitType[ch.allocationUnit] || '') : '' }) + (ch ? ' · ' + ch.name : '')),
          h('th'), h('th'), editing ? h('th') : null);
        thead.insertBefore(listingHead, thead.firstChild);

        var tbody = h('tbody', null, shown.length ? shown.map(function (p) { return row(p, listings, units); })
          : h('tr', null, h('td', { class: 'pm-empty', colspan: String(Math.max(1, units.length) + (editing ? 6 : 5)) }, page.noMatch)));

        C.clear(tableSlot).appendChild(h('div', { class: 'pm-scroll' }, h('table', { class: 'pm-table' + (editing ? ' is-editing' : '') }, thead, tbody)));
      }

      function markDirty() { var b = root.querySelector('.edit-banner'); if (b) b.update(dirty()); }

      function row(p, listings, units) {
        var original = saved.products.filter(function (x) { return x.sku === p.sku; })[0];
        function changed(field) { return editing && (!original || JSON.stringify(original[field]) !== JSON.stringify(p[field])); }
        function updateProduct(changes) {
          Object.keys(changes).forEach(function (k) { p[k] = changes[k]; });
          renderTable();
          markDirty();
        }
        var cl = p.clearance || {};
        var listedCount = calc.listedAccounts(listings, p.sku).length;
        var launchCell, clCell, discCell;

        if (editing) {
          var launch = h('input', { type: 'date', class: 'pm-input' + (changed('launchDate') ? ' is-dirty-cell' : ''), value: p.launchDate, 'aria-label': cols.launch + ' ' + p.sku });
          launch.addEventListener('change', function () { if (launch.value) updateProduct({ launchDate: launch.value }); });
          launchCell = launch;

          // Clearance: ช่วงเดือน + Stock (Supply Chain)
          var dirtyCl = changed('clearance') ? ' is-dirty-cell' : '';
          var clFrom = h('input', { type: 'month', class: 'pm-input pm-month' + dirtyCl, value: cl.fromMonth || '', 'aria-label': page.clearanceFrom + ' ' + p.sku });
          var clTo = h('input', { type: 'month', class: 'pm-input pm-month' + dirtyCl, value: cl.toMonth || '', 'aria-label': page.clearanceTo + ' ' + p.sku });
          var clStock = h('input', { type: 'number', class: 'pm-input pm-stock' + dirtyCl, min: '0', step: '1', value: cl.stockQty != null ? String(cl.stockQty) : '', placeholder: page.clearanceStock, 'aria-label': page.clearanceStock + ' ' + p.sku, title: page.clearanceStockNote });
          var saveClearance = function () {
            var from = clFrom.value, to = clTo.value;
            if (!from && !to) { updateProduct({ clearance: null }); return; }
            if (!from || !to) return;
            if (to < from) to = from;
            updateProduct({ clearance: { fromMonth: from, toMonth: to, stockQty: Math.max(0, Math.round(Number(clStock.value) || 0)) } });
          };
          [clFrom, clTo, clStock].forEach(function (el) { el.addEventListener('change', saveClearance); });
          clCell = h('span', { class: 'pm-cl-fields' }, clFrom, '–', clTo, clStock);

          var disc = h('input', { type: 'month', class: 'pm-input pm-month' + (changed('discontinueMonth') ? ' is-dirty-cell' : ''), value: p.discontinueMonth || '', 'aria-label': cols.discontinue + ' ' + p.sku, title: page.discontinueNone });
          disc.addEventListener('change', function () { updateProduct({ discontinueMonth: disc.value || null }); });
          discCell = disc;
        } else {
          launchCell = F.date(p.launchDate);
          clCell = p.clearance ? h('span', { title: page.clearanceStockNote }, F.date(cl.fromMonth) + ' – ' + F.date(cl.toMonth) + ' · ' + F.units(cl.stockQty) + ' ' + L.units) : page.clearanceNone;
          discCell = p.discontinueMonth ? F.date(p.discontinueMonth) : h('span', { class: 'muted' }, page.discontinueNone);
        }

        return h('tr', { class: p.sku === justAdded ? 'pm-new' : null },
          h('th', { class: 'pm-sku', scope: 'row', title: p.note || '' },
            h('span', { class: 'pm-sku-code' }, p.sku), ' ', h('span', null, p.name),
            h('span', { class: 'pm-sub' }, [p.series, fill(page.listedCount, { n: listedCount })].filter(Boolean).join(' · '))),
          h('td', null, launchCell),
          h('td', { class: 'pm-status' }, statusBadges(p, year)),
          units.length ? units.map(function (u) {
            var listed = calc.isListed(listings, p.sku, u.id);
            if (!editing) return h('td', { class: 'pm-acc' + (listed ? ' is-listed' : '') }, listed ? h('span', { class: 'pm-mark', title: p.sku + ' · ' + u.name }, page.listedMark) : null);
            var was = calc.isListed(saved.listings, p.sku, u.id);
            var box = h('input', { type: 'checkbox', checked: listed, 'aria-label': p.sku + ' · ' + u.name });
            box.addEventListener('change', function () {
              draft.listings = draft.listings.filter(function (l) { return !(l.sku === p.sku && l.accountId === u.id); });
              if (box.checked) draft.listings.push({ sku: p.sku, accountId: u.id });
              renderTable();
              markDirty();
            });
            return h('td', { class: 'pm-acc' + (was !== listed ? ' is-dirty-cell' : '') }, h('label', { class: 'pm-check' }, box));
          }) : h('td', { class: 'pm-acc' }),
          h('td', { class: 'pm-cl' }, clCell),
          h('td', null, discCell),
          editing ? h('td', { class: 'master-manage' }, C.trashButton({
            label: page.removeSku, disabled: listedCount > 0, disabledTitle: page.removeSkuBlocked,
            confirmTitle: fill(page.removeSkuConfirm, { sku: p.sku }),
            onConfirm: function () {
              draft.products = draft.products.filter(function (x) { return x.sku !== p.sku; });
              draft.listings = draft.listings.filter(function (l) { return l.sku !== p.sku; });
              if (justAdded === p.sku) justAdded = null;
              draw();
            }
          })) : null);
      }

      renderTable();
    }

    // ---------- เพิ่ม SKU ใหม่ (รหัส, ชื่อ, Series, วันเริ่มขาย, ราคา) เฉพาะโหมดแก้ไข ----------
    function addForm() {
      var A = page.addFields;
      var sku = h('input', { type: 'text', class: 'pm-input', placeholder: A.sku, 'aria-label': A.sku });
      var name = h('input', { type: 'text', class: 'pm-input', placeholder: A.name, 'aria-label': A.name });
      var series = h('input', { type: 'text', class: 'pm-input', placeholder: A.series, 'aria-label': A.series, list: 'pm-series-list' });
      var seriesList = h('datalist', { id: 'pm-series-list' }, calc.seriesList(draft.products).map(function (o) { return h('option', { value: o.value }); }));
      var launch = h('input', { type: 'date', class: 'pm-input', 'aria-label': A.launch, title: A.launch });
      var price = h('input', { type: 'number', class: 'pm-input pm-stock', min: '0', step: '1', placeholder: A.price, 'aria-label': A.price });
      var msg = h('span', { class: 'pm-msg', role: 'status' });
      function submit() {
        var code = sku.value.trim();
        if (!code || !name.value.trim() || !launch.value) { msg.className = 'pm-msg is-error'; msg.textContent = page.addErrorRequired; return; }
        if (draft.products.some(function (p) { return p.sku.toLowerCase() === code.toLowerCase(); })) { msg.className = 'pm-msg is-error'; msg.textContent = page.addErrorDuplicate; return; }
        draft.products.push({
          sku: code, name: name.value.trim(), series: series.value.trim(), note: '',
          launchDate: launch.value, discontinueMonth: null, clearance: null,
          price: price.value === '' ? null : Math.max(0, Number(price.value))
        });
        query = '';
        statusFilter = '';
        store.set('ui.seriesFilter', []);
        addOpen = false;
        justAdded = code;
        draw();
      }
      [sku, name, series, price].forEach(function (el) { el.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); }); });
      return h('div', { class: 'card pm-add' },
        h('strong', null, page.addTitle),
        h('div', { class: 'pm-add-fields' }, sku, name, series, seriesList, launch, price,
          h('button', { type: 'button', class: 'btn btn-primary btn-sm', onClick: submit }, page.addSubmit),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: function () { addOpen = false; draw(); } }, page.addCancel),
          msg));
    }

    draw();
  }

  SP.modules.productMaster = { render: render };
})(window.SP);
