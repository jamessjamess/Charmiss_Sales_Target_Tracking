/*
 * modules/promotions/promotions.js — Product Master · ราคาขายต่อ Account (CR-18) / Promotion Price (Flag promotionCalendar)
 *
 * หน้าที่:        CR-18 (promotionCalendar ปิด = ค่าตั้งต้น): ราคาขายต่อ Account — renderAccountPrices (ดูคำอธิบายที่ฟังก์ชัน)
 *                 ราคารวม VAT ราคาเดียวทั้งปี ช่องว่าง = ใช้ RSP / ผู้แก้ไข: ทีม Product / เขียน master.accountPrices
 *                 Flag promotionCalendar เปิด = ปฏิทิน Promotion รายเดือนเดิม (renderCalendar) ด้านล่าง:
 *                 แถบตัวกรอง: Channel (Segmented ตามแผนของปี) · หน่วยขาย (หลายค่า) · Series · ค้นหา SKU · มุมมอง ปฏิทินรายเดือน | รายการ
 *                 ปฏิทิน: แถว = SKU (จัดกลุ่มตาม Series) × 12 เดือน ช่อง = ราคาที่มีผลเฉลี่ยของเดือน (calc.pricingDetail ถ่วงตามจำนวนวัน
 *                 ฟังก์ชันเดียวกับหน้าวางแผน SKU) + ป้าย −x% เทียบ RSP / ไม่มี Promotion = RSP สีจาง / Promotion บางวัน = P มุมซ้ายบน /
 *                 ฉบับร่าง = เส้นประ (ไม่นับในราคา) / หลายหน่วยราคาไม่เท่ากัน = "หลายราคา" + Tooltip แยกรายหน่วย
 *                 รายการ: ชื่อ · SKU · หน่วยขาย · ช่วงวันที่ · ราคา/ส่วนลด · GP ช่วง Promotion · สถานะ
 *                 โหมดแก้ไข (Trade Marketing): คลิกช่อง → ฟอร์ม (Drawer) ค่าเริ่มต้นทั้งเดือน / SKU และหน่วยขายหลายค่า / ราคาหรือส่วนลด % /
 *                 GP ช่วง Promotion (ไม่บังคับ) / ตัวอย่างราคา / คัดลอกไปเดือนถัดไป · หน่วยขายอื่น / ตรวจซ้อนกันด้วย calc.validatePromotion
 *                 ค่าที่แก้อยู่ใน draft จนกด บันทึก (workflowBar แบบง่าย) / ล็อก Baseline แล้ว → Promotion มีผลกับ Forecast เท่านั้น
 * อ่านจาก data/:  channels, settings, content (pages.promotionPrice, labels) + Master ผ่าน store.data()
 * store อ่าน:     app.planYear, plan.<ปี>.topDown (.channels), plan.<ปี>.workflow (ล็อก Baseline), master.accountPrices, master.promotions, master.products,
 *                 master.listings, master.priceList, master.taxonomy, master.accounts, master.territories,
 *                 ui.productMaster.channel (ร่วมกับหน้า Listing), ui.seriesFilter, ui.role
 * store เขียน:    master.accountPrices (CR-18) / master.promotions (ปฏิทิน) และ master.audit (ตอนกด บันทึก), ui.productMaster.channel, ui.seriesFilter
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var Perm = SP.core.permissions;
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

  function renderCalendar(root, ctx) {
    var page = ctx.page;
    var P = page;
    var FM = page.form;
    var L = SP.data.content.labels;
    var year = store.year();
    var editing = false;
    var saved = store.get('master.promotions');
    var draft = clone(saved);
    var locked = SP.core.features.locked(W.isLocked(store.workflowStates()));   // CR-17: ปิด baseline = ไม่ล็อก

    function cur() { return editing ? draft : saved; }
    // CR-21: สิทธิ์จากตารางสิทธิ์ (หน้า Promotion Price)
    function byName() { return C.roleName(store.role()); }
    function canEdit() { return editing && Perm.can(Perm.user(), 'promotionPrice'); }
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
      simple: true,
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); draw(); },
      onSave: function () {
        var by = byName(), at = new Date().toISOString();
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
            mode: f.mode, value: f.value, promoGpPct: f.promoGpPct, status: f.status, createdBy: existing ? existing.createdBy : (byName()) };
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

  // ====================================================================== ราคาขายต่อ Account (CR-18 · Flag promotionCalendar ปิด)
  // ตาราง: แถว = SKU (จัดกลุ่มตาม Series) · คอลัมน์ = RSP + 1 คอลัมน์ต่อ Account ของ Channel ที่เลือก (เฉพาะ Channel ที่แบ่งตาม Account)
  //   ช่องว่าง = ใช้ RSP (ตัวจาง) / ราคาต่างจาก RSP = ตัวหนา พื้นสีอ่อน ป้าย −x% / ไม่ได้ Listing = สีเทา แก้ไม่ได้ / ! = ควรตรวจสอบ (เตือน ไม่บล็อก)
  //   โหมดแก้ไข (ทีม Product): กรอกราคา · ลบค่า = ใช้ RSP · เลือกหลายช่อง → ตั้งราคา… / ลด x% จาก RSP / ใช้ RSP ·
  //   คีย์บอร์ดและ Excel ด้วย components.gridKeys (Grid กลางเดียวกับหน้าวางแผน SKU: วาง/เติมปัดเป็นบาทเต็ม) · Ctrl+Z
  // store อ่าน/เขียน: master.accountPrices (+ master.audit ตอนกด บันทึก) / อ่าน ui.productMaster.channel, ui.seriesFilter
  function renderAccountPrices(root, ctx) {
    var P = ctx.page.accountPrices;
    var L = SP.data.content.labels;
    var S = SP.data.settings;
    var year = store.year();
    var start = calc.dateKey(year, 0, 1);
    var editing = false;
    var saved = store.get('master.accountPrices') || [];
    var draft = clone(saved);
    var undo = C.undoStack(S.UNDO_LIMIT);
    var locked = SP.core.features.locked(W.isLocked(store.workflowStates()));
    var tip = null, keys = null, lastCell = null, refs = null;

    function cur() { return editing ? draft : saved; }
    function byName() { return C.roleName(store.role()); }
    function canEdit() { return editing && Perm.can(Perm.user(), 'promotionPrice'); }
    function pairs(list) { var o = {}; list.forEach(function (r) { o[r.productKey + '|' + r.accountId] = r.price; }); return o; }
    function changedPairs() {
      var a = pairs(saved), b = pairs(draft), out = [];
      Object.keys(a).forEach(function (k) { if (a[k] !== b[k]) out.push(k); });
      Object.keys(b).forEach(function (k) { if (!(k in a)) out.push(k); });
      return out;
    }
    function dirty() { return editing ? changedPairs().length : 0; }
    C.guardUnsaved(dirty);

    var bar = C.workflowBar({
      simple: true,
      editing: function () { return editing; },
      onEdit: function () { editing = true; draft = clone(saved); undo.clear(); draw(); },
      onSave: function () {
        var by = byName(), at = new Date().toISOString();
        var a = pairs(saved), b = pairs(draft), entries = [];
        changedPairs().forEach(function (k) {
          var parts = k.split('|');
          entries = entries.concat(calc.auditDiff('accountPrice', parts[0] + ' · ' + unitName(parts[1]),
            k in a ? { price: a[k] } : null, k in b ? { price: b[k] } : null, { by: by, at: at }));
        });
        store.set('master.accountPrices', draft);
        store.appendAudit(entries);
        saved = clone(draft);
        editing = false;
        undo.clear();
        draw();
      },
      onCancel: function () { editing = false; draft = clone(saved); undo.clear(); draw(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    function unitName(id) { var i = calc.unitInfo(store.data(), id); return i ? i.unit.name : id; }
    function pctText(diff) { return (diff < 0 ? '−' : '+') + F.pct(Math.abs(diff), 0); }

    // Channel ที่แบ่งตาม Account ในแผนของปี (TT แบ่งตามเขต ใช้ราคา Dealer ไม่อยู่ในหน้านี้)
    function state() {
      var data = store.data();
      data.accountPrices = cur();
      var chs = (store.get(store.planKey('topDown')).channels || []).map(function (id) { return calc.findById(data.channels, id); })
        .filter(function (c) { return c && c.allocationUnit === 'ACCOUNT'; });
      var ch = calc.findById(chs, store.get('ui.productMaster.channel')) || chs[0] || null;
      var units = ch ? calc.unitsOfChannel(data, ch.id, true) : [];
      var tax = store.get('master.taxonomy');
      var seriesOptions = calc.seriesList(tax, data.products);
      var series = (store.get('ui.seriesFilter') || []).filter(function (s) { return seriesOptions.some(function (o) { return o.value === s; }); });
      var q = query.trim().toLowerCase();
      var products = data.products.filter(function (p) {
        var key = calc.productKey(p);
        if ((p.itemType || 'SALE') !== 'SALE' || !calc.soldInYear(p, year) || !calc.inSeries(p, series)) return false;
        if (q && (key + ' ' + p.name + ' ' + (p.shortName || '')).toLowerCase().indexOf(q) < 0) return false;
        return units.some(function (u) { return calc.isListed(data.listings, key, u.id); });
      });
      return { data: data, chs: chs, ch: ch, units: units, tax: tax, seriesOptions: seriesOptions, series: series, products: products };
    }

    // RSP ของ SKU ใน Channel ณ ต้นปีแผน + ราคาที่เปลี่ยนระหว่างปี (แสดงใน Tooltip)
    function rspInfo(s, key) {
      var rsp = calc.priceOn(s.data.priceList, key, 'RSP', s.ch.id, start);
      var change = null;
      for (var m = 1; m < 12 && !change; m++) {
        var v = calc.priceOn(s.data.priceList, key, 'RSP', s.ch.id, calc.dateKey(year, m, 1));
        if (v != null && rsp != null && Math.abs(v - rsp) > 0.005) change = { m: m, price: v };
      }
      return { rsp: rsp, change: change };
    }

    // สถานะของช่อง SKU × Account → { listed, price (null = ใช้ RSP), rsp, diff, custom, warnings }
    function cellOf(s, key, unit, rsp) {
      var listed = calc.isListed(s.data.listings, key, unit.id);
      var price = calc.accountPriceOf(cur(), key, unit.id);
      var chk = price != null ? calc.checkAccountPrice(price, rsp) : { warnings: [], diff: null };
      return { listed: listed, price: price, rsp: rsp, diff: chk.diff, custom: price != null && rsp != null && Math.abs(price - rsp) > 0.005,
        warnings: listed ? chk.warnings : [] };
    }

    function groups(s) {
      var out = [];
      s.products.forEach(function (p) {
        var g = out.filter(function (x) { return x.id === (p.seriesId || ''); })[0];
        if (!g) { g = { id: p.seriesId || '', name: calc.productTaxonomy(s.tax, p).series || SP.data.content.pages.productList.noSeries, items: [] }; out.push(g); }
        g.items.push(p);
      });
      var order = calc.taxonomyChildren(s.tax, 'series', null).map(function (n) { return n.id; });
      out.sort(function (a, b) { return (order.indexOf(a.id) + 1 || 999) - (order.indexOf(b.id) + 1 || 999); });
      return out;
    }

    function draw() {
      if (tip) tip.hide();
      C.clear(root);
      bar.update();
      var s = state();
      refs = { s: s, cells: {} };
      var search = h('input', { type: 'search', class: 'search-input pr-search', placeholder: P.search, 'aria-label': P.search, value: query });
      search.addEventListener('change', function () { query = search.value; draw(); });
      search.addEventListener('keydown', function (e) { if (e.key === 'Enter') { query = search.value; draw(); } });
      root.appendChild(h('div', { class: 'tool-row pr-toolbar' },
        s.ch ? C.segmented({ label: L.picker.channel, value: s.ch.id, options: s.chs.map(function (c) { return { value: c.id, label: c.name, title: c.fullName }; }),
          onChange: function (v) { store.set('ui.productMaster.channel', v); draw(); } }) : null,   // draft ครอบทุก Channel: เปลี่ยน Channel ไม่ทิ้งค่า
        C.seriesFilter({ options: s.seriesOptions, value: s.series, onChange: function (v) { store.set('ui.seriesFilter', v); draw(); } }),
        search,
        h('span', { class: 'tool-right' }, legend())));
      if (editing) {
        var banner = C.editBanner();
        banner.update(dirty());
        refs.banner = banner;
        refs.selText = h('span', { class: 'ap-sel-text' });
        refs.tools = [
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm ap-set', onClick: setPrice }, P.tools.set),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm ap-discount', onClick: discount }, P.tools.discount),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm ap-rsp', onClick: useRsp }, P.tools.rsp)
        ];
        root.appendChild(h('div', { class: 'tool-row ap-edit-row' }, banner, h('span', { class: 'ap-tools' }, refs.selText, refs.tools)));
        root.appendChild(h('p', { class: 'master-hint pr-hint' }, P.editHint));
      }
      refs.warnNote = h('p', { class: 'ap-warn-note', role: 'status' });
      root.appendChild(refs.warnNote);
      if (locked) root.appendChild(h('p', { class: 'callout callout-info pr-locked' }, P.baselineNote));
      var card = h('div', { class: 'card fit-card pr-card' });
      root.appendChild(card);
      card.appendChild(table(s));
      updateSelection();
      updateWarnNote();
    }

    function legend() {
      var G = P.legend;
      return h('span', { class: 'legend pr-legend' },
        h('span', { class: 'legend-item' }, h('span', { class: 'ap-sw' }, h('span', { class: 'ap-faint' }, '199')), G.rsp),
        h('span', { class: 'legend-item' }, h('span', { class: 'ap-sw is-custom' }, '149'), G.custom),
        h('span', { class: 'legend-item' }, h('span', { class: 'ap-sw is-unlisted' }, '–'), G.unlisted),
        h('span', { class: 'legend-item' }, h('span', { class: 'ap-sw' }, h('span', { class: 'ap-warn' }, '!')), G.warn));
    }

    function table(s) {
      if (!s.ch) return h('p', { class: 'grid-empty' }, P.noChannels);
      if (!s.units.length) return h('p', { class: 'grid-empty' }, fill(P.noUnits, { unit: s.ch.unitLabel }));
      if (!s.products.length) return h('p', { class: 'grid-empty' }, P.noSkus);
      var n = s.units.length;
      var thead = h('thead', null, h('tr', null,
        h('th', { class: 'pr-sku', scope: 'col' }, P.columns.sku),
        h('th', { class: 'num ap-rsp-col', scope: 'col', 'data-col': '0', title: fill(P.columns.rspTitle, { year: year }) }, P.columns.rsp),
        s.units.map(function (u, i) { return h('th', { class: 'num ap-unit-col', scope: 'col', 'data-col': String(i + 1), title: u.name }, u.name); })));
      var tbody = h('tbody');
      groups(s).forEach(function (g) {
        tbody.appendChild(h('tr', { class: 'pr-group' }, h('th', { colspan: String(n + 2), scope: 'rowgroup' }, g.name + ' · ' + g.items.length)));
        g.items.forEach(function (p) {
          var key = calc.productKey(p);
          var ri = rspInfo(s, key);
          var row = { key: key, product: p, rsp: ri.rsp, change: ri.change, tds: [] };
          refs.cells[key] = row;
          var cells = s.units.map(function (u, i) {
            var td = h('td', { class: 'num ap-cell', 'data-col': String(i + 1), dataset: { cell: key + '|' + u.id } });
            row.tds.push({ td: td, unit: u });
            paintCell(td, key, u, row);
            return td;
          });
          tbody.appendChild(h('tr', { 'data-row': key },
            h('th', { class: 'pr-sku', scope: 'row' }, h('span', { class: 'pr-sku-line' }, C.productThumb(p, s.tax, { size: 'sm' }),
              h('span', { class: 'pr-sku-text' }, h('span', { class: 'pr-code' }, key), h('span', { class: 'pr-name', title: p.name }, calc.displayName(p))))),
            h('td', { class: 'num ap-cell ap-rsp-cell', 'data-col': '0', tabindex: '0', dataset: { cell: key + '|' } },
              h('span', { class: 'ap-rsp-value' }, priceText(ri.rsp)),
              ri.change ? h('span', { class: 'ap-sub' }, fill(P.rspChange, { price: priceText(ri.change.price), month: F.MONTHS[ri.change.m] })) : null),
            cells));
        });
      });
      var tbl = h('table', { class: 'data-grid pr-table ap-table', style: { '--ap-cols': String(n) } }, thead, tbody);
      var scroll = h('div', { class: 'fit-scroll pr-scroll' }, tbl);
      tip = C.hoverTip(scroll, '[data-cell]', function (el) { return cellTip(s, el.dataset.cell); });
      keys = C.gridKeys(tbl, {
        editing: canEdit(), cols: n + 1, pasteCols: n + 1,
        valueAt: function (key, col) {
          var row = refs.cells[key];
          if (!row) return null;
          if (col === 0) return row.rsp;
          var u = s.units[col - 1];
          return u ? calc.accountPriceOf(cur(), key, u.id) : null;
        },
        apply: writeCells,
        undo: undoLast
      });
      tbl.addEventListener('focusin', function (e) { var td = e.target.closest && e.target.closest('td[data-col]'); if (td) lastCell = td; updateSelection(); });
      tbl.addEventListener('mouseup', function () { setTimeout(updateSelection, 0); });
      tbl.addEventListener('keyup', updateSelection);
      return scroll;
    }

    // วาดช่อง SKU × Account ตามค่าปัจจุบัน (ช่องกรอกเดิมคงไว้ ไม่เสียโฟกัส)
    function paintCell(td, key, unit, row) {
      var c = cellOf(refs.s, key, unit, row.rsp);
      var dirtyCell = editing && calc.accountPriceOf(saved, key, unit.id) !== calc.accountPriceOf(draft, key, unit.id);
      td.className = 'num ap-cell' + (!c.listed ? ' is-unlisted' : c.custom ? ' is-custom' : c.price != null ? ' is-set' : ' is-rsp') +
        (c.warnings.length ? ' has-warn' : '') + (dirtyCell ? ' is-dirty-cell' : '');
      var input = td.querySelector('input');
      if (!c.listed) {
        C.clear(td);
        td.setAttribute('tabindex', '0');
        td.appendChild(h('span', { class: 'ap-price', 'aria-label': fill(P.tip.unlisted, { unit: unit.name }) }, '–'));
        return;
      }
      var meta = [c.custom ? h('span', { class: 'ap-off' }, pctText(c.diff)) : null,
        c.warnings.length ? h('span', { class: 'ap-warn', 'aria-label': c.warnings.map(function (w) { return P.warnings[w]; }).join(' · ') }, '!') : null];
      if (canEdit()) {
        td.removeAttribute('tabindex');
        if (!input) {
          C.clear(td);
          input = h('input', { type: 'text', inputmode: 'decimal', class: 'num ap-input', 'aria-label': key + ' · ' + unit.name + ' (' + L.baht + ')' });
          input.addEventListener('change', function () { commitInput(input, key, unit); });
          td.appendChild(input);
          td.appendChild(h('span', { class: 'ap-meta' }));
        }
        if (document.activeElement !== input || input.dataset.force) input.value = c.price != null ? priceText(c.price) : '';
        delete input.dataset.force;
        input.placeholder = priceText(c.rsp);
        var box = td.querySelector('.ap-meta');
        C.clear(box);
        meta.forEach(function (m) { if (m) box.appendChild(m); });
        return;
      }
      C.clear(td);
      td.setAttribute('tabindex', '0');
      td.appendChild(h('span', { class: 'ap-price' + (c.price == null ? ' ap-faint' : '') }, priceText(c.price != null ? c.price : c.rsp)));
      meta.forEach(function (m) { if (m) td.appendChild(m); });
    }

    function commitInput(input, key, unit) {
      var raw = String(input.value).replace(/[,\s฿]/g, '');
      if (raw === '') { writeCells([{ key: key, m: colOf(unit), qty: 0 }]); return; }
      var v = Number(raw);
      if (!isFinite(v) || v <= 0) { input.dataset.force = '1'; repaint(key, unit.id); return; }
      writeCells([{ key: key, m: colOf(unit), qty: v }]);
    }
    function colOf(unit) { return refs.s.units.indexOf(unit) + 1; }

    // writes = [{ key, m (คอลัมน์ 1..n), qty (ราคา · 0 = ใช้ RSP) }] จาก gridKeys หรือเครื่องมือ
    function writeCells(writes) {
      if (!canEdit() || !writes || !writes.length) return;
      var next = draft, touched = [];
      writes.forEach(function (w) {
        var u = refs.s.units[w.m - 1];
        if (!u || !calc.isListed(refs.s.data.listings, w.key, u.id)) return;
        next = calc.setAccountPrice(next, w.key, u.id, w.qty > 0 ? w.qty : null);
        touched.push([w.key, u.id]);
      });
      if (!touched.length) return;
      undo.push(draft);
      draft = next;
      touched.forEach(function (t) { repaint(t[0], t[1], true); });
      afterChange();
    }
    function repaint(key, unitId, force) {
      var row = refs.cells[key];
      if (!row) return;
      row.tds.forEach(function (x) {
        if (x.unit.id !== unitId) return;
        var inp = x.td.querySelector('input');
        if (inp && force) inp.dataset.force = '1';
        paintCell(x.td, key, x.unit, row);
      });
    }
    function afterChange() {
      if (refs.banner) refs.banner.update(dirty());
      if (keys) keys.refresh();
      updateWarnNote();
    }
    function undoLast() {
      var prev = undo.pop();
      if (!prev) return;
      draft = prev;
      Object.keys(refs.cells).forEach(function (key) { refs.cells[key].tds.forEach(function (x) { var inp = x.td.querySelector('input'); if (inp) inp.dataset.force = '1'; paintCell(x.td, key, x.unit, refs.cells[key]); }); });
      afterChange();
    }

    // ช่องที่เลือก: ช่วงที่ลาก / Shift (is-sel) หรือช่องที่โฟกัสล่าสุด → เฉพาะช่องที่แก้ได้
    function selectedCells() {
      if (!refs || !refs.cells) return [];
      var tds = Array.prototype.slice.call(root.querySelectorAll('td.ap-cell.is-sel[data-col]'));
      if (!tds.length && lastCell && root.contains(lastCell)) tds = [lastCell];
      var out = [];
      tds.forEach(function (td) {
        var col = Number(td.dataset.col);
        var tr = td.closest('tr[data-row]');
        if (!tr || col < 1 || !td.querySelector('input')) return;
        var row = refs.cells[tr.dataset.row];
        if (row) out.push({ key: row.key, m: col, rsp: row.rsp });
      });
      return out;
    }
    function updateSelection() {
      if (!refs || !refs.selText) return;
      var n = selectedCells().length;
      refs.selText.textContent = n ? fill(P.tools.selected, { n: n }) : P.tools.none;
      refs.tools.forEach(function (b) { b.disabled = !n; });
    }
    function setPrice() {
      var sel = selectedCells();
      if (!sel.length) return;
      C.promptNumber({ title: P.tools.setTitle, label: P.tools.setLabel, suffix: L.baht, hint: fill(P.tools.hint, { n: sel.length }), invalidText: P.tools.invalid })
        .then(function (r) {
          if (!r.ok || !(r.value > 0)) return;
          writeCells(sel.map(function (c) { return { key: c.key, m: c.m, qty: r.value }; }));
        });
    }
    function discount() {
      var sel = selectedCells();
      if (!sel.length) return;
      C.promptNumber({ title: P.tools.discountTitle, label: P.tools.discountLabel, suffix: '%', hint: fill(P.tools.hint, { n: sel.length }), invalidText: P.tools.invalid })
        .then(function (r) {
          if (!r.ok || !(r.value > 0) || r.value >= 100) return;
          writeCells(sel.filter(function (c) { return c.rsp > 0; }).map(function (c) { return { key: c.key, m: c.m, qty: Math.round(c.rsp * (1 - r.value / 100) * 100) / 100 }; }));
        });
    }
    function useRsp() {
      var sel = selectedCells();
      writeCells(sel.map(function (c) { return { key: c.key, m: c.m, qty: 0 }; }));
    }

    // ราคาที่ควรตรวจสอบ (ทุก SKU × Account ของ Channel ที่เลือก ตามตัวกรอง)
    function updateWarnNote() {
      if (!refs || !refs.warnNote) return;
      var n = 0;
      Object.keys(refs.cells).forEach(function (key) {
        var row = refs.cells[key];
        row.tds.forEach(function (x) { if (cellOf(refs.s, key, x.unit, row.rsp).warnings.length) n++; });
      });
      refs.warnNote.textContent = n ? fill(P.warnNote, { n: n, pct: F.pct(S.ACCOUNT_PRICE_WARN_BELOW, 0) }) : '';
      refs.warnNote.hidden = !n;
    }

    function cellTip(s, ref) {
      var parts = ref.split('|');
      var key = parts[0], unitId = parts[1];
      var row = refs.cells[key];
      if (!row) return null;
      var T = P.tip, lines = [];
      var head = key + ' ' + calc.displayName(row.product);
      if (!unitId) {
        lines.push(h('li', null, fill(T.rsp, { price: priceText(row.rsp), year: year })));
        if (row.change) lines.push(h('li', null, fill(T.rspChange, { price: priceText(row.change.price), month: F.monthYear(row.change.m, year) })));
        return [h('div', { class: 'tip-head' }, head), h('ul', { class: 'tip-lines' }, lines)];
      }
      var u = s.units.filter(function (x) { return x.id === unitId; })[0];
      if (!u) return null;
      var c = cellOf(s, key, u, row.rsp);
      head += ' · ' + u.name;
      if (!c.listed) lines.push(h('li', null, fill(T.unlisted, { unit: u.name })));
      else if (c.price != null) {
        lines.push(h('li', null, h('strong', null, fill(T.account, { price: priceText(c.price) }))));
        if (c.diff != null) lines.push(h('li', null, fill(T.vsRsp, { pct: pctText(c.diff), rsp: priceText(c.rsp) })));
        c.warnings.forEach(function (w) { lines.push(h('li', { class: 'text-over' }, P.warnings[w])); });
      } else {
        lines.push(h('li', null, fill(T.useRsp, { price: priceText(c.rsp) })));
        if (row.change) lines.push(h('li', null, fill(T.rspChange, { price: priceText(row.change.price), month: F.monthYear(row.change.m, year) })));
      }
      if (c.listed) lines.push(h('li', { class: 'muted' }, fill(T.year, { year: year })));
      return [h('div', { class: 'tip-head' }, head), h('ul', { class: 'tip-lines' }, lines)];
    }

    draw();
  }

  SP.modules.promotionPrice = {
    render: function (root, ctx) {
      return SP.core.features.isOn('promotionCalendar') ? renderCalendar(root, ctx) : renderAccountPrices(root, ctx);
    }
  };
})(window.SP);
