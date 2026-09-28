/*
 * modules/promotions/promotions.js — Product Master · ราคาและ Promotion (CR-30 แทนหน้าราคาขายต่อ Account และปฏิทิน Promotion)
 *
 * หน้าที่:        แท็บ ราคาหลัก | Promotion Price (จำที่ ui.pricesTab)
 *                 ราคาหลัก: ราคา ณ เดือน [ก.ย. 2026 ▾] · ตาราง SKU (จัดกลุ่มตาม Series) × ประเภทราคา (settings.PRICE_TYPES) ·
 *                   ช่องที่เปลี่ยนในเดือนที่เลือกมีจุดเล็ก · คลิกช่อง → ประวัติราคา (เดือนที่มีผล · ราคา · ผู้บันทึก)
 *                   โหมดแก้ไข (สิทธิ์ prices.base): + บันทึกราคาใหม่ → เลือกเดือนที่มีผล (เดือนปัจจุบันหรืออนาคต) → กรอกเฉพาะ SKU ที่เปลี่ยน
 *                   หรือ นำเข้าจาก Excel (ตรวจก่อนยืนยัน: ค่าเดิม → ใหม่ · core/catalog.priceImportDiff)
 *                 Promotion Price: Channel (Segmented) · มุมมอง รายเดือน | ภาพรวมเดือน · Series · ค้นหา · ☐ ซ่อนหน่วยขายที่ไม่มีสินค้า Listing
 *                   รายเดือน = ระดับ (ทั้ง Channel หรือหน่วยขาย) × 12 เดือนของปีแผน · ภาพรวมเดือน = เดือนที่เลือก × (ทั้ง Channel + หน่วยขาย)
 *                   ช่อง: ราคาที่ได้รับมา (ตัวจาง · Tooltip ที่มา) · Promotion Price ที่ระดับนี้ (ตัวเข้ม พื้นอ่อน −x%) · ไม่ได้ Listing (พื้นเทา ว่าง)
 *                   โหมดแก้ไข (สิทธิ์ prices.promo ตาม Channel): Grid กลาง (components.gridKeys: วางจาก Excel · Ctrl+Z) · ลบค่า = ใช้ราคาที่ได้รับมา ·
 *                   เลือกหลายช่อง → ตั้งราคา… · ลด x% จากราคาหลัก · คัดลอกไปเดือน… · คัดลอกไปหน่วยขาย… · เตือน (ไม่บล็อก) สูงกว่า / ต่ำกว่าราคาหลักเกิน 50%
 *                 ราคาที่ใช้คำนวณในหน้าวางแผน SKU = calc.resolvePrice (Promotion ของหน่วยขาย → ของ Channel → ราคาหลัก)
 * อ่านจาก data/:  channels, settings, pricing (priceImport.columns), content (pages.promotionPrice, labels) + Master ผ่าน store.data()
 * store อ่าน:     master.basePrices, master.promoPrices, master.products, master.listings, master.taxonomy, master.accounts, master.territories,
 *                 app.planYear, ui.pricesTab, ui.productMaster.channel (ร่วมกับหน้า Listing), ui.seriesFilter, ui.role
 * store เขียน:    master.basePrices, master.promoPrices, master.audit (ตอนกด บันทึก) · ui.pricesTab, ui.productMaster.channel, ui.seriesFilter
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
  var promoView = 'monthly';   // 'monthly' | 'overview'
  var promoLevel = '';         // '' = ทั้ง Channel · unitId
  var promoMonth = null;       // 'YYYY-MM' ของมุมมองภาพรวมเดือน
  var hideEmpty = false;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function priceText(v) {
    if (v == null || !(v > 0)) return '–';
    return F.number(v, Math.abs(v - Math.round(v)) < 0.005 ? 0 : 2);
  }
  function pctText(diff) { return (diff < 0 ? '−' : '+') + F.pct(Math.abs(diff), 0); }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var S = SP.data.settings;
    var TYPES = S.PRICE_TYPES;
    var year = store.year();
    var now = SP.core.clock.currentMonth();
    var tab = store.get('ui.pricesTab') === 'promo' ? 'promo' : 'base';
    var baseMonth = now;
    var pending = null;   // เดือนที่มีผลของรอบบันทึกราคาใหม่ (โหมดแก้ไข)
    if (!promoMonth || promoMonth.slice(0, 4) !== String(year)) promoMonth = now.slice(0, 4) === String(year) ? now : calc.monthKey(year, 0);
    var editing = false;
    function snapshot() { return { basePrices: store.get('master.basePrices'), promoPrices: store.get('master.promoPrices') }; }
    var saved = snapshot();
    var draft = clone(saved);
    var undo = C.undoStack(S.UNDO_LIMIT);
    var tip = null, keys = null, lastCell = null, refs = null;

    function cur() { return editing ? draft : saved; }
    function byName() { return C.roleName(store.role()); }
    function canBase() { return editing && Perm.can(Perm.user(), 'prices.base'); }
    function canPromo(chId) { return editing && Perm.can(Perm.user(), 'prices.promo', { channelId: chId }); }
    function unitName(id) { var i = calc.unitInfo(store.data(), id); return i ? i.unit.name : id; }

    // ------------------------------------------------------------------ ความต่างก่อนบันทึก + Audit
    function baseDiff() {
      var a = {}, b = {}, out = [];
      function id(r) { return r.productKey + '|' + r.priceType + '|' + r.effectiveMonth; }
      saved.basePrices.forEach(function (r) { a[id(r)] = r; });
      draft.basePrices.forEach(function (r) { b[id(r)] = r; });
      Object.keys(b).forEach(function (k) { if (!a[k] || a[k].price !== b[k].price) out.push({ before: a[k] || null, after: b[k] }); });
      Object.keys(a).forEach(function (k) { if (!b[k]) out.push({ before: a[k], after: null }); });
      return out;
    }
    function promoDiff() {
      var a = {}, b = {}, out = [];
      function id(r) { return r.productKey + '|' + r.channelId + '|' + (r.unitId || '') + '|' + r.month; }
      saved.promoPrices.forEach(function (r) { a[id(r)] = r; });
      draft.promoPrices.forEach(function (r) { b[id(r)] = r; });
      Object.keys(b).forEach(function (k) { if (!a[k] || a[k].price !== b[k].price) out.push({ before: a[k] || null, after: b[k] }); });
      Object.keys(a).forEach(function (k) { if (!b[k]) out.push({ before: a[k], after: null }); });
      return out;
    }
    function dirty() { return editing ? baseDiff().length + promoDiff().length : 0; }
    C.guardUnsaved(dirty);

    function save() {
      var by = byName(), at = new Date().toISOString();
      var entries = [];
      baseDiff().forEach(function (d) {
        var r = d.after || d.before;
        entries.push({ entity: 'price', key: r.productKey, field: 'price', oldValue: d.before ? { priceType: r.priceType, price: d.before.price, effectiveMonth: r.effectiveMonth } : null,
          newValue: d.after ? { priceType: r.priceType, price: d.after.price, effectiveMonth: r.effectiveMonth } : null, by: by, at: at });
      });
      promoDiff().forEach(function (d) {
        var r = d.after || d.before;
        var level = r.unitId ? unitName(r.unitId) : fill(page.promo.wholeChannel, { channel: (calc.findById(SP.data.channels, r.channelId) || {}).name || r.channelId });
        entries.push({ entity: 'promoPrice', key: r.productKey + ' · ' + level, field: r.month, oldValue: d.before ? d.before.price : null, newValue: d.after ? d.after.price : null, by: by, at: at });
      });
      draft.basePrices.forEach(function (r) { if (!r.by) { r.by = by; r.at = at; } });
      draft.promoPrices.forEach(function (r) { if (!r.by) { r.by = by; r.at = at; } });
      store.set('master.basePrices', draft.basePrices);
      store.set('master.promoPrices', draft.promoPrices);
      store.appendAudit(entries);
      saved = clone(draft);
      editing = false;
      pending = null;
      undo.clear();
      draw();
    }

    var exportBtn = C.exportButton({ unsaved: dirty, build: exportSpec });
    var bar = C.workflowBar({
      simple: true, extra: exportBtn,
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); pending = null; undo.clear(); draw(); },
      onSave: save,
      onCancel: function () { editing = false; draft = clone(saved); pending = null; undo.clear(); draw(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    // ------------------------------------------------------------------ ข้อมูลของแท็บ
    function monthsFrom(from, to) {
      var out = [], y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7)) - 1;
      for (;;) { var k = calc.monthKey(y, m); if (k > to) break; out.push(k); m += 1; if (m > 11) { m = 0; y += 1; } }
      return out;
    }
    var lastMonth = calc.monthKey(Math.max.apply(null, S.PLAN_YEARS), 11);
    function tax() { return store.get('master.taxonomy'); }
    function seriesState(products) {
      var options = calc.seriesList(tax(), products);
      var series = (store.get('ui.seriesFilter') || []).filter(function (s) { return options.some(function (o) { return o.value === s; }); });
      return { options: options, value: series };
    }
    function searchOk(p) {
      var q = query.trim().toLowerCase();
      return !q || (calc.productKey(p) + ' ' + p.name + ' ' + (p.shortName || '')).toLowerCase().indexOf(q) >= 0;
    }
    function groups(products) {
      var T = tax(), out = [];
      products.forEach(function (p) {
        var g = out.filter(function (x) { return x.id === (p.seriesId || ''); })[0];
        if (!g) { g = { id: p.seriesId || '', name: calc.productTaxonomy(T, p).series || SP.data.content.pages.productList.noSeries, items: [] }; out.push(g); }
        g.items.push(p);
      });
      var order = calc.taxonomyChildren(T, 'series', null).map(function (n) { return n.id; });
      out.sort(function (a, b) { return (order.indexOf(a.id) + 1 || 999) - (order.indexOf(b.id) + 1 || 999); });
      return out;
    }
    function skuHead(p) {
      var key = calc.productKey(p);
      return h('th', { class: 'pr-sku', scope: 'row' }, h('span', { class: 'pr-sku-line' }, C.productThumb(p, tax(), { size: 'sm' }),
        h('span', { class: 'pr-sku-text' }, h('span', { class: 'pr-code' }, key), h('span', { class: 'pr-name', title: p.name }, calc.displayName(p)))));
    }

    // ------------------------------------------------------------------ วาดหน้า
    function draw() {
      if (tip) tip.hide();
      C.clear(root);
      bar.update();
      refs = { cells: {} };
      root.appendChild(h('div', { class: 'tool-row pr-tabs' },
        C.segmented({ label: page.title, value: tab, className: 'pr-tab-seg', options: ['base', 'promo'].map(function (t) { return { value: t, label: page.tabs[t] }; }),
          onChange: function (v) { tab = v; store.set('ui.pricesTab', v); draw(); } }),
        h('span', { class: 'muted small pr-tab-lead' }, page.tabLead[tab])));
      if (tab === 'base') drawBase(); else drawPromo();
    }

    // ================================================================== แท็บราคาหลัก
    function drawBase() {
      var B = page.base;
      var d = store.data();
      var products = d.products;
      var ss = seriesState(products);
      var shown = products.filter(function (p) { return calc.inSeries(p, ss.value) && searchOk(p); });
      var viewMonth = pending || baseMonth;
      var monthSel = C.select({ label: B.month, value: viewMonth, className: 'pr-month', disabled: !!pending,
        options: monthsFrom(SP.data.priceImport.baseFrom || '2024-01', lastMonth).map(function (k) { return { value: k, label: F.date(k) + (k === now ? ' · ' + B.now : '') }; }),
        onChange: function (v) { baseMonth = v; draw(); } });
      var search = h('input', { type: 'search', class: 'search-input pr-search', placeholder: page.search, 'aria-label': page.search, value: query });
      search.addEventListener('change', function () { query = search.value; draw(); });
      search.addEventListener('keydown', function (e) { if (e.key === 'Enter') { query = search.value; draw(); } });
      root.appendChild(h('div', { class: 'tool-row pr-toolbar' },
        h('label', { class: 'field pr-month-field' }, h('span', { class: 'field-label' }, B.month), monthSel),
        C.seriesFilter({ options: ss.options, value: ss.value, onChange: function (v) { store.set('ui.seriesFilter', v); draw(); } }),
        search,
        h('span', { class: 'tool-right' },
          canBase() && !pending ? h('button', { type: 'button', class: 'btn btn-primary btn-sm pr-new-price', onClick: function () { pickPending(function () { draw(); }); } }, B.newPrice) : null,
          canBase() ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm pr-import', onClick: importExcel }, B.importButton) : null,
          baseLegend())));
      if (editing) {
        var banner = C.editBanner();
        banner.update(dirty());
        refs.banner = banner;
        root.appendChild(h('div', { class: 'tool-row ap-edit-row' }, banner,
          pending ? h('span', { class: 'pr-pending' }, h('strong', null, fill(B.pendingTitle, { month: F.date(pending) })), ' · ' + B.pendingHint,
            h('button', { type: 'button', class: 'link-btn pr-pending-end', onClick: function () { pending = null; draw(); } }, B.pendingEnd)) : h('span', { class: 'master-hint' }, canBase() ? B.editHint : B.noRight)));
      }
      var card = h('div', { class: 'card fit-card pr-card' });
      root.appendChild(card);
      if (!shown.length) { card.appendChild(h('p', { class: 'grid-empty' }, page.noSkus)); return; }
      card.appendChild(baseTable(shown, viewMonth));
    }

    function baseLegend() {
      var G = page.base.legend;
      return h('span', { class: 'legend pr-legend' },
        h('span', { class: 'legend-item' }, h('span', { class: 'ap-sw' }, '199', h('span', { class: 'pr-dot' })), G.changed),
        h('span', { class: 'legend-item' }, h('span', { class: 'ap-sw is-custom' }, '219'), G.pending));
    }

    // ตาราง SKU × ประเภทราคา ณ เดือน (โหมดบันทึกราคาใหม่ = ช่องกรอกของเดือนที่มีผล)
    function baseTable(products, month) {
      var B = page.base;
      var thead = h('thead', null, h('tr', null, h('th', { class: 'pr-sku', scope: 'col' }, page.columns.sku),
        TYPES.map(function (t, i) { return h('th', { class: 'num pr-type-col', scope: 'col', 'data-col': String(i) }, L.priceTypes[t] || t); })));
      var tbody = h('tbody');
      groups(products).forEach(function (g) {
        tbody.appendChild(h('tr', { class: 'pr-group' }, h('th', { colspan: String(TYPES.length + 1), scope: 'rowgroup' }, g.name + ' · ' + g.items.length)));
        g.items.forEach(function (p) {
          var key = calc.productKey(p);
          var row = { key: key, product: p, tds: [] };
          refs.cells[key] = row;
          var tds = TYPES.map(function (t, i) {
            var td = h('td', { class: 'num ap-cell pr-base-cell', 'data-col': String(i), dataset: { cell: key + '|' + t } });
            row.tds.push({ td: td, type: t });
            paintBase(td, key, t, month);
            return td;
          });
          tbody.appendChild(h('tr', { 'data-row': key }, skuHead(p), tds));
        });
      });
      var tbl = h('table', { class: 'data-grid pr-table pr-base-table', style: { '--ap-cols': String(TYPES.length) } }, thead, tbody);
      var scroll = h('div', { class: 'fit-scroll pr-scroll' }, tbl);
      tip = C.hoverTip(scroll, '[data-cell]', function (el) { return baseTip(el.dataset.cell, month); });
      if (pending && canBase()) {
        keys = C.gridKeys(tbl, {
          editing: true, cols: TYPES.length, pasteCols: TYPES.length,
          valueAt: function (key, col) { var e = pendingEntry(key, TYPES[col]); return e ? e.price : null; },
          apply: function (writes) { writeBase(writes); },
          undo: undoLast
        });
      } else {
        keys = null;
        tbl.addEventListener('click', function (e) {
          var td = e.target.closest && e.target.closest('td[data-cell]');
          if (!td || td.dataset.pop) return;
          td.dataset.pop = '1';
          var parts = td.dataset.cell.split('|');
          C.popover(td, function () { return historyBox(parts[0], parts[1]); }, { className: 'pr-history-popover', label: B.historyTitle }).open();
        });
      }
      return scroll;
    }
    function pendingEntry(key, type) {
      return pending ? cur().basePrices.filter(function (r) { return r.productKey === key && r.priceType === type && r.effectiveMonth === pending; })[0] || null : null;
    }
    function savedAt(key, type, month) { return calc.basePriceAt(saved.basePrices, key, type, month); }

    function paintBase(td, key, type, month) {
      var price = calc.basePriceAt(cur().basePrices, key, type, month);
      var changed = calc.basePriceChangedIn(cur().basePrices, key, type, month);
      if (pending && canBase()) {
        var e = pendingEntry(key, type);
        var before = calc.basePriceAt(saved.basePrices.filter(function (r) { return r.effectiveMonth !== pending; }), key, type, pending);
        var dirtyCell = JSON.stringify(e) !== JSON.stringify(saved.basePrices.filter(function (r) { return r.productKey === key && r.priceType === type && r.effectiveMonth === pending; })[0] || null);
        td.className = 'num ap-cell pr-base-cell' + (e ? ' is-custom' : ' is-rsp') + (dirtyCell ? ' is-dirty-cell' : '');
        var input = td.querySelector('input');
        if (!input) {
          C.clear(td);
          input = h('input', { type: 'text', inputmode: 'decimal', class: 'num ap-input', 'aria-label': key + ' · ' + (L.priceTypes[type] || type) + ' (' + L.baht + ')' });
          input.addEventListener('change', function () {
            var raw = String(input.value).replace(/[,\s฿]/g, '');
            var v = raw === '' ? 0 : Number(raw);
            if (!isFinite(v) || v < 0) { input.dataset.force = '1'; paintBase(td, key, type, month); return; }
            writeBase([{ key: key, m: TYPES.indexOf(type), qty: v }]);
          });
          td.appendChild(input);
        }
        if (document.activeElement !== input || input.dataset.force) input.value = e ? priceText(e.price) : '';
        delete input.dataset.force;
        input.placeholder = priceText(before);
        return;
      }
      C.clear(td);
      td.className = 'num ap-cell pr-base-cell' + (price == null ? ' is-empty' : '');
      td.setAttribute('tabindex', '0');
      td.appendChild(h('span', { class: 'ap-price' }, priceText(price)));
      if (changed) td.appendChild(h('span', { class: 'pr-dot', title: fill(page.base.changedTip, { month: F.date(month) }) }));
    }

    // writes = [{ key, m (index ของประเภทราคา), qty (ราคา · 0 = ลบรายการของเดือนที่มีผล) }]
    function writeBase(writes) {
      if (!pending || !canBase() || !writes || !writes.length) return;
      var next = draft.basePrices, touched = [];
      writes.forEach(function (w) {
        var type = TYPES[w.m];
        if (!type || !refs.cells[w.key]) return;
        if (w.qty > 0) next = calc.setBasePrice(next, { productKey: w.key, priceType: type, effectiveMonth: pending, price: w.qty, by: '', at: '' }).list;
        else next = next.filter(function (r) { return !(r.productKey === w.key && r.priceType === type && r.effectiveMonth === pending); });
        touched.push(w.key);
      });
      if (!touched.length) return;
      undo.push(clone(draft));
      draft.basePrices = next;
      repaintAll();
    }
    function repaintAll() {
      Object.keys(refs.cells).forEach(function (key) {
        var row = refs.cells[key];
        row.tds.forEach(function (x) {
          var inp = x.td.querySelector('input');
          if (inp) inp.dataset.force = '1';
          if (tab === 'base') paintBase(x.td, key, x.type, pending || baseMonth); else paintPromo(x.td, key, x.ref);
        });
      });
      if (refs.banner) refs.banner.update(dirty());
      if (keys) keys.refresh();
      if (tab === 'promo') updateWarnNote();
    }
    function undoLast() {
      var prev = undo.pop();
      if (!prev) return;
      draft = prev;
      repaintAll();
    }

    function historyBox(key, type) {
      var B = page.base;
      var list = calc.basePriceHistory(cur().basePrices, key, type);
      var p = calc.findProduct(store.get('master.products'), key);
      return [h('h3', { class: 'popover-title' }, fill(B.historyHead, { sku: key + ' ' + (p ? calc.displayName(p) : ''), type: L.priceTypes[type] || type })),
        list.length ? h('table', { class: 'data-grid pr-history-table' },
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, B.historyCols.month), h('th', { scope: 'col', class: 'num' }, B.historyCols.price), h('th', { scope: 'col' }, B.historyCols.by))),
          h('tbody', null, list.map(function (r) {
            return h('tr', null, h('td', null, F.date(r.effectiveMonth)), h('td', { class: 'num' }, priceText(r.price)), h('td', null, r.by || '–'));
          }))) : h('p', { class: 'muted small' }, B.historyEmpty)];
    }

    function baseTip(ref, month) {
      var parts = ref.split('|');
      var key = parts[0], type = parts[1];
      var p = calc.findProduct(store.get('master.products'), key);
      var e = calc.baseEntryAt(cur().basePrices, key, type, month);
      var B = page.base;
      var lines = [e ? fill(B.tip.value, { price: priceText(e.price), month: F.date(e.effectiveMonth) }) : B.tip.none];
      var next = calc.basePriceHistory(cur().basePrices, key, type).filter(function (r) { return r.effectiveMonth > month; }).pop();
      if (next) lines.push(fill(B.tip.next, { price: priceText(next.price), month: F.date(next.effectiveMonth) }));
      if (!pending) lines.push(B.tip.click);
      return [h('div', { class: 'tip-head' }, key + ' ' + (p ? calc.displayName(p) : '') + ' · ' + (L.priceTypes[type] || type)), h('ul', { class: 'tip-lines' }, lines.map(function (t) { return h('li', null, t); }))];
    }

    // เลือกเดือนที่มีผลของรอบบันทึกราคาใหม่ (เดือนปัจจุบันหรืออนาคต)
    function pickPending(then) {
      var B = page.base;
      var sel = C.select({ label: B.effectiveMonth, value: now, className: 'pr-pending-month', options: monthsFrom(now, lastMonth).map(function (k) { return { value: k, label: F.date(k) }; }), onChange: function () {} });
      C.dialog({ title: B.newPriceTitle, lines: [B.newPriceLead], body: h('label', { class: 'field' }, h('span', { class: 'field-label' }, B.effectiveMonth), sel), confirmLabel: B.newPriceStart })
        .then(function (r) { if (!r.ok) return; pending = sel.value; baseMonth = pending; then(); });
    }

    // นำเข้าราคาหลักจาก Excel → หน้าตรวจ (ค่าเดิม → ใหม่) → ใส่ในรอบบันทึกราคาใหม่
    function importExcel() {
      if (!pending) { pickPending(function () { draw(); pickFile(); }); return; }
      pickFile();
    }
    function pickFile() {
      var input = h('input', { type: 'file', accept: '.xlsx,.xls,.csv', hidden: true });
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        if (input.parentNode) input.parentNode.removeChild(input);
        if (!f) return;
        SP.core['export'].readTable(f).then(function (table) { reviewImport(f.name, table); }, function () {
          C.dialog({ title: page.base.import.failed, confirmLabel: L.dialog.confirm });
        });
      });
      document.body.appendChild(input);
      input.click();
    }
    function reviewImport(name, table) {
      var I = page.base.import;
      var diff = SP.core.catalog.priceImportDiff(table, SP.data.priceImport.columns, cur().basePrices, pending, store.get('master.products'));
      if (diff.header < 0) { C.dialog({ title: I.noHeader, lines: [I.format], confirmLabel: L.dialog.confirm }); return; }
      var products = store.get('master.products');
      var list = h('ul', { class: 'pr-import-list' }, diff.changes.slice(0, 60).map(function (c) {
        var p = calc.findProduct(products, c.key);
        return h('li', null, h('strong', null, c.key), ' ' + (p ? calc.displayName(p) : '') + ' · ' + (L.priceTypes[c.type] || c.type) + ': ' +
          fill(I.change, { old: priceText(c.old), price: priceText(c.price) }));
      }));
      var lines = [fill(I.summary, { n: diff.changes.length, same: diff.same, month: F.date(pending) })];
      if (diff.unknown.length) lines.push(fill(I.unknown, { n: diff.unknown.length, codes: diff.unknown.slice(0, 8).join(', ') }));
      if (diff.invalid) lines.push(fill(I.invalid, { n: diff.invalid }));
      if (diff.changes.length > 60) lines.push(fill(I.more, { n: diff.changes.length - 60 }));
      C.dialog({ title: fill(I.title, { name: name }), lines: lines, body: diff.changes.length ? list : null, wide: true, confirmLabel: diff.changes.length ? I.apply : L.dialog.confirm })
        .then(function (r) {
          if (!r.ok || !diff.changes.length) return;
          undo.push(clone(draft));
          diff.changes.forEach(function (c) { draft.basePrices = calc.setBasePrice(draft.basePrices, { productKey: c.key, priceType: c.type, effectiveMonth: pending, price: c.price, by: '', at: '' }).list; });
          draw();
        });
    }

    // ================================================================== แท็บ Promotion Price
    function promoState() {
      var d = store.data();
      d.basePrices = cur().basePrices;
      d.promoPrices = cur().promoPrices;
      var chs = SP.data.channels.filter(function (c) { return c.active !== false; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      var ch = calc.findById(chs, store.get('ui.productMaster.channel')) || chs[0] || null;
      var allUnits = ch ? calc.unitsOfChannel(d, ch.id, true) : [];
      var ss = seriesState(d.products);
      var listedIn = {};
      allUnits.forEach(function (u) { listedIn[u.id] = 0; });
      var products = d.products.filter(function (p) {
        var key = calc.productKey(p);
        if (!calc.soldInYear(p, year)) return false;
        var any = false;
        allUnits.forEach(function (u) { if (calc.isListed(d.listings, key, u.id)) { any = true; listedIn[u.id] += 1; } });
        return any;
      });
      var units = hideEmpty ? allUnits.filter(function (u) { return listedIn[u.id] > 0; }) : allUnits;
      if (promoLevel && !units.some(function (u) { return u.id === promoLevel; })) promoLevel = '';
      var shown = products.filter(function (p) { return calc.inSeries(p, ss.value) && searchOk(p); });
      // คอลัมน์: รายเดือน = 12 เดือนของระดับที่เลือก · ภาพรวมเดือน = ทั้ง Channel + หน่วยขาย ของเดือนที่เลือก
      var cols = promoView === 'monthly'
        ? F.MONTHS.map(function (mn, i) { return { month: calc.monthKey(year, i), unitId: promoLevel || null, label: mn, title: F.monthYear(i, year) }; })
        : [{ month: promoMonth, unitId: null, label: fill(page.promo.wholeChannel, { channel: ch ? ch.name : '' }), title: '' }].concat(units.map(function (u) { return { month: promoMonth, unitId: u.id, label: u.name, title: u.name }; }));
      return { d: d, chs: chs, ch: ch, units: units, allUnits: allUnits, ss: ss, products: shown, cols: cols, type: calc.channelPriceType(ch) };
    }

    function drawPromo() {
      var P = page.promo;
      var s = promoState();
      refs.s = s;
      var search = h('input', { type: 'search', class: 'search-input pr-search', placeholder: page.search, 'aria-label': page.search, value: query });
      search.addEventListener('change', function () { query = search.value; draw(); });
      search.addEventListener('keydown', function (e) { if (e.key === 'Enter') { query = search.value; draw(); } });
      var hideBox = h('input', { type: 'checkbox', checked: hideEmpty, class: 'pr-hide-empty' });
      hideBox.addEventListener('change', function () { hideEmpty = hideBox.checked; draw(); });
      var levelSel = promoView === 'monthly'
        ? C.select({ label: P.level, value: promoLevel, className: 'pr-level', options: [{ value: '', label: fill(P.wholeChannel, { channel: s.ch ? s.ch.name : '' }) }].concat(s.units.map(function (u) { return { value: u.id, label: u.name }; })),
            onChange: function (v) { promoLevel = v; draw(); } })
        : C.select({ label: P.month, value: promoMonth, className: 'pr-promo-month', options: F.MONTHS.map(function (mn, i) { return { value: calc.monthKey(year, i), label: F.monthYear(i, year) }; }),
            onChange: function (v) { promoMonth = v; draw(); } });
      root.appendChild(h('div', { class: 'tool-row pr-toolbar' },
        s.ch ? C.segmented({ label: L.picker.channel, value: s.ch.id, options: s.chs.map(function (c) { return { value: c.id, label: c.name, title: c.fullName }; }),
          onChange: function (v) { store.set('ui.productMaster.channel', v); promoLevel = ''; draw(); } }) : null,
        C.segmented({ label: P.viewLabel, value: promoView, options: ['monthly', 'overview'].map(function (v) { return { value: v, label: P.views[v] }; }), onChange: function (v) { promoView = v; draw(); } }),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, promoView === 'monthly' ? P.level : P.month), levelSel),
        C.seriesFilter({ options: s.ss.options, value: s.ss.value, onChange: function (v) { store.set('ui.seriesFilter', v); draw(); } }),
        search,
        h('label', { class: 'check pr-hide' }, hideBox, P.hideEmpty),
        h('span', { class: 'tool-right' }, promoLegend())));
      if (editing) {
        var banner = C.editBanner();
        banner.update(dirty());
        refs.banner = banner;
        var T = P.tools;
        refs.selText = h('span', { class: 'ap-sel-text' });
        refs.tools = canPromo(s.ch && s.ch.id) ? [
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm pr-set', onClick: setPrice }, T.set),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm pr-discount', onClick: discount }, T.discount),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm pr-copy-month', onClick: copyMonth }, T.copyMonth),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm pr-copy-unit', onClick: copyUnit }, T.copyUnit)
        ] : [];
        root.appendChild(h('div', { class: 'tool-row ap-edit-row' }, banner,
          refs.tools.length ? h('span', { class: 'ap-tools' }, refs.selText, refs.tools) : h('span', { class: 'master-hint' }, fill(P.noRight, { channel: s.ch ? s.ch.name : '' }))));
        if (refs.tools.length) root.appendChild(h('p', { class: 'master-hint pr-hint' }, P.editHint));
      }
      refs.warnNote = h('p', { class: 'ap-warn-note', role: 'status' });
      root.appendChild(refs.warnNote);
      var card = h('div', { class: 'card fit-card pr-card' });
      root.appendChild(card);
      if (!s.ch) card.appendChild(h('p', { class: 'grid-empty' }, P.noChannels));
      else if (!s.allUnits.length) card.appendChild(h('p', { class: 'grid-empty' }, fill(P.noUnits, { unit: s.ch.unitLabel })));
      else if (!s.products.length) card.appendChild(h('p', { class: 'grid-empty' }, page.noSkus));
      else card.appendChild(promoTable(s));
      updateSelection();
      updateWarnNote();
    }

    function promoLegend() {
      var G = page.promo.legend;
      return h('span', { class: 'legend pr-legend' },
        h('span', { class: 'legend-item' }, h('span', { class: 'ap-sw' }, h('span', { class: 'ap-faint' }, '199')), G.inherited),
        h('span', { class: 'legend-item' }, h('span', { class: 'ap-sw is-custom' }, '149'), G.promo),
        h('span', { class: 'legend-item' }, h('span', { class: 'ap-sw is-unlisted' }), G.unlisted));
    }

    // ข้อมูลช่อง SKU × (เดือน, ระดับ) → { listed, price (ที่ใช้คำนวณ), exact (Promotion ที่ระดับนี้), inherited (ราคาที่ได้รับมา · ไม่นับค่าที่ระดับนี้), source, base, diff, warnings }
    function cellOf(s, key, col) {
      var d = s.d;
      var listed = col.unitId ? calc.isListed(d.listings, key, col.unitId) : s.allUnits.some(function (u) { return calc.isListed(d.listings, key, u.id); });
      // ราคาจากค่าปัจจุบันของรอบแก้ไข (draft) ไม่ใช่ข้อมูลตอนวาดตาราง
      var pricing = { basePrices: cur().basePrices, promoPrices: cur().promoPrices };
      var r = calc.resolveWith(pricing, key, s.ch.id, col.unitId, s.type, col.month);
      var exact = calc.promoEntry(pricing.promoPrices, key, s.ch.id, col.unitId, col.month);
      var parent = col.unitId ? calc.resolveWith(pricing, key, s.ch.id, null, s.type, col.month) : { price: r.base, source: 'base' };
      var chk = exact ? calc.checkPromoPrice(exact.price, r.base) : { warnings: [], diff: null };
      return { listed: listed, price: r.price, exact: exact ? Number(exact.price) : null, inherited: parent.price, parentSource: parent.source, source: r.source,
        base: r.base, diff: chk.diff, warnings: listed ? chk.warnings : [] };
    }

    function promoTable(s) {
      var n = s.cols.length;
      var thead = h('thead', null, h('tr', null,
        h('th', { class: 'pr-sku', scope: 'col' }, page.columns.sku),
        s.cols.map(function (c, i) { return h('th', { class: 'num ap-unit-col' + (c.month === now ? ' is-current' : ''), scope: 'col', 'data-col': String(i), title: c.title }, c.label); })));
      var tbody = h('tbody');
      groups(s.products).forEach(function (g) {
        tbody.appendChild(h('tr', { class: 'pr-group' }, h('th', { colspan: String(n + 1), scope: 'rowgroup' }, g.name + ' · ' + g.items.length)));
        g.items.forEach(function (p) {
          var key = calc.productKey(p);
          var row = { key: key, product: p, tds: [] };
          refs.cells[key] = row;
          var tds = s.cols.map(function (c, i) {
            var td = h('td', { class: 'num ap-cell', 'data-col': String(i), dataset: { cell: key + '|' + i } });
            row.tds.push({ td: td, ref: c });
            paintPromo(td, key, c);
            return td;
          });
          tbody.appendChild(h('tr', { 'data-row': key }, skuHead(p), tds));
        });
      });
      var tbl = h('table', { class: 'data-grid pr-table ap-table pr-promo-table', style: { '--ap-cols': String(n) } }, thead, tbody);
      var scroll = h('div', { class: 'fit-scroll pr-scroll' }, tbl);
      tip = C.hoverTip(scroll, '[data-cell]', function (el) { var parts = el.dataset.cell.split('|'); return promoTip(s, parts[0], s.cols[Number(parts[1])]); });
      keys = C.gridKeys(tbl, {
        editing: canPromo(s.ch.id), cols: n, pasteCols: n,
        valueAt: function (key, col) { var c = s.cols[col]; if (!c) return null; var e = calc.promoEntry(cur().promoPrices, key, s.ch.id, c.unitId, c.month); return e ? e.price : null; },
        apply: writePromo,
        undo: undoLast
      });
      tbl.addEventListener('focusin', function (e) { var td = e.target.closest && e.target.closest('td[data-col]'); if (td) lastCell = td; updateSelection(); });
      tbl.addEventListener('mouseup', function () { setTimeout(updateSelection, 0); });
      tbl.addEventListener('keyup', updateSelection);
      return scroll;
    }

    function paintPromo(td, key, col) {
      var s = refs.s;
      var c = cellOf(s, key, col);
      var savedExact = calc.promoEntry(saved.promoPrices, key, s.ch.id, col.unitId, col.month);
      var dirtyCell = editing && (savedExact ? savedExact.price : null) !== c.exact;
      td.className = 'num ap-cell' + (!c.listed ? ' is-unlisted' : c.exact != null ? ' is-custom' : ' is-rsp') + (c.warnings.length ? ' has-warn' : '') + (dirtyCell ? ' is-dirty-cell' : '');
      var input = td.querySelector('input');
      if (!c.listed) {
        C.clear(td);
        td.setAttribute('tabindex', '0');
        td.setAttribute('aria-label', page.promo.tip.unlisted);
        return;
      }
      var meta = [c.exact != null && c.diff != null && Math.abs(c.diff) > 0.0005 ? h('span', { class: 'ap-off' }, pctText(c.diff)) : null,
        c.warnings.length ? h('span', { class: 'ap-warn', 'aria-label': c.warnings.map(function (w) { return page.promo.warnings[w]; }).join(' · ') }, '!') : null];
      if (canPromo(s.ch.id)) {
        td.removeAttribute('tabindex');
        if (!input) {
          C.clear(td);
          input = h('input', { type: 'text', inputmode: 'decimal', class: 'num ap-input', 'aria-label': key + ' · ' + (col.unitId ? unitName(col.unitId) : s.ch.name) + ' · ' + F.date(col.month) + ' (' + L.baht + ')' });
          input.addEventListener('change', function () {
            var raw = String(input.value).replace(/[,\s฿]/g, '');
            var v = raw === '' ? 0 : Number(raw);
            if (!isFinite(v) || v < 0) { input.dataset.force = '1'; paintPromo(td, key, col); return; }
            writePromo([{ key: key, m: s.cols.indexOf(col), qty: v }]);
          });
          td.appendChild(input);
          td.appendChild(h('span', { class: 'ap-meta' }));
        }
        if (document.activeElement !== input || input.dataset.force) input.value = c.exact != null ? priceText(c.exact) : '';
        delete input.dataset.force;
        input.placeholder = priceText(c.inherited);
        var box = td.querySelector('.ap-meta');
        C.clear(box);
        meta.forEach(function (m) { if (m) box.appendChild(m); });
        return;
      }
      C.clear(td);
      td.setAttribute('tabindex', '0');
      td.appendChild(h('span', { class: 'ap-price' + (c.exact == null ? ' ap-faint' : '') }, priceText(c.price)));
      meta.forEach(function (m) { if (m) td.appendChild(m); });
    }

    // writes = [{ key, m (คอลัมน์), qty (ราคา · 0 = ใช้ราคาที่ได้รับมา) }] จาก gridKeys หรือเครื่องมือ · ช่องที่ไม่ได้ Listing ข้าม
    function writePromo(writes) {
      var s = refs.s;
      if (!s || !canPromo(s.ch.id) || !writes || !writes.length) return;
      var next = draft.promoPrices, n = 0;
      writes.forEach(function (w) {
        var col = w.col || s.cols[w.m];
        if (!col || !refs.cells[w.key] || !cellOf(s, w.key, col).listed) return;
        next = calc.setPromoPrice(next, w.key, s.ch.id, col.unitId, col.month, w.qty > 0 ? w.qty : null);
        n += 1;
      });
      if (!n) return;
      undo.push(clone(draft));
      draft.promoPrices = next;
      repaintAll();
    }

    // ช่องที่เลือก: ช่วงที่ลาก / Shift (is-sel) หรือช่องที่โฟกัสล่าสุด → เฉพาะช่องที่แก้ได้
    function selectedCells() {
      if (!refs || !refs.cells || !refs.s) return [];
      var tds = Array.prototype.slice.call(root.querySelectorAll('td.ap-cell.is-sel[data-col]'));
      if (!tds.length && lastCell && root.contains(lastCell)) tds = [lastCell];
      var out = [];
      tds.forEach(function (td) {
        var tr = td.closest('tr[data-row]');
        if (!tr || !td.querySelector('input')) return;
        var col = refs.s.cols[Number(td.dataset.col)];
        if (col) out.push({ key: tr.dataset.row, col: col, c: cellOf(refs.s, tr.dataset.row, col) });
      });
      return out;
    }
    function updateSelection() {
      if (!refs || !refs.selText || !refs.tools) return;
      var n = selectedCells().length;
      refs.selText.textContent = n ? fill(page.promo.tools.selected, { n: n }) : page.promo.tools.none;
      refs.tools.forEach(function (b) { b.disabled = !n; });
    }
    function setPrice() {
      var T = page.promo.tools, sel = selectedCells();
      if (!sel.length) return;
      C.promptNumber({ title: T.setTitle, label: T.setLabel, suffix: L.baht, hint: fill(T.hint, { n: sel.length }), invalidText: T.invalid }).then(function (r) {
        if (!r.ok || !(r.value > 0)) return;
        writePromo(sel.map(function (x) { return { key: x.key, col: x.col, qty: r.value }; }));
      });
    }
    function discount() {
      var T = page.promo.tools, sel = selectedCells();
      if (!sel.length) return;
      C.promptNumber({ title: T.discountTitle, label: T.discountLabel, suffix: '%', hint: fill(T.hint, { n: sel.length }), invalidText: T.invalid }).then(function (r) {
        if (!r.ok || !(r.value > 0) || r.value >= 100) return;
        writePromo(sel.filter(function (x) { return x.c.base > 0; }).map(function (x) { return { key: x.key, col: x.col, qty: Math.round(x.c.base * (1 - r.value / 100) * 100) / 100 }; }));
      });
    }
    // คัดลอกค่าที่ตั้งไว้ของช่องที่เลือกไปเดือนอื่นในปีแผน (ระดับเดิม · ช่องว่าง = ลบค่าเดือนปลายทาง)
    function copyMonth() {
      var T = page.promo.tools, sel = selectedCells();
      if (!sel.length) return;
      var target = C.select({ label: T.copyMonthLabel, value: calc.monthKey(year, Math.min(11, Number(sel[0].col.month.slice(5, 7)))), className: 'pr-copy-month-sel',
        options: F.MONTHS.map(function (mn, i) { return { value: calc.monthKey(year, i), label: F.monthYear(i, year) }; }), onChange: function () {} });
      C.dialog({ title: T.copyMonthTitle, lines: [fill(T.hint, { n: sel.length })], body: h('label', { class: 'field' }, h('span', { class: 'field-label' }, T.copyMonthLabel), target), confirmLabel: T.copyApply })
        .then(function (r) {
          if (!r.ok) return;
          writePromo(sel.map(function (x) { return { key: x.key, col: { month: target.value, unitId: x.col.unitId }, qty: x.c.exact || 0 }; }));
        });
    }
    // คัดลอกไปหน่วยขายอื่น (หรือทั้ง Channel) ในเดือนเดียวกัน
    function copyUnit() {
      var T = page.promo.tools, sel = selectedCells(), s = refs.s;
      if (!sel.length) return;
      var options = [{ id: '', name: fill(page.promo.wholeChannel, { channel: s.ch.name }) }].concat(s.units.map(function (u) { return { id: u.id, name: u.name }; }));
      var boxes = options.map(function (o) { return h('label', { class: 'pr-check' }, h('input', { type: 'checkbox', value: o.id, class: 'pr-copy-unit-box' }), h('span', null, o.name)); });
      C.dialog({ title: T.copyUnitTitle, lines: [fill(T.hint, { n: sel.length })], body: h('div', { class: 'pr-copy-units' }, boxes), confirmLabel: T.copyApply }).then(function (r) {
        if (!r.ok) return;
        var ids = boxes.map(function (b) { return b.querySelector('input'); }).filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
        var writes = [];
        sel.forEach(function (x) { ids.forEach(function (id) { writes.push({ key: x.key, col: { month: x.col.month, unitId: id || null }, qty: x.c.exact || 0 }); }); });
        writePromo(writes);
      });
    }

    // ราคาที่ควรตรวจสอบ (ช่อง Promotion ในตารางที่แสดง)
    function updateWarnNote() {
      if (!refs || !refs.warnNote || !refs.s || !refs.s.ch) return;
      var n = 0;
      Object.keys(refs.cells).forEach(function (key) { refs.cells[key].tds.forEach(function (x) { if (cellOf(refs.s, key, x.ref).warnings.length) n++; }); });
      refs.warnNote.textContent = n ? fill(page.promo.warnNote, { n: n, pct: F.pct(S.PROMO_PRICE_WARN_BELOW, 0) }) : '';
      refs.warnNote.hidden = !n;
    }

    function sourceText(s, source) {
      var P = page.promo.tip;
      if (source === 'promoChannel') return fill(P.fromChannel, { channel: s.ch.name });
      return fill(P.fromBase, { type: L.priceTypes[s.type] || s.type });
    }
    function promoTip(s, key, col) {
      if (!col) return null;
      var P = page.promo.tip;
      var p = calc.findProduct(store.get('master.products'), key);
      var c = cellOf(s, key, col);
      var head = key + ' ' + (p ? calc.displayName(p) : '') + ' · ' + (col.unitId ? unitName(col.unitId) : fill(page.promo.wholeChannel, { channel: s.ch.name })) + ' · ' + F.date(col.month);
      var lines = [];
      if (!c.listed) lines.push(h('li', null, P.unlisted));
      else if (c.exact != null) {
        lines.push(h('li', null, h('strong', null, fill(P.exact, { price: priceText(c.exact) }))));
        if (c.diff != null) lines.push(h('li', null, fill(P.vsBase, { pct: pctText(c.diff), type: L.priceTypes[s.type] || s.type, base: priceText(c.base) })));
        lines.push(h('li', { class: 'muted' }, fill(P.otherwise, { price: priceText(c.inherited), source: sourceText(s, c.parentSource) })));
        c.warnings.forEach(function (w) { lines.push(h('li', { class: 'text-over' }, page.promo.warnings[w])); });
      } else lines.push(h('li', null, fill(P.inherited, { price: priceText(c.price), source: sourceText(s, c.source) })));
      return [h('div', { class: 'tip-head' }, head), h('ul', { class: 'tip-lines' }, lines)];
    }

    // ------------------------------------------------------------------ ส่งออก ▾ (ตารางที่แสดง)
    function exportSpec(source) {
      var c0 = source === 'draft' && editing ? draft : saved;
      var st = C.exportStamp(null);
      var X = page.exportColumns;
      if (tab === 'base') {
        var month = pending || baseMonth;
        var products = store.get('master.products').filter(function (p) { return calc.inSeries(p, seriesState(store.get('master.products')).value) && searchOk(p); });
        return {
          filename: fill(page.exportFile, { tab: C.fileSafe(page.tabs.base), date: st.date }),
          sheets: [{ name: page.tabs.base, header: C.exportHeader(year, null, [[page.base.month, F.date(month)]]),
            columns: [{ key: 'code', label: X.code, value: function (p) { return calc.productKey(p); }, width: 12 }, { key: 'name', label: X.name, value: function (p) { return p.name; }, width: 40 }]
              .concat(TYPES.map(function (t) { return { key: t, label: L.priceTypes[t] || t, type: 'price', value: function (p) { return calc.basePriceAt(c0.basePrices, calc.productKey(p), t, month); } }; })),
            rows: products }]
        };
      }
      var s = promoState();
      var pricing = { basePrices: c0.basePrices, promoPrices: c0.promoPrices };
      return {
        filename: fill(page.exportFile, { tab: C.fileSafe(page.tabs.promo + '-' + (s.ch ? s.ch.name : '')), date: st.date }),
        sheets: [{ name: page.tabs.promo, header: C.exportHeader(year, null, [[L.picker.channel, s.ch ? s.ch.name : ''], [page.promo.viewLabel, page.promo.views[promoView]]]),
          columns: [{ key: 'code', label: X.code, value: function (p) { return calc.productKey(p); }, width: 12 }, { key: 'name', label: X.name, value: function (p) { return p.name; }, width: 40 }]
            .concat(s.cols.map(function (c, i) {
              return { key: 'c' + i, label: promoView === 'monthly' ? c.title : c.label, type: 'price',
                value: function (p) { return calc.resolveWith(pricing, calc.productKey(p), s.ch.id, c.unitId, s.type, c.month).price; } };
            })),
          rows: s.products }]
      };
    }

    draw();
  }

  SP.modules.promotionPrice = { render: render };
})(window.SP);
