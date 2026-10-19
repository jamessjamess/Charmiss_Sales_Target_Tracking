/*
 * modules/launch-listing/launch-listing.js — Product Master · Launch & Listing (CR-35 รวมหน้าแผน NPD + หน้า Listing เดิม)
 *
 * หน้าที่:        แท็บ NPD | Listing (ui.launchTab · #npd / #listing) · ปุ่ม ? · ส่งออก ▾ และปุ่มแก้ไขตามรูปแบบเดิมของแต่ละแท็บ ·
 *                 ตัวกรองของแต่ละแท็บคงเดิม เก็บแยกกัน (ตัวแปรของแต่ละแท็บ) · เปลี่ยนแท็บขณะมีรายการที่ยังไม่บันทึก = ถามก่อน
 *                 แท็บ NPD = เนื้อหาหน้าแผน NPD เดิมทั้งหมด (CR-34 ที่มา · ใช้ในแผน · Chip คำขอจาก Sales) + ยืนยันเป็น NPD (Request → Planned) + ดู Listing
 *                 แท็บ Listing = เนื้อหาหน้า Listing เดิมทั้งหมด + Chip ลัด เฉพาะสินค้าใหม่ (Request / Planned / NPD)
 *                 หน้าเดิม modules/npd-plan · modules/product-master = ทางผ่าน (registry visible: false · perm launchListing) พาไปแท็บที่ตรงกัน
 * สิทธิ์:         launchListing (CR-35 · = สิทธิ์สูงสุดของ npdPlan และ listing เดิม · core/permissions.js LEGACY / ALIASES) · สิทธิ์ย่อย listing.clearance
 * อ่านจาก data/:  content (pages.launchListing · pages.npdPlan · pages.productMaster) · ส่วนอื่นตามหัวไฟล์ของแต่ละแท็บด้านล่าง
 * store:          ui.launchTab · ui.listingFocus (แท็บ NPD → Listing) + Key ของแต่ละแท็บ
 *
 * ---------------- หัวไฟล์เดิมของแท็บ NPD ----------------
 * 
 * modules/npd-plan/npd-plan.js — Product Master · แผนการเปิดตัวสินค้าใหม่ (NPD)
 * 
 * หน้าที่:        CR-30 ติดตามสินค้าใหม่ตั้งแต่วางแผนจนเปิดตัว (ช่วงเวลาต่อเนื่อง ไม่อิงปีแผน)
 *                 KPI: NPD ทั้งหมด · ยังไม่เปิดตัว / เปิดตัวใน 3 เดือน · ตาม Series · หน่วยขายที่ยังไม่อยู่ในแผน SKU (กดแล้วเห็นรายการ + ลิงก์ SKU Planning)
 *                 แถบเครื่องมือ: Timeline | ตาราง · ช่วงเวลา 12 | 18 | 24 เดือน ตั้งแต่ [เดือน] (ค่าเริ่มต้น 18 เดือนจากเดือนปัจจุบันกลาง core/clock.js) ·
 *                   Series · ขั้นงาน · ที่มา · Chip คำขอจาก Sales (n) (CR-34 นับเฉพาะคำขอที่ยังไม่ยืนยัน · กดแล้วกรองเฉพาะคำขอ) · Legend ขั้นงาน · (แก้ไข) + เพิ่ม NPD
 *                 Timeline: คอลัมน์ซ้ายติดซ้าย (รูป · ชื่อย่อ 2 บรรทัด · Product Code · เปิดตัว / หน่วยขาย / ในแผน SKU) · หัวเดือนแสดงปีเมื่อข้ามปี + เส้นแบ่งปี
 *                   แถบขั้นงานต่อกันจากเดือนเป้าหมาย (calc.npdStageSegments · ขั้นปัจจุบันขอบเข้ม) · หมุด ◆ เดือนเปิดตัว (แผนแบบไตรมาส = แถบประทั้งไตรมาส + ?) ·
 *                   แถบจาง NPD 3 เดือนหลังเปิดตัว · ⚠ ขั้นงานที่เลยเดือนเป้าหมายแล้วยังไม่เสร็จ (calc.npdOverdue)
 *                 ตาราง: SKU · Series · ขั้นงาน · เดือนเปิดตัว · Channel / หน่วยขายที่วางแผน · ใช้ในแผน (CR-34 จำนวนหน่วยขายที่มีในแผน SKU) · ราคา RSP ที่คาด ·
 *                   ผู้รับผิดชอบ · ที่มา (ทีม Product | Sales · ชื่อผู้ขอ + Tooltip เหตุผล) · ใน TRCLOUD
 *                 คลิกแผน → Drawer (ขั้นปัจจุบัน · เดือนเป้าหมาย 4 ขั้น · เดือนเปิดตัวแบบเดือนหรือไตรมาส · ราคา RSP ที่คาด · ผู้รับผิดชอบ · หน่วยขาย + เดือนเริ่มขาย)
 *                 + Workflow ของแผนนั้น (Phase 2 · Flag npdApproval) · บันทึกแล้วมีผลทันที (Phase 1): ตั้งเดือนเปิดตัวและ Listing (calc.applyNpdApproval)
 *                 CR-20 / CR-30: NPD ที่ Sales สร้างจากหน้าวางแผน SKU มีแผน NPD ที่มา จาก Sales (calc.createSalesNpd)
 *                 CR-34: คำขอจาก Sales (calc.isNpdRequest) ยืนยันใน Drawer (โหมดแก้ไข) = confirmedAt / confirmedBy ของแผน NPD → SKU Planning เป็นประเภท NPD ยืนยันแล้ว
 * อ่านจาก data/:  channels, settings, content (pages.npdPlan, labels) + Master ผ่าน store.data()
 * store อ่าน:     master.npdPlans, master.products, master.listings, master.taxonomy, master.basePrices, master.codeCounters, plan.<ปี>.topDown,
 *                 plan.<ปี>.sku.<unitId>, plan.<ปี>.workflow.*, ui.role, ui.seriesFilter
 * store เขียน:    master.npdPlans, master.products, master.listings, master.basePrices, master.codeCounters, master.audit,
 *                 plan.<ปี>.workflow.sku.* (ต้องตรวจสอบใหม่ · Phase 2), ui.selection / app.planYear (ก่อนเปิดหน้าวางแผน SKU ของหน่วยนั้น)
 *  
 * ---------------- หัวไฟล์เดิมของแท็บ Listing ----------------
 * 
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
 *  
 */
