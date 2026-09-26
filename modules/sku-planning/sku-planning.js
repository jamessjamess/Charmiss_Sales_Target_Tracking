/*
 * modules/sku-planning/sku-planning.js — วางแผนยอดขายราย SKU (Bottom-up)
 *
 * หน้าที่:        แถวที่ 1 = แถบบริบท (subChannelPicker ตัวเดียวกับหน้า Phasing): Channel | Account/เขต ‹ › | ผู้รับผิดชอบ ·
 *                 GP (เฉพาะ Channel ที่มี GP) · เป้าหมายทั้งปี · ยอดขายปีก่อน · การเติบโต
 *                 แถวที่ 2 (CR-11) = ค้นหา · จัดกลุ่ม Series | Status | ไม่จัดกลุ่ม (+ พับ/กางทั้งหมด) · Series ▾ · เรียง ▾ ·
 *                 มุมมอง ชิ้น | Sale Amount | Net Sales · ⓘ · ☐ แสดงยอดปีก่อน · โหมด · (ปรับแผน) เดือนปัจจุบัน · ? (Legend + กฎ + คีย์ลัด)
 *                 (แก้ไข) แถบแก้ไข = จำนวนรายการที่ยังไม่บันทึก · ปรับทั้งหน่วยขาย ±% · ปรับให้ครบตามเป้าหมาย · + สร้าง NPD · คำสั่งของแถวที่เลือก
 *                 CR-20: ค่าตั้งต้น = ยอดขายเดือนเดียวกันปีก่อน (ไม่มีเมนูค่าตั้งต้น ▾) · + เพิ่ม SKU = Drawer จาก Product Master ทั้งหมด
 *                 (Listing แล้ว / ยังไม่ได้ Listing → Listing โดย Sales ตอนบันทึก) · + สร้าง NPD = Drawer ฟอร์ม (สิทธิ์ npdFromSku) บันทึกลง Master ทันที
 *                 แถวคงเหลือเมื่อขาดทั้งปี = ข้อความแนะนำ + ปุ่ม · จุด ! = สินค้าจาก Sales ที่ทีม Product แก้ราคาหรือวันเริ่มขาย
 *                 ตาราง SKU × 12 เดือน + ทั้งปี (+ ปีก่อน · การเติบโต): (หลายคนในปี) แถวผู้รับผิดชอบ + หัวเดือน + แถวเป้าหมาย ติดบน /
 *                 หัวกลุ่ม (พับได้ ผลรวมของกลุ่ม Checkbox เลือกทั้งกลุ่ม) / แถว SKU สูงคงที่: ชื่อที่แสดง (calc.displayName) + Chip Status เดียว ·
 *                 รหัส · Series / ท้ายตาราง: (ปรับแผน) Plan Baseline · รวมแผน ชิ้น/บาท · แถวคงเหลือ (บาท + % ของเป้าหมาย, ปุ่มปิดส่วนต่าง)
 *                 แถวน้อย = แถวรวมต่อจากแถวสุดท้ายทันที ติดล่างเฉพาะเมื่อแถวล้นกล่อง
 *                 CR-17 Feature Flags: ปิด baseline / reforecast = ไม่มีตัวเลือกโหมด เป็นแผนครั้งแรกเสมอ (features.planMode) ทุกเดือนแก้ได้
 *                 ยกเว้นล็อก 0 · Legend ไม่มี Actual / ล็อก M+1–M+3 / ปิด approvalWorkflow = workflowBar เหลือ แก้ไข · บันทึก · ยกเลิก
 *                 2 โหมด: สร้างแผนครั้งแรก (แก้ได้ทุกเดือน) / ปรับแผน Re-forecast (ใช้ได้หลังล็อก Baseline:
 *                 Actual ≤ M, ล็อก M+1..M+3, แก้ได้ M+4 ขึ้นไป)
 *                 เปิดมาเป็นโหมดดู → แก้ไข → บันทึก/ยกเลิก / เครื่องมือช่วยกรอก (โหมดแก้ไข): กรอกยอดทั้งปี, ⋯ ของแถว, เลือกหลายแถว,
 *                 ปิดส่วนต่าง (กล่องก่อน/หลัง ต้องยืนยัน), คีย์บอร์ดและ Excel (components.gridKeys), ย้อนกลับ, ▲/▼ ต่างจากปีก่อน
 *                 Workflow ต่อ Account/เขต: แผนครั้งแรก (sku) และ Re-forecast (forecast) ผู้รับผิดชอบจัดทำ → Sales Director อนุมัติ
 *                 สินค้าอ้างด้วย productKey (TR Code หรือรหัสชั่วคราว) เฉพาะ itemType = SALE / ราคาและ GP ต่อช่อง = calc (Promotion ที่ยืนยันแล้ว
 *                 → ราคาเฉพาะ Account → ราคาทั่วไป) หลังล็อก Baseline แผนครั้งแรกใช้ราคาตอนล็อก (snapshot) แผนล่าสุดใช้ราคาปัจจุบัน
 *                 ส่งออก ▾ (Excel / CSV) ตามมุมมองที่แสดง
 * อ่านจาก data/:  channels, history, actuals, settings, targets, content (pages.skuPlanning, labels) + Master ผ่าน store.data()
 *                 (products, listings, priceList, promotions, npdPlans, taxonomy)
 * store อ่าน:     app.planYear, plan.<ปี>.topDown, plan.<ปี>.phasing.<id> (.monthPct), plan.<ปี>.sku.<id> (Baseline),
 *                 plan.<ปี>.forecast.<id>, plan.<ปี>.workflow.*, master.*, ui.selection, ui.planMode, ui.currentMonth,
 *                 ui.seriesFilter, ui.skuShowLastYear, ui.role, master.teams (CR-19 สิทธิ์แก้ไข = สมาชิกทีมของ Channel ผ่าน workflowBar ·
 *                 Channel ในทีมขึ้นก่อนใน subChannelPicker)
 * store เขียน:    plan.<ปี>.sku.<id> (โหมดสร้างแผนครั้งแรก), plan.<ปี>.forecast.<id> (โหมดปรับแผน ไม่เขียนทับ Baseline) ตอนกด บันทึก
 *                 + master.listings (Listing โดย Sales ตอนบันทึก) · master.products / priceList / accountPrices / listings / audit (สร้าง NPD ทันที)
 *                 (รวม method = วิธีเติมยอดของหน่วย) / ui.selection, ui.planMode, ui.currentMonth, ui.seriesFilter, ui.skuShowLastYear /
 *                 plan.<ปี>.workflow.<sku|forecast>.<id> (ผ่าน workflowBar)
 *
 * Status, วิธีเติมยอด, สิทธิ์แก้ช่อง, ชิ้น → Net Sales, ค่าตั้งต้น, การเรียง/จัดกลุ่ม และเครื่องมือช่วยกรอกทั้งหมด
 * (distributeAnnual, scaleRows, closeGap, applyWrites …) มาจาก SP.core.calc — Module เรียกใช้และแสดงผลเท่านั้น
 * คงเหลือเทียบกับเป้าหมายทั้ง Account/เขตเสมอ (ไม่เทียบกับยอดเฉพาะ Series หรือผลค้นหา)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var W = SP.core.workflow;
  var FT = SP.core.features;
  var store = SP.core.store;
  var h = C.h;
  var fill = C.fill;

  // ตัวเลือกของหน้า (ไม่เก็บใน store — ui.skuShowLastYear เก็บ)
  var view = 'units';
  var groupChoice = null;      // null = อัตโนมัติ: Series เมื่อหน่วยมี SKU มากกว่า GROUP_BY_SERIES_ABOVE ไม่งั้น Status
  var sortBy = 'total';
  var collapsed = {};          // '<จัดกลุ่ม>:<กลุ่ม>' → true
  var searchText = '';
  // ลำดับรายการใน Legend (แผง ?)
  var LEGEND_KEYS = ['locked', 'manual', 'system', 'clearance', 'override', 'estimated', 'actual', 'frozen', 'promo', 'anomaly', 'dirty'];
  var REFORECAST_KEYS = ['actual', 'frozen'];   // CR-17: แสดงเฉพาะเมื่อเปิด reforecast
  var SORTS = ['total', 'code', 'name', 'growth'];

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  // จำนวนค่าที่ต่างจากที่บันทึก: ช่อง qty/override ที่เปลี่ยน + SKU ที่เพิ่ม/เอาออก/เปลี่ยนเดือนเริ่มขาย/หยุดวางแผน + วิธีเติมยอด
  function diffCount(a, b) {
    var n = (a.method || null) !== (b.method || null) ? 1 : 0;
    var ia = a.items || {}, ib = b.items || {};
    Object.keys(ia).concat(Object.keys(ib)).filter(function (k, i, arr) { return arr.indexOf(k) === i; }).forEach(function (sku) {
      var x = ia[sku], y = ib[sku];
      if (!x || !y) { n++; return; }
      if (x.startMonth !== y.startMonth || !!x.stopped !== !!y.stopped) n++;
      for (var m = 0; m < 12; m++) {
        if ((x.qty[m] || 0) !== (y.qty[m] || 0) || !!(x.overrides && x.overrides[m]) !== !!(y.overrides && y.overrides[m])) n++;
      }
    });
    return n;
  }

  function cellDirty(a, b, sku, m) {
    var x = a.items[sku], y = b.items[sku];
    if (!x) return false;
    if (!y) return true;
    return (x.qty[m] || 0) !== (y.qty[m] || 0) || !!(x.overrides && x.overrides[m]) !== !!(y.overrides && y.overrides[m]);
  }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var B = L.breakdown;
    var R = page.rows;
    var Lg = page.legend;
    var S = SP.data.settings;
    var year = store.year();
    var data = store.data();
    var nowKey = store.currentKey();
    var editing = false;
    var draft = null;
    var saved = null;
    var bar = null;
    var selected = {};
    var undo = C.undoStack(S.UNDO_LIMIT);
    // CR-20: Drawer เพิ่ม SKU จาก Product Master / สร้าง NPD (ตัวกรองใน Drawer เป็นตัวแปรของหน้า ไม่เก็บ)
    var drawerCtl = C.drawer({ label: page.addDrawer.title, className: 'sp-drawer' });
    var addState = { q: '', series: [], cat: {}, month: 0, picked: {} };
    var lastUnit = null;

    function planKeyFor(unitId, mode) { return store.planKey((mode === 'reforecast' ? 'forecast.' : 'sku.') + unitId); }
    // หลังล็อก Baseline: แผนครั้งแรกคำนวณด้วยราคา GP และ Promotion ตอนล็อก (Promotion ที่แก้ภายหลังไม่เปลี่ยน Baseline)
    function baselineSnapshot() {
      var states = store.workflowStates();
      var s = W.stateOf(states, 'baseline');
      return FT.locked(W.isLocked(states)) && s.snapshot && s.snapshot.priceList ? s.snapshot : null;
    }
    function gridOpts(mode, target, prior) {
      return { year: year, mode: mode, currentMonth: store.get('ui.currentMonth'), snapshot: mode === 'reforecast' ? null : baselineSnapshot(), target: target, prior: !!prior };
    }
    function dirty() { return editing && draft && saved ? diffCount(draft, saved) : 0; }
    C.guardUnsaved(dirty);
    function guard() { if (!C.confirmDiscard(dirty())) return false; editing = false; return true; }

    function legendItem(k) {
      if (k === 'promo') return FT.isOn('promotionCalendar') ? h('span', { class: 'legend-item' }, h('span', { class: 'promo-mark' }, 'P'), Lg.promo) : null;
      if (k === 'override') return h('span', { class: 'legend-item' }, h('span', { class: 'swatch sp-override-swatch' }, h('span', { class: 'override-dot' })), Lg.override);
      if (k === 'estimated') return h('span', { class: 'legend-item' }, h('span', { class: 'swatch sp-override-swatch' }, h('span', { class: 'est-dot' })), Lg.estimated);
      if (k === 'actual') return h('span', { class: 'legend-item' }, h('span', { class: 'swatch cell-actual' }), Lg.actual);
      if (k === 'frozen') return h('span', { class: 'legend-item' }, h('span', { class: 'swatch cell-frozen' }), '🔒 ' + Lg.frozen);
      if (k === 'dirty') return h('span', { class: 'legend-item' }, h('span', { class: 'swatch sp-dirty-swatch' }), Lg.dirty);
      if (k === 'anomaly') return h('span', { class: 'legend-item' }, h('span', { class: 'anomaly-mark is-up is-legend' }, '▲▼'), fill(Lg.anomaly, { pct: F.pct(S.ANOMALY_PCT, 0) }));
      return h('span', { class: 'legend-item' }, h('span', { class: 'swatch src-' + k }), L.source[k]);
    }
    function helpNode() {
      var K = L.rules;
      return h('div', { class: 'sp-help' },
        h('div', { class: 'legend sp-legend-full' }, LEGEND_KEYS.filter(function (k) { return FT.isOn('reforecast') || REFORECAST_KEYS.indexOf(k) < 0; }).map(legendItem)),
        h('h3', { class: 'popover-title' }, K.keysTitle),
        h('dl', { class: 'sp-keys' }, K.keys.map(function (k) { return [h('dt', null, k[0]), h('dd', null, k[1])]; })));
    }

    function draw() {
      C.clear(root);
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
      var states = store.workflowStates();
      // CR-17: ปิด baseline / reforecast = ไม่ล็อก และเป็นแผนครั้งแรกเสมอ (ทุกเดือนแก้ได้ ยกเว้นล็อก 0)
      var locked = FT.locked(W.isLocked(states));
      var mode = FT.planMode(store.get('ui.planMode'), locked);
      var reforecast = mode === 'reforecast';
      var step = reforecast ? 'forecast' : 'sku';
      var current = store.get('ui.currentMonth');
      // CR-19: Sales Manager / Officer เห็น Channel ในทีมของตนก่อน (ค่าเริ่มต้นเมื่อหน่วยที่เลือกไม่อยู่ในแผน)
      var tree = SP.core.permissions.teamFirst(calc.topDown(data, store.get(store.planKey('topDown')), year), SP.core.permissions.user());
      var master = store.master();
      var money = view !== 'units';
      var showLY = !!store.get('ui.skuShowLastYear');
      var seriesOptions = calc.seriesList(master.taxonomy, master.products.filter(function (p) { return (p.itemType || 'SALE') === 'SALE'; }));
      var series = (store.get('ui.seriesFilter') || []).filter(function (s) { return seriesOptions.some(function (o) { return o.value === s; }); });

      // ---------- แถวที่ 1: แถบบริบท ----------
      var picker = C.subChannelPicker({
        tree: tree,
        selection: store.get('ui.selection'),
        guard: guard,
        onSelect: function (channelId, unitId) { store.set('ui.selection', { channel: channelId, unit: unitId }); draw(); ctx.refreshMenu(); },
        // รายการใน Dropdown: คงเหลือทั้งปีของแผน SKU ที่บันทึกแล้ว (โหมดปัจจุบัน) + สถานะ Workflow (ข้อความ)
        remainingOf: function (id) {
          var t = calc.unitTarget(tree, id);
          var g = calc.skuPlanGrid(data, master, id, store.get(planKeyFor(id, mode)), gridOpts(mode, t));
          return calc.remaining(t, g.yearTotal.net);
        },
        workflowOf: function (id) { return W.stateOf(states, step, id).status; },
        ownerOf: function (id) { return C.ownerInfo(data, id, nowKey); }
      });
      var ch = picker.channel;
      var unit = picker.unit;
      var ctxBar = h('div', { class: 'ctx-bar' }, picker);
      root.appendChild(ctxBar);

      if (!ch || !unit) {
        root.appendChild(h('div', { class: 'callout callout-info' },
          h('strong', { class: 'callout-title' }, ch ? fill(page.noUnitsInChannel, { channel: ch.name, year: year, unit: ch.unitLabel }) : page.noChannels),
          h('p', null, h('a', { href: SP.core.paths.to(SP.core.registry.byId('phasing').path) }, page.goTopDown))));   // CR-23: หน่วยขายจัดการที่ Sub-channel Allocation
        return;
      }

      var unitId = unit.id;
      if (lastUnit !== unitId + '|' + mode) { lastUnit = unitId + '|' + mode; searchText = ''; selected = {}; }
      var key = planKeyFor(unitId, mode);
      saved = store.get(key);
      if (!editing || !draft || draft.key !== key) { draft = clone(saved); draft.key = key; }
      function currentPlan() { return editing ? draft : saved; }
      var baselinePlan = store.get(planKeyFor(unitId, 'initial'));
      var defaults = store.getDefault(key);
      var targetNet = calc.phasingTotals(unit.amount, store.get(store.planKey('phasing.' + unitId)).monthPct).amounts;
      var owner = C.ownerInfo(data, unitId, nowKey);
      // CR-20: SKU ที่ยังไม่ได้ Listing แล้วเพิ่มเข้าแผน = Listing โดย Sales (draft.newListings { <productKey>: 'YYYY-MM' }) บันทึกพร้อมแผน
      function masterFor(p) {
        var pend = p && p.newListings ? Object.keys(p.newListings) : [];
        if (!pend.length) return master;
        var m = {};
        Object.keys(master).forEach(function (k) { m[k] = master[k]; });
        m.listings = calc.addSalesListings(master.listings, pend, [unitId], {});
        return m;
      }
      function gridOf(p, prior) { return calc.skuPlanGrid(data, masterFor(p), unitId, p, gridOpts(mode, unit.amount, prior)); }
      var first = gridOf(currentPlan(), true);
      var savedGrid = editing ? gridOf(saved, true) : first;

      var gpLabel = ch.gpLabel || L.context.gp;
      C.contextStats([
        ch.hasGP ? (first.gp == null ? { label: gpLabel, value: h('span', { class: 'text-short' }, fill(L.context.gpMissing, { gpLabel: gpLabel })), title: fill(L.explain.gpMissing, { gpLabel: gpLabel, unit: unit.name }) }
          : { label: gpLabel, value: F.pct(first.gp, 0) }) : null,
        { label: L.context.annual, value: F.baht(unit.amount) + ' ' + L.baht },
        { label: C.priorLabel(year - 1), value: F.baht(unit.prior) + ' ' + L.baht },
        { label: L.context.growth, value: C.growthText(unit.growth) }
      ]).forEach(function (el) { ctxBar.appendChild(el); });

      // ค่าของมุมมองปัจจุบัน
      function pick(c) { return view === 'units' ? c.units : view === 'sellOut' ? c.sellOut : c.net; }
      function pickLY(c) { return c.ly == null ? null : view === 'units' ? c.ly : view === 'sellOut' ? c.lySellOut : c.lyNet; }
      function pickTotal(t) { return t ? (view === 'units' ? t.units : view === 'sellOut' ? t.sellOut : t.net) : null; }
      var fmt = money ? F.baht : F.units;
      // ราคาขายของแถวทั้งปี (ส่งออก): ราคาเดียวทั้งปี = ราคานั้น / เปลี่ยนระหว่างปี = ราคาเฉลี่ย (Sale Amount ÷ ชิ้น) + ที่มาของราคา
      function priceOfRow(r) {
        var open = r.cells.filter(function (c) { return c.source !== 'locked' && c.price > 0; });
        if (!open.length) return { price: null, source: '' };
        var same = open.every(function (c) { return Math.abs(c.price - open[0].price) < 0.005; });
        var src = open.some(function (c) { return c.promos.length; }) ? B.priceSource.promo : B.priceSource[open[0].priceSource] || '';
        var units = r.total.units;
        return { price: same ? open[0].price : units > 0 ? Math.round(r.total.sellOut / units * 100) / 100 : open[0].price,
          source: same ? src : src + ' · ' + page.exportSpec.priceVaries };
      }

      // ---------- ส่งออก ▾ (ตามมุมมองที่แสดง: ชิ้น / Sale Amount / Net Sales) + ราคาขาย · ที่มาของราคา · Sale Amount · GP % · Net Sales ทั้งปี (CR-18) ----------
      var exportBtn = C.exportButton({
        unsaved: dirty,
        build: function (source) {
          var X = page.exportSpec;
          var p = source === 'draft' && editing ? draft : saved;
          var g = gridOf(p, false);
          var mName = view === 'sellOut' ? L.views.sellOut : L.views.net;
          var target = view === 'sellOut' ? targetNet.map(function (t) { return calc.saleFromNet(t, g.gp, ch.hasGP); }) : targetNet;
          var planMoney = view === 'sellOut' ? g.totals.sellOut : g.gpMissing ? g.totals.net.map(function () { return null; }) : g.totals.net;
          var netNa = g.gpMissing;
          var rows = g.rows.map(function (r) {
            var pr = priceOfRow(r);
            return { type: X.rowTypes.sku, sku: r.key, name: r.product.name, series: calc.taxonomyName(master.taxonomy, 'series', r.product.seriesId) || '',
              status: L.status[r.status], start: F.monthYear(r.item.startMonth, year), months: r.cells.map(pick),
              price: pr.price, priceSource: pr.source, sale: r.total.sellOut, gp: ch.hasGP ? g.gp : null, net: netNa ? null : r.total.net };
          });
          rows.push({ type: X.rowTypes.planUnits, months: g.totals.units });
          rows.push({ type: fill(X.rowTypes.planMoney, { money: mName }), months: planMoney, sale: g.yearTotal.sellOut, net: netNa ? null : g.yearTotal.net });
          rows.push({ type: fill(X.rowTypes.target, { money: mName }), months: target });
          rows.push({ type: X.rowTypes.remaining, months: target.map(function (t, m) { return t - planMoney[m]; }) });
          var columns = [{ key: 'type', label: X.cols.rowType }, { key: 'sku', label: X.cols.sku }, { key: 'name', label: X.cols.name, width: 36 },
            { key: 'series', label: X.cols.series }, { key: 'status', label: X.cols.status }, { key: 'start', label: X.cols.start }]
            .concat(F.MONTHS.map(function (mn, i) { return { key: 'm' + i, label: mn, type: 'number', value: function (r) { return r.months[i]; } }; }))
            .concat([{ key: 'total', label: X.cols.total, type: 'number', value: function (r) { return r.months.some(function (v) { return v == null; }) ? null : calc.sum(r.months); } },
              { key: 'price', label: X.cols.price, type: 'price' }, { key: 'priceSource', label: X.cols.priceSource },
              { key: 'sale', label: X.cols.sale, type: 'money' }, { key: 'gp', label: fill(X.cols.gp, { gpLabel: gpLabel }), type: 'pct' }, { key: 'net', label: X.cols.net, type: 'money' }]);
          var status = W.stateOf(store.workflowStates(), step, unitId).status;
          var stamp = C.exportStamp(status);
          return {
            filename: fill(X.file, { year: year, unit: C.fileSafe(unit.name), status: stamp.status, date: stamp.date }).replace(/_+/g, '_'),
            sheets: [{ name: X.sheet, header: C.exportHeader(year, status, [[L.exporting.headerUnit, ch.name + ' · ' + unit.name], [L.exporting.headerView, L.views[view] + ' · ' + page.modes[mode]]]), columns: columns, rows: rows }]
          };
        }
      });

      // ---------- Workflow ของหน่วยขายนี้ (แผนครั้งแรกหรือ Re-forecast) ----------
      bar = C.workflowBar({
        step: step, unitId: unitId, channelId: ch.id, year: year, ownerId: owner.id, extra: exportBtn,
        title: function () { return fill(page.workflowTitle[mode], { unit: unit.name }); },
        editing: function () { return editing; },
        facts: function () { return { remaining: calc.remaining(unit.amount, gridOf(saved, false).yearTotal.net).status }; },
        summary: function () {
          var g = gridOf(saved, false);
          var rem = calc.remaining(unit.amount, g.yearTotal.net);
          return [
            fill(page.summaryLines.plan, { plan: F.baht(g.yearTotal.net) }),
            fill(page.summaryLines.target, { target: F.baht(unit.amount) }),
            fill(page.summaryLines.remaining, { remaining: C.remainingText(rem) }),
            fill(page.summaryLines.skus, { n: g.rows.length })
          ];
        },
        onEdit: function () { editing = true; draft = clone(saved); draft.key = key; selected = {}; undo.clear(); draw(); },
        onSave: function () {
          var next = clone(draft);
          delete next.key;
          var pend = next.newListings || {};
          delete next.newListings;
          var keys = Object.keys(pend).filter(function (k) { return next.items[k]; });
          if (keys.length) {
            var at = new Date().toISOString(), by = C.roleName(store.role());
            var ls = store.get('master.listings');
            keys.forEach(function (k) { ls = calc.addSalesListings(ls, [k], [unitId], { at: at, by: by, fromMonth: pend[k] }); });
            store.set('master.listings', ls);
            store.appendAudit(keys.map(function (k) { return { entity: 'listing', key: k + ' · ' + unit.name, field: 'addedBy', oldValue: null, newValue: 'SALES', by: by, at: at }; }));
            master = store.master();
          }
          store.set(key, next);
          editing = false;
          selected = {};
          undo.clear();
          draw();
        },
        onCancel: function () { editing = false; draft = clone(saved); draft.key = key; selected = {}; undo.clear(); draw(); },
        onChange: function () { draw(); ctx.refreshMenu(); }
      });
      if (ctx.intro) ctx.intro.appendChild(bar);

      // ---------- การแก้ไข (ทุกคำสั่งเก็บประวัติไว้ย้อนกลับได้) ----------
      function record() { undo.push(draft); }
      function writeCells(writes) {
        if (!editing || !writes || !writes.length) return;
        record();
        draft = calc.applyWrites(draft, refs.grid, writes);
        update(true);
      }
      function replaceDraft(next, structural) {
        record();
        draft = next;
        draft.key = key;
        if (structural) draw(); else update(true);
      }
      function undoLast() {
        var prev = undo.pop();
        if (!prev) return;
        var same = Object.keys(prev.items || {}).join('|') === Object.keys(draft.items || {}).join('|') && (prev.method || null) === (draft.method || null);
        draft = prev;
        draft.key = key;
        if (same) update(true); else draw();
      }
      function rowOf(sku) { return refs.grid.rows.filter(function (r) { return r.key === sku; })[0] || null; }
      function selectedRows() { return refs.grid.rows.filter(function (r) { return selected[r.key]; }); }
      // ---------- แถวที่ 2: ตัวควบคุมตาราง ----------
      // CR-20: SKU ที่เพิ่มได้ = Product Master ทั้งหมด (Listing แล้วก่อน · ยังไม่ได้ Listing) calc.addableSkus
      var available = calc.addableSkus(masterFor(currentPlan()), unitId, currentPlan(), year);
      // a = รายการจาก calc.addableSkus / month = เดือนเริ่มขายที่เลือกในหน้าต่างเพิ่ม SKU (แผน NPD ที่อนุมัติแล้วใช้เดือนในแผน NPD)
      //   ยังไม่ได้ Listing → draft.newListings (Listing โดย Sales บันทึกพร้อมแผน)
      function addItems(list, month) {
        var next = clone(draft);
        list.forEach(function (a) {
          var p = calc.planProduct(a.product);
          var qty = SP.data.targets.years[year] && p.manualDefault ? p.manualDefault[unitId] || 0 : 0;
          var start = a.startMonth != null ? a.startMonth : month != null ? month : null;
          next.items[a.key] = calc.newPlanItem(p, year, qty, start);
          if (!a.listed) { next.newListings = next.newListings || {}; next.newListings[a.key] = calc.monthKey(year, next.items[a.key].startMonth); }
        });
        replaceDraft(next, true);
      }
      // CR-20: สินค้าจาก Sales ที่ทีม Product แก้ราคาหรือวันเริ่มขายภายหลัง → จุดเตือน (จำนวนชิ้นในแผนไม่เปลี่ยน Net Sales คำนวณตามราคาใหม่)
      function requestWarn(p) {
        var ch2 = calc.salesRequestChanges(p, data);
        if (!ch2.length) return null;
        var W2 = page.requestChanged;
        return h('span', { class: 'sp-req-warn', role: 'img', 'aria-label': W2.title, title: W2.title + ' · ' + ch2.map(function (x) { return W2.fields[x]; }).join(' · ') }, '!');
      }
      function blockedText(a) { return fill(page.blockedReason, { fields: a.missing.map(function (f) { return L.productFields[f] || f; }).join(', ') }); }
      var canNpd = SP.core.permissions.can(SP.core.permissions.user(), 'edit', { module: 'npdFromSku', channelId: ch.id });
      function addButton(label, npdOnly) {
        return h('button', { type: 'button', class: 'btn btn-sm btn-secondary sp-add-sku', onClick: function () { openAdd(npdOnly); } }, label);
      }
      function npdButton() {
        return editing && canNpd ? h('button', { type: 'button', class: 'btn btn-sm btn-secondary sp-new-npd', onClick: openNpd }, page.npdForm.button) : null;
      }

      // ---------- Drawer: + เพิ่ม SKU จาก Product Master (ค้นหา · Series · หมวดสินค้า · เดือนเริ่มขาย · เลือกหลายรายการ) ----------
      function openAdd(npdOnly) {
        addState.picked = {};
        addState.npdOnly = !!npdOnly;
        renderAdd();
        drawerCtl.open();
      }
      function renderAdd() {
        var A = page.addDrawer;
        C.clear(drawerCtl.head);
        C.clear(drawerCtl.body);
        drawerCtl.head.appendChild(h('div', { class: 'pd-head' }, h('div', { class: 'pd-title' }, h('h2', null, fill(A.title, { unit: unit.name })),
          h('p', { class: 'muted small' }, A.lead))));
        var listBox = h('div', { class: 'sp-add-list' });
        var footText = h('span', { class: 'sp-add-count' });
        var addBtn = h('button', { type: 'button', class: 'btn btn-primary btn-sm sp-add-confirm', onClick: function () {
          var chosen = available.filter(function (a) { return addState.picked[a.key] && !a.blocked; });
          if (!chosen.length) return;
          drawerCtl.close();
          addItems(chosen, addState.month);
        } });
        var search = h('input', { type: 'search', class: 'search-input sp-add-search', placeholder: page.addSearch, 'aria-label': page.addSearch, value: addState.q });
        search.addEventListener('input', function () { addState.q = search.value; renderList(); });
        var month = C.select({ label: A.month, value: String(addState.month), className: 'sp-add-month',
          options: F.MONTHS.map(function (mn, i) { return { value: String(i), label: F.monthYear(i, year) }; }), onChange: function (v) { addState.month = Number(v); } });
        var serF = C.seriesFilter({ options: seriesOptions, value: addState.series, onChange: function (v) { addState.series = v; renderList(); } });
        var catF = C.categoryFilter({ tax: master.taxonomy, kind: 'category', levels: ['CATEGORY', 'SUB_CATEGORY'], value: addState.cat,
          onChange: function (v) { addState.cat = v; renderList(); } });
        drawerCtl.body.appendChild(h('div', { class: 'sp-add-tools' }, search, serF, catF,
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, A.month), month)));
        drawerCtl.body.appendChild(listBox);
        drawerCtl.body.appendChild(h('div', { class: 'sp-add-foot' }, footText, addBtn));
        function catOk(p) {
          var c = addState.cat || {};
          return (!(c.CATEGORY || []).length || c.CATEGORY.indexOf(p.categoryId) >= 0) && (!(c.SUB_CATEGORY || []).length || c.SUB_CATEGORY.indexOf(p.subCategoryId) >= 0);
        }
        function textOk(a) {
          var q = addState.q.trim().toLowerCase();
          return !q || (a.key + ' ' + a.product.name + ' ' + (a.product.shortName || '')).toLowerCase().indexOf(q) >= 0;
        }
        function updateFoot() {
          var n = available.filter(function (a) { return addState.picked[a.key] && !a.blocked; }).length;
          footText.textContent = fill(A.selected, { n: n });
          addBtn.textContent = fill(A.confirm, { n: n });
          addBtn.disabled = !n;
        }
        function renderList() {
          C.clear(listBox);
          var shown = available.filter(function (a) { return (!addState.npdOnly || a.npd) && calc.inSeries(a.product, addState.series) && catOk(a.product) && textOk(a); });
          [['listed', fill(A.groups.listed, { unit: unit.name })], ['unlisted', A.groups.unlisted]].forEach(function (gr) {
            var rows = shown.filter(function (a) { return gr[0] === 'listed' ? a.listed : !a.listed; });
            var pickable = rows.filter(function (a) { return !a.blocked; });
            var all = h('input', { type: 'checkbox', 'aria-label': fill(A.selectAll, { group: gr[1] }), disabled: !pickable.length,
              checked: !!pickable.length && pickable.every(function (a) { return addState.picked[a.key]; }) });
            all.addEventListener('change', function () { pickable.forEach(function (a) { if (all.checked) addState.picked[a.key] = true; else delete addState.picked[a.key]; }); renderList(); });
            listBox.appendChild(h('div', { class: 'sp-add-group' }, h('label', { class: 'sp-add-group-head' }, all, h('strong', null, gr[1]), h('span', { class: 'muted' }, ' · ' + rows.length)),
              gr[0] === 'unlisted' && rows.length ? h('p', { class: 'muted small sp-add-note' }, A.unlistedNote) : null,
              rows.length ? h('ul', { class: 'sp-add-rows' }, rows.map(function (a) {
                var box = h('input', { type: 'checkbox', checked: !!addState.picked[a.key], disabled: !!a.blocked, 'aria-label': a.key + ' ' + calc.displayName(a.product) });
                box.addEventListener('change', function () { if (box.checked) addState.picked[a.key] = true; else delete addState.picked[a.key]; updateFoot(); all.checked = !!pickable.length && pickable.every(function (x) { return addState.picked[x.key]; }); });
                return h('li', null, h('label', { class: 'sp-add-row' + (a.blocked ? ' is-blocked' : '') }, box,
                  h('span', { class: 'sp-add-text' },
                    h('span', { class: 'sp-add-name' }, h('strong', null, a.key), ' · ' + calc.displayName(a.product),
                      a.fromSales ? h('span', { class: 'badge tag-warn sp-from-sales' }, page.fromSales) : null, a.status ? C.statusBadge(a.status) : null),
                    h('span', { class: 'muted small' }, calc.taxonomyName(master.taxonomy, 'series', a.product.seriesId) || page.groupRows.noSeries,
                      a.blocked ? h('span', { class: 'text-short' }, ' · ' + blockedText(a)) : null))));
              })) : h('p', { class: 'muted small' }, page.addEmpty)));
          });
          updateFoot();
        }
        renderList();
      }

      // ---------- Drawer: + สร้าง NPD (Sales Manager / Officer ของ Channel · ใช้ได้ทันทีด้วยรหัสชั่วคราว) ----------
      function openNpd() {
        var N = page.npdForm;
        var tax = master.taxonomy;
        C.clear(drawerCtl.head);
        C.clear(drawerCtl.body);
        drawerCtl.head.appendChild(h('div', { class: 'pd-head' }, h('div', { class: 'pd-title' }, h('h2', null, fill(N.title, { unit: unit.name })),
          h('p', { class: 'muted small' }, N.lead))));
        var catVal = { categoryId: null, subCategoryId: null, typeId: null };
        var name = h('input', { type: 'text', class: 'pm-input pd-input sp-npd-name', 'aria-label': N.fields.name, placeholder: N.fields.name });
        var seriesSel = C.select({ label: N.fields.series, value: '', className: 'sp-npd-series', onChange: function () {},
          options: [{ value: '', label: N.seriesPlaceholder }, { value: 'none', label: N.seriesNone }].concat(calc.seriesList(tax, []).map(function (o) { return { value: o.value, label: o.label }; })) });
        var cat = C.cascadeSelect({ tax: tax, kind: 'category', value: catVal, labels: [L.productFields.categoryId, L.productFields.subCategoryId, L.productFields.typeId],
          placeholder: N.categoryPlaceholder, onChange: function (v) { Object.keys(v).forEach(function (k) { catVal[k] = v[k]; }); } });
        var price = h('input', { type: 'number', class: 'pm-input pm-stock sp-npd-price', min: '0', step: '0.01', 'aria-label': N.fields.price });
        var startDefault = Math.min(11, (Number(store.get('ui.currentMonth')) || 0) + 1);
        var month = C.select({ label: N.fields.month, value: String(startDefault), className: 'sp-npd-month', onChange: function () {},
          options: F.MONTHS.map(function (mn, i) { return { value: String(i), label: F.monthYear(i, year) }; }) });
        var planUnits = ((store.get(store.planKey('topDown')).units || {})[ch.id] || []).filter(function (u) { return u !== unitId; });
        var unitBoxes = planUnits.map(function (u) {
          var info = calc.unitInfo(data, u);
          var box = h('input', { type: 'checkbox', value: u, class: 'sp-npd-unit' });
          return h('label', { class: 'pr-check' }, box, h('span', null, info ? info.unit.name : u));
        });
        var note = h('textarea', { class: 'dlg-note sp-npd-note', rows: '3', 'aria-label': N.fields.note });
        var errs = h('ul', { class: 'pr-errors sp-npd-errors', role: 'alert' });
        function field(label, node, required) { return h('label', { class: 'pd-field' }, h('span', { class: 'pd-label' }, label + (required ? ' *' : '')), h('span', { class: 'pd-value' }, node)); }
        drawerCtl.body.appendChild(h('section', { class: 'pd-section sp-npd-form' },
          field(N.fields.name, name, true), field(N.fields.series, seriesSel, true), field(N.fields.category, cat),
          field(fill(N.fields.price, { unit: unit.name }), h('span', { class: 'num-input' }, price, h('span', { class: 'num-suffix' }, L.baht)), true),
          field(N.fields.month, month, true),
          field(fill(N.fields.units, { channel: ch.name }), unitBoxes.length ? h('span', { class: 'sp-npd-units' }, unitBoxes) : h('span', { class: 'muted small' }, N.noOtherUnits)),
          field(N.fields.note, note),
          h('p', { class: 'muted small' }, N.hint),
          errs,
          h('div', { class: 'pd-inline' },
            h('button', { type: 'button', class: 'btn btn-primary btn-sm sp-npd-save', onClick: save }, N.save),
            h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: function () { drawerCtl.close(); } }, N.cancel))));
        drawerCtl.open();
        name.focus();
        function save() {
          var sv = seriesSel.value;
          var input = {
            name: name.value, seriesId: sv === '' ? '' : sv === 'none' ? null : sv, categoryId: catVal.categoryId, subCategoryId: catVal.subCategoryId, typeId: catVal.typeId,
            price: price.value === '' ? null : Number(price.value), startMonth: Number(month.value), year: year, unitId: unitId,
            unitIds: unitBoxes.map(function (l) { return l.querySelector('input'); }).filter(function (b) { return b.checked; }).map(function (b) { return b.value; }), note: note.value
          };
          var m = store.master();
          var at = new Date().toISOString(), by = C.roleName(store.role());
          var res = calc.createSalesNpd({ products: m.products, priceList: m.priceList, accountPrices: m.accountPrices, listings: m.listings }, input, { by: by, at: at });
          C.clear(errs);
          if (!res.ok) { res.errors.forEach(function (e) { errs.appendChild(h('li', null, N.errors[e])); }); return; }
          store.set('master.products', res.master.products);
          store.set('master.priceList', res.master.priceList);
          store.set('master.accountPrices', res.master.accountPrices);
          store.set('master.listings', res.master.listings);
          store.appendAudit(calc.auditDiff('product', res.key, null, res.product, { by: by, at: at }));
          data = store.data();
          var next = clone(draft);
          next.items[res.key] = calc.newPlanItem(res.product, year, 0, input.startMonth);
          drawerCtl.close();
          replaceDraft(next, true);
        }
      }

      var groupBy = groupChoice || (first.rows.length > S.GROUP_BY_SERIES_ABOVE ? 'series' : 'status');
      var priceChanged = reforecast ? calc.priceChangedMonths(data, baselineSnapshot(), unitId, Object.keys(currentPlan().items || {}), year, current + 1) : 0;

      var search = h('input', { type: 'search', class: 'sp-search', placeholder: page.searchPlaceholder, 'aria-label': page.searchLabel, value: searchText });
      search.addEventListener('input', function () { searchText = search.value; applyVisibility(); });
      var toggleAll = groupBy !== 'none' ? h('button', { type: 'button', class: 'btn btn-sm btn-ghost sp-toggle-all' }) : null;
      var lyBox = h('input', { type: 'checkbox', checked: showLY, 'aria-label': page.showLastYear });
      lyBox.addEventListener('change', function () { store.set('ui.skuShowLastYear', lyBox.checked); draw(); });
      var controls = h('div', { class: 'sp-controls' },
        search,
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, page.groupLabel),
          C.segmented({
            label: page.groupLabel, value: groupBy,
            options: ['series', 'status', 'none'].map(function (v) { return { value: v, label: page.groupBy[v] }; }),
            onChange: function (v) { groupChoice = v; draw(); }
          })),
        toggleAll,
        C.seriesFilter({
          options: seriesOptions, value: series, guard: function () { return true; },
          onChange: function (v) { store.set('ui.seriesFilter', v); draw(); }
        }),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.sortLabel),
          C.select({
            label: page.sortLabel, value: sortBy, className: 'sp-sort',
            options: SORTS.map(function (v) { return { value: v, label: page.sorts[v] }; }),
            onChange: function (v) { sortBy = v; draw(); }
          })),
        h('div', { class: 'field sp-view' }, h('span', { class: 'field-label' }, page.viewLabel),
          C.segmented({
            label: page.viewLabel, value: view,
            options: ['units', 'sellOut', 'net'].map(function (v) { return { value: v, label: L.views[v] }; }),
            onChange: function (v) { view = v; draw(); }
          }),
          C.calcExplainer(function () {
            var g = gridOf(currentPlan(), false);
            return {
              unitName: unit.name, split: calc.moneySplit(g.yearTotal.sellOut, g.gp, ch.hasGP, g.includesVat), gp: g.gp,
              gpLabel: gpLabel, hasGP: ch.hasGP, priceBasis: ch.priceBasis || 'RSP', sellOutMethod: ch.sellOutMethod
            };
          })),
        h('label', { class: 'sp-ly-toggle', title: page.showLastYearTip }, lyBox, h('span', null, page.showLastYear)),
        !FT.isOn('reforecast') ? null : h('div', { class: 'field' }, h('span', { class: 'field-label' }, page.modeLabel),
          C.segmented({
            label: page.modeLabel, value: mode,
            options: ['initial', 'reforecast'].map(function (v) {
              return { value: v, label: page.modes[v], disabled: v === 'reforecast' && !locked, title: v === 'reforecast' && !locked ? page.reforecastLocked : null };
            }),
            onChange: function (v) { if (!guard()) return; store.set('ui.planMode', v); draw(); ctx.refreshMenu(); }
          })),
        reforecast && priceChanged ? h('span', { class: 'badge tag-warn sp-price-changed', title: page.priceChangedTitle, tabindex: '0' }, fill(page.priceChanged, { n: priceChanged })) : null,
        reforecast ? h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.currentMonthLabel),
          C.select({
            label: page.currentMonthLabel, value: String(current),
            options: F.MONTHS.map(function (m, i) { return { value: String(i), label: F.monthYear(i, year) }; }),
            onChange: function (v) { if (!guard()) { draw(); return; } store.set('ui.currentMonth', Number(v)); draw(); }
          })) : null,
        C.rulesButton(helpNode()));
      root.appendChild(controls);

      // ---------- แถบแก้ไข: สถานะ · ค่าตั้งต้น ▾ · คำสั่งของแถวที่เลือก ----------
      var banner = null, bulkSlot = null;
      if (editing) {
        banner = C.editBanner();
        // CR-20: ค่าตั้งต้น = ยอดขายเดือนเดียวกันปีก่อน (ไม่มีเมนูเลือกวิธี) · คำสั่งทั้งหน่วยขาย
        var TB = page.unitTools;
        var scaleAll = h('button', { type: 'button', class: 'btn btn-sm btn-secondary sp-scale-all', title: TB.scaleTitle, onClick: function () {
          askScale(refs.grid.rows.filter(function (r) { return r.cells.some(function (c) { return c.state.editable; }); }).map(function (r) { return r.key; }), TB.scaleTarget);
        } }, TB.scale);
        var fillAll = h('button', { type: 'button', class: 'btn btn-sm btn-secondary sp-fill-target', title: TB.fillTitle, onClick: function () { openCloseGap(openMonthsNow(), true); } }, TB.fill);
        bulkSlot = h('span', { class: 'sp-bulk' });
        controls.appendChild(h('div', { class: 'sp-edit-bar no-print' }, banner, scaleAll, fillAll, npdButton(), bulkSlot));
      }

      // ---------- ตาราง ----------
      var refs = { cells: {}, rowTotal: {}, rowLY: {}, rowGrowth: {}, boxes: {}, groups: [], target: [], baseline: [], planUnits: [], planMoney: [], grid: first, trs: [] };
      var moneyName = view === 'sellOut' ? L.views.sellOut : L.views.net;
      var shownRows = first.rows.filter(function (r) { return calc.inSeries(r.product, series); });
      // เรียงตามค่าที่บันทึกแล้ว (ลำดับไม่กระโดดระหว่างแก้ไข)
      var sortValues = {};
      savedGrid.rows.forEach(function (r) {
        var v = pickTotal(r.total), ly = r.ly ? pickTotal(r.ly) : null;
        sortValues[r.key] = { value: v, growth: calc.growth(v, ly) };
      });
      var groups = calc.groupPlanRows(calc.sortPlanRows(shownRows, sortBy, sortValues), groupBy, master.taxonomy);
      var segs = calc.ownerSegments(data.assignments, data.salespeople, unitId, year);
      var multiOwner = segs.length > 1;
      var span = 14 + (showLY ? 2 : 0);

      function numCells(list, lyList) {
        var tds = [];
        for (var m = 0; m < 13; m++) { var td = h('td', { class: 'num' + (m === 12 ? ' col-total' : '') }); tds.push(td); list.push(td); }
        if (showLY) { var a = h('td', { class: 'num col-ly' }), b = h('td', { class: 'num col-growth' }); tds.push(a, b); if (lyList) lyList.push(a, b); }
        return tds;
      }
      function head(label, title) { return h('th', { class: 'row-head', scope: 'row', title: title }, label); }
      function infoRow(cls, parts) {
        return h('tr', { class: 'sp-info ' + cls }, h('td', { class: 'sp-info-cell', colspan: String(span) }, h('span', { class: 'sp-info-body' }, parts)));
      }

      var thead = h('thead', null,
        // แถบผู้รับผิดชอบรายเดือน แสดงเฉพาะเมื่อมีการเปลี่ยนคนระหว่างปี (คนเดียวทั้งปี = แสดงในแถบบริบทแล้ว)
        multiOwner ? h('tr', { class: 'sp-owner-row' }, h('th', { class: 'row-head', scope: 'row', title: owner.title }, R.owner),
          C.ownerStrip(data, unitId, year, { tag: 'td' }), h('td', { class: 'col-total' }), showLY ? [h('td', { class: 'col-ly' }), h('td', { class: 'col-growth' })] : null) : null,
        h('tr', { class: 'sp-head' },
          h('th', { class: 'row-head sp-sku-head', scope: 'col' }, h('span', null, page.skuColumn), editing ? addButton(page.addSku) : null),
          F.MONTHS.map(function (m, i) {
            var reason = reforecast ? calc.cellState(mode, i, current, 'manual').reason : null;
            return h('th', { class: 'num' + (reason ? ' head-' + reason : ''), scope: 'col', dataset: { col: String(i) }, title: reason ? page.cellReasons[reason] : null },
              m, reason === 'actual' ? h('span', { class: 'head-tag' }, page.cellReasons.actual) : reason === 'frozen' ? h('span', { class: 'head-tag' }, '🔒') : null);
          }),
          h('th', { class: 'num col-total', scope: 'col', dataset: { col: '12' }, title: editing && !money ? page.annualTitle : null }, page.totalColumn),
          showLY ? [h('th', { class: 'num col-ly', scope: 'col', title: fill(page.lyColumnTip, { range: SP.core.clock.rangeLabel(false) }) }, page.lyColumn),
            h('th', { class: 'num col-growth', scope: 'col' }, page.growthColumn)] : null),
        h('tr', { class: 'row-target' },
          head(fill(reforecast ? R.targetBaseline : R.target, { money: moneyName }), view === 'sellOut' ? page.sellOutNote : null),
          numCells(refs.target)));

      var tbody = h('tbody');
      // SKU ของ Series ที่เลือกที่ Listing แล้วแต่ยังไม่อยู่ในแผน
      var seriesMissing = series.length ? available.filter(function (a) { return calc.inSeries(a.product, series) && !a.blocked; }) : [];
      if (seriesMissing.length) {
        tbody.appendChild(infoRow('sp-info-series', [
          h('span', null, fill(page.seriesMissing, { n: seriesMissing.length })),
          editing ? h('button', { type: 'button', class: 'btn btn-sm btn-secondary sp-add-series', onClick: function () { addItems(seriesMissing, 0); } }, page.addSeries) : null]));
      }
      var npdMissing = available.filter(function (a) { return a.npd; });
      var npdCount = first.rows.filter(function (r) { return r.group === 'npd'; }).length;
      function npdInfo() {
        if (series.length || (npdCount && !npdMissing.length)) return null;
        return infoRow('sp-info-npd', [
          !npdCount ? h('span', null, page.npdEmpty) : null,
          npdMissing.length ? h('span', null, fill(page.npdAvailable, { n: npdMissing.length })) : null,
          editing && npdMissing.length ? addButton(page.addNpd, true) : null, npdButton()]);
      }

      function groupName(g) {
        if (g.kind === 'series') return g.key ? calc.taxonomyName(master.taxonomy, 'series', g.key) : page.groupRows.noSeries;
        if (g.kind === 'status') return fill(page.groupRows[g.key], { year: year });
        return page.groupRows.all;
      }

      function groupHeader(g, id) {
        var name = groupName(g);
        var count = h('span', { class: 'sp-group-count' });
        var toggle = h('button', { type: 'button', class: 'sp-group-toggle', 'aria-label': fill(page.groupToggle, { group: name }) },
          h('span', { class: 'sp-caret', 'aria-hidden': 'true' }), h('span', { class: 'sp-group-name' }, name), count);
        toggle.addEventListener('click', function () { collapsed[id] = !collapsed[id]; applyVisibility(); });
        var box = null;
        if (editing) {
          box = h('input', { type: 'checkbox', class: 'sp-check', 'aria-label': fill(page.selectGroup, { group: name }) });
          box.addEventListener('change', function () {
            g.rows.forEach(function (r) { if (box.checked) selected[r.key] = true; else delete selected[r.key]; });
            syncSelection();
          });
        }
        var cells = [];
        var tr = h('tr', { class: 'sp-group', dataset: { group: id } },
          h('th', { class: 'row-head sp-group-cell', scope: 'rowgroup' }, h('span', { class: 'sp-group-inner' }, box, toggle)),
          numCells(cells, cells));
        return { tr: tr, cells: cells, count: count, toggle: toggle, box: box };
      }

      function skuRow(row) {
        var p = row.product;
        var sku = row.key;
        var item = currentPlan().items[sku];
        refs.cells[sku] = [];
        var name = calc.displayName(p);
        var seriesName = calc.taxonomyName(master.taxonomy, 'series', p.seriesId);
        var chip = row.primary ? C.statusBadge(row.primary) : null;
        if (chip) chip.title = row.segments.map(function (s) { return L.status[s.status] + ' ' + F.monthRange(s.from, s.to); }).join(' · ');
        var box = null, menu = null;
        if (editing) {
          box = h('input', { type: 'checkbox', class: 'sp-check', checked: !!selected[sku], 'aria-label': fill(page.selectRow, { sku: sku }) });
          box.addEventListener('change', function () { if (box.checked) selected[sku] = true; else delete selected[sku]; syncSelection(); });
          refs.boxes[sku] = box;
          var RM = page.rowMenu;
          menu = C.menuButton(function () {
            var r = rowOf(sku);
            var stopped = draft.items[sku] && draft.items[sku].stopped;
            return [
              { label: RM.reset, onClick: function () { replaceDraft(calc.resetRows(draft, refs.grid, [sku], defaults)); } },
              { label: RM.lastYear, disabled: !r || !r.ly, onClick: function () { writeCells(calc.lastYearWrites([rowOf(sku)])); } },
              { label: RM.scale, onClick: function () { askScale([sku]); } },
              { label: RM.clear, onClick: function () { writeCells(calc.clearWrites([rowOf(sku)])); } },
              stopped ? null : { label: reforecast ? page.stopTitle : L.removeFromPlan, danger: true, onClick: function () { removeRow(sku); } }
            ];
          }, fill(page.rowMenu.title, { sku: sku }), { className: 'sp-row-menu' });
        }

        var line2 = [h('span', { class: 'sku-code' }, sku), seriesName ? h('span', null, seriesName) : null];
        if (row.group === 'npd') {
          if (editing) {
            var options = [];
            for (var m = 0; m < 12; m++) if (calc.validStartMonth(calc.planProduct(p), m, year)) options.push({ value: String(m), label: F.monthYear(m, year) });
            line2.push(h('label', { class: 'sp-start' }, h('span', null, page.startMonthLabel),
              C.select({
                label: page.startMonthLabel + ' ' + sku, value: String(item.startMonth), options: options,
                onChange: function (v) {
                  var mi = Number(v);
                  if (!calc.validStartMonth(calc.planProduct(p), mi, year)) { window.alert(page.startMonthInvalid); draw(); return; }
                  var next = clone(draft);
                  next.items[sku].startMonth = mi;
                  replaceDraft(next);
                }
              })));
          } else {
            line2.push(h('span', { class: 'sp-start' }, page.startMonthLabel + ' ' + F.monthYear(item.startMonth, year)));
          }
        }

        var th = h('th', { class: 'row-head sp-name', scope: 'row' },
          box,
          h('span', { class: 'sku-text' },
            h('span', { class: 'sku-line1' },
              h('span', { class: 'sku-name', dataset: { product: sku }, tabindex: '0' }, name),
              chip, item.stopped ? h('span', { class: 'badge st-ended' }, page.stopped) : null, requestWarn(p)),
            h('span', { class: 'sku-line2' }, line2)),
          menu);

        var tds = row.cells.map(function (cell, m) {
          var input = editing && cell.state.editable && !money;
          var td = h('td', { class: 'num', dataset: { cell: '1', col: String(m), sku: sku, m: String(m) }, tabindex: input ? null : '-1' });
          var ref = { td: td, input: null, text: null, cell: cell };
          // ป้าย P อยู่มุมบนซ้ายภายในช่อง (ก่อนตัวเลข)
          if (cell.promos.length && FT.isOn('promotionCalendar')) td.appendChild(h('span', { class: 'promo-mark', 'aria-hidden': 'true' }, 'P'));
          if (input) {
            ref.input = C.numberInput({
              value: cell.units, min: 0, grouping: true, commit: true, className: 'cell',
              label: sku + ' ' + F.monthFull(m) + ' (' + L.units + ')',
              onChange: function (v) { writeCells([{ key: sku, m: m, qty: v }]); }
            });
            td.appendChild(ref.input);
          } else {
            if (cell.state.reason === 'frozen') td.appendChild(h('span', { class: 'cell-icon', 'aria-hidden': 'true' }, '🔒'));
            ref.text = h('span', { class: 'cell-value' });
            td.appendChild(ref.text);
          }
          if (showLY) { ref.ly = h('span', { class: 'cell-ly' }); td.appendChild(ref.ly); }
          ref.dot = h('span', { class: 'override-dot', hidden: true });
          td.appendChild(ref.dot);
          // CR-24: จุดมุมล่างขวา = ยอดอ้างอิงของเดือนนี้เป็นประมาณการ (SKU ไม่มียอดจริงรายเดือนของปีก่อนหน้า)
          ref.est = h('span', { class: 'est-dot', hidden: true, 'aria-hidden': 'true' });
          td.appendChild(ref.est);
          ref.mark = h('span', { class: 'anomaly-mark', 'aria-hidden': 'true' });
          td.appendChild(ref.mark);
          refs.cells[sku].push(ref);
          return td;
        });
        // ทั้งปี: โหมดแก้ไข (มุมมองจำนวนชิ้น) กรอกยอดทั้งปีได้ → กระจายไปเดือนที่แก้ไขได้ (calc.annualWrites)
        var totalTd = h('td', { class: 'num col-total', dataset: { col: '12' }, tabindex: '-1' });
        var totalRef = { td: totalTd, input: null, text: null };
        if (editing && !money && row.cells.some(function (c) { return c.state.editable; })) {
          totalRef.input = C.numberInput({
            value: row.total.units, min: 0, grouping: true, commit: true, className: 'cell cell-annual', label: sku + ' ' + page.totalColumn + ' (' + L.units + ')', title: page.annualTitle,
            onChange: function (v) { var r = rowOf(sku); if (r) writeCells(calc.annualWrites(r, v, refs.grid.si)); }
          });
          totalTd.appendChild(totalRef.input);
        } else {
          totalRef.text = h('span', { class: 'cell-value' });
          totalTd.appendChild(totalRef.text);
        }
        if (showLY) { totalRef.ly = h('span', { class: 'cell-ly' }); totalTd.appendChild(totalRef.ly); }
        refs.rowTotal[sku] = totalRef;
        var extra = null;
        if (showLY) {
          refs.rowLY[sku] = h('td', { class: 'num col-ly' });
          refs.rowGrowth[sku] = h('td', { class: 'num col-growth' });
          extra = [refs.rowLY[sku], refs.rowGrowth[sku]];
        }
        var haystack = (sku + ' ' + name + ' ' + (p.name || '') + ' ' + (p.shortName || '')).toLowerCase();
        var tr = h('tr', { class: 'sp-row' + (item.stopped ? ' row-stopped' : ''), dataset: { row: sku, search: haystack } }, th, tds, totalTd, extra);
        refs.trs.push(tr);
        return tr;
      }

      groups.forEach(function (g) {
        var id = g.kind + ':' + g.key;
        var gh = g.kind === 'none' ? null : groupHeader(g, id);
        if (gh) tbody.appendChild(gh.tr);
        var trs = g.rows.map(function (row) { var tr = skuRow(row); tbody.appendChild(tr); return tr; });
        refs.groups.push({ id: id, group: g, header: gh, trs: trs });
        if (g.kind === 'status' && g.key === 'new') { var ni = npdInfo(); if (ni) tbody.appendChild(ni); }
      });
      if (groupBy !== 'status') { var ni2 = npdInfo(); if (ni2) tbody.appendChild(ni2); }
      // SKU ที่มียอดขายปีก่อนแต่ไม่อยู่ในแผน (ที่มาของส่วนต่าง)
      if (!series.length) {
        var out = calc.priorOutsidePlan(data, master, unitId, currentPlan(), year);
        var NP = page.notInPlan;
        var parts = ['discontinued', 'incomplete'].filter(function (k) { return out[k].keys.length; }).map(function (k) {
          var names = out[k].keys.map(function (x) { return calc.displayName(calc.findProduct(master.products, x)) || x; });
          return h('span', { title: fill(NP.title, { names: names.join(', ') }) },
            fill(NP[k], { year: year, n: out[k].keys.length, amount: F.baht(out[k].net) }));
        });
        if (parts.length) tbody.appendChild(infoRow('sp-info-outside', parts));
      }
      var emptyRow = h('tr', { class: 'sp-empty-row', hidden: true }, h('td', { class: 'sp-empty', colspan: String(span) }, page.searchEmpty));
      tbody.appendChild(emptyRow);
      if (!shownRows.length && series.length && !seriesMissing.length) {
        tbody.appendChild(h('tr', null, h('td', { class: 'sp-empty', colspan: String(span) }, page.seriesEmpty)));
      }

      // ท้ายตาราง: ติดล่างเมื่อแถวล้นกล่อง (--i = ลำดับนับจากล่าง ใช้คำนวณตำแหน่ง bottom)
      var seriesMode = series.length > 0;
      var allLabel = fill(L.unitAllText, { unit: ch.unitLabel });
      var lyUnits = [], lyMoney = [];
      var footRows = [
        reforecast ? h('tr', { class: 'row-baseline' }, head(fill(R.planBaseline, { money: moneyName })), numCells(refs.baseline)) : null,
        h('tr', { class: 'row-plan' }, head(seriesMode ? fill(R.unitUnits, { all: allLabel }) : reforecast ? R.latestUnits : R.planUnits), numCells(refs.planUnits, lyUnits)),
        h('tr', { class: 'row-plan-money' }, head(fill(seriesMode ? R.unitMoney : reforecast ? R.latestMoney : R.planMoney, { money: moneyName, all: allLabel })), numCells(refs.planMoney, lyMoney))
      ].filter(Boolean);
      var remRow = h('tr');
      var tfoot = h('tfoot', null, footRows, remRow);
      footRows.forEach(function (tr, i) { tr.style.setProperty('--i', String(footRows.length - i)); });

      var tableEl = h('table', { class: 'sku-grid' + (money ? ' is-money' : '') + (editing ? ' is-editing' : '') + (multiOwner ? ' has-owner' : '') + (showLY ? ' has-ly' : '') },
        h('colgroup', null, h('col', { class: 'col-sku' }), F.MONTHS.map(function () { return h('col'); }), h('col', { class: 'col-sum' }),
          showLY ? [h('col', { class: 'col-ly' }), h('col', { class: 'col-growth' })] : null),
        thead, tbody, tfoot);
      var scroll = h('div', { class: 'sp-scroll' }, tableEl);
      root.appendChild(scroll);
      var firstCell = tableEl.querySelector('tbody td[data-col="0"]');
      if (firstCell && firstCell.getAttribute('tabindex') === '-1') firstCell.setAttribute('tabindex', '0');

      // คีย์บอร์ด เลือกช่วง คัดลอก/วางกับ Excel เติมลง/ขวา ล้างค่า ย้อนกลับ ไฮไลต์แถวและคอลัมน์ (components.gridKeys)
      var keys = C.gridKeys(tableEl, {
        editing: editing && !money, cols: 13, pasteCols: 12,
        valueAt: function (sku, col) {
          var r = rowOf(sku);
          if (!r) return null;
          return col === 12 ? pickTotal(r.total) : pick(r.cells[col]);
        },
        apply: writeCells,
        undo: undoLast
      });

      // Tooltip รายช่อง: การคำนวณของช่องนั้นด้วยตัวเลขจริง + ที่มาของค่า + ยอดอ้างอิงของเดือนนั้น (CR-24: ปีที่ใช้ · ประมาณการ)
      var tip = C.cellBreakdown(scroll, function (td) {
        var sku = td.dataset.sku, m = Number(td.dataset.m);
        var row = rowOf(sku);
        if (!row) return null;
        var c = row.cells[m];
        var heading = calc.displayName(row.product) + ' · ' + F.monthYear(m, year) + ' · ' + unit.name;
        if (c.source === 'locked') return { heading: heading, lockText: B.lockReasons[c.lockReason] || L.source.locked, sourceText: null };
        var src = c.state.reason === 'actual' ? B.actual : c.override ? fill(B.override, { value: F.units(c.systemUnits) }) : L.source[c.source];
        if (c.source === 'system' && !c.override && c.state.reason !== 'actual') {
          src += ' · ' + (row.fill === 'runRate'
            ? fill(B.fill.runRate, { rr: F.units(row.runRate), si: F.number(refs.grid.si[m], 2) })
            : row.fill === 'lastYear' ? fill(B.fill.lastYear, { ly: F.units(c.ly), g: F.number(refs.grid.g, 4) })
            : fill(c.lyEstimated ? B.fill.estimated : B.fill.priorYear, { year: c.lyYear }));
        }
        if (c.promos.length) src += ' · ' + fill(B.promo, { days: calc.sum(c.promos.map(function (s) { return s.days; })), total: calc.daysInMonth(year, m) });
        var notes = [c.ly == null ? B.priorNone : fill(c.lyEstimated ? B.priorEstimated : B.prior, { year: c.lyYear, ly: F.units(c.ly), diff: F.growth(calc.growth(c.units, c.ly), L.growthNew) })];
        if (c.lyEstimated && c.ly != null && !(c.source === 'system' && !c.override && c.state.reason !== 'actual')) notes.push(fill(B.fill.estimated, { year: c.lyYear }));
        var mark = editing ? calc.anomalyMark(c.units, c.ly) : null;
        if (mark) notes.push(fill(B.anomaly[mark], { pct: F.pct(S.ANOMALY_PCT, 0) }));
        return { heading: heading, breakdown: calc.cellBreakdown(c.units, c.price, c.gp, ch.hasGP, refs.grid.includesVat), hasGP: ch.hasGP,
          priceText: c.promos.length ? B.priceSource.promo : B.priceSource[c.priceSource], sourceText: src, notes: notes };
      });

      // Tooltip ชื่อ SKU: ชื่อเต็ม · รหัส · หมวดสินค้า · Series · RSP (+ ราคาต่อ Account / ราคา Dealer) · Status ของปีแผน
      var PT = page.productTip;
      C.hoverTip(scroll, '[data-product]', function (el) {
        var k = el.dataset.product;
        var p = calc.findProduct(master.products, k);
        if (!p) return null;
        var tx = calc.productTaxonomy(master.taxonomy, p);
        var date = store.today();
        var rsp = calc.rspOn(data.priceList, k, date, ch.id);
        var acc = calc.accountPriceOf(data.accountPrices, k, unitId);
        var dealer = ch.priceBasis === 'SELL_IN' ? calc.priceOn(data.priceList, k, 'SELL_IN', ch.id, date, unitId) : null;
        function money2(v) { return F.number(v, Math.abs(v - Math.round(v)) < 0.005 ? 0 : 2); }
        var row = rowOf(k);
        return h('div', { class: 'sku-tip' }, C.productThumb(p, master.taxonomy, { size: 'md' }),
          h('div', { class: 'sku-tip-body' },
            h('div', { class: 'tip-head' }, p.name),
            h('div', { class: 'muted small' }, k),
            h('ul', { class: 'tip-lines' },
              h('li', null, PT.category + ': ' + ([tx.category, tx.subCategory, tx.type].filter(Boolean).join(' › ') || '–')),
              h('li', null, PT.series + ': ' + ([tx.series, tx.subSeries].filter(Boolean).join(' › ') || '–')),
              h('li', null, PT.rsp + ': ' + (rsp != null ? fill(PT.rspValue, { price: money2(rsp), date: F.date(date) }) : PT.noRsp)),
              acc != null ? h('li', null, fill(PT.accountPrice, { unit: unit.name }) + ': ' + money2(acc) + ' ' + L.baht) : null,
              dealer != null ? h('li', null, PT.dealer + ': ' + money2(dealer) + ' ' + L.baht) : null,
              row ? h('li', null, fill(PT.status, { year: year }) + ': ' + row.segments.map(function (s) { return L.status[s.status] + ' ' + F.monthRange(s.from, s.to); }).join(' · ')) : null,
              p.note ? h('li', null, p.note) : null)));
      });

      // ---------- คำสั่งของแถว / แถวที่เลือก ----------
      function askScale(skus, label) {
        var SD = page.scaleDialog;
        var target = label ? fill(label, { unit: unit.name, n: skus.length }) : skus.length === 1 ? calc.displayName(rowOf(skus[0]).product) : fill(SD.rows, { n: skus.length });
        C.promptNumber({ title: fill(SD.title, { target: target }), label: SD.label, suffix: '%', value: 10, hint: SD.hint, invalidText: SD.invalid }).then(function (r) {
          if (!r.ok) return;
          writeCells(calc.scaleRows(refs.grid.rows.filter(function (x) { return skus.indexOf(x.key) >= 0; }), r.value / 100));
        });
      }
      function removeRow(sku) {
        var months = F.monthRange(Math.min(11, current + S.FROZEN_MONTHS + 1), 11);
        C.dialog(reforecast
          ? { title: fill(page.stopConfirm, { sku: sku, unit: unit.name }), lines: [fill(page.stopLine, { months: months })], danger: true, confirmLabel: page.stopTitle }
          : { title: fill(page.removeConfirm, { sku: sku, unit: unit.name, year: year }), lines: [page.removeLine], danger: true, confirmLabel: L.removeFromPlan }
        ).then(function (r) {
          if (!r.ok) return;
          var next = clone(draft);
          if (reforecast) next.items[sku] = calc.stopPlanItem(next.items[sku], current);
          else delete next.items[sku];
          delete selected[sku];
          replaceDraft(next, true);
        });
      }
      function syncSelection() {
        Object.keys(refs.boxes).forEach(function (k) { refs.boxes[k].checked = !!selected[k]; });
        refs.groups.forEach(function (g) {
          if (!g.header || !g.header.box) return;
          var n = g.group.rows.filter(function (r) { return selected[r.key]; }).length;
          g.header.box.checked = n > 0 && n === g.group.rows.length;
          g.header.box.indeterminate = n > 0 && n < g.group.rows.length;
        });
        if (!bulkSlot) return;
        C.clear(bulkSlot);
        var rows = selectedRows();
        if (!rows.length) return;
        var BK = page.bulk;
        function btn(label, fn, cls) { return h('button', { type: 'button', class: 'btn btn-sm ' + (cls || 'btn-secondary'), onClick: fn }, label); }
        bulkSlot.appendChild(h('span', { class: 'sp-bulk-count' }, fill(BK.selected, { n: rows.length })));
        bulkSlot.appendChild(btn(BK.scale, function () { askScale(rows.map(function (r) { return r.key; })); }));
        bulkSlot.appendChild(btn(BK.lastYear, function () { writeCells(calc.lastYearWrites(selectedRows())); }));
        bulkSlot.appendChild(btn(BK.reset, function () { replaceDraft(calc.resetRows(draft, refs.grid, selectedRows().map(function (r) { return r.key; }), defaults)); }));
        bulkSlot.appendChild(btn(BK.clear, function () { writeCells(calc.clearWrites(selectedRows())); }));
        bulkSlot.appendChild(btn(BK.unselect, function () { selected = {}; syncSelection(); }, 'btn-ghost'));
      }

      // ปิดส่วนต่าง: เลือกเดือน + SKU ที่จะปรับ → ตารางก่อน/หลัง → ต้องกดยืนยันเอง (calc.closeGapWrites)
      function openMonthsNow() {
        var out = [];
        for (var mm = 0; mm < 12; mm++) if (refs.grid.rows.some(function (r) { return r.cells[mm].state.editable; })) out.push(mm);
        return out;
      }
      // allRows = ปรับให้ครบตามเป้าหมาย (CR-20): ทุก SKU ที่มีค่ามากกว่า 0 ทุกเดือนที่แก้ได้
      function openCloseGap(initialMonths, allRows) {
        var G = page.closeGap;
        var g = refs.grid;
        function monthOpen(m) { return g.rows.some(function (r) { return r.cells[m].state.editable; }); }
        var monthsSel = initialMonths.filter(monthOpen);
        var selKeys = selectedRows().map(function (r) { return r.key; });
        var scope = selKeys.length && !allRows ? 'selected' : 'all';
        function allKeys() { return g.rows.filter(function (r) { return r.total.units > 0 && r.cells.some(function (c) { return c.state.editable; }); }).map(function (r) { return r.key; }); }
        function keysFor() { return scope === 'selected' ? selKeys : allKeys(); }
        var result = null;
        var preview = h('div', { class: 'cg-preview' });
        function remText(amount) { return C.remainingText(calc.remaining(1, 1 - amount)); }
        function renderPreview() {
          C.clear(preview);
          result = allRows && scope === 'all' ? calc.fillToTargetWrites(g, targetNet, monthsSel, keysFor()) : calc.closeGapWrites(g, targetNet, monthsSel, keysFor());
          // สรุปคงเหลือก่อน/หลังอยู่บนสุด (มองเห็นเสมอ) ตามด้วยตาราง SKU ที่เปลี่ยน
          preview.appendChild(h('ul', { class: 'dlg-lines' },
            h('li', null, fill(G.remBefore, { text: remText(result.before) })),
            h('li', null, fill(G.remAfter, { text: remText(result.after) }))));
          var changed = result.rows.filter(function (r) { return r.after !== r.before; }).sort(function (a, b) { return Math.abs(b.after - b.before) - Math.abs(a.after - a.before); });
          if (!changed.length) { preview.appendChild(h('p', { class: 'dlg-text' }, G.noRows)); }
          else {
            var shown = changed.slice(0, 10);
            preview.appendChild(h('table', { class: 'cg-table' },
              h('thead', null, h('tr', null, h('th', null, G.cols.sku), h('th', { class: 'num' }, G.cols.before), h('th', { class: 'num' }, G.cols.after), h('th', { class: 'num' }, G.cols.change))),
              h('tbody', null, shown.map(function (r) {
                var row = rowOf(r.key);
                return h('tr', null, h('td', null, row ? calc.displayName(row.product) : r.key), h('td', { class: 'num' }, F.units(r.before)), h('td', { class: 'num' }, F.units(r.after)),
                  h('td', { class: 'num' }, F.signedBaht(r.after - r.before)));
              }))));
            if (changed.length > shown.length) preview.appendChild(h('p', { class: 'dlg-text' }, fill(G.more, { n: changed.length - shown.length })));
          }
        }
        var months = h('div', { class: 'cg-months' }, F.MONTHS.map(function (mn, m) {
          var box = h('input', { type: 'checkbox', checked: monthsSel.indexOf(m) >= 0, disabled: !monthOpen(m), 'aria-label': F.monthFull(m) });
          box.addEventListener('change', function () {
            monthsSel = monthsSel.filter(function (x) { return x !== m; });
            if (box.checked) monthsSel.push(m);
            monthsSel.sort(function (a, b) { return a - b; });
            renderPreview();
          });
          return h('label', { class: 'cg-month' }, box, h('span', null, mn));
        }));
        function radio(value, label, disabled) {
          var r = h('input', { type: 'radio', name: 'cg-scope', value: value, checked: scope === value, disabled: !!disabled });
          r.addEventListener('change', function () { if (r.checked) { scope = value; renderPreview(); } });
          return h('label', { class: 'cg-scope' }, r, h('span', null, label));
        }
        var body = h('div', { class: 'cg-body' },
          h('div', { class: 'field-label' }, G.months), months,
          h('div', { class: 'field-label' }, G.skus),
          h('div', { class: 'cg-scopes' }, radio('selected', fill(G.skusSelected, { n: selKeys.length }), !selKeys.length), radio('all', fill(G.skusAll, { n: allKeys().length }))),
          h('p', { class: 'dlg-text' }, G.note),
          preview);
        renderPreview();
        C.dialog({ title: fill(allRows ? page.unitTools.fillDialog : G.title, { unit: unit.name }), body: body, confirmLabel: G.confirm, wide: true }).then(function (r) {
          if (r.ok && result && result.writes.length) writeCells(result.writes);
        });
      }

      // ---------- แสดงเฉพาะแถวที่ตรงกับคำค้น และกลุ่มที่ไม่ได้พับ (ไม่สร้างตารางใหม่) ----------
      function applyVisibility() {
        var q = searchText.trim().toLowerCase();
        var any = false, anyOpen = false;
        refs.groups.forEach(function (g) {
          var shown = 0;
          g.trs.forEach(function (tr) {
            var match = !q || tr.dataset.search.indexOf(q) >= 0;
            tr.hidden = !match || (!q && !!collapsed[g.id]);
            if (match) shown++;
          });
          if (shown) any = true;
          if (!collapsed[g.id]) anyOpen = true;
          if (g.header) {
            g.header.tr.hidden = !!q && !shown;
            g.header.count.textContent = q ? fill(page.groupSearchCount, { n: shown, total: g.trs.length }) : fill(page.groupCount, { n: g.trs.length });
            var open = !!q || !collapsed[g.id];
            g.header.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            g.header.toggle.firstChild.textContent = open ? '▾' : '▸';
          }
        });
        emptyRow.hidden = !q || any;
        if (toggleAll) toggleAll.textContent = anyOpen ? page.collapseAll : page.expandAll;
        keys.clear();
      }
      if (toggleAll) {
        toggleAll.addEventListener('click', function () {
          var anyOpen = refs.groups.some(function (g) { return !collapsed[g.id]; });
          refs.groups.forEach(function (g) { collapsed[g.id] = anyOpen; });
          applyVisibility();
        });
      }

      // ---------- เติมตัวเลข (หลังแก้ค่า ไม่สร้างช่องกรอกใหม่) force = แสดงค่าใหม่แม้ช่องกำลังโฟกัส ----------
      function update(force) {
        var g = gridOf(currentPlan(), true);
        refs.grid = g;
        var target = view === 'sellOut' ? targetNet.map(function (t) { return calc.saleFromNet(t, g.gp, ch.hasGP); }) : targetNet;
        var netNa = g.gpMissing;   // ยังไม่ได้กำหนด GP ของหน่วยขาย → Net Sales คำนวณไม่ได้ (แสดง –)
        var planMoney = view === 'sellOut' ? g.totals.sellOut : netNa ? g.totals.net.map(function () { return null; }) : g.totals.net;

        function put(tds, values, f) {
          values.forEach(function (v, m) { tds[m].textContent = v == null ? '–' : f(v); });
          tds[12].textContent = values.some(function (v) { return v == null; }) ? '–' : f(calc.sum(values));
        }
        function putLY(cells, lyValue, value) {
          if (!showLY || !cells) return;
          cells[0].textContent = lyValue == null ? '–' : fmt(lyValue);
          C.clear(cells[1]).appendChild(C.growthText(calc.growth(value, lyValue)));
        }
        put(refs.target, target, F.baht);

        g.rows.forEach(function (row) {
          var list = refs.cells[row.key];
          if (!list) return;
          row.cells.forEach(function (c, m) {
            var ref = list[m];
            var reason = c.state.reason;
            ref.cell = c;
            ref.td.className = 'num src-' + c.source +
              (reason === 'actual' ? ' cell-actual' : reason === 'frozen' ? ' cell-frozen' : '') +
              (c.override ? ' is-override' : '') + (c.promos.length ? ' has-promo' : '') +
              (editing && cellDirty(draft, saved, row.key, m) ? ' is-dirty-cell' : '');
            ref.dot.hidden = !c.override;
            ref.est.hidden = !(c.lyEstimated && c.ly != null && c.source !== 'locked');
            if (ref.input) ref.input.setValue(c.units, force);
            else ref.text.textContent = fmt(pick(c));
            if (ref.ly) ref.ly.textContent = c.ly == null ? '' : fmt(pickLY(c));
            var mark = editing && c.state.editable ? calc.anomalyMark(c.units, c.ly) : null;
            ref.mark.textContent = mark === 'up' ? '▲' : mark === 'down' ? '▼' : '';
            ref.mark.className = 'anomaly-mark' + (mark ? ' is-' + mark : '');
          });
          var t = refs.rowTotal[row.key];
          if (t.input) t.input.setValue(row.total.units, force);
          else t.text.textContent = fmt(pickTotal(row.total));
          if (t.ly) t.ly.textContent = row.ly ? fmt(pickTotal(row.ly)) : '';
          if (showLY) putLY([refs.rowLY[row.key], refs.rowGrowth[row.key]], row.ly ? pickTotal(row.ly) : null, pickTotal(row.total));
        });

        // ผลรวมของกลุ่ม (ในหัวกลุ่ม)
        refs.groups.forEach(function (gr) {
          if (!gr.header) return;
          var keysIn = gr.group.rows.map(function (r) { return r.key; });
          var rows = g.rows.filter(function (r) { return keysIn.indexOf(r.key) >= 0; });
          var st = calc.sumRows(rows);
          var vals = view === 'units' ? st.units : view === 'sellOut' ? st.sellOut : st.net;
          if (view === 'net' && netNa) vals = vals.map(function () { return null; });
          vals.forEach(function (v, m) { gr.header.cells[m].textContent = fmt(v); });
          gr.header.cells[12].textContent = view === 'net' && netNa ? '–' : fmt(calc.sum(vals));
          if (showLY) {
            var withLy = rows.filter(function (r) { return r.ly; });
            putLY([gr.header.cells[13], gr.header.cells[14]], withLy.length ? calc.sum(withLy.map(function (r) { return pickTotal(r.ly); })) : null, calc.sum(vals));
          }
        });

        put(refs.planUnits, g.totals.units, F.units);
        put(refs.planMoney, planMoney, F.baht);
        putLY(lyUnits, g.priorTotal.units, g.yearTotal.units);
        putLY(lyMoney, view === 'sellOut' ? g.priorTotal.sellOut : g.priorTotal.net, view === 'sellOut' ? g.yearTotal.sellOut : g.yearTotal.net);
        if (reforecast) {
          var b = calc.skuPlanGrid(data, master, unitId, baselinePlan, gridOpts('initial', unit.amount));
          put(refs.baseline, view === 'sellOut' ? b.totals.sellOut : b.totals.net, F.baht);
        }

        // คงเหลือ = เป้าหมายทั้ง Account/เขต − แผนทั้ง Account/เขต (ไม่เทียบกับยอดเฉพาะ Series)
        // รายเดือน: ค่าบวก = ขาด ค่าลบ = เกิน / จัดสรรครบ = ✓ + % ของเป้าหมาย / โหมดแก้ไข: กดช่องเพื่อปิดส่วนต่างของเดือนนั้น
        var yearRem = netNa && view !== 'sellOut' ? calc.emptyRemaining(calc.sum(target)) : calc.remaining(calc.sum(target), calc.sum(planMoney));
        var G = page.closeGap;
        function remNode(r, onClick, title) {
          var body = [h('span', { class: 'rem-amt' }, r.status === 'ok' ? '✓' : r.status === 'empty' && netNa && view !== 'sellOut' ? '–' : F.baht(r.amount)), h('span', { class: 'rem-pct' }, r.status === 'empty' ? '' : F.pct(r.pct, 1))];
          if (!onClick) return h('span', { class: 'rem-stack' }, body);
          return h('button', { type: 'button', class: 'rem-stack rem-btn', title: title, onClick: onClick }, body);
        }
        var openMonths = [];
        for (var mm = 0; mm < 12; mm++) if (g.rows.some(function (r) { return r.cells[mm].state.editable; })) openMonths.push(mm);
        var cells = target.map(function (t, m) {
          var r = planMoney[m] == null ? calc.emptyRemaining(t) : calc.remaining(t, planMoney[m]);
          var can = editing && !netNa && r.status !== 'ok' && openMonths.indexOf(m) >= 0;
          return {
            node: remNode(r, can ? function () { openCloseGap([m]); } : null, fill(G.monthButton, { month: F.monthFull(m) })),
            className: 'num m-' + r.status, title: F.monthFull(m) + ' · ' + C.remainingText(r)
          };
        });
        var canYear = editing && !netNa && yearRem.status !== 'ok' && openMonths.length > 0;
        cells.push({ node: remNode(yearRem, canYear ? function () { openCloseGap(openMonths); } : null, G.yearButton), className: 'num col-total m-' + yearRem.status, title: C.remainingText(yearRem) });
        if (showLY) { cells.push({ text: '', className: 'col-ly' }); cells.push({ text: '', className: 'col-growth' }); }
        var nextRem = C.remainingRow({ rem: yearRem, tag: 'tr', cells: cells, className: 'row-remaining' });
        nextRem.firstChild.classList.add('row-head');
        nextRem.firstChild.title = R.remainingNote;
        if (yearRem.status === 'short' && !(netNa && view !== 'sellOut')) {
          // CR-20: ขาดทั้งปี → แนะนำ ปรับจำนวน หรือเพิ่ม NPD (+ ปุ่มในโหมดแก้ไข)
          nextRem.firstChild.appendChild(h('span', { class: 'sp-rem-hint' }, yearRem.amount >= 5000 ? fill(page.remHint, { amount: F.millionPlain(yearRem.amount) }) : fill(page.remHintSmall, { amount: F.baht(yearRem.amount) })));
          if (canYear) nextRem.firstChild.appendChild(h('button', { type: 'button', class: 'btn btn-sm btn-secondary sp-close-gap sp-fill-target', onClick: function () { openCloseGap(openMonths, true); } }, page.unitTools.fill));
          var nb = npdButton();
          if (nb) nextRem.firstChild.appendChild(nb);
        } else if (canYear) {
          nextRem.firstChild.appendChild(h('button', { type: 'button', class: 'btn btn-sm btn-secondary sp-close-gap', onClick: function () { openCloseGap(openMonths); } }, G.button));
        }
        nextRem.style.setProperty('--i', '0');
        tfoot.replaceChild(nextRem, remRow);
        remRow = nextRem;

        if (banner) banner.update(dirty());
        tip.refresh();
        picker.update();
        keys.refresh();
      }

      update();
      applyVisibility();
      syncSelection();
    }

    draw();
  }

  SP.modules.skuPlanning = { render: render };
})(window.SP);
