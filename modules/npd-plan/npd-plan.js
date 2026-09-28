/*
 * modules/npd-plan/npd-plan.js — Product Master · แผนการเปิดตัวสินค้าใหม่ (NPD)
 *
 * หน้าที่:        CR-30 ติดตามสินค้าใหม่ตั้งแต่วางแผนจนเปิดตัว (ช่วงเวลาต่อเนื่อง ไม่อิงปีแผน)
 *                 KPI: NPD ทั้งหมด · ยังไม่เปิดตัว / เปิดตัวใน 3 เดือน · ตาม Series · หน่วยขายที่ยังไม่อยู่ในแผน SKU (กดแล้วเห็นรายการ + ลิงก์ SKU Planning)
 *                 แถบเครื่องมือ: Timeline | ตาราง · ช่วงเวลา 12 | 18 | 24 เดือน ตั้งแต่ [เดือน] (ค่าเริ่มต้น 18 เดือนจากเดือนปัจจุบันกลาง core/clock.js) ·
 *                   Series · ขั้นงาน · ที่มา · Chip ● คำขอจาก Sales n (กดแล้วกรองเฉพาะคำขอ) · Legend ขั้นงาน · (แก้ไข) + เพิ่ม NPD
 *                 Timeline: คอลัมน์ซ้ายติดซ้าย (รูป · ชื่อย่อ 2 บรรทัด · Product Code · เปิดตัว / หน่วยขาย / ในแผน SKU) · หัวเดือนแสดงปีเมื่อข้ามปี + เส้นแบ่งปี
 *                   แถบขั้นงานต่อกันจากเดือนเป้าหมาย (calc.npdStageSegments · ขั้นปัจจุบันขอบเข้ม) · หมุด ◆ เดือนเปิดตัว (แผนแบบไตรมาส = แถบประทั้งไตรมาส + ?) ·
 *                   แถบจาง NPD 3 เดือนหลังเปิดตัว · ⚠ ขั้นงานที่เลยเดือนเป้าหมายแล้วยังไม่เสร็จ (calc.npdOverdue)
 *                 ตาราง: SKU · Series · ขั้นงาน · เดือนเปิดตัว · Channel / หน่วยขายที่วางแผน · ในแผน SKU · ราคา RSP ที่คาด · ผู้รับผิดชอบ · ที่มา · ใน TRCLOUD
 *                 คลิกแผน → Drawer (ขั้นปัจจุบัน · เดือนเป้าหมาย 4 ขั้น · เดือนเปิดตัวแบบเดือนหรือไตรมาส · ราคา RSP ที่คาด · ผู้รับผิดชอบ · หน่วยขาย + เดือนเริ่มขาย)
 *                 + Workflow ของแผนนั้น (Phase 2 · Flag npdApproval) · บันทึกแล้วมีผลทันที (Phase 1): ตั้งเดือนเปิดตัวและ Listing (calc.applyNpdApproval)
 *                 CR-20 / CR-30: NPD ที่ Sales สร้างจากหน้าวางแผน SKU มีแผน NPD ที่มา จาก Sales (calc.createSalesNpd)
 * อ่านจาก data/:  channels, settings, content (pages.npdPlan, labels) + Master ผ่าน store.data()
 * store อ่าน:     master.npdPlans, master.products, master.listings, master.taxonomy, master.basePrices, master.codeCounters, plan.<ปี>.topDown,
 *                 plan.<ปี>.sku.<unitId>, plan.<ปี>.workflow.*, ui.role, ui.seriesFilter
 * store เขียน:    master.npdPlans, master.products, master.listings, master.basePrices, master.codeCounters, master.audit,
 *                 plan.<ปี>.workflow.sku.* (ต้องตรวจสอบใหม่ · Phase 2), ui.selection / app.planYear (ก่อนเปิดหน้าวางแผน SKU ของหน่วยนั้น)
 */
