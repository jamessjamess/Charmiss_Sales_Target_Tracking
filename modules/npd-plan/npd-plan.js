/*
 * modules/npd-plan/npd-plan.js — Product Master · แผนการเปิดตัวสินค้าใหม่ (NPD)
 *
 * หน้าที่:        KPI: NPD ในปีแผน · ตาม Series · ยังไม่อนุมัติ · หน่วยขายที่วางแผนแล้วแต่ยังไม่อยู่ในแผน SKU
 *                 มุมมอง Timeline (แถว = Series พับได้ → SKU / คอลัมน์ = 12 เดือน เลื่อนไปปีถัดไปได้ / หมุดวันเปิดตัว + แถบช่วง New
 *                 สีตามขั้น) | ตาราง (SKU · Series · ขั้น · วันเปิดตัว · หน่วยขายที่วางแผน · อยู่ในแผน SKU แล้ว x / y · สถานะอนุมัติ)
 *                 คลิกแผน → Drawer รายละเอียด + Workflow ของแผนนั้น (ทีม Product ส่ง → Sales Director อนุมัติ, core/workflow.js step 'npd')
 *                 โหมดแก้ไข (ทีม Product): สร้างแผน (เลือก SKU หรือสร้าง SKU ใหม่ด้วยรหัสชั่วคราว), วันเปิดตัว, ขั้น, หน่วยขาย + เดือนเริ่มขาย
 *                 อนุมัติแล้ว → ตั้งวันเริ่มขายและ Listing ให้ (calc.applyNpdApproval) และเดือนเริ่มขายเป็นค่าตั้งต้นในหน้าวางแผน SKU
 *                 เลื่อนวันเปิดตัวหลังอนุมัติ → แผนกลับเป็นฉบับร่าง และแผน SKU ที่อนุมัติแล้วของหน่วยที่วางแผนเป็น "ต้องตรวจสอบใหม่"
 *                 ขั้น "เปิดตัวแล้ว" ระบบตั้งให้เมื่อถึงวันเปิดตัว (calc.npdStage เทียบเดือนปัจจุบันจำลอง)
 * อ่านจาก data/:  channels, settings, content (pages.npdPlan, labels) + Master ผ่าน store.data()
 * store อ่าน:     master.npdPlans, master.products, master.listings, master.taxonomy, master.priceList, plan.<ปี>.topDown,
 *                 plan.<ปี>.sku.<unitId>, plan.<ปี>.workflow.*, ui.currentMonth, ui.role
 * store เขียน:    master.npdPlans, master.products, master.listings, master.priceList, master.audit, plan.<ปี>.workflow.sku.* (ต้องตรวจสอบใหม่),
 *                 ui.selection (ก่อนเปิดหน้าวางแผน SKU ของหน่วยนั้น)
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

  var view = 'timeline';
  var yearOffset = 0;
  var collapsed = {};
  var STAGES = ['plan', 'concept', 'production', 'ready'];

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var PF = L.productFields;
    var planYear = store.year();
    var currentKey = store.currentKey();
    var editing = false;
    var saved = { npdPlans: store.get('master.npdPlans'), products: store.get('master.products'), priceList: store.get('master.priceList') };
    var draft = clone(saved);
    var selected = null;
    var creating = false;

    function cur() { return editing ? draft : saved; }
    function role() { return store.role().type; }
    function canEdit() { return W.canEditMaster(store.role(), ['product']); }
    function tax() { return store.get('master.taxonomy'); }
    function product(key) { return calc.findProduct(cur().products, key); }
    function unitName(id) { var i = calc.unitInfo(store.data(), id); return i ? i.unit.name : id; }
    function launchYear(plan) { return plan.plannedLaunchDate ? calc.parseDate(plan.plannedLaunchDate).y : planYear; }

    function diffCount() {
      var n = 0;
      draft.npdPlans.forEach(function (d) { var o = calc.findById(saved.npdPlans, d.id); if (!o || JSON.stringify(o) !== JSON.stringify(d)) n++; });
      n += draft.products.length - saved.products.length;
      return n;
    }
    function dirty() { return editing ? diffCount() : 0; }
    C.guardUnsaved(dirty);

    var bar = C.workflowBar({
      simple: true, editRoles: ['product'],
      editing: function () { return editing; },
      onEdit: function () { startEdit(); },
      onSave: function () { save(); },
      onCancel: function () { editing = false; creating = false; draft = clone(saved); draw(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    function startEdit() { editing = true; draft = clone(saved); draw(); }

    function save() {
      var by = L.roles[role()] || '', at = new Date().toISOString();
      var entries = [];
      draft.npdPlans.forEach(function (d) {
        var o = calc.findById(saved.npdPlans, d.id);
        if (o && JSON.stringify(o) === JSON.stringify(d)) return;
        // เลื่อนวันเปิดตัวหลังอนุมัติ → ฉบับร่าง + แผน SKU ที่อนุมัติแล้วของหน่วยที่วางแผน → ต้องตรวจสอบใหม่
        if (o && o.workflow && o.workflow.status === 'approved' && o.plannedLaunchDate !== d.plannedLaunchDate) {
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
      store.set('master.npdPlans', draft.npdPlans);
      store.set('master.products', draft.products);
      store.set('master.priceList', draft.priceList);
      store.appendAudit(entries);
      saved = clone(draft);
      editing = false;
      creating = false;
      draw();
      ctx.refreshMenu();
    }

    // ------------------------------------------------------------------ สรุปตัวเลข
    function stageOf(plan) { return calc.npdStage(plan, currentKey); }
    function statusOf(plan) { return (plan.workflow && plan.workflow.status) || 'draft'; }
    function plansIn(year) {
      return cur().npdPlans.filter(function (n) {
        if (!n.plannedLaunchDate) return year === planYear;
        var i = calc.monthIndex(n.plannedLaunchDate, year);
        return i >= -2 && i <= 11;
      });
    }
    function skuPlans(year) {
      var out = {};
      var td = store.get('plan.' + year + '.topDown');
      Object.keys(td.units || {}).forEach(function (ch) { (td.units[ch] || []).forEach(function (u) { out[u] = store.get('plan.' + year + '.sku.' + u); }); });
      return out;
    }
    function coverage(plan) { return calc.npdCoverage(plan, skuPlans(launchYear(plan))); }

    // ------------------------------------------------------------------ วาดหน้า
    var drawerCtl = C.drawer({ label: page.title, className: 'npd-drawer', onClose: function () { selected = null; creating = false; draw(); } });

    function draw() {
      C.clear(root);
      bar.update();
      var K = page.kpi;
      var inYear = cur().npdPlans.filter(function (n) { return n.plannedLaunchDate && calc.launchesIn({ launchDate: n.plannedLaunchDate }, planYear); });
      var T = tax();
      var bySeries = {};
      inYear.forEach(function (n) { var s = calc.taxonomyName(T, 'series', n.seriesId) || '–'; bySeries[s] = (bySeries[s] || 0) + 1; });
      var pending = inYear.filter(function (n) { return statusOf(n) !== 'approved'; }).length;
      var missing = 0;
      inYear.forEach(function (n) { missing += coverage(n).missing.length; });
      root.appendChild(h('div', { class: 'npd-kpis' },
        h('div', { class: 'card npd-kpi' }, h('span', { class: 'pl-kpi-label' }, fill(K.inYear, { year: planYear })), h('strong', { class: 'pl-kpi-value' }, String(inYear.length))),
        h('div', { class: 'card npd-kpi npd-kpi-series' }, h('span', { class: 'pl-kpi-label' }, K.bySeries),
          h('span', { class: 'npd-series-list' }, Object.keys(bySeries).map(function (s) { return h('span', { class: 'badge tag-muted' }, s + ' ' + bySeries[s]); }))),
        h('div', { class: 'card npd-kpi' + (pending ? ' is-warn' : '') }, h('span', { class: 'pl-kpi-label' }, K.pending), h('strong', { class: 'pl-kpi-value' }, String(pending))),
        h('div', { class: 'card npd-kpi' + (missing ? ' is-danger' : '') }, h('span', { class: 'pl-kpi-label' }, K.missing), h('strong', { class: 'pl-kpi-value' }, String(missing)))));

      var year = planYear + yearOffset;
      root.appendChild(h('div', { class: 'tool-row' },
        C.segmented({ label: page.viewLabel, value: view, options: ['timeline', 'table'].map(function (v) { return { value: v, label: page.views[v] }; }), onChange: function (v) { view = v; draw(); } }),
        h('span', { class: 'npd-year' },
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', title: page.yearPrev, 'aria-label': page.yearPrev, disabled: yearOffset <= 0, onClick: function () { yearOffset -= 1; draw(); } }, '‹'),
          h('strong', null, fill(page.yearLabel, { year: year })),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', title: page.yearNext, 'aria-label': page.yearNext, disabled: yearOffset >= 1, onClick: function () { yearOffset += 1; draw(); } }, '›')),
        h('span', { class: 'legend npd-legend' }, STAGES.concat(['launched']).map(function (s) { return h('span', { class: 'legend-item' }, h('span', { class: 'swatch npd-sw', style: { '--c': C.tokenVar('--npd-' + s) } }), page.stages[s]); })),
        editing ? h('span', { class: 'tool-right' }, h('button', { type: 'button', class: 'btn btn-primary btn-sm npd-create', onClick: openCreate }, page.create)) : null));
      if (editing) { var b = C.editBanner(); b.update(dirty()); root.appendChild(b); }

      var card = h('div', { class: 'card fit-card npd-card' });
      root.appendChild(card);
      var list = plansIn(year);
      if (!list.length) card.appendChild(h('p', { class: 'grid-empty' }, page.empty));
      else card.appendChild(view === 'timeline' ? timeline(list, year) : table(list));
      if (drawerCtl.isOpen()) renderDrawer();
    }

    function groupsOf(list) {
      var T = tax();
      var order = calc.taxonomyChildren(T, 'series', null).map(function (n) { return n.id; });
      var groups = [];
      list.forEach(function (n) {
        var g = groups.filter(function (x) { return x.id === (n.seriesId || ''); })[0];
        if (!g) { g = { id: n.seriesId || '', name: calc.taxonomyName(T, 'series', n.seriesId) || '–', items: [] }; groups.push(g); }
        g.items.push(n);
      });
      groups.sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); });
      groups.forEach(function (g) { g.items.sort(function (a, b) { return (a.plannedLaunchDate || '') < (b.plannedLaunchDate || '') ? -1 : 1; }); });
      return groups;
    }

    function timeline(list, year) {
      var T = tax();
      var grid = h('div', { class: 'npd-timeline', role: 'table' });
      grid.appendChild(h('div', { class: 'npd-row npd-head', role: 'row' }, h('div', { class: 'npd-label', role: 'columnheader' }, page.columns.sku),
        F.MONTHS.map(function (m, i) { return h('div', { class: 'npd-month' + (year === planYear && i === store.get('ui.currentMonth') ? ' is-current' : ''), role: 'columnheader' }, m); })));
      groupsOf(list).forEach(function (g) {
        grid.appendChild(h('div', { class: 'npd-row npd-group', role: 'row' },
          h('button', { type: 'button', class: 'tree-toggle', 'aria-expanded': collapsed[g.id] ? 'false' : 'true', onClick: function () { collapsed[g.id] = !collapsed[g.id]; draw(); } }, collapsed[g.id] ? '▸' : '▾'),
          h('span', { class: 'npd-group-name' }, g.name + ' · ' + g.items.length)));
        if (collapsed[g.id]) return;
        g.items.forEach(function (n) {
          var p = product(n.productKey) || { name: n.productKey };
          var stage = stageOf(n);
          var row = h('div', { class: 'npd-row npd-item' + (selected === n.id ? ' is-selected' : ''), role: 'row', tabindex: '0', dataset: { id: n.id },
            onClick: function () { openPlan(n.id); }, onKeydown: function (e) { if (e.key === 'Enter') openPlan(n.id); } },
            h('div', { class: 'npd-label', role: 'cell' }, C.productThumb(p, T, { size: 'sm' }),
              h('span', { class: 'npd-name' }, h('span', { class: 'npd-name-text', title: p.name }, p.name), h('span', { class: 'npd-sub' }, n.productKey + ' · ', C.wfBadge(statusOf(n))))));
          var track = h('div', { class: 'npd-track', role: 'cell' });
          if (n.plannedLaunchDate) {
            var start = calc.monthIndex(n.plannedLaunchDate, year);
            var from = Math.max(0, start), to = Math.min(11, start + SP.data.settings.NPD_MONTHS - 1);
            if (to >= 0 && from <= 11) {
              track.appendChild(h('span', { class: 'npd-band', title: page.newBand + ' · ' + page.stages[stage], style: { gridColumn: (from + 1) + ' / ' + (to + 2), '--c': C.tokenVar('--npd-' + stage) } }, page.stages[stage]));
            }
            if (start >= 0 && start <= 11) {
              var d = calc.parseDate(n.plannedLaunchDate);
              var frac = (d.d - 1) / calc.daysInMonth(d.y, d.m) * 100;
              track.appendChild(h('span', { class: 'npd-pin', title: fill(page.pin, { date: F.date(n.plannedLaunchDate) }), style: { gridColumn: (start + 1) + ' / ' + (start + 2), '--x': frac + '%', '--c': C.tokenVar('--npd-' + stage) } }, '◆'));
            }
          }
          row.appendChild(track);
          grid.appendChild(row);
        });
      });
      return h('div', { class: 'fit-scroll npd-scroll' }, grid);
    }

    function table(list) {
      var Cl = page.columns;
      var T = tax();
      var body = h('tbody');
      groupsOf(list).forEach(function (g) {
        g.items.forEach(function (n) {
          var p = product(n.productKey) || { name: n.productKey };
          var cov = coverage(n);
          var names = (n.plannedAccounts || []).map(function (a) { return unitName(a.accountId) + ' (' + F.date(a.plannedStartMonth) + ')'; }).join(', ');
          body.appendChild(h('tr', { class: 'is-clickable' + (selected === n.id ? ' is-selected' : ''), onClick: function () { openPlan(n.id); } },
            h('td', null, h('span', { class: 'npd-name' }, C.productThumb(p, T, { size: 'sm' }), h('span', null, h('strong', null, n.productKey), ' ' + p.name))),
            h('td', null, g.name),
            h('td', null, h('span', { class: 'npd-stage', style: { '--c': C.tokenVar('--npd-' + stageOf(n)) } }, page.stages[stageOf(n)])),
            h('td', null, n.plannedLaunchDate ? F.date(n.plannedLaunchDate) : '–'),
            h('td', { title: names }, fill(page.accountsCount, { n: (n.plannedAccounts || []).length })),
            h('td', { class: 'num' + (cov.missing.length ? ' text-short' : '') }, fill(page.inPlanText, { x: cov.inPlan, y: cov.planned })),
            h('td', null, C.wfBadge(statusOf(n)))));
        });
      });
      return h('div', { class: 'fit-scroll' }, h('table', { class: 'data-grid npd-table' },
        h('thead', null, h('tr', null, ['sku', 'series', 'stage', 'launch', 'accounts'].map(function (k) { return h('th', { scope: 'col' }, Cl[k]); }),
          h('th', { scope: 'col', class: 'num' }, Cl.inPlan), h('th', { scope: 'col' }, Cl.approval))),
        body));
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
      var head = h('div', { class: 'pd-head' }, C.productThumb(p, T, { size: 'md' }),
        h('div', { class: 'pd-title' }, h('h2', null, fill(page.drawerTitle, { name: p.name })),
          h('div', { class: 'pd-meta' }, h('span', { class: 'pd-code' }, n.productKey),
            h('span', { class: 'npd-stage', style: { '--c': C.tokenVar('--npd-' + stage) } }, page.stages[stage]))));
      drawerCtl.head.appendChild(head);
      if (!editing) {
        var wf = C.workflowBar({
          step: 'npd', unitId: n.id, year: launchYear(n),
          title: function () { return fill(page.workflowTitle, { name: p.name }); },
          getState: function () { return n.workflow || { status: 'draft', history: [] }; },
          editing: function () { return false; },
          facts: function () { return { ready: !!n.plannedLaunchDate && (n.plannedAccounts || []).length > 0 }; },
          summary: function () {
            var S = page.summaryLines;
            return [fill(S.launch, { date: n.plannedLaunchDate ? F.date(n.plannedLaunchDate) : '–' }), fill(S.accounts, { n: (n.plannedAccounts || []).length }), fill(S.stage, { stage: page.stages[stage] })];
          },
          onEdit: function () { startEdit(); },
          onAction: function (action, payload) { return act(n.id, action, payload); },
          onChange: function () { saved = { npdPlans: store.get('master.npdPlans'), products: store.get('master.products'), priceList: store.get('master.priceList') }; draft = clone(saved); draw(); }
        });
        drawerCtl.head.appendChild(h('div', { class: 'npd-wf' }, wf));
      }
      var body = h('div', { class: 'pd-body' });
      drawerCtl.body.appendChild(body);
      var F2 = page.fields;
      function field(label, content) { return h('div', { class: 'pd-field' }, h('span', { class: 'pd-label' }, label), h('span', { class: 'pd-value' }, content)); }
      if (editing) {
        var stageSel = C.select({ label: F2.stage, value: STAGES.indexOf(n.stage) >= 0 ? n.stage : 'plan', className: 'select-sm',
          options: STAGES.map(function (s) { return { value: s, label: page.stages[s] }; }), onChange: function (v) { n.stage = v; refresh(); } });
        var launch = h('input', { type: 'date', class: 'pm-input', value: n.plannedLaunchDate || '', 'aria-label': F2.launch });
        launch.addEventListener('change', function () { n.plannedLaunchDate = launch.value || null; refresh(); });
        var note = h('input', { type: 'text', class: 'pm-input pd-input', value: n.note || '', 'aria-label': F2.note });
        note.addEventListener('change', function () { n.note = note.value; refresh(); });
        body.appendChild(h('section', { class: 'pd-section' },
          field(F2.product, n.productKey + ' · ' + p.name), field(F2.series, calc.taxonomyName(T, 'series', n.seriesId) || '–'),
          field(F2.stage, [stageSel, h('span', { class: 'muted small' }, ' ' + page.stageAuto)]), field(F2.launch, launch), field(F2.note, note)));
        if (statusOf(calc.findById(saved.npdPlans, n.id) || {}) === 'approved') body.appendChild(h('p', { class: 'callout callout-info npd-note' }, page.launchMovedNote));
      } else {
        body.appendChild(h('section', { class: 'pd-section' },
          field(F2.product, n.productKey + ' · ' + p.name), field(F2.series, calc.taxonomyName(T, 'series', n.seriesId) || '–'),
          field(F2.stage, page.stages[stage]), field(F2.launch, n.plannedLaunchDate ? F.date(n.plannedLaunchDate) : '–'),
          n.note ? field(F2.note, n.note) : null));
        if (statusOf(n) === 'approved') body.appendChild(h('p', { class: 'callout callout-info npd-note' }, page.approvedEffect));
      }
      body.appendChild(accountsSection(n));
      body.appendChild(h('a', { href: SP.core.paths.to(SP.core.registry.byId('productList').path) }, page.productLink));
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
        return h('tr', null,
          h('td', null, unitName(a.accountId), info && info.channel ? h('span', { class: 'muted small' }, ' · ' + info.channel.name) : null),
          h('td', null, monthCell),
          h('td', null, inPlan ? h('span', { class: 'badge tag-ok' }, page.inSkuPlan) : h('span', { class: 'badge tag-warn' }, page.notInSkuPlan),
            !editing && info && info.channel ? h('a', { href: SP.core.paths.to(SP.core.registry.byId('skuPlanning').path), class: 'npd-open', title: fill(page.openSkuPlan, { unit: unitName(a.accountId) }),
              onClick: function (e) { e.preventDefault(); store.set('ui.selection', { channel: info.channel.id, unit: a.accountId }); location.href = SP.core.paths.to(SP.core.registry.byId('skuPlanning').path); } }, ' ›') : null),
          editing ? h('td', { class: 'manage' }, C.trashButton({ label: page.removeAccount, onConfirm: function () { list.splice(i, 1); refresh(); } })) : null);
      });
      var section = h('section', { class: 'pd-section' }, h('h3', null, F2.accounts),
        list.length ? h('table', { class: 'data-grid npd-accounts' }, h('tbody', null, rows)) : h('p', { class: 'muted' }, page.noAccounts));
      if (editing) {
        var used = list.map(function (a) { return a.accountId; });
        var td = store.get(store.planKey('topDown'));
        var options = [];
        (td.channels || []).forEach(function (ch) {
          calc.unitsOfChannel(store.data(), ch, true).forEach(function (u) { if (used.indexOf(u.id) < 0) options.push({ id: u.id, name: calc.findById(SP.data.channels, ch).name + ' · ' + u.name }); });
        });
        section.appendChild(C.accountPicker({
          label: page.addAccount, placeholder: page.addAccount, emptyLabel: page.noAccounts, options: options,
          onPick: function (id) {
            var start = n.plannedLaunchDate ? n.plannedLaunchDate.slice(0, 7) : null;
            list.push({ accountId: id, plannedStartMonth: start });
            n.plannedAccounts = list;
            refresh();
          }
        }));
      }
      return section;
    }

    // Workflow ของแผน NPD (ส่ง / อนุมัติ / ส่งกลับ / เปิดให้แก้ไข / ดึงกลับ) + ผลของการอนุมัติ
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
        entries.push({ entity: 'product', key: n.productKey, field: 'launchDate', oldValue: null, newValue: n.plannedLaunchDate, by: payload.by, at: payload.at });
      }
      store.set('master.npdPlans', plans);
      store.appendAudit(entries);
      return { ok: true };
    }

    // ------------------------------------------------------------------ สร้างแผน NPD
    function renderCreate() {
      var T = tax();
      var G = SP.data.content.pages.productList.general;
      drawerCtl.head.appendChild(h('div', { class: 'pd-title' }, h('h2', null, page.createTitle)));
      var withPlan = cur().npdPlans.map(function (n) { return n.productKey; });
      var candidates = cur().products.filter(function (p) {
        var k = calc.productKey(p);
        return (p.itemType || 'SALE') === 'SALE' && withPlan.indexOf(k) < 0 && (!p.launchDate || calc.monthIndex(p.launchDate, planYear) >= 0);
      });
      var pick = C.select({ label: page.pickSku, value: '', className: 'select-sm',
        options: [{ value: '', label: page.pickPlaceholder }].concat(candidates.map(function (p) { return { value: calc.productKey(p), label: calc.productKey(p) + ' · ' + p.name }; })), onChange: function () {} });
      var np = { categoryId: null, subCategoryId: null, typeId: null, seriesId: null, subSeriesId: null };
      var name = h('input', { type: 'text', class: 'pm-input pd-input', 'aria-label': page.newName, placeholder: page.newName });
      var launch = h('input', { type: 'date', class: 'pm-input', 'aria-label': page.fields.launch });
      var rsp = h('input', { type: 'number', class: 'pm-input pm-stock', min: '0', step: '0.01', 'aria-label': SP.data.content.pages.productList.create.rspLabel, placeholder: SP.data.content.pages.productList.create.rspLabel });
      var msg = h('p', { class: 'pm-msg', role: 'status' });
      drawerCtl.body.appendChild(h('div', { class: 'pd-body' },
        h('section', { class: 'pd-section' }, h('h3', null, page.pickSku), pick),
        h('section', { class: 'pd-section' }, h('h3', null, page.orNew),
          h('div', { class: 'pd-field' }, h('span', { class: 'pd-label' }, PF.name), name),
          C.cascadeSelect({ tax: T, kind: 'category', value: np, labels: [PF.categoryId, PF.subCategoryId, PF.typeId], placeholder: G.placeholder, onChange: function (v) { Object.keys(v).forEach(function (k) { np[k] = v[k]; }); } }),
          C.cascadeSelect({ tax: T, kind: 'series', value: np, labels: [PF.seriesId, PF.subSeriesId], placeholder: G.placeholder, onChange: function (v) { Object.keys(v).forEach(function (k) { np[k] = v[k]; }); } }),
          h('div', { class: 'pd-field' }, h('span', { class: 'pd-label' }, SP.data.content.pages.productList.create.rspLabel), rsp),
          h('p', { class: 'muted small' }, G.tempNote)),
        h('section', { class: 'pd-section' }, h('div', { class: 'pd-field' }, h('span', { class: 'pd-label' }, page.fields.launch), launch)),
        msg,
        h('div', { class: 'dlg-actions' },
          h('button', { type: 'button', class: 'btn btn-ghost', onClick: function () { drawerCtl.close(); } }, L.dialog.cancel),
          h('button', { type: 'button', class: 'btn btn-primary npd-create-submit', onClick: function () {
            var key = pick.value;
            var at = new Date().toISOString();
            var seriesId = null;
            if (!key) {
              if (!name.value.trim()) { msg.className = 'pm-msg is-error'; msg.textContent = page.nameRequired; return; }
              var p = { trCode: '', tempCode: calc.nextTempCode(draft.products, launch.value, planYear), internalCode: '', barcode: '', name: name.value.trim(), nameEn: '',
                categoryId: np.categoryId, subCategoryId: np.subCategoryId, typeId: np.typeId, seriesId: np.seriesId, subSeriesId: np.subSeriesId,
                itemType: 'SALE', packSize: null, uom: SP.data.settings.UOMS[0], image: null, launchDate: launch.value || '', discontinueMonth: null, clearance: null, note: '', createdAt: at, updatedAt: at };
              draft.products.push(p);
              key = p.tempCode;
              seriesId = p.seriesId;
              if (Number(rsp.value) > 0) {
                var res = calc.addPrice(draft.priceList, { productKey: key, priceType: 'RSP', channelId: null, price: Number(rsp.value), effectiveFrom: store.today(), by: L.roles[role()] || '', at: at });
                if (res.ok) draft.priceList = res.list;
              }
            } else {
              seriesId = (calc.findProduct(draft.products, key) || {}).seriesId || null;
            }
            var id = 'npd-' + Date.now().toString(36);
            draft.npdPlans.push({ id: id, productKey: key, seriesId: seriesId, stage: 'plan', plannedLaunchDate: launch.value || (calc.findProduct(draft.products, key) || {}).launchDate || null,
              plannedAccounts: [], note: '', workflow: { status: 'draft', history: [] } });
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
