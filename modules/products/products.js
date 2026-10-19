/*
 * modules/products/products.js — Product Master · Product List (CR-36 แท็บ สินค้า | Product Level) + CR-37 หน้า Bundle
 *
 * CR-37:          หน้า Bundle (registry bundle · modules/bundle/index.html โหลดไฟล์นี้ · SP.modules.bundle) แท็บ รายการ Bundle | ความต้องการชิ้นส่วน (#list / #demand)
 *                 รายการ Bundle = renderItems โหมด bundle: KPI 4 ใบ · ตัวกรอง (ค้นหารวมชิ้นส่วน · Status ไม่รวม Delete · Series · ชิ้นส่วน) · ข้อมูลที่ต้องตรวจ ·
 *                 ตาราง (ส่วนประกอบเป็น Chip · ราคารวมชิ้นส่วน · ส่วนลด · แผนปีแผน ชุด) · + สร้าง Bundle (โหมดแก้ไข) · สิทธิ์ของหน้า bundle
 *                 Drawer สินค้าแบบ Bundle (ทั้งหน้า Bundle และ Product List): ส่วนประกอบแก้ได้ (− / + · เพิ่ม · นำออก · รวมบรรทัดซ้ำ) · หมวดสินค้าระบบกำหนด ·
 *                 Series จากชิ้นส่วน (calc.bundleSeries) หรือทีม Product แก้เอง (seriesManual) · ผิดกติกา = ข้อความแดง + ปุ่มบันทึกใช้ไม่ได้ (Store ปฏิเสธซ้ำ)
 *                 Product List: ป้าย Bundle ต่อท้ายชื่อ · ตัวกรองเพิ่มเติม ประเภทสินค้า · Drawer SKU เดี่ยว อยู่ใน Bundle: … (ลิงก์ ui.bundleFocus) · Flag bundle ปิด = ไม่มี Bundle
 *                 แท็บความต้องการชิ้นส่วน = renderDemand (calc.componentDemand · อ่านอย่างเดียว · ไม่ใช่ยอดขาย)
 *
 * CR-36:          แท็บ สินค้า | Product Level ต่อจากหัวข้อ (ui.productListTab · #items / #level) · แท็บ Product Level = โค้ดเดิมของหน้า Category & Series ทั้งหมด
 *                 (สิทธิ์ส่วนของหน้า taxonomy · key เดิม · ไม่เห็น = ไม่มีแท็บ) · หน้าเดิม modules/taxonomy = ทางผ่าน (registry visible: false · perm productList)
 *                 แท็บสินค้า: หมวดสินค้าแบบลำดับชั้น (components.treeSelect) · จัดกลุ่มเลือกเกณฑ์ (components.groupPicker · ui.groupBy · ค่าเริ่มต้น Series) ·
 *                 Product Year (calc.productYear: ตัวกรองเพิ่มเติม · คอลัมน์ · จัดกลุ่ม) · Sub Series ในคอลัมน์ค่าเริ่มต้น · Drawer 50% 2 คอลัมน์ รูปอยู่ขวาของรหัสและชื่อ ·
 *                 ป้าย ระบบกำหนด = ลิงก์ไปแท็บ Product Level ที่เลือก Type นั้น
 *
 * ---------------- หัวไฟล์เดิมของแท็บสินค้า ----------------
 * 
 * modules/products/products.js — Product Master · Product List (CR-35 ชื่อหน้าภาษาอังกฤษ · คำอธิบายอยู่ในปุ่ม ?)
 * CR-35:          วงจรสถานะ 7 แบบ (ตัวกรองค่าเริ่มต้น = ทุก Status ยกเว้น Delete) · KPI ตามข้อ 10.1 · ตัวกรองประเภทรายได้ (calc.revenueTypeOf) ·
 *                 รหัสที่แสดง = calc.productCode (คำขอ = รหัสชั่วคราว NPD-YYMM-NNN · Key = ID ภายใน) · ป้าย ชื่อชั่วคราว + จาก Sales ต่อท้ายชื่อ ·
 *                 ยืนยันเป็น NPD (Drawer · catalog.confirmRequest) · Delete ตั้งแต่เดือน (ถามยืนยันเมื่อยังมีในแผน)
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
 *  
 * ---------------- หัวไฟล์เดิมของแท็บ Product Level (หน้า Category & Series เดิม) ----------------
 * 
 * modules/taxonomy/taxonomy.js — หมวดสินค้าและ Series (Product Master) — CR-15 มุมมองแบบคอลัมน์
 * 
 * หน้าที่:        แท็บ หมวดสินค้า | Series | ตารางไขว้ (จำแท็บและรายการที่เลือกที่ ui.taxonomySelection)
 *                 แถบตัวกรองแถวเดียว (จำที่ ui.taxonomyFilters · CR-30): ค้นหาชื่อ (ผลลัพธ์พร้อมเส้นทาง) · Series (เฉพาะแท็บหมวดสินค้า) ·
 *                 หมวดสินค้า (เฉพาะแท็บ Series · ตารางไขว้ใช้ทั้งสอง) · สถานะ · ข้อมูลที่ต้องตรวจ + Chip ตัวกรองที่ใช้อยู่ (components.filterChips)
 *                 (ตัดตัวกรอง Category / Sub Category / Sub Series ที่ซ้ำกับคอลัมน์)
 *                 หมวดสินค้า / Series: คอลัมน์ต่อระดับ (Category · Sub Category · Type | Series · Sub Series) เลื่อนภายในคอลัมน์ +
 *                 แผงรายละเอียด (จอแคบกว่า 1280px = Drawer ด้านขวา) / คีย์บอร์ด ↑↓ ← → F2
 *                 ตัวกรองข้ามมิติ = นับเฉพาะ SKU ที่ตรง (x / y) ซ่อนรายการที่ได้ 0 / ตารางไขว้ Series × หมวดสินค้า (อ่านอย่างเดียว กดช่อง = รายการสินค้า)
 *                 เปิดมาเป็นโหมดดู / แก้ไข (ทีม Product, workflowBar แบบง่าย): เพิ่ม (แถวใหม่ช่องว่าง) · เปลี่ยนชื่อในแถว · ลากจัดลำดับ
 *                 ภายในรายการแม่เดียวกัน · แผงรายละเอียด: ย้ายไปอยู่ใต้… · ย้าย SKU ไป… · รวมกับ… · เปิด/ปิดใช้งาน · ลบ (เฉพาะไม่มี SKU
 *                 และไม่มีรายการย่อย) · วันเริ่ม / วันสิ้นสุดของ Series · เลขนำหน้า Product Code ของ Type (2 หลัก ห้ามซ้ำ + รหัสถัดไป · core/catalog.js)
 *                 → บันทึก / ยกเลิก (แก้สำเนา ไม่เขียน store จนกดบันทึก) · แผงรายละเอียด: ชื่อ + {ระดับ} · อยู่ใน {เส้นทางแม่} + คำเตือนใต้ชื่อ
 *                 ⚠ แสดงเฉพาะรายการที่มีปัญหา (ไม่แสดงซ้ำที่รายการแม่) · Type ที่ยังไม่มีเลขนำหน้าอยู่ใน ข้อมูลที่ต้องตรวจ
 *                 กฎทั้งหมดจาก core/taxonomy.js (Pure functions)
 * อ่านจาก data/:  settings (TAXONOMY_SKU_LIST_MAX), content (pages.taxonomy, labels) + Master ผ่าน store (taxonomy, products)
 * store อ่าน:     master.taxonomy, master.products, master.codeCounters, ui.taxonomySelection, ui.taxonomyFilters, ui.role, ui.currentMonth
 * store เขียน:    master.taxonomy, master.products และ master.audit (ตอนกด บันทึก) / ui.taxonomySelection, ui.taxonomyFilters /
 *                 ui.productFilterHandoff (ก่อนเปิดหน้ารายการสินค้าที่กรองตามรายการนั้น — หน้ารายการสินค้าอ่านแล้วลบ)
 *  
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
    'launchDate', 'productYear', 'listedCount', 'sellIn', 'inTrcloud', 'source', 'updatedAt'];
  var MORE = ['channel', 'completeness', 'source', 'trcloud', 'revenue', 'year', 'kind'];
  function emptyFilters() { return { q: '', status: '', node: '', nodeLevel: '', channel: '', completeness: '', source: '', trcloud: '', revenue: '', year: [], kind: '', kpi: '' }; }
  // CR-37: ตัวกรองของหน้า Bundle (แยกจาก Product List)
  function emptyBundleFilters() { return { q: '', status: '', series: [], component: '', kpi: '' }; }
  var bundleFilters = emptyBundleFilters();
  function hasValue(v) { return Array.isArray(v) ? v.length > 0 : !!v; }
  var filters = emptyFilters();
  // CR-36: จัดกลุ่มเลือกเกณฑ์ได้ (components.groupPicker · จำต่อผู้ใช้ ui.groupBy.<ผู้ใช้>.productList · ค่าเริ่มต้น Series) · กลุ่มที่พับไว้
  var GROUP_OPTIONS = ['none', 'category', 'subCategory', 'type', 'series', 'level', 'status', 'year'];
  var collapsed = {};
  var tab = 'general';

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  function renderItems(root, ctx) {
    var page = ctx.page;
    // CR-37: หน้า Bundle ใช้ renderItems เดียวกัน (ctx.mode = 'bundle') · page = ข้อความของ Product List (Drawer ใช้ร่วม) · BP = ข้อความของหน้า Bundle
    var bundleMode = ctx.mode === 'bundle';
    var BP = SP.data.content.pages.bundle;
    var BS = SP.data.settings.BUNDLE || {};
    var permKey = bundleMode ? 'bundle' : 'productList';
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
    function canEdit() { return Perm.can(Perm.user(), permKey); }
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

    var exportBtn = C.exportButton({ unsaved: dirty, build: function (src) { return bundleMode ? bundleExportSpec(src) : exportSpec(src); } });
    var bar = C.workflowBar({
      simple: true, extra: exportBtn, modules: [permKey],   // CR-36: แท็บสินค้า = สิทธิ์ productList (Product Level = taxonomy) · CR-37 หน้า Bundle = bundle
      editing: function () { return editing; },
      onEdit: function () { startEdit(); },
      // CR-37: Bundle ผิดกติกา = บันทึกไม่ได้ · Bundle ที่มีในแผนแล้วเปลี่ยนส่วนประกอบ = ถามยืนยัน
      onSave: function () {
        if (blockedBundles().length) { C.toast(BP.saveBlocked); return; }
        confirmDeletes().then(function (ok) { return ok && confirmBundleChanges(); }).then(function (ok) { if (ok) save(); });
      },
      onCancel: function () { editing = false; creating = false; draft = clone(saved); notice = null; draw(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    function startEdit() { editing = true; draft = clone(saved); draw(); }

    // CR-35: สินค้าที่เพิ่งตั้ง Delete และยังมีในแผน SKU (ปีแผน) → ถามยืนยัน สินค้านี้มีในแผน N หน่วยขาย (ไม่ล้างค่าในแผน)
    function unitsWithPlan(key) {
      var td = store.get(store.planKey('topDown'));
      var plans = {};
      Object.keys(td.units || {}).forEach(function (ch) { (td.units[ch] || []).forEach(function (u) { plans[u] = store.get(store.planKey('sku.' + u)); }); });
      return SP.core.planEdits.unitsInPlan(plans, key);
    }
    function confirmDeletes() {
      var D2 = page.listing.deleteConfirm;
      var list = draft.products.filter(function (p) { var o = calc.findProduct(saved.products, calc.productKey(p)); return p.deletedFrom && (!o || o.deletedFrom !== p.deletedFrom); });
      return list.reduce(function (chain, p) {
        return chain.then(function (ok) {
          if (!ok) return false;
          var units = unitsWithPlan(calc.productKey(p));
          var names = units.map(function (u) { var i = calc.unitInfo(store.data(), u); return i ? i.unit.name : u; }).join(', ');
          return C.dialog({ title: fill(D2.title, { name: calc.productCode(p) + ' ' + p.name }), lines: [units.length ? fill(D2.inPlan, { n: units.length, units: names }) : D2.none, D2.note], danger: true, confirmLabel: D2.confirm })
            .then(function (r) { return r.ok; });
        });
      }, Promise.resolve(true));
    }

    function save() {
      var by = byName(), at = SP.core.clock.now();
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
      // CR-37: Store ตรวจกติกาของ Bundle อีกครั้ง (ปฏิเสธ = แจ้งแล้วอยู่ในโหมดแก้ไขต่อ)
      try { store.set('master.products', draft.products); } catch (e) { C.toast(e.message); return; }
      store.set('master.basePrices', draft.basePrices);
      store.set('master.codeCounters', draft.codeCounters);
      store.appendAudit(entries);
      saved = snapshot();
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
    // CR-36: Product Year = ปีของ Listing แรก → ปีของยอดขายแรก → null (calc.productYear)
    var historyData = store.data().history;
    function yearOf(p) { return calc.productYear(p, listings(), historyData); }
    function groupBy() { var all = store.get('ui.groupBy') || {}; var v = (all[uid()] || {}).productList; return GROUP_OPTIONS.indexOf(v) >= 0 ? v : 'series'; }
    function setGroupBy(v) { var all = clone(store.get('ui.groupBy') || {}); all[uid()] = all[uid()] || {}; all[uid()].productList = v; store.set('ui.groupBy', all); }
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
      if (!calc.bundleVisible(p)) return false;   // CR-37: Flag bundle ปิด = ไม่มี Bundle
      if (filters.kind && calc.productKind(p) !== filters.kind) return false;
      var q = filters.q.trim().toLowerCase();
      if (q) {
        // CR-35: ค้นหาด้วยรหัสชั่วคราวได้ (รหัสที่แสดง · รหัสชั่วคราวเดิม · ID ภายใน)
        var text = [calc.productCode(p), calc.productKey(p), p.tempCode, p.barcode, p.name, p.shortName, p.nameEn].filter(Boolean).join(' ').toLowerCase();
        if (text.indexOf(q) < 0) return false;
      }
      var st = statusOf(p), c = completeness(p);
      // CR-35: ค่าเริ่มต้น = ทุก Status ยกเว้น Delete · 'all' = ทั้งหมด
      if (!filters.status && st === 'delete') return false;
      if (filters.status && filters.status !== 'all' && st !== filters.status) return false;
      if (filters.revenue && calc.revenueTypeOf(st) !== filters.revenue) return false;
      if (filters.node && p[calc.taxonomyField(filters.nodeLevel)] !== filters.node) return false;
      if (!calc.inSeries(p, store.get('ui.seriesFilter') || [])) return false;
      if (filters.channel && !listings().some(function (l) { return l.productKey === calc.productKey(p) && unitChannel(l.accountId) === filters.channel; })) return false;
      if (filters.completeness && c.level !== filters.completeness) return false;
      if (filters.source && sourceOf(p) !== filters.source) return false;
      if (filters.trcloud && trcloudOf(p) !== filters.trcloud) return false;
      // CR-36: Product Year (หลายปี · none = ยังไม่มี Listing)
      if (filters.year.length) { var py = yearOf(p); if (filters.year.indexOf(py == null ? 'none' : String(py)) < 0) return false; }
      if (!skipKpi && filters.kpi) {
        if (filters.kpi === 'active' && st !== 'active') return false;
        if (filters.kpi === 'npd' && st !== 'request' && st !== 'planned' && st !== 'new') return false;
        if (filters.kpi.indexOf('npd:') === 0 && st !== filters.kpi.slice(4)) return false;
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
        code: { key: 'code', label: X.code, value: function (p) { return calc.productCode(p); } },
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
        productYear: { key: 'productYear', label: X.productYear, value: function (p) { var y = yearOf(p); return y == null ? L.groupBy.noYear : String(y); } },
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
      if (!p.inferred) return null;
      // CR-36: ลิงก์ไปแท็บ Product Level ที่เลือก Type นั้นไว้ (ผู้ที่เห็นแท็บ Product Level)
      if (ctx.openLevel && (p.typeId || p.subCategoryId || p.categoryId)) {
        return h('button', { type: 'button', class: 'link-btn badge tag-muted pd-inferred pd-inferred-link', title: L.product.inferredTitle + ' · ' + page.levelLinkTip,
          onClick: function () { ctx.openLevel(p); } }, L.product.inferredTag);
      }
      return h('span', { class: 'badge tag-muted pd-inferred', title: L.product.inferredTitle }, L.product.inferredTag);
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
      syncSave();
      if (bundleMode) { drawBundles(); return; }   // CR-37
      var products = cur().products;
      var P = page.kpi;

      // KPI 6 ใบ (นับจากสินค้าตามตัวกรองอื่น ยกเว้นการกด KPI)
      var base = products.filter(function (p) { return matches(p, true); });
      function count(fn) { return base.filter(fn).length; }
      // CR-35 ข้อ 10.1: ทั้งหมด = ไม่นับ Delete · Active + Discontinued n · NPD = Request + Planned + NPD (บรรทัดย่อยกดแยกได้) · ยังไม่เปิดใน TRCLOUD = Request
      function st(s) { return count(function (p) { return statusOf(p) === s; }); }
      var nReq = st('request'), planned = st('planned'), launched = st('new');
      var kpis = [
        { key: '', label: P.all, n: count(function (p) { return statusOf(p) !== 'delete'; }) },
        { key: 'active', label: P.active, n: st('active'), sub: fill(P.activeSub, { n: F.number(st('discontinued')) }) },
        { key: 'npd', label: P.npd, n: nReq + planned + launched, subs: [['request', nReq], ['planned', planned], ['new', launched]] },
        { key: 'required', label: P.required, n: count(function (p) { return completeness(p).level === 'required'; }), cls: 'is-danger' },
        { key: 'recommended', label: P.recommended, n: count(function (p) { return completeness(p).level === 'recommended'; }), cls: 'is-warn' },
        { key: 'notInTrcloud', label: P.notInTrcloud, n: count(function (p) { return !CAT.inTrcloud(p); }), cls: 'is-info', sub: P.tempCodeSub }
      ];
      root.appendChild(h('div', { class: 'pl-kpis' }, kpis.map(function (k) {
        if (k.subs) {
          // การ์ด NPD: กดการ์ด = ทั้งหมด · กดบรรทัดย่อย = เฉพาะ Status นั้น
          var on = filters.kpi === k.key || filters.kpi.indexOf(k.key + ':') === 0;
          var card = h('div', { class: 'card pl-kpi pl-kpi-' + k.key + (on ? ' is-selected' : ''), role: 'button', tabindex: '0', title: P.title, 'aria-pressed': filters.kpi === k.key ? 'true' : 'false',
            onClick: function () { filters.kpi = filters.kpi === k.key ? '' : k.key; draw(); },
            onKeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); filters.kpi = filters.kpi === k.key ? '' : k.key; draw(); } } },
            h('span', { class: 'pl-kpi-label' }, k.label), h('strong', { class: 'pl-kpi-value' }, F.number(k.n)), h('span', { class: 'pl-kpi-unit' }, P.unit),
            h('span', { class: 'pl-kpi-sub pl-kpi-subs' }, k.subs.map(function (x, i) {
              var id = k.key + ':' + x[0];
              return [i ? ' · ' : '', h('button', { type: 'button', class: 'link-btn pl-kpi-subbtn' + (filters.kpi === id ? ' is-active' : ''), 'aria-pressed': filters.kpi === id ? 'true' : 'false',
                onClick: function (e) { e.stopPropagation(); filters.kpi = filters.kpi === id ? '' : id; draw(); } }, fill(P.npdSubs[x[0]], { n: F.number(x[1]) }))];
            })));
          return card;
        }
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

    // CR-36: หมวดสินค้าแบบลำดับชั้นในตัวเดียว (components.treeSelect · calc.categoryOptions: Category ตัวหนา · '- ' Sub Category · '-- ' Type · ค่า = id ของระดับใดก็ได้)
    function nodeLevel(id) { var n = SP.core.taxonomy.find(tax(), 'category', id); return n ? n.level : ''; }

    function toolbar() {
      var Fl = page.filters;
      var search = h('input', { type: 'search', class: 'search-input pl-search', placeholder: page.searchPlaceholder, 'aria-label': page.searchPlaceholder, value: filters.q });
      search.addEventListener('input', function () { filters.q = search.value; renderTable(); });
      var moreOn = MORE.filter(function (k) { return hasValue(filters[k]); }).length;
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
        sel(Fl.status, 'status', [{ value: '', label: Fl.statusAll }, { value: 'all', label: Fl.statusEverything }].concat(calc.PRODUCT_STATUSES.map(function (s) { return { value: s, label: L.status[s] }; }))),
        C.seriesFilter({ options: calc.seriesList(tax(), cur().products), value: store.get('ui.seriesFilter') || [], onChange: function (v) { store.set('ui.seriesFilter', v); draw(); } }),
        C.treeSelect({ label: Fl.category, value: filters.node, allLabel: Fl.categoryAll, options: calc.categoryOptions(tax()), className: 'pl-filter-node',
          onChange: function (v) { filters.node = v; filters.nodeLevel = v ? nodeLevel(v) : ''; draw(); } }),
        C.groupPicker({ value: groupBy(), className: 'pl-group-by', options: GROUP_OPTIONS.map(function (k) { return { value: k, label: L.groupBy[k] }; }),
          onChange: function (v) { setGroupBy(v); draw(); } }),
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
        sel(Fl.trcloud, 'trcloud', [{ value: '', label: Fl.trcloudAll }].concat(['open', 'notOpen'].map(function (k) { return { value: k, label: page.trcloud[k] }; }))),
        // CR-35: ประเภทรายได้ (calc.revenueTypeOf ของ Status)
        sel(Fl.revenue, 'revenue', [{ value: '', label: Fl.revenueAll }].concat(['npd', 'existing', 'clearance'].map(function (k) { return { value: k, label: L.revenueTypes[k] }; }))),
        // CR-36: Product Year (เลือกหลายปี + ยังไม่มี Listing)
        C.multiSelect({ label: Fl.year, allLabel: Fl.yearAll, selected: Fl.yearSelected, clear: L.series.clear, empty: L.series.empty, value: filters.year,
          options: yearOptions(), onChange: function (v) { filters.year = v; draw(); } }),
        // CR-37: ประเภทสินค้า (สินค้าเดี่ยว / Bundle) · Flag bundle ปิด = ไม่แสดง
        calc.bundleOn() ? sel(Fl.kind, 'kind', [{ value: '', label: Fl.kindAll }].concat(['single', 'bundle'].map(function (k) { return { value: k, label: Fl.kindOptions[k] }; }))) : null);
    }
    function yearOptions() {
      var ys = {};
      cur().products.forEach(function (p) { var y = yearOf(p); ys[y == null ? 'none' : String(y)] = true; });
      return Object.keys(ys).filter(function (k) { return k !== 'none'; }).sort().concat(ys.none ? ['none'] : []).map(function (k) { return { value: k, label: k === 'none' ? L.groupBy.noYear : k }; });
    }

    // Chip ตัวกรองที่ใช้อยู่ (× เอาออกทีละรายการ · ล้างทั้งหมด) + จำนวนที่แสดง
    function renderChips(shown) {
      if (!chipSlot) return;
      var T = tax();
      var Fl = page.filters;
      var items = [];
      function add(label, value, clear) { items.push({ label: fill(Fl.chip, { label: label, value: value }), onRemove: function () { clear(); draw(); } }); }
      if (filters.kpi) items.push({ label: fill(Fl.kpiChip, { value: filters.kpi.indexOf('npd:') === 0 ? page.kpi.npd + ' · ' + L.status[filters.kpi.slice(4)] : page.kpi[filters.kpi] }), onRemove: function () { filters.kpi = ''; draw(); } });
      if (filters.q.trim()) items.push({ label: fill(Fl.searchChip, { value: filters.q.trim() }), onRemove: function () { filters.q = ''; draw(); } });
      if (filters.status) add(Fl.status, filters.status === 'all' ? Fl.statusEverything : L.status[filters.status], function () { filters.status = ''; });
      if (filters.revenue) add(Fl.revenue, L.revenueTypes[filters.revenue], function () { filters.revenue = ''; });
      if (filters.node) add(Fl.category, calc.taxonomyName(T, 'category', filters.node), function () { filters.node = ''; filters.nodeLevel = ''; });
      (store.get('ui.seriesFilter') || []).forEach(function (s) {
        add(L.series.label, calc.taxonomyName(T, 'series', s) || L.series.none, function () { store.set('ui.seriesFilter', (store.get('ui.seriesFilter') || []).filter(function (x) { return x !== s; })); });
      });
      if (filters.channel) add(Fl.channel, calc.findById(SP.data.channels, filters.channel).name, function () { filters.channel = ''; });
      if (filters.completeness) add(Fl.completeness, Fl.completenessOptions[filters.completeness], function () { filters.completeness = ''; });
      if (filters.source) add(Fl.source, Fl.sourceOptions[filters.source], function () { filters.source = ''; });
      if (filters.trcloud) add(Fl.trcloud, page.trcloud[filters.trcloud], function () { filters.trcloud = ''; });
      filters.year.forEach(function (y) { add(Fl.year, y === 'none' ? L.groupBy.noYear : y, function () { filters.year = filters.year.filter(function (x) { return x !== y; }); }); });
      if (filters.kind) add(Fl.kind, Fl.kindOptions[filters.kind], function () { filters.kind = ''; });
      C.clear(chipSlot);
      chipSlot.appendChild(h('span', { class: 'pl-summary' },
        h('span', { class: 'pl-count' }, fill(page.resultCount, { n: F.number(shown), total: F.number(cur().products.length) })),
        ' · ' + fill(page.statusAsOf, { month: F.date(month) })));
      var chips = C.filterChips(items, function () { filters = emptyFilters(); store.set('ui.seriesFilter', []); draw(); });
      if (chips) chipSlot.appendChild(chips);
    }

    // ------------------------------------------------------------------ ตาราง
    function renderTable() {
      if (bundleMode) { renderBundleTable(); return; }   // CR-37
      if (!tableSlot) return;
      var T = tax();
      var cols = columns();
      var shown = cur().products.filter(function (p) { return matches(p); });
      var head = cols.map(function (c) {
        return h('th', { scope: 'col', class: (c.key === 'code' ? 'pl-code ' : c.key === 'name' ? 'pl-name ' : c.key === 'image' ? 'pl-img ' : '') + (c.num ? 'num' : '') }, c.label);
      }).concat([h('th', { scope: 'col', class: 'manage' }, page.columns.manage)]);
      var body = h('tbody');
      if (!shown.length) body.appendChild(h('tr', null, h('td', { class: 'grid-empty', colspan: String(cols.length + 1) }, page.empty)));
      var GB = L.groupBy;
      var by = groupBy();
      var levels = calc.productGroupLevels(by, { tax: T, statusOf: statusOf, yearOf: yearOf, labels: { none: GB.noneName, noYear: GB.noYear, status: L.status } });
      if (levels && shown.length) {
        (function walk(groups, parent) {
          groups.forEach(function (g) {
            var gid = by + parent + '/' + g.id;
            var isOpen = !collapsed[gid];
            var leaf = [];
            (function all(x) { if (x.items) leaf = leaf.concat(x.items); else x.groups.forEach(all); })(g);
            var byStatus = {};
            leaf.forEach(function (p) { var st = statusOf(p); byStatus[st] = (byStatus[st] || 0) + 1; });
            var name = fill(GB.head, { name: g.name, n: F.number(g.count) });
            body.appendChild(h('tr', { class: 'is-group pl-group-d' + g.depth }, h('td', { colspan: String(cols.length + 1) },
              h('button', { type: 'button', class: 'link-btn pl-group-toggle', 'aria-expanded': isOpen ? 'true' : 'false', title: fill(isOpen ? GB.collapse : GB.expand, { name: g.name }),
                onClick: function () { collapsed[gid] = isOpen; renderTable(); } }, h('span', { class: 'pl-group-caret', 'aria-hidden': 'true' }, isOpen ? '▾' : '▸'), h('span', { class: 'pl-group-name' }, name)),
              by !== 'status' ? h('span', { class: 'pl-group-status' }, calc.PRODUCT_STATUSES.filter(function (s) { return byStatus[s]; }).map(function (s) { return C.statusBadge(s, String(byStatus[s])); })) : null)));
            if (!isOpen) return;
            if (g.groups) walk(g.groups, gid); else g.items.forEach(function (p) { body.appendChild(rowOf(p, cols)); });
          });
        })(calc.groupItems(shown, levels), '');
      } else {
        shown.forEach(function (p) { body.appendChild(rowOf(p, cols)); });
      }
      var table = h('table', { class: 'data-grid pl-table' + (levels ? ' is-grouped' : '') }, h('thead', null, h('tr', null, head)), body);
      C.clear(tableSlot).appendChild(h('div', { class: 'fit-scroll pl-scroll' }, table));
      renderChips(shown.length);
      highlight();
    }

    function rowOf(p, cols) {
      var T = tax();
      var key = calc.productKey(p);
      var tds = cols.map(function (c) {
        // CR-35: รหัสที่แสดง (คำขอ = รหัสชั่วคราว) · ป้าย ชื่อชั่วคราว และ จาก Sales ต่อท้ายชื่อ (ไม่ถูกตัด)
        if (c.key === 'code') return h('td', { class: 'pl-code' }, h('span', { class: 'pl-code-text' }, calc.productCode(p)));
        if (c.key === 'name') return h('td', { class: 'pl-name', title: p.name }, h('span', { class: 'pl-name-row' }, h('span', { class: 'pl-name-text' }, calc.displayName(p)), C.tempNameTag(p), C.bundleTag(p, cur().products), salesTag(p)));
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
      creating = bundleMode ? 'bundle' : true;   // CR-37: หน้า Bundle = สร้าง Bundle
      createDraft = null;
      createRsp = null;
      selected = null;
      renderDrawer();
      drawerCtl.open();
    }

    function product() { return selected ? calc.findProduct(cur().products, selected) : null; }

    function renderDrawer() {
      C.clear(drawerCtl.head);
      C.clear(drawerCtl.body);
      if (creating) { if (creating === 'bundle') renderCreateBundle(); else renderCreate(); return; }
      var p = product();
      if (!p) { drawerCtl.close(); return; }
      var T = tax();
      var key = calc.productKey(p);
      var c = completeness(p);
      drawerCtl.head.appendChild(h('div', { class: 'pd-head' },
        C.productThumb(p, T, { size: 'md' }),
        h('div', { class: 'pd-title' },
          h('h2', null, p.name || '–', ' ', C.tempNameTag(p), C.bundleTag(p, cur().products)),
          h('div', { class: 'pd-meta' },
            lockedCode(calc.productCode(p)), C.tempCodeTag(p),
            C.statusBadge(statusOf(p)),
            h('span', { class: 'pd-pct' }, fill(page.completenessPct, { pct: F.pct(c.pct, 0) })), C.completenessBadge(c))),
        // CR-35: ยืนยันเป็น NPD (คำขอ · ทีม Product · มีผลทันที) · แก้ไข
        !editing && canEdit() && calc.isRequestProduct(p) ? h('button', { type: 'button', class: 'btn btn-secondary btn-sm pd-confirm-npd', onClick: function () { confirmRequest(key); } }, L.confirmRequest.button) : null,
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

    // CR-35: ยืนยันคำขอ NPD (Request → Planned) — บันทึกทันที (catalog.confirmRequest · Key เดิม แผน SKU และ Listing อยู่ครบ)
    function confirmRequest(key) {
      var m = store.master();
      var p = calc.findProduct(m.products, key);
      C.confirmRequestDialog(p, m).then(function (v) {
        if (!v) return;
        var at = SP.core.clock.now(), by = byName();
        var res = CAT.confirmRequest(m, key, v, { by: by, at: at });
        if (!res.ok) { C.toast(L.confirmRequest.errors[res.error] || res.error); return; }
        store.set('master.products', res.master.products);
        store.set('master.npdPlans', res.master.npdPlans);
        store.set('master.codeCounters', res.master.codeCounters);
        store.appendAudit([{ entity: 'product', key: key, field: 'trCode', oldValue: res.tempCode, newValue: res.code, by: by, at: at }]);
        saved = snapshot();
        draft = clone(saved);
        C.toast(fill(L.confirmRequest.done, { code: res.code, name: v.name }));
        draw();
      });
    }

    function field(label, content, cls) { return h('div', { class: 'pd-field ' + (cls || '') }, h('span', { class: 'pd-label' }, label), h('span', { class: 'pd-value' }, content)); }
    function dval(v) { return v == null || v === '' ? '–' : v; }

    function refresh() { renderDrawer(); renderTable(); var b = root.querySelector('.edit-banner'); if (b) b.update(dirty()); syncSave(); }

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
        // CR-36: รูปสินค้าอยู่ขวาของส่วนรหัสและชื่อ
        body.appendChild(h('div', { class: 'pd-top' }, h('div', { class: 'pd-top-main' },
          h('section', { class: 'pd-section' }, h('h3', null, G.codes),
            field(PF.trCode, [lockedCode(calc.productCode(p)), ' ', C.tempCodeTag(p)]), p.tempCode ? field(L.tempCode.tag, fill(L.tempCode.old, { code: p.tempCode })) : null,
            field(PF.barcode, dval(p.barcode)), trcloudField(p)),
          h('section', { class: 'pd-section' }, h('h3', null, G.names), field(PF.name, dval(p.name)), field(PF.shortName, dval(p.shortName)), field(PF.nameEn, dval(p.nameEn)))),
          h('section', { class: 'pd-section pd-top-image' }, h('h3', null, G.image), h('div', { class: 'pd-image' }, C.productThumb(p, T, { size: 'lg' })))));
        // CR-37: Bundle = ส่วนประกอบ · หมวดสินค้าระบบกำหนด · Series / SKU เดี่ยว = อยู่ใน Bundle
        if (calc.isBundle(p)) { bundleSections(body, p); return; }
        var inB = inBundlesField(p);
        if (inB) body.appendChild(inB);
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.category, inferredTag(p)),
          field(PF.categoryId, dval(tx.category)), field(PF.subCategoryId, dval(tx.subCategory)), field(PF.typeId, dval(tx.type))));
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.series), field(PF.seriesId, dval(tx.series)), field(PF.subSeriesId, dval(tx.subSeries))));
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.other),
          field(PF.packSize, dval(packText(p))), p.note ? field(G.note, p.note) : null));
        return;
      }
      body.appendChild(h('div', { class: 'pd-top' }, h('div', { class: 'pd-top-main' },
        h('section', { class: 'pd-section' }, h('h3', null, G.codes),
          field(PF.trCode, [lockedCode(calc.productCode(p)), ' ', C.tempCodeTag(p)]), p.tempCode ? field(L.tempCode.tag, fill(L.tempCode.old, { code: p.tempCode })) : null,
          field(PF.barcode, textInput(p, 'barcode', PF.barcode)),
          trcloudField(p)),
        h('section', { class: 'pd-section' }, h('h3', null, G.names),
          field(PF.name, textInput(p, 'name', PF.name)), field(PF.shortName, textInput(p, 'shortName', PF.shortName)), field(PF.nameEn, textInput(p, 'nameEn', PF.nameEn)))),
        imageEditor(p, 'pd-top-image')));
        if (calc.isBundle(p)) { bundleSections(body, p); return; }   // CR-37
        var inBe = inBundlesField(p);
        if (inBe) body.appendChild(inBe);
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
    }

    function imageEditor(p, cls) {
      var T = tax();
      var G = page.general;
      var file = h('input', { type: 'file', accept: 'image/*', class: 'pd-file', 'aria-label': G.imageUpload });
      var msg = h('span', { class: 'pm-msg', role: 'status' });
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f) return;
        C.resizeImage(f, SP.data.settings.IMAGE_MAX_PX).then(function (url) { p.image = url; refresh(); }, function () { msg.className = 'pm-msg is-error'; msg.textContent = G.imageError; });
      });
      return h('section', { class: 'pd-section' + (cls ? ' ' + cls : '') + (isDirty(p, 'image') ? ' is-dirty-cell' : '') }, h('h3', null, G.image),
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
        field(Li.clearance, cl ? fill(Li.clearanceText, { from: F.date(cl.fromMonth), to: cl.toMonth ? F.date(cl.toMonth) : Li.clearanceUntilSold, stock: F.units(cl.stockQty) }) : Li.clearanceNone),
        // CR-35: Status Delete ตั้งแต่เดือน (เลิกขายแล้ว ไม่ผลิต ไม่ขาย)
        field(Li.deleted, editing ? h('span', { title: Li.deletedTip }, textInput(p, 'deletedFrom', Li.deleted, { type: 'month' })) : (p.deletedFrom ? h('span', { title: Li.deletedTip }, F.date(p.deletedFrom), ' ', C.statusBadge('delete')) : Li.deletedNone)),
        // CR-17: ปิด npdApproval = ไม่แสดงสถานะอนุมัติของแผน NPD
        npd ? field(NP.title, SP.core.features.isOn('npdApproval')
          ? fill(Li.npdLink, { stage: NP.stages[calc.npdStage(npd, month)], status: L.workflow.status[(npd.workflow || {}).status || 'draft'] })
          : fill(Li.npdLinkStage, { stage: NP.stages[calc.npdStage(npd, month)] })) : null));
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, fill(Li.timelineTitle, { year: year })), C.statusStrip(calc.statusSegments(p, year), year)));
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, fill(Li.listedTitle, { n: units.length })),
        units.length ? h('ul', { class: 'pd-list' }, Object.keys(byChannel).map(function (ch) { return h('li', null, h('strong', null, ch + ': '), byChannel[ch].join(', ')); })) : h('p', { class: 'muted' }, Li.listedEmpty),
        h('a', { href: SP.core.paths.to(SP.core.registry.byId('launchListing').path) + '#listing', onClick: function () { store.set('ui.listingFocus', key); } }, Li.listingLink)));
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
        // CR-37: ส่วนประกอบ · ประเภทสินค้า · Series ที่กำหนดเอง ของ Bundle
        if (f === 'components' && Array.isArray(v)) return v.map(function (c) { return fill(BP.componentsText, { code: calc.codeOf(cur().products, c.skuId), qty: c.qty }); }).join(BP.componentsJoin);
        if (f === 'kind') return page.filters.kindOptions[v] || v;
        if (f === 'seriesManual') return v ? BP.drawer.seriesManual : BP.drawer.seriesAuto;
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
            var at = SP.core.clock.now();
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
      var at = SP.core.clock.now();
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
        var res = calc.setBasePrice(draft.basePrices, { productKey: m.key, priceType: 'RSP', effectiveMonth: month, price: m.erp, by: 'ERP', at: SP.core.clock.now() });
        if (res.ok) draft.basePrices = res.list;
      } else {
        p[m.field] = m.erp;
      }
      notice = page.erp.applied;
      draw();
      renderErp();
    }

    // ================================================================== CR-37 Bundle
    //   หน้า Bundle (ctx.mode = 'bundle') ใช้ renderItems เดียวกับ Product List: โหมดแก้ไข · บันทึก · Drawer (แท็บราคา · Listing และวงจรสินค้า · ประวัติ ใช้ร่วม)
    //   ต่างกันที่หน้ารายการ (KPI 4 ใบ · ตัวกรอง · ตาราง · ข้อมูลที่ต้องตรวจ) · ส่วนประกอบอยู่ในแท็บข้อมูลทั่วไปของ Drawer สินค้าแบบ Bundle (ทั้ง 2 หน้า)
    //   กติกาชิ้นส่วนจาก calc (bundleIssues · normalizeBundles ที่ Store ใช้) · ราคารวมชิ้นส่วน / ส่วนลด = calc.bundleComponentPrice / bundleDiscount
    function bundleList() { return cur().products.filter(calc.isBundle); }
    function comps(p) { return calc.mergeComponents(p.components); }
    function compOf(c) { return calc.findProduct(cur().products, c.skuId); }
    function isCheckStatus(st) { return (BS.checkStatuses || []).indexOf(st) >= 0; }
    function badComps(p) { return comps(p).filter(function (c) { var x = compOf(c); return x && isCheckStatus(statusOf(x)); }); }
    function priceData() { return { basePrices: cur().basePrices }; }
    function partsPrice(p) { return calc.bundleComponentPrice(priceData(), p, 'RSP', month); }
    function discountOf(p) { return calc.bundleDiscount(priceData(), p, 'RSP', month); }
    function pctText(v) { return v == null ? '–' : (v < 0 ? '−' : '') + F.pct(Math.abs(v), 1); }
    function compText(p) { return comps(p).map(function (c) { return fill(BP.componentsText, { code: calc.codeOf(cur().products, c.skuId), qty: c.qty }); }).join(BP.componentsJoin); }
    // ส่วนประกอบเปลี่ยนจากที่บันทึกไว้ (ตัดสินว่าต้องตรวจสถานะชิ้นส่วนหรือไม่ · เหมือน calc.normalizeBundles ที่ Store)
    function compsChanged(p) { var o = original(calc.productKey(p)); return !o || JSON.stringify(calc.mergeComponents(o.components)) !== JSON.stringify(comps(p)); }
    function issuesOf(p) { return calc.bundleIssues(p, cur().products, month, compsChanged(p)); }
    function issueText(p, x) {
      var E = BP.errors;
      return fill(E[x.code] || E.invalid, { bundle: calc.productCode(p), code: x.skuId ? calc.codeOf(cur().products, x.skuId) : '', status: x.status ? L.status[x.status] : '' });
    }
    function blockedBundles() { return editing ? draft.products.filter(function (p) { return calc.isBundle(p) && issuesOf(p).length; }) : []; }
    // ปุ่ม บันทึก ใช้ไม่ได้เมื่อมี Bundle ผิดกติกา (ข้อความเตือนสีแดงอยู่ใต้ตารางส่วนประกอบ)
    function syncSave() {
      var btn = bar.querySelector('.wf-save');
      if (!btn) return;
      var blocked = blockedBundles().length > 0;
      btn.disabled = blocked;
      btn.title = blocked ? BP.saveBlocked : '';
    }
    // หมวดสินค้าและ Series ของ Bundle ในฉบับร่าง (ตรงกับที่ Store กำหนดตอนบันทึก)
    function syncBundle(p) {
      p.components = comps(p);
      p.categoryId = BS.categoryId; p.subCategoryId = BS.subCategoryId; p.typeId = BS.typeId; p.inferred = false;
      if (!p.seriesManual) { p.seriesId = calc.bundleSeries(p, cur().products); p.subSeriesId = null; }
    }
    // Bundle เดิมที่ส่วนประกอบเปลี่ยนและมีในแผน SKU → ถามยืนยัน (CR-37 ข้อ 1.2)
    function confirmBundleChanges() {
      var D2 = BP.drawer.planConfirm;
      var list = draft.products.filter(function (p) { return calc.isBundle(p) && original(calc.productKey(p)) && compsChanged(p); });
      return list.reduce(function (chain, p) {
        return chain.then(function (ok) {
          if (!ok) return false;
          var units = unitsWithPlan(calc.productKey(p));
          if (!units.length) return true;
          return C.dialog({ title: fill(D2.title, { name: calc.productCode(p) + ' ' + p.name }), lines: [fill(D2.line, { n: units.length })], confirmLabel: D2.confirm })
            .then(function (r) { return r.ok; });
        });
      }, Promise.resolve(true));
    }

    // จำนวนชุดในแผน SKU ปีแผน (ทุกหน่วยขายในแผน · คำนวณครั้งเดียวต่อการวาด)
    var planCache = null;
    function planTotals() {
      if (planCache) return planCache;
      var td = store.get(store.planKey('topDown'));
      var plans = {};
      Object.keys(td.units || {}).forEach(function (ch) { (td.units[ch] || []).forEach(function (u) { plans[u] = store.get(store.planKey('sku.' + u)); }); });
      planCache = calc.bundlePlanTotals(store.data(), store.master(), plans, year);
      return planCache;
    }
    function planSets(p) { var t = planTotals()[calc.productKey(p)]; return t ? t.total : 0; }

    function bundleMatches(p, skipKpi) {
      var f = bundleFilters;
      var q = f.q.trim().toLowerCase();
      if (q) {
        var text = [calc.productCode(p), p.name, p.shortName].concat(comps(p).map(function (c) {
          var x = compOf(c);
          return [c.skuId, x ? calc.productCode(x) : '', x ? x.name : '', x ? x.shortName : ''].join(' ');
        })).join(' ').toLowerCase();
        if (text.indexOf(q) < 0) return false;
      }
      var st = statusOf(p);
      if (!f.status && st === 'delete') return false;
      if (f.status && f.status !== 'all' && st !== f.status) return false;
      if (!calc.inSeries(p, f.series)) return false;
      if (f.component && !comps(p).some(function (c) { return c.skuId === f.component; })) return false;
      if (!skipKpi && f.kpi) {
        if (f.kpi === 'active' && st !== 'active') return false;
        if (f.kpi === 'inPlan' && !(planSets(p) > 0)) return false;
        if (f.kpi === 'check' && !badComps(p).length) return false;
      }
      return true;
    }

    function drawBundles() {
      planCache = null;
      var K = BP.kpi;
      var base = bundleList().filter(function (p) { return bundleMatches(p, true); });
      var kpis = [
        { key: '', label: K.all, n: base.filter(function (p) { return statusOf(p) !== 'delete'; }).length, sub: K.allSub },
        { key: 'active', label: K.active, n: base.filter(function (p) { return statusOf(p) === 'active'; }).length },
        { key: 'inPlan', label: K.inPlan, n: base.filter(function (p) { return planSets(p) > 0; }).length, sub: fill(K.inPlanSub, { year: year }) },
        { key: 'check', label: K.check, n: base.filter(function (p) { return badComps(p).length > 0; }).length, sub: K.checkSub, cls: 'is-warn' }
      ];
      root.appendChild(h('div', { class: 'pl-kpis bd-kpis' }, kpis.map(function (k) {
        return h('button', {
          type: 'button', class: 'card pl-kpi bd-kpi-' + (k.key || 'all') + ' ' + (k.cls || '') + (bundleFilters.kpi === k.key ? ' is-selected' : ''), title: K.title,
          'aria-pressed': bundleFilters.kpi === k.key ? 'true' : 'false',
          onClick: function () { bundleFilters.kpi = bundleFilters.kpi === k.key ? '' : k.key; draw(); }
        }, h('span', { class: 'pl-kpi-label' }, k.label), h('strong', { class: 'pl-kpi-value' }, F.number(k.n)), h('span', { class: 'pl-kpi-unit' }, K.unit),
          k.sub ? h('span', { class: 'pl-kpi-sub' }, k.sub) : null);
      })));
      root.appendChild(bundleToolbar());
      chipSlot = h('div', { class: 'pl-chips' });
      root.appendChild(chipSlot);
      if (editing) { var b = C.editBanner(); b.update(dirty()); root.appendChild(b); }
      tableSlot = h('div', { class: 'card fit-card pl-card bd-card' });
      root.appendChild(tableSlot);
      renderTable();
      if (drawerCtl.isOpen()) renderDrawer();
    }

    function bundleToolbar() {
      var Fl = BP.filters;
      var search = h('input', { type: 'search', class: 'search-input pl-search bd-search', placeholder: BP.searchPlaceholder, 'aria-label': BP.searchPlaceholder, value: bundleFilters.q });
      search.addEventListener('input', function () { bundleFilters.q = search.value; renderTable(); });
      var used = {};
      bundleList().forEach(function (p) { comps(p).forEach(function (c) { used[c.skuId] = true; }); });
      var compOptions = Object.keys(used).map(function (k) { return calc.findProduct(cur().products, k); }).filter(Boolean)
        .sort(function (a, b) { return String(calc.productCode(a)) < String(calc.productCode(b)) ? -1 : 1; })
        .map(function (x) { return { value: calc.productKey(x), label: calc.productCode(x) + ' ' + calc.displayName(x) }; });
      function bsel(label, key, options) {
        var el = C.select({ label: label, value: bundleFilters[key], options: options, className: 'pl-filter-' + key + (bundleFilters[key] ? ' is-active' : ''),
          onChange: function (v) { bundleFilters[key] = v; draw(); } });
        el.title = label;
        return el;
      }
      return h('div', { class: 'tool-row pl-toolbar bd-toolbar' },
        search,
        bsel(Fl.status, 'status', [{ value: '', label: Fl.statusAll }, { value: 'all', label: Fl.statusEverything }].concat(calc.PRODUCT_STATUSES.map(function (s) { return { value: s, label: L.status[s] }; }))),
        C.seriesFilter({ options: calc.seriesList(tax(), bundleList()), value: bundleFilters.series, onChange: function (v) { bundleFilters.series = v; draw(); } }),
        bsel(Fl.component, 'component', [{ value: '', label: Fl.componentAll }].concat(compOptions)),
        h('span', { class: 'tool-right' }, bundleChecks(),
          editing && canEdit() ? h('button', { type: 'button', class: 'btn btn-primary btn-sm bd-add', onClick: openCreate }, BP.add) : null));
    }

    // ข้อมูลที่ต้องตรวจ (components.dataCheck): ชิ้นส่วนสถานะผิดปกติ · ชุดส่วนประกอบซ้ำ · ส่วนลดติดลบ · ไม่มี RSP
    function bundleChecks() {
      var X = BP.checks;
      var list = bundleList().filter(function (p) { return statusOf(p) !== 'delete'; });
      function go(key) { return function () { openProduct(key); }; }
      var groups = [
        { key: 'componentStatus', label: X.componentStatus, items: [] },
        { key: 'duplicate', label: X.duplicate, items: [] },
        { key: 'negative', label: X.negative, items: [] },
        { key: 'noRsp', label: X.noRsp, items: [] }
      ];
      list.forEach(function (p) {
        var key = calc.productKey(p);
        var name = calc.productCode(p) + ' ' + calc.displayName(p);
        badComps(p).forEach(function (c) {
          var x = compOf(c);
          groups[0].items.push({ text: fill(X.componentLine, { bundle: name, code: calc.productCode(x), status: L.status[statusOf(x)] }), go: go(key) });
        });
        var d = discountOf(p);
        if (d != null && d < 0) groups[2].items.push({ text: fill(X.negativeLine, { bundle: name, pct: pctText(d) }), go: go(key) });
        if (rsp(p) == null) groups[3].items.push({ text: fill(X.noRspLine, { bundle: name }), go: go(key) });
      });
      calc.duplicateBundleSets(list).forEach(function (g) {
        groups[1].items.push({ text: fill(X.duplicateLine, { codes: g.map(function (k) { return calc.codeOf(cur().products, k); }).join(' · ') }), go: go(g[0]) });
      });
      return C.dataCheck({ groups: groups, criteria: groups.map(function (g) { return g.label; }) });
    }

    function bundleColumns() {
      var X = BP.columns, T = tax();
      return [
        { key: 'code', label: X.code, value: function (p) { return calc.productCode(p); } },
        { key: 'name', label: X.name, value: function (p) { return p.name; } },
        { key: 'status', label: X.status, value: function (p) { return L.status[statusOf(p)]; } },
        { key: 'components', label: X.components, value: compText },
        { key: 'pieces', label: X.pieces, num: true, value: function (p) { return calc.bundleQty(p); } },
        { key: 'partsPrice', label: X.partsPrice, num: true, money: true, value: partsPrice },
        { key: 'rsp', label: X.rsp, num: true, money: true, value: rsp },
        { key: 'discount', label: X.discount, num: true, pct: true, value: discountOf },
        { key: 'series', label: X.series, value: function (p) { return calc.taxonomyName(T, 'series', p.seriesId); } },
        { key: 'planSets', label: fill(X.planSets, { year: year }), num: true, value: planSets }
      ];
    }

    function renderBundleTable() {
      if (!tableSlot) return;
      var cols = bundleColumns();
      var all = bundleList();
      var shown = all.filter(function (p) { return bundleMatches(p); });
      var head = cols.map(function (c) {
        return h('th', { scope: 'col', class: (c.key === 'code' ? 'pl-code ' : c.key === 'name' ? 'pl-name ' : 'bd-col-' + c.key + ' ') + (c.num ? 'num' : '') }, c.label);
      }).concat([h('th', { scope: 'col', class: 'manage' }, BP.columns.manage)]);
      var body = h('tbody');
      if (!shown.length) body.appendChild(h('tr', null, h('td', { class: 'grid-empty', colspan: String(cols.length + 1) }, BP.empty)));
      shown.forEach(function (p) { body.appendChild(bundleRow(p, cols)); });
      C.clear(tableSlot).appendChild(h('div', { class: 'fit-scroll pl-scroll' },
        h('table', { class: 'data-grid pl-table bd-table' }, h('thead', null, h('tr', null, head)), body)));
      bundleChipsBar(shown.length, all.length);
      highlight();
    }

    function compChip(c) {
      var x = compOf(c);
      var st = x ? statusOf(x) : null;
      var code = x ? calc.productCode(x) : c.skuId;
      return h('span', { class: 'bd-chip' + (st && isCheckStatus(st) ? ' is-warn' : ''), title: fill(BP.chipTip, { code: code, name: x ? x.name : '', status: st ? L.status[st] : '–' }) },
        fill(BP.chip, { code: code, qty: c.qty }));
    }

    function bundleRow(p, cols) {
      var key = calc.productKey(p);
      var tds = cols.map(function (c) {
        if (c.key === 'code') return h('td', { class: 'pl-code' }, h('span', { class: 'pl-code-text' }, calc.productCode(p)));
        if (c.key === 'name') return h('td', { class: 'pl-name', title: p.name }, h('span', { class: 'pl-name-row' }, h('span', { class: 'pl-name-text' }, calc.displayName(p))));
        if (c.key === 'status') return h('td', null, C.statusBadge(statusOf(p)));
        if (c.key === 'components') return h('td', { class: 'bd-components' }, h('span', { class: 'bd-chips' }, comps(p).map(compChip)));
        var v = c.value(p);
        if (c.pct) return h('td', { class: 'num' + (v != null && v < 0 ? ' is-negative' : ''), title: v != null && v < 0 ? BP.discountTip : null }, pctText(v));
        if (c.money) return h('td', { class: 'num' }, v == null ? '–' : F.baht(v, 2));
        if (c.num) return h('td', { class: 'num' }, v == null ? '–' : F.number(v));
        return h('td', { class: 'ellipsis', title: v || '' }, v || '–');
      });
      var manage = h('td', { class: 'manage' }, h('span', { class: 'manage-group' },
        editing && canEdit() ? C.trashButton({
          label: page.removeTitle, disabled: referenced(p), disabledTitle: page.removeBlocked, confirmTitle: fill(page.removeConfirm, { code: key }),
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
        onClick: function (e) { if (e.target.closest && e.target.closest('.trash-btn')) return; openProduct(key); }
      }, tds, manage);
    }

    function bundleChipsBar(shown, total) {
      if (!chipSlot) return;
      var Fl = BP.filters, f = bundleFilters, T = tax();
      var items = [];
      function add(label, value, clear) { items.push({ label: fill(Fl.chip, { label: label, value: value }), onRemove: function () { clear(); draw(); } }); }
      if (f.kpi) items.push({ label: fill(Fl.kpiChip, { value: BP.kpi[f.kpi] }), onRemove: function () { bundleFilters.kpi = ''; draw(); } });
      if (f.q.trim()) items.push({ label: fill(Fl.searchChip, { value: f.q.trim() }), onRemove: function () { bundleFilters.q = ''; draw(); } });
      if (f.status) add(Fl.status, f.status === 'all' ? Fl.statusEverything : L.status[f.status], function () { bundleFilters.status = ''; });
      f.series.forEach(function (s) {
        add(L.series.label, calc.taxonomyName(T, 'series', s) || L.series.none, function () { bundleFilters.series = bundleFilters.series.filter(function (x) { return x !== s; }); });
      });
      if (f.component) add(Fl.component, calc.codeOf(cur().products, f.component), function () { bundleFilters.component = ''; });
      C.clear(chipSlot);
      chipSlot.appendChild(h('span', { class: 'pl-summary' },
        h('span', { class: 'pl-count' }, fill(BP.resultCount, { n: F.number(shown), total: F.number(total) })),
        ' · ' + fill(page.statusAsOf, { month: F.date(month) })));
      var chips = C.filterChips(items, function () { bundleFilters = emptyBundleFilters(); draw(); });
      if (chips) chipSlot.appendChild(chips);
    }

    function bundleExportSpec(source) {
      var list = (source === 'draft' && editing ? draft : saved).products.filter(function (p) { return calc.isBundle(p) && bundleMatches(p); });
      var st = C.exportStamp(null);
      return {
        filename: fill(BP.exportFile, { date: st.date }),
        sheets: [{
          name: BP.exportSheet,
          header: C.exportHeader(year, null, [[page.statusAsOf.replace(' {month}', ''), F.date(month)]]),
          columns: bundleColumns().map(function (c) {
            return { key: c.key, label: c.label, width: c.key === 'name' || c.key === 'components' ? 36 : 14,
              value: c.pct ? function (p) { var v = c.value(p); return v == null ? '' : Math.round(v * 10000) / 100; } : c.value };
          }),
          rows: list
        }]
      };
    }

    // ส่วนประกอบใน Drawer (ดู / แก้ไข) · opts = { onChange (Drawer สร้าง Bundle), rsp (RSP ที่ยังไม่บันทึก), issues }
    function componentsSection(p, opts) {
      opts = opts || {};
      var BD = BP.drawer, X = BD.columns;
      var edit = editing || !!opts.onChange;
      var changed = opts.onChange || function () { syncBundle(p); refresh(); };
      var list = comps(p);
      var rows = list.map(function (c, i) {
        var x = compOf(c);
        var st = x ? statusOf(x) : null;
        var price = x ? rsp(x) : null;
        var code = x ? calc.productCode(x) : c.skuId;
        function setQty(q) { p.components = list.map(function (y, j) { return { skuId: y.skuId, qty: j === i ? q : y.qty }; }); changed(); }
        var qtyCell = F.number(c.qty);
        if (edit) {
          var qIn = h('input', { type: 'number', class: 'pm-input bd-qty-input', min: '1', step: '1', value: String(c.qty), 'aria-label': fill(BD.qtyLabel, { code: code }) });
          qIn.addEventListener('change', function () { setQty(Number(qIn.value)); });
          qtyCell = h('span', { class: 'bd-qty' },
            h('button', { type: 'button', class: 'btn btn-secondary btn-sm bd-minus', title: BD.minus, 'aria-label': BD.minus, disabled: c.qty <= 1, onClick: function () { setQty(c.qty - 1); } }, '−'),
            qIn,
            h('button', { type: 'button', class: 'btn btn-secondary btn-sm bd-plus', title: BD.plus, 'aria-label': BD.plus, onClick: function () { setQty(c.qty + 1); } }, '+'));
        }
        return h('tr', { class: st && isCheckStatus(st) ? 'is-warn' : null },
          h('td', { class: 'pl-code' }, code),
          h('td', { class: 'ellipsis', title: x ? x.name : '' }, x ? calc.displayName(x) : '–'),
          h('td', null, st ? C.statusBadge(st) : '–'),
          h('td', { class: 'num' }, qtyCell),
          h('td', { class: 'num' }, price == null ? '–' : F.baht(price, 2)),
          h('td', { class: 'num' }, price == null ? '–' : F.baht(price * c.qty, 2)),
          edit ? h('td', { class: 'manage' }, h('button', { type: 'button', class: 'btn btn-ghost btn-sm bd-remove', title: fill(BD.removeTitle, { code: code }),
            onClick: function () { p.components = list.filter(function (y, j) { return j !== i; }); changed(); } }, BD.remove)) : null);
      });
      var head = h('tr', null, ['sku', 'name', 'status', 'qty', 'price', 'total'].map(function (k) {
        return h('th', { scope: 'col', class: k === 'qty' || k === 'price' || k === 'total' ? 'num' : null }, X[k]);
      }), edit ? h('th', { scope: 'col', class: 'manage' }) : null);
      var parts = partsPrice(p);
      var own = opts.rsp !== undefined ? opts.rsp : rsp(p);
      var disc = parts && own != null ? 1 - own / parts : null;
      var issues = edit ? (opts.issues || issuesOf(p)) : [];
      return h('section', { class: 'pd-section bd-components-section' }, h('h3', null, BD.components),
        list.length ? h('table', { class: 'data-grid bd-comp-table' }, h('thead', null, head), h('tbody', null, rows)) : h('p', { class: 'muted' }, BD.empty),
        edit ? addComponentRow(p, list, changed) : null,
        h('p', { class: 'bd-total' + (disc != null && disc < 0 ? ' is-negative' : '') }, fill(BD.total, {
          n: F.number(calc.bundleQty(p)), parts: parts == null ? '–' : F.baht(parts, 2), rsp: own == null ? '–' : F.baht(own, 2), pct: pctText(disc)
        })),
        issues.length ? h('ul', { class: 'bd-issues', role: 'alert' }, issues.map(function (x) { return h('li', null, issueText(p, x)); })) : null);
    }

    // เพิ่มชิ้นส่วน: ค้นหา SKU เดี่ยว (ไม่ใช่ Bundle · ไม่ใช่ Request / Delete) · SKU ที่มีอยู่แล้วรวมจำนวน
    var pickSeq = 0;
    function addComponentRow(p, list, changed) {
      var BD = BP.drawer;
      var id = 'bd-pick-' + (++pickSeq);
      var options = cur().products.filter(function (x) { return !calc.isBundle(x) && (BS.blockedStatuses || []).indexOf(statusOf(x)) < 0; })
        .sort(function (a, b) { return String(calc.productCode(a)) < String(calc.productCode(b)) ? -1 : 1; });
      var input = h('input', { type: 'search', class: 'pm-input bd-pick', list: id, placeholder: BD.pick, 'aria-label': BD.pick });
      var dl = h('datalist', { id: id }, options.map(function (x) { return h('option', { value: fill(BD.pickOption, { code: calc.productCode(x), name: calc.displayName(x) }) }); }));
      var msg = h('span', { class: 'pm-msg', role: 'status' });
      function add() {
        var code = input.value.split(' · ')[0].trim();
        var x = options.filter(function (o) { return String(calc.productCode(o)) === code || calc.productKey(o) === code; })[0];
        if (!x) { msg.className = 'pm-msg is-error'; msg.textContent = BD.pickInvalid; return; }
        p.components = calc.mergeComponents(list.concat([{ skuId: calc.productKey(x), qty: 1 }]));
        changed();
      }
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } });
      return h('div', { class: 'tool-row bd-add-row' }, input, dl, h('button', { type: 'button', class: 'btn btn-secondary btn-sm bd-add-comp', onClick: add }, BD.add), msg);
    }

    // ส่วนของ Drawer สินค้าแบบ Bundle ต่อจากรหัส / ชื่อ / รูป: ส่วนประกอบ · หมวดสินค้า (ระบบกำหนด) · Series (ระบบกำหนดจากชิ้นส่วน หรือทีม Product แก้เอง) · หมายเหตุ
    function bundleSections(body, p) {
      var T = tax(), G = page.general, BD = BP.drawer;
      var tx = calc.productTaxonomy(T, p);
      body.appendChild(componentsSection(p));
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.category, ' ', h('span', { class: 'badge tag-muted pd-inferred', title: BD.categoryNote }, L.product.inferredTag)),
        field(PF.categoryId, dval(tx.category)), field(PF.subCategoryId, dval(tx.subCategory)), field(PF.typeId, dval(tx.type))));
      var serTag = h('span', { class: 'badge tag-muted bd-series-tag' }, p.seriesManual ? BD.seriesManual : BD.seriesAuto);
      if (!editing) {
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.series, ' ', serTag), field(PF.seriesId, dval(tx.series))));
        if (p.note) body.appendChild(h('section', { class: 'pd-section' }, field(G.note, p.note)));
        return;
      }
      body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, G.series, ' ', serTag),
        C.cascadeSelect({ tax: T, kind: 'series', value: p, labels: [PF.seriesId, PF.subSeriesId], placeholder: G.placeholder,
          dirty: function (f) { return isDirty(p, f); },
          onChange: function (v) { Object.keys(v).forEach(function (k) { p[k] = v[k]; }); p.seriesManual = true; refresh(); } }),
        p.seriesManual ? h('button', { type: 'button', class: 'link-btn bd-series-auto', onClick: function () { p.seriesManual = false; syncBundle(p); refresh(); } }, BD.seriesUseAuto) : null));
      body.appendChild(h('section', { class: 'pd-section' }, field(G.note, textInput(p, 'note', G.note))));
    }

    // SKU เดี่ยวที่เป็นชิ้นส่วนของ Bundle: อยู่ใน Bundle: 90100 (×2) · 90200 (×1) → หน้า Bundle (ui.bundleFocus = เปิด Drawer ของ Bundle นั้น)
    function inBundlesField(p) {
      if (calc.isBundle(p) || !calc.bundleOn()) return null;
      var list = calc.bundlesContaining(cur().products, calc.productKey(p));
      if (!list.length) return null;
      var G = page.general;
      var entry = SP.core.registry.byId('bundle');
      return h('section', { class: 'pd-section pd-in-bundles' }, field(G.inBundles, list.map(function (x, i) {
        var code = calc.productCode(x.product);
        var label = fill(G.inBundleItem, { code: code, qty: x.qty });
        return [i ? ' · ' : '', bundleMode
          ? h('button', { type: 'button', class: 'link-btn', title: fill(G.inBundleTip, { code: code }), onClick: function () { openProduct(x.key); } }, label)
          : h('a', { href: SP.core.paths.to(entry.path) + '#list', title: fill(G.inBundleTip, { code: code }), onClick: function () { store.set('ui.bundleFocus', x.key); } }, label)];
      })));
    }

    // Drawer สร้าง Bundle (โหมดแก้ไขของหน้า Bundle) · Product Code จากตัวสร้างรหัสเดิม (Type Bundle เลขนำหน้า 90) · Status เริ่มต้น Planned (ยังไม่มีเดือนเปิดตัว)
    var createDraft = null, createRsp = null;
    function renderCreateBundle() {
      var T = tax(), Cr = BP.create, G = page.general;
      var r = CAT.nextCode(draft.products, T, BS.typeId, draft.codeCounters);
      var np = createDraft || (createDraft = {
        trCode: '', barcode: '', name: '', nameEn: '', shortName: '', inferred: false, categoryId: BS.categoryId, subCategoryId: BS.subCategoryId, typeId: BS.typeId,
        seriesId: null, subSeriesId: null, packSize: null, uom: '', image: null, launchDate: null, discontinueMonth: null, clearance: null, note: '', inTrcloud: false,
        kind: 'bundle', components: [], seriesManual: false
      });
      np.trCode = r.ok ? r.code : '';
      drawerCtl.head.appendChild(h('div', { class: 'pd-head' }, h('div', { class: 'pd-title' }, h('h2', null, Cr.title))));
      var name = h('input', { type: 'text', class: 'pm-input pd-input bd-new-name', 'aria-label': Cr.name, placeholder: Cr.name, value: np.name });
      name.addEventListener('input', function () { np.name = name.value; });
      var short = h('input', { type: 'text', class: 'pm-input pd-input bd-new-short', 'aria-label': Cr.shortName, placeholder: Cr.shortName, value: np.shortName });
      short.addEventListener('input', function () { np.shortName = short.value; });
      var rspIn = h('input', { type: 'number', class: 'pm-input pm-stock bd-new-rsp', min: '0', step: '0.01', 'aria-label': Cr.rsp, placeholder: Cr.rsp, value: createRsp == null ? '' : String(createRsp) });
      rspIn.addEventListener('change', function () { createRsp = rspIn.value === '' ? null : Number(rspIn.value); renderDrawer(); });
      var preview = h('p', { class: 'pd-code-preview' + (r.ok ? ' is-ok' : ' is-error') }, r.ok ? fill(Cr.codePreview, { code: r.code }) : page.create.codeErrors[r.error]);
      var msg = h('p', { class: 'pm-msg', role: 'status' });
      function rerender() {
        np.components = calc.mergeComponents(np.components);
        if (!np.seriesManual) np.seriesId = calc.bundleSeries(np, draft.products);
        renderDrawer();
      }
      var issues = np.components.length ? calc.bundleIssues(np, draft.products, month, true) : [];
      drawerCtl.body.appendChild(h('div', { class: 'pd-body' },
        h('section', { class: 'pd-section' }, h('h3', null, G.names), field(Cr.name, name), field(Cr.shortName, short), preview, h('p', { class: 'muted small' }, Cr.statusNote)),
        componentsSection(np, { onChange: rerender, rsp: createRsp, issues: issues }),
        h('section', { class: 'pd-section' }, field(Cr.rsp, rspIn)),
        msg,
        h('div', { class: 'dlg-actions' },
          h('button', { type: 'button', class: 'btn btn-ghost', onClick: function () { drawerCtl.close(); } }, L.dialog.cancel),
          h('button', { type: 'button', class: 'btn btn-primary bd-create', onClick: function () {
            if (!String(np.name).trim()) { msg.className = 'pm-msg is-error'; msg.textContent = Cr.nameRequired; return; }
            var iss = calc.bundleIssues(np, draft.products, month, true);
            if (iss.length) { msg.className = 'pm-msg is-error'; msg.textContent = issueText(np, iss[0]); return; }
            if (!r.ok) { msg.className = 'pm-msg is-error'; msg.textContent = page.create.codeErrors[r.error]; return; }
            var at = SP.core.clock.now();
            var p = clone(np);
            p.trCode = r.code;
            p.name = String(np.name).trim();
            p.shortName = String(np.shortName || '').trim() || p.name;
            p.createdAt = at;
            p.updatedAt = at;
            syncBundle(p);
            draft.products.push(p);
            draft.codeCounters = CAT.takeCode(draft.codeCounters, r.code);
            if (createRsp > 0) {
              var res = calc.setBasePrice(draft.basePrices, { productKey: r.code, priceType: 'RSP', effectiveMonth: month, price: createRsp, by: byName(), at: at });
              if (res.ok) draft.basePrices = res.list;
            }
            creating = false;
            createDraft = null;
            createRsp = null;
            selected = r.code;
            tab = 'general';
            bundleFilters.q = '';
            draw();
          } }, Cr.submit))));
    }

    // CR-37: ลิงก์ อยู่ใน Bundle จาก Product List (ui.bundleFocus อ่านครั้งเดียว) → เปิด Drawer ของ Bundle นั้น
    var focusKey = bundleMode ? store.get('ui.bundleFocus') : null;
    if (focusKey) store.remove('ui.bundleFocus');
    draw();
    if (focusKey && calc.findProduct(cur().products, focusKey)) openProduct(focusKey);
  }

  // ---------- CR-37 หน้า Bundle แท็บ ความต้องการชิ้นส่วน (อ่านอย่างเดียว · calc.componentDemand · หน่วย ชิ้น · ไม่ใช่ยอดขาย) ----------
  //   ตัวกรอง: ปีแผน (components.yearPicker · app.planYear ใช้ร่วมทุกหน้า) · Channel · หน่วยขาย · Series ของ SKU เดี่ยว
  //   ตาราง: แถวละ SKU เดี่ยวที่เป็นชิ้นส่วนของ Bundle อย่างน้อย 1 รายการ · 3 บรรทัด ขายเดี่ยว · ผ่าน Bundle (กางดูราย Bundle) · รวม (ตัวหนา) × ม.ค.–ธ.ค. + รวมปี
  var demandState = { channel: '', unit: '', series: [], open: {} };
  function renderDemand(root, ctx) {
    var BP = SP.data.content.pages.bundle;
    var X = BP.demand;
    var S = demandState;
    function year() { return store.year(); }
    function plans() {
      var td = store.get(store.planKey('topDown'));
      var out = {};
      Object.keys(td.units || {}).forEach(function (ch) { (td.units[ch] || []).forEach(function (u) { out[u] = store.get(store.planKey('sku.' + u)); }); });
      return out;
    }
    var exportBtn = C.exportButton({ build: exportSpec });
    // ปุ่มส่งออกชิดขวาเหมือนแท็บรายการ (ตำแหน่งเดียวกับ workflowBar)
    if (ctx.intro) ctx.intro.appendChild(h('span', { class: 'wf-bar' }, h('span', { class: 'wf-actions no-print' }, exportBtn)));
    var tableSlot = null;

    function compute() {
      var p = plans();
      var d = store.data();
      var unitIds = Object.keys(p).filter(function (u) {
        if (S.unit) return u === S.unit;
        if (!S.channel) return true;
        var i = calc.unitInfo(d, u);
        return !!(i && i.channel && i.channel.id === S.channel);
      });
      return { units: Object.keys(p), rows: calc.componentDemand({ data: d, master: store.master(), plans: p, year: year(), unitIds: unitIds }).filter(function (r) { return calc.inSeries(r.product, S.series); }) };
    }

    function draw() {
      C.clear(root);
      var res = compute();
      var d = store.data();
      if (S.unit && res.units.indexOf(S.unit) < 0) S.unit = '';
      var unitOpts = res.units.filter(function (u) {
        if (!S.channel) return true;
        var i = calc.unitInfo(d, u);
        return !!(i && i.channel && i.channel.id === S.channel);
      }).map(function (u) { var i = calc.unitInfo(d, u); return { value: u, label: i ? i.unit.name : u }; });
      var allComps = calc.componentDemand({ data: d, master: store.master(), plans: {}, year: year() }).map(function (r) { return r.product; });
      root.appendChild(h('div', { class: 'tool-row pl-toolbar bd-demand-toolbar' },
        C.yearPicker({ years: SP.data.settings.PLAN_YEARS, value: year(), label: X.year, onChange: function (y) { store.set('app.planYear', y); draw(); } }),
        C.select({ label: X.channel, value: S.channel, className: 'bd-dm-channel' + (S.channel ? ' is-active' : ''),
          options: [{ value: '', label: X.channelAll }].concat(SP.data.channels.filter(function (c) { return c.active !== false; }).map(function (c) { return { value: c.id, label: c.name }; })),
          onChange: function (v) { S.channel = v; S.unit = ''; draw(); } }),
        C.select({ label: X.unit, value: S.unit, className: 'bd-dm-unit' + (S.unit ? ' is-active' : ''), options: [{ value: '', label: X.unitAll }].concat(unitOpts),
          onChange: function (v) { S.unit = v; draw(); } }),
        C.seriesFilter({ options: calc.seriesList(store.get('master.taxonomy'), allComps), value: S.series, onChange: function (v) { S.series = v; draw(); } }),
        h('span', { class: 'tool-right muted small bd-dm-unit-label' }, X.unitLabel)));
      tableSlot = h('div', { class: 'card fit-card pl-card bd-demand-card' });
      root.appendChild(tableSlot);
      renderTable(res.rows);
      root.appendChild(h('p', { class: 'muted small bd-dm-note' }, X.note));
    }

    function nums(arr, cls) {
      return arr.map(function (v) { return h('td', { class: 'num' + (cls ? ' ' + cls : '') }, v ? F.number(v) : '–'); });
    }
    function renderTable(rows) {
      var head = h('tr', null, h('th', { scope: 'col', class: 'pl-code' }, X.columns.sku), h('th', { scope: 'col', class: 'bd-dm-line' }, X.columns.line),
        F.MONTHS.map(function (m) { return h('th', { scope: 'col', class: 'num' }, m); }), h('th', { scope: 'col', class: 'num' }, X.columns.total));
      var body = h('tbody');
      if (!rows.length) body.appendChild(h('tr', null, h('td', { class: 'grid-empty', colspan: '15' }, X.empty)));
      rows.forEach(function (r) {
        var open = !!S.open[r.key] && r.bundles.length > 0;
        var span = 3 + (open ? r.bundles.length : 0);
        var sku = h('th', { scope: 'rowgroup', class: 'pl-code bd-dm-sku', rowspan: String(span) },
          h('strong', null, calc.productCode(r.product)), h('span', { class: 'bd-dm-name', title: r.product.name }, calc.displayName(r.product)), C.statusBadge(calc.productStatus(r.product, SP.core.clock.currentMonth())));
        body.appendChild(h('tr', { class: 'bd-dm-direct', dataset: { key: r.key } }, sku, h('td', { class: 'bd-dm-line' }, X.lines.direct), nums(r.direct), h('td', { class: 'num' }, F.number(r.sum.direct))));
        var toggle = r.bundles.length ? h('button', { type: 'button', class: 'link-btn bd-dm-toggle', 'aria-expanded': open ? 'true' : 'false',
          title: open ? X.collapse : X.expand, onClick: function () { S.open[r.key] = !open; renderTable(rows); } }, h('span', { 'aria-hidden': 'true' }, open ? '▾ ' : '▸ '), X.lines.viaBundle) : X.lines.viaBundle;
        body.appendChild(h('tr', { class: 'bd-dm-via' }, h('td', { class: 'bd-dm-line' }, toggle), nums(r.viaBundle), h('td', { class: 'num' }, F.number(r.sum.viaBundle))));
        if (open) r.bundles.forEach(function (b) {
          body.appendChild(h('tr', { class: 'bd-dm-bundle' }, h('td', { class: 'bd-dm-line bd-dm-sub', title: b.product.name },
            fill(X.bundleLine, { code: calc.productCode(b.product), name: calc.displayName(b.product), qty: b.qty })), nums(b.units, 'muted'), h('td', { class: 'num muted' }, F.number(calc.sum(b.units)))));
        });
        body.appendChild(h('tr', { class: 'bd-dm-total' }, h('td', { class: 'bd-dm-line' }, X.lines.total), nums(r.total, 'is-strong'), h('td', { class: 'num is-strong' }, F.number(r.sum.total))));
      });
      C.clear(tableSlot).appendChild(h('div', { class: 'fit-scroll pl-scroll' }, h('table', { class: 'data-grid bd-demand-table' }, h('thead', null, head), body)));
    }

    function exportSpec() {
      var rows = compute().rows;
      var out = [];
      rows.forEach(function (r) {
        [['direct', r.direct], ['viaBundle', r.viaBundle], ['total', r.total]].forEach(function (x) {
          var o = { code: calc.productCode(r.product), name: r.product.name, line: X.lines[x[0]], total: calc.sum(x[1]) };
          x[1].forEach(function (v, m) { o['m' + m] = v; });
          out.push(o);
          if (x[0] === 'viaBundle') r.bundles.forEach(function (b) {
            var ob = { code: calc.productCode(r.product), name: r.product.name, line: fill(X.bundleLine, { code: calc.productCode(b.product), name: calc.displayName(b.product), qty: b.qty }), total: calc.sum(b.units) };
            b.units.forEach(function (v, m) { ob['m' + m] = v; });
            out.push(ob);
          });
        });
      });
      var st = C.exportStamp(null);
      var cols = [{ key: 'code', label: X.columns.sku, width: 12 }, { key: 'name', label: BP.columns.name, width: 36 }, { key: 'line', label: X.columns.line, width: 28 }]
        .concat(F.MONTHS.map(function (m, i) { return { key: 'm' + i, label: m, width: 9 }; })).concat([{ key: 'total', label: X.columns.total, width: 11 }]);
      return {
        filename: fill(X.exportFile, { year: year(), date: st.date }),
        sheets: [{ name: X.exportSheet, header: C.exportHeader(year(), null, [[X.unitLabel, '']]), columns: cols.map(function (c) { return { key: c.key, label: c.label, width: c.width, value: function (o) { return o[c.key]; } }; }), rows: out }]
      };
    }

    draw();
  }

  // ---------- CR-37 หน้า Bundle (registry id bundle · modules/bundle/index.html โหลดไฟล์นี้) · แท็บ รายการ Bundle | ความต้องการชิ้นส่วน ----------
  //   รายการ Bundle = renderItems โหมด bundle (Drawer / โหมดแก้ไขเดียวกับ Product List · สิทธิ์ของหน้า bundle) · #list / #demand · ui.bundleTab
  var BUNDLE_TABS = ['list', 'demand'];
  function renderBundlePage(root, ctx) {
    var page = ctx.page;
    var PG = SP.data.content.pages;
    var hash = (location.hash || '').replace('#', '');
    var tab = BUNDLE_TABS.indexOf(hash) >= 0 ? hash : (BUNDLE_TABS.indexOf(store.get('ui.bundleTab')) >= 0 ? store.get('ui.bundleTab') : 'list');
    var introSlot = h('span', { class: 'pl-intro' });
    if (ctx.intro) ctx.intro.appendChild(introSlot);
    var tabSlot = h('div', { class: 'tool-row pl-page-tabs no-print' });
    var body = h('div', { class: 'pl-body' });
    root.appendChild(tabSlot);
    root.appendChild(body);
    function subCtx() {
      return { entry: ctx.entry, page: PG.productList, content: ctx.content, year: ctx.year, intro: introSlot, refreshMenu: ctx.refreshMenu, addHelp: ctx.addHelp, mode: 'bundle', openLevel: null };
    }
    function drawTabs() {
      C.clear(tabSlot);
      tabSlot.appendChild(C.tabs({ label: page.pageTabLabel, value: tab, className: 'pl-page-seg bd-page-seg',   // CR-40 แท็บขีดเส้นใต้
        options: BUNDLE_TABS.map(function (t) { return { value: t, label: page.pageTabs[t] }; }), onChange: function (v) { show(v); } }));
    }
    function show(t) {
      if (t === tab) return;
      if (!C.confirmDiscard(C.unsavedCount())) { drawTabs(); return; }
      tab = t;
      store.set('ui.bundleTab', t);
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search + '#' + t);
      paint();
    }
    function paint() {
      C.clear(body);
      C.clear(introSlot);
      Array.prototype.forEach.call(document.querySelectorAll('aside.drawer, .drawer-backdrop, .popover'), function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
      C.guardUnsaved(function () { return 0; });
      drawTabs();
      document.title = page.title + ' · ' + page.pageTabs[tab] + ' · ' + SP.data.content.site.name;
      if (tab === 'demand') renderDemand(body, subCtx()); else renderItems(body, subCtx());
    }
    paint();
  }


  // ---------- แท็บ Product Level (โค้ดเดิมของหน้า Category & Series · ctx.openProducts = กดจำนวนสินค้าแล้วเปิดแท็บสินค้าที่กรองแล้ว) ----------
  var renderLevel = (function () {

    var C = SP.core.components;
    var calc = SP.core.calc;
    var CAT = SP.core.catalog;
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
        out.subCategory = []; out.subSeries = [];   // CR-30: ตัดตัวกรอง Sub Category / Sub Series (ซ้ำกับคอลัมน์)
        if (['all', 'noSku', 'dupParent', 'expired', 'noPrefix'].indexOf(out.data) < 0) out.data = 'all';
        return out;
      }
      function persistSel() { store.set('ui.taxonomySelection', sel); }
      function persistFilters() { store.set('ui.taxonomyFilters', filters); }
      function cur() { return editing ? draft : saved; }
      function tabKind() { return sel.tab === 'series' ? 'series' : 'category'; }
      function levelName(level) { return X.levels[level]; }
      // CR-30: แท็บหมวดสินค้าใช้ตัวกรอง Series · แท็บ Series ใช้ตัวกรองหมวดสินค้า · ตารางไขว้ใช้ทั้งสอง
      function useCat() { return sel.tab !== 'category'; }
      function useSer() { return sel.tab !== 'series'; }
      function filterArgs() { return { category: useCat() ? filters.category : [], subCategory: [], series: useSer() ? filters.series : [], subSeries: [], status: filters.status, data: filters.data, showZero: filters.showZero }; }
      function anyFilter() {
        return (useCat() && filters.category.length) || (useSer() && filters.series.length) || filters.status !== 'active' || filters.data !== 'all';
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
        simple: true, modules: ['taxonomy'],   // CR-36: สิทธิ์ส่วนของหน้า Product Level (key เดิม taxonomy)
        editing: function () { return editing; },
        onEdit: function () { editing = true; draft = clone(saved); ui.rename = ui.adding = ui.error = null; draw(); },
        onSave: save,
        onCancel: function () { editing = false; draft = null; ui.rename = ui.adding = ui.error = null; draw(); }
      });
      if (ctx.intro) ctx.intro.appendChild(bar);

      function save() {
        var by = C.roleName(store.role()), at = SP.core.clock.now();
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
        if (ctx.openProducts) { ctx.openProducts(); return; }   // CR-36: แท็บสินค้าในหน้าเดียวกัน
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
        var catF = useCat() ? C.categoryFilter({
          tax: tax, kind: 'category', levels: ['CATEGORY'], labels: { CATEGORY: page.dims.category }, value: { CATEGORY: filters.category },
          onChange: function (v) { filters.category = v.CATEGORY || []; persistFilters(); draw(); }
        }) : null;
        var serF = useSer() ? C.categoryFilter({
          tax: tax, kind: 'series', levels: ['SERIES'], value: { SERIES: filters.series },
          onChange: function (v) { filters.series = v.SERIES || []; persistFilters(); draw(); }
        }) : null;
        function sel2(label, key, keys, texts) {
          return h('label', { class: 'tx-sel' }, h('span', { class: 'field-label' }, label), C.select({
            label: label, value: filters[key], className: 'tx-select',
            options: keys.map(function (k) { return { value: k, label: texts[k] }; }),
            onChange: function (v) { filters[key] = v; persistFilters(); draw(); }
          }));
        }
        var kind = tabKind();
        var crossActive = sel.tab !== 'cross' && (kind === 'category' ? filters.series.length : filters.category.length);
        return h('div', { class: 'tool-row tx-filters' },
          searchBox(tax),
          catF, serF,
          sel2(page.status.label, 'status', ['active', 'inactive', 'all'], page.status),
          sel2(page.data.label, 'data', ['all', 'noSku', 'dupParent', 'expired', 'noPrefix'], page.data),
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
        if (useCat()) add('category', 'category', 'CATEGORY');
        if (useSer()) add('series', 'series', 'SERIES');
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
        if (n.level === 'TYPE' && !CAT.typePrefix(tax, n.id)) out.push(page.warn.noPrefix);
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
          h('p', { class: 'tx-detail-path' }, path.length > 1 ? fill(D2.pathIn, { level: levelName(n.level), path: path.slice(0, -1).map(function (a) { return a.name; }).join(' › ') }) : levelName(n.level)),
          warns.length ? h('ul', { class: 'tx-detail-warn' }, warns.map(function (w) { return h('li', null, '⚠ ', w); })) : null));
        if (n.level === 'TYPE') panel.appendChild(prefixBlock(n, tax, products));

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

      function prefixBlock(n, tax, products) {
        var D2 = page.detail;
        var pre = CAT.typePrefix(tax, n.id);
        var next = CAT.nextCode(products, tax, n.id, store.get('master.codeCounters'));
        var nextText = next.ok ? fill(D2.nextCode, { code: next.code }) : D2.nextCodeErrors[next.error] || '';
        var body;
        if (editing) {
          var err = h('span', { class: 'tx-prefix-error', role: 'alert' });
          var input = h('input', { type: 'text', class: 'tx-prefix-input', inputmode: 'numeric', maxlength: '2', value: pre || '', 'aria-label': D2.prefix, placeholder: D2.prefixPlaceholder });
          input.addEventListener('change', function () {
            var v = input.value.trim();
            var e = CAT.prefixError(draft.tax, n.id, v);
            if (e) { err.textContent = D2.prefixErrors[e]; input.classList.add('is-invalid'); return; }
            var node = T.find(draft.tax, 'category', n.id);
            if (v) node.codePrefix = v; else delete node.codePrefix;
            draw();
          });
          body = h('span', { class: 'tx-prefix-edit' }, input, err);
        } else {
          body = h('span', { class: 'tx-prefix-value' + (pre ? '' : ' muted') }, pre || D2.noPrefix);
        }
        return h('div', { class: 'tx-detail-row tx-detail-prefix' }, h('span', { class: 'field-label', title: D2.prefixTip }, D2.prefix), body,
          h('span', { class: 'tx-detail-sub tx-next-code' }, nextText));
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

    return render;
  })();

  // ---------- หน้า Product List: แท็บ สินค้า | Product Level ----------
  var TABS = ['items', 'level'];
  function render(root, ctx) {
    var Perm = SP.core.permissions;
    var page = ctx.page;
    var PG = SP.data.content.pages;
    var canLevel = Perm.level(Perm.user(), 'taxonomy') !== 'NONE';
    var tabs = canLevel ? TABS : ['items'];
    var hash = (location.hash || '').replace('#', '');
    var tab = tabs.indexOf(hash) >= 0 ? hash : (tabs.indexOf(store.get('ui.productListTab')) >= 0 ? store.get('ui.productListTab') : 'items');
    var introSlot = h('span', { class: 'pl-intro' });   // ปุ่มแก้ไข · ส่งออกของแท็บ (workflowBar ของแต่ละแท็บ)
    if (ctx.intro) ctx.intro.appendChild(introSlot);
    var tabSlot = h('div', { class: 'tool-row pl-page-tabs no-print' });
    var body = h('div', { class: 'pl-body' });
    root.appendChild(tabSlot);
    root.appendChild(body);
    var helpAdded = {};
    function subCtx(t) {
      return {
        entry: ctx.entry, page: t === 'level' ? PG.taxonomy : page, content: ctx.content, year: ctx.year, intro: introSlot, refreshMenu: ctx.refreshMenu,
        addHelp: function (label, build) { if (helpAdded[label] || !ctx.addHelp) return; helpAdded[label] = true; ctx.addHelp(label, build); },
        // ป้าย ระบบกำหนด ใน Drawer → แท็บ Product Level ที่เลือก Type ของสินค้านั้น
        openLevel: canLevel ? function (p) {
          var tx = store.get('master.taxonomy');
          var id = p.typeId || p.subCategoryId || p.categoryId;
          var s = store.get('ui.taxonomySelection') || {};
          store.set('ui.taxonomySelection', { tab: 'category', category: SP.core.taxonomy.pathOf(tx, 'category', id).map(function (n) { return n.id; }), series: (s.series || []).slice() });
          show('level', true);
        } : null,
        openProducts: function () { show('items', true); }
      };
    }
    function clearTab() {
      C.clear(body);
      C.clear(introSlot);
      // Drawer / Popover ของแท็บเดิม (ต่อท้าย body ของเอกสาร) นำออกก่อนวาดแท็บใหม่
      Array.prototype.forEach.call(document.querySelectorAll('aside.drawer, .drawer-backdrop, .popover'), function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
    }
    function drawTabs() {
      C.clear(tabSlot);
      if (tabs.length < 2) return;
      tabSlot.appendChild(C.tabs({ label: page.pageTabLabel, value: tab, className: 'pl-page-seg',   // CR-40 แท็บขีดเส้นใต้
        options: tabs.map(function (t) { return { value: t, label: page.pageTabs[t] }; }), onChange: function (v) { show(v); } }));
    }
    function show(t, force) {
      if (t === tab && !force) return;
      if (!C.confirmDiscard(C.unsavedCount())) { drawTabs(); return; }
      tab = t;
      store.set('ui.productListTab', t);
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search + '#' + t);
      paint();
    }
    function paint() {
      clearTab();
      drawTabs();
      document.title = page.title + (tab === 'level' ? ' · ' + page.pageTabs.level : '') + ' · ' + SP.data.content.site.name;
      (tab === 'level' ? renderLevel : renderItems)(body, subCtx(tab));
    }
    paint();
  }

  SP.modules.productList = { render: render };
  SP.modules.bundle = { render: renderBundlePage };   // CR-37
})(window.SP);
