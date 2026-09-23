/*
 * modules/summary/summary.js — รายงานสรุปแผน {ปี} (สำหรับผู้บริหารดูภาพรวมและอนุมัติ)
 *
 * หน้าที่:        แถบบน: Filter Channel (หลายค่า) · พิมพ์ / บันทึก PDF · ล็อก Baseline (Sales Director)
 *                 1. KPI 4 ใบ: Total Target + การเติบโต / แผน Bottom-up รวม + % ของเป้าหมาย / ส่วนต่าง (สีสถานะ) /
 *                    ความคืบหน้าการอนุมัติแผน SKU (x / y Account/เขต + แถบ) — บาทเต็ม
 *                 2. เป้าหมายเทียบแผน รายเดือน: แท่ง = เป้าหมาย (Phasing) · เส้น = แผน Bottom-up · เส้นประ = ยอดขายปีก่อน
 *                 3. ตาราง Channel → Account/เขต: ยอดขายปีก่อน · เป้าหมาย · แผน · ส่วนต่าง · สถานะอนุมัติ 3 ขั้น · ผู้รับผิดชอบ
 *                    (แถว Channel พับได้ / ชื่อ Account/เขต → หน้าวางแผนราย SKU ของรายการนั้น)
 *                 4. สัดส่วนแผนตามกลุ่มสินค้า: ตาม Status และตาม Series (Top 8 + อื่นๆ)
 *                 5. เป้าหมายรายผู้รับผิดชอบ (เฉพาะเดือนที่รับผิดชอบ: calc.performanceByPerson)
 *                 6. รายการที่ต้องดำเนินการ พร้อมลิงก์ไปหน้าที่ต้องแก้
 *                 ตัวเลขข้อ 2–6 เป็นล้านบาท 2 ตำแหน่ง (หน่วยอยู่ที่หัวข้อ) / พิมพ์ A4 แนวนอน ขึ้นหน้าใหม่ก่อนข้อ 3 และ 5
 * อ่านจาก data/:  channels, history, pricing, settings, content (pages.summary, labels) + Master ผ่าน store.data()
 * store อ่าน:     app.planYear, plan.<ปี>.topDown, plan.<ปี>.phasing.<unitId>, plan.<ปี>.sku.<unitId>, plan.<ปี>.workflow.*,
 *                 master.*, ui.role, ui.currentMonth
 * store เขียน:    ui.selection (ก่อนพาไปหน้าของรายการที่กด) / plan.<ปี>.workflow.baseline.all (ล็อก Baseline ผ่าน core/workflow.js)
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

  var channelFilter = [];   // Channel ที่เลือก ([] = ทุก Channel)
  var collapsed = {};       // <channelId>: true = พับแถว Account/เขต
  // สีแท่งตาม Status ของ SKU (ชื่อ Token)
  var STATUS_TOKENS = { existing: '--c-st-existing-fg', npd: '--c-st-npd-fg', clearance: '--c-st-clearance-fg', upcoming: '--c-st-upcoming-fg', ended: '--c-st-ended-fg' };

  function mb(v) { return F.millionPlain(v, 2); }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var WL = L.workflow;
    var year = store.year();
    var data = store.data();
    var master = store.master();
    var reg = SP.core.registry;
    var nowKey = store.currentKey();

    function go(entryId, channelId, unitId) {
      return function (e) {
        e.preventDefault();
        if (channelId) store.set('ui.selection', { channel: channelId, unit: unitId });
        location.href = SP.core.paths.to(reg.byId(entryId).path);
      };
    }
    function link(entryId, content, channelId, unitId, title) {
      return h('a', { href: SP.core.paths.to(reg.byId(entryId).path), class: 'rp-link', title: title, onClick: go(entryId, channelId, unitId) }, content);
    }
    function wfText(status) { return h('span', { class: 'wf-text wf-' + status }, WL.icon[status] + ' ' + WL.status[status]); }
    function gapText(rem) {
      return h('span', { class: 'rp-gap text-' + rem.status }, C.remainingText(rem, mb));
    }

    // ---------- ตัวเลขทั้งหมดของรายงาน (ตาม Channel ที่เลือก) ----------
    function model() {
      var tree = calc.topDown(data, store.get(store.planKey('topDown')), year);
      var states = store.workflowStates();
      var channels = tree.children.filter(function (c) { return !channelFilter.length || channelFilter.indexOf(c.id) >= 0; });
      var units = [];
      channels.forEach(function (ch) {
        ch.children.forEach(function (u) {
          var grid = calc.skuPlanGrid(data, master, u.id, store.get(store.planKey('sku.' + u.id)), { year: year, mode: 'initial' });
          units.push({
            id: u.id, name: u.name, channel: ch, target: u.amount, prior: u.prior,
            targetM: calc.phasingTotals(u.amount, store.get(store.planKey('phasing.' + u.id)).monthPct).amounts,
            priorM: calc.priorMonthly(data.history, year, u.id),
            grid: grid, plan: grid.yearTotal.net, planM: grid.totals.net,
            owner: C.ownerInfo(data, u.id, nowKey),
            phasing: W.stateOf(states, 'phasing', u.id).status,
            sku: W.stateOf(states, 'sku', u.id).status
          });
        });
      });
      var all = !channelFilter.length;
      var target = all ? tree.amount : calc.sum(channels.map(function (c) { return c.amount; }));
      var prior = all ? tree.prior : calc.sum(channels.map(function (c) { return c.prior || 0; }));
      var plan = calc.sum(units.map(function (u) { return u.plan; }));
      return {
        tree: tree, states: states, channels: channels, units: units, target: target, prior: prior, plan: plan,
        topDown: W.stateOf(states, 'topDown').status, locked: W.isLocked(states)
      };
    }

    function draw() {
      C.clear(root);
      var M = model();
      root.appendChild(h('div', { class: 'rp-print-head print-only' }, fill(page.printHeader, { year: year, at: F.dateTime(new Date().toISOString()) })));
      root.appendChild(toolbar(M));
      root.appendChild(kpis(M));
      root.appendChild(monthly(M));
      root.appendChild(unitTable(M));
      root.appendChild(mix(M));
      root.appendChild(people(M));
      root.appendChild(actions(M));
    }

    // ---------- แถบบน: Filter Channel · พิมพ์ · ล็อก Baseline ----------
    function toolbar(M) {
      var filter = C.multiSelect({
        label: page.channelFilter, allLabel: page.channelAll, selected: page.channelSelected, clear: page.channelClear, empty: page.channelEmpty,
        options: M.tree.children.map(function (c) { return { value: c.id, label: c.name + ' · ' + c.fullName }; }),
        value: channelFilter,
        onChange: function (v) { channelFilter = v; draw(); }
      });
      var print = h('button', { type: 'button', class: 'btn btn-secondary', onClick: function () { window.print(); } }, page.print);
      return h('div', { class: 'rp-toolbar no-print' }, filter, print, lockBox(M));
    }

    function lockBox(M) {
      var allUnits = calc.planUnits(M.tree);
      if (M.locked) {
        var ev = W.lastEvent(W.stateOf(M.states, 'baseline'));
        return h('div', { class: 'rp-lock is-locked' }, C.wfBadge('locked'), h('span', null, fill(page.lockedAt, { at: F.dateTime(ev && ev.at), by: ev ? ev.by : '' })));
      }
      var role = store.role();
      var check = W.canLock(M.states, allUnits.map(function (u) { return u.id; }));
      var reason = role.type !== 'director' ? page.lockDirectorOnly
        : !check.topDown ? page.lockTopDownPending
        : check.pending.length ? fill(page.lockPending, { n: check.pending.length }) : null;
      function lock() {
        var totals = calc.sum(allUnits.map(function (u) {
          return calc.skuPlanGrid(data, master, u.id, store.get(store.planKey('sku.' + u.id)), { year: year }).yearTotal.net;
        }));
        C.dialog({
          title: fill(page.lockConfirm, { year: year }),
          lines: page.lockLines.concat([fill(page.lockTotals, { target: F.baht(M.tree.amount), plan: F.baht(totals), n: allUnits.length })]),
          confirmLabel: WL.actions.lock
        }).then(function (r) {
          if (!r.ok) return;
          var gp = {};
          allUnits.forEach(function (u) { gp[u.id] = calc.gpOf(data, u.id); });
          var res = W.applyAction(store.workflowStates(), {
            step: 'baseline', unitId: null, action: 'lock', by: L.roles.director, at: new Date().toISOString(),
            snapshot: { gp: gp, prices: SP.data.pricing.priceList }
          });
          if (!res.ok) return;
          store.saveWorkflowStates(res.states);
          draw();
          ctx.refreshMenu();
        });
      }
      return h('div', { class: 'rp-lock' },
        reason ? h('span', { class: 'wf-reason' }, reason) : null,
        h('button', { type: 'button', class: 'btn btn-primary', disabled: !!reason, title: reason, onClick: lock }, fill(page.lockButton, { year: year })));
    }

    // ---------- 1. KPI ----------
    function kpis(M) {
      var K = page.kpi;
      var rem = calc.remaining(M.target, M.plan);
      var done = M.units.filter(function (u) { return M.locked || u.sku === 'approved'; }).length;
      var total = M.units.length;
      function card(cls, label, value, sub) {
        return h('div', { class: 'card rp-kpi ' + (cls || '') }, h('span', { class: 'rp-kpi-label' }, label), h('strong', { class: 'rp-kpi-value' }, value), sub ? h('span', { class: 'rp-kpi-sub' }, sub) : null);
      }
      return h('section', { class: 'rp-kpis' },
        card('', K.target + ' (' + L.baht + ')', F.baht(M.target), [fill(K.targetSub, { growth: '' }), C.growthText(calc.growth(M.target, M.prior))]),
        card('', K.plan + ' (' + L.baht + ')', F.baht(M.plan), fill(K.planSub, { pct: M.target ? F.pct(M.plan / M.target, 1) : '–' })),
        card('rp-kpi-gap alert-' + rem.status, K.gap + ' (' + L.baht + ')',
          rem.status === 'ok' || rem.status === 'empty' ? L.alert[rem.status] : F.baht(Math.abs(rem.amount)),
          rem.status === 'ok' || rem.status === 'empty' ? null : L.alert[rem.status]),
        card('rp-kpi-approval', K.approval, fill(K.approvalValue, { done: done, total: total }), [
          h('span', { class: 'rp-progress', role: 'img', 'aria-label': F.pct(total ? done / total : 0, 0) }, h('span', { class: 'rp-progress-fill', style: { width: (total ? done / total * 100 : 0) + '%' } })),
          h('span', null, K.approvalSub)]));
    }

    // ---------- 2. เป้าหมายเทียบแผน รายเดือน ----------
    function monthly(M) {
      var bars = calc.addMonthly(M.units.map(function (u) { return u.targetM; }));
      var line = calc.addMonthly(M.units.map(function (u) { return u.planM; }));
      var dashed = calc.addMonthly(M.units.map(function (u) { return u.priorM; }));
      return h('section', { class: 'card rp-section rp-monthly' }, h('h2', null, page.monthlyTitle),
        SP.core.charts.barLine({ bars: bars, line: line, dashed: dashed, months: F.MONTHS, labels: page.monthlyLegend, format: mb, height: 240 }));
    }

    // ---------- 3. ตาราง Channel → Account/เขต ----------
    function unitTable(M) {
      var T = page.tableColumns;
      var rowCount = 1 + M.channels.length + M.units.length;
      var body = h('tbody');
      var totalRem = calc.remaining(M.target, M.plan);
      body.appendChild(h('tr', { class: 'rp-total-row' },
        h('th', { scope: 'row' }, page.totalRow),
        h('td', { class: 'num' }, mb(M.prior)), h('td', { class: 'num' }, mb(M.target)), h('td', { class: 'num' }, mb(M.plan)),
        h('td', null, gapText(totalRem)),
        h('td', { class: 'rp-topdown', rowspan: String(rowCount) }, link('topDown', wfText(M.topDown), null, null, reg.byId('topDown').title)),
        h('td'), h('td'), h('td')));
      M.channels.forEach(function (ch) {
        var list = M.units.filter(function (u) { return u.channel.id === ch.id; });
        var plan = calc.sum(list.map(function (u) { return u.plan; }));
        var isCollapsed = !!collapsed[ch.id];
        function approved(step) { return fill(page.channelApproved, { done: list.filter(function (u) { return M.locked || u[step] === 'approved'; }).length, total: list.length }); }
        body.appendChild(h('tr', { class: 'rp-ch-row', style: { '--c': C.tokenVar(ch.color) } },
          h('th', { scope: 'rowgroup', title: ch.fullName },
            h('button', {
              type: 'button', class: 'rp-toggle', title: page.collapseTitle, 'aria-expanded': isCollapsed ? 'false' : 'true',
              onClick: function () { collapsed[ch.id] = !collapsed[ch.id]; draw(); }
            }, isCollapsed ? '▸' : '▾'),
            ch.name + ' · ' + ch.fullName),
          h('td', { class: 'num' }, mb(ch.prior)), h('td', { class: 'num' }, mb(ch.amount)), h('td', { class: 'num' }, mb(plan)),
          h('td', null, gapText(calc.remaining(ch.amount, plan))),
          h('td', { class: 'rp-approved' }, approved('phasing')), h('td', { class: 'rp-approved' }, approved('sku')), h('td')));
        list.forEach(function (u) {
          body.appendChild(h('tr', { class: 'rp-unit-row', hidden: isCollapsed, style: { '--c': C.tokenVar(ch.color) } },
            h('th', { scope: 'row' }, link('skuPlanning', u.name, ch.id, u.id, fill(page.openPlan, { name: u.name }))),
            h('td', { class: 'num' }, mb(u.prior)), h('td', { class: 'num' }, mb(u.target)), h('td', { class: 'num' }, mb(u.plan)),
            h('td', null, gapText(calc.remaining(u.target, u.plan))),
            h('td', null, link('phasing', wfText(M.locked ? 'locked' : u.phasing), ch.id, u.id, reg.byId('phasing').title + ' · ' + u.name)),
            h('td', null, link('skuPlanning', wfText(M.locked ? 'locked' : u.sku), ch.id, u.id, reg.byId('skuPlanning').title + ' · ' + u.name)),
            h('td', { class: 'rp-owner' + (u.owner.vacant ? ' is-vacant' : ''), title: u.owner.title }, u.owner.name)));
        });
      });
      var table = h('table', { class: 'data-table rp-table' },
        h('colgroup', null, h('col', { class: 'rp-col-name' }), h('col', { class: 'rp-col-num' }), h('col', { class: 'rp-col-num' }), h('col', { class: 'rp-col-num' }),
          h('col', { class: 'rp-col-gap' }), h('col', { class: 'rp-col-wf' }), h('col', { class: 'rp-col-wf' }), h('col', { class: 'rp-col-wf' }), h('col', { class: 'rp-col-owner' })),
        h('thead', null,
          h('tr', null,
            h('th', { scope: 'col', rowspan: '2' }, T.name),
            h('th', { scope: 'col', rowspan: '2', class: 'num' }, T.prior), h('th', { scope: 'col', rowspan: '2', class: 'num' }, T.target),
            h('th', { scope: 'col', rowspan: '2', class: 'num' }, T.plan), h('th', { scope: 'col', rowspan: '2' }, T.gap),
            h('th', { scope: 'colgroup', colspan: '3', class: 'rp-wf-head' }, page.approvalHead),
            h('th', { scope: 'col', rowspan: '2' }, T.owner)),
          h('tr', null, h('th', { scope: 'col' }, T.topDown), h('th', { scope: 'col' }, T.phasing), h('th', { scope: 'col' }, T.sku))),
        body);
      return h('section', { class: 'card rp-section rp-break' }, h('h2', null, page.tableTitle), h('div', { class: 'table-scroll' }, table));
    }

    // ---------- 4. สัดส่วนแผนตามกลุ่มสินค้า ----------
    function mix(M) {
      var rows = [];
      M.units.forEach(function (u) { rows = rows.concat(u.grid.rows); });
      var total = calc.sum(rows.map(function (r) { return r.total.net; }));
      function items(list, labelOf, tokenOf) {
        return list.filter(function (x) { return x.value > 0.5; }).map(function (x) {
          return { label: labelOf(x.key), value: x.value, colorToken: tokenOf(x.key), text: fill(page.mixText, { value: mb(x.value), pct: total ? F.pct(x.value / total, 1) : '–' }) };
        });
      }
      var byStatus = items(calc.planMix(rows, 'status'), function (k) { return L.status[k] || k; }, function (k) { return STATUS_TOKENS[k] || '--c-bar'; });
      var bySeries = items(calc.planMix(rows, 'series', 8), function (k) { return k === null ? page.mixOther : k || L.series.none; }, function () { return '--c-bar'; });
      return h('section', { class: 'card rp-section rp-mix' }, h('h2', null, page.mixTitle),
        h('div', { class: 'grid-2 rp-mix-grid' },
          h('div', null, h('h3', null, page.mixByStatus), SP.core.charts.hbars({ items: byStatus })),
          h('div', null, h('h3', null, page.mixBySeries), SP.core.charts.hbars({ items: bySeries }))));
    }

    // ---------- 5. เป้าหมายรายผู้รับผิดชอบ ----------
    function people(M) {
      var P = page.peopleColumns;
      var targets = {}, plans = {}, names = {};
      M.units.forEach(function (u) { targets[u.id] = u.targetM; plans[u.id] = u.planM; names[u.id] = u.name; });
      var rows = [];
      data.salespeople.concat([null]).forEach(function (p) {
        var id = p ? p.id : null;
        var t = calc.performanceByPerson(data.assignments, data.salespeople, id, year, targets);
        if (!t.units.length) return;
        var pl = calc.performanceByPerson(data.assignments, data.salespeople, id, year, plans);
        var status = p ? calc.personStatus(p, calc.monthKey(year, 11)) : null;
        rows.push({
          name: p ? p.name : page.vacantRow, vacant: !p,
          tag: status === 'resigned' || status === 'leaving' ? fill(page.resignedTag, { month: F.date(p.endMonth) }) : null,
          units: t.units.map(function (x) { return names[x.unitId]; }).join(', '),
          target: t.total, plan: pl.total
        });
      });
      var body = h('tbody', null, rows.map(function (r) {
        return h('tr', { class: r.vacant ? 'is-vacant' : '' },
          h('th', { scope: 'row' }, r.name, r.tag ? h('span', { class: 'badge tag-muted rp-tag' }, r.tag) : null),
          h('td', { class: 'rp-units' }, r.units),
          h('td', { class: 'num' }, mb(r.target)), h('td', { class: 'num' }, mb(r.plan)),
          h('td', null, gapText(calc.remaining(r.target, r.plan))));
      }));
      return h('section', { class: 'card rp-section rp-break rp-people' }, h('h2', null, page.peopleTitle),
        h('p', { class: 'rp-note' }, page.peopleNote),
        h('div', { class: 'table-scroll' }, h('table', { class: 'data-table rp-people-table' },
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, P.name), h('th', { scope: 'col' }, P.units),
            h('th', { scope: 'col', class: 'num' }, P.target), h('th', { scope: 'col', class: 'num' }, P.plan), h('th', { scope: 'col' }, P.gap))),
          body)));
    }

    // ---------- 6. รายการที่ต้องดำเนินการ (จัดกลุ่มตาม Account/เขต แต่ละเรื่องเป็นลิงก์ไปหน้าที่ต้องแก้) ----------
    function actions(M) {
      var A = page.actions;
      var groups = [];
      var amount = function (v) { return mb(v) + ' ' + page.millionUnit; };
      if (M.topDown !== 'approved' && !M.locked) {
        groups.push({ name: reg.byId('topDown').title, items: [{ tag: 'tag-warn', text: fill(A.topDown, { status: WL.status[M.topDown] }), entry: 'topDown' }] });
      }
      M.units.forEach(function (u) {
        var items = [];
        function add(tag, text, entry) { items.push({ tag: tag, text: text, entry: entry, channel: u.channel.id, unit: u.id }); }
        var rem = calc.remaining(u.target, u.plan);
        if (rem.status === 'short') add('alert-short', fill(A.short, { amount: C.remainingText(rem, amount) }), 'skuPlanning');
        if (rem.status === 'over') add('alert-over', fill(A.over, { amount: C.remainingText(rem, amount) }), 'skuPlanning');
        if (!M.locked) {
          [['phasing', 'phasing', A.draftPhasing], ['sku', 'skuPlanning', A.draftSku]].forEach(function (x) {
            var st = u[x[0]];
            if (st === 'draft') add('tag-muted', x[2], x[1]);
            else if (st === 'returned') add('tag-danger', reg.byId(x[1]).title + ' · ' + A.returned, x[1]);
            else if (st === 'review') add('tag-warn', reg.byId(x[1]).title + ' · ' + A.review, x[1]);
          });
        }
        if (u.owner.vacant) add('tag-danger', A.vacant, 'salespeople');
        if (items.length) groups.push({ name: u.channel.name + ' · ' + u.name, items: items });
      });
      return h('section', { class: 'card rp-section rp-actions' }, h('h2', null, page.actionsTitle),
        groups.length ? h('ul', { class: 'rp-action-list' }, groups.map(function (g) {
          return h('li', null, h('strong', { class: 'rp-action-name' }, g.name),
            h('span', { class: 'rp-action-items' }, g.items.map(function (it) {
              return h('span', { class: 'rp-action' }, h('span', { class: 'rp-action-dot badge ' + it.tag, 'aria-hidden': 'true' }), link(it.entry, it.text, it.channel, it.unit));
            })));
        })) : h('p', { class: 'rp-note' }, page.actionsNone));
    }

    // หัวกระดาษตอนพิมพ์ = เวลาที่สั่งพิมพ์
    window.addEventListener('beforeprint', function () {
      var el = root.querySelector('.rp-print-head');
      if (el) el.textContent = fill(page.printHeader, { year: year, at: F.dateTime(new Date().toISOString()) });
    });

    draw();
  }

  SP.modules.summary = { render: render };
})(window.SP);
