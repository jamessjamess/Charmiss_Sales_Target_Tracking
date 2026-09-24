/*
 * modules/promotions/promotions.js — Product Master · Promotion Price
 *
 * หน้าที่:        แถบตัวกรอง: Channel (Segmented ตามแผนของปี) · หน่วยขาย (หลายค่า) · Series · ค้นหา SKU · มุมมอง ปฏิทินรายเดือน | รายการ
 *                 ปฏิทิน: แถว = SKU (จัดกลุ่มตาม Series) × 12 เดือน ช่อง = ราคาที่มีผลเฉลี่ยของเดือน (calc.pricingDetail ถ่วงตามจำนวนวัน
 *                 ฟังก์ชันเดียวกับหน้าวางแผน SKU) + ป้าย −x% เทียบ RSP / ไม่มี Promotion = RSP สีจาง / Promotion บางวัน = P มุมซ้ายบน /
 *                 ฉบับร่าง = เส้นประ (ไม่นับในราคา) / หลายหน่วยราคาไม่เท่ากัน = "หลายราคา" + Tooltip แยกรายหน่วย
 *                 รายการ: ชื่อ · SKU · หน่วยขาย · ช่วงวันที่ · ราคา/ส่วนลด · GP ช่วง Promotion · สถานะ
 *                 โหมดแก้ไข (Trade Marketing): คลิกช่อง → ฟอร์ม (Drawer) ค่าเริ่มต้นทั้งเดือน / SKU และหน่วยขายหลายค่า / ราคาหรือส่วนลด % /
 *                 GP ช่วง Promotion (ไม่บังคับ) / ตัวอย่างราคา / คัดลอกไปเดือนถัดไป · หน่วยขายอื่น / ตรวจซ้อนกันด้วย calc.validatePromotion
 *                 ค่าที่แก้อยู่ใน draft จนกด บันทึก (workflowBar แบบง่าย) / ล็อก Baseline แล้ว → Promotion มีผลกับ Forecast เท่านั้น
 * อ่านจาก data/:  channels, settings, content (pages.promotionPrice, labels) + Master ผ่าน store.data()
 * store อ่าน:     app.planYear, plan.<ปี>.topDown (.channels), plan.<ปี>.workflow (ล็อก Baseline), master.promotions, master.products,
 *                 master.listings, master.priceList, master.taxonomy, master.accounts, master.territories,
 *                 ui.productMaster.channel (ร่วมกับหน้า Listing), ui.seriesFilter, ui.role
 * store เขียน:    master.promotions และ master.audit (ตอนกด บันทึก), ui.productMaster.channel, ui.seriesFilter
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var W = SP.core.workflow;
  var store = SP.core.store;
  var h = C.h;
  var fill = C.fill;

  var view = 'calendar';
  var query = '';
  var accountFilter = [];
  var seq = 0;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function priceText(v) {
    if (v == null || !(v > 0)) return '–';
    return F.number(v, Math.abs(v - Math.round(v)) < 0.005 ? 0 : 2);
  }
  function newId() { seq += 1; return 'promo-' + Date.now().toString(36) + seq; }

  function render(root, ctx) {
    var page = ctx.page;
    var P = page;
    var FM = page.form;
    var L = SP.data.content.labels;
    var year = store.year();
    var editing = false;
    var saved = store.get('master.promotions');
    var draft = clone(saved);
    var locked = W.isLocked(store.workflowStates());

    function cur() { return editing ? draft : saved; }
    function role() { return store.role().type; }
    function canEdit() { return editing && W.canEditMaster(store.role(), ['trade']); }
    function dataNow() { var d = store.data(); d.promotions = cur(); return d; }
    function unitName(id) { var i = calc.unitInfo(store.data(), id); return i ? i.unit.name : id; }

    function diffCount() {
      var n = 0;
      draft.forEach(function (d) { var o = calc.findById(saved, d.id); if (!o || JSON.stringify(o) !== JSON.stringify(d)) n++; });
      saved.forEach(function (o) { if (!calc.findById(draft, o.id)) n++; });
      return n;
    }
    function dirty() { return editing ? diffCount() : 0; }
    C.guardUnsaved(dirty);

    var bar = C.workflowBar({
      simple: true, editRoles: ['trade'],
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); draw(); },
      onSave: function () {
        var by = L.roles[role()] || '', at = new Date().toISOString();
        var entries = [];
        draft.forEach(function (d) {
          var o = calc.findById(saved, d.id);
          if (o && JSON.stringify(o) === JSON.stringify(d)) return;
          entries = entries.concat(calc.auditDiff('promotion', d.productKey + ' · ' + d.name, o || null, d, { by: by, at: at }));
        });
        saved.forEach(function (o) { if (!calc.findById(draft, o.id)) entries = entries.concat(calc.auditDiff('promotion', o.productKey + ' · ' + o.name, o, null, { by: by, at: at })); });
        store.set('master.promotions', draft);
        store.appendAudit(entries);
        saved = clone(draft);
        editing = false;
        drawerCtl.close();
        draw();
      },
      onCancel: function () { editing = false; draft = clone(saved); drawerCtl.close(); draw(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    var drawerCtl = C.drawer({ label: FM.newTitle, className: 'promo-drawer' });
    var tip = null;

    // ------------------------------------------------------------------ ตัวกรอง
    function planChannels() {
      return (store.get(store.planKey('topDown')).channels || []).map(function (id) { return calc.findById(SP.data.channels, id); }).filter(Boolean);
    }
    function state() {
      var data = dataNow();
      var chs = planChannels();
      var ch = calc.findById(chs, store.get('ui.productMaster.channel')) || chs[0] || null;
      var units = ch ? calc.unitsOfChannel(data, ch.id, true) : [];
      var picked = accountFilter.filter(function (id) { return units.some(function (u) { return u.id === id; }); });
      var selUnits = picked.length ? units.filter(function (u) { return picked.indexOf(u.id) >= 0; }) : units;
      var tax = store.get('master.taxonomy');
      var seriesOptions = calc.seriesList(tax, data.products);
      var series = (store.get('ui.seriesFilter') || []).filter(function (s) { return seriesOptions.some(function (o) { return o.value === s; }); });
      var q = query.trim().toLowerCase();
      var unitIds = selUnits.map(function (u) { return u.id; });
      var products = data.products.filter(function (p) {
        var key = calc.productKey(p);
        if ((p.itemType || 'SALE') !== 'SALE' || !calc.soldInYear(p, year) || !calc.inSeries(p, series)) return false;
        if (q && (key + ' ' + p.name).toLowerCase().indexOf(q) < 0) return false;
        return unitIds.some(function (u) { return calc.isListed(data.listings, key, u); });
      });
      return { data: data, chs: chs, ch: ch, units: units, picked: picked, selUnits: selUnits, unitIds: unitIds, tax: tax, seriesOptions: seriesOptions, series: series, products: products };
    }

    // ------------------------------------------------------------------ วาดหน้า
    function draw() {
      if (tip) tip.hide();
      C.clear(root);
      bar.update();
      var s = state();
      var search = h('input', { type: 'search', class: 'search-input pr-search', placeholder: P.search, 'aria-label': P.search, value: query });
      search.addEventListener('change', function () { query = search.value; draw(); });
      search.addEventListener('keydown', function (e) { if (e.key === 'Enter') { query = search.value; draw(); } });
      var unitLabel = s.ch ? s.ch.unitLabel : '';
      root.appendChild(h('div', { class: 'tool-row pr-toolbar' },
        s.ch ? C.segmented({ label: L.picker.channel, value: s.ch.id, options: s.chs.map(function (c) { return { value: c.id, label: c.name, title: c.fullName }; }),
          onChange: function (v) { store.set('ui.productMaster.channel', v); accountFilter = []; draw(); } }) : null,
        C.multiSelect({ label: P.accountsLabel, allLabel: fill(P.accountsAll, { unit: unitLabel }), selected: P.accountsSelected, clear: L.series.clear, empty: L.series.empty,
          options: s.units.map(function (u) { return { value: u.id, label: u.name }; }), value: s.picked, onChange: function (v) { accountFilter = v; draw(); } }),
        C.seriesFilter({ options: s.seriesOptions, value: s.series, onChange: function (v) { store.set('ui.seriesFilter', v); draw(); } }),
        search,
        C.segmented({ label: P.viewLabel, value: view, options: ['calendar', 'list'].map(function (v) { return { value: v, label: P.views[v] }; }), onChange: function (v) { view = v; draw(); } }),
        h('span', { class: 'tool-right' }, legend(),
          canEdit() ? h('button', { type: 'button', class: 'btn btn-primary btn-sm pr-add', onClick: function () { openForm(null, { keys: [], accounts: s.unitIds, month: null }); } }, P.add) : null)));
      if (editing) { var b = C.editBanner(); b.update(dirty()); root.appendChild(b); root.appendChild(h('p', { class: 'master-hint pr-hint' }, P.editHint)); }
      if (locked) root.appendChild(h('p', { class: 'callout callout-info pr-locked' }, P.baselineNote));
      var card = h('div', { class: 'card fit-card pr-card' });
      root.appendChild(card);
      card.appendChild(view === 'calendar' ? calendar(s) : list(s));
    }

    function legend() {
      var G = P.legend;
      return h('span', { class: 'legend pr-legend' },
        h('span', { class: 'legend-item' }, h('span', { class: 'pr-sw is-rsp' }), G.rsp),
        h('span', { class: 'legend-item' }, h('span', { class: 'pr-sw is-promo' }), G.promo),
        h('span', { class: 'legend-item' }, h('span', { class: 'pr-sw is-promo' }, h('span', { class: 'promo-mark' }, 'P')), G.partial),
        h('span', { class: 'legend-item' }, h('span', { class: 'pr-sw has-draft' }), G.draft),
        h('span', { class: 'legend-item' }, h('span', { class: 'pr-sw is-multi' }, '≠'), G.multi));
    }

    // ------------------------------------------------------------------ ปฏิทิน
    function groups(s) {
      var out = [];
      s.products.forEach(function (p) {
        var tx = calc.productTaxonomy(s.tax, p);
        var g = out.filter(function (x) { return x.id === (p.seriesId || ''); })[0];
        if (!g) { g = { id: p.seriesId || '', name: tx.series || SP.data.content.pages.productList.noSeries, items: [] }; out.push(g); }
        g.items.push(p);
      });
      var order = calc.taxonomyChildren(s.tax, 'series', null).map(function (n) { return n.id; });
      out.sort(function (a, b) { return (order.indexOf(a.id) + 1 || 999) - (order.indexOf(b.id) + 1 || 999); });
      return out;
    }

    // ราคาของ SKU × เดือน สำหรับทุกหน่วยขายที่ Listing ในตัวกรอง → { units: [{ id, det }], same, det (ตัวแทน) }
    function cellInfo(s, key, m) {
      var units = s.unitIds.filter(function (u) { return calc.isListed(s.data.listings, key, u); });
      var list = units.map(function (u) { return { id: u, det: calc.pricingDetail(s.data, key, u, year, m) }; });
      var same = list.every(function (x) { return Math.abs(x.det.price - list[0].det.price) < 0.005; });
      return { units: list, same: same, det: list[0] ? list[0].det : null };
    }

    function calendar(s) {
      if (!s.products.length) return h('p', { class: 'grid-empty' }, P.noSkus);
      var cur = store.get('ui.currentMonth');
      var thead = h('thead', null, h('tr', null, h('th', { class: 'pr-sku', scope: 'col' }, P.columns.sku),
        F.MONTHS.map(function (mn, i) { return h('th', { scope: 'col', class: 'num pr-month' + (i === cur ? ' is-current' : '') }, mn); })));
      var tbody = h('tbody');
      groups(s).forEach(function (g) {
        tbody.appendChild(h('tr', { class: 'pr-group' }, h('th', { colspan: '13', scope: 'rowgroup' }, g.name + ' · ' + g.items.length)));
        g.items.forEach(function (p) {
          var key = calc.productKey(p);
          var cells = [];
          for (var m = 0; m < 12; m++) {
            var info = cellInfo(s, key, m);
            var d = info.det;
            var promo = info.units.some(function (x) { return x.det.promoDays > 0; });
            var partial = info.units.some(function (x) { return x.det.promoDays > 0 && x.det.promoDays < x.det.days; });
            var drafts = info.units.some(function (x) { return x.det.drafts.length > 0; });
            var cls = 'pr-cell' + (promo ? ' is-promo' : ' is-rsp') + (drafts ? ' has-draft' : '') + (!info.same ? ' is-multi' : '') + (canEdit() ? ' is-editable' : '');
            var content;
            if (!d) content = '–';
            else if (!info.same) content = h('span', { class: 'pr-price' }, P.multiPrice);
            else {
              var off = promo && d.rsp > 0 ? 1 - d.price / d.rsp : 0;
              content = [h('span', { class: 'pr-price' }, priceText(d.price)), off > 0.0005 ? h('span', { class: 'pr-off' }, '−' + F.pct(off, 0)) : null];
            }
            cells.push(h('td', { class: 'num ' + cls, tabindex: '0', dataset: { cell: key + '|' + m }, onClick: onCell },
              partial ? h('span', { class: 'promo-mark', 'aria-label': P.legend.partial }, 'P') : null, content));
          }
          tbody.appendChild(h('tr', null,
            h('th', { class: 'pr-sku', scope: 'row' }, h('span', { class: 'pr-sku-line' }, C.productThumb(p, s.tax, { size: 'sm' }),
              h('span', { class: 'pr-sku-text' }, h('span', { class: 'pr-code' }, key), h('span', { class: 'pr-name', title: p.name }, p.name)))),
            cells));
        });
      });
      tbody.appendChild(h('tr', { class: 'sp-filler', 'aria-hidden': 'true' }, h('td', { colspan: '13' })));
      var table = h('table', { class: 'data-grid pr-table' }, thead, tbody);
      var scroll = h('div', { class: 'fit-scroll pr-scroll' }, table);
      tip = C.hoverTip(scroll, '[data-cell]', function (el) { return cellTip(s, el.dataset.cell); });
      function onCell(e) {
        if (!canEdit()) return;
        var parts = e.currentTarget.dataset.cell.split('|');
        var key = parts[0], m = Number(parts[1]);
        var units = s.unitIds.filter(function (u) { return calc.isListed(s.data.listings, key, u); });
        openForm(null, { keys: [key], accounts: units, month: m });
      }
      return scroll;
    }

    function cellTip(s, ref) {
      var parts = ref.split('|');
      var key = parts[0], m = Number(parts[1]);
      var info = cellInfo(s, key, m);
      if (!info.det) return null;
      var T = P.cellTip;
      var lines = [];
      var d = info.det;
      if (info.units.length > 1 && !info.same) {
        info.units.forEach(function (x) { lines.push(h('li', null, fill(T.unit, { unit: unitName(x.id), price: priceText(x.det.price) }))); });
      } else {
        lines.push(h('li', null, fill(T.rsp, { rsp: priceText(d.rsp) })));
        lines.push(h('li', null, h('strong', null, fill(T.price, { price: priceText(d.price) }))));
      }
      var seen = {};
      info.units.forEach(function (x) {
        x.det.promos.forEach(function (u) {
          if (seen[u.promo.id]) return;
          seen[u.promo.id] = true;
          lines.push(h('li', { class: 'pr-tip-promo' }, fill(T.promo, { name: u.promo.name, days: u.days, price: priceText(u.price) })));
        });
        x.det.drafts.forEach(function (u) {
          if (seen[u.promo.id]) return;
          seen[u.promo.id] = true;
          lines.push(h('li', { class: 'pr-tip-draft' }, fill(T.draft, { name: u.promo.name, days: u.days })));
        });
      });
      var p = calc.findProduct(s.data.products, key);
      return [h('div', { class: 'tip-head' }, fill(T.month, { sku: key + ' ' + (p ? p.name : ''), month: F.monthYear(m, year) })), h('ul', { class: 'tip-lines' }, lines)];
    }

    // ------------------------------------------------------------------ รายการ
    function list(s) {
      var Cl = P.columns;
      var first = calc.dateKey(year, 0, 1), last = calc.dateKey(year, 11, 31);
      var keys = s.products.map(function (p) { return calc.productKey(p); });
      var rows = cur().filter(function (p) {
        return keys.indexOf(p.productKey) >= 0 && p.startDate <= last && p.endDate >= first &&
          (p.accountIds || []).some(function (a) { return s.unitIds.indexOf(a) >= 0; });
      }).sort(function (a, b) { return a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0; });
      if (!rows.length) return h('p', { class: 'grid-empty' }, P.empty);
      var body = h('tbody', null, rows.map(function (pr) {
        var p = calc.findProduct(s.data.products, pr.productKey);
        var o = calc.findById(saved, pr.id);
        var changed = editing && (!o || JSON.stringify(o) !== JSON.stringify(pr));
        return h('tr', { class: (pr.status === 'DRAFT' ? 'is-draft' : '') + (changed ? ' is-dirty-row' : '') },
          h('td', null, pr.name),
          h('td', null, h('strong', null, pr.productKey), ' ', p ? p.name : ''),
          h('td', { class: 'pr-accs' }, (pr.accountIds || []).map(unitName).join(', ')),
          h('td', { class: 'nowrap' }, F.date(pr.startDate) + ' – ' + F.date(pr.endDate)),
          h('td', { class: 'num' }, valueText(pr)),
          h('td', { class: 'num' }, pr.promoGpPct != null ? F.pct(pr.promoGpPct, 0) : h('span', { class: 'muted' }, P.gpDefault)),
          h('td', null, statusTag(pr.status)),
          canEdit() ? h('td', { class: 'manage' },
            h('button', { type: 'button', class: 'btn btn-ghost btn-sm pr-edit', onClick: function () { openForm(pr.id); } }, P.editButton),
            C.trashButton({ label: FM.remove, confirmTitle: fill(P.removeConfirm, { name: pr.name, sku: pr.productKey }), onConfirm: function () { removePromo(pr.id); } })) : null);
      }));
      return h('div', { class: 'fit-scroll' }, h('table', { class: 'data-grid pr-list' },
        h('thead', null, h('tr', null, ['name', 'sku', 'accounts', 'dates'].map(function (k) { return h('th', { scope: 'col' }, Cl[k]); }),
          h('th', { scope: 'col', class: 'num' }, Cl.value), h('th', { scope: 'col', class: 'num' }, Cl.gp), h('th', { scope: 'col' }, Cl.status),
          canEdit() ? h('th', { scope: 'col' }, Cl.manage) : null)),
        body));
    }

    function valueText(pr) { return fill(P.valueText[pr.mode], { value: pr.mode === 'DISCOUNT_PCT' ? F.pct(pr.value, 0) : priceText(pr.value) }); }
    function statusTag(st) { return h('span', { class: 'badge ' + (st === 'CONFIRMED' ? 'tag-ok' : 'tag-muted pr-draft-tag') }, P.statuses[st]); }
    function removePromo(id) { draft = draft.filter(function (p) { return p.id !== id; }); drawerCtl.close(); draw(); }

    // ------------------------------------------------------------------ ฟอร์ม (Drawer)
    // id = แก้ไขรายการเดิม / null = สร้างใหม่ (preset = { keys, accounts, month })
    function openForm(id, preset) {
      var s = state();
      var existing = id ? calc.findById(draft, id) : null;
      var f = existing ? clone(existing) : {
        name: '', mode: 'PRICE', value: null, promoGpPct: null, status: 'DRAFT',
        startDate: preset.month != null ? calc.dateKey(year, preset.month, 1) : calc.dateKey(year, 0, 1),
        endDate: preset.month != null ? calc.dateKey(year, preset.month, calc.daysInMonth(year, preset.month)) : calc.dateKey(year, 0, calc.daysInMonth(year, 0))
      };
      var keys = existing ? [existing.productKey] : (preset.keys || []).slice();
      var accounts = existing ? existing.accountIds.slice() : (preset.accounts || []).slice();
      var planUnits = [];
      s.chs.forEach(function (c) { calc.unitsOfChannel(s.data, c.id, true).forEach(function (u) { planUnits.push({ id: u.id, name: u.name, channel: c }); }); });
      var msg = h('div', { class: 'pr-msg', role: 'status' });
      var preview = h('ul', { class: 'pr-preview' });

      C.clear(drawerCtl.head).appendChild(h('div', { class: 'pd-title' }, h('h2', null, existing ? FM.editTitle : FM.newTitle),
        existing ? h('div', { class: 'pd-meta' }, statusTag(existing.status)) : null));
      var body = C.clear(drawerCtl.body);

      function field(label, content, note) { return h('div', { class: 'pd-field' }, h('span', { class: 'pd-label' }, label), h('span', { class: 'pd-value' }, content, note ? h('span', { class: 'muted small pr-note' }, note) : null)); }
      var name = h('input', { type: 'text', class: 'pm-input pd-input', value: f.name, 'aria-label': FM.name });
      name.addEventListener('input', function () { f.name = name.value; });
      var start = h('input', { type: 'date', class: 'pm-input', value: f.startDate, 'aria-label': FM.start });
      var end = h('input', { type: 'date', class: 'pm-input', value: f.endDate, 'aria-label': FM.end });
      start.addEventListener('change', function () { f.startDate = start.value; update(); });
      end.addEventListener('change', function () { f.endDate = end.value; update(); });
      var valueIn = h('input', { type: 'number', class: 'pm-input pr-value', min: '0', step: '0.01', 'aria-label': FM.value,
        value: f.value == null ? '' : String(f.mode === 'DISCOUNT_PCT' ? Math.round(f.value * 10000) / 100 : f.value) });
      var suffix = h('span', { class: 'pr-suffix' }, FM.valueSuffix[f.mode]);
      valueIn.addEventListener('input', function () { readValue(); update(); });
      function readValue() { var v = valueIn.value === '' ? null : Number(valueIn.value); f.value = v == null ? null : f.mode === 'DISCOUNT_PCT' ? v / 100 : v; }
      var modeSlot = h('span');
      function drawMode() {
        C.clear(modeSlot).appendChild(C.segmented({ label: FM.mode, value: f.mode, options: ['PRICE', 'DISCOUNT_PCT'].map(function (m) { return { value: m, label: P.modes[m] }; }),
          onChange: function (v) { f.mode = v; suffix.textContent = FM.valueSuffix[v]; readValue(); drawMode(); update(); } }));
      }
      drawMode();
      var gpIn = h('input', { type: 'number', class: 'pm-input pr-value', min: '0', max: '100', step: '0.1', 'aria-label': FM.gp, value: f.promoGpPct == null ? '' : String(Math.round(f.promoGpPct * 1000) / 10) });
      gpIn.addEventListener('input', function () { f.promoGpPct = gpIn.value === '' ? null : Number(gpIn.value) / 100; });
      var statusSel = C.select({ label: FM.status, value: f.status, className: 'select-sm', options: ['DRAFT', 'CONFIRMED'].map(function (v) { return { value: v, label: P.statuses[v] }; }), onChange: function (v) { f.status = v; } });

      body.appendChild(h('div', { class: 'pd-body' },
        h('section', { class: 'pd-section' },
          field(FM.name, name),
          field(FM.skus, existing ? h('span', null, h('strong', null, existing.productKey), ' ', (calc.findProduct(s.data.products, existing.productKey) || {}).name || '') : skuPicker(s, keys, update)),
          field(FM.accounts, checkList(planUnits.map(function (u) { return { value: u.id, label: u.name, group: u.channel.name }; }), accounts, update, 'pr-acc-list')),
          field(FM.start, start), field(FM.end, end),
          field(FM.mode, modeSlot),
          field(FM.value, h('span', { class: 'pd-inline' }, valueIn, suffix)),
          field(FM.gp, gpIn, FM.gpNote),
          field(FM.status, statusSel)),
        h('section', { class: 'pd-section' }, preview),
        existing ? null : covering(s, keys, accounts),
        msg,
        h('div', { class: 'dlg-actions pr-actions' },
          existing ? C.trashButton({ label: FM.remove, confirmTitle: fill(P.removeConfirm, { name: existing.name, sku: existing.productKey }), onConfirm: function () { removePromo(existing.id); } }) : null,
          existing ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm pr-copy-next', onClick: function () { copyNext(existing.id); } }, FM.copyNext) : null,
          existing ? copyAccountsButton(existing.id, planUnits) : null,
          h('span', { class: 'pr-spacer' }),
          h('button', { type: 'button', class: 'btn btn-ghost', onClick: function () { drawerCtl.close(); } }, L.dialog.cancel),
          h('button', { type: 'button', class: 'btn btn-primary pr-apply', onClick: apply }, FM.save))));

      // ตัวอย่างราคาหลังคำนวณ (RSP ณ วันที่เริ่ม ของ Channel ของหน่วยแรกที่เลือก)
      function rspOf(key) {
        var info = accounts.length ? calc.unitInfo(s.data, accounts[0]) : null;
        return calc.rspOn(s.data.priceList, key, f.startDate || calc.dateKey(year, 0, 1), info && info.channel ? info.channel.id : null);
      }
      function update() {
        C.clear(preview);
        if (!keys.length || !accounts.length || f.value == null) { preview.appendChild(h('li', { class: 'muted' }, FM.previewNone)); return; }
        keys.slice(0, 4).forEach(function (k) {
          var rsp = rspOf(k);
          var price = calc.promoPrice(f, rsp);
          preview.appendChild(h('li', null, fill(FM.preview, { sku: k, price: priceText(price), rsp: priceText(rsp), pct: rsp > 0 ? '−' + F.pct(1 - price / rsp, 1) : '–' })));
        });
        if (keys.length > 4) preview.appendChild(h('li', { class: 'muted' }, fill(FM.previewMore, { n: keys.length - 4 })));
      }
      update();

      function apply() {
        C.clear(msg);
        if (!String(f.name || '').trim()) { showErrors([FM.nameRequired]); return; }
        if (!keys.length) { showErrors([FM.skusRequired]); return; }
        if (f.value == null) { showErrors([FM.errors.price]); return; }
        var others = draft.filter(function (p) { return !existing || p.id !== existing.id; });
        var made = [], errors = [], warnings = [];
        keys.forEach(function (k) {
          var promo = { id: existing ? existing.id : newId(), name: String(f.name).trim(), productKey: k, accountIds: accounts.slice(), startDate: f.startDate, endDate: f.endDate,
            mode: f.mode, value: f.value, promoGpPct: f.promoGpPct, status: f.status, createdBy: existing ? existing.createdBy : (L.roles[role()] || '') };
          var res = calc.validatePromotion(others.concat(made), promo, rspOf(k));
          res.errors.forEach(function (e) { errors.push(e.code === 'overlap' ? fill(FM.errors.overlap, { sku: k, names: e.names.join(', ') }) : FM.errors[e.code]); });
          res.warnings.forEach(function () { warnings.push(fill(FM.warnAboveRsp, { sku: k })); });
          if (res.ok) made.push(promo);
        });
        if (errors.length) { showErrors(errors.filter(function (e, i, a) { return a.indexOf(e) === i; }), warnings); return; }
        draft = others.concat(made);
        drawerCtl.close();
        draw();
      }
      function showErrors(errors, warnings) {
        C.clear(msg);
        msg.appendChild(h('ul', { class: 'pr-errors' }, errors.map(function (e) { return h('li', null, e); })));
        if (warnings && warnings.length) msg.appendChild(h('ul', { class: 'pr-warnings' }, warnings.map(function (w) { return h('li', null, w); })));
      }
      drawerCtl.open();
    }

    // รายการติ๊กเลือกหลายค่า (จัดกลุ่มได้) — แก้ Array selected โดยตรง
    function checkList(options, selected, onChange, className, groupAll) {
      var wrap = h('div', { class: 'pr-check-list ' + (className || '') });
      var byGroup = [];
      options.forEach(function (o) {
        var g = byGroup.filter(function (x) { return x.name === (o.group || ''); })[0];
        if (!g) { g = { name: o.group || '', items: [] }; byGroup.push(g); }
        g.items.push(o);
      });
      function toggle(value, on) {
        var i = selected.indexOf(value);
        if (on && i < 0) selected.push(value);
        if (!on && i >= 0) selected.splice(i, 1);
      }
      // ติ๊กทีละรายการไม่วาดใหม่ (ตำแหน่งเลื่อนของรายการคงเดิม) แค่ปรับช่องของกลุ่มให้ตรง
      byGroup.forEach(function (g) {
        var gb = null;
        var boxes = [];
        function syncGroup() { if (gb) gb.checked = g.items.every(function (o) { return selected.indexOf(o.value) >= 0; }); }
        if (g.name) {
          var text = groupAll ? fill(groupAll, { name: g.name }) : g.name;
          gb = h('input', { type: 'checkbox', 'aria-label': text });
          gb.addEventListener('change', function () {
            g.items.forEach(function (o, i) { toggle(o.value, gb.checked); boxes[i].checked = gb.checked; });
            onChange();
          });
          wrap.appendChild(h('label', { class: 'pr-check-group' }, gb, h('span', null, text)));
        }
        g.items.forEach(function (o) {
          var box = h('input', { type: 'checkbox', checked: selected.indexOf(o.value) >= 0, 'aria-label': o.label });
          box.addEventListener('change', function () { toggle(o.value, box.checked); syncGroup(); onChange(); });
          boxes.push(box);
          wrap.appendChild(h('label', { class: 'pr-check' + (g.name ? ' is-indent' : '') }, box, h('span', null, o.label)));
        });
        syncGroup();
      });
      return wrap;
    }

    // SKU หลายรายการ จัดกลุ่มตาม Series (ติ๊กชื่อ Series = ทั้ง Series) + ค้นหา
    function skuPicker(s, keys, onChange) {
      var tax = s.tax;
      var wrap = h('div', { class: 'pr-sku-picker' });
      var q = h('input', { type: 'search', class: 'ss-search', placeholder: P.search, 'aria-label': P.search });
      var slot = h('div');
      var count = h('span', { class: 'muted small' });
      function changed() { count.textContent = fill(FM.skusSelected, { n: keys.length }); onChange(); }
      function drawSkus() {
        var text = q.value.trim().toLowerCase();
        var opts = s.products.filter(function (p) { return !text || (calc.productKey(p) + ' ' + p.name).toLowerCase().indexOf(text) >= 0; }).map(function (p) {
          return { value: calc.productKey(p), label: calc.productKey(p) + ' · ' + p.name, group: calc.taxonomyName(tax, 'series', p.seriesId) || SP.data.content.pages.productList.noSeries };
        });
        C.clear(slot).appendChild(checkList(opts, keys, changed, 'pr-sku-list', FM.selectSeries));
        count.textContent = fill(FM.skusSelected, { n: keys.length });
      }
      q.addEventListener('input', drawSkus);
      drawSkus();
      wrap.appendChild(q);
      wrap.appendChild(slot);
      wrap.appendChild(count);
      return wrap;
    }

    // Promotion ที่ครอบช่องที่คลิก (แก้ไขรายการเดิมได้จากตรงนี้)
    function covering(s, keys, accounts) {
      if (keys.length !== 1) return null;
      var hits = draft.filter(function (p) {
        return p.productKey === keys[0] && (p.accountIds || []).some(function (a) { return accounts.indexOf(a) >= 0; }) &&
          p.startDate <= calc.dateKey(year, 11, 31) && p.endDate >= calc.dateKey(year, 0, 1);
      });
      if (!hits.length) return null;
      return h('section', { class: 'pd-section' }, h('h3', null, FM.existingTitle),
        h('ul', { class: 'pd-list' }, hits.map(function (p) {
          return h('li', null, p.name + ' · ' + F.date(p.startDate) + ' – ' + F.date(p.endDate) + ' · ' + valueText(p) + ' · ' + P.statuses[p.status] + ' ',
            h('button', { type: 'button', class: 'link-btn', onClick: function () { openForm(p.id); } }, P.editButton));
        })));
    }

    // คัดลอกไปเดือนถัดไป (ช่วงเดียวกันของเดือนถัดไป ทั้งเดือน → ทั้งเดือนถัดไป)
    function copyNext(id) {
      var src = calc.findById(draft, id);
      var next = calc.shiftPromotion(src, 1);
      next.id = newId();
      next.status = 'DRAFT';
      var res = calc.validatePromotion(draft, next, calc.rspOn(store.data().priceList, next.productKey, next.startDate, null));
      if (!res.ok) { window.alert(res.errors.map(function (e) { return e.code === 'overlap' ? fill(FM.errors.overlap, { sku: next.productKey, names: e.names.join(', ') }) : FM.errors[e.code]; }).join('\n')); return; }
      draft.push(next);
      openForm(next.id);
      draw();
    }

    function copyAccountsButton(id, planUnits) {
      var btn = h('button', { type: 'button', class: 'btn btn-secondary btn-sm pr-copy-acc' }, FM.copyAccounts);
      C.popover(btn, function (close) {
        var src = calc.findById(draft, id);
        var picked = [];
        var options = planUnits.filter(function (u) { return src.accountIds.indexOf(u.id) < 0; }).map(function (u) { return { value: u.id, label: u.name, group: u.channel.name }; });
        var msg = h('p', { class: 'pr-msg', role: 'status' });
        return [h('h3', { class: 'popover-title' }, FM.copyAccountsTitle), checkList(options, picked, function () {}, 'pr-acc-list'), msg,
          h('div', { class: 'series-foot' }, h('button', { type: 'button', class: 'btn btn-primary btn-sm pr-copy-apply', onClick: function () {
            if (!picked.length) { msg.textContent = FM.errors.accounts; return; }
            var copy = clone(src);
            copy.id = newId();
            copy.accountIds = picked.slice();
            copy.status = 'DRAFT';
            var res = calc.validatePromotion(draft, copy, calc.rspOn(store.data().priceList, copy.productKey, copy.startDate, null));
            if (!res.ok) { msg.textContent = res.errors.map(function (e) { return e.code === 'overlap' ? fill(FM.errors.overlap, { sku: copy.productKey, names: e.names.join(', ') }) : FM.errors[e.code]; }).join(' · '); return; }
            draft.push(copy);
            close();
            draw();
            openForm(id);
            var m = drawerCtl.body.querySelector('.pr-msg');
            if (m) m.textContent = fill(FM.copied, { n: 1 });
          } }, FM.copyApply))];
      }, { className: 'pr-copy-popover', label: FM.copyAccountsTitle });
      return btn;
    }

    draw();
  }

  SP.modules.promotionPrice = { render: render };
})(window.SP);
