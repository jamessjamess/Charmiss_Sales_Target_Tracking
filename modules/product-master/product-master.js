/*
 * modules/product-master/product-master.js — Product Master · Listing (CR-30 รอบ 3: สถานะและช่วงเวลา Listing ต่อหน่วยขาย · แทน Checkbox เดิม)
 *
 * หน้าที่:        หัวหน้า: ข้อมูล ณ เดือน [▾] (ค่าเริ่มต้น = SP.core.clock) · ? (กฎ Status / วิธีเติมยอด) · ส่งออก ▾ · แก้ไข
 *                 แถบเครื่องมือ: แท็บ Channel ที่ใช้งาน (จำที่ ui.productMaster.channel) · ค้นหา · Series (ร่วมกับหน้าวางแผน SKU) · Status ·
 *                   สถานะ Listing (หลายค่า) · อายุ (นิยามเดียวกับ SKU Planning · calc.ageMatch) · ☐ ไม่มียอด ≥ 3 เดือน (ประเมินการถอด Shelf)
 *                 ตาราง 1 แถวต่อ SKU: SKU (ชื่อสั้น · Code · Series · Badge Status / Discontinued {เดือน}) · ความครอบคลุม (วางขาย x / หน่วยขายที่ใช้งานใน Channel) ·
 *                   ช่องหน่วยขาย 2 บรรทัด (สัญลักษณ์ ✓ วางขาย · ◌ เสนอขาย · ✕ ถอดแล้ว + เดือนเริ่ม / อายุการขายในหน่วยหรือ ไม่มียอด nด) · Clearance
 *                   หัวคอลัมน์หน่วยขาย = ชื่อ + จำนวน SKU ที่วางขาย ณ เดือนที่เลือก · แท็บเขต = คอลัมน์เขตการขาย
 *                 แก้ไข (สิทธิ์ listing): คลิกช่อง → Popover สถานะ · เดือนเริ่ม · เดือนถอด · ประวัติ · เลือกทั้งแถว / คอลัมน์ / Series ในหน่วยขาย ·
 *                   Shift / Ctrl + คลิก = เลือกหลายช่อง → วางขายตั้งแต่… · ถอดตั้งแต่… · เสนอขาย · ถอดสินค้าที่ยังมีแผนหลังเดือนถอด = กล่องยืนยันบอกจำนวนชิ้นและ Net Sales
 *                   Clearance (สิทธิ์ listing.clearance · Supply Chain) คงเดิม · ป้าย Listing โดย Sales (CR-20)
 *                 กฎ Listing / ล็อกช่องใน SKU Planning อยู่ที่ core/calc.js (listingOf · listedInYear · listingOutside · setListing · listingCoverage · plannedAfter)
 * อ่านจาก data/:  channels, settings, content (pages.productMaster, labels) + Master ผ่าน store.data()
 * store อ่าน:     master.products, master.listings, master.taxonomy, master.accounts, master.territories, master.audit, plan.<ปี>.sku.<unit>,
 *                 ui.productMaster.channel, ui.seriesFilter, ui.role
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

  var STATUSES = ['listed', 'offered', 'delisted'];
  var query = '';
  var statusFilter = '';
  var listingFilter = [];
  var ageFilter = '';
  var noSaleOnly = false;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function ckey(key, unitId) { return key + '|' + unitId; }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var K = SP.core.clock;
    var data = store.data();
    var nowKey = K.currentMonth();
    var month = nowKey;
    var planYears = SP.data.settings.PLAN_YEARS;
    var months = [];
    for (var y = Number(nowKey.slice(0, 4)) - 1; y <= Math.max.apply(null, planYears); y++) for (var mm = 0; mm < 12; mm++) months.push(calc.monthKey(y, mm));
    var editing = false;
    var saved = { products: store.get('master.products'), listings: store.get('master.listings') };
    var draft = clone(saved);
    var sel = {};                 // ช่องที่เลือก 'key|unitId'
    var ageCache = {};

    function cur() { return editing ? draft : saved; }
    function listingSig(l) { return l ? [l.status || 'listed', l.fromMonth || '', l.toMonth || ''].join('|') : ''; }
    function changedListings() {
      var keys = {};
      saved.listings.concat(draft.listings).forEach(function (l) { keys[ckey(l.productKey, l.accountId)] = true; });
      return Object.keys(keys).filter(function (k) {
        var x = k.split('|');
        return listingSig(calc.listingOf(saved.listings, x[0], x[1])) !== listingSig(calc.listingOf(draft.listings, x[0], x[1]));
      });
    }
    function countDiff() {
      var n = 0;
      draft.products.forEach(function (p) {
        var o = calc.findProduct(saved.products, calc.productKey(p));
        if (o && JSON.stringify(o.clearance || null) !== JSON.stringify(p.clearance || null)) n++;
      });
      return n + changedListings().length;
    }
    function dirty() { return editing ? countDiff() : 0; }
    C.guardUnsaved(dirty);
    // CR-21: Listing = สิทธิ์ของหน้า · Clearance = สิทธิ์ย่อย listing.clearance
    function canListing() { return editing && Perm.can(Perm.user(), 'listing'); }
    function canClearance() { return editing && Perm.can(Perm.user(), 'listing.clearance'); }
    function roleHint() { return [canListing() ? page.roleHint.product : null, canClearance() ? page.roleHint.supply : null].filter(Boolean).join(' · '); }
    function unitName(id) { var i = calc.unitInfo(data, id); return i ? i.unit.name : id; }
    function statusText(l) { return l ? page.listing.statuses[calc.listingStatus(l)] : page.listing.statuses.none; }
    function listingText(l) {
      if (!l) return page.listing.statuses.none;
      var st = calc.listingStatus(l);
      return statusText(l) + (l.fromMonth ? ' · ' + fill(page.listing.fromText, { month: F.date(l.fromMonth) }) : '') + (st === 'delisted' && l.toMonth ? ' · ' + fill(page.listing.toText, { month: F.date(l.toMonth) }) : '');
    }

    var picker = C.monthPicker({
      label: page.month.label, tip: page.month.tip, value: month, months: months, current: nowKey, currentLabel: page.month.current,
      guard: function () { return true; }, onChange: function (k) { month = k; draw(); }
    });
    var exportBtn = C.exportButton({ unsaved: dirty, build: exportSpec });
    var bar = C.workflowBar({
      simple: true, extra: exportBtn,
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); sel = {}; draw(); },
      onSave: save,
      onCancel: function () { editing = false; draft = clone(saved); sel = {}; draw(); }
    });
    if (ctx.intro) {
      var h1 = ctx.intro.querySelector('h1');
      ctx.intro.insertBefore(picker, h1 ? h1.nextSibling : ctx.intro.firstChild);
      ctx.intro.appendChild(bar);
    }
    // กล่องคำอธิบายสถานะและวิธีเติมยอดเดิม → ปุ่ม ?
    if (ctx.addHelp) ctx.addHelp(page.rulesHelp, function () { return C.rulesPanel(); });

    function save() {
      var by = C.roleName(store.role()), at = new Date().toISOString();
      var entries = [];
      draft.products.forEach(function (p) {
        var o = calc.findProduct(saved.products, calc.productKey(p));
        if (o && JSON.stringify(o.clearance || null) !== JSON.stringify(p.clearance || null)) {
          entries.push({ entity: 'product', key: calc.productKey(p), field: 'clearance', oldValue: o.clearance || null, newValue: p.clearance || null, by: by, at: at });
          p.updatedAt = at;
        }
      });
      changedListings().forEach(function (k) {
        var x = k.split('|');
        entries.push({ entity: 'listing', key: k, field: 'listing', oldValue: listingText(calc.listingOf(saved.listings, x[0], x[1])), newValue: listingText(calc.listingOf(draft.listings, x[0], x[1])), by: by, at: at });
      });
      store.set('master.products', draft.products);
      store.set('master.listings', draft.listings);
      store.appendAudit(entries);
      saved = clone(draft);
      editing = false;
      sel = {};
      draw();
    }

    function channels() { return SP.data.channels.filter(function (c) { return c.active !== false; }).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); }
    function ageOf(key, unitId) {
      var k = ckey(key, unitId);
      if (!(k in ageCache)) ageCache[k] = calc.salesAge(data, key, unitId, { master: cur(), channel: false });
      return ageCache[k];
    }
    function ageText(n) {
      var A = page.listing.age;
      var y = Math.floor(n / 12), m = n % 12;
      return y ? (m ? fill(A.yearsMonths, { y: y, m: m }) : fill(A.years, { y: y })) : fill(A.months, { m: m });
    }

    // =====================================================================
    function draw() {
      C.clear(root);
      bar.update();
      ageCache = {};
      var tax = store.get('master.taxonomy');
      var chs = channels();
      var ch = calc.findById(chs, store.get('ui.productMaster.channel')) || chs[0] || null;
      var c = cur();
      var seriesOptions = calc.seriesList(tax, c.products);
      var series = (store.get('ui.seriesFilter') || []).filter(function (s) { return seriesOptions.some(function (o) { return o.value === s; }); });
      var X = page.listing;

      // ---------- แถบเครื่องมือ ----------
      var search = h('input', { type: 'search', class: 'search-input pm-search', placeholder: page.searchPlaceholder, 'aria-label': page.searchPlaceholder, value: query });
      search.addEventListener('input', function () { query = search.value; renderTable(); });
      var noSaleBox = h('input', { type: 'checkbox', checked: noSaleOnly, onChange: function (e) { noSaleOnly = e.target.checked; renderTable(); } });
      root.appendChild(h('div', { class: 'tool-row pm-toolbar' },
        ch ? C.segmented({
          label: L.picker.channel, value: ch.id,
          options: chs.map(function (x) { return { value: x.id, label: x.name, title: x.fullName }; }),
          onChange: function (v) { store.set('ui.productMaster.channel', v); sel = {}; draw(); }
        }) : null,
        search,
        C.seriesFilter({ options: seriesOptions, value: series, onChange: function (v) { store.set('ui.seriesFilter', v); draw(); } }),
        C.select({ label: page.statusFilter, value: statusFilter, className: 'pm-f-status', onChange: function (v) { statusFilter = v; renderTable(); },
          options: [{ value: '', label: page.statusAll }].concat(['planned', 'new', 'active', 'clearance', 'discontinued'].map(function (s) { return { value: s, label: L.status[s] }; })) }),
        C.multiSelect({ label: X.filter, allLabel: X.filterAll, selected: X.filterSelected, clear: L.series.clear, empty: L.series.empty,
          options: STATUSES.concat(['none']).map(function (s) { return { value: s, label: X.statuses[s] }; }), value: listingFilter, onChange: function (v) { listingFilter = v; renderTable(); } }),
        C.select({ label: X.ageFilter, value: ageFilter, className: 'pm-f-age', onChange: function (v) { ageFilter = v; renderTable(); },
          options: ['', 'le1y', 'y1to2', 'gt2y'].map(function (v) { return { value: v, label: v ? X.ageOptions[v] : X.ageAll }; }) }),
        h('label', { class: 'pm-nosale', title: fill(X.noSaleTip, { n: SP.data.settings.NO_SALE_WARN_MONTHS }) }, noSaleBox, ' ', fill(X.noSale, { n: SP.data.settings.NO_SALE_WARN_MONTHS })),
        editing ? h('span', { class: 'master-hint' }, roleHint()) : null));

      var banner = editing ? C.editBanner() : null;
      if (banner) root.appendChild(banner);
      var slot = h('div', { class: 'card fit-card pm-card' });
      root.appendChild(slot);
      var selSlot = h('div', { class: 'pm-sel-slot' });
      root.appendChild(selSlot);

      function renderTable() {
        c = cur();
        var products = c.products;
        var listings = c.listings;
        var units = ch ? calc.unitsOfChannel(data, ch.id, true) : [];
        var q = query.trim().toLowerCase();
        var shown = products.filter(function (p) {
          var key = calc.productKey(p);
          var tx = calc.productTaxonomy(tax, p);
          var text = (key + ' ' + p.name + ' ' + (p.shortName || '') + ' ' + tx.series + ' ' + tx.subSeries).toLowerCase();
          if (q && text.indexOf(q) < 0) return false;
          if (statusFilter && calc.productStatus(p, month) !== statusFilter) return false;
          if (!calc.inSeries(p, series)) return false;
          if (listingFilter.length && !units.some(function (u) { var l = calc.listingOf(listings, key, u.id); return listingFilter.indexOf(l ? calc.listingStatus(l) : 'none') >= 0; })) return false;
          if (ageFilter || noSaleOnly) {
            if (!units.some(function (u) { return calc.listingOf(listings, key, u.id) && calc.ageMatch(ageOf(key, u.id), ageFilter, noSaleOnly); })) return false;
          }
          return true;
        });
        var unitLabel = ch ? ch.unitLabel : '';
        function colCount(u) { return products.filter(function (p) { return calc.listingCoverage(listings, calc.productKey(p), [u], month).listed; }).length; }
        function columnBtn(u) {
          if (!canListing() || !shown.length) return null;
          return h('button', { type: 'button', class: 'link-btn pm-col-all', title: fill(page.selectColumn, { unit: u.name }), onClick: function () {
            shown.forEach(function (p) { sel[ckey(calc.productKey(p), u.id)] = true; }); renderTable();
          } }, page.selectShort);
        }
        var thead = h('thead', null,
          h('tr', { class: 'pm-group-head' },
            h('th', { class: 'pm-sku' }), h('th'),
            h('th', { class: 'pm-acc-group', colspan: String(Math.max(1, units.length)) }, ch ? fill(page.columns.listing, { unit: unitLabel, channel: ch.name }) : ''),
            h('th')),
          h('tr', null,
            h('th', { class: 'pm-sku', scope: 'col' }, page.columns.sku),
            h('th', { class: 'pm-cov', scope: 'col', title: X.coverageTip }, page.columns.coverage),
            units.length ? units.map(function (u) {
              return h('th', { class: 'pm-acc', scope: 'col', title: u.name + ' · ' + fill(X.countTip, { n: colCount(u), month: F.date(month) }) },
                h('span', { class: 'pm-acc-name' }, String(u.name).split(' · ')[0]), h('span', { class: 'pm-acc-count' }, fill(X.count, { n: colCount(u) })), columnBtn(u));
            }) : h('th', { class: 'pm-acc' }, page.noUnits),
            h('th', { scope: 'col', class: 'pm-cl-head' }, page.columns.clearance, ' ', h('span', { class: 'history-tag' }, page.clearanceOwner))));
        var tbody = h('tbody', null, shown.length ? shown.map(function (p) { return row(p, listings, units, tax); })
          : h('tr', null, h('td', { class: 'pm-empty', colspan: String(Math.max(1, units.length) + 3) }, page.noMatch)));
        C.clear(slot).appendChild(h('div', { class: 'fit-scroll pm-scroll' }, h('table', { class: 'pm-table' + (editing ? ' is-editing' : '') }, thead, tbody)));
        if (banner) banner.update(dirty());
        C.clear(selSlot);
        var bar2 = selectionBar(units);
        if (bar2) selSlot.appendChild(bar2);
      }

      function row(p, listings, units, tax) {
        var key = calc.productKey(p);
        var original = calc.findProduct(saved.products, key);
        var tx = calc.productTaxonomy(tax, p);
        var status = calc.productStatus(p, month);
        var cov = calc.listingCoverage(listings, key, units, month);
        var cl = p.clearance;
        var clText = cl ? fill(page.clearanceText, { from: F.date(cl.fromMonth), to: F.date(cl.toMonth), stock: F.units(cl.stockQty) }) : page.clearanceNone;
        var clChanged = editing && original && JSON.stringify(original.clearance || null) !== JSON.stringify(cl || null);
        var clCell;
        if (canClearance()) {
          clCell = h('button', { type: 'button', class: 'btn btn-ghost btn-sm pm-cl-btn' + (clChanged ? ' is-dirty-cell' : ''), title: page.clearanceEdit }, clText);
          C.popover(clCell, function (close) { return clearanceForm(p, close); }, { className: 'pm-cl-popover', label: page.clearanceEdit });
        } else {
          clCell = h('span', { class: 'pm-cl-text' + (clChanged ? ' is-dirty-cell' : ''), title: page.clearanceStockNote }, clText);
        }
        var rowBtn = canListing() && units.length ? h('button', { type: 'button', class: 'link-btn pm-row-all', title: page.selectRow, onClick: function () {
          units.forEach(function (u) { sel[ckey(key, u.id)] = true; }); renderTable();
        } }, page.selectShort) : null;
        var badge = status === 'discontinued' && p.discontinueMonth ? h('span', { class: 'badge st-discontinued' }, fill(page.discontinuedAt, { month: F.date(p.discontinueMonth) })) : C.statusBadge(status);
        return h('tr', { dataset: { product: key } },
          h('th', { class: 'pm-sku', scope: 'row', title: p.name },
            h('span', { class: 'pm-sku-line' }, C.productThumb(p, tax, { size: 'sm' }),
              h('span', { class: 'pm-sku-text' },
                h('span', { class: 'pm-sku-name' }, calc.displayName ? calc.displayName(p) : p.name),
                h('span', { class: 'pm-sub' }, h('span', { class: 'pm-sku-code' }, key), tx.series ? ' · ' + tx.series : '', ' ', badge)),
              rowBtn)),
          h('td', { class: 'pm-cov num', title: fill(X.coverageRow, { x: cov.listed, y: cov.total }) }, cov.listed + '/' + cov.total),
          units.length ? units.map(function (u) { return unitCell(p, key, u, listings, tx); }) : h('td', { class: 'pm-acc' }),
          h('td', { class: 'pm-cl' }, clCell));
      }

      function unitCell(p, key, u, listings, tx) {
        var l = calc.listingOf(listings, key, u.id);
        var st = l ? calc.listingStatus(l) : null;
        var was = calc.listingOf(saved.listings, key, u.id);
        var changed = editing && listingSig(was) !== listingSig(l);
        var k = ckey(key, u.id);
        var line1 = l ? [h('span', { class: 'pm-mark is-' + st, 'aria-label': X.statuses[st] }, X.marks[st]), l.fromMonth ? h('span', { class: 'pm-from' }, K.label(l.fromMonth, true)) : null,
          st === 'delisted' && l.toMonth ? h('span', { class: 'pm-to' }, '– ' + K.label(l.toMonth, true)) : null] : null;
        var line2 = null;
        if (l && st !== 'offered') {
          var a = ageOf(key, u.id);
          if (a && a.started) line2 = a.noSale ? h('span', { class: 'pm-nosale-tag' }, fill(X.noSaleTag, { n: a.monthsSinceLastSale })) : a.lastSaleMonth ? h('span', { class: 'pm-age' }, ageText(a.sellingMonths)) : null;
        }
        var tag = l && l.addedBy === 'SALES' ? h('span', { class: 'badge tag-warn pm-by-sales', title: fill(page.bySalesTip, { unit: u.name, by: l.addedByName || '–', date: l.addedAt ? F.date(l.addedAt.slice(0, 10)) : '–', from: l.fromMonth ? F.date(l.fromMonth) : '–' }) }, page.bySales) : null;
        var td = h('td', { class: 'pm-acc' + (l ? ' has-' + st : '') + (changed ? ' is-dirty-cell' : '') + (sel[k] ? ' is-picked' : ''), dataset: { cell: k },
          title: u.name + ' · ' + listingText(l), tabindex: canListing() ? '0' : null },
          h('span', { class: 'pm-cell-1' }, line1), h('span', { class: 'pm-cell-2' }, line2, tag));
        if (canListing()) {
          // Shift / Ctrl + คลิก = เลือกช่อง (ลงทะเบียนก่อน Popover เพื่อหยุดไม่ให้ Popover เปิด)
          td.addEventListener('click', function (e) {
            if (!(e.shiftKey || e.ctrlKey || e.metaKey)) return;
            e.stopImmediatePropagation();
            if (sel[k]) delete sel[k]; else sel[k] = true;
            renderTable();
          });
          var pop = C.popover(td, function (close) { return cellForm(p, key, u, tx, close); }, { className: 'pm-l-popover', label: fill(X.popover.title, { sku: key, unit: u.name }), align: 'left' });
          td.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!pop.isOpen()) pop.open(); } });
        }
        return td;
      }

      // Popover ของช่อง: สถานะ · เดือนเริ่ม · เดือนถอด · ประวัติ · ทางลัดเลือก
      function cellForm(p, key, u, tx, close) {
        var P = X.popover;
        var l = calc.listingOf(draft.listings, key, u.id);
        var status = l ? calc.listingStatus(l) : 'none';
        var from = h('input', { type: 'month', class: 'pm-input pm-month pm-l-from', value: (l && l.fromMonth) || month, 'aria-label': P.from });
        var to = h('input', { type: 'month', class: 'pm-input pm-month pm-l-to', value: (l && l.toMonth) || month, 'aria-label': P.to });
        var toField = h('label', { class: 'field pm-l-to-field', hidden: status !== 'delisted' }, h('span', { class: 'field-label' }, P.to), to);
        var msg = h('p', { class: 'pm-msg', role: 'status' });
        var seg = C.segmented({ label: P.status, value: status, options: ['none'].concat(STATUSES).map(function (s) { return { value: s, label: X.statuses[s] }; }),
          onChange: function (v) { status = v; toField.hidden = v !== 'delisted'; } });
        var hist = M().historyOf(store.get('master.audit'), [{ entity: 'listing', key: ckey(key, u.id) }]).slice(0, 5);
        return [h('h3', { class: 'popover-title' }, fill(P.title, { sku: key, unit: u.name })),
            h('div', { class: 'pm-l-form' }, seg, h('label', { class: 'field' }, h('span', { class: 'field-label' }, P.from), from), toField), msg,
            h('div', { class: 'pm-l-shortcuts' },
              h('button', { type: 'button', class: 'link-btn', onClick: function () { close(); selectRow(key); } }, page.selectRow),
              h('button', { type: 'button', class: 'link-btn', onClick: function () { close(); selectColumn(u.id); } }, fill(P.column, { unit: u.name })),
              tx.series ? h('button', { type: 'button', class: 'link-btn', onClick: function () { close(); selectSeries(p.seriesId, u.id); } }, fill(P.series, { series: tx.series, unit: u.name })) : null),
            hist.length ? h('ol', { class: 'wf-history pm-l-history' }, hist.map(function (e) { return h('li', null, h('span', { class: 'wf-history-when' }, e.at ? F.dateTime(e.at) : ''), h('span', { class: 'wf-history-what' }, (e.oldValue || '–') + ' → ' + (e.newValue || '–'))); })) : null,
            h('div', { class: 'dlg-actions' }, h('button', { type: 'button', class: 'btn btn-primary btn-sm pm-l-apply', onClick: function () {
              if (status !== 'none' && !from.value) { msg.className = 'pm-msg is-error'; msg.textContent = P.errorFrom; return; }
              if (status === 'delisted' && (!to.value || to.value < from.value)) { msg.className = 'pm-msg is-error'; msg.textContent = P.errorTo; return; }
              close();
              applyListing([ckey(key, u.id)], status === 'none' ? null : { status: status, fromMonth: from.value, toMonth: status === 'delisted' ? to.value : null });
            } }, P.apply))];
      }
      function selectRow(key) { (ch ? calc.unitsOfChannel(data, ch.id, true) : []).forEach(function (u) { sel[ckey(key, u.id)] = true; }); renderTable(); }
      function selectColumn(unitId) { cur().products.forEach(function (p) { sel[ckey(calc.productKey(p), unitId)] = true; }); renderTable(); }
      function selectSeries(seriesId, unitId) { cur().products.filter(function (p) { return p.seriesId === seriesId; }).forEach(function (p) { sel[ckey(calc.productKey(p), unitId)] = true; }); renderTable(); }

      // ตั้ง Listing หลายช่อง · ถอดสินค้าที่ยังมีแผนหลังเดือนถอด → กล่องยืนยัน (แจ้งเท่านั้น)
      function applyListing(keys, value, perCell) {
        var warn = { units: 0, net: 0 };
        keys.forEach(function (k) {
          var x = k.split('|');
          var v = perCell ? perCell(x[0], x[1]) : value;
          if (!v || v.status !== 'delisted' || !v.toMonth) return;
          var toY = Number(v.toMonth.slice(0, 4));
          planYears.filter(function (yy) { return yy >= toY; }).forEach(function (yy) {
            var plan = store.get('plan.' + yy + '.sku.' + x[1]);
            if (!plan || !plan.items || !plan.items[x[0]]) return;
            var grid = calc.skuPlanGrid(data, store.master(), x[1], plan, { year: yy, mode: 'initial' });
            var a = calc.plannedAfter(grid, x[0], yy, v.toMonth);
            warn.units += a.units; warn.net += a.net;
          });
        });
        function commit() {
          keys.forEach(function (k) { var x = k.split('|'); draft.listings = calc.setListing(draft.listings, x[0], x[1], perCell ? perCell(x[0], x[1]) : value); });
          sel = {};
          renderTable();
        }
        if (warn.units > 0) {
          C.dialog({ title: X.delistWarnTitle, lines: [fill(X.delistWarn, { units: F.units(warn.units), amount: F.baht(warn.net) }), X.delistWarnNote], confirmLabel: X.delistConfirm })
            .then(function (r) { if (r.ok) commit(); });
        } else commit();
      }

      // ---------- แถบช่องที่เลือก (โหมดแก้ไข) ----------
      function selectionBar(units) {
        var keys = Object.keys(sel);
        if (!editing || !keys.length) return null;
        var S = X.selection;
        function monthDialog(title, label, cb) {
          var m = h('input', { type: 'month', class: 'pm-input pm-month pm-sel-month', value: month, 'aria-label': label });
          C.dialog({ title: title, body: h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), m), confirmLabel: S.confirm }).then(function (r) { if (r.ok && m.value) cb(m.value); });
        }
        return h('div', { class: 'pm-selection', role: 'status' },
          h('span', { class: 'pm-selection-text' }, fill(S.text, { n: keys.length })), h('span', { class: 'muted small' }, S.hint),
          h('button', { type: 'button', class: 'btn btn-primary btn-sm pm-sel-list', onClick: function () {
            monthDialog(S.listTitle, S.fromLabel, function (m) { applyListing(keys, { status: 'listed', fromMonth: m, toMonth: null }); });
          } }, S.list),
          h('button', { type: 'button', class: 'btn btn-secondary btn-sm pm-sel-delist', onClick: function () {
            monthDialog(S.delistTitle, S.toLabel, function (m) {
              var last = K.addMonths(m, -1);
              var ks = keys.filter(function (k) { var x = k.split('|'); return !!calc.listingOf(draft.listings, x[0], x[1]); });
              applyListing(ks, null, function (key, unitId) {
                var l = calc.listingOf(draft.listings, key, unitId);
                var from = l.fromMonth && l.fromMonth <= last ? l.fromMonth : last;
                return { status: 'delisted', fromMonth: from, toMonth: last };
              });
            });
          } }, S.delist),
          h('button', { type: 'button', class: 'btn btn-secondary btn-sm pm-sel-offer', onClick: function () {
            monthDialog(S.offerTitle, S.fromLabel, function (m) { applyListing(keys, { status: 'offered', fromMonth: m, toMonth: null }); });
          } }, S.offer),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm pm-sel-clear', onClick: function () { sel = {}; renderTable(); } }, S.clear));
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
    function M() { return SP.core.master; }

    // ---------- ส่งออก ▾ (Channel ที่เลือก · ตามตัวกรองค้นหา / Series / Status) ----------
    function exportSpec(source) {
      var X = page.listing;
      var c = source === 'draft' && editing ? draft : saved;
      var chs = channels();
      var ch = calc.findById(chs, store.get('ui.productMaster.channel')) || chs[0];
      var units = ch ? calc.unitsOfChannel(data, ch.id, true) : [];
      var tax = store.get('master.taxonomy');
      var rows = c.products.filter(function (p) { return !statusFilter || calc.productStatus(p, month) === statusFilter; });
      var st = C.exportStamp(null);
      return {
        filename: fill(page.exportFile, { channel: C.fileSafe(ch ? ch.name : ''), month: month, date: st.date }),
        sheets: [{
          name: page.exportSheet,
          header: C.exportHeader(store.year(), null, [[page.month.label, F.date(month)], [L.picker.channel, ch ? ch.name : '']]),
          columns: [
            { key: 'code', label: page.exportColumns.code, value: function (p) { return calc.productKey(p); }, width: 10 },
            { key: 'name', label: page.exportColumns.name, value: function (p) { return p.name; }, width: 36 },
            { key: 'series', label: page.exportColumns.series, value: function (p) { return calc.productTaxonomy(tax, p).series || ''; }, width: 18 },
            { key: 'status', label: page.exportColumns.status, value: function (p) { return L.status[calc.productStatus(p, month)]; }, width: 14 },
            { key: 'coverage', label: page.columns.coverage, value: function (p) { var cv = calc.listingCoverage(c.listings, calc.productKey(p), units, month); return cv.listed + '/' + cv.total; }, width: 10 }
          ].concat(units.map(function (u) {
            return { key: 'u-' + u.id, label: u.name, width: 22, value: function (p) { var l = calc.listingOf(c.listings, calc.productKey(p), u.id); return l ? listingText(l) : ''; } };
          })).concat([{ key: 'clearance', label: page.columns.clearance, width: 20, value: function (p) { var cl = p.clearance; return cl ? F.date(cl.fromMonth) + '–' + F.date(cl.toMonth) + ' · ' + cl.stockQty : ''; } }]),
          rows: rows
        }]
      };
    }

    draw();
  }

  SP.modules.productMaster = { render: render };
})(window.SP);
