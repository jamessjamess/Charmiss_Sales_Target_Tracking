/*
 * modules/summary/summary.js — ขั้นที่ 4: ติดตามสถานะ | รายงานสรุปแผน {ปี} (CR-12)
 *
 * หน้าที่:  แท็บใต้หัวข้อ รายงานสรุปแผน | ติดตามสถานะ (n) — ค่าเริ่มต้น = รายงานสรุปแผนเสมอ จำแท็บล่าสุดที่ ui.summaryTab (CR-13)
 *   ติดตามสถานะ (งานที่ต้องทำ พิมพ์ไม่ได้):
 *     บรรทัดสรุป (จัดสรรเป้าหมายประจำปี · Baseline · รายงานที่เคยล็อก) + ล็อก / ปลดล็อก Baseline (Sales Director)
 *     CR-16: อนุมัติเป้าหมายแล้วมีร้านค้าย้ายเขต → บรรทัด ร้านค้าย้ายเขตหลังอนุมัติเป้าหมาย + รายการร้าน (report.storeMoves) นับเป็น 1 รายการ
 *     ตารางเดียว 1 แถวต่อหน่วยขาย (ทุกหน่วย calc.planActions all เรียงตามความรุนแรง ไม่มีประเด็นอยู่ท้าย): ส่วนต่าง ·
 *     เป้าหมายรายเดือน / แผน SKU (สถานะ · ผู้อนุมัติ · วันที่อนุมัติ กดสถานะ = Popover ประวัติ) · การดำเนินการถัดไป
 *     + ตัวกรอง Channel · ผู้รับผิดชอบ · เฉพาะที่มีส่วนต่าง · แสดงเฉพาะที่มีประเด็น
 *   รายงานสรุปแผน (ประกาศและหลักฐานข้อตกลง พิมพ์ / บันทึก PDF ได้เฉพาะแท็บนี้):
 *     หัวรายงาน: เลขฉบับ {ปี}-BL-{nn} | {ปี}-DRAFT · สถานะ · จัดสรรเป้าหมายประจำปี · พิมพ์เมื่อ · หมายเหตุที่มาของตัวเลข
 *     ยังไม่ล็อก = ลายน้ำ "ฉบับร่าง · ยังไม่ได้รับอนุมัติ" ทุกหน้า (บนจอและตอนพิมพ์) / ล็อกแล้ว = ตัวเลขทั้งหมดจาก Snapshot ของ Baseline
 *     Filter Channel · KPI 4 ใบ · กราฟรายเดือน (charts.barLine) : ที่มาของการเติบโต (charts.waterfall + stackedShare) = 60 : 40
 *     ตาราง Channel → หน่วยขาย (ยอดขายปีก่อน · เป้าหมาย · % ของ Total · เป้าหมายเทียบปีก่อน · แผน · ส่วนต่าง · สถานะอนุมัติ 2 ไอคอน · ผู้รับผิดชอบ)
 *     สัดส่วนแผนตามกลุ่มสินค้า · เป้าหมายรายผู้รับผิดชอบ / การอนุมัติ: ยังไม่ล็อก = บรรทัด "อนุมัติครบแล้ว x/y หน่วยขาย" ใต้หัวรายงาน ·
 *     ล็อกแล้ว = ตารางย่อ 1 แถวต่อหน่วยขาย (ผู้อนุมัติ · วันที่ ของเป้าหมายรายเดือนและแผน SKU) + ช่องลงนาม
 *     ตัวเลขเป็นล้านบาท 2 ตำแหน่ง (KPI บาทเต็ม) / พิมพ์ A4 แนวนอน
 * อ่านจาก data/:  settings, content (pages.summary, pages.<ขั้น>.title, labels) — ตัวเลขทั้งหมดของรายงานมาจาก core/report.js
 * CR-17 Feature Flags: ปิด approvalWorkflow = ติดตามสถานะเหลือ Channel · หน่วยขาย · ผู้รับผิดชอบ · ส่วนต่าง · การดำเนินการถัดไป (ปิดส่วนต่าง /
 *   กำหนดผู้รับผิดชอบ / –) ไม่มีบรรทัดจัดสรรเป้าหมายประจำปี · รายงานไม่มีบรรทัดสถานะ การอนุมัติ และคอลัมน์สถานะอนุมัติ · KPI = หน่วยขายที่จัดสรรครบ x / y
 *   ปิด baseline = ไม่มีปุ่มล็อก / บรรทัด Baseline / ส่วนการอนุมัติ / ช่องลงนาม รายงานเป็น {ปี}-DRAFT + ลายน้ำเสมอ
 * store อ่าน:     app.planYear, plan.<ปี>.workflow.*, plan.<ปี>.baselineVersions, ui.role, ui.summaryTab (+ Key ที่ core/report.js อ่าน)
 * store เขียน:    ui.summaryTab · ui.selection (ก่อนพาไปหน้าของรายการที่กด)
 *                 plan.<ปี>.workflow.baseline.all (ล็อก / ปลดล็อกผ่าน core/workflow.js — snapshot = { gp ต่อหน่วยขาย, priceList,
 *                 accountPrices (CR-18), promotions ที่ยืนยันแล้ว, report = core/report.js build() }) · plan.<ปี>.baselineVersions (ต่อท้ายฉบับใหม่ตอนล็อก)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var W = SP.core.workflow;
  var store = SP.core.store;
  var R = SP.core.report;
  var FT = SP.core.features;
  var h = C.h;
  var fill = C.fill;

  var channelFilter = [];   // รายงาน: Channel ที่เลือก ([] = ทุก Channel)
  var collapsed = {};       // รายงาน: <channelId>: true = พับแถวหน่วยขาย
  var mixBy = 'series';     // รายงาน: กราฟกลุ่มสินค้าที่ 2 'series' | 'category'
  var act = { channel: '', owner: '', gapOnly: false, issuesOnly: false };   // ติดตามสถานะ: ตัวกรอง (owner '_none' = ยังไม่มีผู้รับผิดชอบ)
  // สีแท่งตาม Status ของ SKU (ชื่อ Token)
  var STATUS_TOKENS = { planned: '--c-st-planned-fg', 'new': '--c-st-new-fg', active: '--c-st-active-fg', clearance: '--c-st-clearance-fg', discontinued: '--c-st-discontinued-fg' };
  var AP_STATES = ['draft', 'submitted', 'approved', 'returned', 'review'];

  function mb(v) { return F.millionPlain(v, 2); }
  // ป้ายแกนเป็นล้านบาท (charts.millionTick)
  function axisText(v, step) { return SP.core.charts.millionTick(v, step); }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var WL = L.workflow;
    var P = SP.data.content.pages;
    var year = store.year();
    var reg = SP.core.registry;
    var printedAt = null;
    var AP_ON = FT.isOn('approvalWorkflow');   // CR-17
    var BL_ON = FT.isOn('baseline');

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
      var locked = R.locked(states);
      var live = R.build();
      var acts = R.actions(live);
      var moved = R.storeMoves();
      var tab = store.get('ui.summaryTab');
      if (tab !== 'status' && tab !== 'report') tab = 'report';
      document.body.classList.toggle('rp-on-status', tab === 'status');
      root.appendChild(tabs(tab, acts.length + (!locked && moved.length ? 1 : 0)));
      (tab === 'status' ? statusTab(live, acts, states, locked, moved) : reportTab(live, states, locked)).forEach(function (n) { root.appendChild(n); });
    }

    // ---------- แท็บ ----------
    function tabs(tab, n) {
      var T = page.tabs;
      return h('div', { class: 'rp-tabs no-print' }, C.segmented({
        label: page.tabLabel, value: tab,
        options: [
          { value: 'report', title: page.tabTips.report, label: T.report },
          { value: 'status', title: (BL_ON ? page.tabTips.status : page.tabTips.statusLite) + (n ? ' · ' + fill(page.tabCountTip, { n: n }) : ''), label: n ? fill(T.statusCount, { n: n }) : T.status }
        ],
        onChange: function (v) { store.set('ui.summaryTab', v); draw(); window.scrollTo(0, 0); }
      }));
    }

    // =====================================================================
    // แท็บติดตามสถานะ
    // =====================================================================
    function statusTab(live, acts, states, locked, moved) {
      var Y = page.yearLines;
      var versions = store.get(store.planKey('baselineVersions'));
      var ver = W.baselineVersion(versions, year, locked);
      var td = W.stateOf(states, 'topDown');
      var lines = [];
      if (!AP_ON) { /* CR-17: ไม่มีขั้นอนุมัติ = ไม่มีบรรทัดจัดสรรเป้าหมายประจำปี */ }
      else if (td.status === 'approved') {
        var ap = W.lastOf(td, 'approve');
        lines.push({ tag: 'tag-ok', text: fill(Y.topDownApproved, { at: F.dateTime(ap && ap.at), by: ap ? ap.by : '' }) });
        if (moved && moved.length) lines.push(storesMovedLine(moved));
      } else {
        lines.push({ tag: 'tag-warn', text: fill(Y.topDown, { status: WL.status[td.status] }), entry: 'topDown' });
      }
      if (!BL_ON) { /* CR-17: ไม่มี Baseline */ }
      else if (locked) {
        var lk = W.lastOf(W.stateOf(states, 'baseline'), 'lock');
        lines.push({ tag: 'tag-ok', text: fill(Y.locked, { at: F.dateTime(lk && lk.at), code: ver.code }) });
      } else {
        lines.push({ tag: 'tag-warn', text: Y.notLocked });
      }
      if (BL_ON && versions.length) {
        lines.push({ tag: 'tag-muted', text: fill(Y.versions, { list: versions.map(function (v) { return v.code + ' (' + F.dateTime(v.at) + ')'; }).join(' · ') }) });
      }
      var year1 = !lines.length && !BL_ON ? null : h('section', { class: 'card rp-section rp-year no-print' },
        h('div', { class: 'rp-year-head' }, h('h2', null, page.yearTitle), BL_ON ? lockBox(live, states, locked, ver, versions) : null),
        h('ul', { class: 'rp-year-lines' }, lines.map(function (l) {
          return h('li', { class: l.details ? 'rp-year-detail' : null }, h('span', { class: 'rp-dot badge ' + l.tag, 'aria-hidden': 'true' }),
            h('span', { class: 'rp-year-text' }, l.entry ? link(l.entry, l.text) : h('span', { title: l.title || null }, l.text), l.details || null));
        })));
      return [year1, statusTable(live, acts, states, locked), h('p', { class: 'print-only rp-noprint-note' }, page.statusNoPrint)].filter(Boolean);
    }

    // CR-16 §5.4: ร้านค้าย้ายเขตหลังอนุมัติเป้าหมาย (เป้าหมายของเขตไม่เปลี่ยน) + รายการร้าน + ลิงก์หน้าเขตการขายและร้านค้า
    function storesMovedLine(moved) {
      var Y = page.yearLines;
      var MAX = 8;
      var data = store.data();
      function zone(id) { var t = id ? calc.findById(data.territories, id) : null; return t ? String(t.name).split(' · ')[0] : Y.unassigned; }
      var amount = calc.sum(moved.map(function (m) { return m.salesRef; }));
      var names = SP.data.channels.filter(function (c) { return c.allocationUnit === 'TERRITORY'; }).map(function (c) { return c.name; }).join(', ');
      var items = moved.slice(0, MAX).map(function (m) {
        return h('li', null, fill(Y.storesMovedItem, { name: m.name, id: m.systemId, from: zone(m.from), to: zone(m.to), month: F.date(m.fromMonth), amount: F.baht(m.salesRef) }));
      });
      if (moved.length > MAX) items.push(h('li', { class: 'muted' }, fill(Y.storesMovedMore, { n: moved.length - MAX })));
      items.push(h('li', null, link('territories', fill(Y.storesMovedLink, { page: fill(pageTitle('territories'), { territoryChannels: names }) }))));
      return {
        tag: 'tag-warn', title: Y.storesMovedTip,
        text: fill(Y.storesMoved, { n: F.number(moved.length), amount: F.baht(amount) }),
        details: h('ul', { class: 'rp-moved-list' }, items)
      };
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
          snapshot: { gp: gp, priceList: data.priceList, accountPrices: data.accountPrices || [], promotions: (data.promotions || []).filter(function (p) { return p.status === 'CONFIRMED'; }), report: rep }
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

    // ตารางสถานะและการอนุมัติ 1 แถวต่อหน่วยขาย (CR-13: ทุกหน่วยขาย เรียงตามความรุนแรงจาก calc.planActions หน่วยที่ไม่มีประเด็นอยู่ท้าย)
    //   acts = รายการที่มีประเด็น (ตัวเลขเดียวกับเมนูข้าง) / ผู้อนุมัติและวันที่จาก W.approvalRows (report.build) / กดสถานะ = Popover ประวัติของขั้นนั้น
    function statusTable(live, acts, states, locked) {
      var A = page.actionFilters;
      var AC = page.actionColumns;
      var chById = {};
      live.channels.forEach(function (c) { chById[c.id] = c; });
      var all = calc.planActions(live.units.map(function (u) {
        return { id: u.id, name: u.name, channelId: u.channelId, target: u.target, plan: u.plan, phasing: u.phasing, sku: u.sku, vacant: u.owner.vacant, owner: u.owner };
      }), { topDown: live.topDown, locked: locked, all: true, approval: AP_ON });
      var approvalOf = {};
      live.approvals.forEach(function (a) { approvalOf[a.step + '.' + a.unitId] = a; });
      var owners = [];
      all.forEach(function (r) {
        var o = r.unit.owner;
        if (!o.vacant && !owners.some(function (x) { return x.id === o.id; })) owners.push({ id: o.id, name: o.name });
      });
      var rows = all.filter(function (r) {
        var o = r.unit.owner;
        return (!act.channel || r.unit.channelId === act.channel)
          && (!act.owner || (act.owner === '_none' ? o.vacant : !o.vacant && o.id === act.owner))
          && (!act.gapOnly || r.rem.status === 'short' || r.rem.status === 'over')
          && (!act.issuesOnly || r.issue);
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
        h('label', { class: 'rp-filter rp-check' }, h('input', { type: 'checkbox', checked: act.gapOnly, onChange: function (e) { act.gapOnly = e.target.checked; draw(); } }), A.gapOnly),
        h('label', { class: 'rp-filter rp-check rp-switch' }, h('input', { type: 'checkbox', role: 'switch', checked: act.issuesOnly, onChange: function (e) { act.issuesOnly = e.target.checked; draw(); } }), A.issuesOnly));
      // สถานะ = ปุ่มเปิด Popover ประวัติ Workflow ของขั้นนั้น (ผู้ส่ง · วันที่ส่ง · ส่งกลับแก้ไข · ผู้อนุมัติ) + ลิงก์ไปหน้านั้น
      function statusCell(step, st, ch, u) {
        var entry = stepEntry(step);
        var btn = h('button', { type: 'button', class: 'rp-status-btn', title: page.historyOpen, dataset: { step: step } },
          h('span', { class: 'wf-text wf-' + st }, page.statusShort[st] || WL.status[st]));
        C.popover(btn, function (close) {
          var hist = W.stateOf(states, step, u.id).history || [];
          return h('div', { class: 'rp-hist' },
            h('strong', { class: 'rp-hist-title' }, fill(page.historyTitle, { step: pageTitle(entry), unit: u.name })),
            hist.length ? h('ol', { class: 'rp-hist-list' }, hist.map(function (ev) {
              return h('li', { class: 'rp-hist-item is-' + ev.action },
                h('span', { class: 'rp-hist-event' }, (WL.events[ev.action] || ev.action) + ' ' + (ev.by || '')),
                h('span', { class: 'rp-hist-at' }, F.dateTime(ev.at)),
                ev.note ? h('span', { class: 'rp-hist-note' }, ev.note) : null);
            })) : h('p', { class: 'rp-note' }, WL.historyEmpty),
            link(entry, fill(page.historyGo, { page: pageTitle(entry) }), ch.id, u.id, null, 'rp-hist-go'));
        }, { className: 'rp-hist-popover', label: page.historyOpen });
        return btn;
      }
      function approvalCells(step, u) {
        var a = approvalOf[step + '.' + u.id] || {};
        var done = a.status === 'approved' && a.approvedBy;
        return [h('td', { class: 'rp-appr' }, done ? a.approvedBy : page.noIssue), h('td', { class: 'rp-when' }, done ? F.dateTime(a.approvedAt) : page.noIssue)];
      }
      // CR-17 ปิด approvalWorkflow: ไม่มีกลุ่มคอลัมน์เป้าหมายรายเดือน / แผน SKU (สถานะ · ผู้อนุมัติ · วันที่)
      var liteHead = h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, AC.channel), h('th', { scope: 'col' }, AC.unit), h('th', { scope: 'col' }, AC.owner),
        h('th', { scope: 'col', class: 'num' }, AC.gap), h('th', { scope: 'col' }, AC.next)));
      var body = rows.length ? h('div', { class: 'table-scroll' }, h('table', { class: 'data-table rp-act-table' + (AP_ON ? '' : ' is-lite') },
        !AP_ON ? liteHead : h('thead', null,
          h('tr', null,
            h('th', { scope: 'col', rowspan: '2' }, AC.channel), h('th', { scope: 'col', rowspan: '2' }, AC.unit), h('th', { scope: 'col', rowspan: '2' }, AC.owner),
            h('th', { scope: 'col', rowspan: '2', class: 'num' }, AC.gap),
            h('th', { scope: 'colgroup', colspan: '3', class: 'rp-group-head' }, AC.phasing), h('th', { scope: 'colgroup', colspan: '3', class: 'rp-group-head' }, AC.sku),
            h('th', { scope: 'col', rowspan: '2' }, AC.next)),
          h('tr', null, [AC.status, AC.approvedBy, AC.approvedAt, AC.status, AC.approvedBy, AC.approvedAt].map(function (t, i) {
            return h('th', { scope: 'col', class: 'rp-sub-head' + (i % 3 === 0 ? ' is-first' : '') }, t);
          }))),
        h('tbody', null, rows.map(function (r) {
          var u = r.unit, ch = chById[u.channelId];
          return h('tr', { class: 'rp-act-row' + (r.issue ? ' has-issue' : ' no-issue'), style: { '--c': C.tokenVar(ch.color) }, dataset: { unit: u.id } },
            h('td', { class: 'rp-act-ch', title: ch.fullName }, ch.name),
            h('th', { scope: 'row' }, link('skuPlanning', u.name, ch.id, u.id, fill(page.openPlan, { name: u.name }))),
            h('td', { class: 'rp-owner' + (u.owner.vacant ? ' is-vacant' : ''), title: u.owner.title }, u.owner.vacant ? A.ownerNone : u.owner.name),
            h('td', { class: 'num' }, gapText(r.rem)),
            AP_ON ? [h('td', { class: 'rp-status is-first' }, statusCell('phasing', u.phasing, ch, u)), approvalCells('phasing', u),
              h('td', { class: 'rp-status is-first' }, statusCell('sku', u.sku, ch, u)), approvalCells('sku', u)] : null,
            h('td', null, r.next ? link(r.entry, page.next[r.next], ch.id, u.id, fill(page.nextTip, { page: pageTitle(r.entry), name: u.name }), 'rp-next') : page.noIssue));
        }))))
        : h('p', { class: 'rp-note rp-empty' }, act.issuesOnly && !acts.length ? page.actionsNone : page.actionsNoneFiltered);
      return h('section', { class: 'card rp-section rp-actions no-print' },
        h('div', { class: 'rp-act-head' }, h('h2', null, AP_ON ? page.actionsTitle : page.actionsTitleLite, h('span', { class: 'rp-count' }, fill(page.actionsCount, { n: acts.length, total: all.length }))), filters),
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
      wrap.appendChild(docHead(M, states, locked, ver, cur.fromSnapshot));
      wrap.appendChild(toolbar(M.rep));
      wrap.appendChild(kpis(M, locked));
      wrap.appendChild(h('div', { class: 'rp-row2' }, monthly(M), growth(M)));
      wrap.appendChild(unitTable(M));
      wrap.appendChild(mix(M));
      wrap.appendChild(people(M));
      if (!ver.draft && BL_ON) {
        if (AP_ON) wrap.appendChild(approvals(M));
        wrap.appendChild(signatures());
      }
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

    function docHead(M, states, locked, ver, fromSnapshot) {
      var rep = M.rep;
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
        // CR-17: ปิด approvalWorkflow = ไม่มีบรรทัดสถานะ / จัดสรรเป้าหมายประจำปี / การอนุมัติ (ลายน้ำฉบับร่างยังอยู่)
        AP_ON ? h('p', { class: 'rp-doc-status' }, locked ? fill(page.statusLocked, { at: F.dateTime(lk && lk.at), by: lk ? lk.by : '' }) : page.statusDraft) : null,
        AP_ON ? h('p', { class: 'rp-doc-td' }, tdLine) : null,
        // ยังไม่ล็อก: การอนุมัติเป็นบรรทัดเดียว (ตารางการอนุมัติแสดงเมื่อล็อก Baseline แล้ว)
        ver.draft && AP_ON ? h('p', { class: 'rp-doc-approval' }, fill(page.approvalLine, {
          done: M.units.filter(function (u) { return u.phasing === 'approved' && u.sku === 'approved'; }).length, total: M.units.length
        })) : null,
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
      // CR-17 ปิด approvalWorkflow: หน่วยขายที่แผน SKU จัดสรรครบ (คงเหลือ ±1 บาท) แทนความคืบหน้าการอนุมัติ
      var done = M.units.filter(function (u) { return AP_ON ? locked || u.sku === 'approved' : calc.remaining(u.target, u.plan).status === 'ok'; }).length;
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
        card('rp-kpi-approval', AP_ON ? K.approval : K.allocated, fill(K.approvalValue, { done: done, total: total }), [
          h('span', { class: 'rp-progress', role: 'img', 'aria-label': F.pct(total ? done / total : 0, 0) }, h('span', { class: 'rp-progress-fill', style: { width: (total ? done / total * 100 : 0) + '%' } })),
          h('span', null, AP_ON ? K.approvalSub : K.allocatedSub)]));
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
          rows: [{ label: L.priorInfo.short, parts: parts(share.prior) }, { label: String(year), parts: parts(share.target) }],
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
        AP_ON ? h('td', { class: 'rp-approved' }, approvedOf(M.units)) : null, h('td')));
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
          AP_ON ? h('td', { class: 'rp-approved' }, approvedOf(list)) : null, h('td')));
        list.forEach(function (u) {
          body.appendChild(h('tr', { class: 'rp-unit-row', hidden: isCollapsed, style: { '--c': C.tokenVar(ch.color) } },
            h('th', { scope: 'row' }, link('skuPlanning', u.name, ch.id, u.id, fill(page.openPlan, { name: u.name }))),
            h('td', { class: 'num' }, mb(u.prior)), h('td', { class: 'num' }, mb(u.target)), pct(u.target), bar(u.target, u.prior, ch.color), h('td', { class: 'num' }, mb(u.plan)),
            h('td', null, gapText(calc.remaining(u.target, u.plan))),
            AP_ON ? h('td', { class: 'rp-ap-cell', title: fill(page.approvalTip, { phasing: WL.status[u.phasing], sku: WL.status[u.sku] }) },
              icon('phasing', u.phasing, ch, u), icon('sku', u.sku, ch, u)) : null,
            h('td', { class: 'rp-owner' + (u.owner.vacant ? ' is-vacant' : ''), title: u.owner.title }, u.owner.name)));
        });
      });
      var cols = ['name', 'num', 'num', 'pct', 'vly', 'num', 'gap', 'ap', 'owner'].filter(function (c) { return AP_ON || c !== 'ap'; });
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
          AP_ON ? h('th', { scope: 'col', title: page.approvalHeadTip }, T.approval) : null,
          h('th', { scope: 'col' }, T.owner))),
        body);
      var legend = h('p', { class: 'rp-legend' }, h('span', null, page.approvalLegend), AP_STATES.map(function (s) {
        return h('span', { class: 'rp-legend-item' }, h('span', { class: 'rp-ap wf-text wf-' + s, 'aria-hidden': 'true' }, I[s]), WL.status[s]);
      }));
      return h('section', { class: 'card rp-section rp-break rp-table-card' }, h('h2', null, page.tableTitle), h('div', { class: 'table-scroll' }, table), AP_ON ? legend : null);
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
    // ---------- การอนุมัติ (ล็อก Baseline แล้วเท่านั้น — CR-13): บรรทัดจัดสรรเป้าหมายประจำปี + ตารางย่อ 1 แถวต่อหน่วยขาย ----------
    function approvals(M) {
      var A = page.approvalsColumns;
      var byKey = {};
      M.rep.approvals.forEach(function (a) { byKey[a.step + '.' + (a.unitId || 'all')] = a; });
      var td = byKey['topDown.all'] || {};
      function who(a) { return a && a.status === 'approved' && a.approvedBy ? a.approvedBy : page.noIssue; }
      function when(a) { return a && a.status === 'approved' && a.approvedAt ? F.dateTime(a.approvedAt) : page.noIssue; }
      return h('section', { class: 'card rp-section rp-break rp-approvals' }, h('h2', null, page.approvalsTitle),
        h('p', { class: 'rp-approvals-td' }, fill(page.approvalsTopDown, { by: who(td), at: when(td) })),
        h('div', { class: 'table-scroll' }, h('table', { class: 'data-table rp-approvals-table' },
          h('thead', null,
            h('tr', null, h('th', { scope: 'col', rowspan: '2' }, A.unit),
              h('th', { scope: 'colgroup', colspan: '2', class: 'rp-group-head' }, A.phasing), h('th', { scope: 'colgroup', colspan: '2', class: 'rp-group-head' }, A.sku)),
            h('tr', null, [A.approvedBy, A.approvedAt, A.approvedBy, A.approvedAt].map(function (t, i) { return h('th', { scope: 'col', class: 'rp-sub-head' + (i % 2 === 0 ? ' is-first' : '') }, t); }))),
          h('tbody', null, M.units.map(function (u) {
            var ph = byKey['phasing.' + u.id], sk = byKey['sku.' + u.id];
            return h('tr', null, h('th', { scope: 'row' }, u.name),
              h('td', { class: 'is-first' }, who(ph)), h('td', { class: 'rp-when' }, when(ph)),
              h('td', { class: 'is-first' }, who(sk)), h('td', { class: 'rp-when' }, when(sk)));
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
