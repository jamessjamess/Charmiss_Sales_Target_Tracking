/*
 * modules/sku-planning/sku-planning.js — วางแผนราย SKU (Bottom-up)
 *
 * หน้าที่:        แถวที่ 1 = แถบบริบท (subChannelPicker ตัวเดียวกับหน้า Phasing): Channel | Account/เขต ‹ › | ผู้รับผิดชอบ ·
 *                 GP (เฉพาะ Channel ที่มี GP) · เป้าหมายทั้งปี · ยอดขายปีก่อน · การเติบโต
 *                 แถวที่ 2 = ตัวควบคุมตาราง: Series · มุมมอง ชิ้น | Sell-out | Net Sales · ⓘ · โหมด · (ปรับแผน) เดือนปัจจุบัน ·
 *                 Legend เฉพาะรายการที่มีในตาราง · ? (Legend เต็ม + กฎ Status และวิธีเติมยอด) / (แก้ไข) + เพิ่ม SKU ที่หัวคอลัมน์ SKU
 *                 ตาราง SKU × 12 เดือน: (หลายคนในปี) แถวผู้รับผิดชอบ + หัวเดือน + แถวเป้าหมาย ติดบน /
 *                 กลุ่ม SKU ที่ขายอยู่ · NPD (NPD ว่าง = ข้อความ + ปุ่ม + เพิ่ม NPD) /
 *                 ท้ายตารางติดล่าง: (ปรับแผน) Plan Baseline · (เลือก Series) รวม Series ที่เลือก · รวมแผน ชิ้น/บาท · แถวคงเหลือ
 *                 ความสูงตารางเต็มพื้นที่ที่เหลือของจอ (แถวว่างท้าย tbody รับพื้นที่ส่วนเกิน แถวรวมจึงอยู่ล่างสุดเสมอ)
 *                 2 โหมด: สร้างแผนครั้งแรก (แก้ได้ทุกเดือน) / ปรับแผน Re-forecast (ใช้ได้หลังล็อก Baseline:
 *                 Actual ≤ M, ล็อก M+1..M+3, แก้ได้ M+4 ขึ้นไป)
 *                 เปิดมาเป็นโหมดดู → แก้ไข → บันทึก/ยกเลิก / Tooltip รายช่อง (cellBreakdown) แสดงการคำนวณของช่องนั้น
 *                 Workflow ต่อ Account/เขต: แผนครั้งแรก (sku) และ Re-forecast (forecast) ผู้รับผิดชอบจัดทำ → Sales Director อนุมัติ
 * อ่านจาก data/:  channels, pricing, history, actuals, settings, targets, content (pages.skuPlanning, labels) + Master ผ่าน store.data()
 * store อ่าน:     app.planYear, plan.<ปี>.topDown, plan.<ปี>.phasing.<id> (.monthPct), plan.<ปี>.sku.<id> (Baseline),
 *                 plan.<ปี>.forecast.<id>, plan.<ปี>.workflow.*, master.*, ui.selection, ui.planMode, ui.currentMonth,
 *                 ui.seriesFilter, ui.role
 * store เขียน:    plan.<ปี>.sku.<id> (โหมดสร้างแผนครั้งแรก), plan.<ปี>.forecast.<id> (โหมดปรับแผน ไม่เขียนทับ Baseline) ตอนกด บันทึก
 *                 ui.selection, ui.planMode, ui.currentMonth, ui.seriesFilter / plan.<ปี>.workflow.<sku|forecast>.<id> (ผ่าน workflowBar)
 *
 * Status, วิธีเติมยอด, สิทธิ์แก้ช่อง (cellState), ชิ้น → Net Sales, ผลรวม Series ทั้งหมดมาจาก SP.core.calc
 * คงเหลือเทียบกับเป้าหมายทั้ง Account/เขตเสมอ (ไม่เทียบกับยอดเฉพาะ Series)
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

  var view = 'units';
  var collapsed = { selling: false, npd: false };
  // ลำดับรายการใน Legend (ตารางแสดงเฉพาะที่มีอยู่ แผง ? แสดงทั้งหมด)
  var LEGEND_KEYS = ['locked', 'manual', 'system', 'clearance', 'override', 'actual', 'frozen', 'promo', 'dirty'];

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function statusBadges(row) {
    var out = row.segments
      .filter(function (s) { return s.status === 'npd' || s.status === 'clearance'; })
      .map(function (s) { return C.statusBadge(s.status, F.monthRange(s.from, s.to)); });
    if (!out.length) out.push(C.statusBadge(row.status));
    return out;
  }

  function findProduct(products, sku) { return products.filter(function (p) { return p.sku === sku; })[0] || null; }

  // จำนวนค่าที่ต่างจากที่บันทึก: ช่อง qty/override ที่เปลี่ยน + SKU ที่เพิ่ม/เอาออก/เปลี่ยนเดือนเริ่มขาย/หยุดวางแผน
  function diffCount(a, b) {
    var n = 0;
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

  // รายการ Legend ที่มีอยู่ในตาราง (ตามโหมดและข้อมูลปัจจุบัน)
  function legendKeysOf(rows, editing, dirtyCount) {
    var found = {};
    rows.forEach(function (row) {
      row.cells.forEach(function (c) {
        var reason = c.state.reason;
        if (reason === 'actual' || reason === 'frozen') found[reason] = true;
        else found[c.source] = true;
        if (c.override) found.override = true;
        if (c.promos.length) found.promo = true;
      });
    });
    if (editing && dirtyCount > 0) found.dirty = true;
    return LEGEND_KEYS.filter(function (k) { return found[k]; });
  }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var B = L.breakdown;
    var R = page.rows;
    var Lg = page.legend;
    var year = store.year();
    var data = store.data();
    var nowKey = store.currentKey();
    var editing = false;
    var draft = null;
    var saved = null;
    var bar = null;

    function planKeyFor(unitId, mode) { return store.planKey((mode === 'reforecast' ? 'forecast.' : 'sku.') + unitId); }
    function gridOpts(mode) { return { year: year, mode: mode, currentMonth: store.get('ui.currentMonth') }; }
    function dirty() { return editing && draft && saved ? diffCount(draft, saved) : 0; }
    C.guardUnsaved(dirty);
    function guard() { if (!C.confirmDiscard(dirty())) return false; editing = false; return true; }

    function legendItem(k) {
      if (k === 'promo') return h('span', { class: 'legend-item' }, h('span', { class: 'promo-mark' }, 'P'), Lg.promo);
      if (k === 'override') return h('span', { class: 'legend-item' }, h('span', { class: 'swatch sp-override-swatch' }, h('span', { class: 'override-dot' })), Lg.override);
      if (k === 'actual') return h('span', { class: 'legend-item' }, h('span', { class: 'swatch cell-actual' }), Lg.actual);
      if (k === 'frozen') return h('span', { class: 'legend-item' }, h('span', { class: 'swatch cell-frozen' }), '🔒 ' + Lg.frozen);
      if (k === 'dirty') return h('span', { class: 'legend-item' }, h('span', { class: 'swatch sp-dirty-swatch' }), Lg.dirty);
      return h('span', { class: 'legend-item' }, h('span', { class: 'swatch src-' + k }), L.source[k]);
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
      var seriesOptions = calc.seriesList(master.products);
      var series = (store.get('ui.seriesFilter') || []).filter(function (s) { return seriesOptions.some(function (o) { return o.value === s; }); });

      // ---------- แถวที่ 1: แถบบริบท ----------
      var picker = C.subChannelPicker({
        tree: tree,
        selection: store.get('ui.selection'),
        guard: guard,
        onSelect: function (channelId, unitId) { store.set('ui.selection', { channel: channelId, unit: unitId }); draw(); ctx.refreshMenu(); },
        // รายการใน Dropdown: คงเหลือทั้งปีของแผน SKU ที่บันทึกแล้ว (โหมดปัจจุบัน) + สถานะ Workflow (ข้อความ)
        remainingOf: function (id) {
          var g = calc.skuPlanGrid(data, master, id, store.get(planKeyFor(id, mode)), gridOpts(mode));
          return calc.remaining(calc.unitTarget(tree, id), g.yearTotal.net);
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
          h('strong', { class: 'callout-title' }, ch ? fill(page.noUnitsInChannel, { channel: ch.name, year: year }) : page.noChannels),
          h('p', null, h('a', { href: SP.core.paths.to(SP.core.registry.byId('topDown').path) }, page.goTopDown))));
        return;
      }

      var unitId = unit.id;
      var key = planKeyFor(unitId, mode);
      saved = store.get(key);
      if (!editing || !draft || draft.key !== key) { draft = clone(saved); draft.key = key; }
      var plan = editing ? draft : saved;
      var baselinePlan = store.get(planKeyFor(unitId, 'initial'));
      var targetNet = calc.phasingTotals(unit.amount, store.get(store.planKey('phasing.' + unitId)).monthPct).amounts;
      var owner = C.ownerInfo(data, unitId, nowKey);
      var info = calc.unitInfo(data, unitId);
      var first = calc.skuPlanGrid(data, master, unitId, plan, gridOpts(mode));

      C.contextStats([
        ch.hasGP ? { label: L.context.gp, value: F.pct(first.gp, 0) } : null,
        { label: L.context.annual, value: F.baht(unit.amount) + ' ' + L.baht },
        { label: L.context.prior, value: F.baht(unit.prior) + ' ' + L.baht },
        { label: L.context.growth, value: C.growthText(unit.growth) }
      ]).forEach(function (el) { ctxBar.appendChild(el); });

      // ---------- Workflow ของ Account/เขตนี้ (แผนครั้งแรกหรือ Re-forecast) ----------
      bar = C.workflowBar({
        step: step, unitId: unitId, year: year, ownerId: owner.id,
        title: function () { return fill(page.workflowTitle[mode], { unit: unit.name }); },
        editing: function () { return editing; },
        facts: function () {
          var g = calc.skuPlanGrid(data, master, unitId, saved, gridOpts(mode));
          return { remaining: calc.remaining(unit.amount, g.yearTotal.net).status };
        },
        summary: function () {
          var g = calc.skuPlanGrid(data, master, unitId, saved, gridOpts(mode));
          var rem = calc.remaining(unit.amount, g.yearTotal.net);
          return [
            fill(page.summaryLines.plan, { plan: F.baht(g.yearTotal.net) }),
            fill(page.summaryLines.target, { target: F.baht(unit.amount) }),
            fill(page.summaryLines.remaining, { remaining: C.remainingText(rem) }),
            fill(page.summaryLines.skus, { n: g.rows.length })
          ];
        },
        onEdit: function () { editing = true; draft = clone(saved); draft.key = key; draw(); },
        onSave: function () {
          var next = clone(draft);
          delete next.key;
          store.set(key, next);
          editing = false;
          draw();
        },
        onCancel: function () { editing = false; draft = clone(saved); draft.key = key; draw(); },
        onChange: function () { draw(); ctx.refreshMenu(); }
      });
      if (ctx.intro) ctx.intro.appendChild(bar);

      // ---------- แถวที่ 2: ตัวควบคุมตาราง ----------
      var available = calc.availableSkus(master, unitId, plan, year);
      function addItem(p) {
        var qty = SP.data.targets.years[year] && p.manualDefault ? p.manualDefault[unitId] || 0 : 0;
        draft.items[p.sku] = calc.newPlanItem(p, year, qty);
      }
      // ปุ่มเพิ่ม SKU อยู่ในตาราง (หัวคอลัมน์ SKU และแถว NPD) รายการจึงลอยเหนือตาราง (fixed)
      function addPickerFor(list, buttonLabel) {
        return C.searchSelect({
          buttonLabel: buttonLabel, label: buttonLabel, placeholder: page.addSearch, emptyText: page.addEmpty, fixed: true,
          options: list.map(function (a) {
            return { value: a.product.sku, label: a.product.sku + ' · ' + a.product.name, sub: a.product.series, badge: C.statusBadge(a.status) };
          }),
          onChange: function (sku) { addItem(findProduct(master.products, sku)); draw(); }
        });
      }

      var legendSlot = h('div', { class: 'legend sp-legend' });
      var controls = h('div', { class: 'sp-controls' },
        C.seriesFilter({
          options: seriesOptions, value: series, guard: guard,
          onChange: function (v) { store.set('ui.seriesFilter', v); draw(); }
        }),
        h('div', { class: 'field sp-view' }, h('span', { class: 'field-label' }, page.viewLabel),
          C.segmented({
            label: page.viewLabel, value: view,
            options: ['units', 'sellOut', 'net'].map(function (v) { return { value: v, label: L.views[v] }; }),
            onChange: function (v) { view = v; draw(); }
          }),
          C.calcExplainer(function () {
            var g = calc.skuPlanGrid(data, master, unitId, plan, gridOpts(mode));
            return {
              unitName: unit.name, split: calc.moneySplit(g.yearTotal.sellOut, g.gp, ch.hasGP), gp: g.gp,
              gpFrom: info && info.unit.gpFrom, hasGP: ch.hasGP, sellOutMethod: ch.sellOutMethod,
              questionsHref: SP.core.paths.to(SP.core.registry.byId('aboutPrototype').path) + '#open-questions'
            };
          })),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, page.modeLabel),
          C.segmented({
            label: page.modeLabel, value: mode,
            options: ['initial', 'reforecast'].map(function (v) {
              return { value: v, label: page.modes[v], disabled: v === 'reforecast' && !locked, title: v === 'reforecast' && !locked ? page.reforecastLocked : null };
            }),
            onChange: function (v) { if (!guard()) return; store.set('ui.planMode', v); draw(); ctx.refreshMenu(); }
          })),
        reforecast ? h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.currentMonthLabel),
          C.select({
            label: page.currentMonthLabel, value: String(current),
            options: F.MONTHS.map(function (m, i) { return { value: String(i), label: F.monthYear(i, year) }; }),
            onChange: function (v) { if (!guard()) { draw(); return; } store.set('ui.currentMonth', Number(v)); draw(); }
          })) : null,
        legendSlot,
        C.rulesButton(h('div', { class: 'legend sp-legend-full' }, LEGEND_KEYS.map(legendItem))));
      root.appendChild(controls);

      var banner = editing ? C.editBanner() : null;
      if (banner) root.appendChild(banner);

      // ---------- ตาราง ----------
      var refs = { cells: {}, rowTotal: {}, reset: {}, target: [], baseline: [], seriesUnits: [], seriesMoney: [], planUnits: [], planMoney: [], grid: first };
      var moneyName = view === 'sellOut' ? L.views.sellOut : L.views.net;
      var shownRows = first.rows.filter(function (r) { return calc.inSeries(r.product, series); });
      var segs = calc.ownerSegments(data.assignments, data.salespeople, unitId, year);
      var multiOwner = segs.length > 1;

      function numCells(list) {
        var tds = [];
        for (var m = 0; m < 13; m++) { var td = h('td', { class: 'num' + (m === 12 ? ' col-total' : '') }); tds.push(td); list.push(td); }
        return tds;
      }
      function head(label, title) { return h('th', { class: 'row-head', scope: 'row', title: title }, label); }
      function infoRow(cls, parts) {
        return h('tr', { class: 'sp-info ' + cls }, h('td', { class: 'sp-info-cell', colspan: '14' }, h('span', { class: 'sp-info-body' }, parts)));
      }

      var thead = h('thead', null,
        // แถบผู้รับผิดชอบรายเดือน แสดงเฉพาะเมื่อมีการเปลี่ยนคนระหว่างปี (คนเดียวทั้งปี = แสดงในแถบบริบทแล้ว)
        multiOwner ? h('tr', { class: 'sp-owner-row' }, h('th', { class: 'row-head', scope: 'row', title: owner.title }, R.owner),
          C.ownerStrip(data, unitId, year, { tag: 'td' }), h('td', { class: 'col-total' })) : null,
        h('tr', { class: 'sp-head' },
          h('th', { class: 'row-head sp-sku-head', scope: 'col' }, h('span', null, page.skuColumn), editing ? addPickerFor(available, page.addSku) : null),
          F.MONTHS.map(function (m, i) {
            var reason = reforecast ? calc.cellState(mode, i, current, 'manual').reason : null;
            return h('th', { class: 'num' + (reason ? ' head-' + reason : ''), scope: 'col', title: reason ? page.cellReasons[reason] : null },
              m, reason === 'actual' ? h('span', { class: 'head-tag' }, page.cellReasons.actual) : reason === 'frozen' ? h('span', { class: 'head-tag' }, '🔒') : null);
          }),
          h('th', { class: 'num col-total', scope: 'col' }, page.totalColumn)),
        h('tr', { class: 'row-target' },
          head(fill(reforecast ? R.targetBaseline : R.target, { money: moneyName }), view === 'sellOut' ? page.sellOutNote : null),
          numCells(refs.target)));

      var tbody = h('tbody');
      // SKU ของ Series ที่เลือกที่ Listing แล้วแต่ยังไม่อยู่ในแผน (แทนป้ายเตือนด้านบน)
      var seriesMissing = series.length ? available.filter(function (a) { return calc.inSeries(a.product, series); }) : [];
      if (seriesMissing.length) {
        tbody.appendChild(infoRow('sp-info-series', [
          h('span', null, fill(page.seriesMissing, { n: seriesMissing.length })),
          editing ? h('button', {
            type: 'button', class: 'btn btn-sm btn-secondary sp-add-series',
            onClick: function () { seriesMissing.forEach(function (a) { addItem(a.product); }); draw(); }
          }, page.addSeries) : null]));
      }
      var npdMissing = available.filter(function (a) { return a.status === 'npd'; });
      ['selling', 'npd'].forEach(function (group) {
        var rows = shownRows.filter(function (r) { return r.group === group; });
        if (!rows.length && series.length) return;
        tbody.appendChild(h('tr', { class: 'sp-group' },
          h('th', { class: 'sp-group-cell', scope: 'rowgroup', colspan: '14' },
            h('button', {
              type: 'button', class: 'sp-group-toggle', 'aria-expanded': collapsed[group] ? 'false' : 'true',
              onClick: function () { collapsed[group] = !collapsed[group]; draw(); }
            }, (collapsed[group] ? '▸ ' : '▾ ') + page.groups[group] + ' · ' + fill(page.groupCount, { n: rows.length })))));
        if (collapsed[group]) return;
        rows.forEach(function (row) { tbody.appendChild(skuRow(row)); });
        // NPD: กลุ่มว่าง = ข้อความ / มี NPD ที่ Listing แล้วแต่ยังไม่อยู่ในแผน = จำนวน + (โหมดแก้ไข) + เพิ่ม NPD
        if (group === 'npd' && !series.length && (!rows.length || npdMissing.length)) {
          tbody.appendChild(infoRow('sp-info-npd', [
            !rows.length ? h('span', null, page.npdEmpty) : null,
            npdMissing.length ? h('span', null, fill(page.npdAvailable, { n: npdMissing.length })) : null,
            editing && npdMissing.length ? addPickerFor(npdMissing, page.addNpd) : null]));
        }
      });
      if (!shownRows.length && series.length && !seriesMissing.length) {
        tbody.appendChild(h('tr', null, h('td', { class: 'sp-empty', colspan: '14' }, page.seriesEmpty)));
      }
      // แถวว่างรับพื้นที่ส่วนเกินของจอ (แถวรวมอยู่ล่างสุดของกล่องเสมอ ไม่มีพื้นที่ว่างใต้ตาราง)
      tbody.appendChild(h('tr', { class: 'sp-filler', 'aria-hidden': 'true' }, h('td', { colspan: '14' })));

      function skuRow(row) {
        var p = row.product;
        var sku = p.sku;
        var item = plan.items[sku];
        refs.cells[sku] = [];
        var actions = null;
        if (editing) {
          // ปุ่มคืนค่าระบบ แสดงเมื่อแถวมี Override (update() เปิด/ปิดให้)
          var resetBtn = h('button', {
            type: 'button', class: 'icon-btn sp-icon', title: page.resetRowTitle, 'aria-label': page.resetRowTitle, hidden: !row.hasOverride,
            onClick: function () { item.overrides = item.overrides.map(function () { return false; }); draw(); }
          }, '↺');
          refs.reset[sku] = resetBtn;
          var months = F.monthRange(Math.min(11, current + SP.data.settings.FROZEN_MONTHS + 1), 11);
          actions = h('span', { class: 'sp-actions no-print' },
            resetBtn,
            item.stopped ? null : C.trashButton(reforecast ? {
              label: page.stopTitle,
              confirmTitle: fill(page.stopConfirm, { sku: sku, unit: unit.name }),
              lines: [fill(page.stopLine, { months: months })],
              onConfirm: function () { draft.items[sku] = calc.stopPlanItem(draft.items[sku], current); draw(); }
            } : {
              label: page.removeTitle,
              confirmTitle: fill(page.removeConfirm, { sku: sku, unit: unit.name, year: year }),
              lines: [page.removeLine],
              onConfirm: function () { delete draft.items[sku]; draw(); }
            }));
        }

        var startEl = null;
        if (row.group === 'npd') {
          if (editing) {
            var options = [];
            for (var m = 0; m < 12; m++) if (calc.validStartMonth(p, m, year)) options.push({ value: String(m), label: F.monthYear(m, year) });
            startEl = h('label', { class: 'sp-start' }, h('span', null, page.startMonthLabel),
              C.select({
                label: page.startMonthLabel + ' ' + sku, value: String(item.startMonth), options: options,
                onChange: function (v) {
                  var mi = Number(v);
                  if (!calc.validStartMonth(p, mi, year)) { window.alert(page.startMonthInvalid); draw(); return; }
                  item.startMonth = mi;
                  draw();
                }
              }));
          } else {
            startEl = h('span', { class: 'sp-start' }, page.startMonthLabel + ' ' + F.monthYear(item.startMonth, year));
          }
        }

        var th = h('th', { class: 'row-head', scope: 'row', title: [p.name, p.series, p.note].filter(Boolean).join(' · ') },
          h('span', { class: 'sku-line' },
            h('span', { class: 'sku-name' }, p.name),
            h('span', { class: 'sku-badges' }, statusBadges(row), item.stopped ? h('span', { class: 'badge st-ended' }, page.stopped) : null),
            actions),
          startEl);

        var tds = row.cells.map(function (cell, m) {
          var td = h('td', { class: 'num', dataset: { cell: '1', sku: sku, m: String(m) }, tabindex: editing && cell.state.editable && !money ? null : '0' });
          var ref = { td: td, input: null, text: null, cell: cell };
          // ป้าย P อยู่มุมบนซ้ายภายในช่อง (ก่อนตัวเลข)
          if (cell.promos.length) td.appendChild(h('span', { class: 'promo-mark', 'aria-hidden': 'true' }, 'P'));
          if (editing && cell.state.editable && !money) {
            ref.input = C.numberInput({
              value: cell.units, min: 0, grouping: true, commit: true, className: 'cell',
              label: sku + ' ' + F.monthFull(m) + ' (' + L.units + ')',
              onChange: function (v) {
                var c = ref.cell;
                item.qty[m] = Math.round(v);
                if (c.source === 'system' || c.source === 'clearance') item.overrides[m] = true;
                update();
              }
            });
            td.appendChild(ref.input);
          } else {
            if (cell.state.reason === 'frozen') td.appendChild(h('span', { class: 'cell-icon', 'aria-hidden': 'true' }, '🔒'));
            ref.text = h('span');
            td.appendChild(ref.text);
          }
          ref.dot = h('span', { class: 'override-dot', hidden: true });
          td.appendChild(ref.dot);
          refs.cells[sku].push(ref);
          return td;
        });
        var total = h('td', { class: 'num col-total' });
        refs.rowTotal[sku] = total;
        C.bindArrowNav(refs.cells[sku].filter(function (r) { return r.input; }).map(function (r) { return r.input.input; }));
        return h('tr', { class: item.stopped ? 'row-stopped' : '' }, th, tds, total);
      }

      // ท้ายตาราง: ทุกแถวติดล่าง (--i = ลำดับนับจากล่าง ใช้คำนวณตำแหน่ง bottom)
      var seriesMode = series.length > 0;
      var allLabel = L.unitAll[ch.allocationUnit];
      var footRows = [
        reforecast ? h('tr', { class: 'row-baseline' }, head(fill(R.planBaseline, { money: moneyName })), numCells(refs.baseline)) : null,
        seriesMode ? h('tr', { class: 'row-series' }, head(R.seriesUnits, series.join(', ')), numCells(refs.seriesUnits)) : null,
        seriesMode ? h('tr', { class: 'row-series row-series-money' }, head(fill(R.seriesMoney, { money: moneyName }), series.join(', ')), numCells(refs.seriesMoney)) : null,
        h('tr', { class: 'row-plan' }, head(seriesMode ? fill(R.unitUnits, { all: allLabel }) : reforecast ? R.latestUnits : R.planUnits), numCells(refs.planUnits)),
        h('tr', { class: 'row-plan-money' }, head(fill(seriesMode ? R.unitMoney : reforecast ? R.latestMoney : R.planMoney, { money: moneyName, all: allLabel })), numCells(refs.planMoney))
      ].filter(Boolean);
      var remRow = h('tr');
      var tfoot = h('tfoot', null, footRows, remRow);
      footRows.forEach(function (tr, i) { tr.style.setProperty('--i', String(footRows.length - i)); });

      var tableEl = h('table', { class: 'sku-grid' + (money ? ' is-money' : '') + (editing ? ' is-editing' : '') + (multiOwner ? ' has-owner' : '') },
        h('colgroup', null, h('col', { class: 'col-sku' }), F.MONTHS.map(function () { return h('col'); }), h('col', { class: 'col-sum' })),
        thead, tbody, tfoot);
      var scroll = h('div', { class: 'sp-scroll' }, tableEl);
      root.appendChild(scroll);

      // Tooltip รายช่อง: การคำนวณของช่องนั้นด้วยตัวเลขจริง (เหมือนกันทุกมุมมอง)
      var tip = C.cellBreakdown(scroll, function (td) {
        var sku = td.dataset.sku, m = Number(td.dataset.m);
        var row = refs.grid.rows.filter(function (r) { return r.product.sku === sku; })[0];
        if (!row) return null;
        var c = row.cells[m];
        var heading = row.product.name + ' · ' + F.monthYear(m, year) + ' · ' + unit.name;
        if (c.source === 'locked') return { heading: heading, lockText: B.lockReasons[c.lockReason] || L.source.locked, sourceText: null };
        var src = c.state.reason === 'actual' ? B.actual : c.override ? fill(B.override, { value: F.units(c.systemUnits) }) : L.source[c.source];
        if (c.promos.length) {
          src += ' · ' + fill(B.promo, { days: calc.sum(c.promos.map(function (s) { return s.days; })), total: calc.daysInMonth(year, m) });
        }
        return { heading: heading, breakdown: calc.cellBreakdown(c.units, c.price, refs.grid.gp, refs.grid.includesVat), hasGP: ch.hasGP, sourceText: src };
      });

      // ---------- เติมตัวเลข (หลังแก้ค่า ไม่สร้างช่องกรอกใหม่) ----------
      function update() {
        var g = calc.skuPlanGrid(data, master, unitId, plan, gridOpts(mode));
        refs.grid = g;
        var fmt = money ? F.baht : F.units;
        var pick = view === 'units' ? function (c) { return c.units; } : view === 'sellOut' ? function (c) { return c.sellOut; } : function (c) { return c.net; };
        var target = view === 'sellOut' ? targetNet.map(function (t) { return calc.sellOutFromNet(t, g.gp); }) : targetNet;
        var planMoney = view === 'sellOut' ? g.totals.sellOut : g.totals.net;

        function put(tds, values, f) {
          values.forEach(function (v, m) { tds[m].textContent = f(v); });
          tds[12].textContent = f(calc.sum(values));
        }
        put(refs.target, target, F.baht);

        g.rows.forEach(function (row) {
          var list = refs.cells[row.product.sku];
          if (!list) return;
          row.cells.forEach(function (c, m) {
            var ref = list[m];
            var reason = c.state.reason;
            ref.cell = c;
            ref.td.className = 'num src-' + c.source +
              (reason === 'actual' ? ' cell-actual' : reason === 'frozen' ? ' cell-frozen' : '') +
              (c.override ? ' is-override' : '') + (c.promos.length ? ' has-promo' : '') +
              (editing && cellDirty(draft, saved, row.product.sku, m) ? ' is-dirty-cell' : '');
            ref.dot.hidden = !c.override;
            if (ref.input) ref.input.setValue(c.units);
            else ref.text.textContent = fmt(pick(c));
          });
          refs.rowTotal[row.product.sku].textContent = fmt(calc.sum(row.cells.map(pick)));
          if (refs.reset[row.product.sku]) refs.reset[row.product.sku].hidden = !row.hasOverride;
        });

        if (seriesMode) {
          var st = calc.sumRows(g.rows.filter(function (r) { return calc.inSeries(r.product, series); }));
          put(refs.seriesUnits, st.units, F.units);
          put(refs.seriesMoney, view === 'sellOut' ? st.sellOut : st.net, F.baht);
        }
        put(refs.planUnits, g.totals.units, F.units);
        put(refs.planMoney, planMoney, F.baht);
        if (reforecast) {
          var b = calc.skuPlanGrid(data, master, unitId, baselinePlan, gridOpts('initial'));
          put(refs.baseline, view === 'sellOut' ? b.totals.sellOut : b.totals.net, F.baht);
        }

        // คงเหลือ = เป้าหมายทั้ง Account/เขต − แผนทั้ง Account/เขต (ไม่เทียบกับยอดเฉพาะ Series)
        // รายเดือน: ค่าบวก = ขาด ค่าลบ = เกิน / จัดสรรครบ = ✓ สีช่องตามสถานะของเดือน · ป้ายแถว = สถานะทั้งปี
        var yearRem = calc.remaining(calc.sum(target), calc.sum(planMoney));
        var cells = target.map(function (t, m) {
          var r = calc.remaining(t, planMoney[m]);
          return { text: r.status === 'ok' ? '✓' : F.baht(r.amount), className: 'num m-' + r.status, title: F.monthFull(m) + ' · ' + C.remainingText(r) };
        });
        cells.push({ text: yearRem.status === 'ok' ? '✓' : F.baht(yearRem.amount), className: 'num col-total m-' + yearRem.status, title: C.remainingText(yearRem) });
        var nextRem = C.remainingRow({ rem: yearRem, tag: 'tr', cells: cells, className: 'row-remaining' });
        nextRem.firstChild.classList.add('row-head');
        nextRem.firstChild.title = R.remainingNote;
        nextRem.style.setProperty('--i', '0');
        tfoot.replaceChild(nextRem, remRow);
        remRow = nextRem;

        var n = dirty();
        C.clear(legendSlot);
        legendKeysOf(g.rows.filter(function (r) { return calc.inSeries(r.product, series); }), editing, n).forEach(function (k) { legendSlot.appendChild(legendItem(k)); });
        if (banner) banner.update(n);
        tip.refresh();
        picker.update();
      }

      update();
    }

    draw();
  }

  SP.modules.skuPlanning = { render: render };
})(window.SP);
