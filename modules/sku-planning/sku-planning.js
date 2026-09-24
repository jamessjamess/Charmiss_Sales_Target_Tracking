/*
 * modules/sku-planning/sku-planning.js — วางแผนยอดขายราย SKU (Bottom-up)
 *
 * หน้าที่:        แถวที่ 1 = แถบบริบท (subChannelPicker ตัวเดียวกับหน้า Phasing): Channel | Account/เขต ‹ › | ผู้รับผิดชอบ ·
 *                 GP (เฉพาะ Channel ที่มี GP) · เป้าหมายทั้งปี · ยอดขายปีก่อน · การเติบโต
 *                 แถวที่ 2 (CR-11) = ค้นหา · จัดกลุ่ม Series | Status | ไม่จัดกลุ่ม (+ พับ/กางทั้งหมด) · Series ▾ · เรียง ▾ ·
 *                 มุมมอง ชิ้น | Sell-out | Net Sales · ⓘ · ☐ แสดงยอดปีก่อน · โหมด · (ปรับแผน) เดือนปัจจุบัน · ? (Legend + กฎ + คีย์ลัด)
 *                 (แก้ไข) แถบแก้ไข = จำนวนรายการที่ยังไม่บันทึก · ค่าตั้งต้น ▾ (วิธีเติมยอดของหน่วย) · คำสั่งของแถวที่เลือก
 *                 ตาราง SKU × 12 เดือน + ทั้งปี (+ ปีก่อน · การเติบโต): (หลายคนในปี) แถวผู้รับผิดชอบ + หัวเดือน + แถวเป้าหมาย ติดบน /
 *                 หัวกลุ่ม (พับได้ ผลรวมของกลุ่ม Checkbox เลือกทั้งกลุ่ม) / แถว SKU สูงคงที่: ชื่อที่แสดง (calc.displayName) + Chip Status เดียว ·
 *                 รหัส · Series / ท้ายตาราง: (ปรับแผน) Plan Baseline · รวมแผน ชิ้น/บาท · แถวคงเหลือ (บาท + % ของเป้าหมาย, ปุ่มปิดส่วนต่าง)
 *                 แถวน้อย = แถวรวมต่อจากแถวสุดท้ายทันที ติดล่างเฉพาะเมื่อแถวล้นกล่อง
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
 *                 ui.seriesFilter, ui.skuShowLastYear, ui.role
 * store เขียน:    plan.<ปี>.sku.<id> (โหมดสร้างแผนครั้งแรก), plan.<ปี>.forecast.<id> (โหมดปรับแผน ไม่เขียนทับ Baseline) ตอนกด บันทึก
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
  var LEGEND_KEYS = ['locked', 'manual', 'system', 'clearance', 'override', 'actual', 'frozen', 'promo', 'anomaly', 'dirty'];
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
    var lastUnit = null;

    function planKeyFor(unitId, mode) { return store.planKey((mode === 'reforecast' ? 'forecast.' : 'sku.') + unitId); }
    // หลังล็อก Baseline: แผนครั้งแรกคำนวณด้วยราคา GP และ Promotion ตอนล็อก (Promotion ที่แก้ภายหลังไม่เปลี่ยน Baseline)
    function baselineSnapshot() {
      var states = store.workflowStates();
      var s = W.stateOf(states, 'baseline');
      return W.isLocked(states) && s.snapshot && s.snapshot.priceList ? s.snapshot : null;
    }
    function gridOpts(mode, target, prior) {
      return { year: year, mode: mode, currentMonth: store.get('ui.currentMonth'), snapshot: mode === 'reforecast' ? null : baselineSnapshot(), target: target, prior: !!prior };
    }
    function dirty() { return editing && draft && saved ? diffCount(draft, saved) : 0; }
    C.guardUnsaved(dirty);
    function guard() { if (!C.confirmDiscard(dirty())) return false; editing = false; return true; }

    function legendItem(k) {
      if (k === 'promo') return h('span', { class: 'legend-item' }, h('span', { class: 'promo-mark' }, 'P'), Lg.promo);
      if (k === 'override') return h('span', { class: 'legend-item' }, h('span', { class: 'swatch sp-override-swatch' }, h('span', { class: 'override-dot' })), Lg.override);
      if (k === 'actual') return h('span', { class: 'legend-item' }, h('span', { class: 'swatch cell-actual' }), Lg.actual);
      if (k === 'frozen') return h('span', { class: 'legend-item' }, h('span', { class: 'swatch cell-frozen' }), '🔒 ' + Lg.frozen);
      if (k === 'dirty') return h('span', { class: 'legend-item' }, h('span', { class: 'swatch sp-dirty-swatch' }), Lg.dirty);
      if (k === 'anomaly') return h('span', { class: 'legend-item' }, h('span', { class: 'anomaly-mark is-up is-legend' }, '▲▼'), fill(Lg.anomaly, { pct: F.pct(S.ANOMALY_PCT, 0) }));
      return h('span', { class: 'legend-item' }, h('span', { class: 'swatch src-' + k }), L.source[k]);
    }
    function helpNode() {
      var K = L.rules;
      return h('div', { class: 'sp-help' },
        h('div', { class: 'legend sp-legend-full' }, LEGEND_KEYS.map(legendItem)),
        h('h3', { class: 'popover-title' }, K.keysTitle),
        h('dl', { class: 'sp-keys' }, K.keys.map(function (k) { return [h('dt', null, k[0]), h('dd', null, k[1])]; })));
    }

    function draw() {
      C.clear(root);
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
      var states = store.workflowStates();
      var locked = W.isLocked(states);
      var mode = locked ? store.get('ui.planMode') : 'initial';
      var reforecast = mode === 'reforecast';
      var step = reforecast ? 'forecast' : 'sku';
      var current = store.get('ui.currentMonth');
      var tree = calc.topDown(data, store.get(store.planKey('topDown')), year);
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
          h('p', null, h('a', { href: SP.core.paths.to(SP.core.registry.byId('topDown').path) }, page.goTopDown))));
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
      var info = calc.unitInfo(data, unitId);
      function gridOf(p, prior) { return calc.skuPlanGrid(data, master, unitId, p, gridOpts(mode, unit.amount, prior)); }
      var first = gridOf(currentPlan(), true);
      var savedGrid = editing ? gridOf(saved, true) : first;

      C.contextStats([
        ch.hasGP ? { label: ch.gpLabel || L.context.gp, value: F.pct(first.gp, 0) } : null,
        { label: L.context.annual, value: F.baht(unit.amount) + ' ' + L.baht },
        { label: C.priorLabel(year - 1), value: F.baht(unit.prior) + ' ' + L.baht },
        { label: L.context.growth, value: C.growthText(unit.growth) }
      ]).forEach(function (el) { ctxBar.appendChild(el); });

      // ค่าของมุมมองปัจจุบัน
      function pick(c) { return view === 'units' ? c.units : view === 'sellOut' ? c.sellOut : c.net; }
      function pickLY(c) { return c.ly == null ? null : view === 'units' ? c.ly : view === 'sellOut' ? c.lySellOut : c.lyNet; }
      function pickTotal(t) { return t ? (view === 'units' ? t.units : view === 'sellOut' ? t.sellOut : t.net) : null; }
      var fmt = money ? F.baht : F.units;

      // ---------- ส่งออก ▾ (ตามมุมมองที่แสดง: ชิ้น / Sell-out / Net Sales) ----------
      var exportBtn = C.exportButton({
        unsaved: dirty,
        build: function (source) {
          var X = page.exportSpec;
          var p = source === 'draft' && editing ? draft : saved;
          var g = gridOf(p, false);
          var mName = view === 'sellOut' ? L.views.sellOut : L.views.net;
          var target = view === 'sellOut' ? targetNet.map(function (t) { return calc.sellOutFromNet(t, g.gp); }) : targetNet;
          var planMoney = view === 'sellOut' ? g.totals.sellOut : g.totals.net;
          var rows = g.rows.map(function (r) {
            return { type: X.rowTypes.sku, sku: r.key, name: r.product.name, series: calc.taxonomyName(master.taxonomy, 'series', r.product.seriesId) || '',
              status: L.status[r.status], start: F.monthYear(r.item.startMonth, year), months: r.cells.map(pick) };
          });
          rows.push({ type: X.rowTypes.planUnits, months: g.totals.units });
          rows.push({ type: fill(X.rowTypes.planMoney, { money: mName }), months: planMoney });
          rows.push({ type: fill(X.rowTypes.target, { money: mName }), months: target });
          rows.push({ type: X.rowTypes.remaining, months: target.map(function (t, m) { return t - planMoney[m]; }) });
          var columns = [{ key: 'type', label: X.cols.rowType }, { key: 'sku', label: X.cols.sku }, { key: 'name', label: X.cols.name, width: 36 },
            { key: 'series', label: X.cols.series }, { key: 'status', label: X.cols.status }, { key: 'start', label: X.cols.start }]
            .concat(F.MONTHS.map(function (mn, i) { return { key: 'm' + i, label: mn, type: 'number', value: function (r) { return r.months[i]; } }; }))
            .concat([{ key: 'total', label: X.cols.total, type: 'number', value: function (r) { return calc.sum(r.months); } }]);
          var status = W.stateOf(store.workflowStates(), step, unitId).status;
          var stamp = C.exportStamp(status);
          return {
            filename: fill(X.file, { year: year, unit: C.fileSafe(unit.name), status: stamp.status, date: stamp.date }),
            sheets: [{ name: X.sheet, header: C.exportHeader(year, status, [[L.exporting.headerUnit, ch.name + ' · ' + unit.name], [L.exporting.headerView, L.views[view] + ' · ' + page.modes[mode]]]), columns: columns, rows: rows }]
          };
        }
      });

      // ---------- Workflow ของหน่วยขายนี้ (แผนครั้งแรกหรือ Re-forecast) ----------
      bar = C.workflowBar({
        step: step, unitId: unitId, year: year, ownerId: owner.id, extra: exportBtn,
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
      function methodOf() { return (currentPlan() && currentPlan().method) || S.DEFAULT_FILL_METHOD; }

      // ---------- แถวที่ 2: ตัวควบคุมตาราง ----------
      var available = calc.availableSkus(master, unitId, currentPlan(), year);
      // a = รายการจาก calc.availableSkus (สินค้าใหม่ที่แผน NPD อนุมัติแล้ว เริ่มขายตามเดือนในแผน NPD)
      function addItems(list) {
        var next = clone(draft);
        list.forEach(function (a) {
          var p = a.product;
          var qty = SP.data.targets.years[year] && p.manualDefault ? p.manualDefault[unitId] || 0 : 0;
          next.items[a.key] = calc.newPlanItem(p, year, qty, a.startMonth);
        });
        replaceDraft(next, true);
      }
      function blockedText(a) { return fill(page.blockedReason, { fields: a.missing.map(function (f) { return L.productFields[f] || f; }).join(', ') }); }
      // ปุ่มเพิ่ม SKU อยู่ในตาราง (หัวคอลัมน์ SKU และแถว NPD) รายการจึงลอยเหนือตาราง (fixed)
      function addPickerFor(list, buttonLabel) {
        return C.searchSelect({
          buttonLabel: buttonLabel, label: buttonLabel, placeholder: page.addSearch, emptyText: page.addEmpty, fixed: true,
          options: list.map(function (a) {
            return { value: a.key, label: a.key + ' · ' + calc.displayName(a.product), sub: calc.taxonomyName(master.taxonomy, 'series', a.product.seriesId), badge: C.statusBadge(a.status),
              disabled: !!a.blocked, reason: a.blocked ? blockedText(a) : null };
          }),
          onChange: function (k) {
            var a = list.filter(function (x) { return x.key === k; })[0];
            if (a && !a.blocked) addItems([a]);
          }
        });
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
              unitName: unit.name, split: calc.moneySplit(g.yearTotal.sellOut, g.gp, ch.hasGP), gp: g.gp,
              gpFrom: info && info.unit.gpFrom, hasGP: ch.hasGP, sellOutMethod: ch.sellOutMethod,
              questionsHref: SP.core.paths.to(SP.core.registry.byId('aboutPrototype').path) + '#open-questions'
            };
          })),
        h('label', { class: 'sp-ly-toggle', title: page.showLastYearTip }, lyBox, h('span', null, page.showLastYear)),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, page.modeLabel),
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
        var M = page.method;
        var methodBtn = h('button', { type: 'button', class: 'btn btn-sm btn-secondary sp-method-btn', title: M.title }, fill(M.button, { name: M.names[methodOf()] }));
        C.popover(methodBtn, function (close) {
          return h('ul', { class: 'menu-list' }, S.FILL_METHODS.map(function (mth) {
            return h('li', null, h('button', {
              type: 'button', class: 'menu-item' + (mth === methodOf() ? ' is-current' : ''), 'aria-current': mth === methodOf() ? 'true' : null,
              onClick: function () {
                close();
                if (mth === methodOf()) return;
                C.dialog({ title: fill(M.confirmTitle, { unit: unit.name, name: M.names[mth] }), lines: [M.confirmLine] }).then(function (r) {
                  if (!r.ok) return;
                  var next = clone(draft);
                  next.method = mth;
                  replaceDraft(next, true);
                });
              }
            }, M.names[mth]));
          }));
        }, { className: 'menu-popover', label: M.title });
        bulkSlot = h('span', { class: 'sp-bulk' });
        controls.appendChild(h('div', { class: 'sp-edit-bar no-print' }, banner, methodBtn, bulkSlot));
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
          h('th', { class: 'row-head sp-sku-head', scope: 'col' }, h('span', null, page.skuColumn), editing ? addPickerFor(available, page.addSku) : null),
          F.MONTHS.map(function (m, i) {
            var reason = reforecast ? calc.cellState(mode, i, current, 'manual').reason : null;
            return h('th', { class: 'num' + (reason ? ' head-' + reason : ''), scope: 'col', dataset: { col: String(i) }, title: reason ? page.cellReasons[reason] : null },
              m, reason === 'actual' ? h('span', { class: 'head-tag' }, page.cellReasons.actual) : reason === 'frozen' ? h('span', { class: 'head-tag' }, '🔒') : null);
          }),
          h('th', { class: 'num col-total', scope: 'col', dataset: { col: '12' }, title: editing && !money ? page.annualTitle : null }, page.totalColumn),
          showLY ? [h('th', { class: 'num col-ly', scope: 'col', title: fill(page.lyColumnTip, { year: year - 1 }) }, page.lyColumn),
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
          editing ? h('button', { type: 'button', class: 'btn btn-sm btn-secondary sp-add-series', onClick: function () { addItems(seriesMissing); } }, page.addSeries) : null]));
      }
      var npdMissing = available.filter(function (a) { return a.npd; });
      var npdCount = first.rows.filter(function (r) { return r.group === 'npd'; }).length;
      function npdInfo() {
        if (series.length || (npdCount && !npdMissing.length)) return null;
        return infoRow('sp-info-npd', [
          !npdCount ? h('span', null, page.npdEmpty) : null,
          npdMissing.length ? h('span', null, fill(page.npdAvailable, { n: npdMissing.length })) : null,
          editing && npdMissing.length ? addPickerFor(npdMissing, page.addNpd) : null]);
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
            for (var m = 0; m < 12; m++) if (calc.validStartMonth(p, m, year)) options.push({ value: String(m), label: F.monthYear(m, year) });
            line2.push(h('label', { class: 'sp-start' }, h('span', null, page.startMonthLabel),
              C.select({
                label: page.startMonthLabel + ' ' + sku, value: String(item.startMonth), options: options,
                onChange: function (v) {
                  var mi = Number(v);
                  if (!calc.validStartMonth(p, mi, year)) { window.alert(page.startMonthInvalid); draw(); return; }
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
              chip, item.stopped ? h('span', { class: 'badge st-ended' }, page.stopped) : null),
            h('span', { class: 'sku-line2' }, line2)),
          menu);

        var tds = row.cells.map(function (cell, m) {
          var input = editing && cell.state.editable && !money;
          var td = h('td', { class: 'num', dataset: { cell: '1', col: String(m), sku: sku, m: String(m) }, tabindex: input ? null : '-1' });
          var ref = { td: td, input: null, text: null, cell: cell };
          // ป้าย P อยู่มุมบนซ้ายภายในช่อง (ก่อนตัวเลข)
          if (cell.promos.length) td.appendChild(h('span', { class: 'promo-mark', 'aria-hidden': 'true' }, 'P'));
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
          return h('span', { title: fill(NP.title, { prior: year - 1, names: names.join(', ') }) },
            fill(NP[k], { year: year, prior: year - 1, n: out[k].keys.length, amount: F.baht(out[k].net) }));
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

      // Tooltip รายช่อง: การคำนวณของช่องนั้นด้วยตัวเลขจริง + ที่มาของค่า + ยอดเดือนเดียวกันปีก่อน
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
            : fill(B.fill.lastYear, { ly: F.units(c.ly), g: F.number(refs.grid.g, 4) }));
        }
        if (c.promos.length) src += ' · ' + fill(B.promo, { days: calc.sum(c.promos.map(function (s) { return s.days; })), total: calc.daysInMonth(year, m) });
        var notes = [c.ly == null ? B.priorNone : fill(B.prior, { ly: F.units(c.ly), diff: F.growth(calc.growth(c.units, c.ly), L.growthNew) })];
        var mark = editing ? calc.anomalyMark(c.units, c.ly) : null;
        if (mark) notes.push(fill(B.anomaly[mark], { pct: F.pct(S.ANOMALY_PCT, 0) }));
        return { heading: heading, breakdown: calc.cellBreakdown(c.units, c.price, c.gp, refs.grid.includesVat), hasGP: ch.hasGP, sourceText: src, notes: notes };
      });

      // Tooltip ชื่อ SKU: ชื่อเต็ม · รหัส · หมวดสินค้า · Series · RSP (+ ราคาเฉพาะ Account / ราคา Dealer) · Status ของปีแผน
      var PT = page.productTip;
      C.hoverTip(scroll, '[data-product]', function (el) {
        var k = el.dataset.product;
        var p = calc.findProduct(master.products, k);
        if (!p) return null;
        var tx = calc.productTaxonomy(master.taxonomy, p);
        var date = store.today();
        var rsp = calc.rspOn(data.priceList, k, date, ch.id);
        var acc = calc.rspOn(data.priceList, k, date, ch.id, unitId);
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
              acc != null && acc !== rsp ? h('li', null, fill(PT.accountPrice, { unit: unit.name }) + ': ' + money2(acc) + ' ' + L.baht) : null,
              dealer != null ? h('li', null, PT.dealer + ': ' + money2(dealer) + ' ' + L.baht) : null,
              row ? h('li', null, fill(PT.status, { year: year }) + ': ' + row.segments.map(function (s) { return L.status[s.status] + ' ' + F.monthRange(s.from, s.to); }).join(' · ')) : null,
              p.note ? h('li', null, p.note) : null)));
      });

      // ---------- คำสั่งของแถว / แถวที่เลือก ----------
      function askScale(skus) {
        var SD = page.scaleDialog;
        var target = skus.length === 1 ? calc.displayName(rowOf(skus[0]).product) : fill(SD.rows, { n: skus.length });
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
      function openCloseGap(initialMonths) {
        var G = page.closeGap;
        var g = refs.grid;
        function monthOpen(m) { return g.rows.some(function (r) { return r.cells[m].state.editable; }); }
        var monthsSel = initialMonths.filter(monthOpen);
        var selKeys = selectedRows().map(function (r) { return r.key; });
        var scope = selKeys.length ? 'selected' : 'all';
        function allKeys() { return g.rows.filter(function (r) { return r.total.units > 0 && r.cells.some(function (c) { return c.state.editable; }); }).map(function (r) { return r.key; }); }
        function keysFor() { return scope === 'selected' ? selKeys : allKeys(); }
        var result = null;
        var preview = h('div', { class: 'cg-preview' });
        function remText(amount) { return C.remainingText(calc.remaining(1, 1 - amount)); }
        function renderPreview() {
          C.clear(preview);
          result = calc.closeGapWrites(g, targetNet, monthsSel, keysFor());
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
        C.dialog({ title: fill(G.title, { unit: unit.name }), body: body, confirmLabel: G.confirm, wide: true }).then(function (r) {
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
        var target = view === 'sellOut' ? targetNet.map(function (t) { return calc.sellOutFromNet(t, g.gp); }) : targetNet;
        var planMoney = view === 'sellOut' ? g.totals.sellOut : g.totals.net;

        function put(tds, values, f) {
          values.forEach(function (v, m) { tds[m].textContent = f(v); });
          tds[12].textContent = f(calc.sum(values));
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
          vals.forEach(function (v, m) { gr.header.cells[m].textContent = fmt(v); });
          gr.header.cells[12].textContent = fmt(calc.sum(vals));
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
        var yearRem = calc.remaining(calc.sum(target), calc.sum(planMoney));
        var G = page.closeGap;
        function remNode(r, onClick, title) {
          var body = [h('span', { class: 'rem-amt' }, r.status === 'ok' ? '✓' : F.baht(r.amount)), h('span', { class: 'rem-pct' }, r.status === 'empty' ? '' : F.pct(r.pct, 1))];
          if (!onClick) return h('span', { class: 'rem-stack' }, body);
          return h('button', { type: 'button', class: 'rem-stack rem-btn', title: title, onClick: onClick }, body);
        }
        var openMonths = [];
        for (var mm = 0; mm < 12; mm++) if (g.rows.some(function (r) { return r.cells[mm].state.editable; })) openMonths.push(mm);
        var cells = target.map(function (t, m) {
          var r = calc.remaining(t, planMoney[m]);
          var can = editing && r.status !== 'ok' && openMonths.indexOf(m) >= 0;
          return {
            node: remNode(r, can ? function () { openCloseGap([m]); } : null, fill(G.monthButton, { month: F.monthFull(m) })),
            className: 'num m-' + r.status, title: F.monthFull(m) + ' · ' + C.remainingText(r)
          };
        });
        var canYear = editing && yearRem.status !== 'ok' && openMonths.length > 0;
        cells.push({ node: remNode(yearRem, canYear ? function () { openCloseGap(openMonths); } : null, G.yearButton), className: 'num col-total m-' + yearRem.status, title: C.remainingText(yearRem) });
        if (showLY) { cells.push({ text: '', className: 'col-ly' }); cells.push({ text: '', className: 'col-growth' }); }
        var nextRem = C.remainingRow({ rem: yearRem, tag: 'tr', cells: cells, className: 'row-remaining' });
        nextRem.firstChild.classList.add('row-head');
        nextRem.firstChild.title = R.remainingNote;
        if (canYear) {
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