(function (SP) {
  'use strict';

  // ---------- แท็บ NPD (โค้ดเดิมของหน้าแผน NPD · ctx.openListing = ดู Listing) ----------
  var renderNpd = (function () {

    var C = SP.core.components;
    var Perm = SP.core.permissions;
    var F = SP.core.format;
    var calc = SP.core.calc;
    var W = SP.core.workflow;
    var FT = SP.core.features;   // CR-17: ปิด npdApproval = ไม่มีขั้นอนุมัติ บันทึกแล้วมีผลทันที
    var store = SP.core.store;
    var h = C.h;
    var fill = C.fill;

    var view = 'timeline';
    var rangeMonths = 18;
    var rangeFrom = null;
    var stageFilter = '';
    var sourceFilter = '';
    // CR-36: การ์ด KPI (planned · new · request) = กรอง Status · Chip มี Listing แต่ยังไม่อยู่ในแผน SKU · จัดกลุ่ม (ui.groupBy.<ผู้ใช้>.npd · ค่าเริ่มต้น ไม่จัดกลุ่ม)
    var kpiFilter = '';
    var notPlannedOnly = false;
    var NPD_GROUPS = ['none', 'series', 'level', 'status', 'launchMonth'];
    var KPI_STATUS = ['planned', 'new', 'request'];
    var collapsedNpd = {};
    var STAGES = ['plan', 'concept', 'production', 'ready'];
    var RANGES = [12, 18, 24];

    function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

    function render(root, ctx) {
      var page = ctx.page;
      var L = SP.data.content.labels;
      var PF = L.productFields;
      var S = SP.data.settings;
      var now = SP.core.clock.currentMonth();
      if (!rangeFrom) rangeFrom = now;
      var editing = false;
      function snapshot() {
        return { npdPlans: store.get('master.npdPlans'), products: store.get('master.products'), basePrices: store.get('master.basePrices'), codeCounters: store.get('master.codeCounters') };
      }
      var saved = snapshot();
      var draft = clone(saved);
      var selected = null;
      var creating = false;

      function cur() { return editing ? draft : saved; }
      // CR-21: สิทธิ์จากตารางสิทธิ์ (หน้าแผน NPD)
      function byName() { return C.roleName(store.role()); }
      function canEdit() { return Perm.can(Perm.user(), 'npdPlan'); }
      function tax() { return store.get('master.taxonomy'); }
      function product(key) { return calc.findProduct(cur().products, key); }
      function unitName(id) { var i = calc.unitInfo(store.data(), id); return i ? i.unit.name : id; }
      function launchYear(plan) { var l = calc.npdLaunch(plan); return l.from ? Number(l.from.slice(0, 4)) : store.year(); }

      function diffCount() {
        var n = 0;
        draft.npdPlans.forEach(function (d) { var o = calc.findById(saved.npdPlans, d.id); if (!o || JSON.stringify(o) !== JSON.stringify(d)) n++; });
        n += draft.products.length - saved.products.length;
        return n;
      }
      function dirty() { return editing ? diffCount() : 0; }
      C.guardUnsaved(dirty);

      var exportBtn = C.exportButton({ unsaved: dirty, build: exportSpec });
      var bar = C.workflowBar({
        simple: true, extra: exportBtn,
        editing: function () { return editing; },
        onEdit: function () { startEdit(); },
        onSave: function () { save(); },
        onCancel: function () { editing = false; creating = false; draft = clone(saved); draw(); }
      });
      if (ctx.intro) ctx.intro.appendChild(bar);

      function startEdit() { editing = true; draft = clone(saved); draw(); }

      function save() {
        var by = byName(), at = SP.core.clock.now();
        var entries = [];
        var applyNow = [];
        draft.npdPlans.forEach(function (d) {
          var o = calc.findById(saved.npdPlans, d.id);
          if (o && JSON.stringify(o) === JSON.stringify(d)) return;
          // CR-17 ปิด npdApproval: แผนที่มีเดือนเปิดตัว (หรือไตรมาส) และหน่วยขายมีผลทันทีที่บันทึก (ตั้งเดือนเปิดตัว + Listing เหมือนตอนอนุมัติ)
          if (!FT.isOn('npdApproval') && (d.plannedLaunchDate || d.launchQuarter) && (d.plannedAccounts || []).length) applyNow.push(d);
          // เลื่อนเดือนเปิดตัวหลังอนุมัติ → ฉบับร่าง + แผน SKU ที่อนุมัติแล้วของหน่วยที่วางแผน → ต้องตรวจสอบใหม่
          if (FT.isOn('npdApproval') && o && o.workflow && o.workflow.status === 'approved' && (o.plannedLaunchDate !== d.plannedLaunchDate || o.launchQuarter !== d.launchQuarter)) {
            d.workflow = W.resetToDraft(d.workflow, { by: by, at: at, note: L.workflow.invalidateNote.npd });
            [launchYear(o), launchYear(d)].filter(function (y, i, a) { return a.indexOf(y) === i; }).forEach(function (y) {
              var states = store.workflowStates(y);
              var units = (o.plannedAccounts || []).concat(d.plannedAccounts || []).map(function (a) { return a.accountId; });
              store.saveWorkflowStates(W.reviewUnits(states, 'sku', units, { by: by, at: at, note: L.workflow.invalidateNote.npd }), y);
            });
          }
          var before = o ? clone(o) : null, after = clone(d);
          if (before) delete before.workflow;
          delete after.workflow;
          entries = entries.concat(calc.auditDiff('npd', d.productKey, before, after, { by: by, at: at }));
        });
        draft.products.slice(saved.products.length).forEach(function (p) { entries = entries.concat(calc.auditDiff('product', calc.productKey(p), null, p, { by: by, at: at })); });
        if (applyNow.length) {
          var listings = store.get('master.listings');
          applyNow.forEach(function (d) {
            var applied = calc.applyNpdApproval({ products: draft.products, listings: listings }, d);
            draft.products = applied.products;
            listings = applied.listings;
            // สถานะภายใน = มีผลแล้ว (calc.npdStartMonth ใช้เป็นค่าตั้งต้นของแผน SKU) ไม่แสดงในหน้าจอเมื่อปิด npdApproval
            d.workflow = { status: 'approved', history: ((d.workflow && d.workflow.history) || []).concat([{ action: 'apply', by: by, at: at }]) };
            entries.push({ entity: 'product', key: d.productKey, field: 'launchDate', oldValue: null, newValue: d.plannedLaunchDate || d.launchQuarter, by: by, at: at });
          });
          store.set('master.listings', listings);
        }
        store.set('master.npdPlans', draft.npdPlans);
        store.set('master.products', draft.products);
        store.set('master.basePrices', draft.basePrices);
        store.set('master.codeCounters', draft.codeCounters);
        store.appendAudit(entries);
        saved = clone(draft);
        editing = false;
        creating = false;
        draw();
        ctx.refreshMenu();
      }

      // ------------------------------------------------------------------ สรุปตัวเลข
      function stageOf(plan) { return calc.npdStage(plan, now); }
      function statusOf(plan) { return (plan.workflow && plan.workflow.status) || 'draft'; }
      function sourceOf(plan) { return plan.source === 'SALES' ? 'SALES' : 'PRODUCT'; }
      // CR-34: ที่มา Sales · ชื่อผู้ขอ · Tooltip เหตุผล · คำขอที่ยังไม่ยืนยัน
      function requestOf(plan) { var p = product(plan.productKey); return (p && p.request) || {}; }
      function sourceText(plan) {
        if (sourceOf(plan) !== 'SALES') return page.sources.PRODUCT;
        var p = product(plan.productKey);
        return fill(page.sourceSales, { name: plan.requestedBy || (p && p.requestedBy) || '–' });
      }
      function sourceTip(plan) {
        if (sourceOf(plan) !== 'SALES') return null;
        var r = plan.reason || requestOf(plan).reason;
        return r ? fill(page.sourceReason, { reason: r }) : page.sourceNoReason;
      }
      // CR-35: คำขอ = Status Request (ยังไม่มี Product Code 5 หลัก) · รหัสที่แสดง = calc.productCode (คำขอ = รหัสชั่วคราว)
      function isRequest(plan) { return calc.isRequestProduct(product(plan.productKey)); }
      function codeOf(plan) { return calc.codeOf(cur().products, plan.productKey); }
      // ยืนยันเป็น NPD (Request → Planned) ทันที · เฉพาะผู้มีสิทธิ์แก้ไขหน้านี้ (ทีม Product) · นอกโหมดแก้ไข
      function confirmButton(n) {
        if (editing || !canEdit() || !isRequest(n)) return null;
        return h('button', { type: 'button', class: 'btn btn-sm btn-secondary npd-confirm', onClick: function (e) { e.stopPropagation(); confirmPlan(n); } }, L.confirmRequest.button);
      }
      function confirmPlan(n) {
        var m = store.master();
        var p = calc.findProduct(m.products, n.productKey);
        C.confirmRequestDialog(p, m).then(function (v) {
          if (!v) return;
          var at = SP.core.clock.now(), by = byName();
          var res = SP.core.catalog.confirmRequest(m, n.productKey, v, { by: by, at: at });
          if (!res.ok) { C.toast(L.confirmRequest.errors[res.error] || res.error); return; }
          store.set('master.products', res.master.products);
          store.set('master.npdPlans', res.master.npdPlans);
          store.set('master.codeCounters', res.master.codeCounters);
          store.appendAudit([{ entity: 'product', key: n.productKey, field: 'trCode', oldValue: res.tempCode, newValue: res.code, by: by, at: at }]);
          saved = snapshot();
          draft = clone(saved);
          C.toast(fill(L.confirmRequest.done, { code: res.code, name: v.name }));
          draw();
        });
      }
      function skuPlans(year) {
        var out = {};
        if (S.PLAN_YEARS.indexOf(year) < 0) return out;
        var td = store.get('plan.' + year + '.topDown');
        Object.keys(td.units || {}).forEach(function (ch) { (td.units[ch] || []).forEach(function (u) { out[u] = store.get('plan.' + year + '.sku.' + u); }); });
        return out;
      }
      function coverage(plan) { return calc.npdCoverage(plan, skuPlans(launchYear(plan))); }
      // CR-36: Status ของสินค้า ณ เดือนปัจจุบัน (การ์ด KPI) · หน่วยขายที่มี Listing ในปีแผนแต่ยังไม่อยู่ในแผน SKU (calc.listedNotPlanned · ตัวเลขเดียวกับ SKU Planning)
      function statusNow(plan) { var p = product(plan.productKey); return p ? calc.productStatus(p, now) : null; }
      var planYear = store.year();
      var plansOfYear = skuPlans(planYear);
      function notPlanned(plan) { return calc.listedNotPlanned(store.master(), plansOfYear, plan.productKey, planYear); }
      function uid() { var u = Perm.user(); return (u && u.id) || 'default'; }
      function groupBy() { var all = store.get('ui.groupBy') || {}; var v = (all[uid()] || {}).npd; return NPD_GROUPS.indexOf(v) >= 0 ? v : 'none'; }
      function setGroupBy(v) { var all = clone(store.get('ui.groupBy') || {}); all[uid()] = all[uid()] || {}; all[uid()].npd = v; store.set('ui.groupBy', all); }
      function groupLevels() {
        return calc.productGroupLevels(groupBy(), { tax: tax(), product: function (n) { return product(n.productKey) || { seriesId: n.seriesId }; }, statusOf: statusNow,
          launchOf: function (n) { var l = calc.npdLaunch(n); return l.month || (l.from ? l.from.slice(0, 7) : null); },
          labels: { none: L.groupBy.noneName, noLaunch: L.groupBy.noLaunch, status: L.status, month: function (k) { return F.date(k); } } });
      }
      // ปุ่ม ยังไม่อยู่ในแผน N → Popover หน่วยขาย + ไปที่ SKU Planning (เปิด เพิ่มสินค้าในแผน แท็บ NPD ที่ยืนยันแล้ว เมื่อมีสิทธิ์แก้ไข)
      function notPlannedButton(n) {
        var us = notPlanned(n);
        if (!us.length) return null;
        var X = page.notPlanned;
        var btn = h('button', { type: 'button', class: 'link-btn npd-notplanned', title: fill(X.title, { year: planYear }), onClick: function (e) { e.stopPropagation(); } }, fill(X.cell, { n: us.length }));
        C.popover(btn, function (close) {
          return [h('h3', { class: 'popover-title' }, fill(X.title, { year: planYear })), h('ul', { class: 'npd-missing-list' }, us.map(function (u) {
            var info = calc.unitInfo(store.data(), u);
            return h('li', null, h('span', null, (info && info.channel ? info.channel.name + ' · ' : '') + unitName(u)),
              info && info.channel ? h('a', { href: SP.core.paths.to(SP.core.registry.byId('skuPlanning').path), class: 'npd-open-link', onClick: function (e) {
                e.preventDefault(); close();
                store.set('app.planYear', planYear);
                store.set('ui.selection', { channel: info.channel.id, unit: u });
                store.set('ui.skuAddHandoff', { unitId: u, key: n.productKey });
                location.href = SP.core.paths.to(SP.core.registry.byId('skuPlanning').path);
              } }, X.go) : null);
          }))];
        }, { className: 'npd-missing-popover', label: fill(X.title, { year: planYear }) });
        return btn;
      }
      // CR-34: ใช้ในแผน = หน่วยขายที่มีสินค้านี้ในแผน SKU ของปีเปิดตัว (ทุกหน่วยขาย ไม่เฉพาะที่วางแผนไว้)
      function usedIn(plan) { return SP.core.planEdits.unitsInPlan(skuPlans(launchYear(plan)), plan.productKey); }
      function usedCell(plan) {
        var y = launchYear(plan), u = usedIn(plan), cov = coverage(plan);
        var tip = u.length ? fill(page.usedTip, { year: y, units: u.map(unitName).join(', ') }) : fill(page.usedNone, { year: y });
        if (cov.missing.length) tip += ' · ' + fill(page.usedMissing, { units: cov.missing.map(unitName).join(', ') });
        return { text: fill(page.usedText, { n: u.length }), tip: tip, short: cov.missing.length > 0 };
      }
      function launchText(plan) {
        var l = calc.npdLaunch(plan);
        if (l.month) return F.date(l.month);
        if (l.quarter) return fill(page.quarter, { q: l.quarter.slice(5), y: l.quarter.slice(0, 4) });
        return page.noLaunch;
      }
      // ช่วงที่แผนมีกิจกรรม (ขั้นงานแรก → เดือนเปิดตัว + ช่วง NPD) เพื่อกรองตามช่วงเวลาที่แสดง
      function activeSpan(plan) {
        var segs = calc.npdStageSegments(plan), l = calc.npdLaunch(plan);
        var from = segs.length ? segs[0].from : l.from;
        var to = l.to ? calc.addMonths(l.to, S.NPD_MONTHS - 1) : segs.length ? segs[segs.length - 1].to : null;
        return { from: from, to: to };
      }
      function months() { return calc.monthSpan(rangeFrom, rangeMonths); }
      function inRange(plan) {
        var sp = activeSpan(plan), ms = months();
        if (!sp.from && !sp.to) return true;
        return (sp.to || sp.from) >= ms[0] && (sp.from || sp.to) <= ms[ms.length - 1];
      }
      function matches(plan) {
        var p = product(plan.productKey) || {};
        if (!calc.inSeries({ seriesId: plan.seriesId || p.seriesId, subSeriesId: p.subSeriesId }, store.get('ui.seriesFilter') || [])) return false;
        if (stageFilter && stageOf(plan) !== stageFilter) return false;
        if (sourceFilter && sourceOf(plan) !== sourceFilter) return false;
        if (kpiFilter && statusNow(plan) !== kpiFilter) return false;
        if (notPlannedOnly && !notPlanned(plan).length) return false;
        return true;
      }
      function shownPlans() {
        return cur().npdPlans.filter(function (n) { return matches(n) && inRange(n); }).sort(function (a, b) {
          var x = calc.npdLaunch(a).from || '9999', y = calc.npdLaunch(b).from || '9999';
          return x < y ? -1 : x > y ? 1 : 0;
        });
      }

      // ------------------------------------------------------------------ วาดหน้า
      var drawerCtl = C.drawer({ label: page.title, className: 'npd-drawer', onClose: function () { selected = null; creating = false; draw(); } });

      function draw() {
        C.clear(root);
        bar.update();
        // CR-36: การ์ด KPI 3 ใบ (Status ณ เดือนปัจจุบันของสินค้าในแผน NPD) · กดแล้วกรอง Status · การ์ดที่เลือกมีเส้นขอบสีหลัก + Chip KPI
        var K = page.kpi3;
        var all = cur().npdPlans;
        function cnt(s) { return all.filter(function (n) { return statusNow(n) === s; }).length; }
        root.appendChild(h('div', { class: 'll-kpis' }, KPI_STATUS.map(function (s) {
          var on = kpiFilter === s;
          return h('button', { type: 'button', class: 'card pl-kpi ll-kpi ll-kpi-' + s + (on ? ' is-selected' : ''), title: K.title, 'aria-pressed': on ? 'true' : 'false',
            onClick: function () { kpiFilter = on ? '' : s; draw(); } },
            h('span', { class: 'pl-kpi-label' }, K[s]), h('strong', { class: 'pl-kpi-value' }, F.number(cnt(s))), h('span', { class: 'pl-kpi-unit' }, K.unit));
        })));
        root.appendChild(toolbar());
        var chips = [];
        if (kpiFilter) chips.push({ label: fill(page.kpi3.chip, { value: page.kpi3[kpiFilter] }), onRemove: function () { kpiFilter = ''; draw(); } });
        if (notPlannedOnly) chips.push({ label: fill(page.notPlanned.chipOn, { year: planYear }), onRemove: function () { notPlannedOnly = false; draw(); } });
        var chipEl = C.filterChips(chips, function () { kpiFilter = ''; notPlannedOnly = false; draw(); });
        if (chipEl) root.appendChild(h('div', { class: 'll-chips' }, chipEl));
        if (editing) { var b = C.editBanner(); b.update(dirty()); root.appendChild(b); }
        var card = h('div', { class: 'card fit-card npd-card' });
        root.appendChild(card);
        var list = shownPlans();
        if (!list.length) card.appendChild(h('p', { class: 'grid-empty' }, page.empty));
        else card.appendChild(view === 'timeline' ? timeline(list) : table(list));
        if (drawerCtl.isOpen()) renderDrawer();
      }

      function toolbar() {
        var fromOptions = calc.monthSpan(calc.addMonths(now, -12), 25).map(function (k) { return { value: k, label: F.date(k) }; });
        var notPlannedN = cur().npdPlans.filter(function (n) { return notPlanned(n).length > 0; }).length;
        var seriesOptions = calc.seriesList(tax(), cur().npdPlans.map(function (n) { return product(n.productKey) || { seriesId: n.seriesId }; }));
        return h('div', { class: 'tool-row npd-toolbar' },
          C.segmented({ label: page.viewLabel, value: view, options: ['timeline', 'table'].map(function (v) { return { value: v, label: page.views[v] }; }), onChange: function (v) { view = v; draw(); } }),
          h('span', { class: 'field npd-range' }, h('span', { class: 'field-label' }, page.range),
            C.segmented({ label: page.range, value: String(rangeMonths), className: 'npd-range-seg', options: RANGES.map(function (n) { return { value: String(n), label: fill(page.rangeOption, { n: n }) }; }),
              onChange: function (v) { rangeMonths = Number(v); draw(); } })),
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.from),
            C.select({ label: page.from, value: rangeFrom, className: 'npd-from', options: fromOptions, onChange: function (v) { rangeFrom = v; draw(); } })),
          C.seriesFilter({ options: seriesOptions, value: store.get('ui.seriesFilter') || [], onChange: function (v) { store.set('ui.seriesFilter', v); draw(); } }),
          C.select({ label: page.stageFilter, value: stageFilter, className: 'npd-stage-filter' + (stageFilter ? ' is-active' : ''),
            options: [{ value: '', label: page.stageAll }].concat(STAGES.concat(['launched']).map(function (s) { return { value: s, label: page.stages[s] }; })), onChange: function (v) { stageFilter = v; draw(); } }),
          C.select({ label: page.sourceFilter, value: sourceFilter, className: 'npd-source-filter' + (sourceFilter ? ' is-active' : ''),
            options: [{ value: '', label: page.sourceAll }].concat(['PRODUCT', 'SALES'].map(function (s) { return { value: s, label: page.sources[s] }; })), onChange: function (v) { sourceFilter = v; draw(); } }),
          h('button', { type: 'button', class: 'btn btn-sm npd-notplanned-chip' + (notPlannedN ? ' has-requests' : '') + (notPlannedOnly ? ' is-active' : ''), title: fill(page.notPlanned.chipTip, { year: planYear }),
            'aria-pressed': notPlannedOnly ? 'true' : 'false', onClick: function () { notPlannedOnly = !notPlannedOnly; draw(); } }, fill(page.notPlanned.chip, { n: notPlannedN })),
          C.groupPicker({ value: groupBy(), className: 'npd-group-by', options: NPD_GROUPS.map(function (k) { return { value: k, label: k === 'level' ? L.groupBy.levelShort : L.groupBy[k] }; }),
            onChange: function (v) { setGroupBy(v); draw(); } }),
          h('span', { class: 'tool-right' },
            h('span', { class: 'legend npd-legend' }, STAGES.concat(['launched']).map(function (s) { return h('span', { class: 'legend-item' }, h('span', { class: 'swatch npd-sw', style: { '--c': C.tokenVar('--npd-' + s) } }), page.stages[s]); })),
            editing ? h('button', { type: 'button', class: 'btn btn-primary btn-sm npd-create', onClick: openCreate }, page.create) : null));
      }

      // CR-36: วนกลุ่ม (calc.productGroupLevels + groupItems) → head(g, open, toggle) แล้ว row(item) ของกลุ่มที่กางอยู่ · ไม่จัดกลุ่ม = row ทุกรายการ
      function eachGroup(list, head, row) {
        var levels = groupLevels();
        if (!levels) { list.forEach(row); return; }
        var GB = L.groupBy, by = groupBy();
        (function walk(groups, parent) {
          groups.forEach(function (g) {
            var gid = by + parent + '/' + g.id;
            var open = !collapsedNpd[gid];
            var toggle = h('button', { type: 'button', class: 'link-btn npd-group-toggle', 'aria-expanded': open ? 'true' : 'false', title: fill(open ? GB.collapse : GB.expand, { name: g.name }),
              onClick: function (e) { e.stopPropagation(); collapsedNpd[gid] = open; draw(); } }, h('span', { class: 'pl-group-caret', 'aria-hidden': 'true' }, open ? '▾' : '▸'), ' ', fill(GB.head, { name: g.name, n: F.number(g.count) }));
            head(g, open, toggle);
            if (!open) return;
            if (g.groups) walk(g.groups, gid); else g.items.forEach(row);
          });
        })(calc.groupItems(list, levels), '');
      }

      // ------------------------------------------------------------------ Timeline
      function timeline(list) {
        var T = tax();
        var ms = months();
        var grid = h('div', { class: 'npd-timeline', role: 'table', style: { '--npd-n': String(ms.length) } });
        grid.appendChild(h('div', { class: 'npd-row npd-head', role: 'row' }, h('div', { class: 'npd-label', role: 'columnheader' }, page.columns.sku),
          ms.map(function (k, i) {
            var m = Number(k.slice(5, 7)) - 1, jan = m === 0;
            return h('div', { class: 'npd-month' + (jan ? ' is-year-start' : '') + (k === now ? ' is-current' : ''), role: 'columnheader', title: F.date(k) },
              h('span', null, F.MONTHS[m]), i === 0 || jan ? h('span', { class: 'npd-year' }, k.slice(0, 4)) : null);
          })));
        function addRow(n) {
          var p = product(n.productKey) || { name: n.productKey };
          var cov = coverage(n);
          var overdue = calc.npdOverdue(n, now);
          var line = fill(page.rowLine, { launch: launchText(n), n: cov.planned, x: cov.inPlan });
          var row = h('div', { class: 'npd-row npd-item' + (selected === n.id ? ' is-selected' : ''), role: 'row', tabindex: '0', dataset: { id: n.id },
            onClick: function () { openPlan(n.id); }, onKeydown: function (e) { if (e.key === 'Enter') openPlan(n.id); } },
            h('div', { class: 'npd-label', role: 'cell' }, C.productThumb(p, T, { size: 'sm' }),
              h('span', { class: 'npd-name' },
                h('span', { class: 'npd-name-text', title: p.name }, calc.displayName(p), ' ', C.tempNameTag(p)),
                h('span', { class: 'npd-sub' }, h('strong', null, codeOf(n)), sourceOf(n) === 'SALES' ? h('span', { class: 'badge tag-warn', title: sourceText(n) + ' · ' + sourceTip(n) }, isRequest(n) ? page.requestBadge : page.sources.SALES) : null,
                  FT.isOn('npdApproval') ? C.wfBadge(statusOf(n)) : null),
                h('span', { class: 'npd-line' }, line, ' ', notPlannedButton(n))),
              overdue.length ? h('span', { class: 'npd-overdue', title: fill(page.overdue, { stages: overdue.map(function (s) { return page.stages[s]; }).join(', ') }) }, '⚠') : null));
          row.appendChild(track(n, ms));
          grid.appendChild(row);
        }
        // CR-36: จัดกลุ่ม (หัวกลุ่มพับได้) · ไม่จัดกลุ่ม = เรียงตามเดือนเปิดตัวเดิม
        eachGroup(list, function (g, open, toggle) {
          grid.appendChild(h('div', { class: 'npd-row npd-group npd-group-d' + g.depth, role: 'row' }, h('div', { class: 'npd-group-cell', role: 'cell' }, toggle)));
        }, addRow);
        return h('div', { class: 'fit-scroll npd-scroll' }, grid);
      }

      // แถบของแผนในช่วงเดือน ms: ขั้นงาน (ก่อนเปิดตัว) · หมุดเปิดตัว / แถบไตรมาส · ช่วง NPD หลังเปิดตัว
      function track(n, ms) {
        var el = h('div', { class: 'npd-track', role: 'cell' });
        function col(k) { return ms.indexOf(k); }
        function span(from, to) {
          var a = from < ms[0] ? 0 : col(from), b = to > ms[ms.length - 1] ? ms.length - 1 : col(to);
          return a < 0 || b < 0 || a > b ? null : (a + 1) + ' / ' + (b + 2);
        }
        ms.forEach(function (k, i) { el.appendChild(h('span', { class: 'npd-cell' + (k.slice(5) === '01' ? ' is-year-start' : '') + (k === now ? ' is-current' : ''), style: { gridColumn: (i + 1) + ' / ' + (i + 2) } })); });
        var stage = stageOf(n);
        if (stage !== 'launched') {
          calc.npdStageSegments(n).forEach(function (sg) {
            var g = span(sg.from, sg.to);
            if (!g) return;
            el.appendChild(h('span', { class: 'npd-seg' + (sg.stage === stage ? ' is-current' : ''), style: { gridColumn: g, '--c': C.tokenVar('--npd-' + sg.stage) },
              title: fill(page.stageTip, { stage: page.stages[sg.stage], from: F.date(sg.from), to: F.date(sg.to) }) + (sg.stage === stage ? page.currentStage : '') }, page.stages[sg.stage]));
          });
        }
        var l = calc.npdLaunch(n);
        if (l.month) {
          var after = span(l.month, calc.addMonths(l.month, S.NPD_MONTHS - 1));
          if (after) el.appendChild(h('span', { class: 'npd-after', style: { gridColumn: after }, title: page.npdBandTip }, page.npdBand));
          if (col(l.month) >= 0) el.appendChild(h('span', { class: 'npd-pin', style: { gridColumn: (col(l.month) + 1) + ' / ' + (col(l.month) + 2), '--c': C.tokenVar('--npd-launched') },
            title: fill(page.pin, { month: F.date(l.month) }) }, '◆'));
        } else if (l.quarter) {
          var q = span(l.from, l.to);
          if (q) el.appendChild(h('span', { class: 'npd-quarter', style: { gridColumn: q }, title: fill(page.quarterBand, { q: launchText(n) }) }, '?'));
        }
        return el;
      }

      // ------------------------------------------------------------------ ตาราง
      function accountsText(n) {
        var d = store.data();
        var byCh = {};
        (n.plannedAccounts || []).forEach(function (a) {
          var i = calc.unitInfo(d, a.accountId);
          var ch = i && i.channel ? i.channel.name : '–';
          (byCh[ch] = byCh[ch] || []).push((i ? i.unit.name : a.accountId) + (a.plannedStartMonth ? ' (' + F.date(a.plannedStartMonth) + ')' : ''));
        });
        return Object.keys(byCh).map(function (ch) { return ch + ': ' + byCh[ch].join(', '); }).join(' · ');
      }
      function table(list) {
        var Cl = page.columns;
        var T = tax();
        var body = h('tbody');
        function addRow(n) {
          var p = product(n.productKey) || { name: n.productKey };
          var used = usedCell(n);
          var l = calc.npdLaunch(n);
          body.appendChild(h('tr', { class: 'is-clickable' + (selected === n.id ? ' is-selected' : ''), onClick: function () { openPlan(n.id); } },
            h('td', null, h('span', { class: 'npd-name' }, C.productThumb(p, T, { size: 'sm' }), h('span', null, h('strong', null, codeOf(n)), ' ' + calc.displayName(p), ' ', C.tempNameTag(p)),
              // CR-35: ดู Listing = แท็บ Listing ที่กรองเฉพาะสินค้านี้
              ctx.openListing ? h('button', { type: 'button', class: 'link-btn npd-view-listing', onClick: function (e) { e.stopPropagation(); ctx.openListing(n.productKey); } }, page.viewListing) : null)),
            h('td', null, calc.taxonomyName(T, 'series', n.seriesId) || '–'),
            h('td', null, h('span', { class: 'npd-stage', style: { '--c': C.tokenVar('--npd-' + stageOf(n)) } }, page.stages[stageOf(n)])),
            h('td', null, launchText(n), l.quarter ? h('span', { class: 'muted small' }, ' · ' + page.unconfirmed) : null),
            h('td', { class: 'npd-acc-cell', title: accountsText(n) }, accountsText(n) || '–'),
            h('td', { class: 'num npd-used' + (used.short ? ' text-short' : ''), title: used.tip }, used.text, notPlannedButton(n) ? h('span', { class: 'npd-used-np' }, notPlannedButton(n)) : null),
            h('td', { class: 'num' }, n.expectedRsp ? F.baht(n.expectedRsp, 2) : '–'),
            h('td', null, n.owner || '–'),
            h('td', { class: 'npd-source' + (sourceOf(n) === 'SALES' ? ' has-tip' : ''), title: sourceTip(n) }, sourceText(n), isRequest(n) ? [' ', C.planTypeBadge('npdRequest'), ' ', confirmButton(n)] : null),
            h('td', null, p && p.trCode ? SP.data.content.pages.productList.trcloud[SP.core.catalog.inTrcloud(p) ? 'open' : 'notOpen'] : '–')));
        }
        eachGroup(list, function (g, open, toggle) { body.appendChild(h('tr', { class: 'is-group npd-group-d' + g.depth }, h('td', { colspan: '10' }, toggle))); }, addRow);
        return h('div', { class: 'fit-scroll' }, h('table', { class: 'data-grid npd-table' },
          h('thead', null, h('tr', null, ['sku', 'series', 'stage', 'launch', 'accounts'].map(function (k) { return h('th', { scope: 'col' }, Cl[k]); }),
            h('th', { scope: 'col', class: 'num' }, Cl.inPlan), h('th', { scope: 'col', class: 'num' }, Cl.rsp), h('th', { scope: 'col' }, Cl.owner),
            h('th', { scope: 'col' }, Cl.source), h('th', { scope: 'col' }, Cl.trcloud))),
          body));
      }

      // ------------------------------------------------------------------ ส่งออก ▾ (แผนตามตัวกรองและช่วงเวลา)
      function exportSpec(source) {
        var c0 = source === 'draft' && editing ? draft : saved;
        var Cl = page.columns;
        var st = C.exportStamp(null);
        var plans = c0.npdPlans.filter(function (n) { return matches(n) && inRange(n); });
        function pr(n) { return calc.findProduct(c0.products, n.productKey) || { name: n.productKey }; }
        return {
          filename: fill(page.exportFile, { date: st.date }),
          sheets: [{ name: page.exportSheet, header: C.exportHeader(store.year(), null, [[page.range, fill(page.rangeOption, { n: rangeMonths }) + ' · ' + F.keyRange(months()[0], months()[months().length - 1])]]),
            columns: [
              { key: 'code', label: SP.data.content.pages.productList.columns.code, value: function (n) { return calc.codeOf(c0.products, n.productKey); }, width: 14 },
              { key: 'name', label: Cl.sku, value: function (n) { return pr(n).name; }, width: 40 },
              { key: 'series', label: Cl.series, value: function (n) { return calc.taxonomyName(tax(), 'series', n.seriesId) || ''; } },
              { key: 'stage', label: Cl.stage, value: function (n) { return page.stages[stageOf(n)]; } },
              { key: 'launch', label: Cl.launch, value: function (n) { return launchText(n); } },
              { key: 'accounts', label: Cl.accounts, value: accountsText, width: 40 },
              { key: 'inPlan', label: Cl.inPlan, value: function (n) { return usedIn(n).length; }, type: 'number' },
              { key: 'rsp', label: Cl.rsp, type: 'price', value: function (n) { return n.expectedRsp || null; } },
              { key: 'owner', label: Cl.owner, value: function (n) { return n.owner || ''; } },
              { key: 'source', label: Cl.source, value: function (n) { return sourceText(n); } },
              { key: 'reason', label: page.fields.reason, value: function (n) { return sourceOf(n) === 'SALES' ? n.reason || requestOf(n).reason || '' : ''; }, width: 30 },
              { key: 'request', label: page.fields.request, value: function (n) { return sourceOf(n) === 'SALES' ? page.requestStates[isRequest(n) ? 'pending' : 'confirmed'] : ''; } }
            ],
            rows: plans }]
        };
      }

      // ------------------------------------------------------------------ Drawer
      function openPlan(id) { selected = id; creating = false; drawerCtl.open(); draw(); }
      function openCreate() { creating = true; selected = null; renderDrawer(); drawerCtl.open(); }
      function planOf(id) { return calc.findById(cur().npdPlans, id); }

      function renderDrawer() {
        C.clear(drawerCtl.head);
        C.clear(drawerCtl.body);
        if (creating) { renderCreate(); return; }
        var n = planOf(selected);
        if (!n) { drawerCtl.close(); return; }
        var T = tax();
        var p = product(n.productKey) || { name: n.productKey };
        var stage = stageOf(n);
        drawerCtl.head.appendChild(h('div', { class: 'pd-head' }, C.productThumb(p, T, { size: 'md' }),
          h('div', { class: 'pd-title' }, h('h2', null, fill(page.drawerTitle, { name: calc.displayName(p) })),
            h('div', { class: 'pd-meta' }, h('span', { class: 'pd-code' }, codeOf(n)), C.tempCodeTag(p),
              h('span', { class: 'npd-stage', style: { '--c': C.tokenVar('--npd-' + stage) } }, page.stages[stage]),
              h('span', { class: 'badge tag-muted', title: sourceTip(n) }, sourceText(n)), isRequest(n) ? C.planTypeBadge('npdRequest') : null)), confirmButton(n)));
        if (!editing && FT.isOn('npdApproval')) {
          var wf = C.workflowBar({
            step: 'npd', unitId: n.id, year: launchYear(n),
            title: function () { return fill(page.workflowTitle, { name: p.name }); },
            getState: function () { return n.workflow || { status: 'draft', history: [] }; },
            editing: function () { return false; },
            facts: function () { return { ready: !!(n.plannedLaunchDate || n.launchQuarter) && (n.plannedAccounts || []).length > 0 }; },
            summary: function () {
              var S2 = page.summaryLines;
              return [fill(S2.launch, { date: launchText(n) }), fill(S2.accounts, { n: (n.plannedAccounts || []).length }), fill(S2.stage, { stage: page.stages[stage] })];
            },
            onEdit: function () { startEdit(); },
            onAction: function (action, payload) { return act(n.id, action, payload); },
            onChange: function () { saved = snapshot(); draft = clone(saved); draw(); }
          });
          drawerCtl.head.appendChild(h('div', { class: 'npd-wf' }, wf));
        }
        var body = h('div', { class: 'pd-body' });
        drawerCtl.body.appendChild(body);
        var F2 = page.fields;
        function field(label, content) { return h('div', { class: 'pd-field' }, h('span', { class: 'pd-label' }, label), h('span', { class: 'pd-value' }, content)); }
        var overdue = calc.npdOverdue(n, now);
        if (overdue.length) body.appendChild(h('p', { class: 'callout callout-warn npd-note' }, '⚠ ' + fill(page.overdue, { stages: overdue.map(function (s) { return page.stages[s]; }).join(', ') })));
        if (editing) {
          var stageSel = C.select({ label: F2.stage, value: STAGES.indexOf(n.stage) >= 0 ? n.stage : 'plan', className: 'select-sm npd-stage-sel',
            options: STAGES.map(function (s) { return { value: s, label: page.stages[s] }; }), onChange: function (v) { n.stage = v; refresh(); } });
          var note = h('input', { type: 'text', class: 'pm-input pd-input', value: n.note || '', 'aria-label': F2.note });
          note.addEventListener('change', function () { n.note = note.value; refresh(); });
          var owner = h('input', { type: 'text', class: 'pm-input pd-input npd-owner', value: n.owner || '', 'aria-label': F2.owner });
          owner.addEventListener('change', function () { n.owner = owner.value.trim(); refresh(); });
          var rsp = h('input', { type: 'number', class: 'pm-input pm-stock npd-rsp', min: '0', step: '0.01', value: n.expectedRsp != null ? String(n.expectedRsp) : '', 'aria-label': F2.rsp });
          rsp.addEventListener('change', function () { n.expectedRsp = rsp.value === '' ? null : Number(rsp.value); refresh(); });
          body.appendChild(h('section', { class: 'pd-section' }, [
            field(F2.product, codeOf(n) + ' · ' + p.name), field(F2.series, calc.taxonomyName(T, 'series', n.seriesId) || '–'),
            field(F2.stage, [stageSel, h('span', { class: 'muted small' }, ' ' + page.stageAuto)]),
            field(F2.launch, launchEditor(n)), field(F2.rsp, rsp), field(F2.owner, owner), field(F2.source, sourceText(n))].concat(requestFields(n, true), [field(F2.note, note)])));
          body.appendChild(targetsEditor(n));
          if (!FT.isOn('npdApproval')) body.appendChild(h('p', { class: 'callout callout-info npd-note' }, page.saveEffect));
          else if (statusOf(calc.findById(saved.npdPlans, n.id) || {}) === 'approved') body.appendChild(h('p', { class: 'callout callout-info npd-note' }, page.launchMovedNote));
        } else {
          var t = n.stageTargets || {};
          body.appendChild(h('section', { class: 'pd-section' },
            field(F2.product, codeOf(n) + ' · ' + p.name), field(F2.series, calc.taxonomyName(T, 'series', n.seriesId) || '–'),
            field(F2.stage, page.stages[stage]),
            field(F2.launch, [launchText(n), calc.npdLaunch(n).quarter ? h('span', { class: 'muted small' }, ' · ' + page.unconfirmed) : null]),
            field(F2.rsp, n.expectedRsp ? F.baht(n.expectedRsp, 2) : '–'), field(F2.owner, n.owner || '–'), field(F2.source, sourceText(n)),
            requestFields(n, false), n.note ? field(F2.note, n.note) : null));
          body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, F2.targets),
            h('ul', { class: 'npd-targets' }, STAGES.map(function (s) {
              return h('li', { class: overdue.indexOf(s) >= 0 ? 'is-overdue' : s === stage ? 'is-current' : null },
                h('span', { class: 'npd-stage', style: { '--c': C.tokenVar('--npd-' + s) } }, page.stages[s]), ' ' + (t[s] ? F.date(t[s]) : '–'));
            }))));
          if (FT.isOn('npdApproval') && statusOf(n) === 'approved') body.appendChild(h('p', { class: 'callout callout-info npd-note' }, page.approvedEffect));
        }
        body.appendChild(accountsSection(n));
        body.appendChild(h('a', { href: SP.core.paths.to(SP.core.registry.byId('productList').path) }, page.productLink));
        if (ctx.openListing) body.appendChild(h('button', { type: 'button', class: 'link-btn npd-view-listing', onClick: function () { drawerCtl.close(); ctx.openListing(n.productKey); } }, page.viewListing));
      }

      // CR-34: คำขอจาก Sales — ผู้ขอ · เหตุผล · สถานะคำขอ (แก้ไข = ยืนยันเป็น NPD / กลับเป็นรอยืนยัน · confirmedAt / confirmedBy)
      function requestFields(n, edit) {
        if (sourceOf(n) !== 'SALES') return [];
        var F2 = page.fields;
        function field(label, content) { return h('div', { class: 'pd-field' }, h('span', { class: 'pd-label' }, label), h('span', { class: 'pd-value' }, content)); }
        var r = n.reason || requestOf(n).reason;
        // CR-35: สถานะคำขอ = Request (ยังไม่ยืนยัน) | ยืนยันแล้ว (Planned ขึ้นไป · รหัสชั่วคราวเดิม) · ยืนยันด้วยปุ่ม ยืนยันเป็น NPD (ไม่แก้ในโหมดแก้ไข)
        var pp = product(n.productKey) || {};
        var state = isRequest(n) ? 'pending' : 'confirmed';
        var when = pp.confirmedAt || n.confirmedAt;
        var stateNode = [page.requestStates[state], when ? h('span', { class: 'muted small' }, ' · ' + fill(page.confirmedLine, { by: pp.confirmedBy || n.confirmedBy || '–', date: F.date(String(when).slice(0, 10)) })) : null,
          pp.tempCode ? h('span', { class: 'muted small' }, ' · ' + fill(L.tempCode.old, { code: pp.tempCode })) : null];
        return [field(F2.requestedBy, n.requestedBy || (product(n.productKey) || {}).requestedBy || '–'), field(F2.reason, r || page.sourceNoReason),
          h('div', { class: 'pd-field npd-request-field' }, h('span', { class: 'pd-label' }, F2.request), h('span', { class: 'pd-value' }, stateNode))];
      }

      // เดือนเปิดตัว: เดือนที่แน่นอน หรือไตรมาส (แผนที่ยังไม่ชัด)
      function launchEditor(n) {
        var F2 = page.fields;
        var mode = n.launchQuarter && !n.plannedLaunchDate ? 'quarter' : 'month';
        var seg = C.segmented({ label: F2.launch, value: mode, className: 'npd-launch-mode', options: ['month', 'quarter'].map(function (m) { return { value: m, label: F2.launchModes[m] }; }),
          onChange: function (v) {
            if (v === 'quarter') { var k = n.plannedLaunchDate ? n.plannedLaunchDate.slice(0, 7) : now; n.launchQuarter = k.slice(0, 4) + '-Q' + (Math.floor((Number(k.slice(5, 7)) - 1) / 3) + 1); n.plannedLaunchDate = null; }
            else { var q = calc.quarterMonths(n.launchQuarter); n.plannedLaunchDate = (q[0] || now) + '-01'; n.launchQuarter = null; }
            refresh();
          } });
        var input;
        if (mode === 'month') {
          input = h('input', { type: 'month', class: 'pm-input npd-launch', value: n.plannedLaunchDate ? n.plannedLaunchDate.slice(0, 7) : '', 'aria-label': F2.launch });
          input.addEventListener('change', function () { n.plannedLaunchDate = input.value ? input.value + '-01' : null; refresh(); });
        } else {
          var y0 = Number(now.slice(0, 4)), opts = [];
          for (var y = y0; y <= y0 + 3; y++) for (var q = 1; q <= 4; q++) opts.push({ value: y + '-Q' + q, label: fill(page.quarter, { q: 'Q' + q, y: y }) });
          input = C.select({ label: F2.quarterSelect, value: n.launchQuarter || opts[0].value, className: 'select-sm npd-quarter-sel', options: opts, onChange: function (v) { n.launchQuarter = v; refresh(); } });
        }
        return h('span', { class: 'pd-inline npd-launch-edit' }, seg, input);
      }

      // เดือนเป้าหมายของขั้นงาน (ไม่บังคับ)
      function targetsEditor(n) {
        var F2 = page.fields;
        n.stageTargets = n.stageTargets || {};
        return h('section', { class: 'pd-section' }, h('h3', null, F2.targets), h('div', { class: 'npd-targets-edit' }, STAGES.map(function (s) {
          var input = h('input', { type: 'month', class: 'pm-input npd-target', value: n.stageTargets[s] || '', 'aria-label': page.stages[s], dataset: { stage: s } });
          input.addEventListener('change', function () { if (input.value) n.stageTargets[s] = input.value; else delete n.stageTargets[s]; refresh(); });
          return h('label', { class: 'npd-target-field' }, h('span', { class: 'npd-stage', style: { '--c': C.tokenVar('--npd-' + s) } }, page.stages[s]), input);
        })));
      }

      function refresh() { draw(); }

      function accountsSection(n) {
        var F2 = page.fields;
        var cov = coverage(n);
        var list = n.plannedAccounts || [];
        var rows = list.map(function (a, i) {
          var inPlan = cov.missing.indexOf(a.accountId) < 0;
          var monthCell;
          if (editing) {
            var m = h('input', { type: 'month', class: 'pm-input pm-month', value: a.plannedStartMonth || '', 'aria-label': page.startMonth + ' ' + unitName(a.accountId) });
            m.addEventListener('change', function () { a.plannedStartMonth = m.value || null; refresh(); });
            monthCell = m;
          } else monthCell = a.plannedStartMonth ? F.date(a.plannedStartMonth) : '–';
          var info = calc.unitInfo(store.data(), a.accountId);
          var y = launchYear(n);
          return h('tr', null,
            h('td', null, unitName(a.accountId), info && info.channel ? h('span', { class: 'muted small' }, ' · ' + info.channel.name) : null),
            h('td', null, monthCell),
            h('td', null, inPlan ? h('span', { class: 'badge tag-ok' }, page.inSkuPlan) : h('span', { class: 'badge tag-warn' }, page.notInSkuPlan),
              !editing && info && info.channel && S.PLAN_YEARS.indexOf(y) >= 0 ? h('a', { href: SP.core.paths.to(SP.core.registry.byId('skuPlanning').path), class: 'npd-open', title: fill(page.openSkuPlan, { unit: unitName(a.accountId) }),
                onClick: function (e) { e.preventDefault(); store.set('app.planYear', y); store.set('ui.selection', { channel: info.channel.id, unit: a.accountId }); location.href = SP.core.paths.to(SP.core.registry.byId('skuPlanning').path); } }, ' ›') : null),
            editing ? h('td', { class: 'manage' }, C.trashButton({ label: page.removeAccount, onConfirm: function () { list.splice(i, 1); refresh(); } })) : null);
        });
        var section = h('section', { class: 'pd-section' }, h('h3', null, F2.accounts),
          list.length ? h('table', { class: 'data-grid npd-accounts' }, h('tbody', null, rows)) : h('p', { class: 'muted' }, page.noAccounts));
        if (editing) {
          var used = list.map(function (a) { return a.accountId; });
          var options = [];
          SP.data.channels.filter(function (c) { return c.active !== false; }).forEach(function (ch) {
            calc.unitsOfChannel(store.data(), ch.id, true).forEach(function (u) { if (used.indexOf(u.id) < 0) options.push({ id: u.id, name: ch.name + ' · ' + u.name }); });
          });
          section.appendChild(C.accountPicker({
            label: page.addAccount, placeholder: page.addAccount, emptyLabel: page.noAccounts, options: options,
            onPick: function (id) {
              var l = calc.npdLaunch(n);
              list.push({ accountId: id, plannedStartMonth: l.month || null });
              n.plannedAccounts = list;
              refresh();
            }
          }));
        }
        return section;
      }

      // Workflow ของแผน NPD (Phase 2: ส่ง / อนุมัติ / ส่งกลับ / เปิดให้แก้ไข / ดึงกลับ) + ผลของการอนุมัติ
      function act(id, action, payload) {
        var plans = store.get('master.npdPlans');
        var n = calc.findById(plans, id);
        var res = W.transition(n.workflow || { status: 'draft', history: [] }, action, payload);
        if (!res.ok) return res;
        n.workflow = res.state;
        var entries = [{ entity: 'npd', key: n.productKey, field: 'workflow', oldValue: action, newValue: res.state.status, by: payload.by, at: payload.at }];
        if (action === 'approve') {
          var applied = calc.applyNpdApproval({ products: store.get('master.products'), listings: store.get('master.listings') }, n);
          store.set('master.products', applied.products);
          store.set('master.listings', applied.listings);
          entries.push({ entity: 'product', key: n.productKey, field: 'launchDate', oldValue: null, newValue: n.plannedLaunchDate || n.launchQuarter, by: payload.by, at: payload.at });
        }
        store.set('master.npdPlans', plans);
        store.appendAudit(entries);
        return { ok: true };
      }

      // ------------------------------------------------------------------ เพิ่มแผน NPD (SKU เดิม หรือสร้าง SKU ใหม่ · Product Code จากระบบ)
      function renderCreate() {
        var T = tax();
        var G = SP.data.content.pages.productList.general;
        drawerCtl.head.appendChild(h('div', { class: 'pd-title' }, h('h2', null, page.createTitle)));
        var withPlan = cur().npdPlans.map(function (n) { return n.productKey; });
        var candidates = cur().products.filter(function (p) {
          var k = calc.productKey(p);
          return withPlan.indexOf(k) < 0 && (!p.launchDate || p.launchDate.slice(0, 7) >= now);
        });
        var pick = C.select({ label: page.pickSku, value: '', className: 'select-sm',
          options: [{ value: '', label: page.pickPlaceholder }].concat(candidates.map(function (p) { return { value: calc.productKey(p), label: calc.productKey(p) + ' · ' + p.name }; })), onChange: function () {} });
        var np = { categoryId: null, subCategoryId: null, typeId: null, seriesId: null, subSeriesId: null };
        var name = h('input', { type: 'text', class: 'pm-input pd-input', 'aria-label': page.newName, placeholder: page.newName });
        var launch = h('input', { type: 'month', class: 'pm-input', 'aria-label': page.fields.launch });
        var rsp = h('input', { type: 'number', class: 'pm-input pm-stock', min: '0', step: '0.01', 'aria-label': SP.data.content.pages.productList.create.rspLabel, placeholder: SP.data.content.pages.productList.create.rspLabel });
        var msg = h('p', { class: 'pm-msg', role: 'status' });
        drawerCtl.body.appendChild(h('div', { class: 'pd-body' },
          h('section', { class: 'pd-section' }, h('h3', null, page.pickSku), pick),
          h('section', { class: 'pd-section' }, h('h3', null, page.orNew),
            h('div', { class: 'pd-field' }, h('span', { class: 'pd-label' }, PF.name), name),
            C.cascadeSelect({ tax: T, kind: 'category', value: np, labels: [PF.categoryId, PF.subCategoryId, PF.typeId], placeholder: G.placeholder, onChange: function (v) { Object.keys(v).forEach(function (k) { np[k] = v[k]; }); } }),
            C.cascadeSelect({ tax: T, kind: 'series', value: np, labels: [PF.seriesId, PF.subSeriesId], placeholder: G.placeholder, onChange: function (v) { Object.keys(v).forEach(function (k) { np[k] = v[k]; }); } }),
            h('div', { class: 'pd-field' }, h('span', { class: 'pd-label' }, SP.data.content.pages.productList.create.rspLabel), rsp),
            h('p', { class: 'muted small' }, G.codeNote)),
          h('section', { class: 'pd-section' }, h('div', { class: 'pd-field' }, h('span', { class: 'pd-label' }, page.fields.launch), launch)),
          msg,
          h('div', { class: 'dlg-actions' },
            h('button', { type: 'button', class: 'btn btn-ghost', onClick: function () { drawerCtl.close(); } }, L.dialog.cancel),
            h('button', { type: 'button', class: 'btn btn-primary npd-create-submit', onClick: function () {
              var key = pick.value;
              var at = SP.core.clock.now();
              var seriesId = null;
              var launchDate = launch.value ? launch.value + '-01' : null;
              if (!key) {
                if (!name.value.trim()) { msg.className = 'pm-msg is-error'; msg.textContent = page.nameRequired; return; }
                // CR-30: Product Code จากระบบตาม Type (ไม่มีรหัสชั่วคราวแล้ว)
                var coded = SP.core.catalog.nextCode(draft.products, T, np.typeId, draft.codeCounters);
                if (!coded.ok) { msg.className = 'pm-msg is-error'; msg.textContent = SP.data.content.pages.productList.create.codeErrors[coded.error]; return; }
                var p = { trCode: coded.code, barcode: '', name: name.value.trim(), nameEn: '', shortName: '',
                  categoryId: np.categoryId, subCategoryId: np.subCategoryId, typeId: np.typeId, seriesId: np.seriesId, subSeriesId: np.subSeriesId,
                  packSize: null, uom: SP.data.settings.UOMS[0], image: null, launchDate: launchDate, discontinueMonth: null, clearance: null, note: '',
                  inTrcloud: false, createdAt: at, updatedAt: at };
                draft.products.push(p);
                draft.codeCounters = SP.core.catalog.takeCode(draft.codeCounters, coded.code);
                key = p.trCode;
                seriesId = p.seriesId;
                if (Number(rsp.value) > 0) {
                  var res = calc.setBasePrice(draft.basePrices, { productKey: key, priceType: 'RSP', effectiveMonth: launchDate && launchDate.slice(0, 7) > now ? launchDate.slice(0, 7) : now, price: Number(rsp.value), by: byName(), at: at });
                  if (res.ok) draft.basePrices = res.list;
                }
              } else {
                seriesId = (calc.findProduct(draft.products, key) || {}).seriesId || null;
              }
              var id = 'npd-' + Date.now().toString(36);
              draft.npdPlans.push({ id: id, productKey: key, seriesId: seriesId, stage: 'plan', plannedLaunchDate: launchDate || (calc.findProduct(draft.products, key) || {}).launchDate || null,
                launchQuarter: null, stageTargets: {}, plannedAccounts: [], expectedRsp: Number(rsp.value) > 0 ? Number(rsp.value) : null, owner: '', source: 'PRODUCT',
                note: '', workflow: { status: 'draft', history: [] } });
              creating = false;
              selected = id;
              renderDrawer();
              draw();
            } }, page.createSubmit))));
      }

      draw();
    }

    return render;
  })();

  // ---------- แท็บ Listing (โค้ดเดิมของหน้า Listing) ----------
  var renderListing = (function () {

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
    var newOnly = false;         // CR-35: Chip ลัด เฉพาะสินค้าใหม่ (Request / Planned / NPD)
    var NEW_STATUSES = ['request', 'planned', 'new'];

    function clone(v) { return JSON.parse(JSON.stringify(v)); }
    function ckey(key, unitId) { return key + '|' + unitId; }

    function render(root, ctx) {
      var page = ctx.page;
      var L = SP.data.content.labels;
      // CR-35: มาจากแท็บ NPD (ดู Listing) = ค้นหาเฉพาะสินค้านั้น (ui.listingFocus อ่านครั้งเดียว)
      var focus = store.get('ui.listingFocus');
      if (focus) { store.set('ui.listingFocus', null); var fp = calc.findProduct(store.get('master.products'), focus); query = fp ? calc.productCode(fp) : focus; newOnly = false; }
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
        var by = C.roleName(store.role()), at = SP.core.clock.now();
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
            options: [{ value: '', label: page.statusAll }].concat(calc.PRODUCT_STATUSES.map(function (s) { return { value: s, label: L.status[s] }; })) }),
          h('button', { type: 'button', class: 'btn btn-sm pm-new-only ' + (newOnly ? 'btn-primary' : 'btn-secondary'), 'aria-pressed': newOnly ? 'true' : 'false', title: X.newOnlyTip,
            onClick: function () { newOnly = !newOnly; draw(); } }, X.newOnly),
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
            var text = (key + ' ' + calc.productCode(p) + ' ' + p.name + ' ' + (p.shortName || '') + ' ' + tx.series + ' ' + tx.subSeries).toLowerCase();
            if (q && text.indexOf(q) < 0) return false;
            if (newOnly && NEW_STATUSES.indexOf(calc.productStatus(p, month)) < 0) return false;
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
          var clText = cl ? fill(page.clearanceText, { from: F.date(cl.fromMonth), to: cl.toMonth ? F.date(cl.toMonth) : page.clearanceUntilSold, stock: F.units(cl.stockQty) }) : page.clearanceNone;
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
                  h('span', { class: 'pm-sub' }, h('span', { class: 'pm-sku-code' }, calc.productCode(p)), tx.series ? ' · ' + tx.series : '', ' ', badge, ' ', C.tempNameTag(p))),
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
            h('p', { class: 'muted small' }, page.clearancePriceNote),
            msg,
            h('div', { class: 'dlg-actions' },
              h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: function () { setClearance(p, null); close(); draw(); } }, page.clearanceClear),
              h('button', { type: 'button', class: 'btn btn-primary btn-sm pm-cl-save', onClick: function () {
                // CR-35: เดือนสิ้นสุดว่าง = จนสินค้าหมด · คงราคา Clearance / หน่วยขาย / วันหมดอายุ / หมายเหตุ (แก้ที่หน้า Price & Promotion)
                if (!from.value || (to.value && to.value < from.value)) { msg.className = 'pm-msg is-error'; msg.textContent = page.clearanceError; return; }
                var next = {};
                Object.keys(cl).forEach(function (k) { next[k] = cl[k]; });
                next.fromMonth = from.value; next.toMonth = to.value || null; next.stockQty = Math.max(0, Math.round(Number(stock.value) || 0));
                setClearance(p, next);
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
            })).concat([{ key: 'clearance', label: page.columns.clearance, width: 20, value: function (p) { var cl = p.clearance; return cl ? F.date(cl.fromMonth) + '–' + (cl.toMonth ? F.date(cl.toMonth) : page.clearanceUntilSold) + ' · ' + cl.stockQty : ''; } }]),
            rows: rows
          }]
        };
      }

      draw();
    }

    return render;
  })();

  var TABS = ['npd', 'listing'];
  var SUBPAGE = { npd: 'npdPlan', listing: 'productMaster' };

  function render(root, ctx) {
    var C = SP.core.components;
    var store = SP.core.store;
    var h = C.h;
    var page = ctx.page;
    var P = SP.data.content.pages;
    var hash = (location.hash || '').replace('#', '');
    var tab = TABS.indexOf(hash) >= 0 ? hash : (TABS.indexOf(store.get('ui.launchTab')) >= 0 ? store.get('ui.launchTab') : 'npd');
    var introSlot = h('span', { class: 'll-intro' });   // ปุ่มแก้ไข · ส่งออกของแท็บ (workflowBar ของแต่ละแท็บ)
    if (ctx.intro) ctx.intro.appendChild(introSlot);
    var tabSlot = h('div', { class: 'tool-row ll-tabs no-print' });
    var body = h('div', { class: 'll-body' });
    root.appendChild(tabSlot);
    root.appendChild(body);
    var helpAdded = {};
    function subCtx(t) {
      return {
        entry: ctx.entry, page: P[SUBPAGE[t]], content: ctx.content, year: ctx.year, intro: introSlot, refreshMenu: ctx.refreshMenu,
        addHelp: function (label, build) { if (helpAdded[label] || !ctx.addHelp) return; helpAdded[label] = true; ctx.addHelp(label, build); },
        openListing: function (key) { store.set('ui.listingFocus', key); show('listing', true); }
      };
    }
    function clearTab() {
      C.clear(body);
      C.clear(introSlot);
      // Drawer ของแท็บเดิม (ต่อท้าย body) นำออกก่อนวาดแท็บใหม่
      Array.prototype.forEach.call(document.querySelectorAll('.drawer.npd-drawer'), function (el) {
        var bd = el.previousElementSibling;
        if (bd && bd.classList.contains('drawer-backdrop')) bd.parentNode.removeChild(bd);
        el.parentNode.removeChild(el);
      });
    }
    function drawTabs() {
      C.clear(tabSlot);
      tabSlot.appendChild(C.tabs({ label: page.tabLabel, value: tab, className: 'll-tab-seg',   // CR-40 แท็บขีดเส้นใต้
        options: TABS.map(function (t) { return { value: t, label: page.tabs[t] }; }), onChange: function (v) { show(v); } }));
    }
    function show(t, force) {
      if (t === tab && !force) return;
      if (!C.confirmDiscard(C.unsavedCount())) { drawTabs(); return; }
      tab = t;
      store.set('ui.launchTab', t);
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search + '#' + t);
      paint();
    }
    function paint() {
      clearTab();
      drawTabs();
      document.title = page.title + ' · ' + page.tabs[tab] + ' · ' + SP.data.content.site.name;
      (tab === 'listing' ? renderListing : renderNpd)(body, subCtx(tab));
    }
    paint();
  }

  SP.modules.launchListing = { render: render };
})(window.SP);
