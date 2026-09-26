/*
 * modules/product-master/product-master.js — Product Master · Listing และวันเริ่มขาย
 *
 * หน้าที่:        ตาราง 1 แถวต่อ SKU: รูปย่อ · ชื่อ · Series / Sub Series (ติดซ้าย) · วันเริ่มขาย (อ่านอย่างเดียว) · Status ปีแผน
 *                 · Listing ต่อหน่วยขายของ Channel ที่เลือก (Segmented ตามแผนของปี) · Clearance · เลิกขาย
 *                 Filter ชุดเดียวกับรายการสินค้า: ค้นหา · Series (ร่วมกับหน้าวางแผน SKU) · Status · Item Type
 *                 เปิดมาเป็นโหมดดู / แก้ไข (workflowBar แบบง่าย) ตามบทบาท:
 *                   ทีม Product = ติ๊ก Listing (มี "เลือกทั้งแถว" และ "เลือกทั้งคอลัมน์") / Supply Chain = ฟอร์ม Clearance
 *                 วันเริ่มขายแก้ที่รายการสินค้าหรือแผน NPD / Status คำนวณจาก calc.productStatus / แผงกฎ (พับ)
 *                 CR-20: ป้าย "Listing โดย Sales" ที่ช่องที่ระบบสร้าง Listing ให้เมื่อ Sales เพิ่ม SKU หรือสร้าง NPD (addedBy SALES) ให้ทีม Product ตรวจสอบ
 * อ่านจาก data/:  channels, settings, content (pages.productMaster, labels) + Master ผ่าน store.data()
 * store อ่าน:     app.planYear, plan.<ปี>.topDown (.channels), master.products, master.listings, master.taxonomy,
 *                 master.accounts, master.territories, ui.productMaster.channel, ui.seriesFilter, ui.role
 * store เขียน:    master.listings, master.products (clearance) และ master.audit (ตอนกด บันทึก), ui.productMaster.channel, ui.seriesFilter
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var Perm = SP.core.permissions;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var store = SP.core.store;
  var h = C.h;
  var fill = C.fill;

  var query = '';
  var statusFilter = '';
  var itemFilter = 'SALE';

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function lkey(l) { return l.productKey + '|' + l.accountId; }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var cols = page.columns;
    var year = store.year();
    var data = store.data();
    var editing = false;
    var saved = { products: store.get('master.products'), listings: store.get('master.listings') };
    var draft = clone(saved);

    function countDiff() {
      var n = 0;
      draft.products.forEach(function (p) {
        var o = calc.findProduct(saved.products, calc.productKey(p));
        if (o && JSON.stringify(o.clearance || null) !== JSON.stringify(p.clearance || null)) n++;
      });
      var a = draft.listings.map(lkey), b = saved.listings.map(lkey);
      n += a.filter(function (k) { return b.indexOf(k) < 0; }).length + b.filter(function (k) { return a.indexOf(k) < 0; }).length;
      return n;
    }
    function dirty() { return editing ? countDiff() : 0; }
    C.guardUnsaved(dirty);
    // CR-21: Listing = สิทธิ์ของหน้า · Clearance = สิทธิ์ย่อย listing.clearance (ตารางสิทธิ์) / ป้ายในโหมดแก้ไขตามสิทธิ์ที่มี
    function canListing() { return editing && Perm.can(Perm.user(), 'listing'); }
    function canClearance() { return editing && Perm.can(Perm.user(), 'listing.clearance'); }
    function roleHint() { return [canListing() ? page.roleHint.product : null, canClearance() ? page.roleHint.supply : null].filter(Boolean).join(' · '); }

    var bar = C.workflowBar({
      simple: true,
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); draw(); },
      onSave: function () {
        var by = C.roleName(store.role()), at = new Date().toISOString();
        var entries = [];
        draft.products.forEach(function (p) {
          var o = calc.findProduct(saved.products, calc.productKey(p));
          if (o && JSON.stringify(o.clearance || null) !== JSON.stringify(p.clearance || null)) {
            entries.push({ entity: 'product', key: calc.productKey(p), field: 'clearance', oldValue: o.clearance || null, newValue: p.clearance || null, by: by, at: at });
            p.updatedAt = at;
          }
        });
        var a = draft.listings.map(lkey), b = saved.listings.map(lkey);
        a.filter(function (k) { return b.indexOf(k) < 0; }).forEach(function (k) { var x = k.split('|'); entries.push({ entity: 'product', key: x[0], field: 'listing', oldValue: null, newValue: x[1], by: by, at: at }); });
        b.filter(function (k) { return a.indexOf(k) < 0; }).forEach(function (k) { var x = k.split('|'); entries.push({ entity: 'product', key: x[0], field: 'listing', oldValue: x[1], newValue: null, by: by, at: at }); });
        store.set('master.products', draft.products);
        store.set('master.listings', draft.listings);
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
      var tax = store.get('master.taxonomy');
      var planChannels = (store.get(store.planKey('topDown')).channels || []).map(function (id) { return calc.findById(SP.data.channels, id); }).filter(Boolean);
      var ch = calc.findById(planChannels, store.get('ui.productMaster.channel')) || planChannels[0] || null;
      var current = editing ? draft : saved;
      var seriesOptions = calc.seriesList(tax, current.products);
      var series = (store.get('ui.seriesFilter') || []).filter(function (s) { return seriesOptions.some(function (o) { return o.value === s; }); });

      // ---------- แถบเครื่องมือ ----------
      var search = h('input', { type: 'search', class: 'search-input', placeholder: page.searchPlaceholder, 'aria-label': page.searchPlaceholder, value: query });
      search.addEventListener('input', function () { query = search.value; renderTable(); });
      root.appendChild(h('div', { class: 'tool-row pm-toolbar' },
        ch ? C.segmented({
          label: L.picker.channel, value: ch.id,
          options: planChannels.map(function (c) { return { value: c.id, label: c.name, title: c.fullName }; }),
          onChange: function (v) { store.set('ui.productMaster.channel', v); draw(); }
        }) : null,
        search,
        C.seriesFilter({ options: seriesOptions, value: series, onChange: function (v) { store.set('ui.seriesFilter', v); draw(); } }),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.statusFilter),
          C.select({ label: page.statusFilter, value: statusFilter, onChange: function (v) { statusFilter = v; renderTable(); },
            options: [{ value: '', label: page.statusAll }].concat(['planned', 'new', 'active', 'clearance', 'discontinued'].map(function (s) { return { value: s, label: L.status[s] }; })) })),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.itemTypeFilter),
          C.select({ label: page.itemTypeFilter, value: itemFilter, onChange: function (v) { itemFilter = v; renderTable(); },
            options: [{ value: '', label: page.itemTypeAll }].concat(SP.data.settings.ITEM_TYPES.map(function (t) { return { value: t, label: L.itemTypes[t] }; })) })),
        editing ? h('span', { class: 'master-hint' }, roleHint()) : h('span', { class: 'master-hint' }, page.launchHint)));

      var banner = editing ? C.editBanner() : null;
      if (banner) root.appendChild(banner);
      root.appendChild(C.rulesPanel());
      var slot = h('div', { class: 'card fit-card pm-card' });
      root.appendChild(slot);

      function renderTable() {
        var products = current.products;
        var listings = current.listings;
        var units = ch ? calc.unitsOfChannel(data, ch.id, true) : [];
        var q = query.trim().toLowerCase();
        var shown = products.filter(function (p) {
          var tx = calc.productTaxonomy(tax, p);
          var text = (calc.productKey(p) + ' ' + p.name + ' ' + tx.series + ' ' + tx.subSeries).toLowerCase();
          return (!q || text.indexOf(q) >= 0) && (!statusFilter || calc.planYearStatus(p, year) === statusFilter) &&
            (!itemFilter || (p.itemType || 'SALE') === itemFilter) && calc.inSeries(p, series);
        });

        function columnBox(u) {
          if (!canListing() || !shown.length) return null;
          var all = shown.every(function (p) { return calc.isListed(listings, calc.productKey(p), u.id); });
          var box = h('input', { type: 'checkbox', checked: all, 'aria-label': fill(page.selectColumn, { unit: u.name }), title: fill(page.selectColumn, { unit: u.name }) });
          box.addEventListener('change', function () {
            shown.forEach(function (p) { setListed(calc.productKey(p), u.id, box.checked); });
            renderTable();
          });
          return h('label', { class: 'pm-check pm-col-all' }, box);
        }

        var unitLabel = ch ? ch.unitLabel : '';
        var thead = h('thead', null,
          h('tr', { class: 'pm-group-head' },
            h('th', { class: 'pm-sku' }), h('th'), h('th'),
            h('th', { class: 'pm-acc-group', colspan: String(Math.max(1, units.length)) }, ch ? fill(cols.listing, { unit: unitLabel, channel: ch.name }) : ''),
            h('th'), h('th')),
          h('tr', null,
            h('th', { class: 'pm-sku', scope: 'col' }, cols.sku),
            h('th', { scope: 'col' }, cols.launch),
            h('th', { scope: 'col' }, fill(cols.status, { year: year })),
            units.length ? units.map(function (u) { return h('th', { class: 'pm-acc', scope: 'col', title: u.name }, h('span', { class: 'pm-acc-name' }, u.name), columnBox(u)); })
              : h('th', { class: 'pm-acc' }, page.noUnits),
            h('th', { scope: 'col', class: 'pm-cl-head' }, cols.clearance, ' ', h('span', { class: 'history-tag' }, page.clearanceOwner)),
            h('th', { scope: 'col' }, cols.discontinue)));
        var tbody = h('tbody', null, shown.length ? shown.map(function (p) { return row(p, listings, units, tax); })
          : h('tr', null, h('td', { class: 'pm-empty', colspan: String(Math.max(1, units.length) + 5) }, page.noMatch)));
        C.clear(slot).appendChild(h('div', { class: 'fit-scroll pm-scroll' }, h('table', { class: 'pm-table' + (editing ? ' is-editing' : '') }, thead, tbody)));
        if (banner) banner.update(dirty());
      }

      function setListed(key, unitId, on) {
        draft.listings = draft.listings.filter(function (l) { return !(l.productKey === key && l.accountId === unitId); });
        if (on) draft.listings.push({ productKey: key, accountId: unitId });
      }

      function row(p, listings, units, tax) {
        var key = calc.productKey(p);
        var original = calc.findProduct(saved.products, key);
        var tx = calc.productTaxonomy(tax, p);
        var listedCount = calc.listedAccounts(listings, key).length;
        var cl = p.clearance;
        var segs = calc.statusSegments(p, year);
        var status = calc.planYearStatus(p, year);
        var clText = cl ? fill(page.clearanceText, { from: F.date(cl.fromMonth), to: F.date(cl.toMonth), stock: F.units(cl.stockQty) }) : page.clearanceNone;
        var clChanged = editing && original && JSON.stringify(original.clearance || null) !== JSON.stringify(cl || null);
        var clCell;
        if (canClearance()) {
          clCell = h('button', { type: 'button', class: 'btn btn-ghost btn-sm pm-cl-btn' + (clChanged ? ' is-dirty-cell' : ''), title: page.clearanceEdit }, clText);
          C.popover(clCell, function (close) { return clearanceForm(p, close); }, { className: 'pm-cl-popover', label: page.clearanceEdit });
        } else {
          clCell = h('span', { class: 'pm-cl-text' + (clChanged ? ' is-dirty-cell' : ''), title: page.clearanceStockNote }, clText);
        }

        var rowBox = null;
        if (canListing() && units.length) {
          var allOn = units.every(function (u) { return calc.isListed(listings, key, u.id); });
          var rb = h('input', { type: 'checkbox', checked: allOn, 'aria-label': page.selectRow + ' ' + key, title: page.selectRow });
          rb.addEventListener('change', function () { units.forEach(function (u) { setListed(key, u.id, rb.checked); }); renderTable(); });
          rowBox = h('label', { class: 'pm-check pm-row-all' }, rb);
        }

        return h('tr', null,
          h('th', { class: 'pm-sku', scope: 'row', title: p.note || '' },
            h('span', { class: 'pm-sku-line' }, C.productThumb(p, tax, { size: 'sm' }),
              h('span', { class: 'pm-sku-text' },
                h('span', null, h('span', { class: 'pm-sku-code' }, key), ' ', h('span', { class: 'pm-sku-name', title: p.name }, p.name)),
                h('span', { class: 'pm-sub' }, [tx.series, tx.subSeries, fill(page.listedCount, { n: listedCount })].filter(Boolean).join(' · '))),
              rowBox)),
          h('td', null, p.launchDate ? F.date(p.launchDate) : '–'),
          h('td', { class: 'pm-status', title: segs.map(function (sg) { return F.monthRange(sg.from, sg.to) + ' ' + L.status[sg.status]; }).join(' · ') },
            C.statusBadge(status), segs.length > 1 ? h('span', { class: 'pm-seg-note' }, '→ ' + segs.slice(1).map(function (sg) { return L.status[sg.status]; }).join(' → ')) : null),
          units.length ? units.map(function (u) {
            var listed = calc.isListed(listings, key, u.id);
            var tag = listed ? salesTag(listings, key, u) : null;   // CR-20: Listing โดย Sales (ให้ทีม Product ตรวจสอบ)
            if (!canListing()) return h('td', { class: 'pm-acc' + (listed ? ' is-listed' : '') }, listed ? h('span', { class: 'pm-mark', title: key + ' · ' + u.name }, page.listedMark) : null, tag);
            var was = calc.isListed(saved.listings, key, u.id);
            var box = h('input', { type: 'checkbox', checked: listed, 'aria-label': key + ' · ' + u.name });
            box.addEventListener('change', function () { setListed(key, u.id, box.checked); renderTable(); });
            return h('td', { class: 'pm-acc' + (was !== listed ? ' is-dirty-cell' : '') }, h('label', { class: 'pm-check' }, box), tag);
          }) : h('td', { class: 'pm-acc' }),
          h('td', { class: 'pm-cl' }, clCell),
          h('td', null, p.discontinueMonth ? F.date(p.discontinueMonth) : h('span', { class: 'muted' }, page.discontinueNone)));
      }

      // CR-20: ป้าย Listing โดย Sales + Tooltip ผู้เพิ่ม · วันที่ · เดือนเริ่มขาย
      function salesTag(listings, key, u) {
        var rec = listings.filter(function (l) { return l.productKey === key && l.accountId === u.id; })[0];
        if (!rec || rec.addedBy !== 'SALES') return null;
        return h('span', { class: 'badge tag-warn pm-by-sales', title: fill(page.bySalesTip, { unit: u.name, by: rec.addedByName || '–', date: rec.addedAt ? F.date(rec.addedAt.slice(0, 10)) : '–', from: rec.fromMonth ? F.date(rec.fromMonth) : '–' }) },
          page.bySales);
      }

      // ฟอร์ม Clearance (Supply Chain): ช่วงเดือน + Stock → เขียนลง draft
      function clearanceForm(p, close) {
        var cl = p.clearance || {};
        var from = h('input', { type: 'month', class: 'pm-input pm-month', value: cl.fromMonth || '', 'aria-label': page.clearanceFrom });
        var to = h('input', { type: 'month', class: 'pm-input pm-month', value: cl.toMonth || '', 'aria-label': page.clearanceTo });
        var stock = h('input', { type: 'number', class: 'pm-input pm-stock', min: '0', step: '1', value: cl.stockQty != null ? String(cl.stockQty) : '', 'aria-label': page.clearanceStock });
        var msg = h('p', { class: 'pm-msg', role: 'status' });
        return [
            h('h3', { class: 'popover-title' }, fill(page.clearanceTitle, { sku: calc.productKey(p) })),
            h('div', { class: 'pm-cl-form' },
              h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.clearanceFrom), from),
              h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.clearanceTo), to),
              h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.clearanceStock), stock)),
            h('p', { class: 'muted small' }, page.clearanceStockNote),
            msg,
            h('div', { class: 'dlg-actions' },
              h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: function () { setClearance(p, null); close(); draw(); } }, page.clearanceClear),
              h('button', { type: 'button', class: 'btn btn-primary btn-sm pm-cl-save', onClick: function () {
                if (!from.value || !to.value || to.value < from.value) { msg.className = 'pm-msg is-error'; msg.textContent = page.clearanceError; return; }
                setClearance(p, { fromMonth: from.value, toMonth: to.value, stockQty: Math.max(0, Math.round(Number(stock.value) || 0)) });
                close();
                draw();
              } }, page.clearanceSave))
        ];
      }

      function setClearance(p, value) {
        var d = calc.findProduct(draft.products, calc.productKey(p));
        if (d) d.clearance = value;
      }

      renderTable();
    }

    draw();
  }

  SP.modules.productMaster = { render: render };
})(window.SP);
