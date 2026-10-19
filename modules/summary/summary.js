/*
 * modules/summary/summary.js — ขั้นที่ 4: ติดตามสถานะ | รายงานสรุปแผน {ปี} (CR-12)
 *
 * หน้าที่:  แท็บใต้หัวข้อ รายงานสรุปแผน | ติดตามสถานะ (n) — ค่าเริ่มต้น = รายงานสรุปแผนเสมอ จำแท็บล่าสุดที่ ui.summaryTab (CR-13)
 *   ติดตามสถานะ (งานที่ต้องทำ พิมพ์ไม่ได้):
 *     บรรทัดสรุป (จัดสรรเป้าหมายประจำปี · Baseline · รายงานที่เคยล็อก) + ล็อก / ปลดล็อก Baseline (Sales Director)
 *     CR-16: อนุมัติเป้าหมายแล้วมีร้านค้าย้ายเขต → บรรทัด ร้านค้าย้ายเขตหลังอนุมัติเป้าหมาย + รายการร้าน (report.storeMoves) นับเป็น 1 รายการ
 *     ตารางเดียว 1 แถวต่อหน่วยขาย (ทุกหน่วย calc.planActions all เรียงตามความรุนแรง ไม่มีประเด็นอยู่ท้าย): ส่วนต่าง ·
 *     เป้าหมายรายเดือน / แผน SKU (สถานะ · ผู้อนุมัติ · วันที่อนุมัติ กดสถานะ = Popover ประวัติ) · การดำเนินการถัดไป
 *     + ตัวกรอง Channel · ผู้รับผิดชอบ · CR-28 แท็บ ทั้งหมด · ขาด · เกิน · จัดสรรครบ · ไม่มีผู้รับผิดชอบ พร้อมจำนวน (calc.actionTabs · จำที่ ui.statusFilter)
 *     CR-28 ส่วนต่าง = ขาด / เกิน {ล้าน} ({% ของเป้าหมายหน่วยขาย}) · ปุ่ม ไปแก้ไข → / กำหนดผู้รับผิดชอบ → · เรียง ไม่มีผู้รับผิดชอบ → % ส่วนต่างมากไปน้อย
 *   รายงานสรุปแผน (ประกาศและหลักฐานข้อตกลง พิมพ์ / บันทึก PDF ได้เฉพาะแท็บนี้):
 *     หัวรายงาน: เลขฉบับ {ปี}-BL-{nn} | {ปี}-DRAFT · สถานะ · จัดสรรเป้าหมายประจำปี · พิมพ์เมื่อ · หมายเหตุที่มาของตัวเลข
 *     ยังไม่ล็อก = ลายน้ำ "ฉบับร่าง · ยังไม่ได้รับอนุมัติ" ทุกหน้า (บนจอและตอนพิมพ์) / ล็อกแล้ว = ตัวเลขทั้งหมดจาก Snapshot ของ Baseline
 *     Filter Channel · ข้อมูลที่ต้องตรวจ (CR-34 แผนสินค้า Clearance · calc.planClearanceItems) · KPI 4 ใบ · ที่มาของการเติบโต (charts.waterfall) : สัดส่วน Channel
 *     CR-34 เป้าหมายเทียบแผนรายเดือน (charts.planTargetBars · calc.planByTypeMonthly): แท่งซ้อนตามประเภท · ขีดเป้าหมาย Top-down · เส้นประยอดขายอ้างอิง
 *       (กด Legend ซ่อน/แสดง) · แถวส่วนต่าง (calc.planDiff) · สรุปทั้งปีหัวกราฟ
 *     ตาราง Channel → หน่วยขาย (ยอดขายปีก่อน · เป้าหมาย · % ของ Total · เป้าหมายเทียบปีก่อน · แผน · ส่วนต่าง · สถานะอนุมัติ 2 ไอคอน · ผู้รับผิดชอบ)
 *     CR-26: แผนตามสินค้าและช่องทาง (report.pivotPlan) — แถว Series / Category / Status › SKU (Tree พับได้) × คอลัมน์ Channel / หน่วยขาย /
 *       เดือน / ไตรมาส · ค่า Net Sales / Sale Amount / จำนวนชิ้น · แสดงเป็นค่า / % ของแถว / % ของคอลัมน์ · ตัวกรอง · สีพื้นไล่ความเข้มต่อระดับแถว ·
 *       คลิกช่อง SKU × หน่วยขาย = SKU Planning ของหน่วยนั้น (ui.selection + ui.skuSearchHandoff) · ส่งออกแบบแบน · ตัวเลือกจำที่ ui.summaryPivot
 *     CR-34 สัดส่วนแผนตามกลุ่มสินค้า 50 : 50 = ตามประเภทแผน (calc.planTypeMix · charts.partBars) | ตามกลุ่มสินค้าซ้อนตามประเภท (calc.planGroupByType)
 *     เป้าหมายรายผู้รับผิดชอบ / การอนุมัติ: ยังไม่ล็อก = บรรทัด "อนุมัติครบแล้ว x/y หน่วยขาย" ใต้หัวรายงาน ·
 *     ล็อกแล้ว = ตารางย่อ 1 แถวต่อหน่วยขาย (ผู้อนุมัติ · วันที่ ของเป้าหมายรายเดือนและแผน SKU) + ช่องลงนาม
 *     ตัวเลขเป็นล้านบาท 2 ตำแหน่ง (KPI บาทเต็ม) / พิมพ์ A4 แนวนอน
 * อ่านจาก data/:  settings, content (pages.summary, pages.<ขั้น>.title, labels) — ตัวเลขทั้งหมดของรายงานมาจาก core/report.js
 * CR-17 Feature Flags: ปิด approvalWorkflow = ติดตามสถานะเหลือ Channel · หน่วยขาย · ผู้รับผิดชอบ · ส่วนต่าง · การดำเนินการถัดไป (ปิดส่วนต่าง /
 *   กำหนดผู้รับผิดชอบ / –) ไม่มีบรรทัดจัดสรรเป้าหมายประจำปี · รายงานไม่มีบรรทัดสถานะ การอนุมัติ และคอลัมน์สถานะอนุมัติ · KPI = หน่วยขายที่จัดสรรครบ x / y
 *   ปิด baseline = ไม่มีปุ่มล็อก / บรรทัด Baseline / ส่วนการอนุมัติ / ช่องลงนาม รายงานเป็น {ปี}-DRAFT + ลายน้ำเสมอ
 * CR-39:          แท็บ รายงาน | ติดตามสถานะ | Revision | เปรียบเทียบ (2 แท็บหลัง = summary-revision.js · Flag revision · สิทธิ์ revisionList / revisionCompare ·
 *                 สูงเท่าจอ body.fit-screen) · ลิงก์ #report / #status / #revision / #compare เลือกแท็บ · ลายน้ำเฉพาะแท็บรายงาน
 * CR-38:          ข้อมูลของรอบที่เลือก (core/report.js · core/revision.js) · ลายน้ำ ร่าง = ฉบับร่าง · รอ Lock = รอ Lock · Lock แล้ว = ไม่มี ·
 *                 หัวรายงาน {รอบ} · Lock แล้ว {วันที่} โดย {MD} · แท็บติดตามสถานะมีการ์ดสถานะรอบ (components.revisionCard)
 * store อ่าน:     app.planYear, plan.<ปี>.workflow.*, plan.<ปี>.baselineVersions, ui.role, ui.summaryTab, ui.statusFilter (+ Key ที่ core/report.js อ่าน)
 * store เขียน:    ui.summaryTab · ui.statusFilter (CR-28) · ui.selection (ก่อนพาไปหน้าของรายการที่กด) · ui.summaryPivot · ui.skuSearchHandoff (CR-26)
 *                 plan.<ปี>.workflow.baseline.all (ล็อก / ปลดล็อกผ่าน core/workflow.js — snapshot = { gp ต่อหน่วยขาย, priceList,
 *                 CR-30 basePrices · promoPrices, report = core/report.js build() }) · plan.<ปี>.baselineVersions (ต่อท้ายฉบับใหม่ตอนล็อก)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var W = SP.core.workflow;
  var store = SP.core.store;
  var REV = SP.core.revision;   // CR-38
  var R = SP.core.report;
  var FT = SP.core.features;
  var h = C.h;
  var fill = C.fill;

  var channelFilter = [];   // รายงาน: Channel ที่เลือก ([] = ทุก Channel)
  var collapsed = {};       // รายงาน: <channelId>: true = พับแถวหน่วยขาย
  var mixBy = 'series';     // รายงาน: กราฟกลุ่มสินค้าที่ 2 'series' | 'category'
  var ytdMode = 'plan';     // CR-29 เป้าหมายรายผู้รับผิดชอบ: ผลงาน YTD ของ 'plan' ปีแผน | 'current' ปีปัจจุบัน (Actual อย่างเดียว)
  var act = { channel: '', owner: '' };   // ติดตามสถานะ: ตัวกรอง (owner '_none' = ยังไม่มีผู้รับผิดชอบ) · แท็บตัวกรองจำที่ ui.statusFilter (CR-28)
  var AP_STATES = ['draft', 'submitted', 'approved', 'returned', 'review'];
  // CR-36: ส่วน Clearance ของแท่ง = แผน Clearance (calc.clearancePlanMonthly · ไม่นับในเป้าหมาย) แทนจำนวนในแผน SKU (ค่าเดิมในเดือน Clearance รวมในสินค้าเดิม)
  var CHART_TYPES = ['existing', 'npdConfirmed', 'npdRequest'];   // CR-34: ลำดับส่วนของแท่ง (ล่าง → บน) · สินค้าเดิมรวม Listing ใหม่
  // CR-26: ตาราง Pivot — ค่าตั้งต้น (ตัวเลือกจำที่ ui.summaryPivot) · แถวที่กางไว้ (path ของ node → true) ไม่เก็บ
  var PIVOT_DEFAULT = { rows: 'series', cols: 'channel', value: 'net', show: 'value', filters: { series: [], channels: [], units: [], statuses: [], q: '' } };
  var pivotOpen = {};

  function mb(v) { return F.millionPlain(v, 2); }
  function m1(v) { return F.millionPlain(v, 1); }   // CR-34: สรุปหัวกราฟ · แถวส่วนต่าง (ล้านบาท ทศนิยม 1 ตำแหน่ง)
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

    // CR-39: แท็บ Revision / เปรียบเทียบ (Flag revision · สิทธิ์ส่วนของหน้า revisionList / revisionCompare) — โค้ดอยู่ที่ summary-revision.js
    function revTabs() {
      if (!REV.enabled() || !SP.modules.summary.revisionTab) return [];
      var u = SP.core.permissions.user();
      return ['revision', 'compare'].filter(function (t) { return SP.core.permissions.level(u, t === 'revision' ? 'revisionList' : 'revisionCompare') !== 'NONE'; });
    }
    // ลิงก์เดิม / ลิงก์จากหน้าอื่น: #report · #status · #revision · #compare
    var hashTab = String(location.hash || '').replace('#', '');
    if (['report', 'status', 'revision', 'compare'].indexOf(hashTab) >= 0) store.set('ui.summaryTab', hashTab);
    function goTab(v) {
      store.set('ui.summaryTab', v);
      try { history.replaceState(null, '', '#' + v); } catch (e) { /* file:// บางเบราว์เซอร์ */ }
      draw();
      window.scrollTo(0, 0);
    }
    var revEnv = {
      refresh: function () { draw(); },
      goTab: goTab,
      // คำสั่งของรอบสำเร็จ = โหลดหน้าใหม่ (ตัวเลือก Revision และแถบสถานะที่หัวหน้าเปลี่ยนตามรอบ) แล้วแจ้งผล
      reload: function (text) { if (text) store.set('ui.toast', text); location.reload(); }
    };

    function draw() {
      C.clear(root);
      var states = store.workflowStates();
      var locked = R.locked(states);
      var live = R.build();
      var acts = R.actions(live);
      var moved = R.storeMoves();
      var extra = revTabs();
      var tab = store.get('ui.summaryTab');
      if (tab !== 'status' && tab !== 'report' && extra.indexOf(tab) < 0) tab = 'report';
      var isRev = tab === 'revision' || tab === 'compare';
      document.body.classList.toggle('rp-on-status', tab === 'status');
      document.body.classList.toggle('rp-on-revision', tab === 'revision');
      document.body.classList.toggle('rp-on-compare', tab === 'compare');
      // แท็บ Revision / เปรียบเทียบ = สูงเท่าจอ ตารางเลื่อนภายในการ์ด (แท็บรายงาน / ติดตามสถานะ = เลื่อนหน้าตามเดิม)
      document.body.classList.toggle('fit-screen', isRev);
      root.appendChild(tabs(tab, acts.length + (!locked && moved.length ? 1 : 0), extra));
      if (tab === 'revision') { SP.modules.summary.revisionTab(root, revEnv); return; }
      if (tab === 'compare') { SP.modules.summary.compareTab(root, revEnv); return; }
      (tab === 'status' ? statusTab(live, acts, states, locked, moved) : reportTab(live, states, locked)).forEach(function (n) { root.appendChild(n); });
    }

    // ---------- แท็บ ----------
    function tabs(tab, n, extra) {
      var T = page.tabs;
      var opts = [
        { value: 'report', title: page.tabTips.report, label: T.report },
        { value: 'status', title: (BL_ON ? page.tabTips.status : page.tabTips.statusLite) + (n ? ' · ' + fill(page.tabCountTip, { n: n }) : ''), label: T.status, count: n || null }
      ];
      (extra || []).forEach(function (t) { opts.push({ value: t, title: page.tabTips[t], label: T[t] }); });
      return h('div', { class: 'rp-tabs no-print' }, C.tabs({   // CR-40 แท็บขีดเส้นใต้ · ตัวนับเล็กสีเทา
        label: page.tabLabel, value: tab, options: opts,
        onChange: function (v) { goTab(v); }
      }));
    }

    // =====================================================================
    // แท็บติดตามสถานะ
    // =====================================================================
    function statusTab(live, acts, states, locked, moved) {
      var Y = page.yearLines;
      // CR-38: การ์ดสถานะของรอบที่เลือก (ข้อมูลเดียวกับ Revision List)
      var revCard = REV.enabled() ? C.revisionCard(REV.overview(), { className: 'rp-rev-card no-print' }) : null;
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
      return [revCard, year1, statusTable(live, acts, states, locked), h('p', { class: 'print-only rp-noprint-note' }, page.statusNoPrint)].filter(Boolean);
    }

    // CR-16 §5.4: ร้านค้าย้ายเขตหลังอนุมัติเป้าหมาย (เป้าหมายของเขตไม่เปลี่ยน) + รายการร้าน + ลิงก์หน้าเขตการขายและร้านค้า
    function storesMovedLine(moved) {
      var Y = page.yearLines;
      var MAX = 8;
      var data = REV.data();
      function zone(id) { var t = id ? calc.findById(data.territories, id) : null; return t ? String(t.name).split(' · ')[0] : Y.unassigned; }
      var amount = calc.sum(moved.map(function (m) { return m.salesRef; }));
      var items = moved.slice(0, MAX).map(function (m) {
        return h('li', null, fill(Y.storesMovedItem, { name: m.name, id: m.systemId, from: zone(m.from), to: zone(m.to), month: F.date(m.fromMonth), amount: F.baht(m.salesRef) }));
      });
      if (moved.length > MAX) items.push(h('li', { class: 'muted' }, fill(Y.storesMovedMore, { n: moved.length - MAX })));
      items.push(h('li', null, link('territories', fill(Y.storesMovedLink, { page: pageTitle('salesUnits') }))));   // CR-32: หน้าเดิมพาไป Account Master แท็บเขต
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
        var data = REV.data();
        var rep = R.build();
        var gp = {};
        rep.units.forEach(function (u) { gp[u.id] = calc.gpOf(data, u.id); });
        var at = SP.core.clock.now();
        var by = L.roles.director;
        var res = W.applyAction(store.workflowStates(), {
          step: 'baseline', unitId: null, action: 'lock', by: by, at: at,
          snapshot: { gp: gp, basePrices: data.basePrices || [], promoPrices: data.promoPrices || [], report: rep }
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
        var res = W.applyAction(store.workflowStates(), { step: 'baseline', unitId: null, action: 'unlock', by: L.roles.director, at: SP.core.clock.now(), note: r.note });
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
      }), { topDown: live.topDown, locked: locked, all: true, approval: AP_ON, sort: 'pct' });
      var approvalOf = {};
      live.approvals.forEach(function (a) { approvalOf[a.step + '.' + a.unitId] = a; });
      var owners = [];
      all.forEach(function (r) {
        var o = r.unit.owner;
        if (!o.vacant && !owners.some(function (x) { return x.id === o.id; })) owners.push({ id: o.id, name: o.name });
      });
      var base = all.filter(function (r) {
        var o = r.unit.owner;
        return (!act.channel || r.unit.channelId === act.channel)
          && (!act.owner || (act.owner === '_none' ? o.vacant : !o.vacant && o.id === act.owner));
      });
      // CR-28: แท็บตัวกรองพร้อมจำนวน (นับหลังตัวกรอง Channel และผู้รับผิดชอบ) · แท็บที่เป็น 0 ยังแสดงแต่สีจาง
      var tabInfo = calc.actionTabs(base);
      var tab = store.get('ui.statusFilter');
      if (calc.ACTION_TABS.indexOf(tab) < 0) tab = 'all';
      var rows = base.filter(function (r) { return calc.actionTabMatch(r, tab); });
      var allInfo = calc.actionTabs(all);
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
        C.segmented({
          label: A.tabsLabel, value: tab,
          options: tabInfo.tabs.map(function (t) {
            return { value: t.id, className: 'rp-tab-' + t.id + (t.count ? '' : ' is-zero'), title: A.tabTips[t.id],
              label: [A.tabs[t.id] + ' ', h('span', { class: 'rp-tab-count' }, fill(A.tabCount, { n: t.count }))] };
          }),
          onChange: function (v) { store.set('ui.statusFilter', v); draw(); }
        }));
      // CR-28: ส่วนต่าง = ข้อความคงเหลือเป็นล้านบาท + % ของเป้าหมายหน่วยขาย · จัดสรรครบ / ยังไม่กำหนด = ข้อความอย่างเดียว
      function gapCell(r) {
        var st = r.rem.status;
        var text = C.remainingText(r.rem, mb);
        return h('span', { class: 'rp-gap text-' + st }, (st === 'short' || st === 'over') && r.gapPct != null ? fill(page.gapWithPct, { text: text, pct: F.pct(r.gapPct, 1) }) : text);
      }
      // CR-28: การดำเนินการถัดไป = ปุ่มเล็ก ไปแก้ไข → (หน้าของขั้นที่ต้องทำ) / กำหนดผู้รับผิดชอบ → (หน้าผู้รับผิดชอบ) · ไม่มีประเด็น = –
      function nextCell(r, ch, u) {
        if (!r.next) return page.noIssue;
        var label = r.next === 'assignOwner' ? page.goAssign : page.goFix;
        return link(r.entry, label, ch.id, u.id, fill(page.nextTip, { page: pageTitle(r.entry), name: u.name }) + ' · ' + page.next[r.next], 'btn btn-secondary btn-sm rp-go');
      }
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
            h('td', { class: 'num' }, gapCell(r)),
            AP_ON ? [h('td', { class: 'rp-status is-first' }, statusCell('phasing', u.phasing, ch, u)), approvalCells('phasing', u),
              h('td', { class: 'rp-status is-first' }, statusCell('sku', u.sku, ch, u)), approvalCells('sku', u)] : null,
            h('td', { class: 'rp-next-cell' }, nextCell(r, ch, u)));
        }))))
        : h('p', { class: 'rp-note rp-empty' }, page.actionsNoneFiltered);
      // CR-28: ทุกหน่วยขายจัดสรรครบ = ข้อความพร้อมไอคอนเขียว
      var done = allInfo.total && !allInfo.pending ? h('p', { class: 'rp-all-done alert-ok' }, h('span', { class: 'rp-done-icon', 'aria-hidden': 'true' }, '✓'), page.allDone) : null;
      return h('section', { class: 'card rp-section rp-actions no-print' },
        h('div', { class: 'rp-act-head' }, h('h2', null, AP_ON ? page.actionsTitle : page.actionsTitleLite,
          h('span', { class: 'rp-count' }, fill(page.actionsCount, { n: allInfo.pending, total: allInfo.total }))), filters),
        done, body);
    }

    // =====================================================================
    // แท็บรายงานสรุปแผน
    // =====================================================================
    function reportTab(live, states, locked) {
      var cur = R.current(live);
      var M = model(cur.report);
      var ver = W.baselineVersion(store.get(store.planKey('baselineVersions')), year, locked);
      // CR-38: ลายน้ำตามสถานะของรอบ (Lock แล้ว = ไม่มีลายน้ำ)
      var rv = REV.enabled() ? REV.current() : null;
      if (rv) ver = { code: rv.name, draft: rv.status !== 'locked', at: rv.lockedAt, by: rv.lockedBy };
      var wrap = h('div', { class: 'rp-report' + (ver.draft ? ' is-draft' : '') });
      if (ver.draft) wrap.appendChild(watermark(rv ? (rv.status === 'submitted' ? L.revision.watermarkSubmitted : L.revision.watermarkDraft) : page.watermark));
      wrap.appendChild(docHead(M, states, locked, ver, cur.fromSnapshot));
      wrap.appendChild(toolbar(M));
      // CR-27 ลำดับ: KPI → ที่มาของการเติบโต : สัดส่วน Channel (55 : 45) → ตาราง Channel และหน่วยขาย → เป้าหมายเทียบแผนรายเดือน (เต็มความกว้าง)
      //   → สัดส่วนแผนตามกลุ่มสินค้า → แผนตามสินค้าและช่องทาง → เป้าหมายรายผู้รับผิดชอบ · พิมพ์ขึ้นหน้าใหม่ก่อน ตาราง · กลุ่มสินค้า · รายผู้รับผิดชอบ
      wrap.appendChild(kpis(M, locked));
      wrap.appendChild(h('div', { class: 'rp-row2 rp-growth-row' }, growth(M), shareCard(M)));
      wrap.appendChild(unitTable(M));
      wrap.appendChild(monthly(M));
      wrap.appendChild(mix(M));
      wrap.appendChild(pivotSection(M, live));
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
    function watermark(text) {
      var w = h('div', { class: 'rp-watermark', 'aria-hidden': 'true' });
      for (var i = 0; i < 8; i++) w.appendChild(h('span', { style: { top: (420 + i * 900) + 'px' } }, text || page.watermark));
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
      printedAt = h('p', { class: 'rp-doc-printed print-only' }, fill(page.printedAt, { at: F.dateTime(SP.core.clock.now()) }));
      var note = locked ? (fromSnapshot ? page.snapshotNote : null) : page.draftNote;
      // CR-38: บรรทัดของรอบ (ร่าง / รอ MD Lock / Lock แล้ว วันที่ โดย MD)
      var rv = REV.enabled() ? REV.current() : null;
      var DL = L.revision.docLine;
      var revLine = rv ? h('p', { class: 'rp-doc-status rp-doc-revision' }, fill(DL[rv.status], { name: rv.name, month: SP.core.clock.label(rv.effectiveMonth), at: F.date(String(rv.lockedAt || '').slice(0, 10)), by: rv.lockedBy || '' })) : null;
      if (rv) note = rv.status === 'locked' ? page.snapshotNote : page.draftNote;
      return h('header', { class: 'card rp-doc-head' + (ver.draft ? ' is-draft' : ' is-locked') },
        h('div', { class: 'rp-doc-top' },
          h('h2', { class: 'rp-doc-title' }, fill(page.docTitle, { year: year })),
          rv ? C.revisionBadge(rv.status) : h('span', { class: 'rp-doc-version' }, fill(page.version, { code: ver.code }))),
        revLine,
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
    function toolbar(M) {
      var rep = M.rep;
      var filter = C.multiSelect({
        label: page.channelFilter, allLabel: page.channelAll, selected: page.channelSelected, clear: page.channelClear, empty: page.channelEmpty,
        options: rep.channels.map(function (c) { return { value: c.id, label: c.name + ' · ' + c.fullName }; }),
        value: channelFilter,
        onChange: function (v) { channelFilter = v; draw(); }
      });
      var print = h('button', { type: 'button', class: 'btn btn-secondary rp-print', onClick: function () { window.print(); } }, page.print);
      return h('div', { class: 'rp-toolbar no-print' }, filter, dataCheck(M), print);
    }
    // CR-34 ส่วน 5: ข้อมูลที่ต้องตรวจ = แผนสินค้า Clearance (SKU × หน่วยขายที่มีจำนวน > 0) → ไปที่ SKU Planning ของหน่วยนั้นและค้นหา SKU
    function dataCheck(M) {
      var CK = page.checks;
      var names = {};
      M.units.forEach(function (u) { names[u.id] = u.name; });
      var items = calc.planClearanceItems(M.rep.skuItems || [], M.units.map(function (u) { return u.id; })).map(function (it) {
        return { text: fill(CK.item, { sku: calc.codeOf(REV.master().products, it.key), name: it.name, unit: names[it.unitId] || it.unitId }), go: function () {
          store.set('ui.selection', { channel: it.channelId, unit: it.unitId });
          store.set('ui.skuSearchHandoff', it.key);
          location.href = SP.core.paths.to(reg.byId('skuPlanning').path);
        } };
      });
      return C.dataCheck({ title: CK.title, criteria: CK.criteria, groups: [{ key: 'clearance', label: CK.types.clearance, items: items }] });
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
    // CR-34: แท่งซ้อนแผนตามประเภท (สินค้าเดิม → NPD ยืนยันแล้ว → ขอ NPD → Clearance ถ้ามี) · ขีดเป้าหมาย Top-down · เส้นประยอดขายอ้างอิง · แถวส่วนต่าง · สรุปทั้งปีหัวกราฟ
    function monthly(M) {
      var PT = L.planTypes;
      var T = page.monthlyTip;
      var G = page.monthlyLegend;
      var rows = calc.planByTypeMonthly({ units: M.units, items: M.rep.skuItems });
      function typeValue(r, t) { return t === 'existing' ? r.existing + r.newListing + r.clearance : r[t]; }
      var stacks = CHART_TYPES.map(function (t) {
        return { id: t, label: PT[t].label, colorToken: PT[t].token, borderToken: PT[t].borderToken || null, hatch: PT[t].pattern === 'hatch', legend: true,
          values: rows.map(function (r) { return typeValue(r, t); }) };
      });
      // CR-36: แผน Clearance (ไม่นับในเป้าหมาย) = ส่วนสีเทาลายจุดบนสุด · แถวส่วนต่างและสรุปทั้งปีไม่นับส่วนนี้
      var clp = calc.clearancePlanMonthly(REV.data(), { year: year, unitIds: M.units.map(function (u) { return u.id; }) }).map(function (x) { return x.netSales; });
      var clTotal = calc.sum(clp);
      if (clTotal > 0) stacks.push({ id: 'clearancePlan', label: PT.clearancePlan.label, colorToken: PT.clearancePlan.token, dots: true, legend: true, values: clp });
      function diffText(d) { return d.status === 'ok' ? page.monthlyDiffOk : d.status === 'empty' ? '–' : (d.diff < 0 ? '−' : '+') + m1(Math.abs(d.diff)); }
      var diffs = rows.map(function (r) { return calc.planDiff(r.target, r.plan); });
      var target = calc.sum(rows.map(function (r) { return r.target; })), plan = calc.sum(rows.map(function (r) { return r.plan; }));
      var rem = calc.remaining(target, plan);
      var gap = fill(page.monthlyGap[rem.status], { amount: m1(Math.abs(rem.amount)), pct: F.pct(Math.abs(rem.pct), 1) });
      var annual = h('span', { class: 'rp-monthly-annual text-' + rem.status }, fill(page.monthlyAnnual, { target: m1(target), plan: m1(plan), gap: gap }) + (clTotal > 0 ? fill(page.monthlyClearance, { value: m1(clTotal) }) : ''));
      return h('section', { class: 'card rp-section rp-monthly' }, h('div', { class: 'rp-monthly-head' }, h('h2', null, page.monthlyTitle), annual),
        SP.core.charts.planTargetBars({
          months: F.MONTHS, stacks: stacks, target: rows.map(function (r) { return r.target; }), reference: rows.map(function (r) { return r.reference; }),
          diff: diffs.map(function (d) { return { text: diffText(d), status: d.status }; }),
          labels: { target: G.target, reference: G.reference, refToggle: G.refToggle, diff: G.diff },
          tick: axisText,
          tip: function (m) {
            var r = rows[m];
            var out = [[T.target, mb(r.target)], [T.plan, mb(r.plan)]];
            CHART_TYPES.forEach(function (t) {
              var label = t === 'existing' && r.newListing > 0 ? fill(T.existingListing, { label: PT.existing.label, value: mb(r.newListing) }) : PT[t].label;
              out.push([label, mb(typeValue(r, t)), 'is-part']);
            });
            if (clp[m] > 0) out.push([PT.clearancePlan.label, mb(clp[m]), 'is-part']);
            out.push([T.gap, diffText(diffs[m])], [T.prior, mb(r.reference)]);
            return out;
          }
        }));
    }

    // ---------- ที่มาของการเติบโต (Waterfall) ----------
    function growth(M) {
      var TD = P.topDown;
      var sub = { prior: M.prior, amount: M.target, children: M.channels, remaining: M.all ? M.rep.total.remaining : null };
      var wf = calc.growthWaterfall(sub);
      var charts = SP.core.charts;
      return h('section', { class: 'card rp-section rp-growth' }, h('h2', null, TD.wfTitle),
        charts.waterfall({
          start: { label: fill(TD.wfStart, { year: year - 1 }), value: wf.start }, end: { label: fill(TD.wfEnd, { year: year }), value: wf.end },
          steps: wf.steps.map(function (s) { return s.unallocated ? { id: '_rest', label: s.delta >= 0 ? TD.unallocated : TD.overAllocated, value: s.delta } : { id: s.id, label: s.name, value: s.delta, tag: s.isNew ? L.growthNew : null }; }),
          format: mb, signed: function (v) { return (v < 0 ? '−' : '+') + mb(Math.abs(v)); }, tick: axisText,
          axisNote: function (lo) { return fill(page.wfAxis, { value: F.number(lo / 1e6, 0) }); }
        }));
    }
    // CR-27: สัดส่วน Channel L12M เทียบเป้าหมาย — การ์ดแยกคู่กับ Waterfall
    function shareCard(M) {
      var TD = P.topDown;
      var sub = { prior: M.prior, amount: M.target, children: M.channels, remaining: M.all ? M.rep.total.remaining : null };
      var share = calc.channelShareRows(sub);
      function parts(list) {
        return list.map(function (p) { var ch = calc.findById(M.channels, p.id); return { id: p.id, value: p.share, colorToken: ch.color, title: fill(TD.shareTip, { name: ch.name, pct: F.pct(p.share, 1) }) }; });
      }
      return h('section', { class: 'card rp-section rp-share' }, h('h2', null, fill(TD.shareTitle, { prior: year - 1, year: year })),
        SP.core.charts.stackedShare({
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

    // ---------- CR-26: แผนตามสินค้าและช่องทาง (Pivot) ----------
    function pivotCfg() {
      var s = store.get('ui.summaryPivot') || {};
      var f = s.filters || {};
      var d = PIVOT_DEFAULT;
      return { rows: s.rows || d.rows, cols: s.cols || d.cols, value: s.value || d.value, show: s.show || d.show,
        filters: { series: f.series || [], channels: f.channels || [], units: f.units || [], statuses: f.statuses || [], q: f.q || '' } };
    }
    function pivotSection(M, live) {
      var X = page.pivot;
      var box = h('section', { class: 'card rp-section rp-pivot' });
      var master = REV.master();
      function save(cfg) { store.set('ui.summaryPivot', cfg); paint(); }
      function paint() {
        // คงตำแหน่งเลื่อนของตารางเมื่อพับ / กางแถว
        var old = box.querySelector('.pv-scroll');
        var pos = old ? [old.scrollTop, old.scrollLeft] : null;
        C.clear(box);
        var cfg = pivotCfg();
        // ตัวกรอง Channel ของหน้า (ด้านบนรายงาน) ใช้เมื่อยังไม่ได้เลือก Channel ในตารางนี้
        var f = { series: cfg.filters.series, channels: cfg.filters.channels.length ? cfg.filters.channels : channelFilter, units: cfg.filters.units, statuses: cfg.filters.statuses, q: cfg.filters.q };
        var pv = R.pivotPlan({ rows: cfg.rows, cols: cfg.cols, value: cfg.value, show: cfg.show, filters: f }, live);
        var money = cfg.value !== 'units';
        var pct = cfg.show !== 'value';
        var unitText = pct ? X.showOptions[cfg.show] : money ? fill(X.moneyUnit, { value: X.valueOptions[cfg.value] }) : X.valueOptions.units;
        function setKey(k, v) { var c = pivotCfg(); c[k] = v; save(c); }
        function setFilter(k, v) { var c = pivotCfg(); c.filters[k] = v; save(c); }
        function sel(k, opts) {
          return h('label', { class: 'field' }, h('span', { class: 'field-label' }, X[k + 'Label']),
            C.select({ label: X[k + 'Label'], value: cfg[k], className: 'pv-' + k, options: opts.map(function (o) { return { value: o, label: X[k + 'Options'][o] }; }), onChange: function (v) { setKey(k, v); } }));
        }
        var seriesOptions = calc.seriesList(master.taxonomy, master.products).filter(function (o) { return !o.depth; });
        var unitOptions = M.rep.units.map(function (u) { var ch = M.rep.channels.filter(function (c) { return c.id === u.channelId; })[0]; return { value: u.id, label: (ch ? ch.name + ' · ' : '') + u.name }; });
        var search = h('input', { type: 'search', class: 'search-input pv-search', placeholder: X.search, 'aria-label': X.search, value: cfg.filters.q });
        search.addEventListener('change', function () { setFilter('q', search.value.trim()); });
        var anyOpen = Object.keys(pivotOpen).some(function (k) { return pivotOpen[k]; });
        var toggleAll = h('button', { type: 'button', class: 'btn btn-ghost btn-sm pv-toggle-all', onClick: function () {
          if (anyOpen) pivotOpen = {};
          else (function walk(nodes) { nodes.forEach(function (n) { if (n.children.length) { pivotOpen[n.path] = true; walk(n.children); } }); })(pv.rows);
          paint();
        } }, anyOpen ? X.collapseAll : X.expandAll);
        var exportBtn = C.exportButton({ build: function () { return pivotExport(pv, cfg, unitText, M); } });
        box.appendChild(h('div', { class: 'rp-pivot-head' }, h('h2', null, fill(X.title, { unit: unitText })), h('span', { class: 'rp-pivot-tools no-print' }, toggleAll, exportBtn)));
        box.appendChild(h('div', { class: 'tool-row rp-pivot-controls no-print' },
          sel('rows', ['series', 'category', 'status']), sel('cols', ['channel', 'unit', 'month', 'quarter']),
          sel('value', ['net', 'sale', 'units']), sel('show', ['value', 'rowPct', 'colPct']),
          C.seriesFilter({ options: seriesOptions, value: cfg.filters.series, onChange: function (v) { setFilter('series', v); } }),
          C.multiSelect({ label: X.channelFilter, allLabel: X.all, selected: X.selected, clear: L.series.clear, empty: L.series.empty, value: cfg.filters.channels,
            options: M.rep.channels.map(function (c) { return { value: c.id, label: c.name }; }), onChange: function (v) { setFilter('channels', v); } }),
          C.multiSelect({ label: X.unitFilter, allLabel: X.all, selected: X.selected, clear: L.series.clear, empty: L.series.empty, value: cfg.filters.units, search: X.unitSearch,
            options: unitOptions, onChange: function (v) { setFilter('units', v); } }),
          C.multiSelect({ label: X.statusFilter, allLabel: X.all, selected: X.selected, clear: L.series.clear, empty: L.series.empty, value: cfg.filters.statuses,
            options: ['active', 'new', 'clearance', 'discontinued', 'planned'].map(function (s) { return { value: s, label: L.status[s] }; }), onChange: function (v) { setFilter('statuses', v); } }),
          search));
        // ตอนพิมพ์: บอกมุมมองที่พิมพ์แทนตัวควบคุม
        box.appendChild(h('p', { class: 'rp-note print-only' }, fill(X.printView, { view: pivotView(cfg) })));
        if (!pv.count) { box.appendChild(h('p', { class: 'grid-empty' }, X.empty)); return; }
        var tableBox = pivotTable(pv, cfg, money, pct, M, paint);
        box.appendChild(tableBox);
        if (pos) { tableBox.scrollTop = pos[0]; tableBox.scrollLeft = pos[1]; }
        box.appendChild(h('div', { class: 'rp-pivot-legend' }, h('span', null, X.legendLow), h('span', { class: 'pv-legend-bar', 'aria-hidden': 'true' }), h('span', null, X.legendHigh),
          h('span', { class: 'muted small' }, X.legendNote), cfg.cols === 'unit' ? h('span', { class: 'muted small no-print' }, X.clickNote) : null));
      }
      paint();
      return box;
    }
    function pivotView(cfg) {
      var X = page.pivot;
      return fill(X.viewText, { rows: X.rowsOptions[cfg.rows], cols: X.colsOptions[cfg.cols], value: X.valueOptions[cfg.value], show: X.showOptions[cfg.show] });
    }
    function pivotColLabel(cfg, c, M) {
      if (cfg.cols === 'month') return F.MONTHS[c.id];
      if (cfg.cols === 'quarter') return fill(page.pivot.quarter, { n: c.id + 1 });
      if (cfg.cols === 'unit') { var u = M.units.filter(function (x) { return x.id === c.id; })[0] || M.rep.units.filter(function (x) { return x.id === c.id; })[0]; return u ? u.name : c.id; }
      var ch = M.rep.channels.filter(function (x) { return x.id === c.id; })[0];
      return ch ? ch.name : c.id;
    }
    function pivotRowLabel(cfg, n) {
      var X = page.pivot;
      if (n.kind === 'sku') return n.label;
      if (cfg.rows === 'status') return L.status[n.id] || X.none;
      if (n.kind === 'sub') return n.label || X.noSub;
      return n.label || (cfg.rows === 'category' ? X.noCategory : X.noSeries);
    }
    function pivotFmt(v, money, pct) {
      if (!v) return '';
      if (pct) return F.pct(v, 1);
      return money ? mb(v) : F.units(v);
    }
    function pivotTable(pv, cfg, money, pct, M0, repaint) {
      var X = page.pivot;
      var unitMode = cfg.cols === 'unit';
      var head;
      var corner = h('th', { scope: 'col', class: 'pv-corner', rowspan: unitMode ? '2' : null }, X.rowsOptions[cfg.rows]);
      if (unitMode) {
        var groups = [];
        pv.cols.forEach(function (c) { var g = groups[groups.length - 1]; if (g && g.id === c.group) g.n++; else groups.push({ id: c.group, n: 1 }); });
        head = h('thead', null,
          h('tr', { class: 'pv-group-row' }, corner, groups.map(function (g) {
            var ch = M0.rep.channels.filter(function (x) { return x.id === g.id; })[0];
            return h('th', { scope: 'colgroup', colspan: String(g.n), class: 'pv-group', style: { '--c': ch ? C.tokenVar(ch.color) : null } }, ch ? ch.name : g.id);
          }), h('th', { scope: 'col', class: 'num pv-total', rowspan: '2' }, X.total)),
          h('tr', null, pv.cols.map(function (c) { return h('th', { scope: 'col', class: 'num' }, pivotColLabel(cfg, c, M0)); })));
      } else {
        head = h('thead', null, h('tr', null, corner, pv.cols.map(function (c) { return h('th', { scope: 'col', class: 'num' }, pivotColLabel(cfg, c, M0)); }),
          h('th', { scope: 'col', class: 'num pv-total' }, X.total)));
      }
      var body = h('tbody');
      function heat(v, level) {
        var mx = pv.max[level] || 0;
        return mx && v ? Math.round(Math.min(1, Math.abs(v) / mx) * 45) + '%' : null;
      }
      function row(n, visible) {
        var open = !!pivotOpen[n.path];
        var isSku = n.kind === 'sku';
        var prod = isSku ? calc.findProduct(REV.master().products, n.id) : null;   // CR-35: รหัสที่แสดง + ป้ายชื่อชั่วคราว (คำขอ NPD)
        var label = isSku ? h('span', { class: 'pv-sku' }, h('span', { class: 'pv-sku-name' }, n.label, ' ', C.tempNameTag(prod)), h('span', { class: 'pv-sku-code' }, prod ? calc.productCode(prod) : n.id))
          : h('button', { type: 'button', class: 'pv-toggle', 'aria-expanded': open ? 'true' : 'false', onClick: function () { pivotOpen[n.path] = !open; repaint(); } },
            h('span', { class: 'pv-caret', 'aria-hidden': 'true' }, open ? '▾' : '▸'), pivotRowLabel(cfg, n), h('span', { class: 'pv-count' }, fill(X.count, { n: countSku(n) })));
        var tr = h('tr', { class: 'pv-row pv-level-' + n.level + (isSku ? ' is-sku' : ''), hidden: !visible },
          h('th', { scope: 'row', class: 'pv-label', style: { '--indent': String(n.level) } }, label),
          n.show.map(function (v, i) {
            var c = pv.cols[i];
            var text = pivotFmt(v, money, pct);
            var td = h('td', { class: 'num pv-cell', style: { '--heat': heat(v, n.level) } });
            if (isSku && unitMode && n.values[i]) {
              td.appendChild(h('a', { class: 'pv-go', href: SP.core.paths.to(reg.byId('skuPlanning').path), title: fill(X.clickTip, { unit: pivotColLabel(cfg, c, M0), sku: n.label }),
                onClick: function (e) { e.preventDefault(); store.set('ui.selection', { channel: c.group, unit: c.id }); store.set('ui.skuSearchHandoff', n.id); location.href = SP.core.paths.to(reg.byId('skuPlanning').path); } }, text));
            } else td.appendChild(document.createTextNode(text));
            return td;
          }),
          h('td', { class: 'num pv-total' }, pivotFmt(n.showTotal, money, pct)));
        body.appendChild(tr);
        n.children.forEach(function (ch) { row(ch, visible && open); });
      }
      function countSku(n) { return n.kind === 'sku' ? 1 : n.children.reduce(function (s, c) { return s + countSku(c); }, 0); }
      pv.rows.forEach(function (r) { row(r, true); });
      var foot = h('tfoot', null, h('tr', { class: 'pv-total-row' }, h('th', { scope: 'row', class: 'pv-label' }, X.total),
        pv.total.show.map(function (v) { return h('td', { class: 'num' }, pivotFmt(v, money, pct)); }), h('td', { class: 'num pv-total' }, pivotFmt(pv.total.showTotal, money, pct))));
      return h('div', { class: 'table-scroll pv-scroll' }, h('table', { class: 'data-table pv-table' + (unitMode ? ' is-units' : '') }, head, body, foot));
    }
    // ส่งออกตามมุมมองปัจจุบัน: 1 แถวต่อ SKU พร้อมคอลัมน์ระดับบน (ไม่ Merge cell) · % = ทศนิยม · เงินเป็นบาท
    function pivotExport(pv, cfg, unitText, M0) {
      var X = page.pivot;
      var E = X.exportSpec;
      var money = cfg.value !== 'units';
      var type = cfg.show !== 'value' ? 'pct' : money ? 'money' : 'number';
      var rows = [];
      (function walk(nodes, up) {
        nodes.forEach(function (n) {
          if (n.kind === 'sku') {
            var r = { group: up[0] || '', sub: up[1] || '', sku: n.id, name: n.label, total: n.showTotal };
            n.show.forEach(function (v, i) { r['c' + i] = v; });
            rows.push(r);
          } else walk(n.children, up.concat([pivotRowLabel(cfg, n)]));
        });
      })(pv.rows, []);
      var columns = [{ key: 'group', label: cfg.rows === 'category' ? E.cols.category : cfg.rows === 'status' ? E.cols.status : E.cols.series }]
        .concat(cfg.rows === 'category' ? [{ key: 'sub', label: E.cols.sub }] : [])
        .concat([{ key: 'sku', label: E.cols.sku }, { key: 'name', label: E.cols.name, width: 36 }])
        .concat(pv.cols.map(function (c, i) {
          var label = pivotColLabel(cfg, c, M0);
          if (cfg.cols === 'unit') { var ch = M0.rep.channels.filter(function (x) { return x.id === c.group; })[0]; if (ch) label = ch.name + ' · ' + label; }
          return { key: 'c' + i, label: label, type: type };
        }))
        .concat([{ key: 'total', label: X.total, type: type }]);
      var stamp = C.exportStamp(null);
      var view = pivotView(cfg);
      return {
        filename: fill(E.file, { year: year, date: stamp.date }),
        sheets: [{ name: E.sheet, header: C.exportHeader(year, null, [[E.headerView, view], [E.headerUnit, unitText]]), columns: columns, rows: rows }]
      };
    }

    // ---------- สัดส่วนแผนตามกลุ่มสินค้า ----------
    // CR-34: 2 คอลัมน์ 50 : 50 · ซ้าย = ตามประเภทแผน (calc.planTypeMix) · ขวา = ตามกลุ่มสินค้าซ้อนตามประเภท (calc.planGroupByType) · Legend ประเภทร่วมที่หัวการ์ด
    function mix(M) {
      var PT = L.planTypes;
      var ids = M.units.map(function (u) { return u.id; });
      var skuItems = M.rep.skuItems || [];
      var tm = calc.planTypeMix(skuItems, ids, M.target);
      var total = tm.total;
      function share(v) { return fill(page.mixText, { value: mb(v), pct: total ? F.pct(v / total, 1) : '–' }); }
      function part(t, v) { return { id: t, colorToken: PT[t].token, borderToken: PT[t].borderToken || null, hatch: PT[t].pattern === 'hatch', value: v }; }
      var clMix = calc.clearancePlanMonthly(REV.data(), { year: year, unitIds: ids });
      var clValue = calc.sum(clMix.map(function (x) { return x.netSales; }));
      var clSkus = REV.master().products.filter(function (p) { return p.clearance && calc.sum(calc.clearancePlanMonthly(REV.data(), { year: year, unitIds: ids, productKey: calc.productKey(p) }).map(function (x) { return x.units; })) > 0; }).length;
      var typeRows = tm.rows.filter(function (r) { return r.type !== 'clearance'; }).map(function (r) {
        var sub = r.type === 'existing' && tm.listing.skus ? fill(page.mixListing, { n: r.skus, value: mb(tm.listing.value), m: tm.listing.skus }) : fill(page.mixSkus, { n: r.skus });
        return { label: PT[r.type].label, sub: sub, note: null, parts: [part(r.type, r.value)], text: share(r.value), title: PT[r.type].tip };
      });
      if (clValue > 0) typeRows.push({ label: PT.clearancePlan.label, sub: fill(page.mixSkus, { n: clSkus }), note: page.mixClearanceNote,
        parts: [{ id: 'clearancePlan', colorToken: PT.clearancePlan.token, dots: true, value: clValue }], text: mb(clValue), title: PT.clearancePlan.tip });
      var byType = SP.core.charts.partBars({ minPx: 4, rows: typeRows });
      var summary = h('p', { class: 'rp-mix-summary', title: page.mixNewTip }, fill(page.mixNewTotal, { value: mb(tm.newTotal), pct: F.pct(tm.newPct, 1) }),
        tm.gap > 0 ? h('span', { class: 'rp-mix-gap' }, ' · ' + fill(page.mixGap, { value: mb(tm.gap) })) : null);
      var kind = mixBy === 'category' ? 'category' : 'series';
      var tax = REV.master().taxonomy;
      var byGroup = SP.core.charts.partBars({ minPx: 4, rows: calc.planGroupByType(skuItems, ids, kind).map(function (g) {
        var label = g.key ? calc.taxonomyName(tax, kind, g.key) || g.key : kind === 'series' ? L.series.none : page.mixNoCategory;
        var parts = CHART_TYPES.map(function (t) { return part(t, t === 'existing' ? g.parts.existing + (g.parts.clearance || 0) : g.parts[t]); });
        var detail = parts.filter(function (p) { return p.value > 0; }).map(function (p) { return PT[p.id].label + ' ' + mb(p.value); }).join(' · ');
        return { label: label, parts: parts, text: share(g.total), title: fill(page.mixPartsTip, { label: label, parts: detail }) };
      }) });
      var legendTypes = CHART_TYPES.concat(clValue > 0 ? ['clearancePlan'] : []);
      return h('section', { class: 'card rp-section rp-break rp-mix' },
        h('div', { class: 'rp-mix-top' }, h('h2', null, page.mixTitle),
          h('div', { class: 'legend rp-mix-legend' }, legendTypes.map(function (t) { return h('span', { class: 'legend-item' }, C.planTypeSwatch(t), PT[t].label); }))),
        h('div', { class: 'rp-mix-grid' },
          h('div', { class: 'rp-mix-type' }, h('h3', null, page.mixByType), byType, summary),
          h('div', { class: 'rp-mix-group' },
            h('div', { class: 'rp-mix-head' }, h('h3', null, page.mixGroupLabel),
              h('span', { class: 'no-print' }, C.segmented({ label: page.mixGroupLabel, value: kind, options: ['series', 'category'].map(function (v) { return { value: v, label: page.mixBy[v] }; }),
                onChange: function (v) { mixBy = v; draw(); } })),
              h('span', { class: 'print-only' }, page.mixBy[kind])),
            h('div', { class: 'rp-mix-scroll' }, byGroup))));
    }

    // ---------- เป้าหมายรายผู้รับผิดชอบ (เฉพาะเดือนที่รับผิดชอบ) ----------
    function people(M) {
      var PC = page.peopleColumns;
      var targets = {}, plans = {}, names = {};
      M.units.forEach(function (u) { targets[u.id] = u.targetM; plans[u.id] = u.planM; names[u.id] = u.name; });
      var assignments = M.rep.assignments, salespeople = M.rep.salespeople;
      // CR-29: ผลงาน YTD ณ เดือนปิดล่าสุด (SP.core.clock) เฉพาะเดือนที่รับผิดชอบ (calc.personYtd · ตัวเลขเดียวกับตารางผลงานรายบุคคลเดิม)
      //   ปีแผนยังไม่เริ่ม = – · ดูผลงานปีปัจจุบัน = Actual จากยอดขายจริงของหน่วย (ไม่มีเป้าหมายปีนั้นในข้อมูล = เป้าหมายและ % เป็น –)
      var lc = SP.core.clock.lastClosedMonth();
      var lcYear = Number(lc.slice(0, 4)), lcIdx = Number(lc.slice(5, 7)) - 1;
      var planUpto = lcYear === year ? lcIdx : lcYear > year ? 11 : -1;
      var Y = page.ytd;
      var data = REV.data();
      var actualsPlan = {}, actualsCur = {};
      M.units.forEach(function (u) {
        if (planUpto >= 0) actualsPlan[u.id] = calc.actualNetByUnit(data, REV.master(), u.id, year, planUpto);
        var hy = data.history && data.history.years[lcYear];
        actualsCur[u.id] = hy && hy.monthly && hy.monthly[u.id] ? hy.monthly[u.id] : [];
      });
      function ytd(id) {
        if (!id) return { target: null, actual: null, pct: null };
        if (ytdMode === 'current') return { target: null, actual: calc.personYtd(assignments, salespeople, id, lcYear, actualsCur, lcIdx), pct: null };
        var t = calc.personYtd(assignments, salespeople, id, year, targets, planUpto);
        var a = planUpto >= 0 ? calc.personYtd(assignments, salespeople, id, year, actualsPlan, planUpto) : null;
        return { target: t, actual: a, pct: t > 0 && a != null ? a / t : null };
      }
      var ytdTip = ytdMode === 'current' ? fill(Y.tipCurrent, { month: F.date(lc), year: lcYear })
        : planUpto < 0 ? fill(Y.tipNone, { year: year }) : fill(Y.tipAt, { month: F.date(calc.monthKey(year, planUpto)) });
      function money(v) { return v == null ? '–' : mb(v); }
      function pctCell(v) { return v == null ? h('span', { class: 'muted' }, '–') : h('span', { class: v >= 1 ? 'text-ok' : 'text-short' }, F.pct(v, 1)); }
      var rows = [];
      salespeople.concat([null]).forEach(function (p) {
        var id = p ? p.id : null;
        var t = calc.performanceByPerson(assignments, salespeople, id, year, targets);
        if (!t.units.length) return;
        var pl = calc.performanceByPerson(assignments, salespeople, id, year, plans);
        var status = p ? calc.personStatus(p, calc.monthKey(year, 11)) : null;
        var y = ytd(id);
        rows.push({
          name: p ? p.name : page.vacantRow, vacant: !p,
          tag: status === 'resigned' || status === 'leaving' ? fill(page.resignedTag, { month: F.date(p.endMonth) }) : null,
          units: t.units.map(function (x) { return names[x.unitId]; }).join(', '),
          target: t.total, plan: pl.total, ytdTarget: y.target, ytdActual: y.actual, ytdPct: y.pct
        });
      });
      // CR-27: เรียงตามเป้าหมายมากไปน้อย · แท่งเป้าหมายเทียบแผน (ความยาว = เป้าหมาย · ขีด = แผน · สีตามสถานะ · สเกลร่วมเริ่มที่ 0)
      var bars = calc.targetPlanBars(rows);
      var BAR_TOKENS = { short: '--status-short', over: '--status-over', ok: '--status-complete', empty: '--status-empty' };
      var body = h('tbody', null, bars.rows.map(function (r) {
        return h('tr', { class: r.vacant ? 'is-vacant' : '' },
          h('th', { scope: 'row' }, r.name, r.tag ? h('span', { class: 'badge tag-muted rp-tag' }, r.tag) : null),
          h('td', { class: 'rp-units' }, r.units),
          h('td', { class: 'num' }, mb(r.target)), h('td', { class: 'num' }, mb(r.plan)),
          h('td', { class: 'rp-vly rp-tp' }, SP.core.charts.vsLastYearBar(r.target, r.plan, bars.scaleMax, { colorToken: BAR_TOKENS[r.status] || '--c-bar', newTag: false,
            title: fill(page.peopleBarTip, { target: mb(r.target), plan: mb(r.plan), status: C.remainingText(calc.remaining(r.target, r.plan), mb) }) })),
          h('td', null, gapText(calc.remaining(r.target, r.plan))),
          h('td', { class: 'num rp-ytd' }, money(r.ytdTarget)), h('td', { class: 'num rp-ytd' }, money(r.ytdActual)), h('td', { class: 'num rp-ytd' }, pctCell(r.ytdPct)));
      }));
      var modeCtl = h('span', { class: 'rp-ytd-mode no-print' }, C.segmented({
        label: Y.label, value: ytdMode,
        options: [{ value: 'plan', label: fill(Y.plan, { year: year }) }, { value: 'current', label: fill(Y.current, { year: lcYear }) }],
        onChange: function (v) { ytdMode = v; draw(); }
      }));
      return h('section', { class: 'card rp-section rp-break rp-people' }, h('div', { class: 'rp-people-head' }, h('h2', null, page.peopleTitle), modeCtl,
          h('span', { class: 'print-only rp-ytd-print' }, ytdMode === 'current' ? fill(Y.current, { year: lcYear }) : fill(Y.plan, { year: year }))),
        h('p', { class: 'rp-note' }, page.peopleNote + ' · ' + ytdTip),
        h('div', { class: 'table-scroll' }, h('table', { class: 'data-table rp-people-table' },
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, PC.name), h('th', { scope: 'col' }, PC.units),
            h('th', { scope: 'col', class: 'num' }, PC.target), h('th', { scope: 'col', class: 'num' }, PC.plan),
            h('th', { scope: 'col', class: 'rp-vly-head rp-tp-head', title: page.peopleBarHeadTip }, h('span', { class: 'has-tip' }, PC.bar), SP.core.charts.vsLastYearAxis(bars.scaleMax)),
            h('th', { scope: 'col' }, PC.gap),
            h('th', { scope: 'col', class: 'num rp-ytd', title: ytdTip }, h('span', { class: 'has-tip' }, PC.ytdTarget)),
            h('th', { scope: 'col', class: 'num rp-ytd', title: ytdTip }, h('span', { class: 'has-tip' }, PC.ytdActual)),
            h('th', { scope: 'col', class: 'num rp-ytd', title: ytdTip }, h('span', { class: 'has-tip' }, PC.ytdPct)))),
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
      if (printedAt && document.body.contains(printedAt)) printedAt.textContent = fill(page.printedAt, { at: F.dateTime(SP.core.clock.now()) });
    });

    draw();
  }

  SP.modules.summary = { render: render };
})(window.SP);