(function (SP) {
  'use strict';

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
      var by = byName(), at = new Date().toISOString();
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
    function skuPlans(year) {
      var out = {};
      if (S.PLAN_YEARS.indexOf(year) < 0) return out;
      var td = store.get('plan.' + year + '.topDown');
      Object.keys(td.units || {}).forEach(function (ch) { (td.units[ch] || []).forEach(function (u) { out[u] = store.get('plan.' + year + '.sku.' + u); }); });
      return out;
    }
    function coverage(plan) { return calc.npdCoverage(plan, skuPlans(launchYear(plan))); }
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
      var K = page.kpi;
      var T = tax();
      var all = cur().npdPlans;
      var notLaunched = all.filter(function (n) { return stageOf(n) !== 'launched'; });
      var soon = notLaunched.filter(function (n) { return calc.npdLaunchSoon(n, now, 3); });
      var bySeries = {};
      all.forEach(function (n) { var s = calc.taxonomyName(T, 'series', n.seriesId) || '–'; bySeries[s] = (bySeries[s] || 0) + 1; });
      var missing = [];
      all.forEach(function (n) { coverage(n).missing.forEach(function (u) { missing.push({ plan: n, unitId: u }); }); });
      var missBtn = h('button', { type: 'button', class: 'card npd-kpi npd-kpi-missing' + (missing.length ? ' is-danger' : ''), title: K.missingTitle },
        h('span', { class: 'pl-kpi-label' }, K.missing), h('strong', { class: 'pl-kpi-value' }, String(missing.length)), h('span', { class: 'npd-kpi-more', 'aria-hidden': 'true' }, '›'));
      C.popover(missBtn, function (close) { return missingList(missing, close); }, { className: 'npd-missing-popover', label: K.missingTitle, align: 'right' });
      root.appendChild(h('div', { class: 'npd-kpis' },
        h('div', { class: 'card npd-kpi' }, h('span', { class: 'pl-kpi-label' }, K.all), h('strong', { class: 'pl-kpi-value' }, String(all.length))),
        h('div', { class: 'card npd-kpi npd-kpi-pair' },
          h('span', { class: 'npd-kpi-part' }, h('span', { class: 'pl-kpi-label' }, K.notLaunched), h('strong', { class: 'pl-kpi-value' }, String(notLaunched.length))),
          h('span', { class: 'npd-kpi-part' }, h('span', { class: 'pl-kpi-label' }, K.soon), h('strong', { class: 'pl-kpi-value' }, String(soon.length)))),
        h('div', { class: 'card npd-kpi npd-kpi-series' }, h('span', { class: 'pl-kpi-label' }, K.bySeries),
          h('span', { class: 'npd-series-list' }, Object.keys(bySeries).map(function (s) { return h('span', { class: 'badge tag-muted' }, s + ' ' + bySeries[s]); }))),
        missBtn));
      root.appendChild(toolbar());
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
      var requests = cur().npdPlans.filter(function (n) { return sourceOf(n) === 'SALES'; }).length;
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
        h('button', { type: 'button', class: 'btn btn-sm npd-requests-chip' + (requests ? ' has-requests' : '') + (sourceFilter === 'SALES' ? ' is-active' : ''), title: page.requestsTip,
          'aria-pressed': sourceFilter === 'SALES' ? 'true' : 'false', onClick: function () { sourceFilter = sourceFilter === 'SALES' ? '' : 'SALES'; draw(); } }, fill(page.requestsChip, { n: requests })),
        h('span', { class: 'tool-right' },
          h('span', { class: 'legend npd-legend' }, STAGES.concat(['launched']).map(function (s) { return h('span', { class: 'legend-item' }, h('span', { class: 'swatch npd-sw', style: { '--c': C.tokenVar('--npd-' + s) } }), page.stages[s]); })),
          editing ? h('button', { type: 'button', class: 'btn btn-primary btn-sm npd-create', onClick: openCreate }, page.create) : null));
    }

    // หน่วยขายที่วางแผนแต่ยังไม่อยู่ในแผน SKU ของปีเปิดตัว → ลิงก์เปิดหน้าวางแผน SKU ของหน่วยนั้น
    function missingList(missing, close) {
      var K = page.kpi;
      if (!missing.length) return [h('p', { class: 'muted small' }, K.missingEmpty)];
      return [h('h3', { class: 'popover-title' }, K.missingTitle), h('ul', { class: 'npd-missing-list' }, missing.map(function (m) {
        var p = product(m.plan.productKey) || { name: m.plan.productKey };
        var info = calc.unitInfo(store.data(), m.unitId);
        var y = launchYear(m.plan);
        return h('li', null, h('span', null, fill(K.missingLine, { sku: m.plan.productKey + ' ' + calc.displayName(p), unit: unitName(m.unitId) }), h('span', { class: 'muted small' }, ' · ' + fill(K.missingYear, { year: y }))),
          info && info.channel && S.PLAN_YEARS.indexOf(y) >= 0 ? h('a', { href: SP.core.paths.to(SP.core.registry.byId('skuPlanning').path), class: 'npd-open-link', onClick: function (e) {
            e.preventDefault(); close();
            store.set('app.planYear', y);
            store.set('ui.selection', { channel: info.channel.id, unit: m.unitId });
            location.href = SP.core.paths.to(SP.core.registry.byId('skuPlanning').path);
          } }, K.open) : null);
      }))];
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
      list.forEach(function (n) {
        var p = product(n.productKey) || { name: n.productKey };
        var cov = coverage(n);
        var overdue = calc.npdOverdue(n, now);
        var line = fill(page.rowLine, { launch: launchText(n), n: cov.planned, x: cov.inPlan });
        var row = h('div', { class: 'npd-row npd-item' + (selected === n.id ? ' is-selected' : ''), role: 'row', tabindex: '0', dataset: { id: n.id },
          onClick: function () { openPlan(n.id); }, onKeydown: function (e) { if (e.key === 'Enter') openPlan(n.id); } },
          h('div', { class: 'npd-label', role: 'cell' }, C.productThumb(p, T, { size: 'sm' }),
            h('span', { class: 'npd-name' },
              h('span', { class: 'npd-name-text', title: p.name }, calc.displayName(p)),
              h('span', { class: 'npd-sub' }, h('strong', null, n.productKey), sourceOf(n) === 'SALES' ? h('span', { class: 'badge tag-warn' }, page.sources.SALES) : null,
                FT.isOn('npdApproval') ? C.wfBadge(statusOf(n)) : null),
              h('span', { class: 'npd-line' }, line)),
            overdue.length ? h('span', { class: 'npd-overdue', title: fill(page.overdue, { stages: overdue.map(function (s) { return page.stages[s]; }).join(', ') }) }, '⚠') : null));
        row.appendChild(track(n, ms));
        grid.appendChild(row);
      });
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
      list.forEach(function (n) {
        var p = product(n.productKey) || { name: n.productKey };
        var cov = coverage(n);
        var l = calc.npdLaunch(n);
        body.appendChild(h('tr', { class: 'is-clickable' + (selected === n.id ? ' is-selected' : ''), onClick: function () { openPlan(n.id); } },
          h('td', null, h('span', { class: 'npd-name' }, C.productThumb(p, T, { size: 'sm' }), h('span', null, h('strong', null, n.productKey), ' ' + calc.displayName(p)))),
          h('td', null, calc.taxonomyName(T, 'series', n.seriesId) || '–'),
          h('td', null, h('span', { class: 'npd-stage', style: { '--c': C.tokenVar('--npd-' + stageOf(n)) } }, page.stages[stageOf(n)])),
          h('td', null, launchText(n), l.quarter ? h('span', { class: 'muted small' }, ' · ' + page.unconfirmed) : null),
          h('td', { class: 'npd-acc-cell', title: accountsText(n) }, accountsText(n) || '–'),
          h('td', { class: 'num' + (cov.missing.length ? ' text-short' : '') }, fill(page.inPlanText, { x: cov.inPlan, y: cov.planned })),
          h('td', { class: 'num' }, n.expectedRsp ? F.baht(n.expectedRsp, 2) : '–'),
          h('td', null, n.owner || '–'),
          h('td', null, page.sources[sourceOf(n)]),
          h('td', null, p && p.trCode ? SP.data.content.pages.productList.trcloud[SP.core.catalog.inTrcloud(p) ? 'open' : 'notOpen'] : '–')));
      });
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
            { key: 'code', label: SP.data.content.pages.productList.columns.code, value: function (n) { return n.productKey; }, width: 12 },
            { key: 'name', label: Cl.sku, value: function (n) { return pr(n).name; }, width: 40 },
            { key: 'series', label: Cl.series, value: function (n) { return calc.taxonomyName(tax(), 'series', n.seriesId) || ''; } },
            { key: 'stage', label: Cl.stage, value: function (n) { return page.stages[stageOf(n)]; } },
            { key: 'launch', label: Cl.launch, value: function (n) { return launchText(n); } },
            { key: 'accounts', label: Cl.accounts, value: accountsText, width: 40 },
            { key: 'inPlan', label: Cl.inPlan, value: function (n) { var c = coverage(n); return fill(page.inPlanText, { x: c.inPlan, y: c.planned }); } },
            { key: 'rsp', label: Cl.rsp, type: 'price', value: function (n) { return n.expectedRsp || null; } },
            { key: 'owner', label: Cl.owner, value: function (n) { return n.owner || ''; } },
            { key: 'source', label: Cl.source, value: function (n) { return page.sources[sourceOf(n)]; } }
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
          h('div', { class: 'pd-meta' }, h('span', { class: 'pd-code' }, n.productKey),
            h('span', { class: 'npd-stage', style: { '--c': C.tokenVar('--npd-' + stage) } }, page.stages[stage]),
            h('span', { class: 'badge tag-muted' }, page.sources[sourceOf(n)])))));
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
        body.appendChild(h('section', { class: 'pd-section' },
          field(F2.product, n.productKey + ' · ' + p.name), field(F2.series, calc.taxonomyName(T, 'series', n.seriesId) || '–'),
          field(F2.stage, [stageSel, h('span', { class: 'muted small' }, ' ' + page.stageAuto)]),
          field(F2.launch, launchEditor(n)), field(F2.rsp, rsp), field(F2.owner, owner), field(F2.source, page.sources[sourceOf(n)]), field(F2.note, note)));
        body.appendChild(targetsEditor(n));
        if (!FT.isOn('npdApproval')) body.appendChild(h('p', { class: 'callout callout-info npd-note' }, page.saveEffect));
        else if (statusOf(calc.findById(saved.npdPlans, n.id) || {}) === 'approved') body.appendChild(h('p', { class: 'callout callout-info npd-note' }, page.launchMovedNote));
      } else {
        var t = n.stageTargets || {};
        body.appendChild(h('section', { class: 'pd-section' },
          field(F2.product, n.productKey + ' · ' + p.name), field(F2.series, calc.taxonomyName(T, 'series', n.seriesId) || '–'),
          field(F2.stage, page.stages[stage]),
          field(F2.launch, [launchText(n), calc.npdLaunch(n).quarter ? h('span', { class: 'muted small' }, ' · ' + page.unconfirmed) : null]),
          field(F2.rsp, n.expectedRsp ? F.baht(n.expectedRsp, 2) : '–'), field(F2.owner, n.owner || '–'), field(F2.source, page.sources[sourceOf(n)]),
          n.note ? field(F2.note, n.note) : null));
        body.appendChild(h('section', { class: 'pd-section' }, h('h3', null, F2.targets),
          h('ul', { class: 'npd-targets' }, STAGES.map(function (s) {
            return h('li', { class: overdue.indexOf(s) >= 0 ? 'is-overdue' : s === stage ? 'is-current' : null },
              h('span', { class: 'npd-stage', style: { '--c': C.tokenVar('--npd-' + s) } }, page.stages[s]), ' ' + (t[s] ? F.date(t[s]) : '–'));
          }))));
        if (FT.isOn('npdApproval') && statusOf(n) === 'approved') body.appendChild(h('p', { class: 'callout callout-info npd-note' }, page.approvedEffect));
      }
      body.appendChild(accountsSection(n));
      body.appendChild(h('a', { href: SP.core.paths.to(SP.core.registry.byId('productList').path) }, page.productLink));
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
            var at = new Date().toISOString();
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

  SP.modules.npdPlan = { render: render };
})(window.SP);
