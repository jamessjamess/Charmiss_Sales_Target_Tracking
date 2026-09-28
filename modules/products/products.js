/*
 * modules/products/products.js — Product Master · รายการสินค้า
 *
 * หน้าที่:        KPI 6 ใบ (ทั้งหมด · Active · NPD · ขาดข้อมูลจำเป็น · ขาดข้อมูลที่ควรมี · ยังไม่เปิดใน TRCLOUD) กดแล้วกรองตาราง
 *                 ตัวกรองแถวแรก (แสดงตลอด): ค้นหา · Status · Series · หมวดสินค้า (เลือกแบบลำดับชั้นในตัวเดียว) · มุมมอง รายการ | จัดกลุ่ม
 *                 ปุ่ม ตัวกรองเพิ่มเติม (n) กางแถวที่สอง (จำที่ ui.productMoreFilters): Channel ที่ Listing · ความครบถ้วน · ที่มา · ใน TRCLOUD
 *                 ตัวกรองที่ใช้อยู่เป็น Chip (× เอาออก + ล้างทั้งหมด) / ปุ่มขวา: คอลัมน์ ▾ (components.columnPicker + Preset ส่วนตัว) · ส่งออก ▾ · เปรียบเทียบกับ ERP
 *                 ตาราง: Product Code และชื่อสินค้า (ชื่อย่อ · Tooltip ชื่อเต็ม) แสดงเสมอและติดซ้าย · คอลัมน์อื่นเลือก/เรียงได้ · หัวตารางติดบน เลื่อนภายในการ์ด
 *                 คลิกแถว → Drawer รายละเอียด (ข้อมูลทั่วไป · ราคา · Listing และวงจรสินค้า · ประวัติการแก้ไข)
 *                 โหมดดู / แก้ไข (ทีม Product) → แก้ใน Drawer, เพิ่ม SKU (Product Code จากระบบ), ราคาใหม่, ใช้ค่าจาก ERP, นำเข้าด้วยรหัสเดิม → บันทึก/ยกเลิก
 *                 Status (ณ เดือนปัจจุบันกลาง core/clock.js), ความครบถ้วน, ราคา คำนวณจาก calc เท่านั้น · Product Code / Preset จาก core/catalog.js
 * CR-30:          Product Code ระบบสร้างเสมอ แก้ไม่ได้ (ไอคอนกุญแจ) · ตัด Internal Code / Item Type / รหัสชั่วคราว / ผูกรหัสจริง · ใน TRCLOUD
 * อ่านจาก data/:  channels, settings, erp-snapshot, products (categoryRules), content (pages.productList, labels) + Master ผ่าน store.data()
 * store อ่าน:     master.products, master.basePrices, master.promoPrices, master.listings, master.npdPlans, master.taxonomy,
 *                 master.codeCounters, master.audit, ui.seriesFilter, ui.columnPresets, ui.productMoreFilters, ui.role
 * รับตัวกรองจากหน้าหมวดสินค้าและ Series (CR-15): ui.productFilterHandoff = { node, level, series } อ่านครั้งเดียวตอนเปิดหน้าแล้วลบ
 * store เขียน:    master.products, master.basePrices, master.codeCounters, master.audit (ตอนกด บันทึก) / ui.seriesFilter, ui.columnPresets, ui.productMoreFilters
 * CR-20:          ป้าย "จาก Sales" (สินค้าที่ Sales สร้างจากหน้าวางแผน SKU source SALES_REQUEST) + ตัวกรองที่มา: ทีม Product / จาก Sales
 * CR-30:          แท็บราคา (อ่านอย่างเดียว) = ราคาหลักตามรอบเวลา + Promotion Price ของสินค้านี้ · แก้ที่หน้าราคาและ Promotion
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var Perm = SP.core.permissions;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var CAT = SP.core.catalog;
  var store = SP.core.store;
  var h = C.h;
  var fill = C.fill;

  var TABLE = 'productList';
  // คอลัมน์ที่เลือกได้ (Product Code และชื่อสินค้าแสดงเสมอ)
  var SELECTABLE = ['image', 'status', 'category', 'subCategory', 'type', 'series', 'subSeries', 'rsp', 'completeness', 'barcode', 'packSize',
    'launchDate', 'listedCount', 'sellIn', 'inTrcloud', 'source', 'updatedAt'];
  var MORE = ['channel', 'completeness', 'source', 'trcloud'];
  function emptyFilters() { return { q: '', status: '', node: '', nodeLevel: '', channel: '', completeness: '', source: '', trcloud: '', kpi: '' }; }
  var filters = emptyFilters();
  var view = 'list';
  var tab = 'general';

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var PF = L.productFields;
    var year = store.year();
    var month = SP.core.clock.currentMonth();   // CR-30: Status และราคา ณ เดือนปัจจุบันกลาง
    var today = month + '-01';
    var editing = false;
    function snapshot() { return { products: store.get('master.products'), basePrices: store.get('master.basePrices'), codeCounters: store.get('master.codeCounters') }; }
    var saved = snapshot();
    var draft = clone(saved);
    var selected = null;     // productKey ที่เปิดใน Drawer
    var creating = false;    // Drawer อยู่ในโหมดเพิ่ม SKU
    var notice = null;

    // ตัวกรองที่ส่งมาจากหน้าหมวดสินค้าและ Series (ใช้ครั้งเดียว)
    var handoff = store.get('ui.productFilterHandoff');
    if (handoff) {
      store.remove('ui.productFilterHandoff');
      filters = emptyFilters();
      filters.node = handoff.node || '';
      filters.nodeLevel = handoff.level || '';
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
      n += newPrices().length;
      return n;
    }
    function dirty() { return editing ? diffCount() : 0; }
    C.guardUnsaved(dirty);
    // ราคาหลักที่เพิ่มในรอบนี้ (สร้าง SKU · ใช้ค่าจาก ERP · นำเข้าด้วยรหัสเดิม)
    function newPrices() {
      var old = saved.basePrices.map(function (r) { return JSON.stringify(r); });
      return draft.basePrices.filter(function (r) { return old.indexOf(JSON.stringify(r)) < 0; });
    }

    var exportBtn = C.exportButton({ unsaved: dirty, build: exportSpec });
    var bar = C.workflowBar({
      simple: true, extra: exportBtn,
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
      newPrices().forEach(function (r) {
        entries.push({ entity: 'price', key: r.productKey, field: 'price', oldValue: null, newValue: { priceType: r.priceType, price: r.price, effectiveMonth: r.effectiveMonth }, by: by, at: at });
      });
      // เลข Product Code ที่ออกแล้วบันทึกด้วย (ไม่นำกลับมาใช้แม้ลบ SKU)
      store.set('master.products', draft.products);
      store.set('master.basePrices', draft.basePrices);
      store.set('master.codeCounters', draft.codeCounters);
      store.appendAudit(entries);
      saved = clone(draft);
      editing = false;
      creating = false;
      notice = null;
      draw();
    }

    // ------------------------------------------------------------------ ตัวช่วย
    function statusOf(p) { return calc.productStatus(p, month); }
    function completeness(p) { return calc.productCompleteness(p, cur().basePrices); }
    function rsp(p) { return calc.rspAt(cur().basePrices, calc.productKey(p), month); }
    function listings() { return store.get('master.listings'); }
    function unitChannel(unitId) { var i = calc.unitInfo(store.data(), unitId); return i && i.channel ? i.channel.id : null; }
    function referenced(p) {
      var key = calc.productKey(p);
      return listings().some(function (l) { return l.productKey === key; }) ||
        (store.get('master.promoPrices') || []).some(function (x) { return x.productKey === key; }) ||
        store.get('master.npdPlans').some(function (x) { return x.productKey === key; });
    }
    function trcloudOf(p) { return CAT.inTrcloud(p) ? 'open' : 'notOpen'; }
    function packText(p) { return p.packSize != null && p.packSize !== '' ? p.packSize + ' ' + (p.uom || '') : ''; }

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
    function matches(p, skipKpi) {
      var q = filters.q.trim().toLowerCase();
      if (q) {
        var text = [p.trCode, p.barcode, p.name, p.shortName, p.nameEn].filter(Boolean).join(' ').toLowerCase();
        if (text.indexOf(q) < 0) return false;
      }
      var st = statusOf(p), c = completeness(p);
      if (filters.status && st !== filters.status) return false;
      if (filters.node && p[calc.taxonomyField(filters.nodeLevel)] !== filters.node) return false;
      if (!calc.inSeries(p, store.get('ui.seriesFilter') || [])) return false;
      if (filters.channel && !listings().some(function (l) { return l.productKey === calc.productKey(p) && unitChannel(l.accountId) === filters.channel; })) return false;
      if (filters.completeness && c.level !== filters.completeness) return false;
      if (filters.source && sourceOf(p) !== filters.source) return false;
      if (filters.trcloud && trcloudOf(p) !== filters.trcloud) return false;
      if (!skipKpi && filters.kpi) {
        if (filters.kpi === 'active' && st !== 'active') return false;
        if (filters.kpi === 'npd' && st !== 'planned' && st !== 'new') return false;
        if ((filters.kpi === 'required' || filters.kpi === 'recommended') && c.level !== filters.kpi) return false;
        if (filters.kpi === 'notInTrcloud' && CAT.inTrcloud(p)) return false;
      }
      return true;
    }

    // ------------------------------------------------------------------ คอลัมน์ + Preset ส่วนตัว (CR-30)
    function uid() { var u = Perm.user(); return (u && u.id) || 'default'; }
    function presetAll() { return store.get('ui.columnPresets') || {}; }
    function systemPresets() { return SP.data.settings.PRODUCT_COLUMN_PRESETS; }
    function shownKeys() { return CAT.currentColumns(presetAll(), uid(), TABLE, systemPresets(), SELECTABLE); }
    function sellInChannel() {
      return calc.findById(SP.data.channels, filters.channel) || SP.data.channels.filter(function (c) { return calc.channelPriceType(c) !== 'RSP'; })[0] || SP.data.channels[0];
    }
    function colLabel(k) { return k === 'sellIn' ? fill(page.columns.sellIn, { channel: sellInChannel().name }) : page.columns[k]; }

    // คอลัมน์ทั้งหมด (ใช้ทั้งตารางและไฟล์ส่งออก) → { <key>: { key, label, value(p), num } }
    function columnDefs() {
      var T = tax();
      var X = page.columns;
      return {
        code: { key: 'code', label: X.code, value: function (p) { return calc.productKey(p); } },
        name: { key: 'name', label: X.name, value: function (p) { return p.name; } },
        image: { key: 'image', label: X.image, value: function (p) { return p.image ? L.productFields.image : ''; } },
        status: { key: 'status', label: X.status, value: function (p) { return L.status[statusOf(p)]; } },
        category: { key: 'category', label: X.category, value: function (p) { return calc.taxonomyName(T, 'category', p.categoryId); } },
        subCategory: { key: 'subCategory', label: X.subCategory, value: function (p) { return calc.taxonomyName(T, 'category', p.subCategoryId); } },
        type: { key: 'type', label: X.type, value: function (p) { return calc.taxonomyName(T, 'category', p.typeId); } },
        series: { key: 'series', label: X.series, value: function (p) { return calc.taxonomyName(T, 'series', p.seriesId); } },
        subSeries: { key: 'subSeries', label: X.subSeries, value: function (p) { return calc.taxonomyName(T, 'series', p.subSeriesId); } },
        rsp: { key: 'rsp', label: X.rsp, num: true, money: true, value: function (p) { return rsp(p); } },
        completeness: { key: 'completeness', label: X.completeness, value: function (p) { var c = completeness(p); return c.level === 'ok' ? L.product.complete : c.level === 'required' ? fill(L.product.missingRequired, { n: c.missingRequired.length }) : fill(L.product.missingRecommended, { n: c.missingRecommended.length }); } },
        barcode: { key: 'barcode', label: X.barcode, value: function (p) { return p.barcode; } },
        packSize: { key: 'packSize', label: X.packSize, value: packText },
        launchDate: { key: 'launchDate', label: X.launchDate, value: function (p) { return p.launchDate ? F.date(p.launchDate.slice(0, 7)) : ''; } },
        listedCount: { key: 'listedCount', label: X.listedCount, num: true, value: function (p) { return calc.listedAccounts(listings(), calc.productKey(p)).length; } },
        sellIn: { key: 'sellIn', label: colLabel('sellIn'), num: true, money: true, value: function (p) { return calc.basePriceAt(cur().basePrices, calc.productKey(p), calc.channelPriceType(sellInChannel()) === 'RSP' ? 'TT_DEALER' : calc.channelPriceType(sellInChannel()), month); } },
        inTrcloud: { key: 'inTrcloud', label: X.inTrcloud, value: function (p) { return page.trcloud[trcloudOf(p)]; } },
        source: { key: 'source', label: X.source, value: function (p) { return page.filters.sourceOptions[sourceOf(p)]; } },
        updatedAt: { key: 'updatedAt', label: X.updatedAt, value: function (p) { return p.updatedAt ? F.dateTime(p.updatedAt) : ''; } }
      };
    }
    function columns() {
      var defs = columnDefs();
      return ['code', 'name'].concat(shownKeys()).map(function (k) { return defs[k]; });
    }

    function pickerState() {
      var all = presetAll();
      return {
        value: shownKeys(),
        presets: CAT.presetsFor(all, uid(), TABLE, systemPresets()).map(function (p) { return { id: p.id, name: p.system ? page.presets[p.id] : p.name, columns: p.columns, system: p.system }; }),
        defaultId: CAT.tableState(all, uid(), TABLE).defaultId
      };
    }
    function onPreset(action, arg) {
      var all = presetAll();
      var list = CAT.presetsFor(all, uid(), TABLE, systemPresets());
      if (action === 'pick') { var p = list.filter(function (x) { return x.id === arg; })[0]; if (p) all = CAT.setColumns(all, uid(), TABLE, p.columns); }
      else if (action === 'save') all = CAT.savePreset(all, uid(), TABLE, arg, shownKeys()).all;
      else if (action === 'remove') all = CAT.removePreset(all, uid(), TABLE, arg);
      else if (action === 'default') all = CAT.setDefaultPreset(all, uid(), TABLE, arg);
      else if (action === 'reset') all = CAT.resetColumns(all, uid(), TABLE);
      store.set('ui.columnPresets', all);
      renderTable();
    }

    // ป้าย "ระบบกำหนด" ของหมวดสินค้าที่ได้จากคำในชื่อสินค้า (CR-11)
    function inferredTag(p) {
      return p.inferred ? h('span', { class: 'badge tag-muted pd-inferred', title: L.product.inferredTitle }, L.product.inferredTag) : null;
    }
    function lockedCode(key) {
      return h('span', { class: 'pd-code-lock', title: page.general.codeLocked }, h('strong', { class: 'pd-code' }, key), C.icon('lock'),
        h('span', { class: 'sr-only' }, page.general.codeLocked));
    }

    // ------------------------------------------------------------------ วาดหน้า
    var drawerCtl = C.drawer({ label: page.title, className: 'product-drawer', onClose: function () { selected = null; creating = false; highlight(); } });
    var erpCtl = C.drawer({ label: page.erp.title, className: 'erp-drawer' });
    var tableSlot = null;
    var chipSlot = null;

    function draw() {
      C.clear(root);
      bar.update();
      var products = cur().products;
      var P = page.kpi;

      // KPI 6 ใบ (นับจากสินค้าตามตัวกรองอื่น ยกเว้นการกด KPI)
      var base = products.filter(function (p) { return matches(p, true); });
      function count(fn) { return base.filter(fn).length; }
      var planned = count(function (p) { return statusOf(p) === 'planned'; });
      var launched = count(function (p) { return statusOf(p) === 'new'; });
      var kpis = [
        { key: '', label: P.all, n: base.length },
        { key: 'active', label: P.active, n: count(function (p) { return statusOf(p) === 'active'; }) },
        { key: 'npd', label: P.npd, n: planned + launched, sub: fill(P.npdSub, { a: F.number(planned), b: F.number(launched) }) },
        { key: 'required', label: P.required, n: count(function (p) { return completeness(p).level === 'required'; }), cls: 'is-danger' },
        { key: 'recommended', label: P.recommended, n: count(function (p) { return completeness(p).level === 'recommended'; }), cls: 'is-warn' },
        { key: 'notInTrcloud', label: P.notInTrcloud, n: count(function (p) { return !CAT.inTrcloud(p); }), cls: 'is-info' }
      ];
      root.appendChild(h('div', { class: 'pl-kpis' }, kpis.map(function (k) {
        return h('button', {
          type: 'button', class: 'card pl-kpi pl-kpi-' + (k.key || 'all') + ' ' + (k.cls || '') + (filters.kpi === k.key ? ' is-selected' : ''), title: P.title,
          'aria-pressed': filters.kpi === k.key ? 'true' : 'false',
          onClick: function () { filters.kpi = filters.kpi === k.key ? '' : k.key; draw(); }
        }, h('span', { class: 'pl-kpi-label' }, k.label), h('strong', { class: 'pl-kpi-value' }, F.number(k.n)), h('span', { class: 'pl-kpi-unit' }, P.unit),
          k.sub ? h('span', { class: 'pl-kpi-sub' }, k.sub) : null);
      })));

      root.appendChild(toolbar());
      if (store.get('ui.productMoreFilters')) root.appendChild(moreRow());
      chipSlot = h('div', { class: 'pl-chips' });
      root.appendChild(chipSlot);
      if (editing) { var b = C.editBanner(); b.update(dirty()); root.appendChild(b); }
      if (notice) root.appendChild(h('p', { class: 'pl-notice', role: 'status' }, notice));
      tableSlot = h('div', { class: 'card fit-card pl-card' });
      root.appendChild(tableSlot);
      renderTable();
      if (drawerCtl.isOpen()) renderDrawer();
    }

    function sel(label, key, options, onChange) {
      var el = C.select({ label: label, value: filters[key], options: options, className: 'pl-filter-' + key + (filters[key] ? ' is-active' : ''),
        onChange: onChange || function (v) { filters[key] = v; draw(); } });
      el.title = label;
      return el;
    }

    // หมวดสินค้าแบบลำดับชั้นในตัวเดียว: Category › Sub Category › Type (ค่า = id ของระดับใดก็ได้)
    function categoryOptions() {
      var out = [{ value: '', label: page.filters.categoryAll }];
      SP.core.taxonomy.buildTree(tax(), 'category').forEach(function walk(t) {
        out.push({ value: t.node.id, label: new Array(t.depth * 3 + 1).join(' ') + t.node.name });
        t.children.forEach(walk);
      });
      return out;
    }
    function nodeLevel(id) { var n = SP.core.taxonomy.find(tax(), 'category', id); return n ? n.level : ''; }

    function toolbar() {
      var Fl = page.filters;
      var search = h('input', { type: 'search', class: 'search-input pl-search', placeholder: page.searchPlaceholder, 'aria-label': page.searchPlaceholder, value: filters.q });
      search.addEventListener('input', function () { filters.q = search.value; renderTable(); });
      var moreOn = MORE.filter(function (k) { return filters[k]; }).length;
      var open = !!store.get('ui.productMoreFilters');
      var picker = C.columnPicker({
        label: page.columnsButton, fixedNote: page.fixedColumns,
        columns: SELECTABLE.map(function (k) { return { key: k, label: colLabel(k) }; }),
        state: pickerState,
        onChange: function (keys) { store.set('ui.columnPresets', CAT.setColumns(presetAll(), uid(), TABLE, keys)); renderTable(); },
        onPreset: onPreset
      });
      return h('div', { class: 'tool-row pl-toolbar' },
        search,
        sel(Fl.status, 'status', [{ value: '', label: Fl.statusAll }].concat(['planned', 'new', 'active', 'clearance', 'discontinued'].map(function (s) { return { value: s, label: L.status[s] }; }))),
        C.seriesFilter({ options: calc.seriesList(tax(), cur().products), value: store.get('ui.seriesFilter') || [], onChange: function (v) { store.set('ui.seriesFilter', v); draw(); } }),
        sel(Fl.category, 'node', categoryOptions(), function (v) { filters.node = v; filters.nodeLevel = v ? nodeLevel(v) : ''; draw(); }),
        C.segmented({ label: page.viewLabel, value: view, options: ['list', 'group'].map(function (v) { return { value: v, label: page.views[v] }; }), onChange: function (v) { view = v; draw(); } }),
        h('button', { type: 'button', class: 'btn btn-sm pl-more ' + (open ? 'btn-primary' : 'btn-secondary') + (moreOn ? ' has-value' : ''), title: Fl.moreTitle, 'aria-expanded': open ? 'true' : 'false',
          onClick: function () { store.set('ui.productMoreFilters', !open); draw(); } }, fill(Fl.more, { n: moreOn })),
        h('span', { class: 'tool-right' },
          picker,
          h('button', { type: 'button', class: 'btn btn-secondary btn-sm pl-erp', onClick: openErp }, page.compareErp),
          editing ? h('button', { type: 'button', class: 'btn btn-primary btn-sm pl-add', onClick: openCreate }, page.addSku) : null));
    }

    // แถวที่สอง: ตัวกรองเพิ่มเติม (ในหน้า ไม่เป็น Popup)
    function moreRow() {
      var Fl = page.filters;
      return h('div', { class: 'tool-row pl-toolbar pl-more-row' },
        sel(Fl.channel, 'channel', [{ value: '', label: Fl.channelAll }].concat(SP.data.channels.filter(function (c) { return c.active !== false; }).map(function (c) { return { value: c.id, label: c.name }; }))),
        sel(Fl.completeness, 'completeness', [{ value: '', label: Fl.completenessAll }].concat(['ok', 'required', 'recommended'].map(function (k) { return { value: k, label: Fl.completenessOptions[k] }; }))),
        sel(Fl.source, 'source', [{ value: '', label: Fl.sourceAll }].concat(['product', 'sales'].map(function (k) { return { value: k, label: Fl.sourceOptions[k] }; }))),
        sel(Fl.trcloud, 'trcloud', [{ value: '', label: Fl.trcloudAll }].concat(['open', 'notOpen'].map(function (k) { return { value: k, label: page.trcloud[k] }; }))));
    }

    // Chip ตัวกรองที่ใช้อยู่ (× เอาออกทีละรายการ · ล้างทั้งหมด) + จำนวนที่แสดง
    function renderChips(shown) {
      if (!chipSlot) return;
      var T = tax();
      var Fl = page.filters;
      var items = [];
      function add(label, value, clear) { items.push({ label: fill(Fl.chip, { label: label, value: value }), onRemove: function () { clear(); draw(); } }); }
      if (filters.kpi) items.push({ label: fill(Fl.kpiChip, { value: page.kpi[filters.kpi] }), onRemove: function () { filters.kpi = ''; draw(); } });
      if (filters.q.trim()) items.push({ label: fill(Fl.searchChip, { value: filters.q.trim() }), onRemove: function () { filters.q = ''; draw(); } });
      if (filters.status) add(Fl.status, L.status[filters.status], function () { filters.status = ''; });
      if (filters.node) add(Fl.category, calc.taxonomyName(T, 'category', filters.node), function () { filters.node = ''; filters.nodeLevel = ''; });
      (store.get('ui.seriesFilter') || []).forEach(function (s) {
        add(L.series.label, calc.taxonomyName(T, 'series', s) || L.series.none, function () { store.set('ui.seriesFilter', (store.get('ui.seriesFilter') || []).filter(function (x) { return x !== s; })); });
      });
      if (filters.channel) add(Fl.channel, calc.findById(SP.data.channels, filters.channel).name, function () { filters.channel = ''; });
      if (filters.completeness) add(Fl.completeness, Fl.completenessOptions[filters.completeness], function () { filters.completeness = ''; });
      if (filters.source) add(Fl.source, Fl.sourceOptions[filters.source], function () { filters.source = ''; });
      if (filters.trcloud) add(Fl.trcloud, page.trcloud[filters.trcloud], function () { filters.trcloud = ''; });
      C.clear(chipSlot);
      chipSlot.appendChild(h('span', { class: 'pl-summary' },
        h('span', { class: 'pl-count' }, fill(page.resultCount, { n: F.number(shown), total: F.number(cur().products.length) })),
        ' · ' + fill(page.statusAsOf, { month: F.date(month) })));
      var chips = C.filterChips(items, function () { filters = emptyFilters(); store.set('ui.seriesFilter', []); draw(); });
      if (chips) chipSlot.appendChild(chips);
    }

    // ------------------------------------------------------------------ ตาราง
    function renderTable() {
      if (!tableSlot) return;
      var T = tax();
      var cols = columns();
      var shown = cur().products.filter(function (p) { return matches(p); });
      var head = cols.map(function (c) {
        return h('th', { scope: 'col', class: (c.key === 'code' ? 'pl-code ' : c.key === 'name' ? 'pl-name ' : c.key === 'image' ? 'pl-img ' : '') + (c.num ? 'num' : '') }, c.label);
      }).concat([h('th', { scope: 'col', class: 'manage' }, page.columns.manage)]);
      var body = h('tbody');
      if (!shown.length) body.appendChild(h('tr', null, h('td', { class: 'grid-empty', colspan: String(cols.length + 1) }, page.empty)));
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
          body.appendChild(h('tr', { class: 'is-group' }, h('td', { colspan: String(cols.length + 1) },
            h('span', { class: 'pl-group-name' }, fill(page.groupHead, { name: name, n: g.items.length })),
            h('span', { class: 'pl-group-status' }, ['planned', 'new', 'active', 'clearance', 'discontinued'].filter(function (s) { return byStatus[s]; }).map(function (s) {
              return C.statusBadge(s, String(byStatus[s]));
            })))));
          g.items.forEach(function (p) { body.appendChild(rowOf(p, cols)); });
        });
      } else {
        shown.forEach(function (p) { body.appendChild(rowOf(p, cols)); });
      }
      var table = h('table', { class: 'data-grid pl-table' + (view === 'group' ? ' is-grouped' : '') }, h('thead', null, h('tr', null, head)), body);
      C.clear(tableSlot).appendChild(h('div', { class: 'fit-scroll pl-scroll' }, table));
      renderChips(shown.length);
      highlight();
    }

    function rowOf(p, cols) {
      var T = tax();
      var key = calc.productKey(p);
      var tds = cols.map(function (c) {
        if (c.key === 'code') return h('td', { class: 'pl-code' }, h('span', { class: 'pl-code-text' }, key), salesTag(p));
        if (c.key === 'name') return h('td', { class: 'pl-name', title: p.name }, h('span', { class: 'pl-name-text' }, calc.displayName(p)));
        if (c.key === 'image') return h('td', { class: 'pl-img' }, C.productThumb(p, T, { size: 'sm' }));
        if (c.key === 'status') {
          var segs = calc.statusSegments(p, year);
          return h('td', { title: segs.map(function (s) { return F.monthRange(s.from, s.to) + ' ' + L.status[s.status]; }).join(' · ') }, C.statusBadge(statusOf(p)));
        }
        if (c.key === 'completeness') return h('td', null, C.completenessBadge(completeness(p)));
        if (c.key === 'inTrcloud') return h('td', null, h('span', { class: 'badge ' + (CAT.inTrcloud(p) ? 'tag-muted' : 'tag-warn') + ' pl-trcloud' }, c.value(p)));
        var v = c.value(p);
        if (c.money) return h('td', { class: 'num' }, v == null ? '–' : F.baht(v, 2));
        if (c.num) return h('td', { class: 'num' }, v == null ? '–' : F.number(v));
        // หมวดสินค้าที่ระบบกำหนดจากชื่อ (CR-11): Tooltip ให้ตรวจสอบ (CR-30 ไม่ขีดเส้นใต้ เพราะไม่ใช่ลิงก์)
        var cat = c.key === 'category' || c.key === 'subCategory' || c.key === 'type';
        return h('td', { class: 'ellipsis', title: (v || '') + (cat && p.inferred && v ? ' · ' + L.product.inferredTitle : '') }, v || '–');
      });
      var manage = h('td', { class: 'manage' }, h('span', { class: 'manage-group' },
        editing && canEdit() ? C.trashButton({
          label: page.removeTitle, disabled: referenced(p), disabledTitle: page.removeBlocked,
          confirmTitle: fill(page.removeConfirm, { code: key }),
          onConfirm: function () {
            draft.products = draft.products.filter(function (x) { return calc.productKey(x) !== key; });
            draft.basePrices = draft.basePrices.filter(function (r) { return r.productKey !== key; });
            if (selected === key) drawerCtl.close();
            draw();
          }
        }) : null,
        h('button', { type: 'button', class: 'icon-btn pl-open', title: page.viewDetail, 'aria-label': page.viewDetail + ' ' + key }, '›')));
      return h('tr', {
        class: 'is-clickable', dataset: { key: key },
        onClick: function (e) {
          if (e.target.closest && e.target.closest('.trash-btn')) return;
          openProduct(key);
        }
      }, tds, manage);
    }

    function highlight() {
      if (!tableSlot) return;
      Array.prototype.forEach.call(tableSlot.querySelectorAll('tr[data-key]'), function (tr) { tr.classList.toggle('is-selected', tr.dataset.key === selected); });
    }

    // ------------------------------------------------------------------ ส่งออก ▾ (Excel / CSV) ตามตัวกรองและคอลัมน์ที่แสดง
    function exportSpec(source) {
      var list = (source === 'draft' && editing ? draft : saved).products.filter(function (p) { return matches(p); });
      var st = C.exportStamp(null);
      return {
        filename: fill(page.exportFile, { date: st.date }),
        sheets: [{
          name: page.exportSheet,
          header: C.exportHeader(year, null, [[page.statusAsOf.replace(' {month}', ''), F.date(month)]]),
          columns: columns().map(function (c) { return { key: c.key, label: c.label, value: c.value, width: c.key === 'name' ? 40 : 14 }; }),
          rows: list
        }]
      };
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
            lockedCode(key),
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
      var input = h('input', { type: opts.type || 'text', class: 'pm-input pd-input' + (opts.cls ? ' ' + opts.cls : '') + (isDirty(p, f) ? ' is-dirty-cell' : ''), value: p[f] == null ? '' : String(p[f]), 'aria-label': label, min: opts.min, step: opts.step });
      input.addEventListener('change', function () {
        var v = input.value.trim();
        p[f] = opts.type === 'number' ? (v === '' ? null : Number(v)) : v;
        refresh();
      });
      return input;
    }
    // เดือนเปิดตัว (เก็บเป็นวันที่ 1 ของเดือน)
    function launchInput(p) {
      var input = h('input', { type: 'month', class: 'pm-input pd-launch' + (isDirty(p, 'launchDate') ? ' is-dirty-cell' : ''), value: p.launchDate ? p.launchDate.slice(0, 7) : '', 'aria-label': PF.launchDate });
      input.addEventListener('change', function () { p.launchDate = input.value ? input.value + '-01' : null; refresh(); });
      return input;
    }
    function trcloudField(p) {
      return field(PF.inTrcloud, h('span', { title: page.general.trcloudNote }, h('span', { class: 'badge ' + (CAT.inTrcloud(p) ? 'tag-muted' : 'tag-warn') }, page.trcloud[trcloudOf(p)])));
    }

    function general(body, p) {
      var T = tax();
      var G = page.general;
      var key = calc.productKey(p);
      var tx = calc.productTaxonomy(T, p);
      if (!editing) {
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.codes),
          field(PF.trCode, lockedCode(key)), field(PF.barcode, dval(p.barcode)), trcloudField(p)));
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.names), field(PF.name, dval(p.name)), field(PF.shortName, dval(p.shortName)), field(PF.nameEn, dval(p.nameEn))));
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.category, inferredTag(p)),
          field(PF.categoryId, dval(tx.category)), field(PF.subCategoryId, dval(tx.subCategory)), field(PF.typeId, dval(tx.type))));
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.series), field(PF.seriesId, dval(tx.series)), field(PF.subSeriesId, dval(tx.subSeries))));
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.other),
          field(PF.packSize, dval(packText(p))), p.note ? field(G.note, p.note) : null));
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.image), h('div', { class: 'pd-image' }, C.productThumb(p, T, { size: 'lg' }))));
        return;
      }
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.codes),
        field(PF.trCode, lockedCode(key)),
        field(PF.barcode, textInput(p, 'barcode', PF.barcode)),
        trcloudField(p)));
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.names),
        field(PF.name, textInput(p, 'name', PF.name)), field(PF.shortName, textInput(p, 'shortName', PF.shortName)), field(PF.nameEn, textInput(p, 'nameEn', PF.nameEn))));
      // เลือกหมวดสินค้าเอง = ยืนยันแล้ว (ล้างเครื่องหมาย "ระบบกำหนด") · CR-30 Product Code ไม่เปลี่ยนตาม Type ที่แก้ภายหลัง
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.category, inferredTag(p)),
        C.cascadeSelect({ tax: T, kind: 'category', value: p, labels: [PF.categoryId, PF.subCategoryId, PF.typeId], placeholder: G.placeholder,
          dirty: function (f) { return isDirty(p, f); },
          onChange: function (v) { Object.keys(v).forEach(function (k) { p[k] = v[k]; }); p.inferred = false; refresh(); } })));
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.series),
        C.cascadeSelect({ tax: T, kind: 'series', value: p, labels: [PF.seriesId, PF.subSeriesId], placeholder: G.placeholder,
          dirty: function (f) { return isDirty(p, f); },
          onChange: function (v) { Object.keys(v).forEach(function (k) { p[k] = v[k]; }); refresh(); } })));
      var uomSel = C.select({ label: PF.uom, value: p.uom || SP.data.settings.UOMS[0], className: 'select-sm' + (isDirty(p, 'uom') ? ' is-dirty-cell' : ''),
        options: SP.data.settings.UOMS.map(function (u) { return { value: u, label: u }; }), onChange: function (v) { p.uom = v; refresh(); } });
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.other),
        field(PF.packSize, h('span', { class: 'pd-inline pd-pack' }, textInput(p, 'packSize', PF.packSize, { type: 'number', min: '0', step: 'any', cls: 'pd-pack-num' }), uomSel)),
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

    // CR-30: ราคาหลักตามรอบเวลา + Promotion Price ของสินค้านี้ (อ่านอย่างเดียว · แก้ที่หน้าราคาและ Promotion)
    function prices(body, p) {
      var Pr = page.price;
      var key = calc.productKey(p);
      var data = store.data();
      var types = SP.data.settings.PRICE_TYPES;
      var hist = calc.basePriceHistory(cur().basePrices, key);
      var link = h('a', { class: 'pd-price-link', href: SP.core.paths.to(SP.core.registry.byId('promotionPrice').path) }, Pr.link);
      body.appendChild(h('p', { class: 'muted small' }, Pr.readonly, ' ', link));
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, Pr.baseTitle),
        hist.length ? h('table', { class: 'data-grid pd-price-table' },
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, Pr.columns.type), h('th', { scope: 'col' }, Pr.columns.from),
            h('th', { scope: 'col', class: 'num' }, Pr.columns.price), h('th', { scope: 'col' }, Pr.columns.by))),
          h('tbody', null, hist.map(function (r) {
            var inUse = calc.baseEntryAt(cur().basePrices, key, r.priceType, month) === r;
            return h('tr', { class: inUse ? 'is-current' : null },
              h('td', null, L.priceTypes[r.priceType] || r.priceType), h('td', null, F.date(r.effectiveMonth), inUse ? h('span', { class: 'badge tag-ok pd-in-use' }, fill(Pr.inUse, { month: F.date(month) })) : null),
              h('td', { class: 'num' }, F.baht(r.price, 2)), h('td', null, r.by || '–'));
          }))) : h('p', { class: 'muted' }, Pr.noPrice)));
      // Promotion Price: ช่วงเดือนต่อเนื่องที่ราคาเท่ากัน ต่อระดับ (หน่วยขาย / ทั้ง Channel)
      var groups = {};
      (store.get('master.promoPrices') || []).filter(function (r) { return r.productKey === key; }).sort(function (a, b) { return a.month < b.month ? -1 : 1; }).forEach(function (r) {
        var g = r.channelId + '|' + (r.unitId || '');
        var list = groups[g] = groups[g] || [];
        var last = list[list.length - 1];
        if (last && last.price === r.price && calc.monthKey(Number(last.to.slice(0, 4)), Number(last.to.slice(5, 7))) === r.month) last.to = r.month;
        else list.push({ channelId: r.channelId, unitId: r.unitId, from: r.month, to: r.month, price: r.price });
      });
      var lines = [];
      Object.keys(groups).forEach(function (g) { lines = lines.concat(groups[g]); });
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, Pr.promoTitle),
        lines.length ? h('ul', { class: 'pd-list' }, lines.map(function (x) {
          var ch = calc.findById(SP.data.channels, x.channelId);
          var info = x.unitId ? calc.unitInfo(data, x.unitId) : null;
          var type = calc.channelPriceType(ch);
          var base = calc.basePriceAt(cur().basePrices, key, type, x.from);
          var diff = base > 0 ? x.price / base - 1 : null;
          return h('li', null, fill(Pr.promoLine, {
            level: info ? info.unit.name : fill(Pr.wholeChannel, { channel: ch ? ch.name : x.channelId }), range: F.keyRange(x.from, x.to), price: F.baht(x.price, 2),
            diff: diff == null ? '' : fill(Pr.vsBase, { pct: (diff < 0 ? '−' : '+') + F.pct(Math.abs(diff), 0), type: L.priceTypes[type] || type, base: F.baht(base, 2) })
          }));
        })) : h('p', { class: 'muted' }, Pr.promoEmpty)));
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
        field(Li.launch, editing ? launchInput(p) : (p.launchDate ? F.date(p.launchDate.slice(0, 7)) : p.launchQuarter ? p.launchQuarter.replace(/^(\d{4})-(Q\d)$/, '$2 $1') : '–')),
        field(Li.discontinue, editing ? textInput(p, 'discontinueMonth', Li.discontinue, { type: 'month' }) : (p.discontinueMonth ? F.date(p.discontinueMonth) : Li.discontinueNone)),
        field(Li.clearance, cl ? fill(Li.clearanceText, { from: F.date(cl.fromMonth), to: F.date(cl.toMonth), stock: F.units(cl.stockQty) }) : Li.clearanceNone),
        // CR-17: ปิด npdApproval = ไม่แสดงสถานะอนุมัติของแผน NPD
        npd ? field(NP.title, SP.core.features.isOn('npdApproval')
          ? fill(Li.npdLink, { stage: NP.stages[calc.npdStage(npd, month)], status: L.workflow.status[(npd.workflow || {}).status || 'draft'] })
          : fill(Li.npdLinkStage, { stage: NP.stages[calc.npdStage(npd, month)] })) : null));
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, fill(Li.timelineTitle, { year: year })), C.statusStrip(calc.statusSegments(p, year), year)));
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, fill(Li.listedTitle, { n: units.length })),
        units.length ? h('ul', { class: 'pd-list' }, Object.keys(byChannel).map(function (ch) { return h('li', null, h('strong', null, ch + ': '), byChannel[ch].join(', ')); })) : h('p', { class: 'muted' }, Li.listedEmpty),
        h('a', { href: SP.core.paths.to(SP.core.registry.byId('productMaster').path) }, Li.listingLink)));
    }

    function history(body, p) {
      var Hs = page.history;
      var key = calc.productKey(p);
      var list = store.get('master.audit').filter(function (e) { return (e.entity === 'product' || e.entity === 'price') && e.key === key; }).reverse();
      function show(f, v) {
        if (v == null || v === '') return '–';
        if (f === 'image') return v ? Hs.imageYes : Hs.imageNo;
        if (f === 'inTrcloud') return page.trcloud[v === false ? 'notOpen' : 'open'];
        if (f === 'price' && typeof v === 'object') return (L.priceTypes[v.priceType] || v.priceType || '') + ' ' + F.baht(v.price, 2) + ' · ' + F.date(v.effectiveMonth || v.effectiveFrom);
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

    // ------------------------------------------------------------------ เพิ่ม SKU (Drawer โหมดสร้าง) · CR-30 Product Code จากระบบตาม Type
    function renderCreate() {
      var T = tax();
      var G = page.general;
      var Cr = page.create;
      var np = { trCode: '', barcode: '', name: '', nameEn: '', shortName: '', inferred: false, categoryId: null, subCategoryId: null, typeId: null,
        seriesId: null, subSeriesId: null, packSize: null, uom: SP.data.settings.UOMS[0], image: null, launchDate: null, discontinueMonth: null, clearance: null,
        note: '', inTrcloud: false };
      drawerCtl.head.appendChild(h('div', { class: 'pd-head' }, h('div', { class: 'pd-title' }, h('h2', null, Cr.title))));
      var name = h('input', { type: 'text', class: 'pm-input pd-input pd-new-name', 'aria-label': PF.name, placeholder: PF.name });
      var nameEn = h('input', { type: 'text', class: 'pm-input pd-input', 'aria-label': PF.nameEn, placeholder: PF.nameEn });
      var barcode = h('input', { type: 'text', class: 'pm-input pd-input', 'aria-label': PF.barcode, placeholder: PF.barcode });
      var launch = h('input', { type: 'month', class: 'pm-input pd-new-launch', 'aria-label': PF.launchDate });
      var rspIn = h('input', { type: 'number', class: 'pm-input pm-stock', min: '0', step: '0.01', 'aria-label': Cr.rspLabel, placeholder: Cr.rspLabel });
      var preview = h('p', { class: 'pd-code-preview', role: 'status' });
      var msg = h('p', { class: 'pm-msg', role: 'status' });
      function coded() { return CAT.nextCode(draft.products, T, np.typeId, draft.codeCounters); }
      function updatePreview() {
        var r = coded();
        preview.className = 'pd-code-preview' + (r.ok ? ' is-ok' : r.error === 'type' ? ' muted' : ' is-error');
        preview.textContent = r.ok ? fill(Cr.codePreview, { code: r.code }) : r.error === 'type' ? Cr.codePending : Cr.codeErrors[r.error];
      }
      var catSel = C.cascadeSelect({ tax: T, kind: 'category', value: np, labels: [PF.categoryId, PF.subCategoryId, PF.typeId], placeholder: G.placeholder,
        onChange: function (v) { Object.keys(v).forEach(function (k) { np[k] = v[k]; }); updatePreview(); } });
      var serSel = C.cascadeSelect({ tax: T, kind: 'series', value: np, labels: [PF.seriesId, PF.subSeriesId], placeholder: G.placeholder, onChange: function (v) { Object.keys(v).forEach(function (k) { np[k] = v[k]; }); } });
      updatePreview();
      drawerCtl.body.appendChild(h('div', { class: 'pd-body' },
        h('section', { class: 'pd-section' }, h('h3', null, G.category), catSel, preview, h('p', { class: 'muted small' }, G.codeNote)),
        h('section', { class: 'pd-section' }, h('h3', null, G.names), field(PF.name, name), field(PF.nameEn, nameEn)),
        h('section', { class: 'pd-section' }, h('h3', null, G.series), serSel),
        h('section', { class: 'pd-section' }, h('h3', null, G.codes), field(PF.barcode, barcode)),
        h('section', { class: 'pd-section' }, field(PF.launchDate, launch), field(Cr.rspLabel, rspIn)),
        msg,
        h('div', { class: 'dlg-actions' },
          h('button', { type: 'button', class: 'btn btn-ghost', onClick: function () { drawerCtl.close(); } }, L.dialog.cancel),
          h('button', { type: 'button', class: 'btn btn-primary pd-create', onClick: function () {
            if (!name.value.trim()) { msg.className = 'pm-msg is-error'; msg.textContent = Cr.nameRequired; return; }
            var r = coded();
            if (!r.ok) { msg.className = 'pm-msg is-error'; msg.textContent = Cr.codeErrors[r.error]; return; }
            var at = new Date().toISOString();
            np.trCode = r.code;
            np.name = name.value.trim();
            np.nameEn = nameEn.value.trim();
            np.barcode = barcode.value.trim();
            np.launchDate = launch.value ? launch.value + '-01' : null;
            np.createdAt = at;
            np.updatedAt = at;
            draft.products.push(np);
            draft.codeCounters = CAT.takeCode(draft.codeCounters, r.code);
            if (Number(rspIn.value) > 0) {
              var res = calc.setBasePrice(draft.basePrices, { productKey: r.code, priceType: 'RSP', effectiveMonth: np.launchDate && np.launchDate.slice(0, 7) > month ? np.launchDate.slice(0, 7) : month, price: Number(rspIn.value), by: byName(), at: at });
              if (res.ok) draft.basePrices = res.list;
            }
            creating = false;
            selected = r.code;
            tab = 'general';
            filters.q = '';
            draw();
          } }, Cr.submit))));
    }

    // ------------------------------------------------------------------ เปรียบเทียบกับ ERP (TRCLOUD)
    function openErp() {
      renderErp();
      erpCtl.open();
    }

    function renderErp() {
      var E = page.erp;
      var res = calc.compareErp(cur().products, cur().basePrices, SP.data.erpSnapshot, month);
      var changes = CAT.trcloudChanges(cur().products, SP.data.erpSnapshot);
      C.clear(erpCtl.head).appendChild(h('div', { class: 'pd-title' }, h('h2', null, E.title), h('p', { class: 'muted small' }, E.note)));
      C.clear(erpCtl.body);
      function group(title, items, build, extra) {
        return h('section', { class: 'pd-section erp-group' }, h('h3', null, title + ' (' + items.length + ')'),
          items.length ? h('ul', { class: 'pd-list' }, items.map(build)) : h('p', { class: 'muted' }, E.none), extra || null);
      }
      erpCtl.body.appendChild(group(E.groups.onlyErp, res.onlyErp, function (r) {
        return h('li', { class: 'erp-only' }, h('strong', null, r.trCode), ' ' + r.name + ' · ' + (r.barcode || '–') + ' · ' + F.baht(r.rsp, 2) + ' ',
          editing ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm erp-import', onClick: function () { importErp(r); } }, E.importSame)
            : h('span', { class: 'muted small', title: E.useHint }, E.useHint));
      }));
      erpCtl.body.appendChild(group(E.groups.onlyMaster, res.onlyMaster, function (p) { return h('li', null, h('strong', null, p.trCode), ' ' + p.name); }));
      erpCtl.body.appendChild(group(E.groups.trcloud, changes, function (c) {
        var p = calc.findProduct(cur().products, c.key);
        return h('li', { class: 'erp-trcloud' }, h('strong', null, c.key), ' ' + (p ? calc.displayName(p) : '') + ': ' +
          fill(E.trcloudLine, { from: page.trcloud[c.from ? 'open' : 'notOpen'], to: page.trcloud[c.to ? 'open' : 'notOpen'] }));
      }, changes.length ? (editing ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm erp-trcloud-apply', onClick: function () {
        draft.products = CAT.applyTrcloud(draft.products, changes);
        notice = fill(E.trcloudApplied, { n: changes.length });
        draw();
        renderErp();
      } }, E.trcloudApply) : h('p', { class: 'muted small' }, E.useHint)) : null));
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

    // นำเข้าสินค้าที่มีใน TRCLOUD แต่ไม่มีใน Product Master ด้วยรหัสเดิม (ไม่สร้างรหัสใหม่) · เลขนี้นับเป็นเลขที่ใช้แล้ว
    function importErp(row) {
      if (calc.findProduct(draft.products, row.trCode)) return;
      var at = new Date().toISOString();
      draft.products.push(CAT.productFromErp(row, tax(), SP.data.productImport.categoryRules, { at: at }));
      draft.codeCounters = CAT.takeCode(draft.codeCounters, row.trCode);
      if (row.rsp > 0) {
        var res = calc.setBasePrice(draft.basePrices, { productKey: String(row.trCode), priceType: 'RSP', effectiveMonth: month, price: row.rsp, by: 'ERP', at: at });
        if (res.ok) draft.basePrices = res.list;
      }
      notice = fill(page.erp.imported, { code: row.trCode });
      draw();
      renderErp();
    }

    function useErp(m) {
      var p = calc.findProduct(draft.products, m.key);
      if (!p) return;
      if (m.field === 'rsp') {
        var res = calc.setBasePrice(draft.basePrices, { productKey: m.key, priceType: 'RSP', effectiveMonth: month, price: m.erp, by: 'ERP', at: new Date().toISOString() });
        if (res.ok) draft.basePrices = res.list;
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
