/*
 * modules/products/products.js — Product Master · รายการสินค้า
 *
 * หน้าที่:        KPI 5 ใบ (ทั้งหมด · Active · New · ขาดข้อมูลจำเป็น · ขาดข้อมูลที่ควรมี) กดแล้วกรองตาราง
 *                 แถบค้นหาและตัวกรองแถวเดียว: ค้นหา · มุมมอง รายการ | จัดกลุ่ม · Status · หมวดสินค้า · Series · Channel · Item Type
 *                 · ความครบถ้วน / ปุ่มขวา: เลือกคอลัมน์ · ส่งออก CSV · เปรียบเทียบกับ ERP · (แก้ไข) + เพิ่ม SKU
 *                 ตาราง: รูปและรหัสติดซ้าย หัวตารางติดบน เลื่อนภายในการ์ด / มุมมองจัดกลุ่ม = Series → Sub Series พร้อมจำนวนตาม Status
 *                 คลิกแถว → Drawer รายละเอียด (ข้อมูลทั่วไป · ราคา · Listing และวงจรสินค้า · ประวัติการแก้ไข)
 *                 เปิดมาเป็นโหมดดู / แก้ไข (ทีม Product) → แก้ใน Drawer, เพิ่ม SKU (รหัสชั่วคราวได้), ราคาใหม่, ใช้ค่าจาก ERP → บันทึก/ยกเลิก
 *                 ผูกรหัสจริง (โหมดดู): ย้ายทุกข้อมูลที่อ้างรหัสชั่วคราวไปใช้ TR Code รวมแผน SKU ทุกปี (calc.bindTrCode, calc.renamePlanKey)
 *                 Status (ณ เดือนปัจจุบันจำลอง), ความครบถ้วน, ราคา คำนวณจาก calc เท่านั้น / รูปย่อด้วย Canvas (components.resizeImage)
 * อ่านจาก data/:  channels, settings, erp-snapshot, content (pages.productList, labels) + Master ผ่าน store.data()
 * store อ่าน:     master.products, master.priceList, master.accountPrices, master.listings, master.promotions, master.npdPlans, master.taxonomy, master.audit,
 *                 master.accounts, master.territories, ui.seriesFilter, ui.productColumns, ui.currentMonth, ui.role, plan.<ปี>.sku/forecast.*
 * รับตัวกรองจากหน้าหมวดสินค้าและ Series (CR-15): ui.productFilterHandoff = { node, level, series } อ่านครั้งเดียวตอนเปิดหน้าแล้วลบ
 *                 → กรองหมวดสินค้าระดับใดก็ได้ (Category / Sub Category / Type) + Series (ui.seriesFilter)
 * store เขียน:    master.products, master.priceList, master.audit (ตอนกด บันทึก) / ผูกรหัสจริง: master.products, listings, priceList,
 *                 accountPrices, promotions, npdPlans, plan.<ปี>.sku.* และ plan.<ปี>.forecast.* ที่บันทึกไว้ / ui.seriesFilter, ui.productColumns
 * CR-20:          ป้าย "จาก Sales" (สินค้าที่ Sales สร้างจากหน้าวางแผน SKU source SALES_REQUEST) + ตัวกรองที่มา: ทีม Product / จาก Sales
 * CR-18:          แท็บราคา = ประวัติ RSP / ราคา Dealer + ราคาต่อ Account (แก้ที่หน้าราคาขายต่อ Account) · Promotion เฉพาะเมื่อเปิด Flag promotionCalendar
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

  var OPTIONAL = ['internalCode', 'barcode', 'itemType', 'packSize', 'launchDate', 'listedCount', 'sellIn', 'updatedAt'];
  var filters = { q: '', status: '', category: '', channel: '', itemType: 'SALE', completeness: '', source: '', kpi: '', node: '', nodeLevel: '' };
  var view = 'list';
  var tab = 'general';

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var PF = L.productFields;
    var year = store.year();
    var today = store.today();
    var editing = false;
    var saved = { products: store.get('master.products'), priceList: store.get('master.priceList') };
    var draft = clone(saved);
    var selected = null;     // productKey ที่เปิดใน Drawer
    var creating = false;    // Drawer อยู่ในโหมดเพิ่ม SKU
    var notice = null;

    // ตัวกรองที่ส่งมาจากหน้าหมวดสินค้าและ Series (ใช้ครั้งเดียว)
    var handoff = store.get('ui.productFilterHandoff');
    if (handoff) {
      store.remove('ui.productFilterHandoff');
      filters = { q: '', status: '', category: '', channel: '', itemType: '', completeness: '', source: '', kpi: '', node: handoff.node || '', nodeLevel: handoff.level || '' };
      store.set('ui.seriesFilter', handoff.series || []);
    }

    function cur() { return editing ? draft : saved; }
    // CR-21: สิทธิ์จากตารางสิทธิ์ (หน้ารายการสินค้า) / ผู้แก้ไข = ผู้ใช้ในมุมมองปัจจุบัน
    function byName() { return C.roleName(store.role()); }
    function canEdit() { return Perm.can(Perm.user(), 'productList'); }
    function tax() { return store.get('master.taxonomy'); }

    function diffCount() {
      var n = 0;
      draft.products.forEach(function (p) {
        var o = calc.findProduct(saved.products, calc.productKey(p));
        if (!o || JSON.stringify(o) !== JSON.stringify(p)) n++;
      });
      n += saved.products.filter(function (o) { return !calc.findProduct(draft.products, calc.productKey(o)); }).length;
      n += Math.max(0, draft.priceList.length - saved.priceList.length);
      return n;
    }
    function dirty() { return editing ? diffCount() : 0; }
    C.guardUnsaved(dirty);

    var bar = C.workflowBar({
      simple: true,
      editing: function () { return editing; },
      onEdit: function () { startEdit(); },
      onSave: function () { save(); },
      onCancel: function () { editing = false; creating = false; draft = clone(saved); notice = null; draw(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    function startEdit() { editing = true; draft = clone(saved); draw(); }

    function save() {
      var by = byName(), at = new Date().toISOString();
      var entries = [];
      draft.products.forEach(function (p) {
        var key = calc.productKey(p);
        var o = calc.findProduct(saved.products, key);
        if (o && JSON.stringify(o) === JSON.stringify(p)) return;
        p.updatedAt = at;
        entries = entries.concat(calc.auditDiff('product', key, o, p, { by: by, at: at }));
      });
      saved.products.forEach(function (o) {
        var key = calc.productKey(o);
        if (!calc.findProduct(draft.products, key)) entries = entries.concat(calc.auditDiff('product', key, o, null, { by: by, at: at }));
      });
      draft.priceList.slice(saved.priceList.length).forEach(function (r) {
        entries.push({ entity: 'price', key: r.productKey, field: 'price', oldValue: null, newValue: { priceType: r.priceType, channelId: r.channelId, price: r.price, effectiveFrom: r.effectiveFrom }, by: by, at: at });
      });
      // ราคาเดิมที่ถูกปิดช่วง (effectiveTo) บันทึกพร้อมกัน
      store.set('master.products', draft.products);
      store.set('master.priceList', draft.priceList);
      store.appendAudit(entries);
      saved = clone(draft);
      editing = false;
      creating = false;
      notice = null;
      draw();
    }

    // ------------------------------------------------------------------ ตัวช่วย
    function statusOf(p) { return calc.productStatus(p, today.slice(0, 7)); }
    function completeness(p) { return calc.productCompleteness(p, cur().priceList); }
    function rsp(p) { return calc.rspOn(cur().priceList, calc.productKey(p), today); }
    function listings() { return store.get('master.listings'); }
    function unitChannel(unitId) { var i = calc.unitInfo(store.data(), unitId); return i && i.channel ? i.channel.id : null; }
    function referenced(p) {
      var key = calc.productKey(p);
      return listings().some(function (l) { return l.productKey === key; }) ||
        store.get('master.promotions').some(function (x) { return x.productKey === key; }) ||
        (store.get('master.accountPrices') || []).some(function (x) { return x.productKey === key; }) ||
        store.get('master.npdPlans').some(function (x) { return x.productKey === key; });
    }

    function sourceOf(p) { return p.source === 'SALES_REQUEST' ? 'sales' : 'product'; }
    // ป้าย "จาก Sales" + Tooltip ผู้ขอ · วันที่ · หน่วยขาย · หมายเหตุ
    function salesTag(p) {
      if (sourceOf(p) !== 'sales') return null;
      var r = p.request || {};
      var d = store.data();
      var units = (r.unitIds || []).map(function (u) { var i = calc.unitInfo(d, u); return i ? i.unit.name : u; }).join(', ');
      return h('span', { class: 'badge tag-warn pl-from-sales', title: fill(page.filters.fromSalesTip, { by: p.requestedBy || '–', date: p.requestedAt ? F.date(p.requestedAt.slice(0, 10)) : '–', units: units || '–', note: r.note || '–' }) },
        page.filters.fromSales);
    }
    function matches(p, skip) {
      var q = filters.q.trim().toLowerCase();
      if (q) {
        var text = [p.trCode, p.tempCode, p.internalCode, p.barcode, p.name, p.shortName, p.nameEn].filter(Boolean).join(' ').toLowerCase();
        if (text.indexOf(q) < 0) return false;
      }
      var st = statusOf(p), c = completeness(p);
      if (filters.status && st !== filters.status) return false;
      if (filters.category && p.categoryId !== filters.category) return false;
      if (filters.node && p[calc.taxonomyField(filters.nodeLevel)] !== filters.node) return false;
      if (!calc.inSeries(p, store.get('ui.seriesFilter') || [])) return false;
      if (filters.channel && !listings().some(function (l) { return l.productKey === calc.productKey(p) && unitChannel(l.accountId) === filters.channel; })) return false;
      if (filters.itemType && (p.itemType || 'SALE') !== filters.itemType) return false;
      if (filters.completeness && c.level !== filters.completeness) return false;
      if (filters.source && sourceOf(p) !== filters.source) return false;
      if (!skip && filters.kpi) {
        if ((filters.kpi === 'active' || filters.kpi === 'new') && st !== filters.kpi) return false;
        if ((filters.kpi === 'required' || filters.kpi === 'recommended') && c.level !== filters.kpi) return false;
      }
      return true;
    }

    function optionalOn() { return (store.get('ui.productColumns') || []).filter(function (k) { return OPTIONAL.indexOf(k) >= 0; }); }

    // คอลัมน์ที่แสดง (ใช้ทั้งตารางและ CSV) → [{ key, label, value(p), cls }]
    function columns() {
      var T = tax();
      var Cl = page.columns;
      var base = [
        { key: 'code', label: Cl.code, value: function (p) { return calc.productKey(p); } },
        { key: 'name', label: Cl.name, value: function (p) { return p.name; } },
        { key: 'status', label: Cl.status, value: function (p) { return L.status[statusOf(p)]; } },
        { key: 'category', label: Cl.category, group: 'cat', value: function (p) { return calc.taxonomyName(T, 'category', p.categoryId); } },
        { key: 'subCategory', label: Cl.subCategory, group: 'cat', value: function (p) { return calc.taxonomyName(T, 'category', p.subCategoryId); } },
        { key: 'type', label: Cl.type, group: 'cat', value: function (p) { return calc.taxonomyName(T, 'category', p.typeId); } },
        { key: 'series', label: Cl.series, value: function (p) { return calc.taxonomyName(T, 'series', p.seriesId); } },
        { key: 'subSeries', label: Cl.subSeries, value: function (p) { return calc.taxonomyName(T, 'series', p.subSeriesId); } },
        { key: 'rsp', label: Cl.rsp, num: true, value: function (p) { return rsp(p); } },
        { key: 'completeness', label: Cl.completeness, value: function (p) { var c = completeness(p); return c.level === 'ok' ? L.product.complete : c.level === 'required' ? fill(L.product.missingRequired, { n: c.missingRequired.length }) : fill(L.product.missingRecommended, { n: c.missingRecommended.length }); } }
      ];
      var extra = {
        internalCode: { key: 'internalCode', label: Cl.internalCode, value: function (p) { return p.internalCode; } },
        barcode: { key: 'barcode', label: Cl.barcode, value: function (p) { return p.barcode; } },
        itemType: { key: 'itemType', label: Cl.itemType, value: function (p) { return L.itemTypes[p.itemType || 'SALE']; } },
        packSize: { key: 'packSize', label: Cl.packSize, value: function (p) { return p.packSize != null && p.packSize !== '' ? p.packSize + ' ' + (p.uom || '') : ''; } },
        launchDate: { key: 'launchDate', label: Cl.launchDate, value: function (p) { return p.launchDate ? F.date(p.launchDate) : ''; } },
        listedCount: { key: 'listedCount', label: Cl.listedCount, num: true, value: function (p) { return calc.listedAccounts(listings(), calc.productKey(p)).length; } },
        sellIn: { key: 'sellIn', label: fill(Cl.sellIn, { channel: sellInChannel().name }), num: true, value: function (p) { return calc.priceOn(cur().priceList, calc.productKey(p), 'SELL_IN', sellInChannel().id, today); } },
        updatedAt: { key: 'updatedAt', label: Cl.updatedAt, value: function (p) { return p.updatedAt ? F.dateTime(p.updatedAt) : ''; } }
      };
      return base.concat(optionalOn().map(function (k) { return extra[k]; }));
    }
    // ราคาขายเข้า: Channel ที่กรอง / ไม่กรอง = Channel แรกที่ใช้ราคา Dealer (priceBasis = SELL_IN) คำนวณยอดขาย
    function sellInChannel() {
      return calc.findById(SP.data.channels, filters.channel) || SP.data.channels.filter(function (c) { return c.priceBasis === 'SELL_IN'; })[0] || SP.data.channels[0];
    }
    // ป้าย "ระบบกำหนด" ของหมวดสินค้าที่ได้จากคำในชื่อสินค้า (CR-11)
    function inferredTag(p) {
      return p.inferred ? h('span', { class: 'badge tag-muted pd-inferred', title: L.product.inferredTitle }, L.product.inferredTag) : null;
    }

    // ------------------------------------------------------------------ วาดหน้า
    var drawerCtl = C.drawer({ label: page.title, className: 'product-drawer', onClose: function () { selected = null; creating = false; highlight(); } });
    var erpCtl = C.drawer({ label: page.erp.title, className: 'erp-drawer' });
    var tableSlot = null;

    function draw() {
      C.clear(root);
      bar.update();
      var products = cur().products;
      var P = page.kpi;

      // KPI 5 ใบ (นับจากสินค้าตามตัวกรองอื่น ยกเว้นการกด KPI)
      var base = products.filter(function (p) { return matches(p, true); });
      function count(fn) { return base.filter(fn).length; }
      var kpis = [
        { key: '', label: P.all, n: base.length },
        { key: 'active', label: P.active, n: count(function (p) { return statusOf(p) === 'active'; }) },
        { key: 'new', label: P['new'], n: count(function (p) { return statusOf(p) === 'new'; }) },
        { key: 'required', label: P.required, n: count(function (p) { return completeness(p).level === 'required'; }), cls: 'is-danger' },
        { key: 'recommended', label: P.recommended, n: count(function (p) { return completeness(p).level === 'recommended'; }), cls: 'is-warn' }
      ];
      root.appendChild(h('div', { class: 'pl-kpis' }, kpis.map(function (k) {
        return h('button', {
          type: 'button', class: 'card pl-kpi ' + (k.cls || '') + (filters.kpi === k.key ? ' is-selected' : ''), title: P.title,
          'aria-pressed': filters.kpi === k.key ? 'true' : 'false',
          onClick: function () { filters.kpi = filters.kpi === k.key ? '' : k.key; draw(); }
        }, h('span', { class: 'pl-kpi-label' }, k.label), h('strong', { class: 'pl-kpi-value' }, F.number(k.n)), h('span', { class: 'pl-kpi-unit' }, P.unit));
      })));

      root.appendChild(toolbar());
      var summary = filterSummary(products);
      if (summary) root.appendChild(summary);
      if (editing) { var b = C.editBanner(); b.update(dirty()); root.appendChild(b); }
      if (notice) root.appendChild(h('p', { class: 'pl-notice', role: 'status' }, notice));
      tableSlot = h('div', { class: 'card fit-card pl-card' });
      root.appendChild(tableSlot);
      renderTable();
      if (drawerCtl.isOpen()) renderDrawer();
    }

    function toolbar() {
      var T = tax();
      var Fl = page.filters;
      var search = h('input', { type: 'search', class: 'search-input pl-search', placeholder: page.searchPlaceholder, 'aria-label': page.searchPlaceholder, value: filters.q });
      search.addEventListener('input', function () { filters.q = search.value; renderTable(); });
      // แถวเดียว: ป้ายของตัวกรองอยู่ในตัวเลือกแรก (เช่น "ทุก Status") และ Tooltip / aria-label
      function sel(label, key, options) {
        var el = C.select({ label: label, value: filters[key], options: options, className: filters[key] ? 'is-active' : '', onChange: function (v) { filters[key] = v; draw(); } });
        el.title = label;
        return el;
      }
      var colBtn = h('button', { type: 'button', class: 'btn btn-secondary btn-sm pl-columns' }, page.columnsButton + ' ▾');
      C.popover(colBtn, function () {
        var on = optionalOn();
        return [h('h3', { class: 'popover-title' }, page.columnsTitle), h('ul', { class: 'series-list' }, OPTIONAL.map(function (k) {
          var box = h('input', { type: 'checkbox', checked: on.indexOf(k) >= 0, 'aria-label': colLabel(k) });
          box.addEventListener('change', function () {
            var next = optionalOn().filter(function (x) { return x !== k; });
            if (box.checked) next.push(k);
            store.set('ui.productColumns', OPTIONAL.filter(function (x) { return next.indexOf(x) >= 0; }));
            renderTable();
          });
          return h('li', null, h('label', { class: 'series-option' }, box, h('span', { class: 'series-name' }, colLabel(k))));
        }))];
      }, { className: 'series-popover', label: page.columnsTitle, align: 'right' });
      function colLabel(k) { return k === 'sellIn' ? fill(page.columns.sellIn, { channel: sellInChannel().name }) : page.columns[k]; }

      return h('div', { class: 'tool-row pl-toolbar' },
        search,
        C.segmented({ label: page.viewLabel, value: view, options: ['list', 'group'].map(function (v) { return { value: v, label: page.views[v] }; }), onChange: function (v) { view = v; draw(); } }),
        sel(Fl.status, 'status', [{ value: '', label: Fl.statusAll }].concat(['planned', 'new', 'active', 'clearance', 'discontinued'].map(function (s) { return { value: s, label: L.status[s] }; }))),
        sel(Fl.category, 'category', [{ value: '', label: Fl.categoryAll }].concat(calc.taxonomyChildren(T, 'category', null).map(function (n) { return { value: n.id, label: n.name }; }))),
        C.seriesFilter({ options: calc.seriesList(T, cur().products), value: store.get('ui.seriesFilter') || [], onChange: function (v) { store.set('ui.seriesFilter', v); draw(); } }),
        sel(Fl.channel, 'channel', [{ value: '', label: Fl.channelAll }].concat(SP.data.channels.map(function (c) { return { value: c.id, label: c.name }; }))),
        sel(Fl.itemType, 'itemType', [{ value: '', label: Fl.itemTypeAll }].concat(SP.data.settings.ITEM_TYPES.map(function (t) { return { value: t, label: L.itemTypes[t] }; }))),
        sel(Fl.completeness, 'completeness', [{ value: '', label: Fl.completenessAll }].concat(['ok', 'required', 'recommended'].map(function (k) { return { value: k, label: Fl.completenessOptions[k] }; }))),
        sel(Fl.source, 'source', [{ value: '', label: Fl.sourceAll }].concat(['product', 'sales'].map(function (k) { return { value: k, label: Fl.sourceOptions[k] }; }))),
        h('span', { class: 'tool-right' },
          colBtn,
          h('button', { type: 'button', class: 'btn btn-secondary btn-sm pl-csv', onClick: exportCsv }, page.exportCsv),
          h('button', { type: 'button', class: 'btn btn-secondary btn-sm pl-erp', onClick: openErp }, page.compareErp),
          editing ? h('button', { type: 'button', class: 'btn btn-primary btn-sm pl-add', onClick: openCreate }, page.addSku) : null));
    }

    function filterSummary(products) {
      var T = tax();
      var Fl = page.filters;
      var parts = [];
      if (filters.kpi) parts.push(page.kpi[filters.kpi]);
      if (filters.q.trim()) parts.push('"' + filters.q.trim() + '"');
      if (filters.status) parts.push(Fl.status + ' ' + L.status[filters.status]);
      if (filters.category) parts.push(calc.taxonomyName(T, 'category', filters.category));
      if (filters.source) parts.push(Fl.source + ' ' + Fl.sourceOptions[filters.source]);
      if (filters.node) parts.push(calc.taxonomyName(T, 'category', filters.node));
      (store.get('ui.seriesFilter') || []).forEach(function (s) { parts.push(calc.taxonomyName(T, 'series', s) || L.series.none); });
      if (filters.channel) parts.push(Fl.channel + ' ' + calc.findById(SP.data.channels, filters.channel).name);
      if (filters.itemType) parts.push(L.itemTypes[filters.itemType]);
      if (filters.completeness) parts.push(Fl.completenessOptions[filters.completeness]);
      var n = products.filter(function (p) { return matches(p); }).length;
      return h('div', { class: 'pl-summary' },
        h('span', { class: 'pl-count' }, fill(page.resultCount, { n: F.number(n), total: F.number(products.length) })),
        parts.length ? h('span', null, ' · ' + fill(page.filterSummary, { list: parts.join(' · ') }) + ' ') : null,
        parts.length ? h('button', { type: 'button', class: 'link-btn pl-clear', onClick: function () {
          filters = { q: '', status: '', category: '', channel: '', itemType: '', completeness: '', source: '', kpi: '', node: '', nodeLevel: '' };
          store.set('ui.seriesFilter', []);
          draw();
        } }, page.clearFilters) : null,
        h('span', { class: 'pl-asof' }, ' · ' + fill(page.statusAsOf, { month: F.date(today) })));
    }

    // ------------------------------------------------------------------ ตาราง
    function renderTable() {
      if (!tableSlot) return;
      var T = tax();
      var cols = columns();
      var shown = cur().products.filter(function (p) { return matches(p); });
      var Cl = page.columns;
      var catCols = cols.filter(function (c) { return c.group === 'cat'; }).length;
      var head1 = [h('th', { class: 'pl-img', scope: 'col', rowspan: '2' }, Cl.image)];
      var head2 = [];
      var catDone = false;
      cols.forEach(function (c) {
        if (c.group === 'cat') {
          if (!catDone) { head1.push(h('th', { scope: 'colgroup', colspan: String(catCols), class: 'pl-group-head' }, Cl.categoryGroup)); catDone = true; }
          head2.push(h('th', { scope: 'col' }, c.label));
        } else {
          head1.push(h('th', { scope: 'col', rowspan: '2', class: (c.key === 'code' ? 'pl-code ' : '') + (c.num ? 'num' : '') }, c.label));
        }
      });
      head1.push(h('th', { scope: 'col', rowspan: '2', class: 'manage' }, Cl.manage));
      var body = h('tbody');
      if (!shown.length) body.appendChild(h('tr', null, h('td', { class: 'grid-empty', colspan: String(cols.length + 2) }, page.empty)));
      if (view === 'group') {
        var groups = [];
        function groupOf(p) {
          var sid = p.seriesId || '', ssid = p.subSeriesId || '';
          var g = groups.filter(function (x) { return x.sid === sid && x.ssid === ssid; })[0];
          if (!g) { g = { sid: sid, ssid: ssid, items: [] }; groups.push(g); }
          return g;
        }
        shown.forEach(function (p) { groupOf(p).items.push(p); });
        var order = calc.seriesList(T, cur().products).map(function (o) { return o.value; });
        groups.sort(function (a, b) {
          var ia = order.indexOf(a.ssid || a.sid), ib = order.indexOf(b.ssid || b.sid);
          return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
        });
        groups.forEach(function (g) {
          var name = (calc.taxonomyName(T, 'series', g.sid) || page.noSeries) + ' → ' + (calc.taxonomyName(T, 'series', g.ssid) || page.noSubSeries);
          var byStatus = {};
          g.items.forEach(function (p) { var st = statusOf(p); byStatus[st] = (byStatus[st] || 0) + 1; });
          body.appendChild(h('tr', { class: 'is-group' }, h('td', { colspan: String(cols.length + 2) },
            h('span', { class: 'pl-group-name' }, fill(page.groupHead, { name: name, n: g.items.length })),
            h('span', { class: 'pl-group-status' }, ['planned', 'new', 'active', 'clearance', 'discontinued'].filter(function (s) { return byStatus[s]; }).map(function (s) {
              return C.statusBadge(s, String(byStatus[s]));
            })))));
          g.items.forEach(function (p) { body.appendChild(rowOf(p, cols)); });
        });
      } else {
        shown.forEach(function (p) { body.appendChild(rowOf(p, cols)); });
      }
      var table = h('table', { class: 'data-grid pl-table' + (view === 'group' ? ' is-grouped' : '') },
        h('thead', null, h('tr', null, head1), h('tr', { class: 'pl-head2' }, head2)), body);
      C.clear(tableSlot).appendChild(h('div', { class: 'fit-scroll pl-scroll' }, table));
      var summary = root.querySelector('.pl-count');
      if (summary) summary.textContent = fill(page.resultCount, { n: F.number(shown.length), total: F.number(cur().products.length) });
      highlight();
    }

    function rowOf(p, cols) {
      var T = tax();
      var key = calc.productKey(p);
      var tds = cols.map(function (c) {
        if (c.key === 'code') {
          return h('td', { class: 'pl-code' }, h('span', { class: 'pl-code-text' }, key), p.trCode ? null : h('span', { class: 'badge tag-warn pl-temp' }, L.product.tempTag), salesTag(p));
        }
        if (c.key === 'name') return h('td', { class: 'ellipsis pl-name', title: p.name }, p.name);
        if (c.key === 'status') {
          var segs = calc.statusSegments(p, year);
          return h('td', { title: segs.map(function (s) { return F.monthRange(s.from, s.to) + ' ' + L.status[s.status]; }).join(' · ') }, C.statusBadge(statusOf(p)));
        }
        if (c.key === 'completeness') return h('td', null, C.completenessBadge(completeness(p)));
        var v = c.value(p);
        if (c.key === 'rsp' || c.key === 'sellIn') return h('td', { class: 'num' }, v == null ? '–' : F.baht(v, 2));
        if (c.num) return h('td', { class: 'num' }, v == null ? '–' : F.number(v));
        // หมวดสินค้าที่ระบบกำหนดจากชื่อ (CR-11): เส้นประใต้ข้อความ + Tooltip ให้ตรวจสอบ
        if (c.group === 'cat' && p.inferred && v) return h('td', { class: 'ellipsis is-inferred', title: v + ' · ' + L.product.inferredTitle }, v);
        return h('td', { class: 'ellipsis', title: v || '' }, v || '–');
      });
      var manage = h('td', { class: 'manage' }, h('span', { class: 'manage-group' },
        editing && canEdit() ? C.trashButton({
          label: page.removeTitle, disabled: referenced(p), disabledTitle: page.removeBlocked,
          confirmTitle: fill(page.removeConfirm, { code: key }),
          onConfirm: function () {
            draft.products = draft.products.filter(function (x) { return calc.productKey(x) !== key; });
            draft.priceList = draft.priceList.filter(function (r) { return r.productKey !== key; });
            if (selected === key) drawerCtl.close();
            draw();
          }
        }) : null,
        h('button', { type: 'button', class: 'icon-btn pl-open', title: page.viewDetail, 'aria-label': page.viewDetail + ' ' + key }, '›')));
      return h('tr', {
        class: 'is-clickable' + (p.itemType && p.itemType !== 'SALE' ? ' is-nonsale' : ''), dataset: { key: key },
        onClick: function (e) {
          if (e.target.closest && e.target.closest('.trash-btn')) return;
          openProduct(key);
        }
      }, h('td', { class: 'pl-img' }, C.productThumb(p, T, { size: 'sm' })), tds, manage);
    }

    function highlight() {
      if (!tableSlot) return;
      Array.prototype.forEach.call(tableSlot.querySelectorAll('tr[data-key]'), function (tr) { tr.classList.toggle('is-selected', tr.dataset.key === selected); });
    }

    // ------------------------------------------------------------------ CSV
    function exportCsv() {
      var cols = columns();
      var rows = cur().products.filter(function (p) { return matches(p); });
      var d = new Date();
      var stamp = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
      SP.core['export'].downloadCsv(fill(page.csvFile, { date: stamp }) + '.csv', rows, cols.map(function (c) { return { key: c.key, label: c.label, value: c.value }; }));
    }

    // ------------------------------------------------------------------ Drawer รายละเอียดสินค้า
    function openProduct(key) {
      selected = key;
      creating = false;
      renderDrawer();
      drawerCtl.open();
      highlight();
    }

    function openCreate() {
      if (!editing) return;
      creating = true;
      selected = null;
      renderDrawer();
      drawerCtl.open();
    }

    function product() { return selected ? calc.findProduct(cur().products, selected) : null; }

    function renderDrawer() {
      C.clear(drawerCtl.head);
      C.clear(drawerCtl.body);
      if (creating) { renderCreate(); return; }
      var p = product();
      if (!p) { drawerCtl.close(); return; }
      var T = tax();
      var key = calc.productKey(p);
      var c = completeness(p);
      drawerCtl.head.appendChild(h('div', { class: 'pd-head' },
        C.productThumb(p, T, { size: 'md' }),
        h('div', { class: 'pd-title' },
          h('h2', null, p.name || '–'),
          h('div', { class: 'pd-meta' },
            h('span', { class: 'pd-code' }, key), p.trCode ? null : h('span', { class: 'badge tag-warn' }, L.product.tempTag),
            C.statusBadge(statusOf(p)),
            h('span', { class: 'pd-pct' }, fill(page.completenessPct, { pct: F.pct(c.pct, 0) })), C.completenessBadge(c))),
        !editing && canEdit() ? h('button', { type: 'button', class: 'btn btn-primary btn-sm pd-edit', onClick: function () { startEdit(); } }, page.edit) : null));
      drawerCtl.body.appendChild(C.segmented({
        label: page.title, value: tab,
        options: ['general', 'price', 'listing', 'history'].map(function (t) { return { value: t, label: page.tabs[t] }; }),
        onChange: function (v) { tab = v; renderDrawer(); }
      }));
      if (editing) { var b = C.editBanner(); b.update(dirty()); drawerCtl.body.appendChild(b); }
      var body = h('div', { class: 'pd-body' });
      drawerCtl.body.appendChild(body);
      if (tab === 'general') general(body, p);
      else if (tab === 'price') prices(body, p);
      else if (tab === 'listing') lifecycle(body, p);
      else history(body, p);
    }

    function field(label, content, cls) { return h('div', { class: 'pd-field ' + (cls || '') }, h('span', { class: 'pd-label' }, label), h('span', { class: 'pd-value' }, content)); }
    function dval(v) { return v == null || v === '' ? '–' : v; }

    function refresh() { renderDrawer(); renderTable(); var b = root.querySelector('.edit-banner'); if (b) b.update(dirty()); }

    function original(key) { return calc.findProduct(saved.products, key); }
    function isDirty(p, f) { var o = original(calc.productKey(p)); return editing && (!o || JSON.stringify(o[f]) !== JSON.stringify(p[f])); }

    function textInput(p, f, label, opts) {
      opts = opts || {};
      var input = h('input', { type: opts.type || 'text', class: 'pm-input pd-input' + (isDirty(p, f) ? ' is-dirty-cell' : ''), value: p[f] == null ? '' : String(p[f]), 'aria-label': label, min: opts.min, step: opts.step });
      input.addEventListener('change', function () {
        var v = input.value.trim();
        p[f] = opts.type === 'number' ? (v === '' ? null : Number(v)) : v;
        refresh();
      });
      return input;
    }

    function general(body, p) {
      var T = tax();
      var G = page.general;
      var key = calc.productKey(p);
      var tx = calc.productTaxonomy(T, p);
      if (!editing) {
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.codes),
          field(PF.trCode, dval(p.trCode)), field(PF.tempCode, dval(p.tempCode)), field(PF.internalCode, dval(p.internalCode)), field(PF.barcode, dval(p.barcode)),
          p.tempCodeHistory && p.tempCodeHistory.length ? field(PF.tempCode, fill(G.tempHistory, { code: p.tempCodeHistory.join(', ') })) : null));
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.names), field(PF.name, dval(p.name)), field(PF.shortName, dval(p.shortName)), field(PF.nameEn, dval(p.nameEn))));
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.category, inferredTag(p)),
          field(PF.categoryId, dval(tx.category)), field(PF.subCategoryId, dval(tx.subCategory)), field(PF.typeId, dval(tx.type))));
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.series), field(PF.seriesId, dval(tx.series)), field(PF.subSeriesId, dval(tx.subSeries))));
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.other),
          field(PF.itemType, L.itemTypes[p.itemType || 'SALE']), field(PF.packSize, p.packSize != null && p.packSize !== '' ? p.packSize + ' ' + (p.uom || '') : '–'),
          p.note ? field(G.note, p.note) : null));
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.image), C.productThumb(p, T, { size: 'lg' })));
        if (!p.trCode && p.tempCode && canEdit()) body.appendChild(bindForm(p));
        return;
      }
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.codes),
        field(PF.trCode, p.trCode ? textInput(p, 'trCode', PF.trCode) : h('span', { class: 'muted' }, G.tempNote)),
        field(PF.tempCode, dval(p.tempCode)),
        field(PF.internalCode, textInput(p, 'internalCode', PF.internalCode)),
        field(PF.barcode, textInput(p, 'barcode', PF.barcode))));
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.names),
        field(PF.name, textInput(p, 'name', PF.name)), field(PF.shortName, textInput(p, 'shortName', PF.shortName)), field(PF.nameEn, textInput(p, 'nameEn', PF.nameEn))));
      // เลือกหมวดสินค้าเอง = ยืนยันแล้ว (ล้างเครื่องหมาย "ระบบกำหนด")
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.category, inferredTag(p)),
        C.cascadeSelect({ tax: T, kind: 'category', value: p, labels: [PF.categoryId, PF.subCategoryId, PF.typeId], placeholder: G.placeholder,
          dirty: function (f) { return isDirty(p, f); },
          onChange: function (v) { Object.keys(v).forEach(function (k) { p[k] = v[k]; }); p.inferred = false; refresh(); } })));
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.series),
        C.cascadeSelect({ tax: T, kind: 'series', value: p, labels: [PF.seriesId, PF.subSeriesId], placeholder: G.placeholder,
          dirty: function (f) { return isDirty(p, f); },
          onChange: function (v) { Object.keys(v).forEach(function (k) { p[k] = v[k]; }); refresh(); } })));
      var itemSel = C.select({ label: PF.itemType, value: p.itemType || 'SALE', className: 'select-sm' + (isDirty(p, 'itemType') ? ' is-dirty-cell' : ''),
        options: SP.data.settings.ITEM_TYPES.map(function (t) { return { value: t, label: L.itemTypes[t] }; }),
        onChange: function (v) { p.itemType = v; refresh(); } });
      var uomSel = C.select({ label: PF.uom, value: p.uom || SP.data.settings.UOMS[0], className: 'select-sm' + (isDirty(p, 'uom') ? ' is-dirty-cell' : ''),
        options: SP.data.settings.UOMS.map(function (u) { return { value: u, label: u }; }), onChange: function (v) { p.uom = v; refresh(); } });
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.other),
        field(PF.itemType, itemSel), field(PF.packSize, h('span', { class: 'pd-inline' }, textInput(p, 'packSize', PF.packSize, { type: 'number', min: '0', step: 'any' }), uomSel)),
        field(G.note, textInput(p, 'note', G.note))));
      body.appendChild(imageEditor(p));
    }

    function imageEditor(p) {
      var T = tax();
      var G = page.general;
      var file = h('input', { type: 'file', accept: 'image/*', class: 'pd-file', 'aria-label': G.imageUpload });
      var msg = h('span', { class: 'pm-msg', role: 'status' });
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f) return;
        C.resizeImage(f, SP.data.settings.IMAGE_MAX_PX).then(function (url) { p.image = url; refresh(); }, function () { msg.className = 'pm-msg is-error'; msg.textContent = G.imageError; });
      });
      return h('section', { class: 'pd-section' + (isDirty(p, 'image') ? ' is-dirty-cell' : '') }, h('h3', null, G.image),
        h('div', { class: 'pd-image' }, C.productThumb(p, T, { size: 'lg' }),
          h('div', { class: 'pd-image-actions' },
            h('label', { class: 'btn btn-secondary btn-sm pd-upload' }, G.imageUpload, file),
            p.image ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: function () { p.image = null; refresh(); } }, G.imageRemove) : null,
            h('span', { class: 'muted small' }, fill(G.imageNote, { px: SP.data.settings.IMAGE_MAX_PX })), msg)));
    }

    // ผูกรหัสจริง (โหมดดูเท่านั้น): ย้ายทุกข้อมูลที่อ้างรหัสชั่วคราว + แผน SKU ทุกปีที่บันทึกไว้
    function bindForm(p) {
      var B = page.bind;
      var input = h('input', { type: 'text', class: 'pm-input', 'aria-label': B.label, placeholder: B.label });
      var msg = h('span', { class: 'pm-msg', role: 'status' });
      return h('section', { class: 'pd-section pd-bind' }, h('h3', null, B.button),
        h('div', { class: 'pd-inline' }, input,
          h('button', { type: 'button', class: 'btn btn-primary btn-sm pd-bind-btn', onClick: function () {
            var code = input.value.trim();
            var master = { products: store.get('master.products'), listings: store.get('master.listings'), priceList: store.get('master.priceList'),
              accountPrices: store.get('master.accountPrices'), promotions: store.get('master.promotions'), npdPlans: store.get('master.npdPlans') };
            var check = calc.bindTrCode(master, p.tempCode, code);
            if (!check.ok) { msg.className = 'pm-msg is-error'; msg.textContent = B.errors[check.error] || check.error; return; }
            C.dialog({ title: fill(B.title, { temp: p.tempCode, code: code }), lines: B.lines, confirmLabel: B.button }).then(function (r) {
              if (!r.ok) return;
              var out = check.master;
              var bound = calc.findProduct(out.products, code);
              bound.tempCodeHistory = (bound.tempCodeHistory || []).concat([p.tempCode]);
              bound.updatedAt = new Date().toISOString();
              store.set('master.products', out.products);
              store.set('master.listings', out.listings);
              store.set('master.priceList', out.priceList);
              store.set('master.accountPrices', out.accountPrices);
              store.set('master.promotions', out.promotions);
              store.set('master.npdPlans', out.npdPlans);
              store.keys().filter(function (k) { return /^plan\.\d{4}\.(sku|forecast)\./.test(k); }).forEach(function (k) {
                var plan = store.get(k);
                var moved = calc.renamePlanKey(plan, p.tempCode, code);
                if (moved !== plan) store.set(k, moved);
              });
              store.appendAudit([{ entity: 'product', key: code, field: 'trCode', oldValue: p.tempCode, newValue: code, by: byName(), at: bound.updatedAt }]);
              saved = { products: store.get('master.products'), priceList: store.get('master.priceList') };
              draft = clone(saved);
              selected = code;
              draw();
            });
          } }, B.button)),
        msg);
    }

    function prices(body, p) {
      var Pr = page.price;
      var key = calc.productKey(p);
      var list = calc.priceHistory(cur().priceList, key);
      // ราคาเฉพาะ Account แสดงชื่อ Account / ราคาของ Channel แสดงชื่อ Channel / ไม่ระบุ = ทุก Channel
      var data = store.data();
      var chName = function (r) {
        if (r.accountId) { var u = calc.unitInfo(data, r.accountId); return fill(Pr.accountOnly, { unit: u ? u.unit.name : r.accountId }); }
        var c = calc.findById(SP.data.channels, r.channelId); return c ? c.name : Pr.allChannels;
      };
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, Pr.historyTitle),
        list.length ? h('table', { class: 'data-grid pd-price-table' },
          h('thead', null, h('tr', null, ['type', 'channel', 'from', 'to'].map(function (k) { return h('th', { scope: 'col' }, Pr.columns[k]); }),
            h('th', { scope: 'col', class: 'num' }, Pr.columns.price), h('th', { scope: 'col' }, Pr.columns.by))),
          h('tbody', null, list.map(function (r) {
            var isNew = editing && !saved.priceList.some(function (x) { return JSON.stringify(x) === JSON.stringify(r); });
            return h('tr', { class: isNew ? 'is-new' : null },
              h('td', null, Pr.types[r.priceType]), h('td', null, chName(r)), h('td', null, F.date(r.effectiveFrom)),
              h('td', null, r.effectiveTo ? F.date(r.effectiveTo) : Pr.open), h('td', { class: 'num' }, F.baht(r.price, 2)), h('td', null, r.by || '–'));
          }))) : h('p', { class: 'muted' }, Pr.noPrice)));
      if (editing) body.appendChild(priceForm(p));
      // CR-18: ราคาต่อ Account (ราคาเดียวทั้งปี รวม VAT) เทียบ RSP ณ วันนี้ของ Channel ของ Account
      var accPrices = (store.get('master.accountPrices') || []).filter(function (x) { return x.productKey === key; });
      var pageLink = h('a', { href: SP.core.paths.to(SP.core.registry.byId('promotionPrice').path) }, Pr.accountLink);
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, Pr.accountTitle),
        accPrices.length ? h('ul', { class: 'pd-list' }, accPrices.map(function (x) {
          var u = calc.unitInfo(data, x.accountId);
          var rsp = calc.priceOn(data.priceList, key, 'RSP', u && u.channel ? u.channel.id : null, today);
          var diff = rsp > 0 ? x.price / rsp - 1 : null;
          return h('li', null, fill(Pr.accountLine, { unit: u ? u.unit.name : x.accountId, price: F.baht(x.price, 2),
            diff: diff == null ? '' : ' (' + (diff < 0 ? '−' : '+') + F.pct(Math.abs(diff), 0) + ' ' + fill(Pr.vsRsp, { rsp: F.baht(rsp, 2) }) + ')' }));
        })) : h('p', { class: 'muted' }, Pr.accountEmpty),
        SP.core.features.isOn('promotionCalendar') ? null : pageLink));
      if (!SP.core.features.isOn('promotionCalendar')) return;
      var promos = store.get('master.promotions').filter(function (x) { return x.productKey === key; });
      var PP = SP.data.content.pages.promotionPrice;
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, Pr.promosTitle),
        promos.length ? h('ul', { class: 'pd-list' }, promos.map(function (x) {
          return h('li', null, fill(Pr.promoLine, {
            name: x.name, dates: F.date(x.startDate) + ' – ' + F.date(x.endDate),
            value: fill(PP.valueText[x.mode], { value: x.mode === 'DISCOUNT_PCT' ? F.pct(x.value, 0) : F.baht(x.value, 2) }), status: PP.statuses[x.status]
          }));
        })) : h('p', { class: 'muted' }, Pr.promosEmpty),
        h('a', { href: SP.core.paths.to(SP.core.registry.byId('promotionPrice').path) }, Pr.promoLink)));
    }

    function priceForm(p) {
      var Pr = page.price;
      var type = C.select({ label: Pr.columns.type, value: 'RSP', className: 'select-sm', options: ['RSP', 'SELL_IN'].map(function (t) { return { value: t, label: Pr.types[t] }; }), onChange: function () {} });
      var channel = C.select({ label: Pr.columns.channel, value: '', className: 'select-sm', options: [{ value: '', label: Pr.allChannels }].concat(SP.data.channels.map(function (c) { return { value: c.id, label: c.name }; })), onChange: function () {} });
      var from = h('input', { type: 'date', class: 'pm-input', value: today, 'aria-label': Pr.columns.from });
      var price = h('input', { type: 'number', class: 'pm-input pm-stock', min: '0', step: '0.01', 'aria-label': Pr.columns.price, placeholder: Pr.columns.price });
      var msg = h('span', { class: 'pm-msg', role: 'status' });
      return h('section', { class: 'pd-section pd-price-form' }, h('h3', null, Pr.addTitle),
        h('div', { class: 'pd-inline' }, type, channel, from, price,
          h('button', { type: 'button', class: 'btn btn-primary btn-sm pd-add-price', onClick: function () {
            var res = calc.addPrice(draft.priceList, { productKey: calc.productKey(p), priceType: type.value, channelId: channel.value || null, price: Number(price.value), effectiveFrom: from.value, by: byName(), at: new Date().toISOString() });
            if (!res.ok) { msg.className = 'pm-msg is-error'; msg.textContent = Pr.errors[res.error]; return; }
            draft.priceList = res.list;
            refresh();
          } }, Pr.addSubmit)),
        msg);
    }

    function lifecycle(body, p) {
      var Li = page.listing;
      var key = calc.productKey(p);
      var units = calc.listedAccounts(listings(), key);
      var data = store.data();
      var byChannel = {};
      units.forEach(function (u) { var i = calc.unitInfo(data, u); var ch = i && i.channel ? i.channel.name : '–'; (byChannel[ch] = byChannel[ch] || []).push(i ? i.unit.name : u); });
      var cl = p.clearance;
      var npd = store.get('master.npdPlans').filter(function (x) { return x.productKey === key; })[0];
      var NP = SP.data.content.pages.npdPlan;
      body.appendChild(h('section', { class: 'pd-section' },
        field(Li.launch, editing ? textInput(p, 'launchDate', Li.launch, { type: 'date' }) : (p.launchDate ? F.date(p.launchDate) : '–')),
        field(Li.discontinue, editing ? textInput(p, 'discontinueMonth', Li.discontinue, { type: 'month' }) : (p.discontinueMonth ? F.date(p.discontinueMonth) : Li.discontinueNone)),
        field(Li.clearance, cl ? fill(Li.clearanceText, { from: F.date(cl.fromMonth), to: F.date(cl.toMonth), stock: F.units(cl.stockQty) }) : Li.clearanceNone),
        // CR-17: ปิด npdApproval = ไม่แสดงสถานะอนุมัติของแผน NPD
        npd ? field(NP.title, SP.core.features.isOn('npdApproval')
          ? fill(Li.npdLink, { stage: NP.stages[calc.npdStage(npd, store.currentKey())], status: L.workflow.status[(npd.workflow || {}).status || 'draft'] })
          : fill(Li.npdLinkStage, { stage: NP.stages[calc.npdStage(npd, store.currentKey())] })) : null));
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, fill(Li.timelineTitle, { year: year })), C.statusStrip(calc.statusSegments(p, year), year)));
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, fill(Li.listedTitle, { n: units.length })),
        units.length ? h('ul', { class: 'pd-list' }, Object.keys(byChannel).map(function (ch) { return h('li', null, h('strong', null, ch + ': '), byChannel[ch].join(', ')); })) : h('p', { class: 'muted' }, Li.listedEmpty),
        h('a', { href: SP.core.paths.to(SP.core.registry.byId('productMaster').path) }, Li.listingLink)));
    }

    function history(body, p) {
      var Hs = page.history;
      var key = calc.productKey(p);
      var keys = [key].concat(p.tempCode ? [p.tempCode] : []).concat(p.tempCodeHistory || []);
      var list = store.get('master.audit').filter(function (e) { return (e.entity === 'product' || e.entity === 'price') && keys.indexOf(e.key) >= 0; }).reverse();
      function show(f, v) {
        if (v == null || v === '') return '–';
        if (f === 'image') return v ? Hs.imageYes : Hs.imageNo;
        if (f === 'price' && typeof v === 'object') return (page.price.types[v.priceType] || '') + ' ' + F.baht(v.price, 2) + ' · ' + F.date(v.effectiveFrom);
        if (f === 'clearance' && typeof v === 'object') return F.date(v.fromMonth) + '–' + F.date(v.toMonth) + ' · ' + F.units(v.stockQty);
        if (/Id$/.test(f)) { var T = tax(); return calc.taxonomyName(T, /series/i.test(f) ? 'series' : 'category', v) || v; }
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
      }
      body.appendChild(list.length ? h('table', { class: 'data-grid pd-history' },
        h('thead', null, h('tr', null, ['at', 'by', 'field', 'change'].map(function (k) { return h('th', { scope: 'col' }, Hs.columns[k]); }))),
        h('tbody', null, list.map(function (e) {
          return h('tr', null, h('td', null, F.dateTime(e.at)), h('td', null, e.by || '–'), h('td', null, PF[e.field] || e.field),
            h('td', { class: 'pd-change' }, show(e.field, e.oldValue) + ' → ' + show(e.field, e.newValue)));
        }))) : h('p', { class: 'muted' }, Hs.empty));
    }

    // ------------------------------------------------------------------ เพิ่ม SKU (Drawer โหมดสร้าง)
    function renderCreate() {
      var T = tax();
      var G = page.general;
      var Cr = page.create;
      var np = { trCode: '', tempCode: '', internalCode: '', barcode: '', name: '', nameEn: '', shortName: '', inferred: false, categoryId: null, subCategoryId: null, typeId: null,
        seriesId: null, subSeriesId: null, itemType: 'SALE', packSize: null, uom: SP.data.settings.UOMS[0], image: null, launchDate: '', discontinueMonth: null, clearance: null, note: '' };
      drawerCtl.head.appendChild(h('div', { class: 'pd-head' }, h('div', { class: 'pd-title' }, h('h2', null, Cr.title))));
      var useTemp = h('input', { type: 'checkbox', 'aria-label': G.useTemp });
      var code = h('input', { type: 'text', class: 'pm-input', 'aria-label': PF.trCode, placeholder: PF.trCode });
      var name = h('input', { type: 'text', class: 'pm-input pd-input', 'aria-label': PF.name, placeholder: PF.name });
      var nameEn = h('input', { type: 'text', class: 'pm-input pd-input', 'aria-label': PF.nameEn, placeholder: PF.nameEn });
      var launch = h('input', { type: 'date', class: 'pm-input', 'aria-label': PF.launchDate });
      var rspIn = h('input', { type: 'number', class: 'pm-input pm-stock', min: '0', step: '0.01', 'aria-label': Cr.rspLabel, placeholder: Cr.rspLabel });
      var msg = h('p', { class: 'pm-msg', role: 'status' });
      useTemp.addEventListener('change', function () { code.disabled = useTemp.checked; if (useTemp.checked) code.value = ''; });
      var catSel = C.cascadeSelect({ tax: T, kind: 'category', value: np, labels: [PF.categoryId, PF.subCategoryId, PF.typeId], placeholder: G.placeholder, onChange: function (v) { Object.keys(v).forEach(function (k) { np[k] = v[k]; }); } });
      var serSel = C.cascadeSelect({ tax: T, kind: 'series', value: np, labels: [PF.seriesId, PF.subSeriesId], placeholder: G.placeholder, onChange: function (v) { Object.keys(v).forEach(function (k) { np[k] = v[k]; }); } });
      var itemSel = C.select({ label: PF.itemType, value: 'SALE', className: 'select-sm', options: SP.data.settings.ITEM_TYPES.map(function (t) { return { value: t, label: L.itemTypes[t] }; }), onChange: function (v) { np.itemType = v; } });
      drawerCtl.body.appendChild(h('div', { class: 'pd-body' },
        h('section', { class: 'pd-section' }, h('h3', null, G.codes),
          field(PF.trCode, code), h('label', { class: 'check pd-temp' }, useTemp, G.useTemp), h('p', { class: 'muted small' }, G.tempNote)),
        h('section', { class: 'pd-section' }, h('h3', null, G.names), field(PF.name, name), field(PF.nameEn, nameEn)),
        h('section', { class: 'pd-section' }, h('h3', null, G.category), catSel),
        h('section', { class: 'pd-section' }, h('h3', null, G.series), serSel),
        h('section', { class: 'pd-section' }, h('h3', null, G.other), field(PF.itemType, itemSel), field(PF.launchDate, launch), field(Cr.rspLabel, rspIn)),
        msg,
        h('div', { class: 'dlg-actions' },
          h('button', { type: 'button', class: 'btn btn-ghost', onClick: function () { drawerCtl.close(); } }, L.dialog.cancel),
          h('button', { type: 'button', class: 'btn btn-primary pd-create', onClick: function () {
            var c = code.value.trim();
            if (!useTemp.checked && !c) { msg.className = 'pm-msg is-error'; msg.textContent = Cr.codeRequired; return; }
            if (!name.value.trim()) { msg.className = 'pm-msg is-error'; msg.textContent = Cr.nameRequired; return; }
            if (c && draft.products.some(function (x) { return x.trCode === c || x.tempCode === c; })) { msg.className = 'pm-msg is-error'; msg.textContent = Cr.duplicate; return; }
            var at = new Date().toISOString();
            np.name = name.value.trim();
            np.nameEn = nameEn.value.trim();
            np.launchDate = launch.value || '';
            if (useTemp.checked) np.tempCode = calc.nextTempCode(draft.products, np.launchDate, year);
            else np.trCode = c;
            np.createdAt = at;
            np.updatedAt = at;
            draft.products.push(np);
            var key = calc.productKey(np);
            if (Number(rspIn.value) > 0) {
              var res = calc.addPrice(draft.priceList, { productKey: key, priceType: 'RSP', channelId: null, price: Number(rspIn.value), effectiveFrom: today, by: byName(), at: at });
              if (res.ok) draft.priceList = res.list;
            }
            creating = false;
            selected = key;
            tab = 'general';
            filters.q = '';
            draw();
          } }, Cr.submit))));
    }

    // ------------------------------------------------------------------ เปรียบเทียบกับ ERP
    function openErp() {
      renderErp();
      erpCtl.open();
    }

    function renderErp() {
      var E = page.erp;
      var res = calc.compareErp(cur().products, cur().priceList, SP.data.erpSnapshot, today);
      C.clear(erpCtl.head).appendChild(h('div', { class: 'pd-title' }, h('h2', null, E.title), h('p', { class: 'muted small' }, E.note)));
      C.clear(erpCtl.body);
      function group(title, items, build) {
        return h('section', { class: 'pd-section erp-group' }, h('h3', null, title + ' (' + items.length + ')'),
          items.length ? h('ul', { class: 'pd-list' }, items.map(build)) : h('p', { class: 'muted' }, E.none));
      }
      erpCtl.body.appendChild(group(E.groups.onlyErp, res.onlyErp, function (r) { return h('li', null, h('strong', null, r.trCode), ' ' + r.name + ' · ' + (r.barcode || '–') + ' · ' + F.baht(r.rsp, 2)); }));
      erpCtl.body.appendChild(group(E.groups.onlyMaster, res.onlyMaster, function (p) { return h('li', null, h('strong', null, p.trCode), ' ' + p.name); }));
      erpCtl.body.appendChild(h('section', { class: 'pd-section erp-group' }, h('h3', null, E.groups.mismatches + ' (' + res.mismatches.length + ')'),
        res.mismatches.length ? h('table', { class: 'data-grid erp-table' },
          h('thead', null, h('tr', null, h('th', null, page.columns.code), h('th', null, PF.name), h('th', null, page.history.columns.field), h('th', null, E.master), h('th', null, E.erpValue), h('th', { class: 'manage' }))),
          h('tbody', null, res.mismatches.map(function (m) {
            var p = calc.findProduct(cur().products, m.key);
            var fmt = function (v) { return m.field === 'rsp' ? (v == null ? '–' : F.baht(v, 2)) : (v || '–'); };
            return h('tr', null, h('td', null, m.key), h('td', { class: 'ellipsis' }, p ? p.name : ''), h('td', null, E.fields[m.field]),
              h('td', null, fmt(m.master)), h('td', null, fmt(m.erp)),
              h('td', { class: 'manage' }, editing
                ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm erp-use', onClick: function () { useErp(m); } }, E.use)
                : h('span', { class: 'muted small', title: E.useHint }, E.useHint)));
          }))) : h('p', { class: 'muted' }, E.none)));
    }

    function useErp(m) {
      var p = calc.findProduct(draft.products, m.key);
      if (!p) return;
      if (m.field === 'rsp') {
        var res = calc.addPrice(draft.priceList, { productKey: m.key, priceType: 'RSP', channelId: null, price: m.erp, effectiveFrom: today, by: 'ERP', at: new Date().toISOString() });
        if (res.ok) draft.priceList = res.list;
      } else {
        p[m.field] = m.erp;
      }
      notice = page.erp.applied;
      draw();
      renderErp();
    }

    draw();
  }

  SP.modules.productList = { render: render };
})(window.SP);
