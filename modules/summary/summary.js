/*
 * modules/summary/summary.js — ขั้นที่ 4: ติดตามสถานะ | รายงานสรุปแผน {ปี} (CR-12)
 *
 * หน้าที่:  แท็บใต้หัวข้อ (จำที่ ui.summaryTab / ยังไม่เลือก: ยังไม่ล็อก Baseline = ติดตามสถานะ · ล็อกแล้ว = รายงานสรุปแผน)
 *   ติดตามสถานะ (งานที่ต้องทำ พิมพ์ไม่ได้):
 *     บรรทัดสรุปสถานะทั้งปี (จัดสรรเป้าหมายประจำปี · Baseline · รายงานที่เคยล็อก) + ล็อก / ปลดล็อก Baseline (Sales Director)
 *     ตารางรายการที่ต้องดำเนินการ 1 แถวต่อหน่วยขายที่มีประเด็น (calc.planActions เรียงตามความรุนแรง)
 *     + ตัวกรอง Channel · ผู้รับผิดชอบ · เฉพาะที่มีส่วนต่าง
 *   รายงานสรุปแผน (ประกาศและหลักฐานข้อตกลง พิมพ์ / บันทึก PDF ได้เฉพาะแท็บนี้):
 *     หัวรายงาน: เลขฉบับ {ปี}-BL-{nn} | {ปี}-DRAFT · สถานะ · จัดสรรเป้าหมายประจำปี · พิมพ์เมื่อ · หมายเหตุที่มาของตัวเลข
 *     ยังไม่ล็อก = ลายน้ำ "ฉบับร่าง · ยังไม่ได้รับอนุมัติ" ทุกหน้า (บนจอและตอนพิมพ์) / ล็อกแล้ว = ตัวเลขทั้งหมดจาก Snapshot ของ Baseline
 *     Filter Channel · KPI 4 ใบ · กราฟรายเดือน (charts.barLine) : ที่มาของการเติบโต (charts.waterfall + stackedShare) = 60 : 40
 *     ตาราง Channel → หน่วยขาย (ยอดขายปีก่อน · เป้าหมาย · % ของ Total · เป้าหมายเทียบปีก่อน · แผน · ส่วนต่าง · สถานะอนุมัติ 2 ไอคอน · ผู้รับผิดชอบ)
 *     สัดส่วนแผนตามกลุ่มสินค้า · เป้าหมายรายผู้รับผิดชอบ · การอนุมัติ (ประวัติ Workflow) · ช่องลงนาม (เมื่อล็อกแล้ว)
 *     ตัวเลขเป็นล้านบาท 2 ตำแหน่ง (KPI บาทเต็ม) / พิมพ์ A4 แนวนอน
 * อ่านจาก data/:  settings, content (pages.summary, pages.<ขั้น>.title, labels) — ตัวเลขทั้งหมดของรายงานมาจาก core/report.js
 * store อ่าน:     app.planYear, plan.<ปี>.workflow.*, plan.<ปี>.baselineVersions, ui.role, ui.summaryTab (+ Key ที่ core/report.js อ่าน)
 * store เขียน:    ui.summaryTab · ui.selection (ก่อนพาไปหน้าของรายการที่กด)
 *                 plan.<ปี>.workflow.baseline.all (ล็อก / ปลดล็อกผ่าน core/workflow.js — snapshot = { gp ต่อหน่วยขาย, priceList,
 *                 promotions ที่ยืนยันแล้ว, report = core/report.js build() }) · plan.<ปี>.baselineVersions (ต่อท้ายฉบับใหม่ตอนล็อก)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var W = SP.core.workflow;
  var store = SP.core.store;
  var R = SP.core.report;
  var h = C.h;
  var fill = C.fill;

  var channelFilter = [];   // รายงาน: Channel ที่เลือก ([] = ทุก Channel)
  var collapsed = {};       // รายงาน: <channelId>: true = พับแถวหน่วยขาย
  var mixBy = 'series';     // รายงาน: กราฟกลุ่มสินค้าที่ 2 'series' | 'category'
  var act = { channel: '', owner: '', gapOnly: false };   // ติดตามสถานะ: ตัวกรอง (owner '_none' = ยังไม่มีผู้รับผิดชอบ)
  // สีแท่งตาม Status ของ SKU (ชื่อ Token)
  var STATUS_TOKENS = { planned: '--c-st-planned-fg', 'new': '--c-st-new-fg', active: '--c-st-active-fg', clearance: '--c-st-clearance-fg', discontinued: '--c-st-discontinued-fg' };
  var AP_STATES = ['draft', 'submitted', 'approved', 'returned', 'review'];

  function mb(v) { return F.millionPlain(v, 2); }
  // ป้ายแกนเป็นล้านบาท: ขั้นเต็มล้าน = ไม่มีทศนิยม / ขั้น 2.5 ล้าน = ทศนิยม 1 ตำแหน่ง / 0 = "0"
  function axisText(v, step) {
    if (!v) return '0';
    var s = step / 1e6;
    var d = Math.abs(s - Math.round(s)) < 1e-9 ? 0 : Math.abs(s * 10 - Math.round(s * 10)) < 1e-9 ? 1 : 2;
    return F.number(v / 1e6, d);
  }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var WL = L.workflow;
    var P = SP.data.content.pages;
    var year = store.year();
    var reg = SP.core.registry;
    var printedAt = null;

    function go(entryId, channelId, unitId) {
      return function (e) {
        e.preventDefault();
        if (channelId) store.set('ui.selection', { channel: channelId, unit: unitId });
        location.href = SP.core.paths.to(reg.byId(entryId).path);
      };
    }
    function link(entryId, content, channelId, unitId, title, cls) {
      return h('a', { href: SP.core.paths.to(reg.byId(entryId).path), class: 'rp-link' + (cls ? ' ' + cls : ''), title: title, onClick: go(entryId, channelId, unitId) }, content);
    }
    function gapText(rem) { return h('span', { class: 'rp-gap text-' + rem.status }, C.remainingText(rem, mb)); }
    function pageTitle(id) { return (P[id] && P[id].title) || reg.byId(id).title; }
    function stepEntry(step) { return step === 'sku' ? 'skuPlanning' : step; }

    function draw() {
      C.clear(root);
      var states = store.workflowStates();
      var locked = W.isLocked(states);
      var live = R.build();
      var acts = R.actions(live);
      var tab = store.get('ui.summaryTab');
      if (tab !== 'status' && tab !== 'report') tab = locked ? 'report' : 'status';
      document.body.classList.toggle('rp-on-status', tab === 'status');
      root.appendChild(tabs(tab, acts.length));
      (tab === 'status' ? statusTab(live, acts, states, locked) : reportTab(live, states, locked)).forEach(function (n) { root.appendChild(n); });
    }

    // ---------- แท็บ ----------
    function tabs(tab, n) {
      var T = page.tabs;
      return h('div', { class: 'rp-tabs no-print' }, C.segmented({
        label: page.tabLabel, value: tab,
        options: [
          { value: 'status', title: page.tabTips.status, label: [T.status, n ? h('span', { class: 'rp-tab-count', title: fill(page.tabCountTip, { n: n }) }, String(n)) : null] },
          { value: 'report', title: page.tabTips.report, label: T.report }
        ],
        onChange: function (v) { store.set('ui.summaryTab', v); draw(); window.scrollTo(0, 0); }
      }));
    }

    // =====================================================================
    // แท็บติดตามสถานะ
    // =====================================================================
    function statusTab(live, acts, states, locked) {
      var Y = page.yearLines;
      var versions = store.get(store.planKey('baselineVersions'));
      var ver = W.baselineVersion(versions, year, locked);
      var td = W.stateOf(states, 'topDown');
      var lines = [];
      if (td.status === 'approved') {
        var ap = W.lastOf(td, 'approve');
        lines.push({ tag: 'tag-ok', text: fill(Y.topDownApproved, { at: F.dateTime(ap && ap.at), by: ap ? ap.by : '' }) });
      } else {
        lines.push({ tag: 'tag-warn', text: fill(Y.topDownPending, { status: WL.status[td.status] }), entry: 'topDown' });
      }
      if (locked) {
        var lk = W.lastOf(W.stateOf(states, 'baseline'), 'lock');
        lines.push({ tag: 'tag-ok', text: fill(Y.locked, { at: F.dateTime(lk && lk.at), by: lk ? lk.by : '', code: ver.code }) });
      } else {
        lines.push({ tag: 'tag-warn', text: fill(Y.notLocked, { done: live.units.filter(function (u) { return u.sku === 'approved'; }).length, total: live.units.length }) });
      }
      if (versions.length) {
        lines.push({ tag: 'tag-muted', text: fill(Y.versions, { list: versions.map(function (v) { return v.code + ' (' + F.dateTime(v.at) + ')'; }).join(' · ') }) });
      }
      var year1 = h('section', { class: 'card rp-section rp-year no-print' },
        h('div', { class: 'rp-year-head' }, h('h2', null, page.yearTitle), lockBox(live, states, locked, ver, versions)),
        h('ul', { class: 'rp-year-lines' }, lines.map(function (l) {
          return h('li', null, h('span', { class: 'rp-dot badge ' + l.tag, 'aria-hidden': 'true' }), l.entry ? link(l.entry, l.text) : h('span', null, l.text));
        })));
      return [year1, actionTable(live, acts), h('p', { class: 'print-only rp-noprint-note' }, page.statusNoPrint)];
    }

    function lockBox(live, states, locked, ver, versions) {
      var role = store.role();
      var director = role.type === 'director';
      if (locked) {
        return h('div', { class: 'rp-lock is-locked' }, C.wfBadge('locked'),
          director ? null : h('span', { class: 'wf-reason' }, page.lockDirectorOnly),
          h('button', { type: 'button', class: 'btn btn-secondary rp-unlock', disabled: !director, title: director ? null : page.lockDirectorOnly, onClick: function () { unlock(ver); } }, page.unlockButton));
      }
      var check = W.canLock(states, live.units.map(function (u) { return u.id; }));
      var reason = !director ? page.lockDirectorOnly
        : !check.topDown ? page.lockTopDownPending
        : check.pending.length ? fill(page.lockPending, { n: check.pending.length }) : null;
      return h('div', { class: 'rp-lock' },
        reason ? h('span', { class: 'wf-reason' }, reason) : null,
        h('button', { type: 'button', class: 'btn btn-primary rp-lock-btn', disabled: !!reason, title: reason, onClick: function () { lock(live, versions); } }, fill(page.lockButton, { year: year })));
    }

    function lock(live, versions) {
      var nextCode = W.baselineVersion(W.addBaselineVersion(versions, year, {}), year, true).code;
      var plan = calc.sum(live.units.map(function (u) { return u.plan; }));
      C.dialog({
        title: fill(page.lockConfirm, { year: year }),
        lines: page.lockLines.map(function (l) { return fill(l, { code: nextCode }); })
          .concat([fill(page.lockTotals, { target: F.baht(live.total.amount), plan: F.baht(plan), n: live.units.length })]),
        confirmLabel: WL.actions.lock
      }).then(function (r) {
        if (!r.ok) return;
        var data = store.data();
        var rep = R.build();
        var gp = {};
        rep.units.forEach(function (u) { gp[u.id] = calc.gpOf(data, u.id); });
        var at = new Date().toISOString();
        var by = L.roles.director;
        var res = W.applyAction(store.workflowStates(), {
          step: 'baseline', unitId: null, action: 'lock', by: by, at: at,
          snapshot: { gp: gp, priceList: data.priceList, promotions: (data.promotions || []).filter(function (p) { return p.status === 'CONFIRMED'; }), report: rep }
        });
        if (!res.ok) return;
        store.saveWorkflowStates(res.states);
        store.set(store.planKey('baselineVersions'), W.addBaselineVersion(store.get(store.planKey('baselineVersions')), year, { by: by, at: at }));
        store.set('ui.summaryTab', 'report');
        draw();
        ctx.refreshMenu();
      });
    }

    function unlock(ver) {
      C.dialog({
        title: fill(page.unlockConfirm, { year: year }),
        lines: page.unlockLines.map(function (l) { return fill(l, { code: ver.code }); }),
        note: { label: page.unlockNote, required: true, requiredText: page.unlockNoteRequired },
        confirmLabel: page.unlockButton, danger: true
      }).then(function (r) {
        if (!r.ok) return;
        var res = W.applyAction(store.workflowStates(), { step: 'baseline', unitId: null, action: 'unlock', by: L.roles.director, at: new Date().toISOString(), note: r.note });
        if (!res.ok) return;
        store.saveWorkflowStates(res.states);
        store.set('ui.summaryTab', 'status');
        draw();
        ctx.refreshMenu();
      });
    }

    // ตารางรายการที่ต้องดำเนินการ (1 แถวต่อหน่วยขาย เรียงตามความรุนแรงจาก calc.planActions)
    function actionTable(live, acts) {
      var A = page.actionFilters;
      var AC = page.actionColumns;
      var chById = {};
      live.channels.forEach(function (c) { chById[c.id] = c; });
      var owners = [];
      acts.forEach(function (r) {
        var o = r.unit.owner;
        if (!o.vacant && !owners.some(function (x) { return x.id === o.id; })) owners.push({ id: o.id, name: o.name });
      });
      var rows = acts.filter(function (r) {
        var o = r.unit.owner;
        return (!act.channel || r.unit.channelId === act.channel)
          && (!act.owner || (act.owner === '_none' ? o.vacant : !o.vacant && o.id === act.owner))
          && (!act.gapOnly || r.rem.status === 'short' || r.rem.status === 'over');
      });
      var filters = h('div', { class: 'rp-act-filters' },
        h('label', { class: 'rp-filter' }, h('span', { class: 'field-label' }, A.channel), C.select({
          label: A.channel, value: act.channel,
          options: [{ value: '', label: A.channelAll }].concat(live.channels.map(function (c) { return { value: c.id, label: c.name }; })),
          onChange: function (v) { act.channel = v; draw(); }
        })),
        h('label', { class: 'rp-filter' }, h('span', { class: 'field-label' }, A.owner), C.select({
          label: A.owner, value: act.owner,
          options: [{ value: '', label: A.ownerAll }].concat(owners.map(function (o) { return { value: o.id, label: o.name }; }), [{ value: '_none', label: A.ownerNone }]),
          onChange: function (v) { act.owner = v; draw(); }
        })),
        h('label', { class: 'rp-filter rp-check' }, h('input', { type: 'checkbox', checked: act.gapOnly, onChange: function (e) { act.gapOnly = e.target.checked; draw(); } }), A.gapOnly));
      function status(entry, st, ch, u) {
        return link(entry, h('span', { class: 'wf-text wf-' + st }, page.statusShort[st] || WL.status[st]), ch.id, u.id, pageTitle(entry) + ' · ' + u.name + ' · ' + WL.status[st]);
      }
      var body = rows.length ? h('div', { class: 'table-scroll' }, h('table', { class: 'data-table rp-act-table' },
        h('thead', null, h('tr', null, [AC.channel, AC.unit, AC.owner, AC.gap, AC.phasing, AC.sku, AC.next].map(function (t, i) {
          return h('th', { scope: 'col', class: i === 3 ? 'num' : null }, t);
        }))),
        h('tbody', null, rows.map(function (r) {
          var u = r.unit, ch = chById[u.channelId];
          return h('tr', { class: 'rp-act-row', style: { '--c': C.tokenVar(ch.color) }, dataset: { unit: u.id } },
            h('td', { class: 'rp-act-ch', title: ch.fullName }, ch.name),
            h('th', { scope: 'row' }, link('skuPlanning', u.name, ch.id, u.id, fill(page.openPlan, { name: u.name }))),
            h('td', { class: 'rp-owner' + (u.owner.vacant ? ' is-vacant' : ''), title: u.owner.title }, u.owner.vacant ? A.ownerNone : u.owner.name),
            h('td', { class: 'num' }, gapText(r.rem)),
            h('td', null, status('phasing', u.phasing, ch, u)),
            h('td', null, status('skuPlanning', u.sku, ch, u)),
            h('td', null, link(r.entry, page.next[r.next], ch.id, u.id, fill(page.nextTip, { page: pageTitle(r.entry), name: u.name }), 'rp-next')));
        }))))
        : h('p', { class: 'rp-note rp-empty' }, acts.length ? page.actionsNoneFiltered : page.actionsNone);
      return h('section', { class: 'card rp-section rp-actions no-print' },
        h('div', { class: 'rp-act-head' }, h('h2', null, page.actionsTitle, acts.length ? h('span', { class: 'rp-count' }, fill(page.actionsCount, { n: acts.length })) : null), filters),
        body);
    }

    // =====================================================================
    // แท็บรายงานสรุปแผน
    // =====================================================================
    function reportTab(live, states, locked) {
      var cur = R.current(live);
      var M = model(cur.report);
      var ver = W.baselineVersion(store.get(store.planKey('baselineVersions')), year, locked);
      var wrap = h('div', { class: 'rp-report' + (ver.draft ? ' is-draft' : '') });
      if (ver.draft) wrap.appendChild(watermark());
      wrap.appendChild(docHead(M.rep, states, locked, ver, cur.fromSnapshot));
      wrap.appendChild(toolbar(M.rep));
      wrap.appendChild(kpis(M, locked));
      wrap.appendChild(h('div', { class: 'rp-row2' }, monthly(M), growth(M)));
      wrap.appendChild(unitTable(M));
      wrap.appendChild(mix(M));
      wrap.appendChild(people(M));
      wrap.appendChild(approvals(M));
      if (!ver.draft) wrap.appendChild(signatures());
      return [wrap];
    }

    // ตัวเลขตาม Channel ที่เลือก (rep = ข้อมูลปัจจุบัน หรือ Snapshot ของ Baseline)
    function model(rep) {
      channelFilter = channelFilter.filter(function (id) { return rep.channels.some(function (c) { return c.id === id; }); });
      var all = !channelFilter.length;
      var channels = rep.channels.filter(function (c) { return all || channelFilter.indexOf(c.id) >= 0; });
      var ids = channels.map(function (c) { return c.id; });
      var units = rep.units.filter(function (u) { return ids.indexOf(u.channelId) >= 0; });
      return {
        rep: rep, all: all, channels: channels, units: units,
        target: all ? rep.total.amount : calc.sum(channels.map(function (c) { return c.amount; })),
        prior: all ? rep.total.prior : calc.sum(channels.map(function (c) { return c.prior || 0; })),
        plan: calc.sum(units.map(function (u) { return u.plan; }))
      };
    }

    // ลายน้ำฉบับร่าง: บนจอซ้ำตามความยาวรายงาน / ตอนพิมพ์ 1 ชิ้นกลางทุกหน้า (print.css)
    function watermark() {
      var w = h('div', { class: 'rp-watermark', 'aria-hidden': 'true' });
      for (var i = 0; i < 8; i++) w.appendChild(h('span', { style: { top: (420 + i * 900) + 'px' } }, page.watermark));
      return w;
    }

    function docHead(rep, states, locked, ver, fromSnapshot) {
      var TL = page.topDownLine;
      var lk = W.lastOf(W.stateOf(states, 'baseline'), 'lock');
      var td = rep.approvals.filter(function (a) { return a.step === 'topDown'; })[0] || { status: rep.topDown };
      var tdLine = td.status === 'approved' ? fill(TL.approved, { at: F.dateTime(td.approvedAt), by: td.approvedBy || '' })
        : td.status === 'submitted' ? fill(TL.submitted, { at: F.dateTime(td.submittedAt), by: td.submittedBy || '' })
        : fill(TL.other, { status: WL.status[td.status] });
      printedAt = h('p', { class: 'rp-doc-printed print-only' }, fill(page.printedAt, { at: F.dateTime(new Date().toISOString()) }));
      var note = locked ? (fromSnapshot ? page.snapshotNote : null) : page.draftNote;
      return h('header', { class: 'card rp-doc-head' + (ver.draft ? ' is-draft' : ' is-locked') },
        h('div', { class: 'rp-doc-top' },
          h('h2', { class: 'rp-doc-title' }, fill(page.docTitle, { year: year })),
          h('span', { class: 'rp-doc-version' }, fill(page.version, { code: ver.code }))),
        h('p', { class: 'rp-doc-status' }, locked ? fill(page.statusLocked, { at: F.dateTime(lk && lk.at), by: lk ? lk.by : '' }) : page.statusDraft),
        h('p', { class: 'rp-doc-td' }, tdLine),
        printedAt,
        note ? h('p', { class: 'rp-doc-note' }, note) : null);
    }

    // ---------- แถบบน: Filter Channel · พิมพ์ ----------
    function toolbar(rep) {
      var filter = C.multiSelect({
        label: page.channelFilter, allLabel: page.channelAll, selected: page.channelSelected, clear: page.channelClear, empty: page.channelEmpty,
        options: rep.channels.map(function (c) { return { value: c.id, label: c.name + ' · ' + c.fullName }; }),
        value: channelFilter,
        onChange: function (v) { channelFilter = v; draw(); }
      });
      var print = h('button', { type: 'button', class: 'btn btn-secondary rp-print', onClick: function () { window.print(); } }, page.print);
      return h('div', { class: 'rp-toolbar no-print' }, filter, print);
    }

    // ---------- KPI ----------
    function kpis(M, locked) {
      var K = page.kpi;
      var rem = calc.remaining(M.target, M.plan);
      var done = M.units.filter(function (u) { return locked || u.sku === 'approved'; }).length;
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

    // ---------- กราฟเป้าหมายเทียบแผน รายเดือน ----------
    function monthly(M) {
      var bars = calc.addMonthly(M.units.map(function (u) { return u.targetM; }));
      var line = calc.addMonthly(M.units.map(function (u) { return u.planM; }));
      var dashed = calc.addMonthly(M.units.map(function (u) { return u.priorM; }));
      var T = page.monthlyTip;
      var prior = year - 1;
      return h('section', { class: 'card rp-section rp-monthly' }, h('h2', null, page.monthlyTitle),
        SP.core.charts.barLine({
          bars: bars, line: line, dashed: dashed, months: F.MONTHS,
          labels: {
            bar: page.monthlyLegend.bar, line: page.monthlyLegend.line, dashed: fill(page.monthlyLegend.dashed, { year: prior }),
            lineEnd: page.monthlyEnd.line, dashedEnd: fill(page.monthlyEnd.dashed, { year: prior })
          },
          tick: axisText, endText: mb,
          tip: function (m) {
            return [[T.target, mb(bars[m])], [T.plan, mb(line[m])], [T.gap, C.remainingText(calc.remaining(bars[m], line[m]), mb)], [fill(T.prior, { year: prior }), mb(dashed[m])]];
          }
        }));
    }

    // ---------- ที่มาของการเติบโต + สัดส่วน Channel ----------
    function growth(M) {
      var TD = P.topDown;
      var sub = { prior: M.prior, amount: M.target, children: M.channels, remaining: M.all ? M.rep.total.remaining : null };
      var wf = calc.growthWaterfall(sub);
      var share = calc.channelShareRows(sub);
      var charts = SP.core.charts;
      function parts(list) {
        return list.map(function (p) { var ch = calc.findById(M.channels, p.id); return { id: p.id, value: p.share, colorToken: ch.color, title: fill(TD.shareTip, { name: ch.name, pct: F.pct(p.share, 1) }) }; });
      }
      return h('section', { class: 'card rp-section rp-growth' }, h('h2', null, TD.wfTitle),
        charts.waterfall({
          start: { label: fill(TD.wfStart, { year: year - 1 }), value: wf.start }, end: { label: fill(TD.wfEnd, { year: year }), value: wf.end },
          steps: wf.steps.map(function (s) { return s.unallocated ? { id: '_rest', label: s.delta >= 0 ? TD.unallocated : TD.overAllocated, value: s.delta } : { id: s.id, label: s.name, value: s.delta, tag: s.isNew ? L.growthNew : null }; }),
          format: mb, signed: function (v) { return (v < 0 ? '−' : '+') + mb(Math.abs(v)); }, tick: axisText,
          axisNote: function (lo) { return fill(page.wfAxis, { value: F.number(lo / 1e6, 0) }); }
        }),
        h('h3', { class: 'rp-growth-share' }, fill(TD.shareTitle, { prior: year - 1, year: year })),
        charts.stackedShare({
          rows: [{ label: String(year - 1), parts: parts(share.prior) }, { label: String(year), parts: parts(share.target) }],
          legend: M.channels.map(function (c) { return { id: c.id, label: c.name, colorToken: c.color }; })
        }));
    }

    // ---------- ตาราง Channel → หน่วยขาย ----------
    function unitTable(M) {
      var T = page.tableColumns;
      var V = L.vsLastYear;
      var I = page.approvalIcons;
      var total = M.rep.total.amount;
      // แท่งเป้าหมายเทียบปีก่อน: สเกลจริงเดียวกันทั้งตาราง (แถว Channel และหน่วยขายตาม Filter รวมแถวที่พับอยู่)
      var scaleValues = [];
      M.channels.forEach(function (ch) { scaleValues.push(ch.amount, ch.prior); });
      M.units.forEach(function (u) { scaleValues.push(u.target, u.prior); });
      var scaleMax = SP.core.charts.niceScaleMax(scaleValues);
      function bar(target, prior, color) { return h('td', { class: 'rp-vly' }, SP.core.charts.vsLastYearBar(target, prior, scaleMax, { colorToken: color, year: year - 1 })); }
      function pct(v) { return h('td', { class: 'num rp-pct' }, F.pct(calc.pctFromAmount(total, v), 2)); }
      function approvedOf(list) {
        return fill(page.channelApproved, { done: list.filter(function (u) { return u.phasing === 'approved' && u.sku === 'approved'; }).length, total: list.length });
      }
      function icon(step, st, ch, u) {
        var s = AP_STATES.indexOf(st) >= 0 ? st : 'approved';
        var text = WL.status[s];
        return link(stepEntry(step), h('span', { class: 'rp-ap wf-text wf-' + s, 'aria-label': pageTitle(stepEntry(step)) + ': ' + text }, I[s]), ch.id, u.id,
          pageTitle(stepEntry(step)) + ' · ' + u.name + ' · ' + text);
      }
      var body = h('tbody');
      body.appendChild(h('tr', { class: 'rp-total-row' },
        h('th', { scope: 'row' }, page.totalRow),
        h('td', { class: 'num' }, mb(M.prior)), h('td', { class: 'num' }, mb(M.target)), pct(M.target), h('td', { class: 'rp-vly' }), h('td', { class: 'num' }, mb(M.plan)),
        h('td', null, gapText(calc.remaining(M.target, M.plan))),
        h('td', { class: 'rp-approved' }, approvedOf(M.units)), h('td')));
      M.channels.forEach(function (ch) {
        var list = M.units.filter(function (u) { return u.channelId === ch.id; });
        var plan = calc.sum(list.map(function (u) { return u.plan; }));
        var isCollapsed = !!collapsed[ch.id];
        body.appendChild(h('tr', { class: 'rp-ch-row', style: { '--c': C.tokenVar(ch.color) } },
          h('th', { scope: 'rowgroup', title: ch.fullName },
            h('button', {
              type: 'button', class: 'rp-toggle', title: page.collapseTitle, 'aria-expanded': isCollapsed ? 'false' : 'true',
              onClick: function () { collapsed[ch.id] = !collapsed[ch.id]; draw(); }
            }, isCollapsed ? '▸' : '▾'),
            ch.name + ' · ' + ch.fullName),
          h('td', { class: 'num' }, mb(ch.prior)), h('td', { class: 'num' }, mb(ch.amount)), pct(ch.amount), bar(ch.amount, ch.prior, ch.color), h('td', { class: 'num' }, mb(plan)),
          h('td', null, gapText(calc.remaining(ch.amount, plan))),
          h('td', { class: 'rp-approved' }, approvedOf(list)), h('td')));
        list.forEach(function (u) {
          body.appendChild(h('tr', { class: 'rp-unit-row', hidden: isCollapsed, style: { '--c': C.tokenVar(ch.color) } },
            h('th', { scope: 'row' }, link('skuPlanning', u.name, ch.id, u.id, fill(page.openPlan, { name: u.name }))),
            h('td', { class: 'num' }, mb(u.prior)), h('td', { class: 'num' }, mb(u.target)), pct(u.target), bar(u.target, u.prior, ch.color), h('td', { class: 'num' }, mb(u.plan)),
            h('td', null, gapText(calc.remaining(u.target, u.plan))),
            h('td', { class: 'rp-ap-cell', title: fill(page.approvalTip, { phasing: WL.status[u.phasing], sku: WL.status[u.sku] }) },
              icon('phasing', u.phasing, ch, u), icon('sku', u.sku, ch, u)),
            h('td', { class: 'rp-owner' + (u.owner.vacant ? ' is-vacant' : ''), title: u.owner.title }, u.owner.name)));
        });
      });
      var cols = ['name', 'num', 'num', 'pct', 'vly', 'num', 'gap', 'ap', 'owner'];
      var table = h('table', { class: 'data-table rp-table' },
        h('colgroup', null, cols.map(function (c) { return h('col', { class: 'rp-col-' + c }); })),
        h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, T.name),
          h('th', { scope: 'col', class: 'num' }, C.priorLabel(year - 1)),
          h('th', { scope: 'col', class: 'num' }, T.target),
          h('th', { scope: 'col', class: 'num', title: page.pctOfTotalTip }, T.pctOfTotal),
          h('th', { scope: 'col', class: 'rp-vly-head', title: V.headerTip }, h('span', { class: 'has-tip' }, V.header), SP.core.charts.vsLastYearAxis(scaleMax)),
          h('th', { scope: 'col', class: 'num' }, T.plan),
          h('th', { scope: 'col' }, T.gap),
          h('th', { scope: 'col', title: page.approvalHeadTip }, T.approval),
          h('th', { scope: 'col' }, T.owner))),
        body);
      var legend = h('p', { class: 'rp-legend' }, h('span', null, page.approvalLegend), AP_STATES.map(function (s) {
        return h('span', { class: 'rp-legend-item' }, h('span', { class: 'rp-ap wf-text wf-' + s, 'aria-hidden': 'true' }, I[s]), WL.status[s]);
      }));
      return h('section', { class: 'card rp-section rp-break rp-table-card' }, h('h2', null, page.tableTitle), h('div', { class: 'table-scroll' }, table), legend);
    }

    // ---------- สัดส่วนแผนตามกลุ่มสินค้า ----------
    function mix(M) {
      var total = M.plan;
      function items(list, labelOf, tokenOf) {
        return list.filter(function (x) { return x.value > 0.5; }).map(function (x) {
          return { label: labelOf(x), value: x.value, colorToken: tokenOf(x.key), text: fill(page.mixText, { value: mb(x.value), pct: total ? F.pct(x.value / total, 1) : '–' }) };
        });
      }
      var byStatus = items(calc.mergeMix(M.units.map(function (u) { return u.mix.status; }), 'status'), function (x) { return L.status[x.key] || x.key; }, function (k) { return STATUS_TOKENS[k] || '--c-bar'; });
      var kind = mixBy === 'category' ? 'category' : 'series';
      var byGroup = items(calc.mergeMix(M.units.map(function (u) { return u.mix[kind]; }), kind, 8), function (x) {
        return x.key === null ? page.mixOther : x.label || (kind === 'series' ? L.series.none : page.mixNoCategory);
      }, function () { return '--c-bar'; });
      return h('section', { class: 'card rp-section rp-break rp-mix' }, h('h2', null, page.mixTitle),
        h('div', { class: 'grid-2 rp-mix-grid' },
          h('div', null, h('h3', null, page.mixByStatus), SP.core.charts.hbars({ items: byStatus })),
          h('div', null,
            h('div', { class: 'rp-mix-head' }, h('h3', null, page.mixGroupLabel),
              h('span', { class: 'no-print' }, C.segmented({ label: page.mixGroupLabel, value: kind, options: ['series', 'category'].map(function (v) { return { value: v, label: page.mixBy[v] }; }),
                onChange: function (v) { mixBy = v; draw(); } })),
              h('span', { class: 'print-only' }, page.mixBy[kind])),
            SP.core.charts.hbars({ items: byGroup }))));
    }

    // ---------- เป้าหมายรายผู้รับผิดชอบ (เฉพาะเดือนที่รับผิดชอบ) ----------
    function people(M) {
      var PC = page.peopleColumns;
      var targets = {}, plans = {}, names = {};
      M.units.forEach(function (u) { targets[u.id] = u.targetM; plans[u.id] = u.planM; names[u.id] = u.name; });
      var assignments = M.rep.assignments, salespeople = M.rep.salespeople;
      var rows = [];
      salespeople.concat([null]).forEach(function (p) {
        var id = p ? p.id : null;
        var t = calc.performanceByPerson(assignments, salespeople, id, year, targets);
        if (!t.units.length) return;
        var pl = calc.performanceByPerson(assignments, salespeople, id, year, plans);
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
      return h('section', { class: 'card rp-section rp-people' }, h('h2', null, page.peopleTitle),
        h('p', { class: 'rp-note' }, page.peopleNote),
        h('div', { class: 'table-scroll' }, h('table', { class: 'data-table rp-people-table' },
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, PC.name), h('th', { scope: 'col' }, PC.units),
            h('th', { scope: 'col', class: 'num' }, PC.target), h('th', { scope: 'col', class: 'num' }, PC.plan), h('th', { scope: 'col' }, PC.gap))),
          body)));
    }

    // ---------- การอนุมัติ (จากประวัติ Workflow ของ Top-down และ Phasing / แผน SKU ทุกหน่วยขาย) ----------
    function approvals(M) {
      var A = page.approvalsColumns;
      var ids = M.units.map(function (u) { return u.id; });
      var names = {};
      M.rep.units.forEach(function (u) { names[u.id] = u.name; });
      var rows = M.rep.approvals.filter(function (a) { return !a.unitId || ids.indexOf(a.unitId) >= 0; });
      function when(at) { return at ? F.dateTime(at) : '–'; }
      return h('section', { class: 'card rp-section rp-break rp-approvals' }, h('h2', null, page.approvalsTitle),
        h('p', { class: 'rp-note' }, page.approvalsNote),
        h('div', { class: 'table-scroll' }, h('table', { class: 'data-table rp-approvals-table' },
          h('thead', null, h('tr', null, [A.step, A.unit, A.submittedBy, A.submittedAt, A.approvedBy, A.approvedAt].map(function (t) { return h('th', { scope: 'col' }, t); }))),
          h('tbody', null, rows.map(function (a) {
            return h('tr', { class: a.step === 'topDown' ? 'is-year' : null },
              h('td', null, pageTitle(stepEntry(a.step))),
              h('th', { scope: 'row' }, a.unitId ? names[a.unitId] : page.approvalsAll),
              h('td', null, a.submittedBy || '–'), h('td', { class: 'rp-when' }, when(a.submittedAt)),
              h('td', null, a.approvedBy || h('span', { class: 'wf-text wf-' + a.status }, WL.status[a.status])), h('td', { class: 'rp-when' }, when(a.approvedAt)));
          })))));
    }

    // ---------- ช่องลงนาม (ท้ายรายงานที่ล็อกแล้ว) ----------
    function signatures() {
      var SF = page.signFields;
      return h('section', { class: 'rp-sign' }, h('h2', null, page.signTitle),
        h('div', { class: 'rp-sign-grid' }, [L.roles.director, L.roles.management].map(function (role) {
          return h('div', { class: 'rp-sign-box' }, h('strong', { class: 'rp-sign-role' }, role),
            [SF.name, SF.signature, SF.date].map(function (f) { return h('div', { class: 'rp-sign-line' }, h('span', null, f), h('span', { class: 'rp-sign-blank' })); }));
        })));
    }

    // เวลาที่พิมพ์ในหัวรายงาน = เวลาที่สั่งพิมพ์
    window.addEventListener('beforeprint', function () {
      if (printedAt && document.body.contains(printedAt)) printedAt.textContent = fill(page.printedAt, { at: F.dateTime(new Date().toISOString()) });
    });

    draw();
  }

  SP.modules.summary = { render: render };
})(window.SP);
